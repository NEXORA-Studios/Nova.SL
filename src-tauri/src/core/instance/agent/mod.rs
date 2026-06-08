use interprocess::local_socket::traits::Stream;
use interprocess::local_socket::{GenericNamespaced, ToNsName};
use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Write};
use std::process::Command as StdCommand;
use tauri_plugin_shell::ShellExt;

// ==================== 请求 / 响应类型（匹配 IPC_INTEGRATION.md） ====================
//
// Agent 协议使用 externally-tagged JSON Lines 格式：
//   - 请求: {"CreateInstance":{"java_path":"...","jvm_args":[...]}}
//   - 成功(无数据): "Ok"
//   - 成功(带数据): {"OkData":{"InstanceState":"Running"}}
//   - 失败:       {"Error":{"message":"..."}}

#[derive(Debug, Serialize)]
#[allow(dead_code)]
pub enum AgentRequest {
    CreateInstance {
        java_path: String,
        jvm_args: Vec<String>,
        jar_path: String,
        program_args: Vec<String>,
        working_dir: Option<String>,
        id: Option<String>,
    },
    StopInstance {
        id: String,
    },
    KillInstance {
        id: String,
    },
    RemoveInstance {
        id: String,
    },
    ListInstances,
    GetState {
        id: String,
    },
    SendConsole {
        id: String,
        line: String,
    },
    GetBacklog {
        id: String,
    },
    SubscribeConsole {
        id: String,
    },
}

#[derive(Debug, Deserialize)]
pub enum AgentResponse {
    Ok,
    OkData(AgentResponseData),
    Error(ErrorPayload),
}

#[derive(Debug, Deserialize)]
#[allow(dead_code)]
pub enum AgentResponseData {
    InstanceId(String),
    InstanceList(Vec<InstanceInfo>),
    InstanceState(String),
    Backlog(Vec<ConsoleLine>),
    ConsoleLine(ConsoleLine),
}

#[derive(Debug, Deserialize)]
pub struct ErrorPayload {
    pub message: String,
}

#[derive(Debug, Clone, Deserialize)]
#[allow(dead_code)]
pub struct InstanceInfo {
    pub id: String,
    pub state: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ConsoleLine {
    pub timestamp: u64,
    pub stream: String,
    pub line: String,
}

// ==================== 连接参数 ====================

fn pipe_name() -> &'static str {
    // GenericNamespaced 会自动添加平台前缀（Windows: \\.\pipe\, Unix: abstract ns）
    "nova-agent"
}

// ==================== Sidecar 管理器 ====================

pub struct SidecarManager;

impl SidecarManager {
    pub fn new() -> Self {
        Self
    }

    /// 启动 Agent 侧车进程（完全 Detach，不受 Tauri 生命周期影响）
    pub async fn spawn(&self, app: &tauri::AppHandle) -> Result<(), String> {
        let sidecar = app
            .shell()
            .sidecar("nova-agent")
            .map_err(|e| format!("创建 sidecar 失败: {}", e))?;

        // 转换为 std::process::Command，脱离 Tauri 的进程生命周期管理
        let mut cmd: StdCommand = sidecar.into();

        // Windows: 设置为 Detached Process，确保 GUI 关闭后 Agent 继续运行
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            const DETACHED_PROCESS: u32 = 0x00000008;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            cmd.creation_flags(DETACHED_PROCESS | CREATE_NO_WINDOW);
        }

        let child = cmd
            .spawn()
            .map_err(|e| format!("spawn Agent 进程失败: {}", e))?;

        // 立即释放 child 句柄，完全 Detach
        drop(child);

        log::info!("[agent-sidecar] spawned in detached mode");

        // 等待 pipe 就绪（轮询）
        for i in 0..100 {
            if connect_to_pipe().is_ok() {
                log::info!("[agent-sidecar] pipe ready after {}ms", i * 50);
                return Ok(());
            }
            tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
        }

        Err("Agent sidecar 启动超时，pipe 未就绪".to_string())
    }
}

/// 尝试连接 pipe（用于轮询就绪状态）
fn connect_to_pipe() -> Result<(), String> {
    let name = pipe_name()
        .to_ns_name::<GenericNamespaced>()
        .map_err(|e| format!("创建 pipe name 失败: {}", e))?;
    let _conn = interprocess::local_socket::Stream::connect(name)
        .map_err(|e| format!("pipe 未就绪: {}", e))?;
    Ok(())
}

// ==================== IPC 客户端 ====================

/// 连接 Agent 并发送一个请求，读取完整响应
pub async fn send_request(request: &AgentRequest) -> Result<AgentResponse, String> {
    let name = pipe_name()
        .to_ns_name::<GenericNamespaced>()
        .map_err(|e| format!("创建 pipe name 失败: {}", e))?;
    let mut conn = interprocess::local_socket::Stream::connect(name)
        .map_err(|e| format!("连接 Agent pipe 失败: {}", e))?;

    let json = serde_json::to_string(request).map_err(|e| format!("序列化请求失败: {}", e))?;
    let msg = format!("{}\n", json);

    conn.write_all(msg.as_bytes())
        .map_err(|e| format!("写入 pipe 失败: {}", e))?;
    conn.flush()
        .map_err(|e| format!("flush pipe 失败: {}", e))?;

    let mut reader = BufReader::new(&conn);
    let mut line = String::new();
    reader
        .read_line(&mut line)
        .map_err(|e| format!("读取 pipe 响应失败: {}", e))?;

    let response: AgentResponse = serde_json::from_str(line.trim())
        .map_err(|e| format!("解析 Agent 响应失败: {} (raw: {})", e, line.trim()))?;

    Ok(response)
}

/// 检查响应是否为 OkData，否则提取错误
pub fn check_response(response: AgentResponse) -> Result<AgentResponseData, String> {
    match response {
        AgentResponse::Ok => Err("unexpected Ok without data".to_string()),
        AgentResponse::OkData(data) => Ok(data),
        AgentResponse::Error(payload) => Err(payload.message),
    }
}

/// 检查响应是否为 Ok（无数据），适用于 StopInstance、KillInstance 等
pub fn check_ok(response: AgentResponse) -> Result<(), String> {
    match response {
        AgentResponse::Ok => Ok(()),
        AgentResponse::OkData(_) => Ok(()),
        AgentResponse::Error(payload) => Err(payload.message),
    }
}

use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::sync::Arc;
use tauri::Emitter;
use tokio::sync::Mutex;
use tokio::task::JoinHandle;

use super::error::ProcessError;
use super::events::OutputEvent;
use super::status::ProcessStatus;
use crate::core::instance::agent;
use interprocess::local_socket::traits::Stream;
use interprocess::local_socket::ToNsName;

/// 进程管理器 - 通过 Named Pipe 代理到 Agent 侧车
pub struct ProcessManager {
    /// 每个实例的 SubscribeConsole 后台任务句柄
    subscription_handles: Arc<Mutex<HashMap<String, JoinHandle<()>>>>,
}

impl ProcessManager {
    pub fn new() -> Self {
        Self {
            subscription_handles: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// 查询实例状态
    pub async fn get_status(&self, instance_id: &str) -> Option<ProcessStatus> {
        let req = agent::AgentRequest::GetState {
            id: instance_id.to_string(),
        };
        match agent::send_request(&req).await {
            Ok(resp) => match agent::check_response(resp) {
                Ok(agent::AgentResponseData::InstanceState(instance_state)) => {
                    Some(status_from_agent(&instance_state))
                }
                _ => None,
            },
            Err(e) => {
                log::warn!("[process] get_status: agent error: {}", e);
                None
            }
        }
    }

    pub async fn start(
        &self,
        instance_id: String,
        working_dir: String,
        java_path: String,
        java_args: Vec<String>,
        server_jar: String,
        server_args: Vec<String>,
        app: tauri::AppHandle,
    ) -> Result<(), ProcessError> {
        log::info!(
            "[process] start (agent): requested id={}, working_dir={}, java_path={}",
            instance_id,
            working_dir,
            java_path
        );

        let req = agent::AgentRequest::CreateInstance {
            java_path,
            jvm_args: java_args,
            jar_path: server_jar,
            program_args: server_args,
            working_dir: Some(working_dir.clone()),
            id: Some(instance_id.clone()),
        };

        let resp = agent::send_request(&req).await.map_err(|e| {
            log::error!("[process] start: send_request failed: {}", e);
            ProcessError::Other(e)
        })?;

        // CreateInstance 返回 OkData(InstanceId)，需要提取实际使用的 id
        let actual_instance_id = match agent::check_response(resp) {
            Ok(agent::AgentResponseData::InstanceId(returned_id)) => {
                if returned_id != instance_id {
                    log::warn!(
                        "[process] start: agent returned different instance id: requested={}, returned={}",
                        instance_id, returned_id
                    );
                }
                returned_id
            }
            Ok(_) => {
                log::error!("[process] start: unexpected response type from CreateInstance");
                return Err(ProcessError::Other(
                    "Unexpected response from Agent".to_string(),
                ));
            }
            Err(e) => {
                log::error!("[process] start: agent returned error: {}", e);
                return Err(ProcessError::Other(e));
            }
        };

        log::info!(
            "[process] start: instance {} created in agent",
            actual_instance_id
        );

        // 启动 SubscribeConsole 后台任务（使用 Agent 返回的实际 id）
        let handle = subscribe_console_task(actual_instance_id.clone(), app.clone());
        {
            let mut handles = self.subscription_handles.lock().await;
            handles.insert(actual_instance_id.clone(), handle);
        }

        log::info!(
            "[process] start: subscribe task started for {}",
            actual_instance_id
        );
        Ok(())
    }

    pub async fn stop(&self, instance_id: &str) -> Result<(), ProcessError> {
        log::info!("[process] stop (agent): id={}", instance_id);

        let req = agent::AgentRequest::StopInstance {
            id: instance_id.to_string(),
        };
        let resp = agent::send_request(&req).await.map_err(|e| {
            log::error!("[process] stop: send_request failed: {}", e);
            ProcessError::Other(e)
        })?;
        agent::check_ok(resp).map_err(|e| {
            log::error!("[process] stop: agent returned error: {}", e);
            ProcessError::Other(e)
        })?;
        log::info!("[process] stop: instance {} stop requested", instance_id);
        Ok(())
    }

    pub async fn kill(&self, instance_id: &str) -> Result<(), ProcessError> {
        log::info!("[process] kill (agent): id={}", instance_id);

        let req = agent::AgentRequest::KillInstance {
            id: instance_id.to_string(),
        };
        let resp = agent::send_request(&req).await.map_err(|e| {
            log::error!("[process] kill: send_request failed: {}", e);
            ProcessError::Other(e)
        })?;
        agent::check_ok(resp).map_err(|e| {
            log::error!("[process] kill: agent returned error: {}", e);
            ProcessError::Other(e)
        })?;
        log::info!("[process] kill: instance {} killed", instance_id);
        Ok(())
    }

    pub async fn send_command(&self, instance_id: &str, command: &str) -> Result<(), ProcessError> {
        log::debug!(
            "[process] send_command (agent): id={}, command={}",
            instance_id,
            command
        );
        let req = agent::AgentRequest::SendConsole {
            id: instance_id.to_string(),
            line: command.to_string(),
        };
        let resp = agent::send_request(&req).await.map_err(|e| {
            log::error!("[process] send_command: send_request failed: {}", e);
            ProcessError::Other(e)
        })?;
        agent::check_ok(resp).map_err(|e| {
            log::error!("[process] send_command: agent returned error: {}", e);
            ProcessError::Other(e)
        })?;
        Ok(())
    }

    pub async fn get_ring_buffer(&self, instance_id: &str) -> Option<Vec<OutputEvent>> {
        let req = agent::AgentRequest::GetBacklog {
            id: instance_id.to_string(),
        };
        match agent::send_request(&req).await {
            Ok(resp) => match agent::check_response(resp) {
                Ok(agent::AgentResponseData::Backlog(backlog)) => {
                    let events: Vec<OutputEvent> = backlog
                        .into_iter()
                        .map(|cl| OutputEvent {
                            stream: cl.stream,
                            line: cl.line,
                            timestamp: cl.timestamp.to_string(),
                        })
                        .collect();
                    Some(events)
                }
                _ => None,
            },
            Err(e) => {
                log::warn!("[process] get_backlog: agent error: {}", e);
                None
            }
        }
    }

    /// 取消指定实例的订阅
    pub async fn unsubscribe(&self, instance_id: &str) {
        let mut handles = self.subscription_handles.lock().await;
        if let Some(handle) = handles.remove(instance_id) {
            handle.abort();
            log::info!("[process] unsubscribe: cancelled for {}", instance_id);
        }
    }
}

/// SubscribeConsole 后台任务
/// 连接到 Agent，订阅控制台输出，将输出发射为 Tauri 事件
fn subscribe_console_task(instance_id: String, app: tauri::AppHandle) -> JoinHandle<()> {
    tokio::spawn(async move {
        log::info!("[console-sub] starting for {}", instance_id);

        // 连接到 Agent Pipe，发送 SubscribeConsole
        let name = match "nova-agent".to_ns_name::<interprocess::local_socket::GenericNamespaced>()
        {
            Ok(n) => n,
            Err(e) => {
                log::error!(
                    "[console-sub] create name failed for {}: {}",
                    instance_id,
                    e
                );
                return;
            }
        };

        let mut conn = match interprocess::local_socket::Stream::connect(name) {
            Ok(c) => c,
            Err(e) => {
                log::error!("[console-sub] connect failed for {}: {}", instance_id, e);
                return;
            }
        };

        let req = agent::AgentRequest::SubscribeConsole {
            id: instance_id.clone(),
        };
        let json = match serde_json::to_string(&req) {
            Ok(j) => j,
            Err(e) => {
                log::error!("[console-sub] serialize failed: {}", e);
                return;
            }
        };

        if let Err(e) = conn.write_all(format!("{}\n", json).as_bytes()) {
            log::error!("[console-sub] write failed: {}", e);
            return;
        }
        if let Err(e) = conn.flush() {
            log::error!("[console-sub] flush failed: {}", e);
            return;
        }

        let mut reader = BufReader::new(&conn);
        loop {
            let mut line = String::new();
            match reader.read_line(&mut line) {
                Ok(0) => {
                    log::info!("[console-sub] stream ended for {}", instance_id);
                    break;
                }
                Ok(_) => {
                    let trimmed = line.trim();
                    if trimmed.is_empty() {
                        continue;
                    }

                    match serde_json::from_str::<agent::AgentResponse>(trimmed) {
                        Ok(agent::AgentResponse::OkData(agent::AgentResponseData::Backlog(
                            backlog,
                        ))) => {
                            for cl in backlog {
                                let event = OutputEvent {
                                    stream: cl.stream.clone(),
                                    line: cl.line.clone(),
                                    timestamp: cl.timestamp.to_string(),
                                };
                                let _ =
                                    app.emit(&format!("instance://{}/output", instance_id), event);
                            }
                        }
                        Ok(agent::AgentResponse::OkData(
                            agent::AgentResponseData::ConsoleLine(console_line),
                        )) => {
                            let event = OutputEvent {
                                stream: console_line.stream.clone(),
                                line: console_line.line.clone(),
                                timestamp: console_line.timestamp.to_string(),
                            };
                            let _ = app.emit(&format!("instance://{}/output", instance_id), event);
                        }
                        Ok(agent::AgentResponse::OkData(
                            agent::AgentResponseData::InstanceState(instance_state),
                        )) => {
                            // 状态变更通知（Agent 在进程退出时推送）
                            let status = status_from_agent(&instance_state);
                            let _ = app.emit(
                                &format!("instance://{}/status", instance_id),
                                super::events::StatusEvent {
                                    status: status.to_string(),
                                    instance_id: instance_id.clone(),
                                    timestamp: super::events::now_iso(),
                                },
                            );
                            let _ = app.emit(
                                &format!("instance://{}/lifecycle", instance_id),
                                super::events::LifecycleEvent {
                                    event: instance_state,
                                    instance_id: instance_id.clone(),
                                    timestamp: super::events::now_iso(),
                                },
                            );

                            // 如果进程结束，关闭自身上下文
                            if matches!(status, ProcessStatus::Stopped | ProcessStatus::Crashed) {
                                log::info!(
                                    "[console-sub] process ended for {}, ending subscription",
                                    instance_id
                                );
                                break;
                            }
                        }
                        Ok(_) => {}
                        Err(e) => {
                            log::warn!("[console-sub] parse error: {} (line: {})", e, trimmed);
                        }
                    }
                }
                Err(e) => {
                    log::error!("[console-sub] read error for {}: {}", instance_id, e);
                    break;
                }
            }
        }

        log::info!("[console-sub] ended for {}", instance_id);
    })
}

fn status_from_agent(s: &str) -> ProcessStatus {
    match s {
        "Starting" => ProcessStatus::Starting,
        "Running" => ProcessStatus::Running,
        "Stopping" => ProcessStatus::Stopping,
        "StoppingTimedOut" => ProcessStatus::Stopping,
        "Stopped" => ProcessStatus::Stopped,
        "Crashed" => ProcessStatus::Crashed,
        _ => ProcessStatus::Unknown,
    }
}

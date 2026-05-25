use crate::core::instance::config as instance_config;
use crate::core::instance::download as instance_download;
use crate::core::instance::import as instance_import;
use crate::core::java::scanner::JavaInstallation;
use crate::utils::{
    mc_java::{required_java_version, score_java},
    mc_version::parse_mc_version,
};
use crate::{DownloadRegistryState, ProcessManagerState};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, State};

use super::config::ConfigState;

/// 根据服务器版本和 Loader 选择最合适的 Java
fn select_java_for_server(
    javas: &[JavaInstallation],
    version: &str,
    loader: &str,
) -> Option<JavaInstallation> {
    let mc_version = parse_mc_version(version);
    let required_java = required_java_version(&mc_version);

    let mut candidates: Vec<&JavaInstallation> = javas
        .iter()
        .filter(|j| j.enabled)
        .filter(|j| j.major_version >= required_java)
        .collect();

    if candidates.is_empty() {
        return None;
    }

    candidates.sort_by(|a, b| {
        score_java(b, required_java, loader)
            .partial_cmp(&score_java(a, required_java, loader))
            .unwrap()
    });

    candidates.first().map(|j| (*j).clone())
}

#[tauri::command]
pub fn get_instance_config(
    instance_dir: String,
) -> Result<instance_config::InstanceConfig, String> {
    log::info!("[command] get_instance_config: dir={}", instance_dir);
    let path = PathBuf::from(instance_dir);
    instance_config::load_instance_config(&path).map_err(|e| {
        log::error!("[command] get_instance_config failed: {:?}", e);
        format!("{:?}", e)
    })
}

#[tauri::command]
pub fn update_instance_config(
    instance_dir: String,
    config: instance_config::InstanceConfig,
) -> Result<(), String> {
    log::info!("[command] update_instance_config: dir={}", instance_dir);
    let path = PathBuf::from(instance_dir);
    instance_config::save_instance_config(&path, &config).map_err(|e| {
        log::error!("[command] update_instance_config failed: {:?}", e);
        format!("{:?}", e)
    })
}

#[tauri::command]
pub fn get_extensions_config(
    instance_dir: String,
) -> Result<instance_config::ExtensionsConfig, String> {
    log::info!("[command] get_extensions_config: dir={}", instance_dir);
    let path = PathBuf::from(instance_dir);
    instance_config::load_extensions_config(&path).map_err(|e| {
        log::error!("[command] get_extensions_config failed: {:?}", e);
        format!("{:?}", e)
    })
}

#[tauri::command]
pub fn update_extensions_config(
    instance_dir: String,
    config: instance_config::ExtensionsConfig,
) -> Result<(), String> {
    log::info!("[command] update_extensions_config: dir={}", instance_dir);
    let path = PathBuf::from(instance_dir);
    instance_config::save_extensions_config(&path, &config).map_err(|e| {
        log::error!("[command] update_extensions_config failed: {:?}", e);
        format!("{:?}", e)
    })
}

/// 打开文件夹选择对话框
#[tauri::command]
pub async fn pick_server_directory(app: AppHandle) -> Result<Option<String>, String> {
    log::info!("[command] pick_server_directory");
    use tauri_plugin_dialog::DialogExt;

    let path = app.dialog().file().blocking_pick_folder();

    log::info!("[command] pick_server_directory result: {:?}", path);
    Ok(path.map(|p| p.to_string()))
}

/// 分析服务器目录
#[tauri::command]
pub fn analyze_server_directory(
    instance_path: String,
) -> Result<instance_import::ImportAnalysis, String> {
    log::info!("[command] analyze_server_directory: path={}", instance_path);
    let path = PathBuf::from(&instance_path);
    instance_import::analyze_server_directory(&path).map_err(|e| {
        log::error!("[command] analyze_server_directory failed: {}", e);
        e
    })
}

/// 导入服务器实例
/// 1. 生成 UUID
/// 2. 在实例目录创建 .nova/Instance.toml
/// 3. 解析启动脚本并创建 .nova/Launch.toml
/// 4. 将实例注册到 App.toml
#[tauri::command]
pub fn import_instance(
    _app: AppHandle,
    _state: State<'_, ConfigState>,
    instance_path: String,
    instance_name: String,
    loader: String,
    version: String,
) -> Result<String, String> {
    log::info!(
        "[command] import_instance: path={}, name={}, loader={}, version={}",
        instance_path,
        instance_name,
        loader,
        version
    );

    let path = PathBuf::from(&instance_path);

    if !path.exists() || !path.is_dir() {
        log::error!("[command] import_instance failed: path does not exist or is not a directory");
        return Err("实例路径不存在或不是目录".to_string());
    }

    // 生成 UUID 作为实例唯一标识符
    let id = uuid::Uuid::new_v4().to_string();
    log::info!("[command] import_instance: generated id={}", id);

    log::info!(
        "[command] import_instance: completed, id={}",
        id
    );

    Ok(id)
}

// ==================== 创建新服务器命令 ====================

/// 获取支持下载的 Loader 列表
#[tauri::command]
pub fn get_downloadable_loaders(
    registry_state: State<'_, DownloadRegistryState>,
) -> Result<Vec<(String, String)>, String> {
    log::info!("[command] get_downloadable_loaders");
    Ok(instance_download::get_downloadable_loaders(
        &registry_state.registry,
    ))
}

/// 获取指定 Loader 的所有可用版本（已按大版本号分组）
#[tauri::command]
pub async fn get_loader_versions(
    registry_state: State<'_, DownloadRegistryState>,
    loader: String,
) -> Result<Vec<instance_download::VersionGroup>, String> {
    log::info!("[command] get_loader_versions: loader={}", loader);
    instance_download::get_versions(&registry_state.registry, &loader)
        .await
        .map_err(|e| e.to_string())
}

/// 获取指定 Loader + 版本的可用构建列表
#[tauri::command]
pub async fn get_loader_builds(
    registry_state: State<'_, DownloadRegistryState>,
    loader: String,
    version: String,
) -> Result<Vec<instance_download::BuildInfo>, String> {
    log::info!(
        "[command] get_loader_builds: loader={}, version={}",
        loader,
        version
    );
    instance_download::get_builds(&registry_state.registry, &loader, &version)
        .await
        .map_err(|e| e.to_string())
}

/// 获取指定 Loader + 版本的官方推荐 JVM 参数
#[tauri::command]
pub async fn get_recommended_jvm_args(
    registry_state: State<'_, DownloadRegistryState>,
    loader: String,
    version: String,
    build: Option<String>,
) -> Result<Vec<String>, String> {
    log::info!(
        "[command] get_recommended_jvm_args: loader={}, version={}, build={:?}",
        loader,
        version,
        build
    );
    instance_download::get_recommended_jvm_args(
        &registry_state.registry,
        &loader,
        &version,
        build.as_deref(),
    )
    .await
    .map_err(|e| e.to_string())
}

/// 创建新服务器实例
/// 1. 生成 UUID
/// 2. 下载服务器核心 jar
/// 3. 在实例目录创建 .nova/Instance.toml
/// 4. 创建默认 .nova/Launch.toml
/// 5. 将实例注册到 App.toml
#[tauri::command]
pub async fn create_server_instance(
    _app: AppHandle,
    _config_state: State<'_, ConfigState>,
    registry_state: State<'_, DownloadRegistryState>,
    instance_path: String,
    instance_name: String,
    loader: String,
    version: String,
    build: Option<String>,
) -> Result<String, String> {
    log::info!(
        "[command] create_server_instance: path={}, name={}, loader={}, version={}, build={:?}",
        instance_path,
        instance_name,
        loader,
        version,
        build
    );

    let path = PathBuf::from(&instance_path);

    // 创建实例目录
    std::fs::create_dir_all(&path).map_err(|e| format!("创建实例目录失败: {}", e))?;

    // 生成 UUID 作为实例唯一标识符
    let id = uuid::Uuid::new_v4().to_string();
    log::info!("[command] create_server_instance: generated id={}", id);

    // 下载服务器核心
    let download_result = instance_download::download_server_jar(
        &registry_state.registry,
        &loader,
        &version,
        build.as_deref(),
        &path,
        Some("server.jar"),
    )
    .await
    .map_err(|e| format!("下载服务器核心失败: {}", e))?;

    log::info!(
        "[command] create_server_instance: downloaded jar to {}",
        download_result.jar_path
    );

    // 后处理（Forge/NeoForge/Spigot 等需要）
    if let Some(info) = instance_download::get_loader_info(&registry_state.registry, &loader) {
        if info.needs_post_process {
            log::info!(
                "[command] create_server_instance: running post-process for {}",
                loader
            );
            instance_download::post_process_instance(
                &registry_state.registry,
                &loader,
                &path,
                &version,
                build.as_deref(),
            )
            .await
            .map_err(|e| format!("后处理失败: {}", e))?;
        }
    }

    log::info!(
        "[command] create_server_instance: completed, id={}",
        id
    );

    Ok(id)
}

/// 检测实例目录中可用的启动方式
#[tauri::command]
pub fn get_available_launch_methods(instance_path: String) -> Result<Vec<String>, String> {
    let path = PathBuf::from(&instance_path);
    if !path.exists() || !path.is_dir() {
        return Err("实例路径不存在或不是目录".to_string());
    }

    let mut methods = Vec::new();

    // jar: 检查是否存在 server.jar（或任何 .jar）
    if path.join("server.jar").exists() {
        methods.push("jar".to_string());
    } else {
        let has_jar = fs::read_dir(&path)
            .ok()
            .map(|entries| {
                entries.flatten().any(|e| {
                    e.path().is_file()
                        && e.path()
                            .extension()
                            .map(|ext| ext == "jar")
                            .unwrap_or(false)
                })
            })
            .unwrap_or(false);
        if has_jar {
            methods.push("jar".to_string());
        }
    }

    // bat: 检查 start.bat / start.cmd
    for name in &["start.bat", "start.cmd", "run.bat"] {
        if path.join(name).exists() {
            methods.push("bat".to_string());
            break;
        }
    }

    // bash: 检查 start.sh / run.sh
    for name in &["start.sh", "run.sh"] {
        if path.join(name).exists() {
            methods.push("bash".to_string());
            break;
        }
    }

    log::info!(
        "[command] get_available_launch_methods: path={}, methods={:?}",
        instance_path,
        methods
    );
    Ok(methods)
}

/// 更新或创建 server.properties 中的指定键值
fn update_server_properties(path: &PathBuf, port: u16, online_mode: bool) -> Result<(), String> {
    let props_path = path.join("server.properties");
    let port_str = port.to_string();
    let online_str = if online_mode { "true" } else { "false" };

    if props_path.exists() {
        let content = fs::read_to_string(&props_path)
            .map_err(|e| format!("读取 server.properties 失败: {}", e))?;

        let mut lines: Vec<String> = content.lines().map(|l| l.to_string()).collect();
        let mut found_port = false;
        let mut found_online = false;

        for line in &mut lines {
            let trimmed = line.trim();
            if trimmed.starts_with("server-port") || trimmed.starts_with("server-port=") {
                *line = format!("server-port={}", port_str);
                found_port = true;
            } else if trimmed.starts_with("online-mode") || trimmed.starts_with("online-mode=") {
                *line = format!("online-mode={}", online_str);
                found_online = true;
            }
        }

        if !found_port {
            lines.push(format!("server-port={}", port_str));
        }
        if !found_online {
            lines.push(format!("online-mode={}", online_str));
        }

        fs::write(&props_path, lines.join("\n") + "\n")
            .map_err(|e| format!("写入 server.properties 失败: {}", e))?;
    } else {
        let content = format!(
            "#Minecraft server properties\nserver-port={}\nonline-mode={}\n",
            port_str, online_str
        );
        fs::write(&props_path, &content)
            .map_err(|e| format!("创建 server.properties 失败: {}", e))?;
    }

    log::info!(
        "[command] server.properties updated: port={}, online={}",
        port,
        online_mode
    );
    Ok(())
}

/// 保存实例首次启动前的配置
/// 在 Init 页面确认后统一创建：
/// 1. Instance.toml（实例元信息）
/// 2. Launch.toml（启动配置，新三 section 格式）
/// 3. 注册到 App.toml
/// 4. server.properties（端口、正版验证）
/// 5. eula.txt（可选）
#[tauri::command]
pub fn save_instance_prelaunch_config(
    instance_path: String,
    instance_id: String,
    display_name: String,
    loader: String,
    version: String,
    port: u16,
    min_memory_mb: u32,
    max_memory_mb: u32,
    launch_method: String,
    java_target: String,
    online_mode: bool,
    eula_agreed: bool,
    extra_args: Vec<String>,
) -> Result<(), String> {
    log::info!(
        "[command] save_instance_prelaunch_config: path={}, id={}, name={}, loader={}, ver={}, port={}, mem={}/{}MB, method={}, java={}, online={}, eula={}",
        instance_path, instance_id, display_name, loader, version, port, min_memory_mb, max_memory_mb, launch_method, java_target, online_mode, eula_agreed
    );

    let path = PathBuf::from(&instance_path);
    std::fs::create_dir_all(&path).map_err(|e| format!("创建实例目录失败: {}", e))?;

    // 1. 创建 Instance.toml
    let instance_config_data = instance_config::InstanceConfig {
        instance: instance_config::InstanceMetadata {
            id: instance_id.clone(),
            name: display_name.clone(),
            version: version.clone(),
            loader: loader.clone(),
        },
    };
    instance_config::save_instance_config(&path, &instance_config_data).map_err(|e| {
        log::error!("[command] save_instance_prelaunch_config: save Instance.toml failed: {:?}", e);
        format!("保存 Instance.toml 失败: {:?}", e)
    })?;
    log::info!("[command] save_instance_prelaunch_config: Instance.toml saved");

    // 2. 创建 Launch.toml（新三 section 格式）
    let server_jar = if path.join("server.jar").exists() {
        "server.jar".to_string()
    } else {
        // 尝试查找任意 .jar 作为 server_jar
        fs::read_dir(&path)
            .ok()
            .and_then(|entries| {
                entries.flatten().find_map(|e| {
                    let p = e.path();
                    if p.is_file() && p.extension().map(|ext| ext == "jar").unwrap_or(false) {
                        p.file_name().map(|n| n.to_string_lossy().to_string())
                    } else {
                        None
                    }
                })
            })
            .unwrap_or_else(|| "server.jar".to_string())
    };

    let mut script_path = None;
    if launch_method == "bat" {
        for name in &["start.bat", "start.cmd", "run.bat"] {
            if path.join(name).exists() {
                script_path = Some(name.to_string());
                break;
            }
        }
    } else if launch_method == "bash" {
        for name in &["start.sh", "run.sh"] {
            if path.join(name).exists() {
                script_path = Some(name.to_string());
                break;
            }
        }
    }

    let launch_config = instance_config::LaunchConfig {
        basic: instance_config::BasicConfig {
            launch_method: launch_method.clone(),
            server_jar,
            java_target: java_target.clone(),
            script_path,
        },
        jvm_args: instance_config::JvmArgs {
            min_memory: format!("{}M", min_memory_mb),
            max_memory: format!("{}M", max_memory_mb),
            gc: None,
            extra_args: extra_args,
        },
        game_props: instance_config::GameProps {
            nogui: true,
        },
    };
    instance_config::save_launch_config(&path, &launch_config).map_err(|e| {
        log::error!("[command] save_instance_prelaunch_config: save Launch.toml failed: {:?}", e);
        format!("保存 Launch.toml 失败: {:?}", e)
    })?;
    log::info!("[command] save_instance_prelaunch_config: Launch.toml saved");

    // 3. 写入 server.properties（端口、正版验证）
    update_server_properties(&path, port, online_mode)?;

    // 5. 写入 EULA
    if eula_agreed {
        let eula_path = path.join("eula.txt");
        std::fs::write(&eula_path, "eula=true\n").map_err(|e| {
            log::error!("[command] save_instance_prelaunch_config: write eula.txt failed: {}", e);
            format!("写入 eula.txt 失败: {}", e)
        })?;
        log::info!("[command] save_instance_prelaunch_config: eula.txt written");
    }

    log::info!("[command] save_instance_prelaunch_config: completed");
    Ok(())
}

// ==================== 进程管理命令 ====================

/// 获取实例启动配置（Launch.toml）
#[tauri::command]
pub fn get_launch_config(instance_dir: String) -> Result<instance_config::LaunchConfig, String> {
    log::info!("[command] get_launch_config: dir={}", instance_dir);
    let path = PathBuf::from(instance_dir);
    instance_config::load_launch_config(&path).map_err(|e| {
        log::error!("[command] get_launch_config failed: {:?}", e);
        format!("{:?}", e)
    })
}

/// 更新实例启动配置（Launch.toml）
#[tauri::command]
pub fn update_launch_config(
    instance_dir: String,
    config: instance_config::LaunchConfig,
) -> Result<(), String> {
    log::info!("[command] update_launch_config: dir={}", instance_dir);
    let path = PathBuf::from(instance_dir);
    instance_config::save_launch_config(&path, &config).map_err(|e| {
        log::error!("[command] update_launch_config failed: {:?}", e);
        format!("{:?}", e)
    })
}

/// 获取实例进程状态
#[tauri::command]
pub async fn get_instance_status(
    state: State<'_, ProcessManagerState>,
    instance_id: String,
) -> Result<String, String> {
    log::debug!("[command] get_instance_status: id={}", instance_id);
    let status = state.manager.get_status(&instance_id).await;
    let result = status
        .map(|s| s.to_string())
        .unwrap_or_else(|| "stopped".to_string());
    log::debug!(
        "[command] get_instance_status: id={}, status={}",
        instance_id,
        result
    );
    Ok(result)
}

/// 启动实例（从 Launch.toml 读取配置）
#[tauri::command]
pub async fn start_instance(
    app: AppHandle,
    state: State<'_, ProcessManagerState>,
    instance_id: String,
    working_dir: String,
) -> Result<(), String> {
    log::info!(
        "[command] start_instance: id={}, working_dir={}",
        instance_id,
        working_dir
    );

    // 读取 Launch.toml
    let launch =
        instance_config::load_launch_config(&PathBuf::from(&working_dir)).map_err(|e| {
            log::error!("[command] start_instance: load Launch.toml failed: {:?}", e);
            format!("读取 Launch.toml 失败: {:?}", e)
        })?;

    let meta = &launch.basic;
    let jvm = &launch.jvm_args;
    let props = &launch.game_props;

    // 读取 Instance.toml 获取版本和 Loader 信息
    let instance_meta = instance_config::load_instance_config(&PathBuf::from(&working_dir))
        .map_err(|e| {
            log::error!(
                "[command] start_instance: load Instance.toml failed: {:?}",
                e
            );
            format!("读取 Instance.toml 失败: {:?}", e)
        })?;

    // 解析 java 路径：auto / java / java.exe 都走自动选择
    let java_path =
        if meta.java_target == "auto" || meta.java_target == "java" || meta.java_target == "java.exe" {
            // 从扫描的 Java 列表中选择最合适的
            let javas = crate::core::java::scanner::get_cached_javas(&app)
                .map_err(|e| format!("读取 Java 缓存失败: {:?}", e))?;

            let selected = select_java_for_server(
                &javas,
                &instance_meta.instance.version,
                &instance_meta.instance.loader,
            );

            match selected {
                Some(java) => {
                    log::info!(
                        "[command] start_instance: auto-selected java: {} (v{})",
                        java.path,
                        java.version
                    );
                    // 拼接 bin/java.exe
                    let bin = PathBuf::from(&java.path)
                        .join("bin")
                        .join(if cfg!(windows) { "java.exe" } else { "java" });
                    bin.to_string_lossy().to_string()
                }
                None => {
                    log::warn!(
                        "[command] start_instance: no suitable java found, falling back to 'java'"
                    );
                    which::which("java")
                        .map(|p| p.to_string_lossy().to_string())
                        .unwrap_or_else(|_| "java".to_string())
                }
            }
        } else {
            meta.java_target.clone()
        };
    log::info!(
        "[command] start_instance: java_path={}, server_jar={}, min_mem={}, max_mem={}, gc={:?}, nogui={}",
        java_path, meta.server_jar, jvm.min_memory, jvm.max_memory, jvm.gc, props.nogui
    );

    // 构建 JVM 参数
    let mut java_args = vec![
        format!("-Xms{}", jvm.min_memory),
        format!("-Xmx{}", jvm.max_memory),
        "-Djline.terminal=jline.UnsupportedTerminal".to_string(),
    ];

    if let Some(gc) = &jvm.gc {
        java_args.push(format!("-XX:+Use{}", gc));
    }

    java_args.extend(jvm.extra_args.iter().cloned());

    // 服务器参数（在 -jar 之后传递）
    let mut server_args = Vec::new();
    if props.nogui {
        server_args.push("nogui".to_string());
    }

    log::info!(
        "[command] start_instance: java_args={:?}, server_args={:?}",
        java_args,
        server_args
    );

    state
        .manager
        .start(
            instance_id.clone(),
            working_dir,
            java_path,
            java_args,
            meta.server_jar.clone(),
            server_args,
            app,
        )
        .await
        .map_err(|e| {
            log::error!(
                "[command] start_instance: ProcessManager::start failed: {}",
                e
            );
            e.to_string()
        })?;

    log::info!(
        "[command] start_instance: id={} started successfully",
        instance_id
    );
    Ok(())
}

/// 安全停止实例（发送 stop 命令）
#[tauri::command]
pub async fn stop_instance(
    state: State<'_, ProcessManagerState>,
    instance_id: String,
) -> Result<(), String> {
    log::info!("[command] stop_instance: id={}", instance_id);
    state.manager.stop(&instance_id).await.map_err(|e| {
        log::error!("[command] stop_instance failed: {}", e);
        e.to_string()
    })
}

/// 强制关闭实例（kill -9）
#[tauri::command]
pub async fn kill_instance(
    state: State<'_, ProcessManagerState>,
    instance_id: String,
) -> Result<(), String> {
    log::info!("[command] kill_instance: id={}", instance_id);
    state.manager.kill(&instance_id).await.map_err(|e| {
        log::error!("[command] kill_instance failed: {}", e);
        e.to_string()
    })
}

/// 向实例发送命令
#[tauri::command]
pub async fn send_instance_command(
    state: State<'_, ProcessManagerState>,
    instance_id: String,
    command: String,
) -> Result<(), String> {
    log::info!(
        "[command] send_instance_command: id={}, command={}",
        instance_id,
        command
    );
    state
        .manager
        .send_command(&instance_id, &command)
        .await
        .map_err(|e| {
            log::error!("[command] send_instance_command failed: {}", e);
            e.to_string()
        })
}

/// 日志条目
#[derive(Debug, Clone, serde::Serialize)]
pub struct LogEntry {
    pub stream: String,
    pub line: String,
    pub timestamp: String,
}

/// 获取实例的历史日志
#[tauri::command]
pub async fn get_instance_logs(
    app: AppHandle,
    instance_id: String,
) -> Result<Vec<LogEntry>, String> {
    log::info!("[command] get_instance_logs: id={}", instance_id);

    // 获取实例配置以找到工作目录
    let config = crate::core::app::config::load(&app).map_err(|e| {
        log::error!("[command] get_instance_logs: failed to load config: {}", e);
        "Failed to load config".to_string()
    })?;

    let instance_config = config
        .server
        .instances
        .iter()
        .find(|i| i.id == instance_id)
        .ok_or_else(|| {
            log::error!("[command] get_instance_logs: instance not found");
            "Instance not found".to_string()
        })?;

    let working_dir = std::path::Path::new(&instance_config.path);
    let log_path = working_dir.join(".nova").join("stream").join("console.log");

    if !log_path.exists() {
        log::info!("[command] get_instance_logs: no log file found");
        return Ok(Vec::new());
    }

    // 读取日志文件
    let content = tokio::fs::read_to_string(&log_path).await.map_err(|e| {
        log::error!("[command] get_instance_logs: failed to read log: {}", e);
        e.to_string()
    })?;

    let mut entries = Vec::new();
    for line in content.lines() {
        // 解析格式: <stream> [timestamp] | message
        if let Some(entry) = parse_log_line(line) {
            entries.push(entry);
        }
    }

    log::info!(
        "[command] get_instance_logs: loaded {} entries",
        entries.len()
    );
    Ok(entries)
}

/// 解析日志行
fn parse_log_line(line: &str) -> Option<LogEntry> {
    // 格式: <stdout> [2024-01-01T12:00:00.000] | message here
    let line = line.strip_prefix('<')?;
    let (stream_str, rest) = line.split_once("> [")?;
    let (timestamp, message) = rest.split_once("] | ")?;

    let stream = match stream_str {
        "stdin" => "stdin",
        "stdout" => "stdout",
        "stderr" => "stderr",
        _ => return None,
    };

    Some(LogEntry {
        stream: stream.to_string(),
        line: message.to_string(),
        timestamp: timestamp.to_string(),
    })
}

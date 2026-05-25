use std::collections::HashMap;
use std::process::Stdio;
use std::sync::Arc;
use tokio::io::AsyncWriteExt;
use tokio::process::Command;
use tokio::sync::RwLock;

use super::error::ProcessError;
use super::process::ManagedProcess;
use super::status::ProcessStatus;
use super::tasks::{self, CleanupCallback};

/// 进程管理器：只负责索引，不执行 IO
/// 使用 RwLock 允许多个并发读，提高并发性能
pub struct ProcessManager {
    processes: Arc<RwLock<HashMap<String, Arc<ManagedProcess>>>>,
}

impl ProcessManager {
    pub fn new() -> Self {
        Self {
            processes: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// 获取进程状态（只读锁，允许多个并发）
    pub async fn get_status(&self, instance_id: &str) -> Option<ProcessStatus> {
        let map = self.processes.read().await;
        if let Some(proc) = map.get(instance_id) {
            Some(proc.get_status().await)
        } else {
            None
        }
    }

    /// 获取进程 Ring Buffer（只读锁，允许多个并发）
    pub async fn get_ring_buffer(
        &self,
        instance_id: &str,
    ) -> Option<Vec<super::events::OutputEvent>> {
        let map = self.processes.read().await;
        if let Some(proc) = map.get(instance_id) {
            Some(proc.get_ring_buffer().await)
        } else {
            None
        }
    }

    /// 启动实例进程
    pub async fn start(
        &self,
        instance_id: String,
        working_dir: String,
        java_path: String,
        java_args: Vec<String>,
        server_jar: String,
        server_args: Vec<String>,
        app_handle: tauri::AppHandle,
    ) -> Result<(), ProcessError> {
        log::info!(
            "[process] start: id={}, working_dir={}, java_path={}, server_jar={}",
            instance_id, working_dir, java_path, server_jar
        );

        // 先检查是否已存在（读锁）
        {
            let map = self.processes.read().await;
            if map.contains_key(&instance_id) {
                log::warn!("[process] start: id={} already running", instance_id);
                return Err(ProcessError::AlreadyRunning);
            }
        }
        // 注意：这里释放读锁后，理论上可能有竞态条件
        // 但在实际场景中，同一实例不会并发启动多次，所以可以接受
        // 如果需要严格保证，可以在 spawn 后检查 insert 的返回值

        let mut cmd = Command::new(&java_path);
        cmd.current_dir(&working_dir)
            .args(&java_args)
            .arg("-jar")
            .arg(&server_jar)
            .args(&server_args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true);

        log::info!("[process] start: spawning command: {:?}", cmd);

        let mut child = cmd.spawn().map_err(|e| {
            log::error!("[process] start: spawn failed: {}", e);
            ProcessError::Io(e)
        })?;

        let pid = child.id().ok_or_else(|| {
            log::error!("[process] start: failed to get pid");
            ProcessError::Other("无法获取进程 ID".to_string())
        })?;
        log::info!("[process] start: child spawned, pid={}", pid);

        let stdin = child
            .stdin
            .take()
            .ok_or_else(|| {
                log::error!("[process] start: failed to take stdin");
                ProcessError::Other("无法获取 stdin".to_string())
            })?;

        let process = Arc::new(
            ManagedProcess::new(
                instance_id.clone(),
                pid,
                stdin,
                child,
                std::path::Path::new(&working_dir),
            )
            .await
            .map_err(|e| {
                log::error!("[process] start: failed to create stream logger: {}", e);
                ProcessError::Io(e)
            })?,
        );

        // 创建清理回调，在进程退出时从索引中移除
        let processes_clone = self.processes.clone();
        let instance_id_clone = instance_id.clone();
        let cleanup: CleanupCallback = Box::new(move || {
            let processes = processes_clone.clone();
            let id = instance_id_clone.clone();
            tokio::spawn(async move {
                tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
                let mut map = processes.write().await;
                map.remove(&id);
                log::info!("[process] removed from index: id={}", id);
            })
        });

        // 启动后台任务
        tasks::spawn_all(process.clone(), app_handle.clone(), cleanup).await;

        // 插入索引（写锁）
        let mut map = self.processes.write().await;
        map.insert(instance_id.clone(), process.clone());
        drop(map);

        // 设置状态并发送事件
        process.set_status(ProcessStatus::Running).await;
        process.emit_lifecycle(&app_handle, "started");
        process.emit_status(&app_handle).await;

        log::info!("[process] start: id={} completed", instance_id);
        Ok(())
    }

    /// 安全停止：向 stdin 发送 "stop" 并等待进程退出
    pub async fn stop(&self, instance_id: &str) -> Result<(), ProcessError> {
        log::info!("[process] stop: id={}", instance_id);

        let proc = {
            let map = self.processes.read().await;
            map.get(instance_id)
                .cloned()
                .ok_or_else(|| {
                    log::warn!("[process] stop: id={} not running", instance_id);
                    ProcessError::NotRunning
                })?
        };

        let status = proc.get_status().await;
        if !matches!(status, ProcessStatus::Running) {
            log::warn!("[process] stop: id={} status is not running", instance_id);
            return Err(ProcessError::NotRunning);
        }

        proc.set_status(ProcessStatus::Stopping).await;
        log::info!("[process] stop: id={} status set to Stopping", instance_id);

        {
            let mut stdin = proc.stdin.lock().await;
            stdin
                .write_all(b"stop\n")
                .await
                .map_err(|e| {
                    log::error!("[process] stop: write to stdin failed: {}", e);
                    ProcessError::Io(e)
                })?;
            stdin.flush().await.map_err(|e| {
                log::error!("[process] stop: flush stdin failed: {}", e);
                ProcessError::Io(e)
            })?;
        }

        // 写入 stdin 日志
        proc.stream_logger.log_stdin("stop").await;

        log::info!("[process] stop: 'stop' command sent to id={}", instance_id);

        // 等待进程退出（30秒超时）
        let timeout = tokio::time::Duration::from_secs(30);
        let wait_result = tokio::time::timeout(timeout, async {
            loop {
                let status = proc.get_status().await;
                if matches!(status, ProcessStatus::Stopped | ProcessStatus::Crashed) {
                    break;
                }
                tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
            }
        })
        .await;

        if wait_result.is_err() {
            log::warn!("[process] stop: id={} timeout after 30s, forcing kill", instance_id);
            let _ = self.kill(instance_id).await;
        }

        Ok(())
    }

    /// 强制关闭进程
    pub async fn kill(&self, instance_id: &str) -> Result<(), ProcessError> {
        log::info!("[process] kill: id={}", instance_id);

        let proc = {
            let map = self.processes.read().await;
            map.get(instance_id)
                .cloned()
                .ok_or_else(|| {
                    log::warn!("[process] kill: id={} not running", instance_id);
                    ProcessError::NotRunning
                })?
        };

        let pid = proc.pid;

        // 先尝试 graceful kill
        log::info!(
            "[process] kill: attempting graceful kill for id={}, pid={}",
            instance_id, pid
        );
        {
            let mut child_lock = proc.child.lock().await;
            if let Some(ref mut child) = *child_lock {
                let _ = child.kill().await;
            }
        }

        // 跨平台强制终止（Windows 带 /T 杀子进程树）
        #[cfg(windows)]
        {
            log::info!("[process] kill: force kill with taskkill /T /F /PID {}", pid);
            let _ = Command::new("taskkill")
                .args(["/T", "/F", "/PID", &pid.to_string()])
                .output()
                .await;
        }
        #[cfg(unix)]
        {
            log::info!("[process] kill: force kill with kill -9 {}", pid);
            let _ = Command::new("kill")
                .args(["-9", &pid.to_string()])
                .output()
                .await;
        }

        proc.set_status(ProcessStatus::Stopped).await;
        log::info!("[process] kill: id={} status set to Stopped", instance_id);

        // 延迟后从索引移除（写锁）
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
        let mut map = self.processes.write().await;
        map.remove(instance_id);

        Ok(())
    }

    /// 向进程 stdin 发送命令
    pub async fn send_command(
        &self,
        instance_id: &str,
        command: &str,
    ) -> Result<(), ProcessError> {
        log::debug!("[process] send_command: id={}, command={}", instance_id, command);

        let proc = {
            let map = self.processes.read().await;
            map.get(instance_id)
                .cloned()
                .ok_or_else(|| {
                    log::warn!("[process] send_command: id={} not running", instance_id);
                    ProcessError::NotRunning
                })?
        };

        let status = proc.get_status().await;
        if !matches!(status, ProcessStatus::Running) {
            log::warn!("[process] send_command: id={} status is not running", instance_id);
            return Err(ProcessError::NotRunning);
        }

        let line = format!("{}\n", command);
        {
            let mut stdin = proc.stdin.lock().await;
            stdin.write_all(line.as_bytes()).await.map_err(|e| {
                log::error!("[process] send_command: write failed: {}", e);
                ProcessError::Io(e)
            })?;
            stdin.flush().await.map_err(|e| {
                log::error!("[process] send_command: flush failed: {}", e);
                ProcessError::Io(e)
            })?;
        }

        // 写入 stdin 日志
        proc.stream_logger.log_stdin(command).await;

        log::debug!("[process] send_command: command sent to id={}", instance_id);
        Ok(())
    }
}

use std::sync::Arc;
use tauri::Emitter;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Child;

use super::events::{now_iso, OutputEvent};
use super::process::ManagedProcess;
use super::status::ProcessStatus;

/// 清理回调类型 - 异步回调
pub type CleanupCallback = Box<dyn FnOnce() -> tokio::task::JoinHandle<()> + Send + 'static>;

/// 启动所有后台任务
pub async fn spawn_all(
    process: Arc<ManagedProcess>,
    app: tauri::AppHandle,
    cleanup: CleanupCallback,
) {
    // 从 process.child 中 take 出 child
    let child = {
        let mut child_lock = process.child.lock().await;
        child_lock.take().expect("child should exist")
    };

    // 将 child 包装在 Arc<Mutex<Option<Child>>> 中，这样可以在多个任务间共享
    let child_arc = Arc::new(tokio::sync::Mutex::new(Some(child)));

    // 启动 stdout 读取任务
    let proc_stdout = process.clone();
    let app_stdout = app.clone();
    let child_for_stdout = child_arc.clone();
    tokio::spawn(async move {
        let stdout = {
            let mut child_lock = child_for_stdout.lock().await;
            child_lock.as_mut().and_then(|c| c.stdout.take())
        };
        if let Some(stdout) = stdout {
            read_stdout(stdout, &proc_stdout, &app_stdout).await;
        }
    });

    // 启动 stderr 读取任务
    let proc_stderr = process.clone();
    let app_stderr = app.clone();
    let child_for_stderr = child_arc.clone();
    tokio::spawn(async move {
        let stderr = {
            let mut child_lock = child_for_stderr.lock().await;
            child_lock.as_mut().and_then(|c| c.stderr.take())
        };
        if let Some(stderr) = stderr {
            read_stderr(stderr, &proc_stderr, &app_stderr).await;
        }
    });

    // 启动进程等待任务
    let proc_wait = process.clone();
    let app_wait = app.clone();
    tokio::spawn(async move {
        wait_exit(&proc_wait, &app_wait, child_arc).await;
        // 进程退出后立即执行清理回调（从索引中移除）
        let handle = cleanup();
        let _ = handle.await;
        // 延迟一段时间让前端有时间获取最终状态
        tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
        log::info!("[process-task] child {} cleanup complete", proc_wait.instance_id);
    });
}

/// 读取 stdout（使用 read_line 而非 lines()）
async fn read_stdout(
    stdout: impl tokio::io::AsyncRead + Unpin,
    process: &ManagedProcess,
    app: &tauri::AppHandle,
) {
    let mut reader = BufReader::new(stdout);
    let mut line = String::new();

    loop {
        line.clear();
        match reader.read_line(&mut line).await {
            Ok(0) => {
                log::debug!("[process-task] stdout[{}] stream ended", process.instance_id);
                break;
            }
            Ok(_) => {
                let trimmed = line.trim_end_matches('\n').trim_end_matches('\r');
                if !trimmed.is_empty() {
                    let event = OutputEvent {
                        stream: "stdout".to_string(),
                        line: trimmed.to_string(),
                        timestamp: now_iso(),
                    };
                    log::debug!("[process-task] stdout[{}]: {}", process.instance_id, trimmed);
                    let _ = app.emit(
                        &format!("instance://{}/output", process.instance_id),
                        event.clone(),
                    );
                    process.append_ring(event).await;
                    // 写入日志文件
                    process.stream_logger.log_stdout(trimmed).await;
                }
            }
            Err(e) => {
                log::error!("[process-task] stdout[{}] read error: {}", process.instance_id, e);
                break;
            }
        }
    }
}

/// 读取 stderr
async fn read_stderr(
    stderr: impl tokio::io::AsyncRead + Unpin,
    process: &ManagedProcess,
    app: &tauri::AppHandle,
) {
    let mut reader = BufReader::new(stderr);
    let mut line = String::new();

    loop {
        line.clear();
        match reader.read_line(&mut line).await {
            Ok(0) => {
                log::debug!("[process-task] stderr[{}] stream ended", process.instance_id);
                break;
            }
            Ok(_) => {
                let trimmed = line.trim_end_matches('\n').trim_end_matches('\r');
                if !trimmed.is_empty() {
                    let event = OutputEvent {
                        stream: "stderr".to_string(),
                        line: trimmed.to_string(),
                        timestamp: now_iso(),
                    };
                    log::debug!("[process-task] stderr[{}]: {}", process.instance_id, trimmed);
                    let _ = app.emit(
                        &format!("instance://{}/output", process.instance_id),
                        event.clone(),
                    );
                    process.append_ring(event).await;
                    // 写入日志文件
                    process.stream_logger.log_stderr(trimmed).await;
                }
            }
            Err(e) => {
                log::error!("[process-task] stderr[{}] read error: {}", process.instance_id, e);
                break;
            }
        }
    }
}

/// 等待进程退出
async fn wait_exit(
    process: &ManagedProcess,
    app: &tauri::AppHandle,
    child_arc: Arc<tokio::sync::Mutex<Option<Child>>>,
) {
    log::info!(
        "[process-task] waiting for child {} to exit",
        process.instance_id
    );

    let status = {
        let mut child_lock = child_arc.lock().await;
        if let Some(ref mut child) = *child_lock {
            child.wait().await
        } else {
            log::warn!("[process-task] child already gone for {}", process.instance_id);
            return;
        }
    };

    match status {
        Ok(code) => {
            if code.success() {
                log::info!(
                    "[process-task] child {} exited successfully",
                    process.instance_id
                );
                process.set_status(ProcessStatus::Stopped).await;
                process.emit_lifecycle(app, "stopped");
            } else {
                log::warn!(
                    "[process-task] child {} exited with error: {:?}",
                    process.instance_id,
                    code.code()
                );
                process.set_status(ProcessStatus::Crashed).await;
                process.emit_lifecycle(app, "crashed");
            }
        }
        Err(e) => {
            log::error!(
                "[process-task] child {} wait failed: {}",
                process.instance_id,
                e
            );
            process.set_status(ProcessStatus::Crashed).await;
            process.emit_lifecycle(app, "crashed");
        }
    }

    process.emit_status(app).await;

    // 先执行清理回调（从索引中移除），这样用户可以立即重新启动
    // 延迟是为了让前端有时间获取最终状态，但索引应该先清理
    log::info!(
        "[process-task] child {} cleanup starting",
        process.instance_id
    );
}

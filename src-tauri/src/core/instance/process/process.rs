use std::collections::VecDeque;
use std::path::Path;
use std::sync::Arc;
use tauri::Emitter;
use tokio::process::{Child, ChildStdin};
use tokio::sync::{Mutex, RwLock};

use super::events::{now_iso, LifecycleEvent, OutputEvent, StatusEvent};
use super::status::ProcessStatus;
use crate::core::instance::StreamLogger;

/// Ring Buffer 容量
const RING_BUFFER_SIZE: usize = 5000;

/// 托管进程
pub struct ManagedProcess {
    pub instance_id: String,
    pub pid: u32,
    pub stdin: Arc<Mutex<ChildStdin>>,
    pub child: Arc<Mutex<Option<Child>>>,
    pub status: Arc<RwLock<ProcessStatus>>,
    pub ring_buffer: Arc<Mutex<VecDeque<OutputEvent>>>,
    pub stream_logger: Arc<StreamLogger>,
}

impl ManagedProcess {
    pub async fn new(
        instance_id: String,
        pid: u32,
        stdin: ChildStdin,
        child: Child,
        working_dir: &Path,
    ) -> Result<Self, std::io::Error> {
        let stream_logger = StreamLogger::new(working_dir).await?;

        Ok(Self {
            instance_id,
            pid,
            stdin: Arc::new(Mutex::new(stdin)),
            child: Arc::new(Mutex::new(Some(child))),
            status: Arc::new(RwLock::new(ProcessStatus::Starting)),
            ring_buffer: Arc::new(Mutex::new(VecDeque::with_capacity(RING_BUFFER_SIZE))),
            stream_logger: Arc::new(stream_logger),
        })
    }

    pub async fn set_status(&self, status: ProcessStatus) {
        let mut s = self.status.write().await;
        *s = status;
    }

    pub async fn get_status(&self) -> ProcessStatus {
        self.status.read().await.clone()
    }

    pub async fn append_ring(&self, event: OutputEvent) {
        let mut buf = self.ring_buffer.lock().await;
        if buf.len() >= RING_BUFFER_SIZE {
            buf.pop_front();
        }
        buf.push_back(event);
    }

    pub async fn get_ring_buffer(&self) -> Vec<OutputEvent> {
        let buf = self.ring_buffer.lock().await;
        buf.iter().cloned().collect()
    }

    pub fn emit_lifecycle(&self, app: &tauri::AppHandle, event: &str) {
        let _ = app.emit(
            &format!("instance://{}/lifecycle", self.instance_id),
            LifecycleEvent {
                event: event.to_string(),
                instance_id: self.instance_id.clone(),
                timestamp: now_iso(),
            },
        );
    }

    pub async fn emit_status(&self, app: &tauri::AppHandle) {
        let status = self.status.read().await.clone();
        let _ = app.emit(
            &format!("instance://{}/status", self.instance_id),
            StatusEvent {
                status: status.to_string(),
                instance_id: self.instance_id.clone(),
                timestamp: now_iso(),
            },
        );
    }
}

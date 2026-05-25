use serde::Serialize;

/// 输出事件
#[derive(Debug, Clone, Serialize)]
pub struct OutputEvent {
    pub stream: String,
    pub line: String,
    pub timestamp: String,
}

/// 生命周期事件
#[derive(Debug, Clone, Serialize)]
pub struct LifecycleEvent {
    pub event: String,
    pub instance_id: String,
    pub timestamp: String,
}

/// 状态变更事件
#[derive(Debug, Clone, Serialize)]
pub struct StatusEvent {
    pub status: String,
    pub instance_id: String,
    pub timestamp: String,
}

pub fn now_iso() -> String {
    chrono::Local::now().to_rfc3339()
}

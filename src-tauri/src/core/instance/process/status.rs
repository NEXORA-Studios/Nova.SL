use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProcessStatus {
    Starting,
    Running,
    Stopping,
    Stopped,
    Crashed,
}

impl ToString for ProcessStatus {
    fn to_string(&self) -> String {
        match self {
            ProcessStatus::Starting => "starting".to_string(),
            ProcessStatus::Running => "running".to_string(),
            ProcessStatus::Stopping => "stopping".to_string(),
            ProcessStatus::Stopped => "stopped".to_string(),
            ProcessStatus::Crashed => "crashed".to_string(),
        }
    }
}

#[derive(Debug)]
pub enum ProcessError {
    Io(std::io::Error),
    AlreadyRunning,
    NotRunning,
    Other(String),
}

impl std::fmt::Display for ProcessError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProcessError::Io(e) => write!(f, "IO 错误: {}", e),
            ProcessError::AlreadyRunning => write!(f, "实例已在运行"),
            ProcessError::NotRunning => write!(f, "实例未运行"),
            ProcessError::Other(s) => write!(f, "{}", s),
        }
    }
}

impl From<std::io::Error> for ProcessError {
    fn from(value: std::io::Error) -> Self {
        Self::Io(value)
    }
}

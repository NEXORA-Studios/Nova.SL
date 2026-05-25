use std::path::Path;
use tokio::fs::{self, File};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::sync::Mutex;

/// 流类型
#[derive(Debug, Clone, Copy)]
pub enum StreamType {
    Stdin,
    Stdout,
    Stderr,
}

impl StreamType {
    pub fn as_str(&self) -> &'static str {
        match self {
            StreamType::Stdin => "stdin",
            StreamType::Stdout => "stdout",
            StreamType::Stderr => "stderr",
        }
    }
}

/// Stream 日志写入器 - 合并为一个文件
#[allow(dead_code)]
pub struct StreamLogger {
    log_file: Mutex<File>,
    log_path: std::path::PathBuf,
}

/// 日志条目
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct LogEntry {
    pub stream: StreamType,
    pub line: String,
    pub timestamp: String,
}

impl StreamLogger {
    /// 创建新的 StreamLogger，在启动时清空或创建日志文件
    pub async fn new(instance_dir: &Path) -> Result<Self, std::io::Error> {
        let stream_dir = instance_dir.join(".nova").join("stream");
        fs::create_dir_all(&stream_dir).await?;

        let log_path = stream_dir.join("console.log");

        // 创建或清空文件
        let log_file = File::create(&log_path).await?;

        log::info!("[stream-logger] initialized: log={}", log_path.display());

        Ok(Self {
            log_file: Mutex::new(log_file),
            log_path,
        })
    }

    /// 写入日志行，格式: <stream> [<timestamp>] | <line>
    pub async fn log(&self, stream: StreamType, line: &str) {
        let timestamp = chrono::Local::now()
            .format("%Y-%m-%dT%H:%M:%S%.3f")
            .to_string();
        let entry = format!("<{}> [{}] | {}\n", stream.as_str(), timestamp, line);

        let mut file = self.log_file.lock().await;
        if let Err(e) = file.write_all(entry.as_bytes()).await {
            log::error!("[stream-logger] failed to write log: {}", e);
        }
        if let Err(e) = file.flush().await {
            log::error!("[stream-logger] failed to flush log: {}", e);
        }
    }

    /// 便捷方法：记录 stdin
    pub async fn log_stdin(&self, line: &str) {
        self.log(StreamType::Stdin, line).await;
    }

    /// 便捷方法：记录 stdout
    pub async fn log_stdout(&self, line: &str) {
        self.log(StreamType::Stdout, line).await;
    }

    /// 便捷方法：记录 stderr
    pub async fn log_stderr(&self, line: &str) {
        self.log(StreamType::Stderr, line).await;
    }

    /// 读取历史日志
    #[allow(dead_code)]
    pub async fn read_history(&self) -> Result<Vec<LogEntry>, std::io::Error> {
        let file = File::open(&self.log_path).await?;
        let reader = BufReader::new(file);
        let mut lines = reader.lines();
        let mut entries = Vec::new();

        while let Ok(Some(line)) = lines.next_line().await {
            if let Some(entry) = Self::parse_log_line(&line) {
                entries.push(entry);
            }
        }

        Ok(entries)
    }

    /// 解析日志行，格式: <stream> [<timestamp>] | <line>
    #[allow(dead_code)]
    fn parse_log_line(line: &str) -> Option<LogEntry> {
        // 解析格式: <stdout> [2024-01-01T12:00:00.000] | message here
        let line = line.strip_prefix('<')?;
        let (stream_str, rest) = line.split_once("> [")?;
        let (timestamp, message) = rest.split_once("] | ")?;

        let stream = match stream_str {
            "stdin" => StreamType::Stdin,
            "stdout" => StreamType::Stdout,
            "stderr" => StreamType::Stderr,
            _ => return None,
        };

        Some(LogEntry {
            stream,
            line: message.to_string(),
            timestamp: timestamp.to_string(),
        })
    }
}

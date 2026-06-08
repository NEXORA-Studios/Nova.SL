use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// 文件条目类型
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FileEntryType {
    File,
    Directory,
    Symlink,
}

/// 文件条目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub entry_type: FileEntryType,
    pub size: u64,
    pub modified: Option<String>,
    pub extension: Option<String>,
}

/// 目录列表结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirectoryListing {
    pub path: String,
    pub entries: Vec<FileEntry>,
}

/// 列出目录内容
pub fn list_directory(dir_path: &PathBuf) -> Result<DirectoryListing, FileExplorerError> {
    log::info!("[file-explorer] listing directory: {}", dir_path.display());

    if !dir_path.exists() {
        log::error!(
            "[file-explorer] directory does not exist: {}",
            dir_path.display()
        );
        return Err(FileExplorerError::NotFound(
            dir_path.to_string_lossy().to_string(),
        ));
    }

    if !dir_path.is_dir() {
        log::error!(
            "[file-explorer] path is not a directory: {}",
            dir_path.display()
        );
        return Err(FileExplorerError::NotADirectory(
            dir_path.to_string_lossy().to_string(),
        ));
    }

    let mut entries = Vec::new();

    for entry in std::fs::read_dir(dir_path)? {
        let entry = entry?;
        let metadata = entry.metadata()?;
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        let entry_type = if metadata.is_dir() {
            FileEntryType::Directory
        } else if metadata.is_symlink() {
            FileEntryType::Symlink
        } else {
            FileEntryType::File
        };

        let extension = path
            .extension()
            .map(|e| e.to_string_lossy().to_string().to_lowercase());

        let modified = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| chrono::DateTime::from_timestamp(d.as_secs() as i64, 0))
            .flatten()
            .map(|dt| dt.to_rfc3339());

        entries.push(FileEntry {
            name,
            path: path.to_string_lossy().to_string(),
            entry_type,
            size: metadata.len(),
            modified,
            extension,
        });
    }

    // 排序：目录在前，然后按名称排序
    entries.sort_by(|a, b| match (&a.entry_type, &b.entry_type) {
        (FileEntryType::Directory, FileEntryType::File) => std::cmp::Ordering::Less,
        (FileEntryType::File, FileEntryType::Directory) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    log::info!("[file-explorer] found {} entries", entries.len());

    Ok(DirectoryListing {
        path: dir_path.to_string_lossy().to_string(),
        entries,
    })
}

/// 获取文件信息
pub fn get_file_info(file_path: &PathBuf) -> Result<FileEntry, FileExplorerError> {
    log::info!("[file-explorer] getting file info: {}", file_path.display());

    if !file_path.exists() {
        log::error!(
            "[file-explorer] file does not exist: {}",
            file_path.display()
        );
        return Err(FileExplorerError::NotFound(
            file_path.to_string_lossy().to_string(),
        ));
    }

    let metadata = std::fs::metadata(file_path)?;
    let name = file_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();

    let entry_type = if metadata.is_dir() {
        FileEntryType::Directory
    } else if metadata.is_symlink() {
        FileEntryType::Symlink
    } else {
        FileEntryType::File
    };

    let extension = file_path
        .extension()
        .map(|e| e.to_string_lossy().to_string().to_lowercase());

    let modified = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| chrono::DateTime::from_timestamp(d.as_secs() as i64, 0))
        .flatten()
        .map(|dt| dt.to_rfc3339());

    Ok(FileEntry {
        name,
        path: file_path.to_string_lossy().to_string(),
        entry_type,
        size: metadata.len(),
        modified,
        extension,
    })
}

/// 检查路径是否存在
#[allow(dead_code)]
pub fn path_exists(path: &PathBuf) -> bool {
    path.exists()
}

/// 检查路径是否为目录
#[allow(dead_code)]
pub fn is_directory(path: &PathBuf) -> bool {
    path.is_dir()
}

/// 检查路径是否为文件
#[allow(dead_code)]
pub fn is_file(path: &PathBuf) -> bool {
    path.is_file()
}

/// 拼接路径
#[allow(dead_code)]
pub fn join_path(base: &PathBuf, components: &[String]) -> PathBuf {
    let mut result = base.clone();
    for component in components {
        result = result.join(component);
    }
    result
}

/// 获取父目录
#[allow(dead_code)]
pub fn get_parent_dir(path: &PathBuf) -> Option<PathBuf> {
    path.parent().map(|p| p.to_path_buf())
}

/// 创建目录
pub fn create_directory(dir_path: &PathBuf) -> Result<(), FileExplorerError> {
    log::info!("[file-explorer] creating directory: {}", dir_path.display());

    if dir_path.exists() {
        log::error!(
            "[file-explorer] path already exists: {}",
            dir_path.display()
        );
        return Err(FileExplorerError::AlreadyExists(
            dir_path.to_string_lossy().to_string(),
        ));
    }

    std::fs::create_dir_all(dir_path)?;
    log::info!("[file-explorer] directory created successfully");
    Ok(())
}

/// 创建空文件
pub fn create_empty_file(file_path: &PathBuf) -> Result<(), FileExplorerError> {
    log::info!("[file-explorer] creating file: {}", file_path.display());

    if file_path.exists() {
        log::error!(
            "[file-explorer] path already exists: {}",
            file_path.display()
        );
        return Err(FileExplorerError::AlreadyExists(
            file_path.to_string_lossy().to_string(),
        ));
    }

    // 确保父目录存在
    if let Some(parent) = file_path.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent)?;
        }
    }

    std::fs::File::create(file_path)?;
    log::info!("[file-explorer] file created successfully");
    Ok(())
}

/// 复制文件或目录（递归）
pub fn copy_path(src: &PathBuf, dst: &PathBuf) -> Result<(), FileExplorerError> {
    log::info!(
        "[file-explorer] copying {} -> {}",
        src.display(),
        dst.display()
    );

    if !src.exists() {
        return Err(FileExplorerError::NotFound(
            src.to_string_lossy().to_string(),
        ));
    }

    if dst.exists() {
        return Err(FileExplorerError::AlreadyExists(
            dst.to_string_lossy().to_string(),
        ));
    }

    if src.is_file() {
        if let Some(parent) = dst.parent() {
            std::fs::create_dir_all(parent)?;
        }
        std::fs::copy(src, dst)?;
    } else if src.is_dir() {
        copy_dir_recursive(src, dst)?;
    }

    log::info!("[file-explorer] copy completed");
    Ok(())
}

fn copy_dir_recursive(src: &PathBuf, dst: &PathBuf) -> Result<(), FileExplorerError> {
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            std::fs::copy(&src_path, &dst_path)?;
        }
    }
    Ok(())
}

/// 移动文件或目录
pub fn move_path(src: &PathBuf, dst: &PathBuf) -> Result<(), FileExplorerError> {
    log::info!(
        "[file-explorer] moving {} -> {}",
        src.display(),
        dst.display()
    );

    if !src.exists() {
        return Err(FileExplorerError::NotFound(
            src.to_string_lossy().to_string(),
        ));
    }

    if dst.exists() {
        return Err(FileExplorerError::AlreadyExists(
            dst.to_string_lossy().to_string(),
        ));
    }

    if let Some(parent) = dst.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent)?;
        }
    }

    std::fs::rename(src, dst)?;
    log::info!("[file-explorer] move completed");
    Ok(())
}

/// 重命名文件或目录
pub fn rename_path(src: &PathBuf, new_name: &str) -> Result<(), FileExplorerError> {
    log::info!("[file-explorer] renaming {} -> {}", src.display(), new_name);

    if let Err(e) = validate_name(new_name) {
        return Err(FileExplorerError::Io(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            e,
        )));
    }

    let parent = src.parent().ok_or_else(|| {
        FileExplorerError::Io(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            "无法获取父目录",
        ))
    })?;

    let dst = parent.join(new_name);

    if dst.exists() {
        return Err(FileExplorerError::AlreadyExists(
            dst.to_string_lossy().to_string(),
        ));
    }

    std::fs::rename(src, dst)?;
    log::info!("[file-explorer] rename completed");
    Ok(())
}

/// 校验文件名/文件夹名是否合法（跨平台）
/// 返回 Ok(()) 表示合法，Err(String) 包含错误原因
pub fn validate_name(name: &str) -> Result<(), String> {
    if name.is_empty() {
        return Err("名称不能为空".to_string());
    }

    if name.len() > 255 {
        return Err("名称长度不能超过 255 个字符".to_string());
    }

    // Windows 保留名称（不区分大小写）
    let windows_reserved = [
        "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8",
        "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
    ];
    let upper = name.to_uppercase();
    // 处理带扩展名的情况，如 CON.txt
    let name_without_ext = upper.split('.').next().unwrap_or("");
    if windows_reserved.contains(&name_without_ext) {
        return Err(format!("'{}' 是 Windows 系统保留名称，不能使用", name));
    }

    // Windows / Unix 非法字符
    let invalid_chars: &[char] = if cfg!(target_os = "windows") {
        &['<', '>', ':', '"', '/', '\\', '|', '?', '*']
    } else {
        &['/']
    };

    if let Some(ch) = name.chars().find(|c| invalid_chars.contains(c)) {
        return Err(format!("名称包含非法字符: '{}'", ch));
    }

    // 不允许特殊开头和结尾（Windows 限制）
    //  - 空格开头/结尾
    //  - 点号结尾
    if cfg!(target_os = "windows") {
        if name.starts_with(' ') || name.ends_with(' ') {
            return Err("名称不能以空格开头或结尾".to_string());
        }
        if name.ends_with('.') {
            return Err("名称不能以点号结尾".to_string());
        }
    }

    // 不允许仅由点组成（如 . 或 ..）
    if name.chars().all(|c| c == '.') {
        return Err("名称不能仅由点号组成".to_string());
    }

    Ok(())
}

/// 删除目录及其所有内容（递归）
pub fn delete_path(path: &PathBuf) -> Result<(), FileExplorerError> {
    log::info!("[file-explorer] deleting path: {}", path.display());

    if !path.exists() {
        return Err(FileExplorerError::NotFound(
            path.to_string_lossy().to_string(),
        ));
    }

    if path.is_file() {
        std::fs::remove_file(path)?;
    } else if path.is_dir() {
        std::fs::remove_dir_all(path)?;
    }

    log::info!("[file-explorer] delete completed");
    Ok(())
}

/// 错误类型
#[derive(Debug)]
pub enum FileExplorerError {
    Io(std::io::Error),
    NotFound(String),
    NotADirectory(String),
    AlreadyExists(String),
}

impl From<std::io::Error> for FileExplorerError {
    fn from(value: std::io::Error) -> Self {
        Self::Io(value)
    }
}

impl std::fmt::Display for FileExplorerError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            FileExplorerError::Io(e) => write!(f, "IO error: {}", e),
            FileExplorerError::NotFound(p) => write!(f, "Path not found: {}", p),
            FileExplorerError::NotADirectory(p) => write!(f, "Not a directory: {}", p),
            FileExplorerError::AlreadyExists(p) => write!(f, "Path already exists: {}", p),
        }
    }
}

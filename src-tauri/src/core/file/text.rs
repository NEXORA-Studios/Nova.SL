use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// 支持的文本文件格式
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TextFileFormat {
    Json,
    Toml,
    Yaml,
    Properties,
    Plain,
}

impl TextFileFormat {
    /// 从文件扩展名推断格式
    pub fn from_extension(ext: &str) -> Self {
        match ext.to_lowercase().as_str() {
            "json" => TextFileFormat::Json,
            "toml" => TextFileFormat::Toml,
            "yaml" | "yml" => TextFileFormat::Yaml,
            "properties" | "props" => TextFileFormat::Properties,
            _ => TextFileFormat::Plain,
        }
    }

    /// 从文件路径推断格式
    pub fn from_path(path: &PathBuf) -> Self {
        path.extension()
            .map(|e| Self::from_extension(&e.to_string_lossy()))
            .unwrap_or(TextFileFormat::Plain)
    }
}

/// 文本文件内容（通用表示）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum TextContent {
    Json(serde_json::Value),
    Toml(toml::Value),
    Yaml(serde_yaml::Value),
    Properties(std::collections::HashMap<String, String>),
    Plain(String),
}

/// 读取文本文件
pub fn read_text_file(file_path: &PathBuf) -> Result<(TextFileFormat, TextContent), TextFileError> {
    log::info!("[file-text] reading text file: {}", file_path.display());

    if !file_path.exists() {
        log::error!("[file-text] file does not exist: {}", file_path.display());
        return Err(TextFileError::NotFound(
            file_path.to_string_lossy().to_string(),
        ));
    }

    if !file_path.is_file() {
        log::error!("[file-text] path is not a file: {}", file_path.display());
        return Err(TextFileError::NotAFile(
            file_path.to_string_lossy().to_string(),
        ));
    }

    let format = TextFileFormat::from_path(file_path);
    let content = std::fs::read_to_string(file_path)?;

    let parsed = match &format {
        TextFileFormat::Json => {
            let value: serde_json::Value = serde_json::from_str(&content)
                .map_err(|e| TextFileError::ParseError(format!("JSON parse error: {}", e)))?;
            TextContent::Json(value)
        }
        TextFileFormat::Toml => {
            let value: toml::Value = toml::from_str(&content)
                .map_err(|e| TextFileError::ParseError(format!("TOML parse error: {}", e)))?;
            TextContent::Toml(value)
        }
        TextFileFormat::Yaml => {
            let value: serde_yaml::Value = serde_yaml::from_str(&content)
                .map_err(|e| TextFileError::ParseError(format!("YAML parse error: {}", e)))?;
            TextContent::Yaml(value)
        }
        TextFileFormat::Properties => {
            let props = parse_properties(&content)?;
            TextContent::Properties(props)
        }
        TextFileFormat::Plain => TextContent::Plain(content),
    };

    log::info!("[file-text] successfully read file as {:?}", format);
    Ok((format, parsed))
}

/// 写入文本文件
pub fn write_text_file(
    file_path: &PathBuf,
    format: TextFileFormat,
    content: &TextContent,
) -> Result<(), TextFileError> {
    log::info!("[file-text] writing text file: {}", file_path.display());

    let serialized = match (format, content) {
        (TextFileFormat::Json, TextContent::Json(value)) => serde_json::to_string_pretty(value)?,
        (TextFileFormat::Toml, TextContent::Toml(value)) => toml::to_string_pretty(value)?,
        (TextFileFormat::Yaml, TextContent::Yaml(value)) => serde_yaml::to_string(value)?,
        (TextFileFormat::Properties, TextContent::Properties(props)) => {
            serialize_properties(props)?
        }
        (TextFileFormat::Plain, TextContent::Plain(text)) => text.clone(),
        _ => {
            return Err(TextFileError::FormatMismatch(
                "Content type does not match specified format".to_string(),
            ));
        }
    };

    // 确保父目录存在
    if let Some(parent) = file_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    std::fs::write(file_path, serialized)?;
    log::info!("[file-text] successfully wrote file");
    Ok(())
}

/// 以特定格式写入文本文件（自动序列化）
pub fn write_text_file_raw(
    file_path: &PathBuf,
    format: TextFileFormat,
    content: &str,
) -> Result<(), TextFileError> {
    log::info!("[file-text] writing raw text file: {}", file_path.display());

    // 验证内容格式是否正确
    match &format {
        TextFileFormat::Json => {
            let _: serde_json::Value = serde_json::from_str(content)
                .map_err(|e| TextFileError::ParseError(format!("JSON validation error: {}", e)))?;
        }
        TextFileFormat::Toml => {
            let _: toml::Value = toml::from_str(content)
                .map_err(|e| TextFileError::ParseError(format!("TOML validation error: {}", e)))?;
        }
        TextFileFormat::Yaml => {
            let _: serde_yaml::Value = serde_yaml::from_str(content)
                .map_err(|e| TextFileError::ParseError(format!("YAML validation error: {}", e)))?;
        }
        _ => {}
    }

    // 确保父目录存在
    if let Some(parent) = file_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    std::fs::write(file_path, content)?;
    log::info!("[file-text] successfully wrote raw file");
    Ok(())
}

/// 解析 properties 文件
fn parse_properties(
    content: &str,
) -> Result<std::collections::HashMap<String, String>, TextFileError> {
    use java_properties::read;
    use std::io::Cursor;

    let cursor = Cursor::new(content);
    let props = read(cursor)
        .map_err(|e| TextFileError::ParseError(format!("Properties parse error: {}", e)))?;

    Ok(props)
}

/// 序列化 properties 文件
fn serialize_properties(
    props: &std::collections::HashMap<String, String>,
) -> Result<String, TextFileError> {
    use java_properties::write;
    use std::io::Cursor;

    let mut cursor = Cursor::new(Vec::new());
    write(&mut cursor, props)
        .map_err(|e| TextFileError::ParseError(format!("Properties serialize error: {}", e)))?;

    let bytes = cursor.into_inner();
    String::from_utf8(bytes)
        .map_err(|e| TextFileError::ParseError(format!("UTF-8 encoding error: {}", e)))
}

/// 读取原始文本内容（不解析）
pub fn read_raw_text(file_path: &PathBuf) -> Result<String, TextFileError> {
    log::info!("[file-text] reading raw text: {}", file_path.display());

    if !file_path.exists() {
        log::error!("[file-text] file does not exist: {}", file_path.display());
        return Err(TextFileError::NotFound(
            file_path.to_string_lossy().to_string(),
        ));
    }

    let content = std::fs::read_to_string(file_path)?;
    Ok(content)
}

/// 写入原始文本内容
pub fn write_raw_text(file_path: &PathBuf, content: &str) -> Result<(), TextFileError> {
    log::info!("[file-text] writing raw text: {}", file_path.display());

    // 确保父目录存在
    if let Some(parent) = file_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    std::fs::write(file_path, content)?;
    Ok(())
}

/// 错误类型
#[derive(Debug)]
pub enum TextFileError {
    Io(std::io::Error),
    NotFound(String),
    NotAFile(String),
    ParseError(String),
    FormatMismatch(String),
    JsonError(serde_json::Error),
    TomlSerialize(toml::ser::Error),
    YamlError(serde_yaml::Error),
}

impl From<std::io::Error> for TextFileError {
    fn from(value: std::io::Error) -> Self {
        Self::Io(value)
    }
}

impl From<serde_json::Error> for TextFileError {
    fn from(value: serde_json::Error) -> Self {
        Self::JsonError(value)
    }
}

impl From<toml::ser::Error> for TextFileError {
    fn from(value: toml::ser::Error) -> Self {
        Self::TomlSerialize(value)
    }
}

impl From<serde_yaml::Error> for TextFileError {
    fn from(value: serde_yaml::Error) -> Self {
        Self::YamlError(value)
    }
}

impl std::fmt::Display for TextFileError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TextFileError::Io(e) => write!(f, "IO error: {}", e),
            TextFileError::NotFound(p) => write!(f, "File not found: {}", p),
            TextFileError::NotAFile(p) => write!(f, "Not a file: {}", p),
            TextFileError::ParseError(e) => write!(f, "Parse error: {}", e),
            TextFileError::FormatMismatch(e) => write!(f, "Format mismatch: {}", e),
            TextFileError::JsonError(e) => write!(f, "JSON error: {}", e),
            TextFileError::TomlSerialize(e) => write!(f, "TOML serialize error: {}", e),
            TextFileError::YamlError(e) => write!(f, "YAML error: {}", e),
        }
    }
}

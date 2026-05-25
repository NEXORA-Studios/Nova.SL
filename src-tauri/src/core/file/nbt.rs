use fastnbt::{from_bytes, Value};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// NBT 节点类型
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum NbtNodeType {
    End,
    Byte,
    Short,
    Int,
    Long,
    Float,
    Double,
    ByteArray,
    String,
    List,
    Compound,
    IntArray,
    LongArray,
}

impl From<&Value> for NbtNodeType {
    fn from(value: &Value) -> Self {
        match value {
            Value::Byte(_) => NbtNodeType::Byte,
            Value::Short(_) => NbtNodeType::Short,
            Value::Int(_) => NbtNodeType::Int,
            Value::Long(_) => NbtNodeType::Long,
            Value::Float(_) => NbtNodeType::Float,
            Value::Double(_) => NbtNodeType::Double,
            Value::ByteArray(_) => NbtNodeType::ByteArray,
            Value::String(_) => NbtNodeType::String,
            Value::List(_) => NbtNodeType::List,
            Value::Compound(_) => NbtNodeType::Compound,
            Value::IntArray(_) => NbtNodeType::IntArray,
            Value::LongArray(_) => NbtNodeType::LongArray,
        }
    }
}

/// NBT 树节点
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NbtNode {
    pub name: String,
    pub node_type: NbtNodeType,
    pub value: Option<String>,
    pub children: Vec<NbtNode>,
}

/// NBT 文件解析结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NbtTree {
    pub file_path: String,
    pub root: NbtNode,
    pub compression: String,
}

/// 读取并解析 NBT 文件
pub fn read_nbt_file(file_path: &PathBuf) -> Result<NbtTree, NbtError> {
    log::info!("[file-nbt] reading NBT file: {}", file_path.display());

    if !file_path.exists() {
        log::error!("[file-nbt] file does not exist: {}", file_path.display());
        return Err(NbtError::NotFound(file_path.to_string_lossy().to_string()));
    }

    if !file_path.is_file() {
        log::error!("[file-nbt] path is not a file: {}", file_path.display());
        return Err(NbtError::NotAFile(file_path.to_string_lossy().to_string()));
    }

    let bytes = std::fs::read(file_path)?;
    log::debug!("[file-nbt] read {} bytes", bytes.len());

    // 检测压缩类型
    let compression = detect_compression(&bytes);
    log::debug!("[file-nbt] detected compression: {:?}", compression);

    // 解压数据
    let decompressed = decompress(&bytes, &compression)?;

    // 解析 NBT
    let nbt_value: Value = from_bytes(&decompressed)
        .map_err(|e| NbtError::ParseError(format!("NBT parse error: {}", e)))?;

    // 转换为树结构
    let root = value_to_node("root", &nbt_value);

    log::info!("[file-nbt] successfully parsed NBT file");

    Ok(NbtTree {
        file_path: file_path.to_string_lossy().to_string(),
        root,
        compression: format!("{:?}", compression).to_lowercase(),
    })
}

/// 压缩类型
#[derive(Debug, Clone)]
enum CompressionType {
    None,
    Gzip,
    Zlib,
}

/// 检测压缩类型
fn detect_compression(data: &[u8]) -> CompressionType {
    if data.len() < 2 {
        return CompressionType::None;
    }

    // Gzip magic: 0x1f 0x8b
    if data[0] == 0x1f && data[1] == 0x8b {
        return CompressionType::Gzip;
    }

    // Zlib magic: check first byte
    // 0x78 0x9c = default compression
    // 0x78 0xda = best compression
    // 0x78 0x01 = no compression
    if data[0] == 0x78 && (data[1] == 0x9c || data[1] == 0xda || data[1] == 0x01) {
        return CompressionType::Zlib;
    }

    CompressionType::None
}

/// 解压数据
fn decompress(data: &[u8], compression: &CompressionType) -> Result<Vec<u8>, NbtError> {
    match compression {
        CompressionType::None => Ok(data.to_vec()),
        CompressionType::Gzip => {
            use flate2::read::GzDecoder;
            use std::io::Read;

            let mut decoder = GzDecoder::new(data);
            let mut result = Vec::new();
            decoder
                .read_to_end(&mut result)
                .map_err(|e| NbtError::DecompressError(format!("Gzip decompression error: {}", e)))?;
            Ok(result)
        }
        CompressionType::Zlib => {
            use flate2::read::ZlibDecoder;
            use std::io::Read;

            let mut decoder = ZlibDecoder::new(data);
            let mut result = Vec::new();
            decoder
                .read_to_end(&mut result)
                .map_err(|e| NbtError::DecompressError(format!("Zlib decompression error: {}", e)))?;
            Ok(result)
        }
    }
}

/// 将 NBT Value 转换为树节点
fn value_to_node(name: &str, value: &Value) -> NbtNode {
    let node_type = NbtNodeType::from(value);

    match value {
        Value::Byte(v) => NbtNode {
            name: name.to_string(),
            node_type,
            value: Some(v.to_string()),
            children: Vec::new(),
        },
        Value::Short(v) => NbtNode {
            name: name.to_string(),
            node_type,
            value: Some(v.to_string()),
            children: Vec::new(),
        },
        Value::Int(v) => NbtNode {
            name: name.to_string(),
            node_type,
            value: Some(v.to_string()),
            children: Vec::new(),
        },
        Value::Long(v) => NbtNode {
            name: name.to_string(),
            node_type,
            value: Some(v.to_string()),
            children: Vec::new(),
        },
        Value::Float(v) => NbtNode {
            name: name.to_string(),
            node_type,
            value: Some(v.to_string()),
            children: Vec::new(),
        },
        Value::Double(v) => NbtNode {
            name: name.to_string(),
            node_type,
            value: Some(v.to_string()),
            children: Vec::new(),
        },
        Value::String(v) => NbtNode {
            name: name.to_string(),
            node_type,
            value: Some(v.clone()),
            children: Vec::new(),
        },
        Value::ByteArray(arr) => NbtNode {
            name: name.to_string(),
            node_type,
            value: Some(format!("[{} bytes]", arr.len())),
            children: Vec::new(),
        },
        Value::IntArray(arr) => NbtNode {
            name: name.to_string(),
            node_type,
            value: Some(format!("[{} ints]", arr.len())),
            children: Vec::new(),
        },
        Value::LongArray(arr) => NbtNode {
            name: name.to_string(),
            node_type,
            value: Some(format!("[{} longs]", arr.len())),
            children: Vec::new(),
        },
        Value::List(list) => {
            let children: Vec<NbtNode> = list
                .iter()
                .enumerate()
                .map(|(i, v)| value_to_node(&format!("[{}]", i), v))
                .collect();
            NbtNode {
                name: name.to_string(),
                node_type,
                value: Some(format!("[{} items]", list.len())),
                children,
            }
        }
        Value::Compound(map) => {
            let children: Vec<NbtNode> = map
                .iter()
                .map(|(k, v)| value_to_node(k, v))
                .collect();
            NbtNode {
                name: name.to_string(),
                node_type,
                value: Some(format!("{{{}}} entries", map.len())),
                children,
            }
        }
    }
}

/// 检查文件是否为 NBT 文件（根据扩展名）
#[allow(dead_code)]
pub fn is_nbt_file(file_path: &PathBuf) -> bool {
    file_path
        .extension()
        .map(|e| {
            let ext = e.to_string_lossy().to_lowercase();
            ext == "dat" || ext == "nbt"
        })
        .unwrap_or(false)
}

/// 错误类型
#[derive(Debug)]
pub enum NbtError {
    Io(std::io::Error),
    NotFound(String),
    NotAFile(String),
    ParseError(String),
    DecompressError(String),
}

impl From<std::io::Error> for NbtError {
    fn from(value: std::io::Error) -> Self {
        Self::Io(value)
    }
}

impl std::fmt::Display for NbtError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            NbtError::Io(e) => write!(f, "IO error: {}", e),
            NbtError::NotFound(p) => write!(f, "File not found: {}", p),
            NbtError::NotAFile(p) => write!(f, "Not a file: {}", p),
            NbtError::ParseError(e) => write!(f, "Parse error: {}", e),
            NbtError::DecompressError(e) => write!(f, "Decompress error: {}", e),
        }
    }
}

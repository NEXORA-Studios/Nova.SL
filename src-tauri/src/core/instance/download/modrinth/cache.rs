use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

/// 单个缓存条目
#[derive(Debug, Serialize, Deserialize)]
pub struct CacheEntry {
    pub cached_at: i64,
    pub body: String,
}

/// Modrinth API 磁盘缓存
#[derive(Debug, Clone)]
pub struct ModrinthCache {
    pub cache_dir: PathBuf,
}

impl ModrinthCache {
    /// 创建新的缓存实例，目录不存在时自动创建
    pub fn new(cache_dir: PathBuf) -> Self {
        if !cache_dir.exists() {
            if let Err(e) = std::fs::create_dir_all(&cache_dir) {
                log::error!(
                    "[modrinth_cache] Failed to create cache dir {:?}: {}",
                    cache_dir,
                    e
                );
            } else {
                log::info!("[modrinth_cache] Created cache dir: {:?}", cache_dir);
            }
        }
        Self { cache_dir }
    }

    /// 根据 key 获取缓存内容，ttl 单位为秒
    pub fn get(&self, key: &str, ttl: u64) -> Option<String> {
        let path = self.cache_file_path(key);

        if !path.exists() {
            return None;
        }

        let data = std::fs::read(&path).ok()?;
        let entry: CacheEntry = serde_json::from_slice(&data).ok()?;

        let now = current_timestamp();
        if entry.cached_at + (ttl as i64) > now {
            log::debug!("[modrinth_cache] Cache hit: key={}", key);
            Some(entry.body)
        } else {
            log::debug!("[modrinth_cache] Cache expired: key={}", key);
            if let Err(e) = std::fs::remove_file(&path) {
                log::warn!(
                    "[modrinth_cache] Failed to remove expired cache file {:?}: {}",
                    path,
                    e
                );
            }
            None
        }
    }

    /// 写入缓存
    pub fn set(&self, key: &str, body: &str) -> Result<(), std::io::Error> {
        let path = self.cache_file_path(key);
        let entry = CacheEntry {
            cached_at: current_timestamp(),
            body: body.to_string(),
        };
        let data = serde_json::to_vec(&entry).map_err(|e| {
            std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                format!("JSON serialize error: {}", e),
            )
        })?;
        std::fs::write(&path, data)?;
        log::debug!(
            "[modrinth_cache] Cache written: key={}, path={:?}",
            key,
            path
        );
        Ok(())
    }

    /// 清空整个缓存目录
    pub fn clear(&self) -> Result<(), std::io::Error> {
        if self.cache_dir.exists() {
            std::fs::remove_dir_all(&self.cache_dir)?;
            log::info!("[modrinth_cache] Cache cleared: {:?}", self.cache_dir);
        }
        Ok(())
    }

    /// 根据 key 计算缓存文件路径
    fn cache_file_path(&self, key: &str) -> PathBuf {
        let filename = format!("{}.json", make_key(key));
        self.cache_dir.join(filename)
    }
}

/// 使用 SHA256 对 URL 进行哈希，返回十六进制字符串作为文件名
pub fn make_key(url: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(url.as_bytes());
    let result = hasher.finalize();
    hex::encode(result)
}

/// 获取当前 Unix 时间戳
fn current_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}

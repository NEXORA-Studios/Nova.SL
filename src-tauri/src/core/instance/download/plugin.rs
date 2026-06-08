use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::RwLock;

// ==================== 数据类型 ====================

/// Build Channel 枚举
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum BuildChannel {
    Stable,
    Beta,
    Alpha,
}

/// 版本信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionInfo {
    pub id: String,
    pub display_name: Option<String>,
    pub supported: bool,
}

/// 版本分组信息（大版本号包含多个小版本号）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionGroup {
    pub id: String,
    pub display_name: Option<String>,
    pub versions: Vec<VersionInfo>,
}

/// 构建信息（用于需要选择构建的 Loader）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuildInfo {
    pub id: String,
    pub display_name: Option<String>,
    pub channel: BuildChannel,
}

/// Loader 基本信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoaderInfo {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    /// 是否支持构建选择
    pub supports_builds: bool,
    /// 是否需要后处理（如 Forge installer）
    pub needs_post_process: bool,
}

/// 下载结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadResult {
    pub jar_path: String,
    pub loader: String,
    pub version: String,
}

/// 插件错误
#[derive(Debug, Serialize)]
pub enum PluginError {
    ApiError(String),
    ParseError(String),
    NotImplemented(String),
    UnsupportedLoader(String),
    DownloadFailed(String),
    Io(String),
    PostProcessFailed(String),
}

impl std::fmt::Display for PluginError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PluginError::ApiError(e) => write!(f, "API error: {}", e),
            PluginError::ParseError(e) => write!(f, "Parse error: {}", e),
            PluginError::NotImplemented(e) => write!(f, "Not implemented: {}", e),
            PluginError::UnsupportedLoader(e) => write!(f, "Unsupported loader: {}", e),
            PluginError::DownloadFailed(e) => write!(f, "Download failed: {}", e),
            PluginError::Io(e) => write!(f, "IO error: {}", e),
            PluginError::PostProcessFailed(e) => write!(f, "Post-process failed: {}", e),
        }
    }
}

impl From<std::io::Error> for PluginError {
    fn from(value: std::io::Error) -> Self {
        Self::Io(value.to_string())
    }
}

impl From<reqwest::Error> for PluginError {
    fn from(value: reqwest::Error) -> Self {
        Self::DownloadFailed(value.to_string())
    }
}

// ==================== LoaderPlugin Trait ====================

/// Loader 插件 trait
/// 每个服务器核心类型实现此 trait，通过注册表动态加载
#[async_trait]
pub trait LoaderPlugin: Send + Sync {
    /// 获取 Loader 基本信息
    fn get_loader_info(&self) -> LoaderInfo;

    /// 获取所有可用版本列表
    async fn get_versions(&self) -> Result<Vec<VersionInfo>, PluginError>;

    /// 获取指定版本的可用构建列表
    /// 默认返回空列表（不需要选择构建的 Loader 可不实现）
    async fn get_builds_from_version(&self, _version: &str) -> Result<Vec<BuildInfo>, PluginError> {
        Ok(Vec::new())
    }

    /// 下载服务器核心到指定目录
    /// 返回下载后的 jar 文件路径
    async fn download_loader(
        &self,
        version: &str,
        build: Option<&str>,
        output_dir: &PathBuf,
        jar_name: Option<&str>,
    ) -> Result<DownloadResult, PluginError>;

    /// 获取默认的 jar 文件名
    fn default_jar_name(&self, version: &str, build: Option<&str>) -> String;

    /// 后处理（用于 Forge 等需要下载后安装的 Loader）
    /// 默认直接返回成功（不需要后处理的 Loader 可不实现）
    async fn build_for_instance(
        &self,
        _instance_dir: &PathBuf,
        _version: &str,
        _build: Option<&str>,
    ) -> Result<(), PluginError> {
        Ok(())
    }

    /// 获取官方推荐的 JVM 参数列表
    /// 如果该加载器没有官方推荐参数，返回空数组
    async fn get_recommended_jvm_args(
        &self,
        _loader: &str,
        _version: &str,
        _build: Option<&str>,
    ) -> Result<Vec<String>, PluginError> {
        Ok(Vec::new())
    }
}

// ==================== 插件注册表 ====================

/// 全局插件注册表
pub struct PluginRegistry {
    plugins: HashMap<String, Arc<dyn LoaderPlugin>>,
}

impl PluginRegistry {
    /// 创建空注册表
    pub fn new() -> Self {
        Self {
            plugins: HashMap::new(),
        }
    }

    /// 注册一个插件
    pub fn register<P: LoaderPlugin + 'static>(&mut self, plugin: P) {
        let info = plugin.get_loader_info();
        let id = info.id.clone();
        self.plugins.insert(id, Arc::new(plugin));
        log::info!(
            "[plugin-registry] registered loader: {} ({})",
            info.id,
            info.name
        );
    }

    /// 获取指定 ID 的插件
    pub fn get(&self, id: &str) -> Option<Arc<dyn LoaderPlugin>> {
        self.plugins.get(id).cloned()
    }

    /// 获取所有已注册的 Loader 信息
    pub fn get_all_loaders(&self) -> Vec<LoaderInfo> {
        self.plugins.values().map(|p| p.get_loader_info()).collect()
    }

    /// 获取所有已注册的 Loader ID-名称映射
    pub fn get_loader_list(&self) -> Vec<(String, String)> {
        self.plugins
            .values()
            .map(|p| {
                let info = p.get_loader_info();
                (info.id, info.name)
            })
            .collect()
    }

    /// 检查指定 Loader 是否已注册
    pub fn has_loader(&self, id: &str) -> bool {
        self.plugins.contains_key(id)
    }
}

impl Default for PluginRegistry {
    fn default() -> Self {
        Self::new()
    }
}

/// 全局注册表实例（线程安全）
#[allow(dead_code)]
pub type SharedRegistry = Arc<RwLock<PluginRegistry>>;

/// 创建默认注册表（预装所有内置插件）
pub fn create_default_registry() -> PluginRegistry {
    let mut registry = PluginRegistry::new();

    // 注册所有内置 Loader 插件
    registry.register(super::plugins::paper::create_plugin());
    registry.register(super::plugins::velocity::create_plugin());
    registry.register(super::plugins::foila::create_plugin());

    registry
}

// ==================== 通用 HTTP 辅助函数 ====================

/// PaperMC Fill API 要求合法的 User-Agent，否则请求会被拒绝或限流
const USER_AGENT: &str = "NovaSL/1.0.0 (https://github.com/NEOXRA-Studios/Nova.SL)";

/// 将版本列表按大版本号分组（如 1.21.1, 1.21.2 -> 1.21.x）
/// 如果解析失败，则返回一个包含所有版本的大组
pub fn group_versions(versions: Vec<VersionInfo>) -> Vec<VersionGroup> {
    use std::collections::BTreeMap;

    let mut groups: BTreeMap<String, Vec<VersionInfo>> = BTreeMap::new();
    let mut ungrouped: Vec<VersionInfo> = Vec::new();

    for v in versions {
        let parts: Vec<&str> = v.id.split('.').collect();
        if parts.len() >= 2 && parts[0].parse::<u32>().is_ok() && parts[1].parse::<u32>().is_ok() {
            let group_id = format!("{}.{}", parts[0], parts[1]);
            groups.entry(group_id).or_default().push(v);
        } else {
            ungrouped.push(v);
        }
    }

    // 对每个组内的版本按 id 降序排列（最新的在前面）
    for versions in groups.values_mut() {
        versions.sort_by(|a, b| b.id.cmp(&a.id));
    }

    let mut result: Vec<VersionGroup> = groups
        .into_iter()
        .map(|(id, versions)| {
            let display_name = format!(
                "{}.{}",
                id.split('.').next().unwrap_or(""),
                id.split('.').nth(1).unwrap_or("")
            );
            VersionGroup {
                id: id.clone(),
                display_name: Some(display_name),
                versions,
            }
        })
        .collect();

    // 按组 ID 降序排列（最新的在前面）
    result.sort_by(|a, b| b.id.cmp(&a.id));

    // 如果存在无法解析的版本，放入一个兜底组
    if !ungrouped.is_empty() {
        // 兜底组也按 id 降序排列
        ungrouped.sort_by(|a, b| b.id.cmp(&a.id));
        result.push(VersionGroup {
            id: "other".to_string(),
            display_name: Some("其他".to_string()),
            versions: ungrouped,
        });
    }

    result
}

pub async fn fetch_json<T: serde::de::DeserializeOwned>(url: &str) -> Result<T, PluginError> {
    let client = reqwest::Client::new();
    let response = client
        .get(url)
        .header(reqwest::header::USER_AGENT, USER_AGENT)
        .send()
        .await
        .map_err(|e| PluginError::ApiError(e.to_string()))?;

    if !response.status().is_success() {
        return Err(PluginError::ApiError(format!(
            "HTTP {} from {}",
            response.status(),
            url
        )));
    }

    // 先获取文本，打印 debug 日志，再解析
    let text = response
        .text()
        .await
        .map_err(|e| PluginError::ParseError(format!("Failed to read response text: {}", e)))?;

    log::debug!("[fetch_json] URL: {}", url);
    log::debug!(
        "[fetch_json] Response (first 500 chars): {}",
        text.chars().take(500).collect::<String>()
    );

    serde_json::from_str::<T>(&text).map_err(|e| {
        log::error!("[fetch_json] Parse error for URL {}: {}", url, e);
        log::error!("[fetch_json] Full response: {}", text);
        PluginError::ParseError(format!("error decoding response body: {}", e))
    })
}

#[allow(dead_code)]
pub async fn fetch_text(url: &str) -> Result<String, PluginError> {
    let client = reqwest::Client::new();
    let response = client
        .get(url)
        .header(reqwest::header::USER_AGENT, USER_AGENT)
        .send()
        .await
        .map_err(|e| PluginError::ApiError(e.to_string()))?;

    if !response.status().is_success() {
        return Err(PluginError::ApiError(format!(
            "HTTP {} from {}",
            response.status(),
            url
        )));
    }

    response
        .text()
        .await
        .map_err(|e| PluginError::ParseError(e.to_string()))
}

/// 通用下载文件辅助函数
pub async fn download_file(url: &str, dest: &PathBuf) -> Result<(), PluginError> {
    let client = reqwest::Client::new();
    let response = client
        .get(url)
        .header(reqwest::header::USER_AGENT, USER_AGENT)
        .send()
        .await?;

    if !response.status().is_success() {
        return Err(PluginError::DownloadFailed(format!(
            "HTTP {} from {}",
            response.status(),
            url
        )));
    }

    let bytes = response.bytes().await?;
    std::fs::create_dir_all(dest.parent().unwrap_or(dest))?;
    std::fs::write(dest, &bytes)?;

    Ok(())
}

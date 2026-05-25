pub mod plugin;
pub mod plugins;

use std::path::PathBuf;

pub use plugin::{BuildInfo, DownloadResult, LoaderInfo, PluginError, VersionGroup};

use plugin::PluginRegistry;

/// 下载错误
#[derive(Debug, serde::Serialize)]
#[allow(dead_code, unused_variables)]
pub enum DownloadError {
    Plugin(PluginError),
    Io(String),
    InvalidLoader(String),
    InvalidVersion(String),
    InvalidBuild(String),
    DownloadFailed(String),
    WriteFailed(String),
}

impl std::fmt::Display for DownloadError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DownloadError::Plugin(e) => write!(f, "Plugin error: {}", e),
            DownloadError::Io(e) => write!(f, "IO error: {}", e),
            DownloadError::InvalidLoader(e) => write!(f, "Invalid loader: {}", e),
            DownloadError::InvalidVersion(e) => write!(f, "Invalid version: {}", e),
            DownloadError::InvalidBuild(e) => write!(f, "Invalid build: {}", e),
            DownloadError::DownloadFailed(e) => write!(f, "Download failed: {}", e),
            DownloadError::WriteFailed(e) => write!(f, "Write failed: {}", e),
        }
    }
}

impl From<PluginError> for DownloadError {
    fn from(value: PluginError) -> Self {
        Self::Plugin(value)
    }
}

impl From<std::io::Error> for DownloadError {
    fn from(value: std::io::Error) -> Self {
        Self::Io(value.to_string())
    }
}

impl From<reqwest::Error> for DownloadError {
    fn from(value: reqwest::Error) -> Self {
        Self::DownloadFailed(value.to_string())
    }
}

/// 获取支持下载的 Loader 列表
pub fn get_downloadable_loaders(registry: &PluginRegistry) -> Vec<(String, String)> {
    registry.get_loader_list()
}

/// 获取指定 Loader 的所有可用版本（已按大版本号分组）
pub async fn get_versions(
    registry: &PluginRegistry,
    loader_id: &str,
) -> Result<Vec<VersionGroup>, DownloadError> {
    let plugin = registry
        .get(loader_id)
        .ok_or_else(|| DownloadError::InvalidLoader(loader_id.to_string()))?;

    let versions = plugin.get_versions().await.map_err(DownloadError::from)?;
    Ok(plugin::group_versions(versions))
}

/// 获取指定 Loader + 版本的可用构建列表
pub async fn get_builds(
    registry: &PluginRegistry,
    loader_id: &str,
    version: &str,
) -> Result<Vec<BuildInfo>, DownloadError> {
    let plugin = registry
        .get(loader_id)
        .ok_or_else(|| DownloadError::InvalidLoader(loader_id.to_string()))?;

    plugin
        .get_builds_from_version(version)
        .await
        .map_err(DownloadError::from)
}

/// 下载服务器核心 jar 到指定目录
pub async fn download_server_jar(
    registry: &PluginRegistry,
    loader_id: &str,
    version: &str,
    build: Option<&str>,
    output_dir: &PathBuf,
    jar_name: Option<&str>,
) -> Result<DownloadResult, DownloadError> {
    log::info!(
        "[download] starting download: loader={}, version={}, build={:?}, dir={}",
        loader_id,
        version,
        build,
        output_dir.display()
    );

    let plugin = registry
        .get(loader_id)
        .ok_or_else(|| DownloadError::InvalidLoader(loader_id.to_string()))?;

    let result = plugin
        .download_loader(version, build, output_dir, jar_name)
        .await
        .map_err(DownloadError::from)?;

    log::info!("[download] completed: {}", result.jar_path);
    Ok(result)
}

/// 后处理（用于 Forge/NeoForge 等需要安装的 Loader）
pub async fn post_process_instance(
    registry: &PluginRegistry,
    loader_id: &str,
    instance_dir: &PathBuf,
    version: &str,
    build: Option<&str>,
) -> Result<(), DownloadError> {
    log::info!(
        "[post-process] loader={}, version={}, dir={}",
        loader_id,
        version,
        instance_dir.display()
    );

    let plugin = registry
        .get(loader_id)
        .ok_or_else(|| DownloadError::InvalidLoader(loader_id.to_string()))?;

    plugin
        .build_for_instance(instance_dir, version, build)
        .await
        .map_err(DownloadError::from)
}

/// 获取 Loader 信息
pub fn get_loader_info(registry: &PluginRegistry, loader_id: &str) -> Option<LoaderInfo> {
    registry.get(loader_id).map(|p| p.get_loader_info())
}

/// 获取指定 Loader 的官方推荐 JVM 参数列表
/// 如果该加载器没有官方推荐参数，返回空数组
pub async fn get_recommended_jvm_args(
    registry: &PluginRegistry,
    loader_id: &str,
    version: &str,
    build: Option<&str>,
) -> Result<Vec<String>, DownloadError> {
    let plugin = registry
        .get(loader_id)
        .ok_or_else(|| DownloadError::InvalidLoader(loader_id.to_string()))?;
    plugin
        .get_recommended_jvm_args(loader_id, version, build)
        .await
        .map_err(DownloadError::from)
}

pub mod cache;
pub mod client;
pub mod models;

use std::path::PathBuf;

pub use client::ModrinthClient;
pub use models::*;

use crate::core::app::config;

/// Modrinth 下载错误
#[derive(Debug, serde::Serialize)]
pub enum ModrinthError {
    Api(String),
    Network(String),
    Io(String),
    InvalidProject(String),
    InvalidVersion(String),
    InvalidInstance(String),
    DownloadFailed(String),
    ConfigNotFound,
}

impl std::fmt::Display for ModrinthError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ModrinthError::Api(e) => write!(f, "API error: {}", e),
            ModrinthError::Network(e) => write!(f, "Network error: {}", e),
            ModrinthError::Io(e) => write!(f, "IO error: {}", e),
            ModrinthError::InvalidProject(e) => write!(f, "Invalid project: {}", e),
            ModrinthError::InvalidVersion(e) => write!(f, "Invalid version: {}", e),
            ModrinthError::InvalidInstance(e) => write!(f, "Invalid instance: {}", e),
            ModrinthError::DownloadFailed(e) => write!(f, "Download failed: {}", e),
            ModrinthError::ConfigNotFound => write!(f, "Config not found"),
        }
    }
}

impl From<reqwest::Error> for ModrinthError {
    fn from(value: reqwest::Error) -> Self {
        ModrinthError::Network(value.to_string())
    }
}

impl From<std::io::Error> for ModrinthError {
    fn from(value: std::io::Error) -> Self {
        ModrinthError::Io(value.to_string())
    }
}

/// 搜索模组
pub async fn search_mods(
    client: &ModrinthClient,
    query: &str,
    filters: SearchFilters,
) -> Result<SearchResponse, ModrinthError> {
    client.search_projects(query, filters).await
}

/// 获取模组的版本列表
pub async fn get_mod_versions(
    client: &ModrinthClient,
    project_id: &str,
    game_version: Option<&str>,
    loader: Option<&str>,
) -> Result<Vec<Version>, ModrinthError> {
    client
        .get_project_versions(project_id, game_version, loader)
        .await
}

/// 获取单个版本详情
pub async fn get_version(
    client: &ModrinthClient,
    version_id: &str,
) -> Result<Version, ModrinthError> {
    client.get_version(version_id).await
}

/// 下载模组到指定实例的 mods 文件夹
pub async fn download_mod_to_instance(
    client: &ModrinthClient,
    app_handle: &tauri::AppHandle,
    instance_id: &str,
    version_id: &str,
) -> Result<DownloadResult, ModrinthError> {
    // 获取版本信息
    let version = client.get_version(version_id).await?;

    // 获取主文件（第一个文件通常是主文件）
    let file = version
        .files
        .first()
        .ok_or_else(|| ModrinthError::InvalidVersion("No files in version".to_string()))?;

    // 获取实例目录
    let config = config::load(app_handle).map_err(|_| ModrinthError::ConfigNotFound)?;
    let instance = config
        .server
        .instances
        .iter()
        .find(|i| i.id == instance_id)
        .ok_or_else(|| ModrinthError::InvalidInstance(instance_id.to_string()))?;

    // 构建 mods 目录路径
    let mods_dir = PathBuf::from(&instance.path).join("mods");

    // 确保 mods 目录存在
    if !mods_dir.exists() {
        tokio::fs::create_dir_all(&mods_dir).await?;
    }

    // 下载文件
    let output_path = mods_dir.join(&file.filename);
    client.download_file(&file.url, &output_path).await?;

    log::info!(
        "[modrinth] Downloaded mod to instance {}: {}",
        instance_id,
        output_path.display()
    );

    Ok(DownloadResult {
        file_path: output_path.to_string_lossy().to_string(),
        filename: file.filename.clone(),
        version_id: version.id.clone(),
        project_id: version.project_id.clone(),
    })
}

/// 获取所有分类
pub async fn get_categories(client: &ModrinthClient) -> Result<Vec<Category>, ModrinthError> {
    client.get_categories().await
}

/// 获取所有加载器
pub async fn get_loaders(client: &ModrinthClient) -> Result<Vec<Loader>, ModrinthError> {
    client.get_loaders().await
}

/// 获取所有游戏版本
pub async fn get_game_versions(client: &ModrinthClient) -> Result<Vec<GameVersion>, ModrinthError> {
    client.get_game_versions().await
}

/// 获取项目详情
pub async fn get_project(
    client: &ModrinthClient,
    project_id: &str,
) -> Result<Project, ModrinthError> {
    client.get_project(project_id).await
}

/// 通过版本哈希获取版本
pub async fn get_version_from_hash(
    client: &ModrinthClient,
    hash: &str,
    algorithm: HashAlgorithm,
) -> Result<Version, ModrinthError> {
    client.get_version_from_hash(hash, algorithm).await
}

/// 下载结果
#[derive(Debug, serde::Serialize)]
pub struct DownloadResult {
    pub file_path: String,
    pub filename: String,
    pub version_id: String,
    pub project_id: String,
}

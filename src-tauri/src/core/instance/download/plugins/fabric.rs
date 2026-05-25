use async_trait::async_trait;
use serde::Deserialize;
use std::path::PathBuf;

use super::super::plugin::{
    DownloadResult, LoaderInfo, LoaderPlugin, PluginError, VersionInfo,
};

const META_URL: &str = "https://meta.fabricmc.net/v2/versions/game";
const LOADER_URL: &str = "https://meta.fabricmc.net/v2/versions/loader";

#[derive(Debug, Deserialize)]
struct GameVersion {
    version: String,
    stable: bool,
}

#[derive(Debug, Deserialize)]
struct LoaderVersion {
    version: String,
    stable: bool,
}

pub struct FabricPlugin;

#[async_trait]
impl LoaderPlugin for FabricPlugin {
    fn get_loader_info(&self) -> LoaderInfo {
        LoaderInfo {
            id: "fabric".to_string(),
            name: "Fabric".to_string(),
            description: Some("轻量级 Mod 加载器".to_string()),
            supports_builds: false,
            needs_post_process: false,
        }
    }

    async fn get_versions(&self) -> Result<Vec<VersionInfo>, PluginError> {
        let versions: Vec<GameVersion> = super::super::plugin::fetch_json(META_URL).await?;

        let result: Vec<VersionInfo> = versions
            .into_iter()
            .filter(|v| v.stable)
            .map(|v| VersionInfo {
                id: v.version,
                display_name: None,
            })
            .collect();

        Ok(result)
    }

    async fn download_loader(
        &self,
        version: &str,
        _build: Option<&str>,
        output_dir: &PathBuf,
        jar_name: Option<&str>,
    ) -> Result<DownloadResult, PluginError> {
        // 获取最新的 loader 版本
        let loaders: Vec<LoaderVersion> = super::super::plugin::fetch_json(LOADER_URL).await?;
        let latest_loader = loaders
            .into_iter()
            .find(|l| l.stable)
            .map(|l| l.version)
            .ok_or_else(|| PluginError::ApiError("No stable loader found".to_string()))?;

        let download_url = format!(
            "https://meta.fabricmc.net/v2/versions/loader/{}/{}/1.0.1/server/jar",
            version, latest_loader
        );

        let jar_file_name = jar_name
            .map(|s| s.to_string())
            .unwrap_or_else(|| self.default_jar_name(version, _build));

        let jar_path = output_dir.join(&jar_file_name);
        std::fs::create_dir_all(output_dir)?;

        super::super::plugin::download_file(&download_url, &jar_path).await?;

        Ok(DownloadResult {
            jar_path: jar_path.to_string_lossy().to_string(),
            loader: "fabric".to_string(),
            version: version.to_string(),
        })
    }

    fn default_jar_name(&self, version: &str, _build: Option<&str>) -> String {
        format!("fabric-server-{}.jar", version)
    }
}

use async_trait::async_trait;
use std::path::PathBuf;

use super::super::plugin::{
    DownloadResult, LoaderInfo, LoaderPlugin, PluginError, VersionInfo,
};

pub struct QuiltPlugin;

#[async_trait]
impl LoaderPlugin for QuiltPlugin {
    fn get_loader_info(&self) -> LoaderInfo {
        LoaderInfo {
            id: "quilt".to_string(),
            name: "Quilt".to_string(),
            description: Some("Fabric 分支，更开放的生态".to_string()),
            supports_builds: false,
            needs_post_process: false,
        }
    }

    async fn get_versions(&self) -> Result<Vec<VersionInfo>, PluginError> {
        // Quilt 版本列表 API
        let url = "https://meta.quiltmc.org/v3/versions/game";
        let versions: Vec<serde_json::Value> = super::super::plugin::fetch_json(url).await?;

        let result: Vec<VersionInfo> = versions
            .into_iter()
            .filter_map(|v| {
                let version = v.get("version")?.as_str()?;
                let stable = v.get("stable")?.as_bool().unwrap_or(true);
                if stable {
                    Some(VersionInfo {
                        id: version.to_string(),
                        display_name: None,
                    })
                } else {
                    None
                }
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
        // Quilt 下载需要先获取 loader 版本
        let loaders_url = "https://meta.quiltmc.org/v3/versions/loader";
        let loaders: Vec<serde_json::Value> = super::super::plugin::fetch_json(loaders_url).await?;

        let latest_loader = loaders
            .into_iter()
            .find(|l| l.get("stable").and_then(|s| s.as_bool()).unwrap_or(true))
            .and_then(|l| l.get("version").and_then(|v| v.as_str().map(|s| s.to_string())))
            .ok_or_else(|| PluginError::ApiError("No stable Quilt loader found".to_string()))?;

        let download_url = format!(
            "https://meta.quiltmc.org/v3/versions/loader/{}/{}/1.0.0/server/jar",
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
            loader: "quilt".to_string(),
            version: version.to_string(),
        })
    }

    fn default_jar_name(&self, version: &str, _build: Option<&str>) -> String {
        format!("quilt-server-{}.jar", version)
    }
}

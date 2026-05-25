use async_trait::async_trait;
use serde::Deserialize;
use std::path::PathBuf;

use super::super::plugin::{
    BuildInfo, DownloadResult, LoaderInfo, LoaderPlugin, PluginError, VersionInfo,
};

const API_BASE: &str = "https://api.purpurmc.org/v2/purpur";

#[derive(Debug, Deserialize)]
struct ProjectResponse {
    versions: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct VersionResponse {
    builds: Builds,
}

#[derive(Debug, Deserialize)]
struct Builds {
    all: Vec<String>,
}

pub struct PurpurPlugin;

#[async_trait]
impl LoaderPlugin for PurpurPlugin {
    fn get_loader_info(&self) -> LoaderInfo {
        LoaderInfo {
            id: "purpur".to_string(),
            name: "Purpur".to_string(),
            description: Some("Paper 分支，更多自定义选项".to_string()),
            supports_builds: true,
            needs_post_process: false,
        }
    }

    async fn get_versions(&self) -> Result<Vec<VersionInfo>, PluginError> {
        let project: ProjectResponse = super::super::plugin::fetch_json(API_BASE).await?;

        let versions: Vec<VersionInfo> = project
            .versions
            .into_iter()
            .rev()
            .map(|id| VersionInfo {
                id,
                display_name: None,
            })
            .collect();

        Ok(versions)
    }

    async fn get_builds_from_version(&self, version: &str) -> Result<Vec<BuildInfo>, PluginError> {
        let url = format!("{}/{}", API_BASE, version);
        let response: VersionResponse = super::super::plugin::fetch_json(&url).await?;

        let builds: Vec<BuildInfo> = response
            .builds
            .all
            .into_iter()
            .rev()
            .map(|id| BuildInfo {
                id: id.clone(),
                display_name: Some(format!("Build #{}", id)),
            })
            .collect();

        Ok(builds)
    }

    async fn download_loader(
        &self,
        version: &str,
        build: Option<&str>,
        output_dir: &PathBuf,
        jar_name: Option<&str>,
    ) -> Result<DownloadResult, PluginError> {
        let build_num = match build {
            Some(b) => b.to_string(),
            None => {
                let url = format!("{}/{}", API_BASE, version);
                let response: VersionResponse = super::super::plugin::fetch_json(&url).await?;
                response
                    .builds
                    .all
                    .last()
                    .cloned()
                    .ok_or_else(|| PluginError::ApiError("No builds available".to_string()))?
            }
        };

        let download_url = format!("{}/{}/{}/download", API_BASE, version, build_num);

        let jar_file_name = jar_name
            .map(|s| s.to_string())
            .unwrap_or_else(|| self.default_jar_name(version, build));

        let jar_path = output_dir.join(&jar_file_name);
        std::fs::create_dir_all(output_dir)?;

        super::super::plugin::download_file(&download_url, &jar_path).await?;

        Ok(DownloadResult {
            jar_path: jar_path.to_string_lossy().to_string(),
            loader: "purpur".to_string(),
            version: version.to_string(),
        })
    }

    fn default_jar_name(&self, version: &str, build: Option<&str>) -> String {
        match build {
            Some(b) => format!("purpur-{}-{}.jar", version, b),
            None => format!("purpur-{}.jar", version),
        }
    }
}

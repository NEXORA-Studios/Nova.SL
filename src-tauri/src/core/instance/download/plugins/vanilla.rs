use async_trait::async_trait;
use serde::Deserialize;
use std::path::PathBuf;

use super::super::plugin::{DownloadResult, LoaderInfo, LoaderPlugin, PluginError, VersionInfo};

const MANIFEST_URL: &str = "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";

#[derive(Debug, Deserialize)]
struct Manifest {
    versions: Vec<ManifestVersion>,
}

#[derive(Debug, Deserialize)]
struct ManifestVersion {
    id: String,
    #[serde(rename = "type")]
    version_type: String,
    url: String,
}

#[derive(Debug, Deserialize)]
struct VersionDetail {
    downloads: Downloads,
}

#[derive(Debug, Deserialize)]
struct Downloads {
    server: Option<DownloadFile>,
}

#[derive(Debug, Deserialize)]
struct DownloadFile {
    url: String,
}

pub struct VanillaPlugin;

#[async_trait]
impl LoaderPlugin for VanillaPlugin {
    fn get_loader_info(&self) -> LoaderInfo {
        LoaderInfo {
            id: "vanilla".to_string(),
            name: "Vanilla".to_string(),
            description: Some("官方原版服务端".to_string()),
            supports_builds: false,
            needs_post_process: false,
        }
    }

    async fn get_versions(&self) -> Result<Vec<VersionInfo>, PluginError> {
        let manifest: Manifest = super::super::plugin::fetch_json(MANIFEST_URL).await?;

        let versions: Vec<VersionInfo> = manifest
            .versions
            .into_iter()
            .filter(|v| v.version_type == "release")
            .map(|v| VersionInfo {
                id: v.id,
                display_name: None,
            })
            .collect();

        Ok(versions)
    }

    async fn download_loader(
        &self,
        version: &str,
        _build: Option<&str>,
        output_dir: &PathBuf,
        jar_name: Option<&str>,
    ) -> Result<DownloadResult, PluginError> {
        // 先获取 manifest 找到版本对应的 detail URL
        let manifest: Manifest = super::super::plugin::fetch_json(MANIFEST_URL).await?;

        let version_entry = manifest
            .versions
            .into_iter()
            .find(|v| v.id == version)
            .ok_or_else(|| PluginError::ApiError(format!("Version {} not found", version)))?;

        // 获取版本详情
        let detail: VersionDetail = super::super::plugin::fetch_json(&version_entry.url).await?;

        let server_download = detail.downloads.server.ok_or_else(|| {
            PluginError::ApiError(format!("No server download for version {}", version))
        })?;

        // 确定 jar 文件名
        let jar_file_name = jar_name
            .map(|s| s.to_string())
            .unwrap_or_else(|| self.default_jar_name(version, _build));

        let jar_path = output_dir.join(&jar_file_name);
        std::fs::create_dir_all(output_dir)?;

        // 下载文件
        super::super::plugin::download_file(&server_download.url, &jar_path).await?;

        Ok(DownloadResult {
            jar_path: jar_path.to_string_lossy().to_string(),
            loader: "vanilla".to_string(),
            version: version.to_string(),
        })
    }

    fn default_jar_name(&self, version: &str, _build: Option<&str>) -> String {
        format!("server-{}.jar", version)
    }
}

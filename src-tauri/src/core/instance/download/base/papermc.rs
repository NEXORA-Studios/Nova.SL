use async_trait::async_trait;
use serde::Deserialize;
use std::path::PathBuf;

use super::super::plugin::{
    BuildChannel, BuildInfo, DownloadResult, LoaderInfo, LoaderPlugin, PluginError, VersionInfo,
};

const API_BASE: &str = "https://fill.papermc.io/v3/projects";

/// PaperMC API v3: /versions 端点返回 { versions: Vec<VersionResponse> }
#[derive(Debug, Deserialize)]
struct VersionsResponse {
    versions: Vec<VersionItem>,
}

#[derive(Debug, Deserialize)]
struct VersionItem {
    version: ProjectVersion,
    #[allow(dead_code)]
    builds: Vec<i32>,
}

#[derive(Debug, Deserialize)]
struct ProjectVersion {
    id: String,
    support: VersionSupport,
}

#[derive(Debug, Deserialize)]
struct VersionSupport {
    status: String,
}

/// PaperMC API v3: /versions/{version}/builds 返回 BuildResponse 数组
#[derive(Debug, Deserialize)]
struct BuildResponse {
    id: i32,
    channel: String,
    downloads: BuildDownloads,
}

#[derive(Debug, Deserialize)]
struct BuildDownloads {
    #[serde(rename = "server:default")]
    server_default: BuildFile,
}

#[derive(Debug, Deserialize)]
struct BuildFile {
    #[allow(dead_code)]
    name: String,
    url: String,
}

/// PaperMC API v3: /versions/{version} 端点返回的版本详情
#[derive(Debug, Deserialize)]
struct VersionDetailResponse {
    version: VersionDetail,
}

#[derive(Debug, Deserialize)]
struct VersionDetail {
    #[allow(dead_code)]
    id: String,
    java: Option<JavaDetail>,
}

#[derive(Debug, Deserialize)]
struct JavaDetail {
    flags: Option<JavaFlags>,
}

#[derive(Debug, Deserialize)]
struct JavaFlags {
    recommended: Option<Vec<String>>,
}

fn parse_build_channel(channel: &str) -> BuildChannel {
    match channel {
        "STABLE" | "RECOMMENDED" => BuildChannel::Stable,
        "BETA" => BuildChannel::Beta,
        "ALPHA" | _ => BuildChannel::Alpha,
    }
}

/// PaperMC 系列插件的通用实现
pub struct PaperMCPlugin {
    project_id: String,
    loader_info: LoaderInfo,
    jar_prefix: String,
}

impl PaperMCPlugin {
    /// 创建一个新的 PaperMC 系列插件
    pub fn new(
        project_id: impl Into<String>,
        name: impl Into<String>,
        description: Option<impl Into<String>>,
        jar_prefix: impl Into<String>,
    ) -> Self {
        let project_id = project_id.into();
        let name = name.into();
        let jar_prefix = jar_prefix.into();

        Self {
            loader_info: LoaderInfo {
                id: project_id.clone(),
                name,
                description: description.map(|d| d.into()),
                supports_builds: true,
                needs_post_process: false,
            },
            project_id,
            jar_prefix,
        }
    }

    fn api_base_url(&self) -> String {
        format!("{}/{}", API_BASE, self.project_id)
    }
}

#[async_trait]
impl LoaderPlugin for PaperMCPlugin {
    fn get_loader_info(&self) -> LoaderInfo {
        self.loader_info.clone()
    }

    async fn get_versions(&self) -> Result<Vec<VersionInfo>, PluginError> {
        let url = format!("{}/versions", self.api_base_url());
        let response: VersionsResponse = super::super::plugin::fetch_json(&url).await?;

        let versions: Vec<VersionInfo> = response
            .versions
            .into_iter()
            .rev()
            .map(|v| VersionInfo {
                id: v.version.id,
                display_name: None,
                supported: v.version.support.status == "SUPPORTED",
            })
            .collect();

        Ok(versions)
    }

    async fn get_builds_from_version(&self, version: &str) -> Result<Vec<BuildInfo>, PluginError> {
        let url = format!("{}/versions/{}/builds", self.api_base_url(), version);
        let response: Vec<BuildResponse> = super::super::plugin::fetch_json(&url).await?;

        let builds: Vec<BuildInfo> = response
            .into_iter()
            .rev()
            .map(|b| BuildInfo {
                id: b.id.to_string(),
                display_name: Some(format!("Build #{}", b.id)),
                channel: parse_build_channel(&b.channel),
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
            Some(b) => b
                .parse::<i32>()
                .map_err(|_| PluginError::ApiError(format!("Invalid build number: {}", b)))?,
            None => {
                let url = format!("{}/versions/{}/builds/latest", self.api_base_url(), version);
                let response: BuildResponse = super::super::plugin::fetch_json(&url).await?;
                response.id
            }
        };

        let build_url = format!(
            "{}/versions/{}/builds/{}",
            self.api_base_url(),
            version,
            build_num
        );
        let build_info: BuildResponse = super::super::plugin::fetch_json(&build_url).await?;
        let download_url = &build_info.downloads.server_default.url;

        let jar_file_name = jar_name
            .map(|s| s.to_string())
            .unwrap_or_else(|| self.default_jar_name(version, build));

        let jar_path = output_dir.join(&jar_file_name);
        std::fs::create_dir_all(output_dir)?;

        super::super::plugin::download_file(download_url, &jar_path).await?;

        Ok(DownloadResult {
            jar_path: jar_path.to_string_lossy().to_string(),
            loader: self.project_id.clone(),
            version: version.to_string(),
        })
    }

    fn default_jar_name(&self, version: &str, build: Option<&str>) -> String {
        match build {
            Some(b) => format!("{}-{}-{}.jar", self.jar_prefix, version, b),
            None => format!("{}-{}.jar", self.jar_prefix, version),
        }
    }

    async fn get_recommended_jvm_args(
        &self,
        _loader: &str,
        version: &str,
        _build: Option<&str>,
    ) -> Result<Vec<String>, PluginError> {
        let url = format!("{}/versions/{}", self.api_base_url(), version);
        let response: VersionDetailResponse = super::super::plugin::fetch_json(&url).await?;

        let flags = response
            .version
            .java
            .and_then(|j| j.flags)
            .and_then(|f| f.recommended)
            .unwrap_or_default();

        Ok(flags)
    }
}

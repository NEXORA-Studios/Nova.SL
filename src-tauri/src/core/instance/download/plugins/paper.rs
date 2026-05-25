use async_trait::async_trait;
use serde::Deserialize;
use std::path::PathBuf;

use super::super::plugin::{
    BuildChannel, BuildInfo, DownloadResult, LoaderInfo, LoaderPlugin, PluginError, VersionInfo,
};

const API_BASE: &str = "https://fill.papermc.io/v3/projects/paper";

/// Paper API v3: /versions 端点返回 { versions: Vec<VersionResponse> }
#[derive(Debug, Deserialize)]
struct VersionsResponse {
    versions: Vec<VersionItem>,
}

#[derive(Debug, Deserialize)]
struct VersionItem {
    version: PaperVersion,
    #[allow(dead_code)]
    builds: Vec<i32>,
}

#[derive(Debug, Deserialize)]
struct PaperVersion {
    id: String,
    support: PaperSupport,
}

#[derive(Debug, Deserialize)]
struct PaperSupport {
    status: String,
}

/// Paper API v3: /versions/{version}/builds 返回 BuildResponse 数组
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

/// Paper API v3: /versions/{version} 端点返回的版本详情
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

pub struct PaperPlugin;

#[async_trait]
impl LoaderPlugin for PaperPlugin {
    fn get_loader_info(&self) -> LoaderInfo {
        LoaderInfo {
            id: "paper".to_string(),
            name: "Paper".to_string(),
            description: Some("高性能 Spigot 分支，支持插件".to_string()),
            supports_builds: true,
            needs_post_process: false,
        }
    }

    async fn get_versions(&self) -> Result<Vec<VersionInfo>, PluginError> {
        // 使用 Paper API v3 的 /versions 端点获取版本列表
        // GET /v3/projects/paper/versions
        // 返回: { versions: [{ version: { id, support: { status } }, builds: [...] }, ...] }
        let url = format!("{}/versions", API_BASE);
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
        // Paper API v3: /v3/projects/{project}/versions/{version}/builds
        // 返回 Vec<BuildResponse>
        let url = format!("{}/versions/{}/builds", API_BASE, version);
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
            Some(b) => b.parse::<i32>().map_err(|_| {
                PluginError::ApiError(format!("Invalid build number: {}", b))
            })?,
            None => {
                // Paper API v3: 获取最新构建 /v3/projects/{project}/versions/{version}/builds/latest
                let url = format!("{}/versions/{}/builds/latest", API_BASE, version);
                let response: BuildResponse = super::super::plugin::fetch_json(&url).await?;
                response.id
            }
        };

        // Paper API v3: 获取构建详情 /v3/projects/{project}/versions/{version}/builds/{build}
        let build_url = format!("{}/versions/{}/builds/{}", API_BASE, version, build_num);
        let build_info: BuildResponse = super::super::plugin::fetch_json(&build_url).await?;
        let download_url = &build_info.downloads.server_default.url;

        // 确定 jar 文件名
        let jar_file_name = jar_name
            .map(|s| s.to_string())
            .unwrap_or_else(|| self.default_jar_name(version, build));

        let jar_path = output_dir.join(&jar_file_name);
        std::fs::create_dir_all(output_dir)?;

        // 下载文件
        super::super::plugin::download_file(download_url, &jar_path).await?;

        Ok(DownloadResult {
            jar_path: jar_path.to_string_lossy().to_string(),
            loader: "paper".to_string(),
            version: version.to_string(),
        })
    }

    fn default_jar_name(&self, version: &str, build: Option<&str>) -> String {
        match build {
            Some(b) => format!("paper-{}-{}.jar", version, b),
            None => format!("paper-{}.jar", version),
        }
    }

    async fn get_recommended_jvm_args(&self, loader: &str, version: &str, _build: Option<&str>) -> Result<Vec<String>, PluginError> {
        let url = format!("https://fill.papermc.io/v3/projects/{}/versions/{}", loader, version);
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

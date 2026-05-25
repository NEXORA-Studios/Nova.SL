use async_trait::async_trait;
use std::path::PathBuf;

use super::super::plugin::{
    DownloadResult, LoaderInfo, LoaderPlugin, PluginError, VersionInfo,
};

pub struct SpigotPlugin;

#[async_trait]
impl LoaderPlugin for SpigotPlugin {
    fn get_loader_info(&self) -> LoaderInfo {
        LoaderInfo {
            id: "spigot".to_string(),
            name: "Spigot".to_string(),
            description: Some("经典 Bukkit 分支，需 BuildTools".to_string()),
            supports_builds: false,
            needs_post_process: true,
        }
    }

    async fn get_versions(&self) -> Result<Vec<VersionInfo>, PluginError> {
        Err(PluginError::NotImplemented(
            "Spigot version listing requires additional implementation".to_string(),
        ))
    }

    async fn download_loader(
        &self,
        _version: &str,
        _build: Option<&str>,
        _output_dir: &PathBuf,
        _jar_name: Option<&str>,
    ) -> Result<DownloadResult, PluginError> {
        Err(PluginError::NotImplemented(
            "Spigot requires BuildTools to compile server jar".to_string(),
        ))
    }

    async fn build_for_instance(
        &self,
        instance_dir: &PathBuf,
        version: &str,
        _build: Option<&str>,
    ) -> Result<(), PluginError> {
        // Spigot 需要使用 BuildTools 构建
        // 下载 BuildTools.jar 并运行
        let buildtools_url = "https://hub.spigotmc.org/jenkins/job/BuildTools/lastSuccessfulBuild/artifact/target/BuildTools.jar";
        let buildtools_path = instance_dir.join("BuildTools.jar");

        super::super::plugin::download_file(buildtools_url, &buildtools_path).await?;

        let java_path = if cfg!(windows) { "java.exe" } else { "java" };
        let output = std::process::Command::new(java_path)
            .arg("-jar")
            .arg(&buildtools_path)
            .arg("--rev")
            .arg(version)
            .current_dir(instance_dir)
            .output()
            .map_err(|e| PluginError::PostProcessFailed(format!("Failed to run BuildTools: {}", e)))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(PluginError::PostProcessFailed(format!(
                "BuildTools failed: {}",
                stderr
            )));
        }

        // 清理 BuildTools.jar
        let _ = std::fs::remove_file(&buildtools_path);

        Ok(())
    }

    fn default_jar_name(&self, version: &str, _build: Option<&str>) -> String {
        format!("spigot-{}.jar", version)
    }
}

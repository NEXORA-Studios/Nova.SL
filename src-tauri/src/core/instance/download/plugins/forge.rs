use async_trait::async_trait;
use std::path::PathBuf;

use super::super::plugin::{
    DownloadResult, LoaderInfo, LoaderPlugin, PluginError, VersionInfo,
};

pub struct ForgePlugin;

#[async_trait]
impl LoaderPlugin for ForgePlugin {
    fn get_loader_info(&self) -> LoaderInfo {
        LoaderInfo {
            id: "forge".to_string(),
            name: "Forge".to_string(),
            description: Some("老牌 Mod 加载器，需安装器".to_string()),
            supports_builds: false,
            needs_post_process: true,
        }
    }

    async fn get_versions(&self) -> Result<Vec<VersionInfo>, PluginError> {
        // Forge 版本列表需要从 Maven 或官方 API 获取
        Err(PluginError::NotImplemented(
            "Forge version listing requires additional implementation".to_string(),
        ))
    }

    async fn download_loader(
        &self,
        version: &str,
        _build: Option<&str>,
        output_dir: &PathBuf,
        jar_name: Option<&str>,
    ) -> Result<DownloadResult, PluginError> {
        let download_url = format!(
            "https://maven.minecraftforge.net/net/minecraftforge/forge/{0}/forge-{0}-installer.jar",
            version
        );

        let jar_file_name = jar_name
            .map(|s| s.to_string())
            .unwrap_or_else(|| self.default_jar_name(version, _build));

        let jar_path = output_dir.join(&jar_file_name);
        std::fs::create_dir_all(output_dir)?;

        super::super::plugin::download_file(&download_url, &jar_path).await?;

        Ok(DownloadResult {
            jar_path: jar_path.to_string_lossy().to_string(),
            loader: "forge".to_string(),
            version: version.to_string(),
        })
    }

    async fn build_for_instance(
        &self,
        instance_dir: &PathBuf,
        version: &str,
        _build: Option<&str>,
    ) -> Result<(), PluginError> {
        let installer_name = self.default_jar_name(version, _build);
        let installer_path = instance_dir.join(&installer_name);

        if !installer_path.exists() {
            return Err(PluginError::PostProcessFailed(
                "Forge installer not found".to_string(),
            ));
        }

        // 运行 Forge installer
        let java_path = if cfg!(windows) { "java.exe" } else { "java" };
        let output = std::process::Command::new(java_path)
            .arg("-jar")
            .arg(&installer_path)
            .arg("--installServer")
            .arg(instance_dir)
            .output()
            .map_err(|e| PluginError::PostProcessFailed(format!("Failed to run installer: {}", e)))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(PluginError::PostProcessFailed(format!(
                "Forge installer failed: {}",
                stderr
            )));
        }

        // 删除 installer
        let _ = std::fs::remove_file(&installer_path);

        Ok(())
    }

    fn default_jar_name(&self, version: &str, _build: Option<&str>) -> String {
        format!("forge-{}-installer.jar", version)
    }
}

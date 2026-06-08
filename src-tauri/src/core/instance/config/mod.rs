use serde::{Deserialize, Serialize};
use std::{fs, io, path::PathBuf};

// ==================== Instance.toml ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstanceConfig {
    pub instance: InstanceMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstanceMetadata {
    pub id: String,
    pub name: String,
    pub version: String,
    pub loader: String,
}

impl Default for InstanceConfig {
    fn default() -> Self {
        Self {
            instance: InstanceMetadata {
                id: String::new(),
                name: String::new(),
                version: String::new(),
                loader: String::new(),
            },
        }
    }
}

pub fn instance_config_path(instance_dir: &PathBuf) -> PathBuf {
    instance_dir.join(".nova").join("Instance.toml")
}

pub fn load_instance_config(instance_dir: &PathBuf) -> Result<InstanceConfig, InstanceConfigError> {
    let path = instance_config_path(instance_dir);
    log::info!(
        "[instance-config] loading Instance.toml from: {}",
        path.display()
    );

    if !path.exists() {
        log::info!("[instance-config] Instance.toml not found, creating default");
        let config = InstanceConfig::default();
        save_instance_config(instance_dir, &config)?;
        return Ok(config);
    }

    let content = fs::read_to_string(&path)?;
    let config = toml::from_str::<InstanceConfig>(&content)?;
    log::info!(
        "[instance-config] Instance.toml loaded: id={}, name={}",
        config.instance.id,
        config.instance.name
    );
    Ok(config)
}

pub fn save_instance_config(
    instance_dir: &PathBuf,
    config: &InstanceConfig,
) -> Result<(), InstanceConfigError> {
    let dir = instance_dir.join(".nova");
    fs::create_dir_all(&dir)?;

    let content = toml::to_string_pretty(config)?;
    fs::write(instance_config_path(instance_dir), &content)?;
    log::info!(
        "[instance-config] Instance.toml saved to: {}",
        instance_config_path(instance_dir).display()
    );
    Ok(())
}

// ==================== Extensions.toml ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtensionsConfig {
    #[serde(default)]
    pub r#mod: Vec<ModEntry>,
    #[serde(default)]
    pub plugin: Vec<PluginEntry>,
    #[serde(default)]
    pub mcdr_plugin: Vec<McdrPluginEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModEntry {
    pub name: String,
    pub source: String,
    pub checksum: Option<String>,
    pub version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginEntry {
    pub name: String,
    pub source: String,
    pub checksum: Option<String>,
    pub version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct McdrPluginEntry {
    pub name: String,
    pub source: String,
    pub checksum: Option<String>,
    pub version: Option<String>,
}

impl Default for ExtensionsConfig {
    fn default() -> Self {
        Self {
            r#mod: Vec::new(),
            plugin: Vec::new(),
            mcdr_plugin: Vec::new(),
        }
    }
}

pub fn extensions_config_path(instance_dir: &PathBuf) -> PathBuf {
    instance_dir.join(".nova").join("Extensions.toml")
}

pub fn load_extensions_config(
    instance_dir: &PathBuf,
) -> Result<ExtensionsConfig, InstanceConfigError> {
    let path = extensions_config_path(instance_dir);
    log::info!(
        "[instance-config] loading Extensions.toml from: {}",
        path.display()
    );

    if !path.exists() {
        log::info!("[instance-config] Extensions.toml not found, creating default");
        let config = ExtensionsConfig::default();
        save_extensions_config(instance_dir, &config)?;
        return Ok(config);
    }

    let content = fs::read_to_string(&path)?;
    let config = toml::from_str::<ExtensionsConfig>(&content)?;
    log::info!(
        "[instance-config] Extensions.toml loaded: {} mods, {} plugins",
        config.r#mod.len(),
        config.plugin.len()
    );
    Ok(config)
}

pub fn save_extensions_config(
    instance_dir: &PathBuf,
    config: &ExtensionsConfig,
) -> Result<(), InstanceConfigError> {
    let dir = instance_dir.join(".nova");
    fs::create_dir_all(&dir)?;

    let content = toml::to_string_pretty(config)?;
    fs::write(extensions_config_path(instance_dir), &content)?;
    log::info!("[instance-config] Extensions.toml saved");
    Ok(())
}

// ==================== Launch.toml ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LaunchConfig {
    pub basic: BasicConfig,
    pub jvm_args: JvmArgs,
    pub game_props: GameProps,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BasicConfig {
    /// 启动方式: "jar" | "bat" | "bash"
    #[serde(default = "default_launch_method")]
    pub launch_method: String,
    /// 服务器核心 jar 文件名
    pub server_jar: String,
    /// Java 目标（"auto" 或指定路径）
    pub java_target: String,
    /// 启动脚本路径（仅 bat/bash 模式有效）
    #[serde(default)]
    pub script_path: Option<String>,
}

fn default_launch_method() -> String {
    "jar".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JvmArgs {
    /// 最小内存（如 "1024M"）
    pub min_memory: String,
    /// 最大内存（如 "4096M"）
    pub max_memory: String,
    /// 使用的垃圾回收器（如 "G1GC", "ZGC", "ShenandoahGC"）
    #[serde(default)]
    pub gc: Option<String>,
    /// 其他 JVM 参数
    #[serde(default)]
    pub extra_args: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameProps {
    /// 是否启用 GUI（Minecraft 服务器通常传 nogui）
    #[serde(default = "default_nogui")]
    pub nogui: bool,
}

fn default_nogui() -> bool {
    true
}

impl Default for LaunchConfig {
    fn default() -> Self {
        Self {
            basic: BasicConfig {
                launch_method: "jar".to_string(),
                server_jar: "server.jar".to_string(),
                java_target: "auto".to_string(),
                script_path: None,
            },
            jvm_args: JvmArgs {
                min_memory: "1024M".to_string(),
                max_memory: "4096M".to_string(),
                gc: None,
                extra_args: Vec::new(),
            },
            game_props: GameProps { nogui: true },
        }
    }
}

pub fn launch_config_path(instance_dir: &PathBuf) -> PathBuf {
    instance_dir.join(".nova").join("Launch.toml")
}

pub fn load_launch_config(instance_dir: &PathBuf) -> Result<LaunchConfig, InstanceConfigError> {
    let path = launch_config_path(instance_dir);
    log::info!(
        "[instance-config] loading Launch.toml from: {}",
        path.display()
    );

    if !path.exists() {
        log::info!("[instance-config] Launch.toml not found, creating default");
        let config = LaunchConfig::default();
        save_launch_config(instance_dir, &config)?;
        return Ok(config);
    }

    let content = fs::read_to_string(&path)?;
    let config = toml::from_str::<LaunchConfig>(&content)?;
    log::info!(
        "[instance-config] Launch.toml loaded: method={}, jar={}, mem={}/{}",
        config.basic.launch_method,
        config.basic.server_jar,
        config.jvm_args.min_memory,
        config.jvm_args.max_memory
    );
    Ok(config)
}

pub fn save_launch_config(
    instance_dir: &PathBuf,
    config: &LaunchConfig,
) -> Result<(), InstanceConfigError> {
    let dir = instance_dir.join(".nova");
    fs::create_dir_all(&dir)?;

    let content = toml::to_string_pretty(config)?;
    fs::write(launch_config_path(instance_dir), &content)?;
    log::info!("[instance-config] Launch.toml saved");
    Ok(())
}

// ==================== Error ====================

#[derive(Debug)]
#[allow(dead_code, unused_imports)]
pub enum InstanceConfigError {
    Io(io::Error),
    Deserialize(toml::de::Error),
    Serialize(toml::ser::Error),
}

impl From<io::Error> for InstanceConfigError {
    fn from(value: io::Error) -> Self {
        Self::Io(value)
    }
}

impl From<toml::de::Error> for InstanceConfigError {
    fn from(value: toml::de::Error) -> Self {
        Self::Deserialize(value)
    }
}

impl From<toml::ser::Error> for InstanceConfigError {
    fn from(value: toml::ser::Error) -> Self {
        Self::Serialize(value)
    }
}

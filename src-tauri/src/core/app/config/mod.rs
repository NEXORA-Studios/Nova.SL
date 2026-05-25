use serde::{Deserialize, Serialize};
use std::{fs, io, path::PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ThemeMode {
    Light,
    Dark,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TerminalConfig {
    #[serde(default = "default_true")]
    pub ctrl_enter_to_send: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DefaultEditor {
    Internal,
    Custom,
}

impl Default for DefaultEditor {
    fn default() -> Self {
        DefaultEditor::Internal
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EditorConfig {
    #[serde(default)]
    pub default_editor: DefaultEditor,
    #[serde(default = "default_custom_start_command")]
    pub custom_start_command: String,
}

fn default_custom_start_command() -> String {
    "code %file%".to_string()
}

impl Default for EditorConfig {
    fn default() -> Self {
        Self {
            default_editor: DefaultEditor::Internal,
            custom_start_command: default_custom_start_command(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UiConfig {
    pub theme: ThemeMode,
    #[serde(default)]
    pub terminal: TerminalConfig,
    #[serde(default)]
    pub editor: EditorConfig,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerInstanceConfig {
    pub id: String,
    pub name: String,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServerConfig {
    pub instances: Vec<ServerInstanceConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub ui: UiConfig,
    pub server: ServerConfig,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            ui: UiConfig {
                theme: ThemeMode::System,
                terminal: TerminalConfig {
                    ctrl_enter_to_send: true,
                },
                editor: EditorConfig::default(),
            },
            server: ServerConfig {
                instances: Vec::new(),
            },
        }
    }
}

use tauri::AppHandle;
use tauri::Manager;

pub fn config_dir(app: &AppHandle) -> PathBuf {
    app.path()
        .app_config_dir()
        .expect("failed to get app config dir")
}

pub fn config_path(app: &AppHandle) -> PathBuf {
    config_dir(app).join("App.toml")
}

pub fn load(app: &AppHandle) -> Result<AppConfig, AppConfigError> {
    let path = config_path(app);
    log::info!("[config] loading App.toml from: {}", path.display());

    if !path.exists() {
        log::info!("[config] App.toml not found, creating default");
        let config = AppConfig::default();
        save(app, &config)?;
        return Ok(config);
    }

    let content = fs::read_to_string(&path)?;
    let config = toml::from_str::<AppConfig>(&content)?;
    log::info!("[config] App.toml loaded, {} instances", config.server.instances.len());
    Ok(config)
}

pub fn save(app: &AppHandle, config: &AppConfig) -> Result<(), AppConfigError> {
    let dir = config_dir(app);
    fs::create_dir_all(&dir)?;

    let content = toml::to_string_pretty(config)?;
    fs::write(config_path(app), &content)?;
    log::info!("[config] App.toml saved");
    Ok(())
}

#[allow(dead_code, unused_imports)]
#[derive(Debug)]
pub enum AppConfigError {
    Io(io::Error),
    Deserialize(toml::de::Error),
    Serialize(toml::ser::Error),
}

impl From<io::Error> for AppConfigError {
    fn from(value: io::Error) -> Self {
        Self::Io(value)
    }
}

impl From<toml::de::Error> for AppConfigError {
    fn from(value: toml::de::Error) -> Self {
        Self::Deserialize(value)
    }
}

impl From<toml::ser::Error> for AppConfigError {
    fn from(value: toml::ser::Error) -> Self {
        Self::Serialize(value)
    }
}

impl std::fmt::Display for AppConfigError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?}", self)
    }
}
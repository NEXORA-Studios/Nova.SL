#[allow(dead_code, unused_imports)]
use crate::core::app::config::{self, AppConfig, AppConfigError};
use std::sync::Mutex;
use tauri::{AppHandle, State};

pub struct ConfigState {
    pub config: Mutex<AppConfig>,
}

#[tauri::command]
pub fn get_config(state: State<'_, ConfigState>) -> AppConfig {
    log::info!("[command] get_config");
    let config = state.config.lock().unwrap().clone();
    log::debug!(
        "[command] get_config: {} instances",
        config.server.instances.len()
    );
    config
}

#[tauri::command]
pub fn update_config(
    app: AppHandle,
    state: State<'_, ConfigState>,
    config: AppConfig,
) -> Result<(), String> {
    log::info!(
        "[command] update_config: {} instances",
        config.server.instances.len()
    );
    config::save(&app, &config).map_err(|e| {
        log::error!("[command] update_config failed: {:?}", e);
        format!("{:?}", e)
    })?;
    *state.config.lock().unwrap() = config;
    log::info!("[command] update_config: success");
    Ok(())
}

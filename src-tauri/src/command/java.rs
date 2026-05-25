use crate::core::java::scanner::{self, JavaInstallation, ScanEvent};
use tauri::{AppHandle, Emitter};

#[tauri::command]
pub async fn scan_java_installations(
    app: AppHandle,
    custom_paths: Option<Vec<String>>,
) -> Result<(), String> {
    log::info!("[command] scan_java_installations: custom_paths={:?}", custom_paths);
    let app_clone = app.clone();

    tokio::task::spawn_blocking(move || {
        let mut on_event = |event: ScanEvent| {
            let _ = app_clone.emit("java-scan-event", event);
        };

        if let Err(e) = scanner::scan_java_installations_with_callback(
            &app,
            custom_paths,
            &mut on_event,
        ) {
            log::error!("[command] scan_java_installations failed: {:?}", e);
            let _ = app.emit(
                "java-scan-event",
                ScanEvent::Error {
                    message: format!("{:?}", e),
                },
            );
        }
    })
    .await
    .map_err(|e| format!("task failed: {:?}", e))?;

    log::info!("[command] scan_java_installations: completed");
    Ok(())
}

#[tauri::command]
pub fn get_cached_javas(app: AppHandle) -> Result<Vec<JavaInstallation>, String> {
    log::info!("[command] get_cached_javas");
    scanner::get_cached_javas(&app).map_err(|e| {
        log::error!("[command] get_cached_javas failed: {:?}", e);
        format!("{:?}", e)
    })
}

#[tauri::command]
pub fn remove_java_from_cache(app: AppHandle, path: String) -> Result<(), String> {
    log::info!("[command] remove_java_from_cache: path={}", path);
    scanner::remove_from_cache(&app, &path).map_err(|e| {
        log::error!("[command] remove_java_from_cache failed: {:?}", e);
        format!("{:?}", e)
    })
}

#[tauri::command]
pub fn get_java_config(app: AppHandle) -> Result<scanner::JavaConfig, String> {
    log::info!("[command] get_java_config");
    scanner::get_java_config(&app).map_err(|e| {
        log::error!("[command] get_java_config failed: {:?}", e);
        format!("{:?}", e)
    })
}

#[tauri::command]
pub fn update_java_enabled(
    app: AppHandle,
    path: String,
    enabled: bool,
) -> Result<(), String> {
    log::info!("[command] update_java_enabled: path={}, enabled={}", path, enabled);
    scanner::update_java_entry(&app, &path, enabled).map_err(|e| {
        log::error!("[command] update_java_enabled failed: {:?}", e);
        format!("{:?}", e)
    })
}

#[tauri::command]
pub fn add_manual_java(app: AppHandle, installation: JavaInstallation) -> Result<(), String> {
    log::info!("[command] add_manual_java: path={}", installation.path);
    scanner::add_manual_java(&app, installation).map_err(|e| {
        log::error!("[command] add_manual_java failed: {:?}", e);
        format!("{:?}", e)
    })
}

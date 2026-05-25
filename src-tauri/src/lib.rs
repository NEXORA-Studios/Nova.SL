use std::sync::Mutex;
use tauri::Manager;

mod command;
mod core;
mod utils;

pub struct ProcessManagerState {
    pub manager: core::instance::process::ProcessManager,
}

pub struct DownloadRegistryState {
    pub registry: core::instance::download::plugin::PluginRegistry,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    #[cfg(debug_assertions)]
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("debug")).init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            log::info!("Tauri app setup started");

            // 初始化加载配置
            let initial_config = core::app::config::load(app.handle()).unwrap_or_default();
            app.manage(command::config::ConfigState {
                config: Mutex::new(initial_config),
            });

            // 初始化进程管理器
            app.manage(ProcessManagerState {
                manager: core::instance::process::ProcessManager::new(),
            });

            // 初始化下载插件注册表
            let registry = core::instance::download::plugin::create_default_registry();
            app.manage(DownloadRegistryState { registry });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            command::system::get_cpu_info,
            command::system::get_memory_info,
            command::system::get_system_info,
            command::config::get_config,
            command::config::update_config,
            command::instance::get_instance_config,
            command::instance::update_instance_config,
            command::instance::get_extensions_config,
            command::instance::update_extensions_config,
            command::instance::pick_server_directory,
            command::instance::analyze_server_directory,
            command::instance::import_instance,
            command::instance::get_downloadable_loaders,
            command::instance::get_loader_versions,
            command::instance::get_loader_builds,
            command::instance::get_recommended_jvm_args,
            command::instance::create_server_instance,
            command::instance::get_launch_config,
            command::instance::update_launch_config,
            command::instance::get_instance_status,
            command::instance::start_instance,
            command::instance::stop_instance,
            command::instance::kill_instance,
            command::instance::send_instance_command,
            command::instance::get_instance_logs,
            command::instance::save_instance_prelaunch_config,
            command::instance::get_available_launch_methods,
            command::java::scan_java_installations,
            command::java::get_cached_javas,
            command::java::remove_java_from_cache,
            command::java::get_java_config,
            command::java::update_java_enabled,
            command::java::add_manual_java,
            command::file::list_dir,
            command::file::get_file_metadata,
            command::file::check_path_exists,
            command::file::check_is_directory,
            command::file::check_is_file,
            command::file::get_parent,
            command::file::join_paths,
            command::file::create_dir,
            command::file::create_file,
            command::file::validate_file_name,
            command::file::copy_file_or_dir,
            command::file::move_file_or_dir,
            command::file::rename_file_or_dir,
            command::file::delete_file_or_dir,
            command::file::open_with_external_command,
            command::file::read_text,
            command::file::write_text,
            command::file::read_raw,
            command::file::write_raw,
            command::file::write_raw_validated,
            command::file::read_nbt,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

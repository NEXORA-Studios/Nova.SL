use crate::core::system;

#[tauri::command]
pub fn get_cpu_info() -> system::CpuInfo {
    log::info!("[command] get_cpu_info");
    let info = system::cpu_info();
    log::debug!("[command] get_cpu_info: {} cores @ {} MHz", info.core_count, info.frequency);
    info
}

#[tauri::command]
pub fn get_memory_info() -> system::MemoryInfo {
    log::info!("[command] get_memory_info");
    let info = system::memory_info();
    log::debug!("[command] get_memory_info: total={} MB, used={} MB", info.total, info.used);
    info
}

#[tauri::command]
pub fn get_system_info() -> system::SystemInfo {
    log::info!("[command] get_system_info");
    let info = system::system_info();
    log::debug!("[command] get_system_info: os={} {}", info.os_name, info.os_version);
    info
}

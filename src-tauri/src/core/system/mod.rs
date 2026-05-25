use serde::Serialize;
use sysinfo::System;

#[derive(Debug, Serialize)]
pub struct CpuInfo {
    pub usage: f32,
    pub core_count: usize,
    pub brand: String,
    pub frequency: u64,
}

#[derive(Debug, Serialize)]
pub struct MemoryInfo {
    pub total: u64,
    pub used: u64,
    pub available: u64,
    pub usage_percent: f32,
}

#[derive(Debug, Serialize)]
pub struct SystemInfo {
    pub cpu: CpuInfo,
    pub memory: MemoryInfo,
    pub hostname: String,
    pub os_name: String,
    pub os_version: String,
}

pub fn cpu_info() -> CpuInfo {
    let mut sys = System::new();
    sys.refresh_cpu_usage();

    // 等待一个采样周期
    std::thread::sleep(sysinfo::MINIMUM_CPU_UPDATE_INTERVAL);
    sys.refresh_cpu_usage();

    let usage = sys.global_cpu_usage();
    let cores = sys.cpus();
    let first_core = cores.first();

    CpuInfo {
        usage,
        core_count: cores.len(),
        brand: first_core.map(|c| c.brand().to_string()).unwrap_or_default(),
        frequency: first_core.map(|c| c.frequency()).unwrap_or(0),
    }
}

pub fn memory_info() -> MemoryInfo {
    let mut sys = System::new();
    sys.refresh_memory();

    let total = sys.total_memory();
    let used = sys.used_memory();
    let available = sys.available_memory();
    let usage_percent = if total > 0 {
        (used as f32 / total as f32) * 100.0
    } else {
        0.0
    };

    MemoryInfo {
        total,
        used,
        available,
        usage_percent,
    }
}

pub fn system_info() -> SystemInfo {
    let mut sys = System::new_all();
    sys.refresh_all();

    let total = sys.total_memory();
    let used = sys.used_memory();

    SystemInfo {
        cpu: CpuInfo {
            usage: sys.global_cpu_usage(),
            core_count: sys.cpus().len(),
            brand: sys.cpus().first().map(|c| c.brand().to_string()).unwrap_or_default(),
            frequency: sys.cpus().first().map(|c| c.frequency()).unwrap_or(0),
        },
        memory: MemoryInfo {
            total,
            used,
            available: sys.available_memory(),
            usage_percent: if total > 0 { (used as f32 / total as f32) * 100.0 } else { 0.0 },
        },
        hostname: System::host_name().unwrap_or_default(),
        os_name: System::name().unwrap_or_default(),
        os_version: System::os_version().unwrap_or_default(),
    }
}

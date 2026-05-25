export interface CpuInfo {
    usage: number;
    core_count: number;
    brand: string;
    frequency: number;
}

export interface MemoryInfo {
    total: number;
    used: number;
    available: number;
    usage_percent: number;
}

export interface SystemInfo {
    cpu: CpuInfo;
    memory: MemoryInfo;
    hostname: string;
    os_name: string;
    os_version: string;
}

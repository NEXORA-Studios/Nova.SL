import { invoke } from "@tauri-apps/api/core";
import { TauriBridge } from "@/models";

export type CpuInfo = TauriBridge.System.CpuInfo;
export type MemoryInfo = TauriBridge.System.MemoryInfo;
export type SystemInfo = TauriBridge.System.SystemInfo;

export async function getCpuInfo(): Promise<CpuInfo> {
    return invoke<CpuInfo>("get_cpu_info");
}

export async function getMemoryInfo(): Promise<MemoryInfo> {
    return invoke<MemoryInfo>("get_memory_info");
}

export async function getSystemInfo(): Promise<SystemInfo> {
    return invoke<SystemInfo>("get_system_info");
}

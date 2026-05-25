import { invoke } from "@tauri-apps/api/core";
import { TauriBridge } from "@/models";

export type AppConfig = TauriBridge.Config.AppConfig;
export type ThemeMode = TauriBridge.Config.ThemeMode;
export type DefaultEditor = TauriBridge.Config.DefaultEditor;

export async function getConfig(): Promise<AppConfig> {
    return invoke<AppConfig>("get_config");
}

export async function updateConfig(config: AppConfig): Promise<void> {
    return invoke<void>("update_config", { config });
}


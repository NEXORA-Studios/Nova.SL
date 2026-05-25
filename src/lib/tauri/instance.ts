import { invoke } from "@tauri-apps/api/core";
import { TauriBridge } from "@/models";

// ==================== Instance.toml ====================

export async function getInstanceConfig(instanceDir: string): Promise<TauriBridge.Instance.InstanceConfig> {
    return invoke<TauriBridge.Instance.InstanceConfig>("get_instance_config", { instanceDir });
}

export async function updateInstanceConfig(instanceDir: string, config: TauriBridge.Instance.InstanceConfig): Promise<void> {
    return invoke<void>("update_instance_config", { instanceDir, config });
}

// ==================== Extensions.toml ====================

export async function getExtensionsConfig(instanceDir: string): Promise<TauriBridge.Instance.ExtensionsConfig> {
    return invoke<TauriBridge.Instance.ExtensionsConfig>("get_extensions_config", { instanceDir });
}

export async function updateExtensionsConfig(
    instanceDir: string,
    config: TauriBridge.Instance.ExtensionsConfig
): Promise<void> {
    return invoke<void>("update_extensions_config", { instanceDir, config });
}

// ==================== Launch.toml ====================

export async function getLaunchConfig(instanceDir: string): Promise<TauriBridge.Instance.LaunchConfig> {
    return invoke<TauriBridge.Instance.LaunchConfig>("get_launch_config", { instanceDir });
}

export async function updateLaunchConfig(instanceDir: string, config: TauriBridge.Instance.LaunchConfig): Promise<void> {
    return invoke<void>("update_launch_config", { instanceDir, config });
}

// ==================== 首次启动前配置 ====================

export async function saveInstancePrelaunchConfig(
    instancePath: string,
    instanceId: string,
    displayName: string,
    loader: string,
    version: string,
    port: number,
    minMemoryMb: number,
    maxMemoryMb: number,
    launchMethod: string,
    javaTarget: string,
    onlineMode: boolean,
    eulaAgreed: boolean,
    extraArgs: string[],
): Promise<void> {
    return invoke<void>("save_instance_prelaunch_config", {
        instancePath,
        instanceId,
        displayName,
        loader,
        version,
        port,
        minMemoryMb,
        maxMemoryMb,
        launchMethod,
        javaTarget,
        onlineMode,
        eulaAgreed,
        extraArgs,
    });
}

export async function getAvailableLaunchMethods(instancePath: string): Promise<string[]> {
    return invoke<string[]>("get_available_launch_methods", { instancePath });
}

export async function getRecommendedJvmArgs(loader: string, version: string, build?: string): Promise<string[]> {
    return invoke<string[]>("get_recommended_jvm_args", { loader, version, build: build ?? null });
}


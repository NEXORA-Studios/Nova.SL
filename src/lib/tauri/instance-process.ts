import { invoke } from "@tauri-apps/api/core";
import { TauriBridge } from "@/models";

export async function getLaunchConfig(instanceDir: string): Promise<TauriBridge.InstanceProcess.LaunchConfig> {
    return invoke<TauriBridge.InstanceProcess.LaunchConfig>("get_launch_config", { instanceDir });
}

export async function updateLaunchConfig(instanceDir: string, config: TauriBridge.InstanceProcess.LaunchConfig): Promise<void> {
    return invoke<void>("update_launch_config", { instanceDir, config });
}

export async function getInstanceStatus(instanceId: string): Promise<string> {
    return invoke<string>("get_instance_status", { instanceId });
}

export async function startInstance(instanceId: string, workingDir: string): Promise<void> {
    return invoke<void>("start_instance", {
        instanceId,
        workingDir,
    });
}

export async function stopInstance(instanceId: string): Promise<void> {
    return invoke<void>("stop_instance", { instanceId });
}

export async function killInstance(instanceId: string): Promise<void> {
    return invoke<void>("kill_instance", { instanceId });
}

export async function sendInstanceCommand(instanceId: string, command: string): Promise<void> {
    return invoke<void>("send_instance_command", { instanceId, command });
}

export async function getInstanceLogs(instanceId: string): Promise<TauriBridge.InstanceProcess.LogEntry[]> {
    return invoke<TauriBridge.InstanceProcess.LogEntry[]>("get_instance_logs", { instanceId });
}

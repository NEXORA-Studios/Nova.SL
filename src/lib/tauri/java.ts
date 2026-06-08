import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { TauriBridge } from "@/models";

export type JavaInstallation = TauriBridge.Java.JavaInstallation;
export type JavaConfig = TauriBridge.Java.JavaConfig;

export async function scanJavaInstallations(customPaths?: string[]): Promise<void> {
    return invoke<void>("scan_java_installations", { customPaths });
}

export async function getCachedJavas(): Promise<JavaInstallation[]> {
    return invoke<JavaInstallation[]>("get_cached_javas");
}

export async function removeJavaFromCache(path: string): Promise<void> {
    return invoke<void>("remove_java_from_cache", { path });
}

export async function getJavaConfig(): Promise<JavaConfig> {
    return invoke<JavaConfig>("get_java_config");
}

export async function updateJavaEnabled(path: string, enabled: boolean): Promise<void> {
    return invoke<void>("update_java_enabled", { path, enabled });
}

export async function addManualJava(installation: JavaInstallation): Promise<void> {
    return invoke<void>("add_manual_java", { installation });
}

export async function onJavaScanEvent(handler: (event: TauriBridge.Java.ScanEvent) => void): Promise<UnlistenFn> {
    return listen<TauriBridge.Java.ScanEvent>("java-scan-event", (event) => {
        handler(event.payload);
    });
}

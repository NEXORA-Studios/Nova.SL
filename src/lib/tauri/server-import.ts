import { invoke } from "@tauri-apps/api/core";
import { TauriBridge } from "@/models";

export type ImportAnalysis = TauriBridge.Server.Import.ImportAnalysis;

export async function pickServerDirectory(): Promise<string | null> {
    return invoke<string | null>("pick_server_directory");
}

export async function analyzeServerDirectory(instancePath: string): Promise<ImportAnalysis> {
    return invoke<ImportAnalysis>("analyze_server_directory", { instancePath });
}

export async function importInstance(
    instancePath: string,
    instanceName: string,
    loader: string,
    version: string
): Promise<string> {
    return invoke<string>("import_instance", {
        instancePath,
        instanceName,
        loader,
        version,
    });
}


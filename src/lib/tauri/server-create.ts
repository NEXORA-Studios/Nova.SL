import { invoke } from "@tauri-apps/api/core";
import { TauriBridge } from "@/models";

export type VersionInfo = TauriBridge.Server.Create.VersionInfo;
export type VersionGroup = TauriBridge.Server.Create.VersionGroup;
export type BuildInfo = TauriBridge.Server.Create.BuildInfo;

export async function getDownloadableLoaders(): Promise<[string, string][]> {
    return invoke<[string, string][]>("get_downloadable_loaders");
}

export async function getLoaderVersions(loader: string): Promise<VersionGroup[]> {
    return invoke<VersionGroup[]>("get_loader_versions", { loader });
}

export async function getLoaderBuilds(loader: string, version: string): Promise<BuildInfo[]> {
    return invoke<BuildInfo[]>("get_loader_builds", { loader, version });
}

export async function createServerInstance(
    instancePath: string,
    instanceName: string,
    loader: string,
    version: string,
    build?: string
): Promise<string> {
    return invoke<string>("create_server_instance", {
        instancePath,
        instanceName,
        loader,
        version,
        build,
    });
}

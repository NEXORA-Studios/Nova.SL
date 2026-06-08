import { invoke } from "@tauri-apps/api/core";
import type {
    SearchResponse,
    Project,
    Version,
    Category,
    Loader,
    GameVersion,
    SearchFilters,
    HashAlgorithm,
    DownloadResult,
} from "@/models/tauri/modrinth";

/**
 * 搜索模组
 */
export async function searchMods(query: string, filters: SearchFilters): Promise<SearchResponse> {
    return invoke("search_mods", { query, filters });
}

/**
 * 获取模组详情
 */
export async function getModrinthProject(projectId: string): Promise<Project> {
    return invoke("get_modrinth_project", { projectId });
}

/**
 * 获取模组版本列表
 */
export async function getModrinthVersions(projectId: string, gameVersion?: string, loader?: string): Promise<Version[]> {
    return invoke("get_modrinth_versions", { projectId, game_version: gameVersion, loader });
}

/**
 * 获取单个版本详情
 */
export async function getModrinthVersion(versionId: string): Promise<Version> {
    return invoke("get_modrinth_version", { versionId });
}

/**
 * 下载模组到指定实例
 */
export async function downloadModToInstance(instanceId: string, versionId: string): Promise<DownloadResult> {
    return invoke("download_mod_to_instance", { instanceId, versionId });
}

/**
 * 获取所有分类
 */
export async function getModrinthCategories(): Promise<Category[]> {
    return invoke("get_modrinth_categories");
}

/**
 * 获取所有加载器
 */
export async function getModrinthLoaders(): Promise<Loader[]> {
    return invoke("get_modrinth_loaders");
}

/**
 * 获取所有游戏版本
 */
export async function getModrinthGameVersions(): Promise<GameVersion[]> {
    return invoke("get_modrinth_game_versions");
}

/**
 * 通过文件哈希获取版本
 */
export async function getModrinthVersionFromHash(hash: string, algorithm: HashAlgorithm): Promise<Version> {
    return invoke("get_modrinth_version_from_hash", { hash, algorithm });
}

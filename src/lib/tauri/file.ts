import { invoke } from "@tauri-apps/api/core";
import { TauriBridge } from "@/models";

export type FileEntry = TauriBridge.File.Directory.FileEntry;
export type FileEntryType = TauriBridge.File.Directory.FileEntryType;
export type TextFileFormat = TauriBridge.File.Text.TextFileFormat;
export type NbtNode = TauriBridge.File.Nbt.NbtNode;
export type NbtTree = TauriBridge.File.Nbt.NbtTree;

// ==================== 目录浏览 ====================

export async function listDir(dirPath: string): Promise<TauriBridge.File.Directory.DirectoryListing> {
    return invoke<TauriBridge.File.Directory.DirectoryListing>("list_dir", { dirPath });
}

export async function getFileMetadata(filePath: string): Promise<TauriBridge.File.Directory.FileEntry> {
    return invoke<TauriBridge.File.Directory.FileEntry>("get_file_metadata", { filePath });
}

export async function checkPathExists(path: string): Promise<boolean> {
    return invoke<boolean>("check_path_exists", { path });
}

export async function checkIsDirectory(path: string): Promise<boolean> {
    return invoke<boolean>("check_is_directory", { path });
}

export async function checkIsFile(path: string): Promise<boolean> {
    return invoke<boolean>("check_is_file", { path });
}

export async function getParent(path: string): Promise<string | null> {
    return invoke<string | null>("get_parent", { path });
}

export async function joinPaths(base: string, components: string[]): Promise<string> {
    return invoke<string>("join_paths", { base, components });
}

export async function createDir(parentPath: string, name: string): Promise<void> {
    return invoke<void>("create_dir", { parentPath, name });
}

export async function createFile(parentPath: string, name: string): Promise<void> {
    return invoke<void>("create_file", { parentPath, name });
}

export async function validateFileName(name: string): Promise<void> {
    return invoke<void>("validate_file_name", { name });
}

export async function copyFileOrDir(src: string, dst: string): Promise<void> {
    return invoke<void>("copy_file_or_dir", { src, dst });
}

export async function moveFileOrDir(src: string, dst: string): Promise<void> {
    return invoke<void>("move_file_or_dir", { src, dst });
}

export async function renameFileOrDir(src: string, newName: string): Promise<void> {
    return invoke<void>("rename_file_or_dir", { src, newName });
}

export async function deleteFileOrDir(path: string): Promise<void> {
    return invoke<void>("delete_file_or_dir", { path });
}

export async function openWithExternalCommand(filePath: string, commandTemplate: string): Promise<void> {
    return invoke<void>("open_with_external_command", { filePath, commandTemplate });
}

// ==================== 文本文件 ====================

export async function readText(filePath: string): Promise<{ format: TauriBridge.File.Text.TextFileFormat; content: unknown }> {
    const [format, content] = await invoke<[string, unknown]>("read_text", { filePath });
    return { format: format as TauriBridge.File.Text.TextFileFormat, content };
}

export async function writeText(filePath: string, format: TauriBridge.File.Text.TextFileFormat, content: unknown): Promise<void> {
    return invoke<void>("write_text", { filePath, format, content });
}

export async function readRaw(filePath: string): Promise<string> {
    return invoke<string>("read_raw", { filePath });
}

export async function writeRaw(filePath: string, content: string): Promise<void> {
    return invoke<void>("write_raw", { filePath, content });
}

export async function writeRawValidated(
    filePath: string,
    format: TauriBridge.File.Text.TextFileFormat,
    content: string
): Promise<void> {
    return invoke<void>("write_raw_validated", { filePath, format, content });
}

// ==================== NBT 文件 ====================

export async function readNbt(filePath: string): Promise<TauriBridge.File.Nbt.NbtTree> {
    return invoke<TauriBridge.File.Nbt.NbtTree>("read_nbt", { filePath });
}

// ==================== 辅助函数 ====================

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
    return `${size} ${units[i]}`;
}

export function getFileIconClass(name: string, entryType: TauriBridge.File.Directory.FileEntryType): string {
    if (entryType === "directory") return "folder";
    const ext = name.split(".").pop()?.toLowerCase() || "";

    const iconMap: Record<string, string> = {
        json: "json",
        toml: "config",
        yaml: "config",
        yml: "config",
        properties: "config",
        txt: "text",
        md: "text",
        log: "log",
        dat: "nbt",
        nbt: "nbt",
        jar: "archive",
        zip: "archive",
        tar: "archive",
        gz: "archive",
        png: "image",
        jpg: "image",
        jpeg: "image",
        gif: "image",
        webp: "image",
        mp3: "audio",
        wav: "audio",
        mp4: "video",
        mkv: "video",
    };

    return iconMap[ext] || "file";
}

export function isEditableTextFile(name: string): boolean {
    const editableExts = ["json", "toml", "yaml", "yml", "properties", "txt", "md", "log", "conf", "cfg", "ini"];
    const ext = name.split(".").pop()?.toLowerCase() || "";
    return editableExts.includes(ext);
}

export function isNbtFile(name: string): boolean {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    return ext === "dat" || ext === "nbt";
}

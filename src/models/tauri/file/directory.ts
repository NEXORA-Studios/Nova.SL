export type FileEntryType = "file" | "directory" | "symlink";

export interface FileEntry {
    name: string;
    path: string;
    entry_type: FileEntryType;
    size: number;
    modified: string | null;
    extension: string | null;
}

export interface DirectoryListing {
    path: string;
    entries: FileEntry[];
}

import { cn } from "@/lib/utils";
import {
    FolderIcon,
    FileIcon,
    FileTextIcon,
    FileJsonIcon,
    FileArchiveIcon,
    FileImageIcon,
    FileAudioIcon,
    FileVideoIcon,
    FileCodeIcon,
    ScrollTextIcon,
    type LucideIcon,
} from "lucide-react";
import type { FileEntry, FileEntryType } from "@/lib/tauri/file";
import { formatFileSize } from "@/lib/tauri/file";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface FileListProps {
    items: FileEntry[];
    selectedPaths: Set<string>;
    onNavigate?: (item: FileEntry) => void;
    onOpen?: (item: FileEntry) => void;
    onSelect?: (item: FileEntry, isMulti: boolean) => void;
    onContextOpen?: (item: FileEntry) => void;
    onContextOpenExternal?: (item: FileEntry) => void;
    onContextCut?: (items: FileEntry[]) => void;
    onContextCopy?: (items: FileEntry[]) => void;
    onContextPaste?: () => void;
    onContextRename?: (item: FileEntry) => void;
    canPaste?: boolean;
    className?: string;
}

function iconMap(ext: string | null, entryType: FileEntryType): LucideIcon {
    if (entryType === "directory") return FolderIcon;
    if (!ext) return FileIcon;

    switch (ext.toLowerCase()) {
        case "json":
            return FileJsonIcon;
        case "txt":
        case "md":
            return FileTextIcon;
        case "yml":
        case "yaml":
        case "properties":
        case "toml":
        case "conf":
        case "cfg":
        case "ini":
            return FileCodeIcon;
        case "log":
            return ScrollTextIcon;
        case "jar":
        case "zip":
        case "tar":
        case "gz":
            return FileArchiveIcon;
        case "png":
        case "jpg":
        case "jpeg":
        case "gif":
        case "webp":
        case "bmp":
            return FileImageIcon;
        case "mp3":
        case "wav":
        case "ogg":
            return FileAudioIcon;
        case "mp4":
        case "mkv":
        case "avi":
            return FileVideoIcon;
        default:
            return FileIcon;
    }
}

function formatDate(dateStr: string | null): string {
    if (!dateStr) return "--";
    try {
        const date = new Date(dateStr);
        return date.toLocaleString("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return "--";
    }
}

function FileList({
    items,
    selectedPaths,
    onNavigate,
    onOpen,
    onSelect,
    onContextOpen,
    onContextOpenExternal,
    onContextCut,
    onContextCopy,
    onContextPaste,
    onContextRename,
    canPaste,
    className,
}: FileListProps) {
    const cols = "grid-cols-[1fr_100px_160px]";

    return (
        <div className={cn("flex min-h-0 flex-1 flex-col overflow-auto", className)}>
            <div
                className={cn(
                    cols,
                    "sticky top-0 z-10 grid gap-4 border-b border-border bg-card px-4 py-2 text-xs text-muted-foreground"
                )}>
                <span>名称</span>
                <span>大小</span>
                <span>修改时间</span>
            </div>
            {items.map((item) => {
                const Icon = iconMap(item.extension, item.entry_type);
                const isDirectory = item.entry_type === "directory";
                const isSelected = selectedPaths.has(item.path);

                if (item.name === ".nova" && isDirectory) return null;

                return (
                    <ContextMenu key={item.path}>
                        <ContextMenuTrigger asChild>
                            <div
                                className={cn(
                                    "grid cursor-pointer gap-4 border-b border-border px-4 py-2 text-sm transition-colors hover:bg-accent",
                                    cols,
                                    isDirectory && "hover:bg-accent/50",
                                    isSelected && "bg-accent"
                                )}
                                onClick={(e) => {
                                    const isMulti = e.ctrlKey || e.metaKey;
                                    onSelect?.(item, isMulti);
                                }}
                                onDoubleClick={() => {
                                    if (isDirectory) {
                                        onNavigate?.(item);
                                    } else {
                                        onOpen?.(item);
                                    }
                                }}>
                                <div className="flex min-w-0 items-center gap-2">
                                    <Icon
                                        className={cn("size-4 shrink-0", isDirectory ? "text-yellow-500" : "text-muted-foreground")}
                                    />
                                    <span className="truncate">{item.name}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">{isDirectory ? "--" : formatFileSize(item.size)}</span>
                                <span className="text-xs text-muted-foreground">{formatDate(item.modified)}</span>
                            </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-48">
                            <ContextMenuItem onClick={() => onContextOpen?.(item)}>
                                打开
                            </ContextMenuItem>
                            {!isDirectory && (
                                <ContextMenuItem onClick={() => onContextOpenExternal?.(item)}>
                                    外部打开
                                </ContextMenuItem>
                            )}
                            <ContextMenuSeparator />
                            <ContextMenuItem onClick={() => onContextCut?.([item])}>
                                剪切
                            </ContextMenuItem>
                            <ContextMenuItem onClick={() => onContextCopy?.([item])}>
                                复制
                            </ContextMenuItem>
                            <ContextMenuItem
                                onClick={() => onContextPaste?.()}
                                disabled={!canPaste}>
                                粘贴
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem onClick={() => onContextRename?.(item)}>
                                重命名
                            </ContextMenuItem>
                        </ContextMenuContent>
                    </ContextMenu>
                );
            })}
        </div>
    );
}

export { FileList };
export type { FileEntry };


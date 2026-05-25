import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router";
import { FileHeader } from "@/components/launcher/server/[serverId]/files/file-header";
import { FileList } from "@/components/launcher/server/[serverId]/files/file-list";
import { TextEditor } from "@/components/launcher/server/[serverId]/files/text-editor";
import { NbtViewer } from "@/components/launcher/server/[serverId]/files/nbt-viewer";
import {
    listDir,
    joinPaths,
    getParent,
    createDir,
    createFile,
    validateFileName,
    copyFileOrDir,
    moveFileOrDir,
    renameFileOrDir,
    openWithExternalCommand,
    type FileEntry,
    isEditableTextFile,
    isNbtFile,
} from "@/lib/tauri/file";
import { useConfigStore } from "@/stores/config";
import { toast } from "sonner";
import { Loader2Icon, FolderXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface ClipboardItem {
    item: FileEntry;
    operation: "cut" | "copy";
}

function Files() {
    const { serverId } = useParams<{ serverId: string }>();
    const { config, loaded } = useConfigStore();

    // 文件浏览器状态
    const [basePath, setBasePath] = useState<string>("");
    const [currentPath, setCurrentPath] = useState<string>("");
    const [pathComponents, setPathComponents] = useState<string[]>([]);
    const [entries, setEntries] = useState<FileEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 多选状态
    const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());

    // 剪贴板状态
    const [clipboard, setClipboard] = useState<ClipboardItem[]>([]);

    // 编辑器状态
    const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
    const [isTextEditorOpen, setIsTextEditorOpen] = useState(false);
    const [isNbtViewerOpen, setIsNbtViewerOpen] = useState(false);

    // 创建对话框状态
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [createType, setCreateType] = useState<"folder" | "file">("folder");
    const [createName, setCreateName] = useState("");
    const [createError, setCreateError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // 重命名对话框状态
    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [renameTarget, setRenameTarget] = useState<FileEntry | null>(null);
    const [renameValue, setRenameValue] = useState("");
    const [renameError, setRenameError] = useState<string | null>(null);
    const [isRenaming, setIsRenaming] = useState(false);

    // 从配置中获取实例路径
    useEffect(() => {
        if (!loaded || !serverId || !config) return;

        const instance = config.server.instances.find((inst) => inst.id === serverId);
        if (instance) {
            setBasePath(instance.path);
            setCurrentPath(instance.path);
            setError(null);
        } else {
            setError(`未找到实例: ${serverId}`);
        }
    }, [serverId, config, loaded]);

    // 加载目录内容
    const loadDirectory = useCallback(async () => {
        if (!currentPath) return;

        setIsLoading(true);
        setError(null);

        try {
            const listing = await listDir(currentPath);
            setEntries(listing.entries);

            // 更新路径组件
            if (basePath) {
                const relativePath = currentPath.replace(basePath, "").replace(/^[/\\]/, "");
                setPathComponents(relativePath ? relativePath.split(/[/\\]/) : []);
            } else {
                setPathComponents([]);
            }
        } catch (err) {
            const errorMsg = String(err);
            setError(errorMsg);
            toast.error(`加载目录失败: ${errorMsg}`);
        } finally {
            setIsLoading(false);
        }
    }, [currentPath, basePath]);

    useEffect(() => {
        loadDirectory();
    }, [loadDirectory]);

    // 导航到目录
    const handleNavigate = useCallback(
        async (item: FileEntry) => {
            if (item.entry_type === "directory") {
                setCurrentPath(item.path);
                setSelectedPaths(new Set());
            }
        },
        [setCurrentPath]
    );

    // 选择文件（单击）
    const handleSelect = useCallback((item: FileEntry, isMulti: boolean) => {
        setSelectedPaths((prev) => {
            const next = new Set(prev);
            if (isMulti) {
                if (next.has(item.path)) {
                    next.delete(item.path);
                } else {
                    next.add(item.path);
                }
            } else {
                if (next.has(item.path) && next.size === 1) {
                    next.clear();
                } else {
                    next.clear();
                    next.add(item.path);
                }
            }
            return next;
        });
    }, []);

    // 打开文件（双击）
    const handleOpen = useCallback(
        (item: FileEntry) => {
            if (item.entry_type === "directory") {
                setCurrentPath(item.path);
                setSelectedPaths(new Set());
                return;
            }

            const defaultEditor = config?.ui.editor.default_editor ?? "internal";
            const commandTemplate = config?.ui.editor.custom_start_command ?? "code %file%";

            if (defaultEditor === "custom" && isEditableTextFile(item.name)) {
                openWithExternalCommand(item.path, commandTemplate).catch((err) => {
                    toast.error("外部编辑器启动失败", { description: String(err) });
                });
                return;
            }

            if (isNbtFile(item.name)) {
                setSelectedFile(item);
                setIsNbtViewerOpen(true);
            } else if (isEditableTextFile(item.name)) {
                setSelectedFile(item);
                setIsTextEditorOpen(true);
            } else {
                toast.warning(`无法编辑/预览此文件: ${item.name}`, {
                    description: "目前仅支持编辑文本文件和预览 NBT 文件。",
                });
            }
        },
        [config, setCurrentPath]
    );

    // 右键菜单 - 打开
    const handleContextOpen = useCallback(
        (item: FileEntry) => {
            handleOpen(item);
        },
        [handleOpen]
    );

    // 右键菜单 - 外部打开
    const handleContextOpenExternal = useCallback(
        (item: FileEntry) => {
            const commandTemplate = config?.ui.editor.custom_start_command ?? "code %file%";
            openWithExternalCommand(item.path, commandTemplate).catch((err) => {
                toast.error("外部编辑器启动失败", { description: String(err) });
            });
        },
        [config]
    );

    // 右键菜单 - 剪切
    const handleContextCut = useCallback((items: FileEntry[]) => {
        setClipboard(items.map((item) => ({ item, operation: "cut" })));
        toast.info(`已剪切 ${items.length} 个项目`);
    }, []);

    // 右键菜单 - 复制
    const handleContextCopy = useCallback((items: FileEntry[]) => {
        setClipboard(items.map((item) => ({ item, operation: "copy" })));
        toast.info(`已复制 ${items.length} 个项目`);
    }, []);

    // 右键菜单 - 粘贴
    const handleContextPaste = useCallback(async () => {
        if (clipboard.length === 0 || !currentPath) return;

        for (const { item, operation } of clipboard) {
            const dstPath = await joinPaths(currentPath, [item.name]);
            try {
                if (operation === "cut") {
                    await moveFileOrDir(item.path, dstPath);
                } else {
                    await copyFileOrDir(item.path, dstPath);
                }
            } catch (err) {
                toast.error("粘贴失败", { description: String(err) });
                return;
            }
        }

        toast.success("粘贴完成");
        setClipboard([]);
        loadDirectory();
    }, [clipboard, currentPath, loadDirectory]);

    // 右键菜单 - 重命名
    const handleContextRename = useCallback((item: FileEntry) => {
        setRenameTarget(item);
        setRenameValue(item.name);
        setRenameError(null);
        setRenameDialogOpen(true);
    }, []);

    // 确认重命名
    const handleRenameConfirm = useCallback(async () => {
        if (!renameTarget || !renameValue) return;

        try {
            await validateFileName(renameValue);
        } catch (err) {
            setRenameError(String(err));
            return;
        }

        setIsRenaming(true);
        try {
            await renameFileOrDir(renameTarget.path, renameValue);
            toast.success("重命名成功");
            setRenameDialogOpen(false);
            setRenameTarget(null);
            setRenameValue("");
            setRenameError(null);
            loadDirectory();
        } catch (err) {
            const msg = String(err);
            setRenameError(msg);
            toast.error("重命名失败", { description: msg });
        } finally {
            setIsRenaming(false);
        }
    }, [renameTarget, renameValue, loadDirectory]);

    // 返回上级
    const handleBack = useCallback(async () => {
        if (!basePath || currentPath === basePath) return;

        const parent = await getParent(currentPath);
        if (parent) {
            setCurrentPath(parent);
            setSelectedPaths(new Set());
        }
    }, [currentPath, basePath]);

    // 导航到根目录
    const handleNavigateRoot = useCallback(() => {
        if (basePath) {
            setCurrentPath(basePath);
            setSelectedPaths(new Set());
        }
    }, [basePath]);

    // 导航到指定路径层级
    const handleNavigateTo = useCallback(
        (index: number) => {
            if (!basePath) return;

            const components = pathComponents.slice(0, index + 1);
            joinPaths(basePath, components).then((newPath) => {
                setCurrentPath(newPath);
                setSelectedPaths(new Set());
            });
        },
        [basePath, pathComponents]
    );

    // 打开创建对话框
    const openCreateDialog = useCallback((type: "folder" | "file") => {
        setCreateType(type);
        setCreateName("");
        setCreateError(null);
        setCreateDialogOpen(true);
    }, []);

    // 创建文件夹
    const handleNewFolder = useCallback(() => {
        openCreateDialog("folder");
    }, [openCreateDialog]);

    // 创建文件
    const handleNewFile = useCallback(() => {
        openCreateDialog("file");
    }, [openCreateDialog]);

    // 处理名称输入变化（实时校验）
    const handleCreateNameChange = useCallback((value: string) => {
        setCreateName(value);
        if (!value) {
            setCreateError(null);
            return;
        }
        try {
            validateFileName(value);
            setCreateError(null);
        } catch (err) {
            setCreateError(String(err));
        }
    }, []);

    // 确认创建
    const handleCreateConfirm = useCallback(async () => {
        if (!createName || !currentPath) return;

        // 最终校验
        try {
            await validateFileName(createName);
        } catch (err) {
            setCreateError(String(err));
            return;
        }

        setIsCreating(true);
        try {
            if (createType === "folder") {
                await createDir(currentPath, createName);
                toast.success(`文件夹 "${createName}" 创建成功`);
            } else {
                await createFile(currentPath, createName);
                toast.success(`文件 "${createName}" 创建成功`);
            }
            setCreateDialogOpen(false);
            setCreateName("");
            setCreateError(null);
            loadDirectory();
        } catch (err) {
            const msg = String(err);
            setCreateError(msg);
            toast.error("创建失败", { description: msg });
        } finally {
            setIsCreating(false);
        }
    }, [createName, currentPath, createType, loadDirectory]);

    // 重试加载
    const handleRetry = useCallback(() => {
        loadDirectory();
    }, [loadDirectory]);

    if (!loaded) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error && !basePath) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
                <FolderXIcon className="size-12" />
                <div className="text-center">
                    <p className="text-lg font-medium text-foreground">无法加载文件管理器</p>
                    <p className="text-sm">{error}</p>
                </div>
                <Button onClick={handleRetry} variant="outline">
                    重试
                </Button>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card">
            <FileHeader
                path={currentPath}
                pathComponents={pathComponents}
                onBack={handleBack}
                onNavigateRoot={handleNavigateRoot}
                onNavigateTo={handleNavigateTo}
                onNewFolder={handleNewFolder}
                onNewFile={handleNewFile}
            />

            {isLoading ? (
                <div className="flex flex-1 items-center justify-center">
                    <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
                </div>
            ) : error ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
                    <FolderXIcon className="size-12" />
                    <div className="text-center">
                        <p className="text-lg font-medium text-foreground">加载失败</p>
                        <p className="text-sm">{error}</p>
                    </div>
                    <Button onClick={handleRetry} variant="outline">
                        重试
                    </Button>
                </div>
            ) : (
                <FileList
                    items={entries}
                    selectedPaths={selectedPaths}
                    onNavigate={handleNavigate}
                    onOpen={handleOpen}
                    onSelect={handleSelect}
                    onContextOpen={handleContextOpen}
                    onContextOpenExternal={handleContextOpenExternal}
                    onContextCut={handleContextCut}
                    onContextCopy={handleContextCopy}
                    onContextPaste={handleContextPaste}
                    onContextRename={handleContextRename}
                    canPaste={clipboard.length > 0}
                />
            )}

            {/* 文本编辑器 */}
            <TextEditor
                filePath={selectedFile?.path || ""}
                fileName={selectedFile?.name || ""}
                isOpen={isTextEditorOpen}
                onClose={() => {
                    setIsTextEditorOpen(false);
                    setSelectedFile(null);
                }}
                onSave={loadDirectory}
            />

            {/* NBT 查看器 */}
            <NbtViewer
                filePath={selectedFile?.path || ""}
                fileName={selectedFile?.name || ""}
                isOpen={isNbtViewerOpen}
                onClose={() => {
                    setIsNbtViewerOpen(false);
                    setSelectedFile(null);
                }}
            />

            {/* 创建文件/文件夹对话框 */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{createType === "folder" ? "创建文件夹" : "创建文件"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <Input
                            placeholder={createType === "folder" ? "请输入文件夹名称" : "请输入文件名称"}
                            value={createName}
                            onChange={(e) => handleCreateNameChange(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && createName && !createError && !isCreating) {
                                    handleCreateConfirm();
                                }
                            }}
                            autoFocus
                        />
                        {createError && <p className="text-xs text-destructive">{createError}</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={isCreating}>
                            取消
                        </Button>
                        <Button onClick={handleCreateConfirm} disabled={!createName || !!createError || isCreating}>
                            {isCreating ? (
                                <>
                                    <Loader2Icon className="mr-1 size-4 animate-spin" />
                                    创建中...
                                </>
                            ) : (
                                "创建"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 重命名对话框 */}
            <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>重命名</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <Input
                            placeholder="请输入新名称"
                            value={renameValue}
                            onChange={(e) => {
                                setRenameValue(e.target.value);
                                setRenameError(null);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && renameValue && !renameError && !isRenaming) {
                                    handleRenameConfirm();
                                }
                            }}
                            autoFocus
                        />
                        {renameError && <p className="text-xs text-destructive">{renameError}</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRenameDialogOpen(false)} disabled={isRenaming}>
                            取消
                        </Button>
                        <Button onClick={handleRenameConfirm} disabled={!renameValue || !!renameError || isRenaming}>
                            {isRenaming ? (
                                <>
                                    <Loader2Icon className="mr-1 size-4 animate-spin" />
                                    重命名中...
                                </>
                            ) : (
                                "重命名"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default Files;

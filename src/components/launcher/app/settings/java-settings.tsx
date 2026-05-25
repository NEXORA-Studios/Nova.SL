import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useJavaStore } from "@/stores/java";
import {
    scanJavaInstallations,
    onJavaScanEvent,
    getCachedJavas,
    type JavaInstallation,
} from "@/lib/tauri";
import { CoffeeIcon, Trash2Icon, RefreshCwIcon, PlusIcon, FolderOpenIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function JavaSettings() {
    const javaConfig = useJavaStore((s) => s.config);
    const javaLoaded = useJavaStore((s) => s.loaded);
    const loadJava = useJavaStore((s) => s.load);
    const removeJava = useJavaStore((s) => s.remove);
    const syncFromScan = useJavaStore((s) => s.syncFromScan);
    const setJavaEnabled = useJavaStore((s) => s.setEnabled);

    const [scanning, setScanning] = useState(false);
    const [scanProgress, setScanProgress] = useState({ current: 0, total: 0 });
    const [scanStatus, setScanStatus] = useState("");
    const [foundDuringScan, setFoundDuringScan] = useState<JavaInstallation[]>([]);

    const [deletePath, setDeletePath] = useState<string | null>(null);

    useEffect(() => {
        if (!javaLoaded) loadJava();
    }, [javaLoaded, loadJava]);

    // 注册 IPC 事件监听
    useEffect(() => {
        let unlisten: (() => void) | null = null;

        onJavaScanEvent((event) => {
            switch (event.type) {
                case "started":
                    setScanning(true);
                    setScanProgress({ current: 0, total: event.total_paths });
                    setScanStatus(`开始扫描 ${event.total_paths} 个路径...`);
                    setFoundDuringScan([]);
                    break;
                case "scanning_path":
                    setScanProgress({ current: event.current, total: event.total });
                    setScanStatus(`正在扫描: ${event.path}`);
                    break;
                case "found":
                    setFoundDuringScan((prev) => [...prev, event.java]);
                    break;
                case "completed":
                    setScanning(false);
                    setScanStatus(`扫描完成，找到 ${event.found} 个 Java`);
                    syncFoundJavas();
                    break;
                case "error":
                    setScanning(false);
                    setScanStatus(`扫描出错: ${event.message}`);
                    break;
            }
        }).then((fn) => {
            unlisten = fn;
        });

        return () => {
            if (unlisten) unlisten();
        };
    }, []);

    const syncFoundJavas = useCallback(async () => {
        const found = await getCachedJavas();
        await syncFromScan(found);
    }, [syncFromScan]);

    const handleScan = async () => {
        setScanning(true);
        setScanStatus("正在启动扫描...");
        try {
            await scanJavaInstallations();
        } catch (err) {
            setScanning(false);
            setScanStatus(`扫描失败: ${err}`);
        }
    };

    const handleAddManual = async () => {
        alert("手动添加功能待实现：需要集成 Tauri 文件选择对话框");
    };

    const confirmDelete = (path: string) => {
        setDeletePath(path);
    };

    const doDelete = async () => {
        if (!deletePath) return;
        await removeJava(deletePath);
        setDeletePath(null);
    };

    const progressPercent =
        scanProgress.total > 0
            ? Math.round((scanProgress.current / scanProgress.total) * 100)
            : 0;

    const instances = javaConfig?.instances ?? [];

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <CoffeeIcon className="size-4 text-primary" />
                        <CardTitle>Java 运行时</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleAddManual}
                            disabled={scanning}>
                            <PlusIcon className="mr-1 size-4" />
                            手动添加
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleScan}
                            disabled={scanning}>
                            <RefreshCwIcon
                                className={
                                    "mr-1 size-4 " + (scanning ? "animate-spin" : "")
                                }
                            />
                            {scanning ? "扫描中..." : "自动扫描"}
                        </Button>
                    </div>
                </div>
                <CardDescription>
                    管理 Java 运行时环境，用于启动 Minecraft 服务器。关闭开关可将其从自动选择中排除。
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* 扫描进度 */}
                {scanning && (
                    <div className="space-y-2">
                        <Progress value={progressPercent} />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{scanStatus}</span>
                            <span>
                                {scanProgress.current} / {scanProgress.total}
                            </span>
                        </div>
                        {foundDuringScan.length > 0 && (
                            <p className="text-xs text-primary">
                                已找到 {foundDuringScan.length} 个 Java...
                            </p>
                        )}
                    </div>
                )}

                {!scanning && scanStatus && (
                    <p className="text-xs text-muted-foreground">{scanStatus}</p>
                )}

                {instances.length === 0 ? (
                    <div className="py-8 text-center">
                        <CoffeeIcon className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">未找到 Java 运行时</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            点击「自动扫描」搜索系统上的 Java，或「手动添加」指定路径
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {instances.map((java, index) => {
                            const entryEnabled = java.enabled !== false;
                            return (
                                <div
                                    key={index}
                                    className={
                                        "flex items-center justify-between rounded-lg border px-4 py-3 " +
                                        (entryEnabled
                                            ? "border-border bg-accent/20"
                                            : "border-border/50 bg-muted/30 opacity-70")
                                    }>
                                    <div className="min-w-0 flex-1 space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <p className="truncate text-sm font-medium">
                                                Java {java.major_version}
                                            </p>
                                            {java.vendor && (
                                                <Badge variant="default">{java.vendor}</Badge>
                                            )}
                                            {java.manual && (
                                                <Badge variant="outline">手动导入</Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {java.version}
                                        </p>
                                        <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                                            <FolderOpenIcon className="size-3 shrink-0" />
                                            <span className="truncate">{java.path}</span>
                                        </p>
                                    </div>
                                    <div className="ml-4 flex shrink-0 items-center gap-2">
                                        <div className="flex items-center gap-1.5">
                                            <Switch
                                                checked={entryEnabled}
                                                onCheckedChange={(v) =>
                                                    setJavaEnabled(java.path, v)
                                                }
                                                id={`java-enabled-${index}`}
                                            />
                                            <label
                                                htmlFor={`java-enabled-${index}`}
                                                className="cursor-pointer text-xs text-muted-foreground select-none">
                                                {entryEnabled ? "启用" : "禁用"}
                                            </label>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            className="shrink-0 text-destructive hover:bg-destructive/10"
                                            onClick={() => confirmDelete(java.path)}>
                                            <Trash2Icon className="size-4" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>

            {/* 删除确认弹窗 */}
            <AlertDialog
                open={deletePath !== null}
                onOpenChange={(open) => {
                    if (!open) setDeletePath(null);
                }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认删除</AlertDialogTitle>
                        <AlertDialogDescription>
                            确定要删除这个 Java 运行时吗？此操作不可恢复。
                            <br />
                            <code className="mt-1 block truncate rounded bg-muted px-1 py-0.5 text-xs">
                                {deletePath}
                            </code>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={doDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            删除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}

export { JavaSettings };

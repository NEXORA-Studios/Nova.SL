import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useConfigStore } from "@/stores/config";
import { ServerIcon, Trash2Icon, FolderOpenIcon, HardDriveIcon, UnlinkIcon } from "lucide-react";
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteFileOrDir } from "@/lib/tauri/file";
import { toast } from "sonner";

function ServerInstanceSettings() {
    const config = useConfigStore((s) => s.config);
    const loaded = useConfigStore((s) => s.loaded);
    const load = useConfigStore((s) => s.load);
    const removeInstance = useConfigStore((s) => s.removeInstance);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [selectedInstance, setSelectedInstance] = useState<{ name: string; path: string } | null>(null);

    useEffect(() => {
        if (!loaded) load();
    }, [loaded, load]);

    const handleOpenDeleteDialog = (index: number) => {
        if (!config) return;
        const instance = config.server.instances[index];
        setSelectedIndex(index);
        setSelectedInstance(instance);
        setDeleteDialogOpen(true);
    };

    const handleRemoveFromApp = async () => {
        if (selectedIndex === null) return;
        try {
            await removeInstance(selectedIndex);
            toast.success("已从应用中移除实例");
        } catch (err) {
            toast.error(`移除失败: ${err}`);
        } finally {
            setDeleteDialogOpen(false);
            setSelectedIndex(null);
            setSelectedInstance(null);
        }
    };

    const handleDeleteFromDisk = async () => {
        if (selectedIndex === null || !selectedInstance) return;
        try {
            // 先删除磁盘文件
            await deleteFileOrDir(selectedInstance.path);
            // 再从应用配置中移除
            await removeInstance(selectedIndex);
            toast.success("实例及其文件已彻底删除");
        } catch (err) {
            toast.error(`删除失败: ${err}`);
        } finally {
            setDeleteDialogOpen(false);
            setSelectedIndex(null);
            setSelectedInstance(null);
        }
    };

    if (!config) return null;

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <ServerIcon className="size-4 text-primary" />
                        <CardTitle>服务器实例</CardTitle>
                    </div>
                    <CardDescription>管理所有已注册的 Minecraft 服务器实例</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* 实例列表 */}
                    <div className="space-y-2">
                        {config.server.instances.length === 0 ? (
                            <p className="py-4 text-center text-sm text-muted-foreground">
                                暂无服务器实例，请在侧边栏中点击「+」添加实例
                            </p>
                        ) : (
                            config.server.instances.map((instance, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between rounded-lg border border-border bg-accent/20 px-4 py-3">
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-medium">{instance.name}</p>
                                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <FolderOpenIcon className="size-3" />
                                            {instance.path}
                                        </p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        className="text-destructive hover:bg-destructive/10"
                                        onClick={() => handleOpenDeleteDialog(index)}>
                                        <Trash2Icon className="size-4" />
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* 删除确认对话框 */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogMedia className="bg-destructive/10 text-destructive">
                            <Trash2Icon className="size-5" />
                        </AlertDialogMedia>
                        <AlertDialogTitle>删除服务器实例</AlertDialogTitle>
                        <AlertDialogDescription>
                            你确定要删除实例 <strong>{selectedInstance?.name}</strong> 吗？
                            <br />
                            此操作不可撤销。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
                            取消
                        </AlertDialogCancel>
                        <Button
                            variant="outline"
                            className="gap-1.5"
                            onClick={handleRemoveFromApp}>
                            <UnlinkIcon className="size-4" />
                            仅从应用移除
                        </Button>
                        <Button
                            variant="destructive"
                            className="gap-1.5"
                            onClick={handleDeleteFromDisk}>
                            <HardDriveIcon className="size-4" />
                            从磁盘删除文件
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

export { ServerInstanceSettings };

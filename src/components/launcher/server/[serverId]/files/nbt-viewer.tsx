import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronRightIcon, ChevronDownIcon, XIcon, AlertCircleIcon, SearchIcon, FileJsonIcon } from "lucide-react";
import { readNbt, type NbtNode, type NbtTree } from "@/lib/tauri/file";
import { toast } from "sonner";

interface NbtViewerProps {
    filePath: string;
    fileName: string;
    isOpen: boolean;
    onClose: () => void;
}

interface NbtNodeProps {
    node: NbtNode;
    depth: number;
    searchTerm: string;
}

function getNodeTypeColor(nodeType: string): string {
    switch (nodeType) {
        case "byte":
        case "short":
        case "int":
        case "long":
            return "text-blue-600 dark:text-blue-400";
        case "float":
        case "double":
            return "text-cyan-600 dark:text-cyan-400";
        case "string":
            return "text-green-600 dark:text-green-400";
        case "bytearray":
        case "intarray":
        case "longarray":
            return "text-purple-600 dark:text-purple-400";
        case "list":
            return "text-orange-600 dark:text-orange-400";
        case "compound":
            return "text-yellow-600 dark:text-yellow-400";
        default:
            return "text-muted-foreground";
    }
}

function getNodeTypeLabel(nodeType: string): string {
    switch (nodeType) {
        case "byte":
            return "byte";
        case "short":
            return "short";
        case "int":
            return "int";
        case "long":
            return "long";
        case "float":
            return "float";
        case "double":
            return "double";
        case "string":
            return "string";
        case "bytearray":
            return "byte[]";
        case "intarray":
            return "int[]";
        case "longarray":
            return "long[]";
        case "list":
            return "list";
        case "compound":
            return "compound";
        default:
            return nodeType;
    }
}

function NbtNodeComponent({ node, depth, searchTerm }: NbtNodeProps) {
    const [isExpanded, setIsExpanded] = useState(depth < 2);
    const hasChildren = node.children && node.children.length > 0;

    const matchesSearch = searchTerm
        ? node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (node.value && node.value.toLowerCase().includes(searchTerm.toLowerCase()))
        : false;

    const shouldHighlight = searchTerm && matchesSearch;

    return (
        <div className="select-none">
            <div
                className={cn(
                    "flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 hover:bg-accent/50",
                    shouldHighlight && "bg-yellow-100 dark:bg-yellow-900/30"
                )}
                style={{ paddingLeft: `${depth * 16 + 4}px` }}
                onClick={() => hasChildren && setIsExpanded(!isExpanded)}>
                {hasChildren ? (
                    isExpanded ? (
                        <ChevronDownIcon className="size-3.5 text-muted-foreground" />
                    ) : (
                        <ChevronRightIcon className="size-3.5 text-muted-foreground" />
                    )
                ) : (
                    <span className="size-3.5" />
                )}

                <span className="font-mono text-sm text-foreground">{node.name}</span>

                <span className={cn("ml-1 text-xs", getNodeTypeColor(node.node_type))}>{getNodeTypeLabel(node.node_type)}</span>

                {node.value && <span className="ml-2 max-w-75 truncate text-xs text-muted-foreground">= {node.value}</span>}
            </div>

            {hasChildren && isExpanded && (
                <div>
                    {node.children.map((child, index) => (
                        <NbtNodeComponent
                            key={`${child.name}-${index}`}
                            node={child}
                            depth={depth + 1}
                            searchTerm={searchTerm}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function NbtViewer({ filePath, fileName, isOpen, onClose }: NbtViewerProps) {
    const [nbtData, setNbtData] = useState<NbtTree | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [expandAll, setExpandAll] = useState(false);

    const loadFile = useCallback(async () => {
        if (!isOpen || !filePath) return;

        setIsLoading(true);
        setError(null);
        setSearchTerm("");

        try {
            const data = await readNbt(filePath);
            setNbtData(data);
        } catch (err) {
            setError(`无法读取 NBT 文件: ${err}`);
            toast.error(`读取 NBT 文件失败: ${err}`);
        } finally {
            setIsLoading(false);
        }
    }, [filePath, isOpen]);

    useEffect(() => {
        if (isOpen) {
            loadFile();
        }
    }, [isOpen, loadFile]);

    const handleExportJson = () => {
        if (!nbtData) return;

        const jsonStr = JSON.stringify(nbtData, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${fileName}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success("已导出为 JSON");
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="flex h-[85vh] w-[85vw] max-w-6xl! flex-col gap-0 p-0">
                <DialogHeader className="border-b px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <DialogTitle className="text-base">{fileName}</DialogTitle>
                            {nbtData && (
                                <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                    {nbtData.compression}
                                </span>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex items-center gap-2 border-b px-6 py-2">
                    <div className="relative flex-1">
                        <SearchIcon className="absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="搜索节点..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-8 pl-8"
                        />
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setExpandAll(!expandAll)}>
                        {expandAll ? "全部折叠" : "全部展开"}
                    </Button>
                </div>

                <div className="min-h-0 flex-1">
                    {isLoading ? (
                        <div className="flex h-full items-center justify-center text-muted-foreground">加载中...</div>
                    ) : error ? (
                        <div className="flex h-full flex-col items-center justify-center gap-2 text-destructive">
                            <AlertCircleIcon className="size-8" />
                            <p>{error}</p>
                        </div>
                    ) : nbtData ? (
                        <ScrollArea className="h-full">
                            <div className="p-2 font-mono text-sm">
                                <NbtNodeComponent node={nbtData.root} depth={0} searchTerm={searchTerm} />
                            </div>
                        </ScrollArea>
                    ) : null}
                </div>

                <DialogFooter className="gap-2 border-t px-6 py-4">
                    <Button variant="outline" onClick={handleExportJson} disabled={!nbtData}>
                        <FileJsonIcon className="mr-1 size-4" />
                        导出 JSON
                    </Button>
                    <Button variant="outline" onClick={onClose}>
                        <XIcon className="mr-1 size-4" />
                        关闭
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export { NbtViewer };


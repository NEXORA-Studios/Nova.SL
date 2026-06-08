import { useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    FolderOpenIcon,
    SearchIcon,
    ArrowLeftIcon,
    ServerIcon,
    FileCodeIcon,
    CoffeeIcon,
    PuzzleIcon,
    CheckCircleIcon,
} from "lucide-react";
import { toast } from "sonner";
import { pickServerDirectory, analyzeServerDirectory, importInstance, type ImportAnalysis } from "@/lib/tauri/server-import";

function ImportServerPage() {
    const navigate = useNavigate();
    const [selectedPath, setSelectedPath] = useState("");
    const [analyzing, setAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null);
    const [importing, setImporting] = useState(false);

    const handlePickDirectory = async () => {
        try {
            const path = await pickServerDirectory();
            if (path) {
                setSelectedPath(path);
                setAnalysis(null);
            }
        } catch (err) {
            toast.error(`选择文件夹失败: ${err}`);
        }
    };

    const handleAnalyze = async () => {
        if (!selectedPath) return;
        setAnalyzing(true);
        try {
            const result = await analyzeServerDirectory(selectedPath);
            setAnalysis(result);
        } catch (err) {
            toast.error(`分析失败: ${err}`);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleImport = async () => {
        if (!analysis) return;
        setImporting(true);
        const name = analysis.server_name || "Imported Server";
        try {
            const id = await importInstance(analysis.instance_path, name, analysis.loader, analysis.version ?? "");
            navigate(`/server/new/init/${id}`, {
                state: {
                    name,
                    loader: analysis.loader,
                    version: analysis.version ?? "",
                    build: undefined,
                    path: analysis.instance_path,
                },
            });
        } catch (err) {
            toast.error(`导入失败: ${err}`);
        } finally {
            setImporting(false);
        }
    };

    const loaderLabels: Record<string, string> = {
        vanilla: "Vanilla",
        forge: "Forge",
        fabric: "Fabric",
        quilt: "Quilt",
        neoforge: "NeoForge",
        paper: "Paper",
        spigot: "Spigot",
        bukkit: "Bukkit",
        purpur: "Purpur",
        folia: "Folia",
        bungee_cord: "BungeeCord",
        waterfall: "Waterfall",
        velocity: "Velocity",
        custom: "自定义",
    };

    return (
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon-sm" onClick={() => navigate(-1)}>
                    <ArrowLeftIcon className="size-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">导入已有服务器</h1>
                    <p className="text-sm text-muted-foreground">选择本地服务器目录，Nova.SL 将自动识别配置</p>
                </div>
            </div>

            {/* 步骤 1：选择目录 */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">步骤 1：选择服务器目录</CardTitle>
                    <CardDescription>选择包含服务器核心 jar 和启动脚本的文件夹</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Input value={selectedPath} readOnly placeholder="点击右侧按钮选择文件夹..." className="flex-1" />
                        <Button variant="outline" onClick={handlePickDirectory} disabled={analyzing}>
                            <FolderOpenIcon className="mr-1 size-4" />
                            浏览
                        </Button>
                    </div>

                    {selectedPath && (
                        <Button onClick={handleAnalyze} disabled={analyzing} className="w-full">
                            <SearchIcon className={"mr-1 size-4 " + (analyzing ? "animate-spin" : "")} />
                            {analyzing ? "正在分析..." : "分析服务器"}
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* 步骤 2：分析结果 */}
            {analysis && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base">步骤 2：识别结果</CardTitle>
                                <CardDescription>已自动识别服务器配置，请确认后导入</CardDescription>
                            </div>
                            <CheckCircleIcon className="size-5 text-primary" />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Separator />

                        {/* 识别信息 */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <ServerIcon className="size-3" />
                                    核心类型
                                </div>
                                <Badge variant="default">{loaderLabels[analysis.loader] ?? analysis.loader}</Badge>
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <PuzzleIcon className="size-3" />
                                    模组类型
                                </div>
                                <Badge variant="outline">{analysis.mod_type === "none" ? "无模组" : analysis.mod_type}</Badge>
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <FileCodeIcon className="size-3" />
                                    游戏版本
                                </div>
                                <p className="text-sm font-medium">{analysis.version ?? "未识别"}</p>
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <CoffeeIcon className="size-3" />
                                    Java
                                </div>
                                <p className="text-sm font-medium">
                                    {analysis.suggested_java ? "自动选择" : (analysis.detected_java ?? "未识别")}
                                </p>
                            </div>
                        </div>

                        {/* 启动脚本信息 */}
                        {analysis.launch_script && (
                            <>
                                <Separator />
                                <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground">启动脚本</p>
                                    <div className="space-y-1 rounded-lg bg-muted p-3">
                                        <p className="truncate font-mono text-xs">{analysis.launch_script.path}</p>
                                        {analysis.launch_script.server_jar && (
                                            <p className="text-xs text-muted-foreground">
                                                核心: {analysis.launch_script.server_jar}
                                            </p>
                                        )}
                                        {analysis.launch_script.java_args.length > 0 && (
                                            <p className="truncate text-xs text-muted-foreground">
                                                参数: {analysis.launch_script.java_args.join(" ")}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        <Button onClick={handleImport} disabled={importing || !analysis} className="w-full">
                            {importing ? "正在导入..." : "确认导入"}
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default ImportServerPage;

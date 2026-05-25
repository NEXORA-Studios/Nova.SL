import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router";
import {
    AlertCircleIcon,
    ArrowLeftIcon,
    CheckCircle2Icon,
    CpuIcon,
    FileCodeIcon,
    GlobeIcon,
    Loader2Icon,
    PlusIcon,
    ServerIcon,
    TagIcon,
    TerminalIcon,
    WifiIcon,
    XIcon,
    ZapIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useConfigStore } from "@/stores/config";
import { saveInstancePrelaunchConfig, getAvailableLaunchMethods, getRecommendedJvmArgs } from "@/lib/tauri/instance";
import { getCachedJavas } from "@/lib/tauri/java";
import type { JavaInstallation } from "@/models/tauri/java";

interface RouteState {
    name: string;
    loader: string;
    version: string;
    build?: string;
    path: string;
}

const LOADER_LABELS: Record<string, string> = {
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

const LAUNCH_METHOD_LABELS: Record<string, string> = {
    jar: "Java 直接启动 (server.jar)",
    bat: "批处理脚本 (.bat)",
    bash: "Shell 脚本 (.sh)",
};

function InitServerPage() {
    const { serverId } = useParams<{ serverId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const addInstance = useConfigStore((s) => s.addInstance);

    const stateData = location.state as RouteState | null;

    const [instanceMeta, setInstanceMeta] = useState<{
        name: string;
        version: string;
        loader: string;
        build?: string;
        path: string;
    } | null>(null);
    const [javas, setJavas] = useState<JavaInstallation[]>([]);
    const [availableMethods, setAvailableMethods] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [displayName, setDisplayName] = useState("");
    const [port, setPort] = useState(25565);
    const [minMemory, setMinMemory] = useState(1024);
    const [maxMemory, setMaxMemory] = useState(4096);
    const [launchMethod, setLaunchMethod] = useState("jar");
    const [javaTarget, setJavaTarget] = useState("auto");
    const [onlineMode, setOnlineMode] = useState(true);
    const [eula, setEula] = useState(true);
    const [recommendedArgs, setRecommendedArgs] = useState<string[]>([]);
    const [argsLoading, setArgsLoading] = useState(false);
    const [newArgInput, setNewArgInput] = useState("");

    const [saving, setSaving] = useState(false);

    const addArg = useCallback(() => {
        const trimmed = newArgInput.trim();
        if (!trimmed) return;
        setRecommendedArgs((prev) => [...prev, trimmed]);
        setNewArgInput("");
    }, [newArgInput]);

    const removeArg = useCallback((index: number) => {
        setRecommendedArgs((prev) => prev.filter((_, i) => i !== index));
    }, []);

    useEffect(() => {
        if (!serverId) return;

        if (!stateData || !stateData.path) {
            setError("缺少实例元数据，请从创建或导入页面进入");
            setLoading(false);
            return;
        }

        setInstanceMeta({
            name: stateData.name,
            version: stateData.version,
            loader: stateData.loader,
            build: stateData.build,
            path: stateData.path,
        });
        setDisplayName(stateData.name);

        Promise.all([getCachedJavas(), getAvailableLaunchMethods(stateData.path)])
            .then(([javaList, methods]) => {
                setJavas(javaList);
                setAvailableMethods(methods);
                if (methods.length > 0) {
                    setLaunchMethod(methods[0]);
                }
            })
            .catch((err) => {
                console.error("加载可选配置失败:", err);
            })
            .finally(() => {
                setLoading(false);
            });

        setArgsLoading(true);
        getRecommendedJvmArgs(stateData.loader, stateData.version, stateData.build)
            .then((args) => {
                setRecommendedArgs(args);
            })
            .catch((err) => {
                console.error("获取推荐 JVM 参数失败:", err);
            })
            .finally(() => {
                setArgsLoading(false);
            });
    }, [serverId, stateData]);

    const handleSave = useCallback(async () => {
        if (!instanceMeta || !serverId) return;

        setSaving(true);
        setError("");

        try {
            await saveInstancePrelaunchConfig(
                instanceMeta.path,
                serverId,
                displayName.trim(),
                instanceMeta.loader,
                instanceMeta.version,
                port,
                minMemory,
                maxMemory,
                launchMethod,
                javaTarget,
                onlineMode,
                eula,
                recommendedArgs
            );

            await addInstance(serverId, displayName.trim(), instanceMeta.path);

            navigate("/");
        } catch (err) {
            setError(`保存配置失败: ${err}`);
        } finally {
            setSaving(false);
        }
    }, [instanceMeta, serverId, displayName, port, minMemory, maxMemory, launchMethod, javaTarget, onlineMode, eula, recommendedArgs, addInstance, navigate]);

    const loaderLabel = instanceMeta ? (LOADER_LABELS[instanceMeta.loader] ?? instanceMeta.loader) : "";

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon-sm" onClick={() => navigate(-1)}>
                    <ArrowLeftIcon className="size-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">首次启动配置</h1>
                    <p className="text-sm text-muted-foreground">在第一次启动服务器之前，完成以下配置项</p>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircleIcon className="size-4 shrink-0" />
                    {error}
                </div>
            )}

            {instanceMeta && (
                <>
                    {/* 实例信息摘要 */}
                    <Card className="border-border/60">
                        <CardContent className="flex items-center gap-4">
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <ServerIcon className="size-5" />
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold">{displayName || instanceMeta.name}</h3>
                                    <Badge variant="default" className="text-xs">
                                        {loaderLabel}
                                    </Badge>
                                    <Badge variant="secondary" className="text-xs">
                                        {instanceMeta.version}
                                    </Badge>
                                </div>
                                <p className="truncate text-xs text-muted-foreground/60">{instanceMeta.path}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 配置表单 */}
                    <Card className="border-border/60">
                        <CardContent className="space-y-6">
                            {/* 基本信息 */}
                            <div className="space-y-4">
                                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                                    <TagIcon className="size-4" />
                                    基本信息
                                </h3>
                                <div className="ml-6 space-y-4">
                                    <div className="space-y-2">
                                        <Label>显示名称</Label>
                                        <Input
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            placeholder="实例显示名称"
                                            className="h-10"
                                        />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* 内存配置 */}
                            <div className="space-y-4">
                                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                                    <ZapIcon className="size-4" />
                                    端口和内存分配
                                </h3>
                                <div className="ml-6 grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>端口</Label>
                                        <Input
                                            type="number"
                                            min={1024}
                                            max={65535}
                                            value={port}
                                            onChange={(e) => setPort(Number(e.target.value) || 25565)}
                                            className="h-10"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            将自动写入 <code className="rounded bg-muted px-1">server.properties</code>
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>最小内存 (MB)</Label>
                                        <Input
                                            type="number"
                                            min={128}
                                            step={128}
                                            value={minMemory}
                                            onChange={(e) => setMinMemory(Number(e.target.value) || 1024)}
                                            className="h-10"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            允许实例使用的<strong>最小内存</strong>，默认为 <code className="rounded bg-muted px-1">1024</code> MB
                                            <br />
                                            此数值不宜设置过小，通常 1024 即可适配市面上大多数服务器
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>最大内存 (MB)</Label>
                                        <Input
                                            type="number"
                                            min={256}
                                            step={256}
                                            value={maxMemory}
                                            onChange={(e) => setMaxMemory(Number(e.target.value) || 4096)}
                                            className="h-10"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            允许实例使用的<strong>最大内存</strong>，默认为 <code className="rounded bg-muted px-1">4096</code> MB
                                            <br />
                                            此数值不宜设置过大，通常 8192 即可适配市面上大多数服务器
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* 启动方式 */}
                            <div className="space-y-4">
                                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                                    <CpuIcon className="size-4" />
                                    启动方式
                                </h3>
                                <div className="ml-6 space-y-4">
                                    <div className="space-y-2">
                                        <Label>启动方法</Label>
                                        <RadioGroup
                                            value={launchMethod}
                                            onValueChange={setLaunchMethod}
                                            className="flex flex-wrap gap-4">
                                            {availableMethods.map((method) => (
                                                <div key={method} className="flex items-center gap-2">
                                                    <RadioGroupItem value={method} id={`method-${method}`} />
                                                    <Label htmlFor={`method-${method}`} className="cursor-pointer">
                                                        {LAUNCH_METHOD_LABELS[method] ?? method}
                                                    </Label>
                                                </div>
                                            ))}
                                        </RadioGroup>
                                        {availableMethods.length === 0 && (
                                            <p className="text-xs text-destructive">未检测到可用启动方式</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Java 运行时</Label>
                                        <Select value={javaTarget} onValueChange={setJavaTarget}>
                                            <SelectTrigger className="h-10 w-full max-w-md">
                                                <SelectValue placeholder="选择 Java" />
                                            </SelectTrigger>
                                            <SelectContent position="popper">
                                                <SelectItem value="auto">
                                                    <div className="flex items-center gap-2">
                                                        <span>自动选择</span>
                                                        <span className="text-xs text-muted-foreground!">
                                                            根据服务器实例版本自动匹配
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                                {javas.map((java) => (
                                                    <SelectItem key={java.path} value={java.path}>
                                                        <div className="flex items-center gap-2">
                                                            <span>{java.path}</span>
                                                            <span className="text-xs text-muted-foreground!">
                                                                (Java {java.major_version} - {java.version})
                                                            </span>
                                                            {java.vendor && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="text-xs text-muted-foreground!">
                                                                    {java.vendor}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* JVM 参数 */}
                            <div className="space-y-4">
                                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                                    <TerminalIcon className="size-4" />
                                    JVM 参数
                                </h3>
                                <div className="ml-6 space-y-4">
                                    {argsLoading ? (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Loader2Icon className="size-3.5 animate-spin" />
                                            正在获取官方推荐参数...
                                        </div>
                                    ) : (
                                        <>
                                            {recommendedArgs.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {recommendedArgs.map((arg, i) => (
                                                        <Badge
                                                            key={i}
                                                            variant="outline"
                                                            className="group flex items-center gap-1 pl-2 pr-1.5 font-mono text-xs">
                                                            {arg}
                                                            <button
                                                                type="button"
                                                                onClick={() => removeArg(i)}
                                                                className="-mr-0.5 ml-0.5 rounded-sm p-0.5 opacity-50 transition-opacity hover:bg-muted hover:opacity-100">
                                                                <XIcon className="size-3" />
                                                            </button>
                                                        </Badge>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">
                                                    {instanceMeta?.loader
                                                        ? `此加载器（${LOADER_LABELS[instanceMeta.loader] ?? instanceMeta.loader}）暂无官方推荐 JVM 参数`
                                                        : "暂无官方推荐 JVM 参数"}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    value={newArgInput}
                                                    onChange={(e) => setNewArgInput(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            e.preventDefault();
                                                            addArg();
                                                        }
                                                    }}
                                                    placeholder="输入自定义 JVM 参数片段"
                                                    className="h-9 flex-1 font-mono text-xs"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={addArg}
                                                    disabled={!newArgInput.trim()}
                                                    className="h-9 shrink-0 gap-1">
                                                    <PlusIcon className="size-3.5" />
                                                    添加
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <Separator />

                            {/* 功能开关 */}
                            <div className="space-y-4">
                                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                                    <WifiIcon className="size-4" />
                                    功能开关
                                </h3>
                                <div className="ml-6 space-y-5">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="space-y-0.5">
                                            <Label className="flex items-center gap-1.5">
                                                <GlobeIcon className="size-4" />
                                                正版验证
                                            </Label>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                写入 <code className="rounded bg-muted px-1">server.properties</code>
                                                ，启用后只允许正版玩家加入
                                            </p>
                                        </div>
                                        <Switch checked={onlineMode} onCheckedChange={setOnlineMode} />
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        <div className="space-y-0.5">
                                            <Label className="flex items-center gap-1.5">
                                                <FileCodeIcon className="size-4" />
                                                自动接受 EULA
                                            </Label>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                勾选后将自动写入 <code className="rounded bg-muted px-1">eula.txt</code>，值为{" "}
                                                <code className="rounded bg-muted px-1">eula=true</code>
                                                ，勾选此项可避免服务器在第一次启动时要求同意 EULA 后才可继续启动
                                            </p>
                                        </div>
                                        <Switch checked={eula} onCheckedChange={setEula} />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 保存按钮 */}
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => navigate("/")}>
                            跳过
                        </Button>
                        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                            {saving ? (
                                <>
                                    <Loader2Icon className="size-4 animate-spin" />
                                    保存中...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2Icon className="size-4" />
                                    保存并完成
                                </>
                            )}
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}

export default InitServerPage;
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import {
    ArrowLeftIcon,
    Loader2Icon,
    PlusIcon,
    SaveIcon,
    ServerIcon,
    TagIcon,
    CpuIcon,
    ZapIcon,
    TerminalIcon,
    XIcon,
    Settings2Icon,
    FileJsonIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConfigStore } from "@/stores/config";
import {
    getInstanceConfig,
    updateInstanceConfig,
    getLaunchConfig,
    updateLaunchConfig,
    getAvailableLaunchMethods,
    getServerPropertiesKeys,
    readServerProperties,
    writeServerProperties,
} from "@/lib/tauri/instance";
import { getCachedJavas } from "@/lib/tauri/java";
import type { JavaInstallation } from "@/models/tauri/java";
import type { LaunchConfig, InstanceConfig } from "@/models/tauri/instance";
import { ConfigFileEditor } from "@/components/launcher/server/[serverId]/settings/config/config-file-editor";
import { generateDynamicConfigDefinition } from "@/lib/server-config/dynamic-properties";
import type { ConfigFileDefinition, ConfigFileContent } from "@/models/server-config/types";

const GC_OPTIONS = [
    { value: "none", label: "未指定（使用 Java 默认 GC）" },
    { value: "G1GC", label: "G1GC（通用推荐）" },
    { value: "ZGC", label: "ZGC（低延迟）" },
    { value: "ShenandoahGC", label: "ShenandoahGC（低暂停）" },
];

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

function SettingsPage() {
    const { serverId } = useParams<{ serverId: string }>();
    const navigate = useNavigate();
    const config = useConfigStore((s) => s.config);
    const configLoaded = useConfigStore((s) => s.loaded);
    const loadConfig = useConfigStore((s) => s.load);

    const instanceInfo = config?.server.instances.find((i) => i.id === serverId);
    const instancePath = instanceInfo?.path ?? "";

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState("instance");

    // Instance.toml
    const [displayName, setDisplayName] = useState("");
    const [instanceMeta, setInstanceMeta] = useState<{ id: string; version: string; loader: string } | null>(null);

    // Launch.toml
    const [launchMethod, setLaunchMethod] = useState("jar");
    const [serverJar, setServerJar] = useState("server.jar");
    const [javaTarget, setJavaTarget] = useState("auto");
    const [scriptPath, setScriptPath] = useState("");
    const [minMemory, setMinMemory] = useState(1024);
    const [maxMemory, setMaxMemory] = useState(4096);
    const [gc, setGc] = useState("none");
    const [extraArgs, setExtraArgs] = useState<string[]>([]);
    const [nogui, setNogui] = useState(true);
    const [newArgInput, setNewArgInput] = useState("");

    // server.properties
    const [serverProperties, setServerProperties] = useState<ConfigFileContent>({});
    const [dynamicConfigDef, setDynamicConfigDef] = useState<ConfigFileDefinition | null>(null);

    // Select options
    const [javas, setJavas] = useState<JavaInstallation[]>([]);
    const [availableMethods, setAvailableMethods] = useState<string[]>([]);

    const hasInstancePath = instancePath.length > 0;

    const addArg = useCallback(() => {
        const trimmed = newArgInput.trim();
        if (!trimmed) return;
        setExtraArgs((prev) => [...prev, trimmed]);
        setNewArgInput("");
    }, [newArgInput]);

    const removeArg = useCallback((index: number) => {
        setExtraArgs((prev) => prev.filter((_, i) => i !== index));
    }, []);

    // 加载配置
    useEffect(() => {
        if (!configLoaded) loadConfig();
    }, [configLoaded, loadConfig]);

    useEffect(() => {
        if (!serverId || !hasInstancePath) return;

        setLoading(true);

        Promise.all([
            getInstanceConfig(instancePath),
            getLaunchConfig(instancePath),
            getServerPropertiesKeys(instancePath),
            readServerProperties(instancePath),
            getCachedJavas(),
            getAvailableLaunchMethods(instancePath),
        ])
            .then(([instCfg, launchCfg, keys, props, javaList, methods]) => {
                setInstanceMeta({
                    id: instCfg.instance.id,
                    version: instCfg.instance.version,
                    loader: instCfg.instance.loader,
                });
                setDisplayName(instCfg.instance.name);

                setLaunchMethod(launchCfg.basic.launch_method);
                setServerJar(launchCfg.basic.server_jar);
                setJavaTarget(launchCfg.basic.java_target);
                setScriptPath(launchCfg.basic.script_path ?? "");

                const minMem = parseInt(launchCfg.jvm_args.min_memory) || 1024;
                const maxMem = parseInt(launchCfg.jvm_args.max_memory) || 4096;
                setMinMemory(minMem);
                setMaxMemory(maxMem);
                setGc(launchCfg.jvm_args.gc ?? "none");
                setExtraArgs(launchCfg.jvm_args.extra_args);
                setNogui(launchCfg.game_props.nogui);

                // 根据实际存在的 key 生成动态配置定义
                const dynamicDef = generateDynamicConfigDefinition(keys, props);
                setDynamicConfigDef(dynamicDef);

                // 将字符串值转换为正确类型
                const typedProps: ConfigFileContent = {};
                for (const category of dynamicDef.categories) {
                    for (const field of category.fields) {
                        const strValue = props[field.key];
                        if (strValue !== undefined) {
                            switch (field.type) {
                                case "boolean":
                                    typedProps[field.key] = strValue === "true";
                                    break;
                                case "number":
                                    typedProps[field.key] = Number(strValue) || (field.value as number);
                                    break;
                                default:
                                    typedProps[field.key] = strValue;
                            }
                        } else {
                            typedProps[field.key] = field.value;
                        }
                    }
                }
                setServerProperties(typedProps);

                setJavas(javaList);
                setAvailableMethods(methods);
            })
            .catch((err) => {
                toast.error(`加载配置失败: ${err}`);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [serverId, instancePath, hasInstancePath]);

    // 保存逻辑
    const handleSave = useCallback(async () => {
        if (!serverId || !instancePath) return;

        setSaving(true);

        try {
            // 1. 保存 Instance.toml（显示名称）
            if (instanceMeta) {
                const instCfg: InstanceConfig = {
                    instance: {
                        id: instanceMeta.id,
                        name: displayName.trim(),
                        version: instanceMeta.version,
                        loader: instanceMeta.loader,
                    },
                };
                await updateInstanceConfig(instancePath, instCfg);

                // 同步更新 config.json 中的实例名称，刷新侧栏
                await useConfigStore.getState().updateInstanceName(serverId, displayName.trim());
            }

            // 2. 保存 Launch.toml
            const launchCfg: LaunchConfig = {
                basic: {
                    launch_method: launchMethod,
                    server_jar: serverJar.trim() || "server.jar",
                    java_target: javaTarget,
                    script_path:
                        (launchMethod === "bat" || launchMethod === "bash") && scriptPath.trim()
                            ? scriptPath.trim()
                            : undefined,
                },
                jvm_args: {
                    min_memory: `${minMemory}M`,
                    max_memory: `${maxMemory}M`,
                    gc: gc === "none" ? undefined : gc,
                    extra_args: extraArgs,
                },
                game_props: {
                    nogui,
                },
            };
            await updateLaunchConfig(instancePath, launchCfg);

            // 3. 保存 server.properties
            await writeServerProperties(instancePath, serverProperties);

            toast.success("配置已保存");
        } catch (err) {
            toast.error(`保存失败: ${err}`);
        } finally {
            setSaving(false);
        }
    }, [
        serverId,
        instancePath,
        instanceMeta,
        displayName,
        launchMethod,
        serverJar,
        javaTarget,
        scriptPath,
        minMemory,
        maxMemory,
        gc,
        extraArgs,
        nogui,
        serverProperties,
    ]);

    // Ctrl+S 快捷键
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
                e.preventDefault();
                if (!saving && !loading) {
                    handleSave();
                }
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [handleSave, saving, loading]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!hasInstancePath) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
                <p className="text-sm">无法找到实例信息，请确保已保存配置</p>
                <Button variant="outline" onClick={() => navigate("/")}>
                    返回主页
                </Button>
            </div>
        );
    }

    const loaderLabel = instanceMeta ? (LOADER_LABELS[instanceMeta.loader] ?? instanceMeta.loader) : "";

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon-sm" onClick={() => navigate(-1)}>
                    <ArrowLeftIcon className="size-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">实例设置</h1>
                    <p className="text-sm text-muted-foreground">配置服务器实例的启动参数和运行选项</p>
                </div>
            </div>

            {/* 实例信息摘要 */}
            <Card className="border-border/60">
                <CardContent className="flex items-center gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <ServerIcon className="size-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{displayName || instanceInfo?.name}</h3>
                            {loaderLabel && (
                                <Badge variant="default" className="text-xs">
                                    {loaderLabel}
                                </Badge>
                            )}
                            {instanceMeta?.version && (
                                <Badge variant="secondary" className="text-xs">
                                    {instanceMeta.version}
                                </Badge>
                            )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground/60">{instancePath}</p>
                    </div>
                </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="instance" className="gap-1.5">
                        <Settings2Icon className="size-4" />
                        实例与启动
                    </TabsTrigger>
                    <TabsTrigger value="server" className="gap-1.5">
                        <FileJsonIcon className="size-4" />
                        server.properties
                    </TabsTrigger>
                </TabsList>

                {/* 实例与启动配置 */}
                <TabsContent value="instance" className="mt-6 space-y-6">
                    {/* 基本信息 */}
                    <Card className="border-border/60">
                        <CardContent className="space-y-4">
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
                                        className="h-10 max-w-md"
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">实例 ID</Label>
                                        <p className="truncate rounded bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground">
                                            {instanceMeta?.id ?? "-"}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">加载器</Label>
                                        <p className="rounded bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                                            {loaderLabel || "-"}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">游戏版本</Label>
                                        <p className="rounded bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                                            {instanceMeta?.version ?? "-"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 启动方式 */}
                    <Card className="border-border/60">
                        <CardContent className="space-y-4">
                            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                                <CpuIcon className="size-4" />
                                启动配置
                            </h3>
                            <div className="ml-6 space-y-4">
                                <div className="space-y-2">
                                    <Label>启动方法</Label>
                                    <RadioGroup
                                        value={launchMethod}
                                        onValueChange={setLaunchMethod}
                                        className="flex flex-wrap gap-4">
                                        {availableMethods.length > 0 ? (
                                            availableMethods.map((method) => (
                                                <div key={method} className="flex items-center gap-2">
                                                    <RadioGroupItem value={method} id={`method-${method}`} />
                                                    <Label htmlFor={`method-${method}`} className="cursor-pointer">
                                                        {method === "jar"
                                                            ? "Java 直接启动 (server.jar)"
                                                            : method === "bat"
                                                              ? "批处理脚本 (.bat)"
                                                              : method === "bash"
                                                                ? "Shell 脚本 (.sh)"
                                                                : method}
                                                    </Label>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-destructive">未检测到可用启动方式</p>
                                        )}
                                    </RadioGroup>
                                </div>

                                <div className="space-y-2">
                                    <Label>服务器核心文件</Label>
                                    <Input
                                        value={serverJar}
                                        onChange={(e) => setServerJar(e.target.value)}
                                        placeholder="server.jar"
                                        className="h-10 max-w-md font-mono text-xs"
                                    />
                                    <p className="text-xs text-muted-foreground">Jar 启动模式下使用的服务器核心文件名</p>
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
                                                        <span className="font-mono text-xs">{java.path}</span>
                                                        <span className="text-xs text-muted-foreground!">
                                                            (Java {java.major_version})
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {(launchMethod === "bat" || launchMethod === "bash") && (
                                    <div className="space-y-2">
                                        <Label>启动脚本路径</Label>
                                        <Input
                                            value={scriptPath}
                                            onChange={(e) => setScriptPath(e.target.value)}
                                            placeholder="start.bat"
                                            className="h-10 max-w-md font-mono text-xs"
                                        />
                                        <p className="text-xs text-muted-foreground">相对于实例目录的脚本路径</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* 内存和 JVM 参数 */}
                    <Card className="border-border/60">
                        <CardContent className="space-y-4">
                            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                                <ZapIcon className="size-4" />
                                内存与 JVM 参数
                            </h3>
                            <div className="ml-6 space-y-4">
                                <div className="grid grid-cols-3 gap-4">
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
                                    </div>
                                    <div className="space-y-2">
                                        <Label>垃圾回收器</Label>
                                        <Select value={gc} onValueChange={setGc}>
                                            <SelectTrigger className="h-10! w-full">
                                                <SelectValue placeholder="选择 GC" />
                                            </SelectTrigger>
                                            <SelectContent position="popper">
                                                {GC_OPTIONS.map((opt) => (
                                                    <SelectItem key={opt.value} value={opt.value}>
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>自定义 JVM 参数</Label>
                                    {extraArgs.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {extraArgs.map((arg, i) => (
                                                <Badge
                                                    key={i}
                                                    variant="outline"
                                                    className="group flex items-center gap-1 pr-1.5 pl-2 font-mono text-xs">
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
                                        <p className="text-sm text-muted-foreground">暂无自定义 JVM 参数</p>
                                    )}
                                    <div className="flex w-full items-center gap-2">
                                        <Input
                                            value={newArgInput}
                                            onChange={(e) => setNewArgInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    addArg();
                                                }
                                            }}
                                            placeholder="输入 JVM 参数片段"
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
                                </div>

                                <Separator />

                                <div className="flex items-center justify-between gap-4">
                                    <div className="space-y-0.5">
                                        <Label className="flex items-center gap-1.5">
                                            <TerminalIcon className="size-4" />
                                            禁用 GUI 窗口
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            添加 <code className="rounded bg-muted px-1">nogui</code> 参数到末尾，禁止 Minecraft
                                            服务器打开额外的图形窗口
                                        </p>
                                    </div>
                                    <Switch checked={nogui} onCheckedChange={setNogui} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* server.properties 配置 */}
                <TabsContent value="server" className="mt-6">
                    {dynamicConfigDef ? (
                        <ConfigFileEditor
                            definition={dynamicConfigDef}
                            content={serverProperties}
                            onChange={setServerProperties}
                        />
                    ) : (
                        <Card className="border-border/60">
                            <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
                                <p className="text-sm">未找到 server.properties 文件</p>
                                <p className="text-xs">请先启动一次服务器以生成配置文件</p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>

            {/* 保存按钮 */}
            <div className="flex items-center justify-end gap-3">
                <Button variant="outline" onClick={() => navigate(-1)}>
                    取消
                </Button>
                <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                    {saving ? (
                        <>
                            <Loader2Icon className="size-4 animate-spin" />
                            保存中...
                        </>
                    ) : (
                        <>
                            <SaveIcon className="size-4" />
                            保存所有设置
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}

export default SettingsPage;

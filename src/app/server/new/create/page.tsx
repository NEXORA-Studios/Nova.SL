import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Combobox,
    ComboboxInput,
    ComboboxContent,
    ComboboxList,
    ComboboxItem,
    ComboboxEmpty,
    ComboboxGroup,
    ComboboxLabel,
    ComboboxCollection,
    ComboboxSeparator,
} from "@/components/ui/combobox";
import {
    FolderOpenIcon,
    ArrowLeftIcon,
    ServerIcon,
    DownloadIcon,
    AlertCircleIcon,
    Loader2Icon,
    ArrowUpDownIcon,
    PackageIcon,
    CpuIcon,
    SortAscIcon,
    SortDescIcon,
} from "lucide-react";
import { getDownloadableLoaders, getLoaderVersions, getLoaderBuilds, createServerInstance } from "@/lib/tauri/server-create";
import { BuildInfo, VersionGroup, VersionInfo } from "@/models/tauri/server/create";
import { pickServerDirectory } from "@/lib/tauri/server-import";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { default as LoaderIcons } from "@/assets/loader.json";
import { sortVersionGroupsForCombobox } from "@/lib/mc-version";

interface LoaderOption {
    id: string;
    name: string;
}

type SortOrder = "desc" | "asc";

// 核心类型到图标/颜色的映射（用于截图中的圆形图标）
const LOADER_META: Record<string, string> = {};
LoaderIcons.forEach((item) => {
    LOADER_META[item.name] = item.icon;
});

function CreateServerPage() {
    const navigate = useNavigate();

    const [loaders, setLoaders] = useState<LoaderOption[]>([]);
    const [selectedLoader, setSelectedLoader] = useState<string>("");

    const [versionGroups, setVersionGroups] = useState<VersionGroup[]>([]);
    const [selectedVersion, setSelectedVersion] = useState<VersionInfo | undefined>();
    const [versionSortOrder, setVersionSortOrder] = useState<SortOrder>("desc");
    const [loadingVersions, setLoadingVersions] = useState(false);

    const [builds, setBuilds] = useState<BuildInfo[]>([]);
    const [selectedBuild, setSelectedBuild] = useState<BuildInfo | undefined>();
    const [buildSortOrder, setBuildSortOrder] = useState<SortOrder>("desc");
    const [loadingBuilds, setLoadingBuilds] = useState(false);

    const [instancePath, setInstancePath] = useState<string>("");
    const [creating, setCreating] = useState(false);

    const [error, setError] = useState("");

    const sortedVersionGroups = useMemo(() => {
        return sortVersionGroupsForCombobox(versionGroups, versionSortOrder);
    }, [versionGroups, versionSortOrder]);

    const sortedBuilds = useMemo(() => {
        return [...builds].sort((a, b) => {
            const cmp = a.id.localeCompare(b.id, undefined, { numeric: true });
            return buildSortOrder === "desc" ? -cmp : cmp;
        });
    }, [builds, buildSortOrder]);

    // 加载 Loader 列表
    useEffect(() => {
        getDownloadableLoaders()
            .then((data) => {
                setLoaders(data.map(([id, name]) => ({ id, name })));
            })
            .catch((err) => setError(`加载 Loader 列表失败: ${err}`));
    }, []);

    // 选择 Loader 后加载版本
    const handleSelectLoader = useCallback(async (loaderId: string) => {
        setSelectedLoader(loaderId);
        setSelectedVersion(undefined);
        setSelectedBuild(undefined);
        setVersionGroups([]);
        setBuilds([]);
        setError("");
        setLoadingVersions(true);

        try {
            const data = await getLoaderVersions(loaderId);
            setVersionGroups(data);
        } catch (err) {
            setError(`加载版本列表失败: ${err}`);
        } finally {
            setLoadingVersions(false);
        }
    }, []);

    // 选择版本后加载构建（如果需要）
    const handleSelectVersion = useCallback(
        async (version: VersionInfo | undefined) => {
            if (!version) {
                setSelectedBuild(undefined);
                setBuilds([]);
                setError("");
                return;
            }

            setSelectedVersion(version);
            setSelectedBuild(undefined);
            setBuilds([]);
            setError("");

            const needsBuild = ["paper", "purpur"].includes(selectedLoader);

            if (needsBuild) {
                setLoadingBuilds(true);
                try {
                    const data = await getLoaderBuilds(selectedLoader, version.id);
                    setBuilds(data);
                    // 找到最新的构建并设置为选中
                    const latestBuild = data.sort((a, b) => {
                        const cmp = a.id.localeCompare(b.id, undefined, { numeric: true });
                        return buildSortOrder === "desc" ? -cmp : cmp;
                    })[0];
                    setSelectedBuild(latestBuild);
                } catch (err) {
                    setError(`加载构建列表失败: ${err}`);
                } finally {
                    setLoadingBuilds(false);
                }
            }
        },
        [selectedLoader]
    );

    // 选择目录
    const handlePickDirectory = useCallback(async () => {
        try {
            const path = await pickServerDirectory();
            if (path) {
                setInstancePath(path);
                setError("");
            }
        } catch (err) {
            setError(`选择目录失败: ${err}`);
        }
    }, []);

    // 确认创建
    const handleCreate = useCallback(async () => {
        if (!instancePath || !selectedLoader || !selectedVersion) {
            setError("请填写完整信息");
            return;
        }

        setCreating(true);
        setError("");

        const folderName = instancePath.split(/[\\/]/).pop() || "Server";

        try {
            const id = await createServerInstance(
                instancePath,
                folderName,
                selectedLoader,
                selectedVersion.id,
                selectedBuild?.id || undefined
            );

            navigate(`/server/new/init/${id}`, {
                state: {
                    name: folderName,
                    loader: selectedLoader,
                    version: selectedVersion.id,
                    build: selectedBuild?.id || undefined,
                    path: instancePath,
                },
            });
        } catch (err) {
            setError(`创建服务器失败: ${err}`);
        } finally {
            setCreating(false);
        }
    }, [instancePath, selectedLoader, selectedVersion, selectedBuild, navigate]);

    const needsBuild = ["paper", "purpur"].includes(selectedLoader);
    const selectedLoaderInfo = loaders.find((l) => l.id === selectedLoader);
    const SelectedLogo = selectedLoader ? LOADER_META[selectedLoader] : null;

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon-sm" onClick={() => navigate(-1)}>
                    <ArrowLeftIcon className="size-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">创建服务器</h1>
                    <p className="text-sm text-muted-foreground">若你已有文件，可从其他入口进入同一套创建向导。</p>
                </div>
            </div>

            {/* 错误提示 */}
            {error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircleIcon className="size-4 shrink-0" />
                    {error.replace("Plugin error:", "")}
                </div>
            )}

            {/* 主卡片：步骤 1-3 */}
            <Card className="border-border/60">
                <CardContent className="space-y-6">
                    {/* Step 1: 选择核心与游戏版本 */}
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                                <span className="-translate-x-px">1</span>
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-medium">选择核心与游戏版本</h3>
                                <p className="text-xs text-muted-foreground">
                                    从镜像列表中选择要下载的服务端类型与对应 MC 版本。
                                </p>
                            </div>
                        </div>

                        {/* 镜像源 */}
                        <div className="ml-10 space-y-2">
                            <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                                <ServerIcon className="size-3" />
                                下载源
                            </Label>
                            <div className="flex items-center gap-2">
                                <RadioGroup className="flex w-full gap-8" value="official">
                                    <div className="flex cursor-pointer items-center gap-3">
                                        <RadioGroupItem value="official" id="official-radio" />
                                        <Label htmlFor="official-radio">官方</Label>
                                    </div>
                                    <div className="flex cursor-pointer items-center gap-3">
                                        <RadioGroupItem value="backup" id="backup-radio" disabled />
                                        <Label htmlFor="backup-radio">备用镜像</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>

                        {/* 核心类型 + 游戏版本 */}
                        <div className="ml-10 grid grid-cols-[1fr_1fr_auto] items-end gap-3">
                            {/* 核心类型 */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <CpuIcon className="size-3" />
                                    核心类型
                                </Label>
                                <Select onValueChange={handleSelectLoader} value={selectedLoader}>
                                    <SelectTrigger className="h-10! w-full">
                                        <SelectValue placeholder="选择核心...">
                                            {selectedLoaderInfo && SelectedLogo && (
                                                <div className="flex items-center gap-2">
                                                    <i dangerouslySetInnerHTML={{ __html: SelectedLogo }}></i>
                                                    <span>{selectedLoaderInfo.name}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        ({sortedVersionGroups.reduce((acc, g) => acc + g.items.length, 0)}
                                                        个版本)
                                                    </span>
                                                </div>
                                            )}
                                        </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent position="popper">
                                        {loaders.map((loader) => {
                                            const Logo = LOADER_META[loader.id] ?? <></>;
                                            return (
                                                <SelectItem key={loader.id} value={loader.id}>
                                                    <div className="flex items-center gap-2">
                                                        <i dangerouslySetInnerHTML={{ __html: Logo }}></i>
                                                        <span>{loader.name}</span>
                                                    </div>
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* 游戏版本 */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <ArrowUpDownIcon className="size-3" />
                                        游戏版本
                                    </Label>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() =>
                                                    setVersionSortOrder(versionSortOrder === "desc" ? "asc" : "desc")
                                                }
                                                disabled={!selectedLoader || loadingVersions}
                                                className="h-6 w-6">
                                                {versionSortOrder === "desc" ? (
                                                    <SortDescIcon className="size-3.5" />
                                                ) : (
                                                    <SortAscIcon className="size-3.5" />
                                                )}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {versionSortOrder === "desc" ? "当前：最新优先" : "当前：最旧优先"}（点击切换）
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                {loadingVersions ? (
                                    <div className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm text-muted-foreground">
                                        <Loader2Icon className="size-4 animate-spin" />
                                        加载中...
                                    </div>
                                ) : (
                                    <Combobox
                                        items={sortedVersionGroups}
                                        itemToStringValue={(item) => item.id}
                                        itemToStringLabel={(item) => item.display_name || item.id}
                                        value={selectedVersion}
                                        onValueChange={(v) => handleSelectVersion(v || undefined)}>
                                        <ComboboxInput
                                            className="mb-0! h-10! w-full"
                                            disabled={!selectedLoader}
                                            placeholder={selectedLoader ? "选择版本 (可直接输入)" : "请先选择核心"}
                                        />
                                        <ComboboxContent>
                                            <ComboboxEmpty>没有找到可用版本</ComboboxEmpty>
                                            <ComboboxList>
                                                {(group, index) => (
                                                    <ComboboxGroup key={group.value} items={group.items}>
                                                        <ComboboxLabel>{group.display_name || group.value}</ComboboxLabel>
                                                        <ComboboxCollection>
                                                            {(item: VersionInfo) => (
                                                                <ComboboxItem key={item.id} value={item}>
                                                                    {item.display_name || item.id}
                                                                </ComboboxItem>
                                                            )}
                                                        </ComboboxCollection>
                                                        {index < sortedVersionGroups.length - 1 && <ComboboxSeparator />}
                                                    </ComboboxGroup>
                                                )}
                                            </ComboboxList>
                                        </ComboboxContent>
                                    </Combobox>
                                )}
                            </div>
                        </div>

                        {/* 构建选择（Paper/Purpur 需要） */}
                        {needsBuild && selectedVersion && (
                            <div className="ml-10 space-y-2 pr-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs text-muted-foreground">构建版本</Label>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => setBuildSortOrder(buildSortOrder === "desc" ? "asc" : "desc")}
                                                disabled={loadingBuilds}
                                                className="h-6 w-6">
                                                {buildSortOrder === "desc" ? (
                                                    <SortDescIcon className="size-3.5" />
                                                ) : (
                                                    <SortAscIcon className="size-3.5" />
                                                )}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            {buildSortOrder === "desc" ? "当前：最新优先" : "当前：最旧优先"}（点击切换）
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                                {loadingBuilds ? (
                                    <div className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm text-muted-foreground">
                                        <Loader2Icon className="size-4 animate-spin" />
                                        加载构建中...
                                    </div>
                                ) : (
                                    <Combobox<BuildInfo>
                                        items={sortedBuilds}
                                        itemToStringValue={(item) => item.id}
                                        itemToStringLabel={(item) => item.display_name || item.id}
                                        value={selectedBuild}
                                        onValueChange={(b) => setSelectedBuild(b || undefined)}>
                                        <ComboboxInput className="mb-0! h-10! w-full" placeholder="选择构建 (可直接输入)" />
                                        <ComboboxContent>
                                            <ComboboxEmpty>没有找到可用构建</ComboboxEmpty>
                                            <ComboboxList>
                                                {(item) => (
                                                    <ComboboxItem key={item.id} value={item}>
                                                        {item.display_name || item.id}
                                                    </ComboboxItem>
                                                )}
                                            </ComboboxList>
                                        </ComboboxContent>
                                    </Combobox>
                                )}
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* Step 2: 选择服务器安装目录 */}
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                                2
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-medium">选择服务器安装目录</h3>
                                <p className="text-xs text-muted-foreground">
                                    下载会把核心文件（例如 <code className="rounded bg-muted px-1 text-xs">server.jar</code>
                                    ）保存到该目录，并在此目录下自动创建服务器实例。
                                </p>
                            </div>
                        </div>

                        <div className="ml-10 space-y-2">
                            <Label className="flex items-center gap-1 text-xs text-muted-foreground">
                                <FolderOpenIcon className="size-3" />
                                安装目录
                            </Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    value={instancePath}
                                    readOnly
                                    placeholder="点击选择本机文件夹..."
                                    className="h-10 flex-1"
                                />
                                <Button variant="outline" onClick={handlePickDirectory} className="h-10">
                                    <FolderOpenIcon className="mr-1 size-4" />
                                    浏览
                                </Button>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Step 3: 下载并开始创建 */}
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                                3
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-medium">下载并开始创建</h3>
                                <p className="text-xs text-muted-foreground">确认无误后下载；完成后会自动进入创建向导。</p>
                            </div>
                        </div>

                        <div className="ml-10 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">server.jar</code>
                                {selectedLoader && selectedVersion && (
                                    <>
                                        <span>·</span>
                                        <Badge variant="default" className="text-xs">
                                            核心: {selectedLoaderInfo?.name}
                                        </Badge>
                                        <Badge variant="secondary" className="text-xs">
                                            版本: {selectedVersion.display_name || selectedVersion.id}
                                        </Badge>
                                        {selectedBuild && (
                                            <Badge variant="outline" className="text-xs">
                                                构建: {selectedBuild.display_name || selectedBuild.id}
                                            </Badge>
                                        )}
                                    </>
                                )}
                            </div>
                            <Button
                                onClick={handleCreate}
                                disabled={creating || !instancePath || !selectedLoader || !selectedVersion}
                                className="gap-1.5">
                                {creating ? (
                                    <>
                                        <Loader2Icon className="size-4 animate-spin" />
                                        下载中...
                                    </>
                                ) : (
                                    <>
                                        <DownloadIcon className="size-4" />
                                        开始下载
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 模板市场 */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <PackageIcon className="size-4" />
                        <h2 className="text-base font-semibold">模板市场</h2>
                    </div>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                className="pointer-events-auto! cursor-not-allowed active:translate-0!"
                                size="sm"
                                disabled>
                                提交模板
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">尚未开放</TooltipContent>
                    </Tooltip>
                </div>
                <p className="text-xs text-muted-foreground">从社区模板快速起步（与上方向导独立，选中后可按模板说明部署）</p>
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                        <PackageIcon className="mb-3 size-8 text-muted-foreground/50" />
                        <h3 className="text-sm font-medium text-muted-foreground">暂时没有可用模板</h3>
                        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                            列表可能仍在准备中，或暂时无法连接模板源。可稍后再来查看。
                            <br />
                            也欢迎通过右上角「提交模板」参与社区建设。
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default CreateServerPage;


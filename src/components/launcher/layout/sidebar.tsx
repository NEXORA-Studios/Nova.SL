import { ReactNode, useEffect, useState } from "react";
import {
    CableIcon,
    FolderIcon,
    HomeIcon,
    InfoIcon,
    PlusIcon,
    PuzzleIcon,
    ServerIcon,
    SettingsIcon,
    TerminalIcon,
    ZapIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { IsCurrentPathOptions, useIsCurrentPath } from "@/hooks/use-is-current-path";
import { cn } from "@/utils/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocation, useNavigate } from "react-router";
import { useConfigStore } from "@/stores/config";
import { isModServer, isPluginServer } from "@/lib/server-type";

interface SidebarGroupProps {
    title?: string;
    children: ReactNode;
    noSeperator?: boolean;
    className?: string;
}

function SidebarGroup({ title, children, noSeperator, className }: SidebarGroupProps) {
    return (
        <>
            <div className={cn("flex flex-col gap-2", className)}>
                {title && <span className="text-sidebar-text text-xs font-medium opacity-75">{title}</span>}
                {children}
            </div>
            {!noSeperator && <Separator className="my-4" />}
        </>
    );
}

interface SidebarProps {
    className?: string;
}

function Sidebar({ className }: SidebarProps) {
    // hooks
    const navigate = useNavigate();
    const location = useLocation();

    // zustand store
    const config = useConfigStore((s) => s.config);
    const loaded = useConfigStore((s) => s.loaded);
    const load = useConfigStore((s) => s.load);

    // local state
    const [currentServer, setCurrentServer] = useState("");

    useEffect(() => {
        if (!loaded) load();
    }, [loaded, load]);

    useEffect(() => {
        if (config && config.server.instances.length > 0 && !currentServer) {
            setCurrentServer(config.server.instances[0].id);
        }
    }, [config, currentServer]);

    // handlers
    const handleServerChange = (server: string) => {
        setCurrentServer(server);
        const currentLocation = location.pathname;
        if (currentLocation.startsWith("/server/instance/")) {
            navigate(`/server/instance/${server}/${currentLocation.split("/").slice(3).join("/") || ""}`);
        }
    };

    // utils
    const _isCurrentButton = (options: string | IsCurrentPathOptions) => {
        if (typeof options === "string") {
            options = { path: options };
        }
        return useIsCurrentPath()(options) ? "outline" : "ghost";
    };

    const servers = config?.server.instances ?? [];
    const hasServers = servers.length > 0;

    // 获取当前服务器的 loader 信息
    const currentServerInfo = servers.find((s) => s.id === currentServer);
    const currentLoader = currentServerInfo?.loader;
    const showModButton = isModServer(currentLoader);
    const showPluginButton = isPluginServer(currentLoader);
    // TODO: MCDR 检测需要从后端获取实例配置
    const showMcdrButton = false;

    return (
        <aside
            className={cn(
                "sticky top-0 flex h-screen w-[15%] shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4",
                className
            )}>
            <SidebarGroup>
                <Button size="lg" className="justify-start" variant={_isCurrentButton("/")} onClick={() => navigate("/")}>
                    <HomeIcon className="mr-2" size={24} />
                    仪表盘
                </Button>
            </SidebarGroup>
            <SidebarGroup title="服务器">
                <Select value={currentServer} onValueChange={handleServerChange} disabled={!hasServers}>
                    <SelectTrigger className="w-full text-foreground!" data-slot="select-trigger">
                        <ServerIcon className="mr-2" size={24} />
                        <SelectValue className="truncate" placeholder={loaded && !hasServers ? "暂无服务器" : "服务器"} />
                    </SelectTrigger>
                    <SelectContent position="popper">
                        {servers.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                                {s.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button
                    size="lg"
                    className="justify-start"
                    variant={_isCurrentButton({ path: "/server/instance/*/terminal", mode: "wildcard" })}
                    disabled={!hasServers}
                    onClick={() => navigate(`/server/instance/${currentServer}/terminal`)}>
                    <TerminalIcon className="mr-2" size={24} />
                    终端
                </Button>
                <Button
                    size="lg"
                    className="justify-start"
                    variant={_isCurrentButton({ path: "/server/instance/*/files**", mode: "wildcard" })}
                    disabled={!hasServers}
                    onClick={() => navigate(`/server/instance/${currentServer}/files`)}>
                    <FolderIcon className="mr-2" size={24} />
                    文件管理
                </Button>
                {showModButton && (
                    <Button
                        size="lg"
                        className="justify-start"
                        variant={_isCurrentButton({ path: "/resource/mods", mode: "wildcard" })}
                        disabled={!hasServers}
                        onClick={() => navigate(`/resource/mods`)}>
                        <PuzzleIcon className="mr-2" size={24} />
                        模组
                    </Button>
                )}
                {showPluginButton && (
                    <Button
                        size="lg"
                        className="justify-start"
                        variant={_isCurrentButton({ path: "/resource/plugins", mode: "wildcard" })}
                        disabled={!hasServers}
                        onClick={() => navigate(`/resource/plugins`)}>
                        <CableIcon className="mr-2" size={24} />
                        插件
                    </Button>
                )}
                {showMcdrButton && (
                    <Button
                        size="lg"
                        className="justify-start"
                        variant={_isCurrentButton({ path: "/resource/mcdr-plugins", mode: "wildcard" })}
                        disabled={!hasServers}
                        onClick={() => navigate(`/resource/mcdr-plugins`)}>
                        <ZapIcon className="mr-2" size={24} />
                        MCDR 扩展
                    </Button>
                )}
                <div className="flex w-full items-center gap-2">
                    <Button
                        size="lg"
                        className="flex-1 justify-start"
                        variant={_isCurrentButton({ path: "/server/instance/*/settings", mode: "wildcard" })}
                        disabled={!hasServers}
                        onClick={() => navigate(`/server/instance/${currentServer}/settings`)}>
                        <SettingsIcon className="mr-2" size={24} />
                        设置
                    </Button>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="icon-lg"
                                variant={hasServers ? "outline" : "default"}
                                onClick={() => navigate("/server/new")}>
                                <PlusIcon className="size-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">添加服务器</TooltipContent>
                    </Tooltip>
                </div>
            </SidebarGroup>
            <SidebarGroup title="资源">
                <Button
                    size="lg"
                    className="justify-start"
                    variant={_isCurrentButton("/download/mods")}
                    onClick={() => navigate("/download/mods")}>
                    <PuzzleIcon className="mr-2" size={24} />
                    模组
                </Button>
                <Button
                    size="lg"
                    className="justify-start"
                    variant={_isCurrentButton("/download/plugins")}
                    onClick={() => navigate("/download/plugins")}>
                    <CableIcon className="mr-2" size={24} />
                    插件
                </Button>
                <Button
                    size="lg"
                    className="justify-start"
                    variant={_isCurrentButton("/download/mcdr-plugins")}
                    onClick={() => navigate("/download/mcdr-plugins")}>
                    <ZapIcon className="mr-2" size={24} />
                    MCDR 插件
                </Button>
            </SidebarGroup>
            <SidebarGroup title="启动器" noSeperator>
                <Button
                    size="lg"
                    className="justify-start"
                    variant={_isCurrentButton("/app/settings")}
                    onClick={() => navigate("/app/settings")}>
                    <SettingsIcon className="mr-2" size={24} />
                    设置
                </Button>
                <Button
                    size="lg"
                    className="justify-start"
                    variant={_isCurrentButton("/app/info")}
                    onClick={() => navigate("/app/info")}>
                    <InfoIcon className="mr-2" size={24} />
                    关于
                </Button>
            </SidebarGroup>

            <Separator className="mt-auto mb-4" />
            <SidebarGroup noSeperator>
                <div className="flex flex-col">
                    <span className="text-xs font-medium opacity-75">Nova.SL 0.1.0</span>
                    <span className="text-xs font-black text-destructive">Internal (Canary) Build</span>
                </div>
            </SidebarGroup>
        </aside>
    );
}

export { Sidebar };

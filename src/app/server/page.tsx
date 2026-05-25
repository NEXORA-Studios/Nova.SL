import { Link } from "react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCpuInfo, type CpuInfo } from "@/lib/tauri";
import { useConfigStore } from "@/stores/config";
import { useServerStore, type ServerInstance, type ServerStatus } from "@/stores/server";
import { ServerIcon, CpuIcon, HardDriveIcon, UsersIcon, PlayIcon, CircleIcon, ArrowRightIcon } from "lucide-react";

const statusMap: Record<
    ServerStatus,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof PlayIcon }
> = {
    running: { label: "运行中", variant: "default", icon: PlayIcon },
    stopped: { label: "已停止", variant: "secondary", icon: CircleIcon },
    starting: { label: "启动中", variant: "outline", icon: PlayIcon },
    stopping: { label: "停止中", variant: "outline", icon: CircleIcon },
    crashed: { label: "异常", variant: "destructive", icon: CircleIcon },
};

// 将 config 中的实例转换为运行时 server store 数据
function buildInstancesFromConfig(
    instances: { id: string; name: string; path: string }[]
): ServerInstance[] {
    return instances.map((inst) => ({
        id: inst.id,
        name: inst.name,
        type: "Paper",
        version: "1.21.4",
        status: "stopped" as ServerStatus,
        players: 0,
        maxPlayers: 20,
        cpu: 0,
        memoryUsed: 0,
        memoryMax: 4096,
    }));
}

function Dashboard() {
    const config = useConfigStore((s) => s.config);
    const configLoaded = useConfigStore((s) => s.loaded);
    const loadConfig = useConfigStore((s) => s.load);

    const instances = useServerStore((s: { instances: any }) => s.instances);
    const setInstances = useServerStore((s: { setInstances: any }) => s.setInstances);
    const runningCount = useServerStore((s: { runningCount: () => any }) => s.runningCount());
    const totalPlayers = useServerStore((s: { totalPlayers: () => any }) => s.totalPlayers());

    const [cpu, setCpu] = useState<CpuInfo | null>(null);

    // 加载配置并同步到 server store
    useEffect(() => {
        if (!configLoaded) loadConfig();
    }, [configLoaded, loadConfig]);

    useEffect(() => {
        if (config) {
            const insts = config.server.instances;
            if (insts.length > 0) {
                setInstances(buildInstancesFromConfig(insts));
            }
        }
    }, [config, setInstances]);

    // CPU 轮询
    useEffect(() => {
        getCpuInfo()
            .then(setCpu)
            .catch(() => {});
        const interval = setInterval(() => {
            getCpuInfo()
                .then(setCpu)
                .catch(() => {});
        }, 10 * 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col gap-6">
            {/* 统计卡片 */}
            <div className="grid grid-cols-4 gap-4">
                <Card size="sm">
                    <CardContent className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                            <ServerIcon className="size-4 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">服务器总数</p>
                            <p className="text-lg font-semibold">{instances.length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card size="sm">
                    <CardContent className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-green-500/10">
                            <PlayIcon className="size-4 text-green-500" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">运行中</p>
                            <p className="text-lg font-semibold">{runningCount}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card size="sm">
                    <CardContent className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/10">
                            <UsersIcon className="size-4 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">在线玩家</p>
                            <p className="text-lg font-semibold">{totalPlayers}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card size="sm">
                    <CardContent className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-lg bg-orange-500/10">
                            <CpuIcon className="size-4 text-orange-500" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">CPU 占用</p>
                            <p className="text-lg font-semibold">{cpu ? `${cpu.usage.toFixed(1)}%` : "--"}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 服务器列表 */}
            <Card>
                <CardHeader>
                    <CardTitle>服务器实例</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                    {instances.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                            暂无服务器实例，请在侧边栏中点击「+」添加实例
                        </p>
                    ) : (
                        // @ts-expect-error 安全的忽略隐式 any
                        instances.map((server) => {
                            const status = statusMap[server.status as ServerStatus];
                            const StatusIcon = status.icon;
                            return (
                                <div
                                    key={server.id}
                                    className="flex items-center justify-between rounded-lg border border-border px-4 py-3 transition-colors hover:bg-accent">
                                    <div className="flex items-center gap-3">
                                        <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                                            <ServerIcon className="size-4 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium">{server.name}</span>
                                                <Badge variant={status.variant} className="text-[10px]">
                                                    <StatusIcon className="mr-1 size-2.5" />
                                                    {status.label}
                                                </Badge>
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {server.type} · {server.version}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1.5">
                                            <UsersIcon className="size-3.5" />
                                            <span>
                                                {server.players}/{server.maxPlayers}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <CpuIcon className="size-3.5" />
                                            <span>{server.cpu.toFixed(1)}%</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <HardDriveIcon className="size-3.5" />
                                            <span>
                                                {(server.memoryUsed / 1024).toFixed(1)} / {(server.memoryMax / 1024).toFixed(0)}{" "}
                                                GB
                                            </span>
                                        </div>
                                        <Button variant="ghost" size="icon-sm" asChild>
                                            <Link to={`/server/instance/${server.id}/terminal`} state={{ path: config?.server.instances.find((i) => i.id === server.id)?.path }}>
                                                <ArrowRightIcon className="size-3.5" />
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default Dashboard;


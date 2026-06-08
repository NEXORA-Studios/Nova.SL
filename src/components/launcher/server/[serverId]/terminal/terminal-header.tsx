import { cn } from "@/utils/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PlayIcon, SquareIcon, SkullIcon, ServerIcon } from "lucide-react";

export type ServerStatus = "running" | "stopped" | "starting" | "stopping" | "crashed";

interface TerminalHeaderProps {
    serverName: string;
    serverVersion: string;
    serverType: string;
    status: ServerStatus;
    onStart?: () => void;
    onStop?: () => void;
    onForceKill?: () => void;
    className?: string;
}

const statusConfig: Record<ServerStatus, { label: string; colorClass?: string }> = {
    running: { label: "运行中", colorClass: "border-green-500 text-green-500" },
    stopped: { label: "已停止", colorClass: "border-gray-500 text-gray-500" },
    starting: { label: "启动中", colorClass: "border-green-500 text-green-500" },
    stopping: { label: "停止中", colorClass: "border-yellow-500 text-yellow-500" },
    crashed: { label: "已崩溃", colorClass: "border-red-500 text-red-500" },
};

function TerminalHeader({
    serverName,
    serverVersion,
    serverType,
    status,
    onStart,
    onStop,
    onForceKill,
    className,
}: TerminalHeaderProps) {
    const config = statusConfig[status];
    const isRunning = status === "running";
    const isStopped = status === "stopped";
    const isBusy = status === "starting" || status === "stopping";

    return (
        <div className={cn("flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3", className)}>
            <div className="flex items-center gap-3">
                <ServerIcon className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium">{serverName}</span>
                <Badge variant="outline" className={cn("text-xs", config.colorClass)}>
                    {(() => {
                        switch (status) {
                            case "running":
                                return (
                                    <span className="relative inline-flex h-2 w-2">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                                        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-600" />
                                    </span>
                                );
                            case "stopped":
                                return <span className="inline-block h-2 w-2 rounded-full bg-gray-500" />;
                            case "starting":
                                return <span className="inline-block h-2 w-2 rounded-full bg-green-500" />;
                            case "stopping":
                                return (
                                    <span className="relative inline-flex h-2 w-2">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-500 opacity-75" />
                                        <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-600" />
                                    </span>
                                );
                        }
                    })()}
                    {config.label}
                </Badge>
                <span className="text-xs text-muted-foreground">
                    {serverType} · {serverVersion}
                </span>
            </div>
            <div className="flex items-center gap-1">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon-sm" onClick={onStart} disabled={!isStopped}>
                            <PlayIcon className="size-3.5 text-green-500" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>启动服务器</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon-sm" onClick={onStop} disabled={!isRunning}>
                            <SquareIcon className="size-3.5 text-yellow-500" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>停止服务器</TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon-sm" onClick={onForceKill} disabled={isStopped || isBusy}>
                            <SkullIcon className="size-3.5 text-destructive" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>强制关闭</TooltipContent>
                </Tooltip>
            </div>
        </div>
    );
}

export { TerminalHeader };

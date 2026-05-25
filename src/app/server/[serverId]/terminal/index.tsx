import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PlayIcon, SquareIcon, SkullIcon, ServerIcon, Trash2Icon, CopyIcon, SendIcon, TerminalIcon, MessageSquareTextIcon } from "lucide-react";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useConfigStore } from "@/stores/config";
import { useServerStore } from "@/stores/server";
import {
    startInstance,
    stopInstance,
    killInstance,
    sendInstanceCommand,
    getInstanceStatus,
    getInstanceLogs,
} from "@/lib/tauri/instance-process";
import { cn } from "@/lib/utils";

export type ServerStatusLocal = "running" | "stopped" | "starting" | "stopping" | "crashed";

const statusConfig: Record<ServerStatusLocal, { label: string; colorClass?: string }> = {
    running: { label: "运行中", colorClass: "border-green-500 text-green-500" },
    stopped: { label: "已停止", colorClass: "border-gray-500 text-gray-500" },
    starting: { label: "启动中", colorClass: "border-green-500 text-green-500" },
    stopping: { label: "停止中", colorClass: "border-yellow-500 text-yellow-500" },
    crashed: { label: "已崩溃", colorClass: "border-red-500 text-red-500" },
};

const prefix = {
    server: "\x1b[92m[SERVER] \x1b[90m|\x1b[0m",
    novasl: "\x1b[94m[NovaSL] \x1b[90m|\x1b[0m",
};

function TerminalPage() {
    const { serverId } = useParams<{ serverId: string }>();

    const [isCommandMode, setIsCommandMode] = useState(true);

    const config = useConfigStore((s) => s.config);
    const configLoaded = useConfigStore((s) => s.loaded);
    const loadConfig = useConfigStore((s) => s.load);
    const instanceConfig = config?.server.instances.find((i) => i.id === serverId);
    const instancePath = instanceConfig?.path ?? "";

    const updateInstance = useServerStore((s) => s.updateInstance);
    const instance = useServerStore((s) => s.instances.find((i) => i.id === serverId));

    // 确保配置已加载
    useEffect(() => {
        if (!configLoaded) loadConfig();
    }, [configLoaded, loadConfig]);

    const terminalRef = useRef<HTMLDivElement>(null);
    const xtermRef = useRef<XTerm | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const unlistenRef = useRef<UnlistenFn | null>(null);

    const [status, setStatus] = useState<ServerStatusLocal>("stopped");
    const [isBusy, setIsBusy] = useState(false);
    const [commandInput, setCommandInput] = useState("");
    const ctrlEnterToSend = config?.ui.terminal.ctrl_enter_to_send ?? true;

    // 初始化 xterm（只在 serverId 变化时重新初始化，避免状态变化导致终端重置）
    useEffect(() => {
        if (!terminalRef.current || xtermRef.current) return;

        const term = new XTerm({
            cursorBlink: true,
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            theme: {
                background: "#0c0c0c",
                foreground: "#cccccc",
                cursor: "#cccccc",
                selectionBackground: "#264f78",
                black: "#0c0c0c",
                red: "#c50f1f",
                green: "#13a10e",
                yellow: "#c19c00",
                blue: "#0037da",
                magenta: "#881798",
                cyan: "#3a96dd",
                white: "#cccccc",
                brightBlack: "#767676",
                brightRed: "#e74856",
                brightGreen: "#16c60c",
                brightYellow: "#f9f1a5",
                brightBlue: "#3b78ff",
                brightMagenta: "#b4009e",
                brightCyan: "#61d6d6",
                brightWhite: "#f2f2f2",
            },
            convertEol: true,
            scrollback: 10000,
        });

        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalRef.current);
        fitAddon.fit();

        xtermRef.current = term;
        fitAddonRef.current = fitAddon;

        // xterm 只用于显示输出，不再处理键盘输入
        // 输入通过下方独立的命令框进行

        const handleResize = () => fitAddon.fit();
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            term.dispose();
            xtermRef.current = null;
        };
    }, [serverId]);

    // 加载历史日志并监听后端输出事件
    useEffect(() => {
        if (!serverId || !xtermRef.current) return;

        const term = xtermRef.current;
        const eventName = `instance://${serverId}/output`;
        let unlisten: UnlistenFn;

        // 先加载历史日志
        getInstanceLogs(serverId).then((logs) => {
            if (logs.length > 0) {
                term.writeln(`${prefix.novasl} \x1b[90m--- 历史日志 ---\x1b[0m`);
                logs.forEach((entry) => {
                    const color = entry.stream === "stderr" ? "\x1b[91m" : entry.stream === "stdin" ? "\x1b[96m" : "\x1b[92m";
                    const line = `${color}${`[${entry.stream.toUpperCase()}]`.padEnd(9, " ")}\x1b[90m|\x1b[0m ${entry.line}`;
                    term.writeln(line);
                });
                term.writeln(`${prefix.novasl} \x1b[90m--- 实时输出 ---\x1b[0m`);
            }
        }).catch((err) => {
            console.error("Failed to load logs:", err);
        }).finally(() => {
            // 然后开始监听实时输出
            listen<{ stream: string; line: string }>(eventName, (event) => {
                const term = xtermRef.current;
                if (!term) return;
                const line = `${prefix.server} ${event.payload.line}`;
                term.writeln(line);
            }).then((u) => {
                unlisten = u;
                unlistenRef.current = u;
            });
        });

        return () => {
            if (unlisten) unlisten();
        };
    }, [serverId]);

    // 轮询状态
    useEffect(() => {
        if (!serverId) return;
        const interval = setInterval(() => {
            getInstanceStatus(serverId)
                .then((s) => {
                    const newStatus = s as ServerStatusLocal;
                    setStatus(newStatus);
                    if (instance) {
                        updateInstance(serverId, { status: newStatus });
                    }
                })
                .catch(() => {
                    setStatus("stopped");
                });
        }, 2000);
        return () => clearInterval(interval);
    }, [serverId, instance, updateInstance]);

    const handleStart = useCallback(async () => {
        if (!serverId || !instancePath || !instanceConfig) return;
        setIsBusy(true);
        setStatus("starting");
        xtermRef.current?.writeln(`${prefix.novasl} 尝试启动服务器进程`);
        try {
            await startInstance(serverId, instancePath);
            setStatus("running");
            if (instance) updateInstance(serverId, { status: "running" });
            xtermRef.current?.writeln(`${prefix.novasl} 已拉起服务器进程`);
        } catch (err) {
            setStatus("crashed");
            xtermRef.current?.writeln(`${prefix.novasl} 启动失败: ${err}`);
        } finally {
            setIsBusy(false);
        }
    }, [serverId, instancePath, instanceConfig, instance, updateInstance]);

    const handleStop = useCallback(async () => {
        if (!serverId) return;
        setIsBusy(true);
        setStatus("stopping");
        xtermRef.current?.writeln(`${prefix.novasl} 已向服务器发送 "stop" 命令以安全停止服务器`);
        try {
            await stopInstance(serverId);
            if (instance) updateInstance(serverId, { status: "stopping" });
            xtermRef.current?.writeln(`${prefix.novasl} 已安全停止服务器`);
        } catch (err) {
            xtermRef.current?.writeln(`${prefix.novasl} 停止失败: ${err}`);
        } finally {
            setIsBusy(false);
        }
    }, [serverId, instance, updateInstance]);

    const handleKill = useCallback(async () => {
        if (!serverId) return;
        setIsBusy(true);
        xtermRef.current?.writeln(`${prefix.novasl} 已向服务器进程发送 SIGTERM 信号以强制关闭服务器`);
        try {
            await killInstance(serverId);
            setStatus("stopped");
            if (instance) updateInstance(serverId, { status: "stopped" });
            xtermRef.current?.writeln(`${prefix.novasl} 已强制关闭服务器进程`);
        } catch (err) {
            xtermRef.current?.writeln(`${prefix.novasl} 强制关闭失败: ${err}`);
        } finally {
            setIsBusy(false);
        }
    }, [serverId, instance, updateInstance]);

    const handleClear = useCallback(() => {
        xtermRef.current?.clear();
    }, []);

    const handleCopy = useCallback(() => {
        const term = xtermRef.current;
        if (!term) return;
        const buf = term.buffer.active;
        const lines: string[] = [];
        for (let i = 0; i < buf.length; i++) {
            const line = buf.getLine(i);
            if (line) lines.push(line.translateToString(true));
        }
        navigator.clipboard.writeText(lines.join("\n"));
    }, []);

    const handleSendCommand = useCallback(async () => {
        if (!serverId || !commandInput.trim() || status !== "running") return;
        const cmd = `${isCommandMode ? "" : "say "}${commandInput.trim()}`;
        try {
            // 在终端中显示输入的命令
            xtermRef.current?.writeln(`${prefix.novasl} \x1b[33m> \x1b[0m${cmd}`);
            await sendInstanceCommand(serverId, cmd);
            setCommandInput("");
        } catch (err) {
            xtermRef.current?.writeln(`${prefix.novasl} 发送命令失败: ${err}`);
        }
    }, [serverId, commandInput, status]);

    const statusCfg = statusConfig[status];
    const isRunning = status === "running";
    const isStopped = status === "stopped";
    const isBusyState = status === "starting" || status === "stopping" || isBusy;

    if (!configLoaded) {
        return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">加载中...</div>;
    }

    if (!instanceConfig) {
        return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">未找到服务器实例</div>;
    }

    return (
        <div className="flex h-full flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
                <div className="flex items-center gap-3">
                    <ServerIcon className="size-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{instanceConfig.name}</span>
                    <Badge variant="outline" className={cn("text-xs", statusCfg.colorClass)}>
                        {status === "running" && (
                            <span className="relative mr-1 inline-flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-600" />
                            </span>
                        )}
                        {status === "stopping" && (
                            <span className="relative mr-1 inline-flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-500 opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-600" />
                            </span>
                        )}
                        {statusCfg.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                        {instanceConfig.loader} · {instanceConfig.version}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon-sm" onClick={handleStart} disabled={!isStopped || isBusyState}>
                                <PlayIcon className="size-3.5 text-green-500" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>启动服务器</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon-sm" onClick={handleStop} disabled={!isRunning || isBusyState}>
                                <SquareIcon className="size-3.5 text-yellow-500" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>停止服务器</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon-sm" onClick={handleKill} disabled={isStopped || isBusyState}>
                                <SkullIcon className="size-3.5 text-destructive" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>强制关闭</TooltipContent>
                    </Tooltip>
                </div>
            </div>

            {/* Terminal */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
                {/* Toolbar */}
                <div className="flex items-center gap-1 border-b border-border bg-background px-4 py-1.5">
                    <Button variant="ghost" size="sm" onClick={handleCopy} className="ml-auto">
                        <CopyIcon className="size-3.5" />
                        复制全部输出
                    </Button>
                    <Button variant="destructive" size="sm" onClick={handleClear}>
                        <Trash2Icon className="size-3.5" />
                        清空输出
                    </Button>
                </div>

                {/* xterm container */}
                <div ref={terminalRef} className="flex-1 p-2" />

                {/* Command Input */}
                <div className="flex items-center gap-2 border-t border-border bg-background px-4 py-4">
                    <Button variant="ghost" size="icon-xs" onClick={() => setIsCommandMode(!isCommandMode)}>
                        {isCommandMode ? <TerminalIcon className="size-3.5" /> : <MessageSquareTextIcon className="size-3.5" />}
                    </Button>
                    <input
                        type="text"
                        value={commandInput}
                        onChange={(e) => setCommandInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (ctrlEnterToSend) {
                                if (e.key === "Enter" && e.ctrlKey) {
                                    e.preventDefault();
                                    handleSendCommand();
                                }
                            } else {
                                if (e.key === "Enter") {
                                    handleSendCommand();
                                }
                            }
                        }}
                        placeholder={
                            isRunning
                                ? ctrlEnterToSend
                                    ? "输入命令... (Ctrl+Enter 发送)"
                                    : "输入命令... (Enter 发送)"
                                : "服务器未运行"
                        }
                        disabled={!isRunning}
                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
                    />
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={handleSendCommand}
                        disabled={!isRunning || !commandInput.trim()}>
                        <SendIcon className="size-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default TerminalPage;


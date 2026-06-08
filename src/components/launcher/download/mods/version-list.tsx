"use client";

import { memo, useCallback, useMemo, useState } from "react";
import type { CSSProperties, ReactElement } from "react";
import { List, useDynamicRowHeight } from "react-window";
import { Loader2, Download, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatNumber, formatRelativeTime, cn } from "@/utils/utils";
import { LoaderIcon } from "@/components/launcher/loader-icon";
import { VersionDetail } from "./version-detail";
import { downloadModToInstance } from "@/lib/tauri/modrinth";
import { useDownloadTargetInstance } from "@/hooks/use-download-target-instance";
import type { Version } from "@/models/tauri/modrinth";

const LOADER_COLORS: Record<string, string> = {
    fabric: "text-platform-fabric",
    forge: "text-platform-forge",
    neoforge: "text-platform-neoforge",
    babric: "text-muted-foreground",
    "bta-babric": "text-platform-bta-babric",
    liteloader: "text-platform-liteloader",
    "legacy-fabric": "text-muted-foreground",
    ornithe: "text-platform-ornithe",
    nilloader: "text-platform-nilloader",
    modloader: "text-muted-foreground",
    quilt: "text-platform-quilt",
    rift: "text-muted-foreground",
    bukkit: "text-platform-bukkit",
    paper: "text-platform-paper",
    spigot: "text-platform-spigot",
    purpur: "text-platform-purpur",
    folia: "text-platform-folia",
    sponge: "text-platform-sponge",
    bungeecord: "text-platform-bungeecord",
    waterfall: "text-platform-waterfall",
    velocity: "text-platform-velocity",
    geyser: "text-platform-geyser",
};

interface VersionListProps {
    versions: Version[];
    isLoading: boolean;
}

interface VersionRowData {
    versions: Version[];
    expandedVersion: string | null;
    isDownloading: string | null;
    targetInstanceId: string | null;
    onToggle: (versionId: string) => void;
    onDownload: (version: Version) => void;
}

interface VersionRowProps extends VersionRowData {
    ariaAttributes: {
        "aria-posinset": number;
        "aria-setsize": number;
        role: "listitem";
    };
    index: number;
    style: CSSProperties;
}

const VersionRow = memo(function VersionRow({
    ariaAttributes,
    index,
    style,
    versions,
    expandedVersion,
    isDownloading,
    targetInstanceId,
    onToggle,
    onDownload,
}: VersionRowProps): ReactElement {
    const version = versions[index];
    const expanded = expandedVersion === version.id;

    return (
        <div {...ariaAttributes} style={style} className="px-1 pb-2">
            <div className="rounded-lg border transition-colors hover:bg-muted/50">
                <div className="flex w-full items-center gap-3 p-3 text-left">
                    <button className="flex min-w-0 flex-1 flex-col gap-1 text-left" onClick={() => onToggle(version.id)}>
                        <div className="flex items-center gap-2">
                            <span className="font-medium">{version.name}</span>
                            <Badge variant="outline" className="text-[10px]">
                                {version.version_type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{version.version_number}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatRelativeTime(version.date_published)}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                                <Download className="size-3" />
                                {formatNumber(version.downloads)}
                            </span>
                            <span>·</span>
                            <span>{version.game_versions.join(", ")}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                                {version.loaders.map((l) => (
                                    <LoaderIcon key={l} name={l} className={cn("size-3", LOADER_COLORS[l.toLowerCase()])} />
                                ))}
                                {version.loaders.join(", ")}
                            </span>
                        </div>
                    </button>
                    <div className="flex shrink-0 items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            disabled={!targetInstanceId || isDownloading === version.id}
                            onClick={() => onDownload(version)}>
                            {isDownloading === version.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                                <Download className="size-3.5" />
                            )}
                            下载
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            aria-label={expanded ? "收起版本详情" : "展开版本详情"}
                            onClick={() => onToggle(version.id)}>
                            {expanded ? (
                                <ChevronUp className="size-4 text-muted-foreground" />
                            ) : (
                                <ChevronDown className="size-4 text-muted-foreground" />
                            )}
                        </Button>
                    </div>
                </div>

                {expanded && <VersionDetail version={version} />}
            </div>
        </div>
    );
}) as (props: VersionRowProps) => ReactElement | null;

export function VersionList({ versions, isLoading }: VersionListProps) {
    const [isDownloading, setIsDownloading] = useState<string | null>(null);
    const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
    const { targetInstanceId } = useDownloadTargetInstance();

    const versionsKey = useMemo(
        () => `${versions.length}:${versions[0]?.id ?? ""}:${versions[versions.length - 1]?.id ?? ""}`,
        [versions]
    );
    const rowHeight = useDynamicRowHeight({
        defaultRowHeight: 92,
        key: versionsKey,
    });

    const handleDownload = useCallback(
        async (version: Version) => {
            if (!targetInstanceId) {
                toast.error("请先选择目标实例");
                return;
            }

            setIsDownloading(version.id);
            try {
                await downloadModToInstance(targetInstanceId, version.id);
                toast.success(`已下载 ${version.name}`);
            } catch (error) {
                console.error("Download failed:", error);
                toast.error("下载失败");
            } finally {
                setIsDownloading(null);
            }
        },
        [targetInstanceId]
    );

    const toggleVersionExpand = useCallback((versionId: string) => {
        setExpandedVersion((prev) => (prev === versionId ? null : versionId));
    }, []);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
                <Loader2 className="size-6 animate-spin" />
                <p className="text-sm">加载版本中...</p>
            </div>
        );
    }

    if (versions.length === 0) {
        return <div className="py-8 text-center text-sm text-muted-foreground">暂无版本</div>;
    }

    return (
        <List<VersionRowData>
            rowComponent={VersionRow}
            rowCount={versions.length}
            rowHeight={rowHeight}
            rowProps={{
                versions,
                expandedVersion,
                isDownloading,
                targetInstanceId,
                onToggle: toggleVersionExpand,
                onDownload: handleDownload,
            }}
            overscanCount={6}
            className="h-full"
            style={{ height: "100%" }}
        />
    );
}

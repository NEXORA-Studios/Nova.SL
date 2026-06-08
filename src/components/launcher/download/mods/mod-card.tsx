"use client";

import { useNavigate } from "react-router";
import { Download, Heart, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber, formatRelativeTime } from "@/utils/utils";
import { cn } from "@/utils/utils";
import { LoaderIcon } from "@/components/launcher/loader-icon";
import type { ModrinthProjectType } from "@/hooks/use-modrinth-search";
import type { SearchResult } from "@/models/tauri/modrinth";

interface ModCardProps {
    project: SearchResult;
    displayProjectType?: ModrinthProjectType;
    detailPathBase?: string;
}

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

const KNOWN_LOADERS = new Set(Object.keys(LOADER_COLORS));

const MOD_LOADERS = new Set([
    "fabric",
    "forge",
    "neoforge",
    "babric",
    "bta-babric",
    "liteloader",
    "legacy-fabric",
    "ornithe",
    "nilloader",
    "modloader",
    "quilt",
    "rift",
]);

const PLUGIN_LOADERS = new Set([
    "bukkit",
    "paper",
    "spigot",
    "purpur",
    "folia",
    "sponge",
    "bungeecord",
    "waterfall",
    "velocity",
    "geyser",
]);

/** 需要过滤的标签 */
const HIDDEN_TAGS = new Set(["java-agent"]);

export function ModCard({ project, displayProjectType, detailPathBase = "/download/mods" }: ModCardProps) {
    const navigate = useNavigate();
    const loaderProjectType = displayProjectType ?? project.project_type;
    const projectLoaders =
        loaderProjectType === "plugin" ? PLUGIN_LOADERS : loaderProjectType === "mod" ? MOD_LOADERS : KNOWN_LOADERS;

    // 将 categories 分成加载器类型和普通分类
    const loaderCategories: string[] = [];
    const normalCategories: string[] = [];

    for (const cat of project.categories) {
        const lower = cat.toLowerCase();
        if (HIDDEN_TAGS.has(lower)) {
            // 跳过需要隐藏的标签
            continue;
        }
        if (KNOWN_LOADERS.has(lower)) {
            if (projectLoaders.has(lower)) {
                loaderCategories.push(cat);
            }
            continue;
        } else {
            normalCategories.push(cat);
        }
    }

    const loaderCategoryNames = new Set(loaderCategories.map((loader) => loader.toLowerCase()));
    const visibleLoaders = project.loaders
        .filter((loader) => projectLoaders.has(loader.toLowerCase()))
        .filter((loader) => !loaderCategoryNames.has(loader.toLowerCase()));

    const handleClick = () => {
        navigate(`${detailPathBase}/${project.project_id}`);
    };

    return (
        <Card className="group cursor-pointer transition-colors hover:bg-muted/50" onClick={handleClick}>
            <CardContent className="flex gap-4 px-4">
                {/* 图标 */}
                <div className="shrink-0">
                    {project.icon_url ? (
                        <img
                            src={project.icon_url}
                            alt={project.title}
                            className="size-16 rounded-lg object-cover ring-1 ring-border"
                        />
                    ) : (
                        <div className="flex size-16 items-center justify-center rounded-lg bg-muted ring-1 ring-border">
                            <span className="text-2xl">📦</span>
                        </div>
                    )}
                </div>

                {/* 内容 */}
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                    {/* 标题和统计 */}
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <h3 className="truncate text-base font-semibold">{project.title}</h3>
                            <p className="text-xs text-muted-foreground">{project.description}</p>
                        </div>
                    </div>

                    {/* 标签 */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        {/* 加载器类型标签放最前面，带图标和颜色 */}
                        {loaderCategories.map((loader) => (
                            <Badge
                                key={loader}
                                variant="outline"
                                className={cn(
                                    "flex items-center gap-1 text-xs capitalize",
                                    LOADER_COLORS[loader.toLowerCase()]
                                )}>
                                <LoaderIcon name={loader} className="size-3" />
                                {loader}
                            </Badge>
                        ))}
                        {/* 普通分类标签 */}
                        {normalCategories.slice(0, 3).map((cat) => (
                            <Badge key={cat} variant="secondary" className="text-xs capitalize">
                                {cat}
                            </Badge>
                        ))}
                        {/* project.loaders 过滤后只显示未重复的加载器 */}
                        {visibleLoaders.map((loader) => (
                            <Badge
                                key={loader}
                                variant="outline"
                                className={cn(
                                    "flex items-center gap-1 text-xs capitalize",
                                    LOADER_COLORS[loader.toLowerCase()]
                                )}>
                                <LoaderIcon name={loader} className="size-3" />
                                {loader}
                            </Badge>
                        ))}
                    </div>
                </div>

                {/* 更新时间 */}
                <div className="my-auto flex flex-col items-end gap-1 text-xs text-muted-foreground">
                    <span className="flex items-center justify-end gap-1">
                        <Download className="size-3.5" />
                        {formatNumber(project.downloads)}
                    </span>
                    <span className="flex items-center justify-end gap-1">
                        <Heart className="size-3.5" />
                        {formatNumber(project.follows)}
                    </span>
                    <span className="flex items-center justify-end gap-1">
                        <Clock className="size-3.5" />
                        {formatRelativeTime(project.date_modified)}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
}

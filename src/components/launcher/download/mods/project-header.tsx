"use client";

import { Download, Calendar, Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatNumber, formatRelativeTime, cn } from "@/utils/utils";
import { LoaderIcon } from "@/components/launcher/loader-icon";
import type { Project } from "@/models/tauri/modrinth";

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

interface ProjectHeaderProps {
    project: Project;
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
    return (
        <div className="flex gap-4">
            <div className="shrink-0">
                {project.icon_url ? (
                    <img
                        src={project.icon_url}
                        alt={project.title}
                        className="size-20 rounded-xl object-cover ring-1 ring-border"
                    />
                ) : (
                    <div className="flex size-20 items-center justify-center rounded-xl bg-muted ring-1 ring-border">
                        <span className="text-3xl">📦</span>
                    </div>
                )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2">
                <h1 className="text-xl font-bold">{project.title}</h1>
                <p className="text-sm text-muted-foreground">{project.description}</p>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <Download className="size-3.5" />
                        {formatNumber(project.downloads)}
                    </span>
                    <span className="flex items-center gap-1">
                        <Calendar className="size-3.5" />
                        {formatRelativeTime(project.updated)}
                    </span>
                    <span className="flex items-center gap-1">
                        <Hash className="size-3.5" />
                        {project.slug}
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                    {project.loaders.map((loader) => (
                        <Badge
                            key={loader}
                            variant="outline"
                            className={cn("flex items-center gap-1 text-xs capitalize", LOADER_COLORS[loader.toLowerCase()])}>
                            <LoaderIcon name={loader} className="size-3" />
                            {loader}
                        </Badge>
                    ))}
                    {project.game_versions.slice(0, 5).map((v) => (
                        <Badge key={v} variant="secondary" className="text-xs">
                            {v}
                        </Badge>
                    ))}
                    {project.game_versions.length > 5 && (
                        <Badge variant="secondary" className="text-xs">
                            +{project.game_versions.length - 5}
                        </Badge>
                    )}
                </div>
            </div>
        </div>
    );
}

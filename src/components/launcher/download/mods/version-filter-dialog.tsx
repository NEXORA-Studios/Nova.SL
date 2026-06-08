"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/utils/utils";
import type { GameVersion } from "@/models/tauri/modrinth";

interface VersionFilterDialogProps {
    selectedVersions: string[];
    onToggleVersion: (version: string) => void;
    gameVersions: GameVersion[];
    isFiltersLoading: boolean;
    versionSearchQuery: string;
    onVersionSearchChange: (value: string) => void;
}

export function VersionFilterDialog({
    selectedVersions,
    onToggleVersion,
    gameVersions,
    isFiltersLoading,
    versionSearchQuery,
    onVersionSearchChange,
}: VersionFilterDialogProps) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 rounded-full">
                    <Search className="size-4" />
                    版本
                    {selectedVersions.length > 0 && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                            {selectedVersions.length}
                        </span>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] max-w-md! overflow-hidden p-0">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle>游戏版本</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] px-6 pb-6">
                    <div className="space-y-2 px-1 py-2 pt-1">
                        {!isFiltersLoading && gameVersions.length > 0 && (
                            <div className="relative">
                                <Search className="absolute top-1/2 left-2 size-3 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="搜索版本..."
                                    className="h-7 pl-7 text-xs"
                                    value={versionSearchQuery}
                                    onChange={(e) => onVersionSearchChange(e.target.value)}
                                />
                            </div>
                        )}
                        {versionSearchQuery && (
                            <ScrollArea className={cn("h-auto", gameVersions.length > 10 && "h-60")}>
                                <div className="space-y-1 pr-3">
                                    {isFiltersLoading ? (
                                        <div className="text-sm text-muted-foreground">加载中...</div>
                                    ) : (
                                        gameVersions
                                            .filter((gv) => {
                                                const query = versionSearchQuery.toLowerCase();
                                                if (query === "1.") return gv.version.startsWith("1.");
                                                return gv.version.toLowerCase().includes(query);
                                            })
                                            .map((gv) => (
                                                <label
                                                    key={gv.version}
                                                    className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted">
                                                    <Checkbox
                                                        checked={selectedVersions.includes(gv.version)}
                                                        onCheckedChange={() => onToggleVersion(gv.version)}
                                                        className="size-3.5"
                                                    />
                                                    <span className="text-sm">{gv.version}</span>
                                                </label>
                                            ))
                                    )}
                                </div>
                            </ScrollArea>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

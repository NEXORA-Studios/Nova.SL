"use client";

import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/utils/utils";
import { LoaderIcon } from "@/components/launcher/loader-icon";
import type { Loader } from "@/models/tauri/modrinth";

interface LoaderFilterDialogProps {
    selectedLoaders: string[];
    onToggleLoader: (loader: string) => void;
    primaryLoaders: Loader[];
    secondaryLoaders: Loader[];
    isFiltersLoading: boolean;
    modLoaderConfig: {
        colors: Record<string, string>;
    };
}

export function LoaderFilterDialog({
    selectedLoaders,
    onToggleLoader,
    primaryLoaders,
    secondaryLoaders,
    isFiltersLoading,
    modLoaderConfig,
}: LoaderFilterDialogProps) {
    const allLoaders = [...primaryLoaders, ...secondaryLoaders];

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 rounded-full">
                    <Wrench className="size-4" />
                    加载器
                    {selectedLoaders.length > 0 && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                            {selectedLoaders.length}
                        </span>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] max-w-lg! overflow-hidden p-0">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle>加载器</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] px-6 pb-6">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {isFiltersLoading ? (
                            <div className="text-sm text-muted-foreground">加载中...</div>
                        ) : (
                            allLoaders.map((loader) => (
                                <label
                                    key={loader.name}
                                    className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted">
                                    <Checkbox
                                        checked={selectedLoaders.includes(loader.name)}
                                        onCheckedChange={() => onToggleLoader(loader.name)}
                                        className="size-3.5"
                                    />
                                    <LoaderIcon
                                        name={loader.name}
                                        className={cn("size-4", modLoaderConfig.colors[loader.name.toLowerCase()])}
                                    />
                                    <span
                                        className={cn("text-sm capitalize", modLoaderConfig.colors[loader.name.toLowerCase()])}>
                                        {loader.name === "bta-babric"
                                            ? "BTA (Babric)"
                                            : loader.name === "modloader"
                                              ? "Risugami's ModLoader"
                                              : loader.name}
                                    </span>
                                </label>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

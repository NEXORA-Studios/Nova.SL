"use client";

import { useCallback } from "react";
import { Server, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDownloadTargetInstance } from "@/hooks/use-download-target-instance";
import type { DownloadTargetInstance } from "@/hooks/use-download-target-instance";

export interface TargetInstanceFilters {
    version?: string;
    loader?: string;
}

interface TargetInstanceSelectProps {
    onApplyFilters?: (filters: TargetInstanceFilters) => void;
}

export function TargetInstanceSelect({ onApplyFilters }: TargetInstanceSelectProps) {
    const { instances, loaded, targetInstanceId, selectedInstance, setTargetInstanceId } = useDownloadTargetInstance();

    const applyFilters = useCallback(
        (instance: DownloadTargetInstance | null) => {
            if (!instance || !onApplyFilters) return;

            const filters = {
                version: instance.version || undefined,
                loader: instance.loader || undefined,
            };

            onApplyFilters(filters);
            toast.success("已按目标实例筛选");
        },
        [onApplyFilters]
    );

    const handleSelectInstance = useCallback(
        (instanceId: string) => {
            setTargetInstanceId(instanceId);
            const nextInstance = instances.find((instance) => instance.id === instanceId) ?? null;
            applyFilters(nextInstance);
        },
        [applyFilters, instances, setTargetInstanceId]
    );

    const handleApplyCurrent = useCallback(() => {
        applyFilters(selectedInstance);
    }, [applyFilters, selectedInstance]);

    const hasInstances = instances.length > 0;
    const placeholder = loaded ? "没有可用 Mod 实例" : "加载实例中...";

    return (
        <div className="flex items-center gap-2">
            <Select value={targetInstanceId ?? ""} onValueChange={handleSelectInstance} disabled={!loaded || !hasInstances}>
                <SelectTrigger className="w-56">
                    <Server className="size-4" />
                    <SelectValue placeholder={hasInstances ? "选择目标实例" : placeholder} />
                </SelectTrigger>
                <SelectContent position="popper" align="end">
                    {instances.map((instance) => (
                        <SelectItem key={instance.id} value={instance.id}>
                            <span className="truncate">
                                {instance.name} · {instance.loader}
                            </span>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        disabled={!selectedInstance}
                        onClick={handleApplyCurrent}>
                        <SlidersHorizontal className="size-4" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>按目标实例筛选版本和加载器</TooltipContent>
            </Tooltip>
        </div>
    );
}

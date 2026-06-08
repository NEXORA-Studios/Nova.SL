"use client";

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ActiveFilterTagsProps {
    selectedVersions: string[];
    selectedLoaders: string[];
    selectedCategories: string[];
    onToggleVersion: (version: string) => void;
    onToggleLoader: (loader: string) => void;
    onToggleCategory: (category: string) => void;
}

export function ActiveFilterTags({
    selectedVersions,
    selectedLoaders,
    selectedCategories,
    onToggleVersion,
    onToggleLoader,
    onToggleCategory,
}: ActiveFilterTagsProps) {
    const totalCount = selectedVersions.length + selectedLoaders.length + selectedCategories.length;

    if (totalCount === 0) return null;

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {selectedVersions.map((v) => (
                <Badge key={v} variant="secondary" className="cursor-pointer gap-1 text-xs" onClick={() => onToggleVersion(v)}>
                    {v}
                    <X className="size-3" />
                </Badge>
            ))}
            {selectedLoaders.map((l) => (
                <Badge
                    key={l}
                    variant="secondary"
                    className="cursor-pointer gap-1 text-xs capitalize"
                    onClick={() => onToggleLoader(l)}>
                    {l}
                    <X className="size-3" />
                </Badge>
            ))}
            {selectedCategories.map((c) => (
                <Badge
                    key={c}
                    variant="secondary"
                    className="cursor-pointer gap-1 text-xs capitalize"
                    onClick={() => onToggleCategory(c)}>
                    {c}
                    <X className="size-3" />
                </Badge>
            ))}
        </div>
    );
}

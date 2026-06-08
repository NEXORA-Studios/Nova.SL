"use client";

import { Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Category } from "@/models/tauri/modrinth";

interface CategoryFilterDialogProps {
    selectedCategories: string[];
    onToggleCategory: (category: string) => void;
    categories: Category[];
    isFiltersLoading: boolean;
}

export function CategoryFilterDialog({
    selectedCategories,
    onToggleCategory,
    categories,
    isFiltersLoading,
}: CategoryFilterDialogProps) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 rounded-full">
                    <Tag className="size-4" />
                    分类
                    {selectedCategories.length > 0 && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                            {selectedCategories.length}
                        </span>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80vh] max-w-lg overflow-hidden p-0">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle>分类</DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] px-6 pb-6">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {isFiltersLoading ? (
                            <div className="text-sm text-muted-foreground">加载中...</div>
                        ) : (
                            categories.map((category) => (
                                <label
                                    key={category.name}
                                    className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted">
                                    <Checkbox
                                        checked={selectedCategories.includes(category.name)}
                                        onCheckedChange={() => onToggleCategory(category.name)}
                                        className="size-3.5"
                                    />
                                    <span className="text-sm capitalize">{category.name}</span>
                                </label>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

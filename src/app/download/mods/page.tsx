"use client";

import { Search, Loader2, Globe, ArrowUpNarrowWide, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatNumber } from "@/utils/utils";
import { ModCard } from "@/components/launcher/download/mods/mod-card";
import { VersionFilterDialog } from "@/components/launcher/download/mods/version-filter-dialog";
import { LoaderFilterDialog } from "@/components/launcher/download/mods/loader-filter-dialog";
import { CategoryFilterDialog } from "@/components/launcher/download/mods/category-filter-dialog";
import { ActiveFilterTags } from "@/components/launcher/download/mods/active-filter-tags";
import { TargetInstanceSelect } from "@/components/launcher/download/mods/target-instance-select";
import { useModrinthSearch, type ModrinthProjectType } from "@/hooks/use-modrinth-search";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const SORT_OPTIONS = [
    { value: "relevance", label: "相关度" },
    { value: "downloads", label: "下载量" },
    { value: "follows", label: "关注数" },
    { value: "newest", label: "最新发布" },
    { value: "updated", label: "最近更新" },
] as const;

interface ModrinthDownloadPageProps {
    projectType: ModrinthProjectType;
    searchPlaceholder: string;
    emptyText: string;
    detailPathBase: string;
}

export function ModrinthDownloadPage({ projectType, searchPlaceholder, emptyText, detailPathBase }: ModrinthDownloadPageProps) {
    const {
        searchQuery,
        setSearchQuery,
        source,
        setSource,
        sortBy,
        setSortBy,
        selectedVersions,
        toggleVersion,
        selectedLoaders,
        toggleLoader,
        selectedCategories,
        toggleCategory,
        versionSearchQuery,
        setVersionSearchQuery,
        projects,
        categories,
        gameVersions,
        totalHits,
        isLoading,
        isFiltersLoading,
        modLoaderConfig,
        primaryLoaders,
        secondaryLoaders,
        currentPage,
        totalPages,
        goToPage,
        applyTargetInstanceFilters,
    } = useModrinthSearch({ projectType });

    const activeFilterCount = selectedVersions.length + selectedLoaders.length + selectedCategories.length;

    const clearAllFilters = () => {
        selectedVersions.forEach((v) => toggleVersion(v));
        selectedLoaders.forEach((l) => toggleLoader(l));
        selectedCategories.forEach((c) => toggleCategory(c));
    };

    const currentSortIndex = SORT_OPTIONS.findIndex((opt) => opt.value === sortBy);
    const nextSort = SORT_OPTIONS[(currentSortIndex + 1) % SORT_OPTIONS.length];

    return (
        <div className="relative flex h-full flex-col">
            {/* 全屏搜索结果区域 */}
            <main className="flex min-w-0 flex-1 flex-col gap-4 pb-24">
                {/* 搜索栏 */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative flex-1">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder={searchPlaceholder}
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <TargetInstanceSelect onApplyFilters={applyTargetInstanceFilters} />
                        <Select value={source} onValueChange={setSource}>
                            <SelectTrigger className="w-40">
                                <Globe className="size-4" />
                                <SelectValue placeholder="内容来源" />
                            </SelectTrigger>
                            <SelectContent position="popper">
                                <SelectItem value="modrinth">Modrinth</SelectItem>
                                <SelectItem value="curseforge" disabled className="pointer-events-auto! cursor-not-allowed">
                                    CurseForge (尚未支持)
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* 结果统计 */}
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">找到 {formatNumber(totalHits)} 个结果</div>
                    {activeFilterCount > 0 && (
                        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearAllFilters}>
                            <X className="mr-1 size-3" />
                            清除全部筛选
                        </Button>
                    )}
                </div>

                {/* 已选筛选标签 */}
                <ActiveFilterTags
                    selectedVersions={selectedVersions}
                    selectedLoaders={selectedLoaders}
                    selectedCategories={selectedCategories}
                    onToggleVersion={toggleVersion}
                    onToggleLoader={toggleLoader}
                    onToggleCategory={toggleCategory}
                />

                {/* 模组列表 */}
                <ScrollArea className="relative flex-1">
                    {isLoading ? (
                        <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
                            <Loader2 className="size-8 animate-spin" />
                            <p className="text-sm">加载中...</p>
                        </div>
                    ) : (
                        <div className="space-y-3 pr-4">
                            {projects.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <Search className="mb-4 size-12 opacity-50" />
                                    <p>{emptyText}</p>
                                </div>
                            )}
                            {projects.map((project) => (
                                <ModCard
                                    key={project.project_id}
                                    project={project}
                                    displayProjectType={projectType}
                                    detailPathBase={detailPathBase}
                                />
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </main>

            {/* 底部悬浮筛选栏 + 分页 */}
            <div className="fixed bottom-12 left-1/2 z-50 flex -translate-x-1/4 justify-center px-4">
                <div className="flex items-center gap-2 rounded-full border bg-background/50 px-4 py-2 shadow-lg ring-1 ring-border backdrop-blur-sm">
                    <VersionFilterDialog
                        selectedVersions={selectedVersions}
                        onToggleVersion={toggleVersion}
                        gameVersions={gameVersions}
                        isFiltersLoading={isFiltersLoading}
                        versionSearchQuery={versionSearchQuery}
                        onVersionSearchChange={setVersionSearchQuery}
                    />

                    <Separator orientation="vertical" className="h-6" />

                    <LoaderFilterDialog
                        selectedLoaders={selectedLoaders}
                        onToggleLoader={toggleLoader}
                        primaryLoaders={primaryLoaders}
                        secondaryLoaders={secondaryLoaders}
                        isFiltersLoading={isFiltersLoading}
                        modLoaderConfig={modLoaderConfig}
                    />

                    <Separator orientation="vertical" className="h-6" />

                    <CategoryFilterDialog
                        selectedCategories={selectedCategories}
                        onToggleCategory={toggleCategory}
                        categories={categories}
                        isFiltersLoading={isFiltersLoading}
                    />

                    <Separator orientation="vertical" className="h-6" />

                    <Tooltip>
                        <TooltipTrigger>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="gap-2 rounded-full"
                                onClick={() => setSortBy(nextSort.value)}>
                                <ArrowUpNarrowWide className="size-4" />
                                {SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            {`当前: ${SORT_OPTIONS.find((opt) => opt.value === sortBy)?.label}，点击切换为: ${nextSort.label}`}
                        </TooltipContent>
                    </Tooltip>

                    {totalPages > 1 && (
                        <>
                            <Separator orientation="vertical" className="h-6" />
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 rounded-full"
                                    disabled={currentPage <= 1 || isLoading}
                                    onClick={() => goToPage(currentPage - 1)}>
                                    <ChevronLeft className="size-4" />
                                </Button>
                                <span className="min-w-[3ch] text-center text-xs font-medium">
                                    {currentPage}/{totalPages}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 rounded-full"
                                    disabled={currentPage >= totalPages || isLoading}
                                    onClick={() => goToPage(currentPage + 1)}>
                                    <ChevronRight className="size-4" />
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ModsDownloadPage() {
    return (
        <ModrinthDownloadPage
            projectType="mod"
            searchPlaceholder="搜索模组..."
            emptyText="未找到匹配的模组"
            detailPathBase="/download/mods"
        />
    );
}

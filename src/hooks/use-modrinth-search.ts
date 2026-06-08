"use client";

import * as React from "react";
import { toast } from "sonner";
import { sortMcVersions } from "@/lib/mc-version";
import type { SearchResult, Category, Loader, GameVersion } from "@/models/tauri/modrinth";
import {
    searchMods,
    getModrinthCategories,
    getModrinthLoaders,
    getModrinthGameVersions,
    getModrinthVersions,
    downloadModToInstance,
} from "@/lib/tauri/modrinth";
import { useDownloadTargetInstance } from "@/hooks/use-download-target-instance";

export type ModrinthProjectType = "mod" | "plugin";

interface LoaderConfig {
    primary: string[];
    secondary: string[];
    colors: Record<string, string>;
}

const MOD_LOADER_CONFIG: LoaderConfig = {
    primary: ["fabric", "forge", "neoforge", "quilt"],
    secondary: ["babric", "bta-babric", "liteloader", "legacy-fabric", "ornithe", "nilloader", "modloader", "rift"],
    colors: {
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
    } as Record<string, string>,
};

const PLUGIN_LOADER_CONFIG: LoaderConfig = {
    primary: ["paper", "spigot", "bukkit", "purpur", "folia"],
    secondary: ["sponge", "bungeecord", "waterfall", "velocity", "geyser"],
    colors: {
        paper: "text-platform-paper",
        spigot: "text-platform-spigot",
        bukkit: "text-platform-bukkit",
        purpur: "text-platform-purpur",
        folia: "text-platform-folia",
        sponge: "text-platform-sponge",
        bungeecord: "text-platform-bungeecord",
        waterfall: "text-platform-waterfall",
        velocity: "text-platform-velocity",
        geyser: "text-platform-geyser",
    },
};

const LOADER_CONFIG_BY_PROJECT_TYPE: Record<ModrinthProjectType, LoaderConfig> = {
    mod: MOD_LOADER_CONFIG,
    plugin: PLUGIN_LOADER_CONFIG,
};

const LIMIT = 20;

interface UseModrinthSearchOptions {
    projectType?: ModrinthProjectType;
}

export interface UseModrinthSearchReturn {
    // 搜索和筛选状态
    searchQuery: string;
    setSearchQuery: (value: string) => void;
    source: string;
    setSource: (value: string) => void;
    sortBy: string;
    setSortBy: (value: string) => void;
    selectedVersions: string[];
    toggleVersion: (version: string) => void;
    selectedLoaders: string[];
    toggleLoader: (loader: string) => void;
    selectedCategories: string[];
    toggleCategory: (category: string) => void;
    showAllLoaders: boolean;
    setShowAllLoaders: (value: boolean) => void;
    versionSearchQuery: string;
    setVersionSearchQuery: (value: string) => void;

    // 数据状态
    projects: SearchResult[];
    categories: Category[];
    loaders: Loader[];
    gameVersions: GameVersion[];
    totalHits: number;
    offset: number;

    // UI 状态
    isLoading: boolean;
    isDownloading: string | null;
    isFiltersLoading: boolean;

    // 加载器配置
    modLoaderConfig: LoaderConfig;

    // 派生数据
    primaryLoaders: Loader[];
    secondaryLoaders: Loader[];
    currentPage: number;
    totalPages: number;

    // 操作
    loadMore: () => void;
    goToPage: (page: number) => void;
    applyTargetInstanceFilters: (filters: { version?: string; loader?: string }) => void;
    handleDownload: (project: SearchResult) => Promise<void>;
}

export function useModrinthSearch({ projectType = "mod" }: UseModrinthSearchOptions = {}): UseModrinthSearchReturn {
    const loaderConfig = LOADER_CONFIG_BY_PROJECT_TYPE[projectType];

    // 搜索和筛选状态
    const [searchQuery, setSearchQuery] = React.useState("");
    const [source, setSource] = React.useState("modrinth");
    const [sortBy, setSortBy] = React.useState("relevance");
    const [selectedVersions, setSelectedVersions] = React.useState<string[]>([]);
    const [selectedLoaders, setSelectedLoaders] = React.useState<string[]>([]);
    const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
    const [showAllLoaders, setShowAllLoaders] = React.useState(false);
    const [versionSearchQuery, setVersionSearchQuery] = React.useState("");

    // 数据状态
    const [projects, setProjects] = React.useState<SearchResult[]>([]);
    const [categories, setCategories] = React.useState<Category[]>([]);
    const [loaders, setLoaders] = React.useState<Loader[]>([]);
    const [gameVersions, setGameVersions] = React.useState<GameVersion[]>([]);
    const [totalHits, setTotalHits] = React.useState(0);
    const [offset, setOffset] = React.useState(0);

    // UI 状态
    const [isLoading, setIsLoading] = React.useState(true);
    const [isDownloading, setIsDownloading] = React.useState<string | null>(null);
    const [isFiltersLoading, setIsFiltersLoading] = React.useState(true);
    const { selectedInstance } = useDownloadTargetInstance();
    const targetInstanceId = selectedInstance?.id ?? null;

    // 初始化加载筛选器数据
    React.useEffect(() => {
        async function loadFilters() {
            try {
                const [cats, lds, gvs] = await Promise.all([
                    getModrinthCategories(),
                    getModrinthLoaders(),
                    getModrinthGameVersions(),
                ]);
                setCategories(cats.filter((c) => c.project_type === projectType));
                // 按配置顺序过滤和排序加载器
                const allLoaderNames = [...loaderConfig.primary, ...loaderConfig.secondary];
                const filteredLoaders = lds
                    .filter((l) => allLoaderNames.includes(l.name.toLowerCase()))
                    .filter((l) => l.supported_project_types.includes(projectType))
                    .sort((a, b) => {
                        const aIndex = allLoaderNames.indexOf(a.name.toLowerCase());
                        const bIndex = allLoaderNames.indexOf(b.name.toLowerCase());
                        return aIndex - bIndex;
                    });
                setLoaders(filteredLoaders);
                // 只显示 Release 版本，使用正确的 MC 版本号排序（最新的在前）
                const releaseVersions = gvs.filter((v) => v.version_type === "release");
                const sortedVersionStrings = sortMcVersions(
                    releaseVersions.map((v) => v.version),
                    "desc"
                );
                const versionMap = new Map(releaseVersions.map((v) => [v.version, v]));
                setGameVersions(sortedVersionStrings.map((v) => versionMap.get(v)!));
            } catch (error) {
                console.error("Failed to load filters:", error);
                toast.error("加载筛选器失败");
            } finally {
                setIsFiltersLoading(false);
            }
        }
        loadFilters();
    }, [loaderConfig.primary, loaderConfig.secondary, projectType]);

    // 搜索模组
    const performSearch = React.useCallback(
        async (newOffset = 0) => {
            setIsLoading(true);
            try {
                const response = await searchMods(searchQuery, {
                    project_type: projectType,
                    game_versions: selectedVersions,
                    loaders: selectedLoaders,
                    categories: selectedCategories,
                    index: sortBy,
                    offset: newOffset,
                    limit: LIMIT,
                });

                setProjects(response.hits);
                setTotalHits(response.total_hits);
                setOffset(newOffset);
            } catch (error) {
                console.error("Search failed:", error);
                toast.error("搜索失败");
            } finally {
                setIsLoading(false);
            }
        },
        [searchQuery, selectedVersions, selectedLoaders, selectedCategories, sortBy, projectType]
    );

    // 防抖搜索
    React.useEffect(() => {
        const timer = setTimeout(() => {
            performSearch(0);
        }, 300);
        return () => clearTimeout(timer);
    }, [performSearch]);

    // 切换筛选器
    const toggleVersion = React.useCallback((version: string) => {
        setSelectedVersions((prev) => (prev.includes(version) ? prev.filter((v) => v !== version) : [...prev, version]));
    }, []);

    const toggleLoader = React.useCallback((loaderName: string) => {
        setSelectedLoaders((prev) =>
            prev.includes(loaderName) ? prev.filter((l) => l !== loaderName) : [...prev, loaderName]
        );
    }, []);

    const toggleCategory = React.useCallback((categoryName: string) => {
        setSelectedCategories((prev) =>
            prev.includes(categoryName) ? prev.filter((c) => c !== categoryName) : [...prev, categoryName]
        );
    }, []);

    const applyTargetInstanceFilters = React.useCallback((filters: { version?: string; loader?: string }) => {
        if (!filters.version && !filters.loader) return;

        setSelectedVersions(filters.version ? [filters.version] : []);
        setSelectedLoaders(filters.loader ? [filters.loader] : []);
    }, []);

    // 下载模组
    const handleDownload = React.useCallback(
        async (project: SearchResult) => {
            if (!targetInstanceId) {
                toast.error("请先选择目标实例");
                return;
            }

            setIsDownloading(project.project_id);
            try {
                const versions = await getModrinthVersions(project.project_id, selectedVersions[0], selectedLoaders[0]);

                if (versions.length === 0) {
                    toast.error("未找到兼容的版本");
                    return;
                }

                const latestVersion = versions[0];
                await downloadModToInstance(targetInstanceId, latestVersion.id);
                toast.success(`已下载 ${project.title}`);
            } catch (error) {
                console.error("Download failed:", error);
                toast.error("下载失败");
            } finally {
                setIsDownloading(null);
            }
        },
        [selectedVersions, selectedLoaders, targetInstanceId]
    );

    // 分页
    const currentPage = Math.floor(offset / LIMIT) + 1;
    const totalPages = Math.ceil(totalHits / LIMIT);

    const goToPage = React.useCallback(
        (page: number) => {
            const newOffset = (page - 1) * LIMIT;
            if (newOffset >= 0 && newOffset < totalHits && !isLoading) {
                performSearch(newOffset);
            }
        },
        [totalHits, isLoading, performSearch]
    );

    const loadMore = React.useCallback(() => {
        goToPage(currentPage + 1);
    }, [currentPage, goToPage]);

    const primaryLoaders = loaders.filter((l) => loaderConfig.primary.includes(l.name.toLowerCase()));
    const secondaryLoaders = loaders.filter((l) => loaderConfig.secondary.includes(l.name.toLowerCase()));

    return {
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
        showAllLoaders,
        setShowAllLoaders,
        versionSearchQuery,
        setVersionSearchQuery,
        projects,
        categories,
        loaders,
        gameVersions,
        totalHits,
        offset,
        isLoading,
        isDownloading,
        isFiltersLoading,
        modLoaderConfig: loaderConfig,
        primaryLoaders,
        secondaryLoaders,
        currentPage,
        totalPages,
        loadMore,
        goToPage,
        applyTargetInstanceFilters,
        handleDownload,
    };
}

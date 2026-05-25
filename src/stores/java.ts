import { create } from "zustand";
import {
    getJavaConfig,
    updateJavaEnabled,
    removeJavaFromCache,
    addManualJava,
    type JavaInstallation,
    type JavaConfig,
} from "@/lib/tauri";

interface JavaState {
    config: JavaConfig | null;
    loaded: boolean;
    load: () => Promise<void>;
    setEnabled: (path: string, enabled: boolean) => Promise<void>;
    remove: (path: string) => Promise<void>;
    addManual: (entry: JavaInstallation) => Promise<void>;
    syncFromScan: (scanned: JavaInstallation[]) => Promise<void>;
}

export const useJavaStore = create<JavaState>((set, get) => ({
    config: null,
    loaded: false,

    async load() {
        try {
            const config = await getJavaConfig();
            set({ config, loaded: true });
        } catch {
            set({ loaded: true });
        }
    },

    async setEnabled(path, enabled) {
        await updateJavaEnabled(path, enabled);
        const { config } = get();
        if (!config) return;
        const instances = config.instances.map((j) =>
            j.path === path ? { ...j, enabled } : j
        );
        set({ config: { ...config, instances } });
    },

    async remove(path) {
        await removeJavaFromCache(path);
        const { config } = get();
        if (!config) return;
        const instances = config.instances.filter((j) => j.path !== path);
        set({ config: { ...config, instances } });
    },

    async addManual(entry) {
        await addManualJava(entry);
        const { config } = get();
        if (!config) {
            set({ config: { instances: [entry] } });
            return;
        }
        if (config.instances.some((j) => j.path === entry.path)) return;
        const instances = [...config.instances, entry];
        instances.sort(
            (a, b) =>
                (b.major_version ?? 0) - (a.major_version ?? 0) ||
                a.path.localeCompare(b.path)
        );
        set({ config: { ...config, instances } });
    },

    async syncFromScan(scanned) {
        const { config } = get();
        const existing = config?.instances ?? [];

        // 保留手动添加的条目
        const manual = existing.filter((j) => j.manual);
        const manualPaths = new Set(manual.map((j) => j.path));

        // 保留已有条目的 enabled 状态
        const enabledMap = new Map(existing.map((j) => [j.path, j.enabled]));

        // 合并：手动 + 新扫描（排除手动路径）
        const merged: JavaInstallation[] = [
            ...manual,
            ...scanned
                .filter((j) => !manualPaths.has(j.path))
                .map((j) => ({
                    ...j,
                    enabled: enabledMap.get(j.path) ?? true,
                })),
        ];

        merged.sort(
            (a, b) =>
                (b.major_version ?? 0) - (a.major_version ?? 0) ||
                a.path.localeCompare(b.path)
        );

        set({ config: { instances: merged } });
    },
}));

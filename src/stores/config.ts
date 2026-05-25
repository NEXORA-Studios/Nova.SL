import { create } from "zustand";
import { getConfig, updateConfig, type AppConfig, type ThemeMode, type DefaultEditor } from "@/lib/tauri";

interface ConfigState {
    config: AppConfig | null;
    loaded: boolean;
    load: () => Promise<void>;
    setTheme: (theme: ThemeMode) => Promise<void>;
    setDefaultEditor: (editor: DefaultEditor) => Promise<void>;
    setCustomStartCommand: (command: string) => Promise<void>;
    addInstance: (id: string, name: string, path: string) => Promise<void>;
    removeInstance: (index: number) => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
    config: null,
    loaded: false,

    async load() {
        try {
            const config = await getConfig();
            set({ config, loaded: true });
        } catch {
            set({ loaded: true });
        }
    },

    async setTheme(theme) {
        const { config } = get();
        if (!config) return;
        const updated = { ...config, ui: { ...config.ui, theme } };
        await updateConfig(updated);
        set({ config: updated });
    },

    async setDefaultEditor(editor) {
        const { config } = get();
        if (!config) return;
        const updated = {
            ...config,
            ui: {
                ...config.ui,
                editor: { ...config.ui.editor, default_editor: editor },
            },
        };
        await updateConfig(updated);
        set({ config: updated });
    },

    async setCustomStartCommand(command) {
        const { config } = get();
        if (!config) return;
        const updated = {
            ...config,
            ui: {
                ...config.ui,
                editor: { ...config.ui.editor, custom_start_command: command },
            },
        };
        await updateConfig(updated);
        set({ config: updated });
    },

    async addInstance(id, name, path) {
        const { config } = get();
        if (!config) return;
        const updated = {
            ...config,
            server: {
                ...config.server,
                instances: [...config.server.instances, { id, name, path }],
            },
        };
        await updateConfig(updated);
        set({ config: updated });
    },

    async removeInstance(index) {
        const { config } = get();
        if (!config) return;
        const instances = [...config.server.instances];
        instances.splice(index, 1);
        const updated = { ...config, server: { ...config.server, instances } };
        await updateConfig(updated);
        set({ config: updated });
    },
}));

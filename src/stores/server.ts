import { create } from "zustand";

export type ServerStatus = "running" | "stopped" | "starting" | "stopping" | "crashed";

export interface ServerInstance {
    id: string;
    name: string;
    type: string;
    version: string;
    status: ServerStatus;
    players: number;
    maxPlayers: number;
    cpu: number;
    memoryUsed: number; // MB
    memoryMax: number; // MB
}

interface ServerState {
    instances: ServerInstance[];
    selectedId: string | null;
    // actions
    setInstances: (instances: ServerInstance[]) => void;
    updateInstance: (id: string, patch: Partial<ServerInstance>) => void;
    select: (id: string | null) => void;
    // computed
    runningCount: () => number;
    totalPlayers: () => number;
}

export const useServerStore = create<ServerState>((set, get) => ({
    instances: [],
    selectedId: null,

    setInstances(instances) {
        set({ instances });
    },

    updateInstance(id, patch) {
        set((state) => ({
            instances: state.instances.map((inst) =>
                inst.id === id ? { ...inst, ...patch } : inst
            ),
        }));
    },

    select(id) {
        set({ selectedId: id });
    },

    runningCount() {
        return get().instances.filter((s) => s.status === "running").length;
    },

    totalPlayers() {
        return get().instances.reduce((sum, s) => sum + s.players, 0);
    },
}));

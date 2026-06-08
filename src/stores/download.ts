import { create } from "zustand";

interface DownloadState {
    targetInstanceId: string | null;
    setTargetInstanceId: (id: string | null) => void;
}

const STORAGE_KEY = "nova-sl-download-target-instance";

function readInitialTargetInstanceId(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(STORAGE_KEY);
}

export const useDownloadStore = create<DownloadState>((set) => ({
    targetInstanceId: readInitialTargetInstanceId(),

    setTargetInstanceId(id) {
        if (typeof window !== "undefined") {
            if (id) {
                window.localStorage.setItem(STORAGE_KEY, id);
            } else {
                window.localStorage.removeItem(STORAGE_KEY);
            }
        }
        set({ targetInstanceId: id });
    },
}));

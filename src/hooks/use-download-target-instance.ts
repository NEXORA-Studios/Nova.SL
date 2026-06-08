import { useEffect, useMemo, useState } from "react";
import { useConfigStore } from "@/stores/config";
import { useDownloadStore } from "@/stores/download";
import { getInstanceConfig } from "@/lib/tauri/instance";
import type { ServerInstanceConfig } from "@/models/tauri/config";

const EMPTY_INSTANCES: ServerInstanceConfig[] = [];
const SUPPORTED_MOD_LOADERS = new Set([
    "fabric",
    "forge",
    "neoforge",
    "quilt",
    "babric",
    "bta-babric",
    "liteloader",
    "legacy-fabric",
    "ornithe",
    "nilloader",
    "modloader",
    "rift",
]);

export interface DownloadTargetInstance extends ServerInstanceConfig {
    loader: string;
    version: string;
}

export function normalizeModLoader(loader: string | undefined): string | undefined {
    const normalized = loader?.trim().toLowerCase();
    if (!normalized || !SUPPORTED_MOD_LOADERS.has(normalized)) return undefined;
    return normalized;
}

export function useDownloadTargetInstance() {
    const config = useConfigStore((s) => s.config);
    const configLoaded = useConfigStore((s) => s.loaded);
    const load = useConfigStore((s) => s.load);
    const targetInstanceId = useDownloadStore((s) => s.targetInstanceId);
    const setTargetInstanceId = useDownloadStore((s) => s.setTargetInstanceId);
    const [instances, setInstances] = useState<DownloadTargetInstance[]>([]);
    const [metadataLoaded, setMetadataLoaded] = useState(false);

    const allInstances = useMemo(() => config?.server.instances ?? EMPTY_INSTANCES, [config]);
    const selectedInstance = instances.find((instance) => instance.id === targetInstanceId) ?? null;
    const loaded = configLoaded && metadataLoaded;

    useEffect(() => {
        if (!configLoaded) {
            load();
        }
    }, [configLoaded, load]);

    useEffect(() => {
        if (!configLoaded) {
            setInstances([]);
            setMetadataLoaded(false);
            return;
        }

        let cancelled = false;

        async function loadTargetInstances() {
            setMetadataLoaded(false);

            const modInstances = await Promise.all(
                allInstances.map(async (instance) => {
                    try {
                        const instanceConfig = await getInstanceConfig(instance.path);
                        const loader = normalizeModLoader(instanceConfig.instance.loader);

                        if (!loader) return null;

                        return {
                            ...instance,
                            loader,
                            version: instanceConfig.instance.version,
                        };
                    } catch (error) {
                        console.error("Failed to load download target instance metadata:", error);
                        return null;
                    }
                })
            );

            if (cancelled) return;

            setInstances(modInstances.filter((instance): instance is DownloadTargetInstance => instance !== null));
            setMetadataLoaded(true);
        }

        void loadTargetInstances();

        return () => {
            cancelled = true;
        };
    }, [allInstances, configLoaded]);

    useEffect(() => {
        if (!loaded) return;

        if (instances.length === 0) {
            if (targetInstanceId) {
                setTargetInstanceId(null);
            }
            return;
        }

        if (!targetInstanceId || !instances.some((instance) => instance.id === targetInstanceId)) {
            setTargetInstanceId(instances[0].id);
        }
    }, [instances, loaded, setTargetInstanceId, targetInstanceId]);

    return {
        instances,
        allInstances,
        loaded,
        targetInstanceId: selectedInstance?.id ?? null,
        selectedInstance,
        setTargetInstanceId,
    };
}

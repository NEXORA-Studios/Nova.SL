/**
 * 服务器类型判断工具
 */

/** Mod 端加载器列表 */
const MOD_LOADERS = ["fabric", "forge", "quilt", "neoforge", "babric", "rift", "liteloader"];

/** Plugin 端加载器列表 */
const PLUGIN_LOADERS = [
    "paper",
    "spigot",
    "bukkit",
    "purpur",
    "folia",
    "sponge",
    "glowstone",
    "pocketmine",
    "nukkit",
    "powernukkit",
];

export interface ServerTypeInfo {
    /** 是否支持 Mod */
    isMod: boolean;
    /** 是否支持 Plugin */
    isPlugin: boolean;
    /** 是否支持 MCDR (需要额外检测) */
    hasMcdr: boolean;
}

/**
 * 根据加载器名称判断服务器类型
 * @param loader 加载器名称
 * @returns 服务器类型信息
 */
export function getServerTypeByLoader(loader?: string): Pick<ServerTypeInfo, "isMod" | "isPlugin"> {
    if (!loader) {
        return { isMod: false, isPlugin: false };
    }

    const normalizedLoader = loader.toLowerCase().trim();

    return {
        isMod: MOD_LOADERS.includes(normalizedLoader),
        isPlugin: PLUGIN_LOADERS.includes(normalizedLoader),
    };
}

/**
 * 判断是否为 Mod 端服务器
 */
export function isModServer(loader?: string): boolean {
    return getServerTypeByLoader(loader).isMod;
}

/**
 * 判断是否为 Plugin 端服务器
 */
export function isPluginServer(loader?: string): boolean {
    return getServerTypeByLoader(loader).isPlugin;
}

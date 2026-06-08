import type { ConfigFileDefinition, ConfigField, ConfigCategory } from "@/models/server-config/types";
import { serverPropertiesDefinition } from "./server-properties-definition";

// 字段元数据映射（用于动态生成配置）
const FIELD_METADATA: Record<
    string,
    {
        label: string;
        description?: string;
        type: ConfigField["type"];
        options?: { value: string; label: string }[];
        min?: number;
        max?: number;
        step?: number;
    }
> = {};

// 从完整定义中提取元数据
for (const category of serverPropertiesDefinition.categories) {
    for (const field of category.fields) {
        FIELD_METADATA[field.key] = {
            label: field.label,
            description: field.description,
            type: field.type,
            options: field.options,
            min: field.min,
            max: field.max,
            step: field.step,
        };
    }
}

// 分类规则：根据 key 前缀或已知模式判断所属分类
function categorizeKey(key: string): string {
    if (key.startsWith("rcon.") || key.startsWith("query.") || key === "enable-rcon" || key === "enable-query") {
        return "query";
    }
    if (key.startsWith("management-server-")) {
        return "management";
    }
    if (key.startsWith("resource-pack")) {
        return "resourcepack";
    }
    if (key.startsWith("initial-") || key.includes("pack")) {
        return "datapack";
    }
    if (key.startsWith("text-filtering")) {
        return "filtering";
    }
    if (
        key.includes("broadcast") ||
        key.includes("log-") ||
        key === "debug" ||
        key.includes("jmx") ||
        key.includes("heartbeat") ||
        key.includes("bug-report")
    ) {
        return "logging";
    }
    if (key.includes("view-distance") || key.includes("simulation-distance") || key.includes("broadcast-range")) {
        return "view";
    }
    if (
        key.includes("network") ||
        key.includes("compression") ||
        key.includes("rate-limit") ||
        key.includes("proxy") ||
        key.includes("sync-chunk") ||
        key.includes("native-transport") ||
        key.includes("tick-time") ||
        key.includes("world-size") ||
        key.includes("chained") ||
        key === "enable-status"
    ) {
        return "network";
    }
    if (
        key.includes("permission") ||
        key.includes("whitelist") ||
        key.includes("op-") ||
        key.includes("spawn-protection") ||
        key.includes("allow-flight") ||
        key.includes("hide-online") ||
        key.includes("enforce")
    ) {
        return "player";
    }
    if (key.includes("generate-structures") || key.includes("generator-settings") || key.includes("level-")) {
        return "worldgen";
    }

    // 默认分类
    return "basic";
}

// 分类标题映射
const CATEGORY_TITLES: Record<string, { title: string; description: string }> = {
    basic: { title: "基础服务器设置", description: "服务器的核心运行参数" },
    worldgen: { title: "世界生成", description: "世界生成相关设置" },
    player: { title: "玩家与权限", description: "玩家行为和权限设置" },
    view: { title: "视距与模拟", description: "渲染距离和模拟距离设置" },
    network: { title: "网络与性能", description: "网络和性能优化设置" },
    query: { title: "Query / RCON", description: "远程查询和控制设置" },
    management: { title: "管理服务器", description: "Minecraft 1.21+ 管理服务器 API（实验性）" },
    resourcepack: { title: "资源包", description: "服务器资源包设置" },
    datapack: { title: "数据包", description: "默认数据包设置" },
    filtering: { title: "文本过滤", description: "聊天文本过滤设置" },
    logging: { title: "日志与调试", description: "日志和调试相关设置" },
};

// 推断字段类型和默认值
function inferFieldType(key: string, value: string): Omit<ConfigField, "key"> {
    // 先查找预定义元数据
    const metadata = FIELD_METADATA[key];
    if (metadata) {
        return {
            label: metadata.label,
            description: metadata.description,
            type: metadata.type,
            value: parseValue(value, metadata.type),
            options: metadata.options,
            min: metadata.min,
            max: metadata.max,
            step: metadata.step,
        };
    }

    // 自动推断类型
    const lowerValue = value.toLowerCase();

    // 布尔值判断
    if (lowerValue === "true" || lowerValue === "false") {
        return {
            label: formatLabel(key),
            type: "boolean",
            value: lowerValue === "true",
        };
    }

    // 数字判断
    if (/^-?\d+$/.test(value)) {
        const num = parseInt(value);
        return {
            label: formatLabel(key),
            type: "number",
            value: num,
        };
    }

    // 默认字符串
    return {
        label: formatLabel(key),
        type: "string",
        value: value,
    };
}

// 解析值到正确类型
function parseValue(value: string, type: ConfigField["type"]): string | number | boolean {
    switch (type) {
        case "boolean":
            return value.toLowerCase() === "true";
        case "number":
            return Number(value) || 0;
        default:
            return value;
    }
}

// 格式化 key 为可读标签
function formatLabel(key: string): string {
    return key
        .replace(/-/g, " ")
        .replace(/\./g, " - ")
        .replace(/_/g, " ")
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

// 根据实际存在的 key 列表生成动态配置定义
export function generateDynamicConfigDefinition(keys: string[], values: Record<string, string>): ConfigFileDefinition {
    // 按分类分组
    const categorized: Record<string, ConfigField[]> = {};

    for (const key of keys) {
        const category = categorizeKey(key);
        const fieldInfo = inferFieldType(key, values[key] ?? "");

        if (!categorized[category]) {
            categorized[category] = [];
        }

        categorized[category].push({
            key,
            ...fieldInfo,
        });
    }

    // 构建分类列表（保持固定顺序）
    const categoryOrder = [
        "basic",
        "worldgen",
        "player",
        "view",
        "network",
        "query",
        "management",
        "resourcepack",
        "datapack",
        "filtering",
        "logging",
    ];

    const categories: ConfigCategory[] = [];
    for (const catId of categoryOrder) {
        if (categorized[catId] && categorized[catId].length > 0) {
            const meta = CATEGORY_TITLES[catId];
            categories.push({
                id: catId,
                title: meta?.title || catId,
                description: meta?.description,
                fields: categorized[catId],
            });
        }
    }

    // 处理未分类的 key
    const otherKeys = Object.keys(categorized).filter((k) => !categoryOrder.includes(k));
    for (const catId of otherKeys) {
        if (categorized[catId].length > 0) {
            categories.push({
                id: catId,
                title: formatLabel(catId),
                fields: categorized[catId],
            });
        }
    }

    return {
        type: "server.properties",
        filename: "server.properties",
        title: "server.properties",
        description: "Minecraft 服务器的核心配置文件",
        categories,
    };
}

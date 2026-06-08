// 配置文件类型
export type ConfigFileType = "server.properties" | "bukkit.yml" | "spigot.yml" | "paper-global.yml" | "custom";

// 配置项数据类型
export type ConfigValue = string | number | boolean;

// 配置项定义
export interface ConfigField {
    key: string;
    value: ConfigValue;
    type: "string" | "number" | "boolean" | "select" | "textarea";
    label: string;
    description?: string;
    options?: { value: string; label: string }[]; // 用于 select 类型
    min?: number; // 用于 number 类型
    max?: number; // 用于 number 类型
    step?: number; // 用于 number 类型
    placeholder?: string;
}

// 配置分类
export interface ConfigCategory {
    id: string;
    title: string;
    icon?: string;
    description?: string;
    fields: ConfigField[];
}

// 配置文件定义
export interface ConfigFileDefinition {
    type: ConfigFileType;
    filename: string;
    title: string;
    description: string;
    categories: ConfigCategory[];
}

// 配置文件内容（键值对形式）
export type ConfigFileContent = Record<string, ConfigValue>;

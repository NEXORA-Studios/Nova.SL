import type { ConfigFileDefinition, ConfigField } from "../../models/server-config/types";

// 辅助函数：创建配置字段
function field(
    key: string,
    value: string | number | boolean,
    type: ConfigField["type"],
    label: string,
    description?: string,
    extra?: Partial<ConfigField>
): ConfigField {
    return { key, value, type, label, description, ...extra };
}

// server.properties 完整配置定义
export const serverPropertiesDefinition: ConfigFileDefinition = {
    type: "server.properties",
    filename: "server.properties",
    title: "server.properties",
    description: "Minecraft 服务器的核心配置文件",
    categories: [
        {
            id: "basic",
            title: "基础服务器设置",
            description: "服务器的核心运行参数",
            fields: [
                field(
                    "accepts-transfers",
                    false,
                    "boolean",
                    "接受服务器转移",
                    "是否接受来自其他服务器的转移（Velocity/Bungee 新功能）"
                ),
                field("difficulty", "easy", "select", "游戏难度", "游戏难度级别", {
                    options: [
                        { value: "peaceful", label: "和平 (Peaceful)" },
                        { value: "easy", label: "简单 (Easy)" },
                        { value: "normal", label: "普通 (Normal)" },
                        { value: "hard", label: "困难 (Hard)" },
                    ],
                }),
                field("force-gamemode", false, "boolean", "强制游戏模式", "玩家进入服务器时是否强制切换到默认游戏模式"),
                field("gamemode", "survival", "select", "默认游戏模式", "新玩家的默认游戏模式", {
                    options: [
                        { value: "survival", label: "生存 (Survival)" },
                        { value: "creative", label: "创造 (Creative)" },
                        { value: "adventure", label: "冒险 (Adventure)" },
                        { value: "spectator", label: "旁观 (Spectator)" },
                    ],
                }),
                field("hardcore", false, "boolean", "极限模式", "是否启用极限模式（死亡后封禁）"),
                field("level-name", "world", "string", "世界名称", "世界文件夹名称"),
                field("level-seed", "", "string", "世界种子", "世界生成种子，留空则随机生成"),
                field("level-type", "minecraft:normal", "select", "世界类型", "世界生成类型", {
                    options: [
                        { value: "minecraft:normal", label: "普通 (Normal)" },
                        { value: "minecraft:flat", label: "超平坦 (Flat)" },
                        { value: "minecraft:large_biomes", label: "巨型生物群系 (Large Biomes)" },
                        { value: "minecraft:amplified", label: "放大化 (Amplified)" },
                        { value: "minecraft:single_biome_surface", label: "单一生物群系 (Single Biome)" },
                    ],
                }),
                field("max-players", 20, "number", "最大玩家数", "服务器允许的最大同时在线玩家数量", { min: 1, max: 1000 }),
                field("motd", "A Minecraft Server", "string", "服务器描述", "服务器列表中显示的描述文本（MOTD）"),
                field("online-mode", true, "boolean", "正版验证", "是否启用正版验证（强烈建议开启，关闭后可能有安全风险）"),
                field("pause-when-empty-seconds", -1, "number", "无玩家暂停", "无玩家时暂停服务器的时间（秒），-1 为禁用", {
                    min: -1,
                }),
                field("player-idle-timeout", 0, "number", "AFK 踢出时间", "玩家空闲自动踢出时间（分钟），0 为禁用", { min: 0 }),
                field("server-ip", "", "string", "绑定 IP", "服务器绑定的 IP 地址，通常留空"),
                field("server-port", 25565, "number", "服务器端口", "服务器监听的端口", { min: 1, max: 65535 }),
                field("white-list", false, "boolean", "白名单", "是否启用白名单（仅允许白名单中的玩家加入）"),
            ],
        },
        {
            id: "worldgen",
            title: "世界生成",
            description: "世界生成相关设置",
            fields: [
                field("generate-structures", true, "boolean", "生成结构", "是否生成村庄、地牢、要塞等结构"),
                field("generator-settings", "", "textarea", "生成器设置", "世界生成器的额外 JSON 设置"),
            ],
        },
        {
            id: "player",
            title: "玩家与权限",
            description: "玩家行为和权限设置",
            fields: [
                field("allow-flight", false, "boolean", "允许飞行", "是否允许玩家飞行（关闭会踢掉飞行中的玩家）"),
                field("enforce-secure-profile", true, "boolean", "强制安全配置", "强制安全玩家配置（聊天签名验证）"),
                field(
                    "enforce-whitelist",
                    false,
                    "boolean",
                    "强制执行白名单",
                    "是否强制执行白名单（开启后非白名单玩家会被踢出）"
                ),
                field("function-permission-level", 2, "number", "函数权限等级", "数据包函数的默认权限等级", { min: 1, max: 4 }),
                field("hide-online-players", false, "boolean", "隐藏在线玩家", "Ping 服务器时是否隐藏在线玩家列表"),
                field("op-permission-level", 4, "number", "OP 权限等级", "OP 玩家的默认权限等级（1~4）", { min: 1, max: 4 }),
                field("spawn-protection", 16, "number", "出生点保护", "出生点保护半径（仅 OP 可在此范围内修改方块）", {
                    min: 0,
                }),
            ],
        },
        {
            id: "view",
            title: "视距与模拟",
            description: "渲染距离和模拟距离设置",
            fields: [
                field("entity-broadcast-range-percentage", 100, "number", "实体广播范围", "实体广播距离百分比", {
                    min: 10,
                    max: 1000,
                    step: 10,
                }),
                field("simulation-distance", 10, "number", "模拟距离", "模拟距离（影响红石、生物 AI 等）", { min: 3, max: 32 }),
                field("view-distance", 10, "number", "视距", "玩家可见区块距离", { min: 3, max: 32 }),
            ],
        },
        {
            id: "network",
            title: "网络与性能",
            description: "网络和性能优化设置",
            fields: [
                field("enable-status", true, "boolean", "允许状态查询", "是否允许服务器状态查询（Ping）"),
                field("max-chained-neighbor-updates", 1000000, "number", "连锁更新上限", "连锁方块更新上限（防止卡服）", {
                    min: 0,
                }),
                field("max-tick-time", 60000, "number", "最大 Tick 时间", "单个 Tick 最大执行时间（毫秒）", { min: 0 }),
                field("max-world-size", 29999984, "number", "世界边界大小", "世界边界大小（方块）", { min: 1 }),
                field(
                    "network-compression-threshold",
                    256,
                    "number",
                    "网络压缩阈值",
                    "网络数据包压缩阈值（字节），0 为禁用，-1 为全部压缩",
                    { min: -1 }
                ),
                field("prevent-proxy-connections", false, "boolean", "阻止代理连接", "是否阻止代理连接"),
                field("rate-limit", 0, "number", "连接速率限制", "连接速率限制，0 为禁用", { min: 0 }),
                field("sync-chunk-writes", true, "boolean", "同步区块写入", "是否同步写入区块（更安全但更慢）"),
                field("use-native-transport", true, "boolean", "原生网络传输", "使用系统原生网络传输（Linux epoll 等）"),
            ],
        },
        {
            id: "query",
            title: "Query / RCON",
            description: "远程查询和控制设置",
            fields: [
                field("enable-query", false, "boolean", "启用 Query", "是否启用 GameSpy4 Query 协议"),
                field("enable-rcon", false, "boolean", "启用 RCON", "是否启用 RCON 远程控制"),
                field("query.port", 25565, "number", "Query 端口", "Query 协议端口", { min: 1, max: 65535 }),
                field("rcon.password", "", "string", "RCON 密码", "RCON 远程控制密码（留空则随机生成）"),
                field("rcon.port", 25575, "number", "RCON 端口", "RCON 远程控制端口", { min: 1, max: 65535 }),
            ],
        },
        {
            id: "management",
            title: "管理服务器",
            description: "Minecraft 1.21+ 管理服务器 API（实验性）",
            fields: [
                field("management-server-allowed-origins", "", "string", "允许来源", "管理服务器允许的跨域来源"),
                field("management-server-enabled", false, "boolean", "启用管理服务器", "是否启用管理服务器 API"),
                field("management-server-host", "localhost", "string", "监听地址", "管理服务器监听地址"),
                field("management-server-port", 0, "number", "监听端口", "管理服务器端口，0 为自动分配", {
                    min: 0,
                    max: 65535,
                }),
                field("management-server-secret", "", "string", "认证密钥", "管理服务器认证密钥"),
                field("management-server-tls-enabled", true, "boolean", "启用 TLS", "是否启用 TLS 加密"),
                field("management-server-tls-keystore", "", "string", "证书路径", "TLS 证书密钥库路径"),
                field("management-server-tls-keystore-password", "", "string", "证书密码", "TLS 证书密钥库密码"),
            ],
        },
        {
            id: "resourcepack",
            title: "资源包",
            description: "服务器资源包设置",
            fields: [
                field("require-resource-pack", false, "boolean", "强制资源包", "是否强制玩家安装服务器资源包"),
                field("resource-pack", "", "string", "资源包 URL", "资源包下载地址"),
                field("resource-pack-id", "", "string", "资源包 ID", "资源包唯一标识符"),
                field("resource-pack-prompt", "", "string", "资源包提示", "资源包提示文本"),
                field("resource-pack-sha1", "", "string", "资源包 SHA1", "资源包 SHA1 校验值"),
            ],
        },
        {
            id: "datapack",
            title: "数据包",
            description: "默认数据包设置",
            fields: [
                field("initial-disabled-packs", "", "string", "默认禁用", "默认禁用的数据包"),
                field("initial-enabled-packs", "vanilla", "string", "默认启用", "默认启用的数据包"),
            ],
        },
        {
            id: "filtering",
            title: "文本过滤",
            description: "聊天文本过滤设置",
            fields: [
                field("text-filtering-config", "", "string", "过滤配置", "文本过滤配置文件路径"),
                field("text-filtering-version", 0, "number", "过滤版本", "文本过滤版本", { min: 0 }),
            ],
        },
        {
            id: "logging",
            title: "日志与调试",
            description: "日志和调试相关设置",
            fields: [
                field("broadcast-console-to-ops", true, "boolean", "广播控制台消息", "是否把控制台消息广播给 OP 玩家"),
                field("broadcast-rcon-to-ops", true, "boolean", "广播 RCON 消息", "是否把 RCON 消息广播给 OP 玩家"),
                field("bug-report-link", "", "string", "崩溃报告链接", "崩溃报告提交链接"),
                field("debug", false, "boolean", "调试模式", "是否启用调试模式"),
                field("enable-code-of-conduct", false, "boolean", "行为准则", "是否启用行为准则提示"),
                field("enable-jmx-monitoring", false, "boolean", "JMX 监控", "是否启用 JMX 监控"),
                field("log-ips", true, "boolean", "记录 IP", "是否在日志中记录玩家 IP 地址"),
                field("status-heartbeat-interval", 0, "number", "状态心跳间隔", "状态心跳间隔（毫秒），0 为禁用", { min: 0 }),
            ],
        },
    ],
};

// 获取默认配置值
export function getDefaultServerProperties(): Record<string, string | number | boolean> {
    const defaults: Record<string, string | number | boolean> = {};
    for (const category of serverPropertiesDefinition.categories) {
        for (const field of category.fields) {
            defaults[field.key] = field.value;
        }
    }
    return defaults;
}

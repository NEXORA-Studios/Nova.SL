/**
 * Modrinth API 类型定义
 */

/** 搜索响应 */
export interface SearchResponse {
    hits: SearchResult[];
    offset: number;
    limit: number;
    total_hits: number;
}

/** 搜索结果项目（搜索 API 返回的简化结构） */
export interface SearchResult {
    project_id: string;
    project_type: string;
    slug: string;
    author: string;
    author_id: string;
    title: string;
    description: string;
    categories: string[];
    display_categories: string[];
    versions: string[];
    downloads: number;
    follows: number;
    icon_url?: string;
    date_created: string;
    date_modified: string;
    latest_version?: string;
    license: License;
    client_side: SideSupport;
    server_side: SideSupport;
    gallery: string[];
    featured_gallery?: string;
    color?: number;
    loaders: string[];
}

/** 项目详情（完整结构） */
export interface Project {
    id: string;
    slug: string;
    project_type: string;
    team: string;
    title: string;
    description: string;
    body?: string;
    published: string;
    updated: string;
    approved?: string;
    queued?: string;
    status: string;
    requested_status?: string;
    moderator_message?: ModeratorMessage;
    license: License;
    client_side: SideSupport;
    server_side: SideSupport;
    downloads: number;
    followers: number;
    categories: string[];
    additional_categories: string[];
    game_versions: string[];
    loaders: string[];
    versions: string[];
    icon_url?: string;
    issues_url?: string;
    source_url?: string;
    wiki_url?: string;
    discord_url?: string;
    donation_urls: DonationUrl[];
    gallery: GalleryImage[];
    color?: number;
    thread_id?: string;
    monetization_status?: string;
    organization?: string;
}

/** 审核消息 */
export interface ModeratorMessage {
    message: string;
    body?: string;
}

/** 许可证信息 */
export interface License {
    id: string;
    name: string;
    url?: string;
}

/** 端支持类型 */
export type SideSupport = "required" | "optional" | "unsupported" | "unknown";

/** 捐赠链接 */
export interface DonationUrl {
    id: string;
    platform: string;
    url: string;
}

/** 画廊图片 */
export interface GalleryImage {
    url: string;
    featured: boolean;
    title?: string;
    description?: string;
    created: string;
    ordering: number;
}

/** 版本信息 */
export interface Version {
    id: string;
    project_id: string;
    author_id: string;
    featured: boolean;
    name: string;
    version_number: string;
    changelog?: string;
    changelog_url?: string;
    date_published: string;
    downloads: number;
    version_type: VersionType;
    status: VersionStatus;
    requested_status?: VersionStatus;
    files: File[];
    dependencies: Dependency[];
    game_versions: string[];
    loaders: string[];
}

/** 版本类型 */
export type VersionType = "release" | "beta" | "alpha";

/** 版本状态 */
export type VersionStatus = "listed" | "archived" | "draft" | "unlisted" | "scheduled" | "unknown";

/** 文件信息 */
export interface File {
    hashes: FileHashes;
    url: string;
    filename: string;
    primary: boolean;
    size: number;
    file_type?: FileType;
}

/** 文件哈希 */
export interface FileHashes {
    sha512: string;
    sha1: string;
}

/** 文件类型 */
export type FileType = "required_resource_pack" | "optional_resource_pack";

/** 依赖信息 */
export interface Dependency {
    version_id?: string;
    project_id?: string;
    file_name?: string;
    dependency_type: DependencyType;
}

/** 依赖类型 */
export type DependencyType = "required" | "optional" | "incompatible" | "embedded";

/** 分类 */
export interface Category {
    icon: string;
    name: string;
    project_type: string;
    header: string;
}

/** 加载器 */
export interface Loader {
    icon: string;
    name: string;
    supported_project_types: string[];
}

/** 游戏版本 */
export interface GameVersion {
    version: string;
    version_type: GameVersionType;
    date: string;
    major: boolean;
}

/** 游戏版本类型 */
export type GameVersionType = "release" | "snapshot" | "alpha" | "beta";

/** 搜索过滤器 */
export interface SearchFilters {
    /** 项目类型 (mod, modpack, resourcepack, shader, datapack, plugin) */
    project_type?: string;
    /** 游戏版本列表 */
    game_versions: string[];
    /** 加载器列表 */
    loaders: string[];
    /** 分类列表 */
    categories: string[];
    /** 客户端支持 */
    client_side?: SideSupport;
    /** 服务端支持 */
    server_side?: SideSupport;
    /** 开源项目 */
    open_source?: boolean;
    /** 排序方式 (relevance, downloads, follows, newest, updated) */
    index?: string;
    /** 偏移量 */
    offset?: number;
    /** 每页数量 */
    limit?: number;
}

/** 哈希算法 */
export type HashAlgorithm = "sha1" | "sha512";

/** 下载结果 */
export interface DownloadResult {
    file_path: string;
    filename: string;
    version_id: string;
    project_id: string;
}

use serde::{Deserialize, Serialize};

/// Modrinth API 基础 URL
pub const MODRINTH_API_BASE: &str = "https://api.modrinth.com/v2";

/// 搜索响应
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResponse {
    pub hits: Vec<SearchResult>,
    pub offset: u32,
    pub limit: u32,
    pub total_hits: u32,
}

/// 搜索结果项目（搜索 API 返回的简化结构）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    #[serde(rename = "project_id")]
    pub id: String,
    pub project_type: String,
    pub slug: String,
    pub author: String,
    #[serde(rename = "author_id")]
    pub author_id: String,
    pub title: String,
    pub description: String,
    pub categories: Vec<String>,
    #[serde(rename = "display_categories")]
    pub display_categories: Vec<String>,
    pub versions: Vec<String>,
    pub downloads: u64,
    pub follows: u64,
    #[serde(rename = "icon_url")]
    pub icon_url: Option<String>,
    #[serde(rename = "date_created")]
    pub date_created: String,
    #[serde(rename = "date_modified")]
    pub date_modified: String,
    #[serde(rename = "latest_version")]
    pub latest_version: Option<String>,
    pub license: License,
    #[serde(rename = "client_side")]
    pub client_side: SideSupport,
    #[serde(rename = "server_side")]
    pub server_side: SideSupport,
    pub gallery: Vec<String>,
    #[serde(rename = "featured_gallery")]
    pub featured_gallery: Option<String>,
    pub color: Option<u32>,
    #[serde(default)]
    pub loaders: Vec<String>,
}

/// 项目（模组/插件/资源包等）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub slug: String,
    pub project_type: String,
    pub team: String,
    pub title: String,
    pub description: Option<String>,
    pub body: Option<String>,
    #[serde(rename = "body_url")]
    pub body_url: Option<String>,
    pub published: String,
    pub updated: String,
    pub approved: Option<String>,
    pub queued: Option<String>,
    pub status: ProjectStatus,
    pub requested_status: Option<ProjectStatus>,
    pub moderator_message: Option<ModeratorMessage>,
    pub license: License,
    pub client_side: SideSupport,
    pub server_side: SideSupport,
    pub downloads: u64,
    pub followers: u64,
    pub categories: Vec<String>,
    #[serde(default)]
    pub additional_categories: Vec<String>,
    pub game_versions: Vec<String>,
    pub loaders: Vec<String>,
    pub versions: Vec<String>,
    pub icon_url: Option<String>,
    pub issues_url: Option<String>,
    pub source_url: Option<String>,
    pub wiki_url: Option<String>,
    pub discord_url: Option<String>,
    #[serde(default)]
    pub donation_urls: Vec<DonationUrl>,
    #[serde(default)]
    pub gallery: Vec<GalleryImage>,
    pub color: Option<u32>,
    pub thread_id: Option<String>,
    pub monetization_status: Option<String>,
    pub organization: Option<String>,
}

/// 审核消息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModeratorMessage {
    pub message: String,
    pub body: Option<String>,
}

/// 捐赠链接
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DonationUrl {
    pub id: String,
    pub platform: String,
    pub url: String,
}

/// 画廊图片
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GalleryImage {
    pub url: String,
    #[serde(rename = "raw_url")]
    pub raw_url: Option<String>,
    pub featured: bool,
    pub title: Option<String>,
    pub description: Option<String>,
    pub created: String,
    pub ordering: u32,
}

/// 许可证信息 - 支持对象或字符串格式
#[derive(Debug, Clone, Serialize)]
pub struct License {
    pub id: String,
    pub name: String,
    pub url: Option<String>,
}

impl<'de> Deserialize<'de> for License {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        use serde::de::{self, MapAccess, Visitor};
        use std::fmt;

        struct LicenseVisitor;

        impl<'de> Visitor<'de> for LicenseVisitor {
            type Value = License;

            fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
                formatter.write_str("a license object or a license ID string")
            }

            fn visit_str<E>(self, value: &str) -> Result<Self::Value, E>
            where
                E: de::Error,
            {
                // 如果是字符串，将其作为 id 和 name
                Ok(License {
                    id: value.to_string(),
                    name: value.to_string(),
                    url: None,
                })
            }

            fn visit_map<M>(self, mut map: M) -> Result<Self::Value, M::Error>
            where
                M: MapAccess<'de>,
            {
                let mut id = None;
                let mut name = None;
                let mut url = None;

                while let Some(key) = map.next_key::<String>()? {
                    match key.as_str() {
                        "id" => id = Some(map.next_value()?),
                        "name" => name = Some(map.next_value()?),
                        "url" => url = map.next_value::<Option<String>>()?,
                        _ => {
                            let _: serde_json::Value = map.next_value()?;
                        }
                    }
                }

                Ok(License {
                    id: id.unwrap_or_default(),
                    name: name.unwrap_or_default(),
                    url,
                })
            }
        }

        deserializer.deserialize_any(LicenseVisitor)
    }
}

/// 端支持类型
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SideSupport {
    Required,
    Optional,
    Unsupported,
    Unknown,
}

/// 版本信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Version {
    pub id: String,
    pub project_id: String,
    pub author_id: String,
    pub featured: bool,
    pub name: String,
    pub version_number: String,
    pub changelog: Option<String>,
    pub changelog_url: Option<String>,
    pub date_published: String,
    pub downloads: u64,
    pub version_type: VersionType,
    pub status: VersionStatus,
    pub requested_status: Option<VersionStatus>,
    pub files: Vec<File>,
    pub dependencies: Vec<Dependency>,
    pub game_versions: Vec<String>,
    pub loaders: Vec<String>,
}

/// 版本类型
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum VersionType {
    Release,
    Beta,
    Alpha,
}

/// 版本状态
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum VersionStatus {
    Listed,
    Archived,
    Draft,
    Unlisted,
    Scheduled,
    Unknown,
}

/// 项目状态
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProjectStatus {
    Approved,
    Archived,
    Rejected,
    Draft,
    Unlisted,
    Processing,
    Withheld,
    Scheduled,
    Private,
    Unknown,
}

/// 文件信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct File {
    pub hashes: FileHashes,
    pub url: String,
    pub filename: String,
    pub primary: bool,
    pub size: u64,
    pub file_type: Option<FileType>,
}

/// 文件哈希
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileHashes {
    pub sha512: String,
    pub sha1: String,
}

/// 文件类型
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FileType {
    RequiredResourcePack,
    OptionalResourcePack,
    SourcesJar,
    DevJar,
    JavadocJar,
    Unknown,
    Signature,
}

/// 依赖信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Dependency {
    pub version_id: Option<String>,
    pub project_id: Option<String>,
    pub file_name: Option<String>,
    pub dependency_type: DependencyType,
}

/// 依赖类型
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DependencyType {
    Required,
    Optional,
    Incompatible,
    Embedded,
}

/// 分类
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub icon: String,
    pub name: String,
    pub project_type: String,
    pub header: String,
}

/// 加载器
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Loader {
    pub icon: String,
    pub name: String,
    pub supported_project_types: Vec<String>,
}

/// 游戏版本
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameVersion {
    pub version: String,
    pub version_type: GameVersionType,
    pub date: String,
    pub major: bool,
}

/// 游戏版本类型
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum GameVersionType {
    Release,
    Snapshot,
    Alpha,
    Beta,
}

/// 搜索过滤器
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SearchFilters {
    /// 项目类型 (mod, modpack, resourcepack, shader, datapack, plugin)
    pub project_type: Option<String>,
    /// 游戏版本列表
    pub game_versions: Vec<String>,
    /// 加载器列表
    pub loaders: Vec<String>,
    /// 分类列表
    pub categories: Vec<String>,
    /// 客户端支持
    pub client_side: Option<SideSupport>,
    /// 服务端支持
    pub server_side: Option<SideSupport>,
    /// 开源项目
    pub open_source: Option<bool>,
    /// 排序方式 (relevance, downloads, follows, newest, updated)
    pub index: Option<String>,
    /// 偏移量
    pub offset: Option<u32>,
    /// 每页数量
    pub limit: Option<u32>,
}

impl SearchFilters {
    /// 构建 facets JSON 字符串
    pub fn build_facets(&self) -> String {
        let mut facets: Vec<String> = Vec::new();

        // 项目类型
        if let Some(ref pt) = self.project_type {
            facets.push(format!("\"project_type:{}\"", pt));
        }

        // 游戏版本
        for version in &self.game_versions {
            facets.push(format!("\"versions:{}\"", version));
        }

        // 加载器
        for loader in &self.loaders {
            facets.push(format!("\"categories:{}\"", loader));
        }

        // 分类
        for category in &self.categories {
            facets.push(format!("\"categories:{}\"", category));
        }

        // 客户端支持
        if let Some(ref side) = self.client_side {
            facets.push(format!(
                "\"client_side:{}\"",
                serde_json::to_string(side)
                    .unwrap_or_default()
                    .trim_matches('"')
            ));
        }

        // 服务端支持
        if let Some(ref side) = self.server_side {
            facets.push(format!(
                "\"server_side:{}\"",
                serde_json::to_string(side)
                    .unwrap_or_default()
                    .trim_matches('"')
            ));
        }

        if facets.is_empty() {
            String::new()
        } else {
            format!("[[{}]]", facets.join(","))
        }
    }

    /// 构建 facets JSON 字符串，所有条件使用 AND 逻辑
    ///
    /// 每个 facet 条件单独成组，组之间是 AND 关系
    /// 例如: `[["project_type:mod"],["categories:forge"],["client_side:optional"]]`
    /// 表示 project_type:mod AND categories:forge AND client_side:optional
    pub fn build_facets_with_and(&self) -> String {
        let mut facets: Vec<String> = Vec::new();

        // 项目类型
        if let Some(ref pt) = self.project_type {
            facets.push(format!("\"project_type:{}\"", pt));
        }

        // 游戏版本
        for version in &self.game_versions {
            facets.push(format!("\"versions:{}\"", version));
        }

        // 加载器
        for loader in &self.loaders {
            facets.push(format!("\"categories:{}\"", loader));
        }

        // 分类
        for category in &self.categories {
            facets.push(format!("\"categories:{}\"", category));
        }

        // 硬编码排除必须客户端的模组（client_side != required）
        facets.push("\"client_side!=required\"".to_string());

        // 服务端支持
        if let Some(ref side) = self.server_side {
            facets.push(format!(
                "\"server_side:{}\"",
                serde_json::to_string(side)
                    .unwrap_or_default()
                    .trim_matches('"')
            ));
        }

        if facets.is_empty() {
            String::new()
        } else {
            // 每个条件单独成组，实现纯 AND 逻辑
            format!(
                "[{}]",
                facets
                    .iter()
                    .map(|f| format!("[{}]", f))
                    .collect::<Vec<_>>()
                    .join(",")
            )
        }
    }

    /// 构建 URL 参数
    pub fn build_params(&self) -> Vec<(&str, String)> {
        let mut params: Vec<(&str, String)> = Vec::new();

        if let Some(ref index) = self.index {
            params.push(("index", index.clone()));
        }

        if let Some(offset) = self.offset {
            params.push(("offset", offset.to_string()));
        }

        if let Some(limit) = self.limit {
            params.push(("limit", limit.to_string()));
        }

        params
    }
}

/// 哈希算法
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum HashAlgorithm {
    Sha1,
    Sha512,
}

impl std::fmt::Display for HashAlgorithm {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            HashAlgorithm::Sha1 => write!(f, "sha1"),
            HashAlgorithm::Sha512 => write!(f, "sha512"),
        }
    }
}

use reqwest::Client;
use std::path::Path;

use super::cache::{make_key, ModrinthCache};
use super::models::*;
use super::ModrinthError;
use crate::core::app::config::CacheConfig;
use tauri::{AppHandle, Manager};

/// Modrinth API 客户端
#[derive(Debug, Clone)]
pub struct ModrinthClient {
    client: Client,
    base_url: String,
    cache: Option<ModrinthCache>,
    cache_config: CacheConfig,
}

impl ModrinthClient {
    /// 创建新的 Modrinth 客户端
    pub fn new(app_handle: &AppHandle) -> Self {
        let cache_dir = app_handle
            .path()
            .app_cache_dir()
            .expect("failed to get app cache dir")
            .join("modrinth_cache");

        let cache_config = crate::core::app::config::load(app_handle)
            .map(|cfg| cfg.modrinth_cache)
            .unwrap_or_default();

        let cache = ModrinthCache::new(cache_dir);

        let client = Client::builder()
            .user_agent("Nova.SL/0.1.0 (Minecraft Server Launcher)")
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("Failed to build HTTP client");

        Self {
            client,
            base_url: MODRINTH_API_BASE.to_string(),
            cache: Some(cache),
            cache_config,
        }
    }

    /// 使用自定义 base URL（用于测试）
    pub fn with_base_url(base_url: String) -> Self {
        let client = Client::builder()
            .user_agent("Nova.SL/0.1.0 (Minecraft Server Launcher)")
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("Failed to build HTTP client");

        Self {
            client,
            base_url,
            cache: None,
            cache_config: CacheConfig::default(),
        }
    }

    /// 搜索项目
    pub async fn search_projects(
        &self,
        query: &str,
        filters: SearchFilters,
    ) -> Result<SearchResponse, ModrinthError> {
        let url = format!("{}/search", self.base_url);

        // 构建查询参数
        let mut params: Vec<(String, String)> = vec![("query".to_string(), query.to_string())];

        // 添加过滤器参数
        for (key, value) in filters.build_params() {
            params.push((key.to_string(), value));
        }

        // 构建 facets（使用 AND 逻辑分组，确保 client_side 等条件是 AND 关系）
        let facets = filters.build_facets_with_and();

        log::debug!("[modrinth] Searching: {} with params: {:?}", url, params);
        log::debug!("[modrinth] Facets: {:?}", facets);

        // 构建缓存 key URL（与请求 URL 完全一致）
        let mut key_parts = vec![format!("query={}", query)];
        for (k, v) in &params {
            if k != "query" {
                key_parts.push(format!("{}={}", k, v));
            }
        }
        if !facets.is_empty() {
            key_parts.push(format!("facets={}", facets));
        }
        let cache_key_url = format!("{}?{}", url, key_parts.join("&"));

        // 检查缓存
        if let Some(ref cache) = self.cache {
            let cache_key = make_key(&cache_key_url);
            if let Some(body) = cache.get(&cache_key, self.cache_config.search) {
                log::debug!("[modrinth] Cache hit for search {}", query);
                return match serde_json::from_str::<SearchResponse>(&body) {
                    Ok(result) => {
                        log::debug!(
                            "[modrinth] Successfully parsed cached response: {} hits",
                            result.hits.len()
                        );
                        Ok(result)
                    }
                    Err(e) => {
                        log::warn!("[modrinth] Failed to parse cached search JSON: {}", e);
                        Err(ModrinthError::Network(format!("JSON parse error: {}", e)))
                    }
                };
            }
        }

        let mut request = self.client.get(&url);

        // 添加查询参数
        for (key, value) in &params {
            request = request.query(&[(key, value)]);
        }

        // 添加 facets 参数
        if !facets.is_empty() {
            request = request.query(&[("facets", &facets)]);
        }

        log::debug!("[modrinth] Sending request...");
        let response = request.send().await?;
        log::debug!("[modrinth] Response received: status={}", response.status());

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            log::error!("[modrinth] HTTP error: {} - {}", status, text);
            return Err(ModrinthError::Api(format!("HTTP {}: {}", status, text)));
        }

        log::debug!("[modrinth] Parsing response body...");
        let body_text = response.text().await?;
        log::debug!(
            "[modrinth] Raw response (first 500 chars): {}",
            &body_text[..body_text.len().min(500)]
        );

        // 写入缓存
        if let Some(ref cache) = self.cache {
            let cache_key = make_key(&cache_key_url);
            if let Err(e) = cache.set(&cache_key, &body_text) {
                log::warn!("[modrinth] Failed to write search cache: {}", e);
            }
        }

        match serde_json::from_str::<SearchResponse>(&body_text) {
            Ok(result) => {
                log::debug!(
                    "[modrinth] Successfully parsed response: {} hits",
                    result.hits.len()
                );
                Ok(result)
            }
            Err(e) => {
                log::error!("[modrinth] Failed to parse JSON: {}", e);
                // 尝试找出解析失败的位置
                let pos = e.column();
                if pos > 0 && pos <= body_text.len() {
                    let start = pos.saturating_sub(100);
                    let end = (pos + 100).min(body_text.len());
                    log::error!(
                        "[modrinth] Error around column {}: ...{}...",
                        pos,
                        &body_text[start..end]
                    );
                }
                log::error!("[modrinth] Full response body: {}", body_text);
                Err(ModrinthError::Network(format!("JSON parse error: {}", e)))
            }
        }
    }

    /// 获取项目详情
    pub async fn get_project(&self, project_id: &str) -> Result<Project, ModrinthError> {
        let url = format!("{}/project/{}", self.base_url, project_id);

        // 检查缓存
        if let Some(ref cache) = self.cache {
            let cache_key = make_key(&url);
            if let Some(body) = cache.get(&cache_key, self.cache_config.project) {
                log::debug!("[modrinth] Cache hit for project {}", project_id);
                return match serde_json::from_str::<Project>(&body) {
                    Ok(result) => Ok(result),
                    Err(e) => {
                        log::warn!("[modrinth] Failed to parse cached project JSON: {}", e);
                        Err(ModrinthError::Network(format!("JSON parse error: {}", e)))
                    }
                };
            }
        }

        log::debug!("[modrinth] Getting project: {}", url);

        let response = self.client.get(&url).send().await?;
        log::debug!("[modrinth] Response status: {}", response.status());

        if !response.status().is_success() {
            let status = response.status();
            if status.as_u16() == 404 {
                return Err(ModrinthError::InvalidProject(project_id.to_string()));
            }
            let text = response.text().await.unwrap_or_default();
            log::error!("[modrinth] HTTP error: {} - {}", status, text);
            return Err(ModrinthError::Api(format!("HTTP {}: {}", status, text)));
        }

        let body_text = response.text().await?;
        log::debug!(
            "[modrinth] Raw response (first 500 chars): {}",
            &body_text[..body_text.len().min(500)]
        );

        // 写入缓存
        if let Some(ref cache) = self.cache {
            let cache_key = make_key(&url);
            if let Err(e) = cache.set(&cache_key, &body_text) {
                log::warn!("[modrinth] Failed to write project cache: {}", e);
            }
        }

        match serde_json::from_str::<Project>(&body_text) {
            Ok(result) => Ok(result),
            Err(e) => {
                log::error!("[modrinth] Failed to parse project JSON: {}", e);
                log::error!("[modrinth] Full response body: {}", body_text);
                Err(ModrinthError::Network(format!("JSON parse error: {}", e)))
            }
        }
    }

    /// 获取项目的版本列表
    pub async fn get_project_versions(
        &self,
        project_id: &str,
        game_version: Option<&str>,
        loader: Option<&str>,
    ) -> Result<Vec<Version>, ModrinthError> {
        let url = format!("{}/project/{}/version", self.base_url, project_id);

        // 构建缓存 key URL（包含查询参数）
        let mut cache_key_url = url.clone();
        let mut query_parts = Vec::new();
        if let Some(version) = game_version {
            query_parts.push(format!("game_versions=[\"{}\"]", version));
        }
        if let Some(l) = loader {
            query_parts.push(format!("loaders=[\"{}\"]", l));
        }
        if !query_parts.is_empty() {
            cache_key_url = format!("{}?{}", cache_key_url, query_parts.join("&"));
        }

        // 检查缓存
        if let Some(ref cache) = self.cache {
            let cache_key = make_key(&cache_key_url);
            if let Some(body) = cache.get(&cache_key, self.cache_config.project_versions) {
                log::debug!("[modrinth] Cache hit for project versions {}", project_id);
                return match serde_json::from_str::<Vec<Version>>(&body) {
                    Ok(result) => {
                        log::debug!(
                            "[modrinth] Successfully parsed {} cached versions",
                            result.len()
                        );
                        Ok(result)
                    }
                    Err(e) => {
                        log::warn!("[modrinth] Failed to parse cached versions JSON: {}", e);
                        Err(ModrinthError::Network(format!("JSON parse error: {}", e)))
                    }
                };
            }
        }

        log::debug!("[modrinth] Getting project versions: {}", url);
        log::debug!(
            "[modrinth] game_version={:?}, loader={:?}",
            game_version,
            loader
        );

        let mut request = self.client.get(&url);

        // 添加查询参数
        if let Some(version) = game_version {
            request = request.query(&[("game_versions", format!("[\"{}\"]", version))]);
        }

        if let Some(l) = loader {
            request = request.query(&[("loaders", format!("[\"{}\"]", l))]);
        }

        let response = request.send().await?;
        log::debug!("[modrinth] Response status: {}", response.status());

        if !response.status().is_success() {
            let status = response.status();
            if status.as_u16() == 404 {
                return Err(ModrinthError::InvalidProject(project_id.to_string()));
            }
            let text = response.text().await.unwrap_or_default();
            log::error!("[modrinth] HTTP error: {} - {}", status, text);
            return Err(ModrinthError::Api(format!("HTTP {}: {}", status, text)));
        }

        let body_text = response.text().await?;
        log::debug!(
            "[modrinth] Raw response (first 500 chars): {}",
            &body_text[..body_text.len().min(500)]
        );

        // 写入缓存
        if let Some(ref cache) = self.cache {
            let cache_key = make_key(&cache_key_url);
            if let Err(e) = cache.set(&cache_key, &body_text) {
                log::warn!("[modrinth] Failed to write project versions cache: {}", e);
            }
        }

        match serde_json::from_str::<Vec<Version>>(&body_text) {
            Ok(result) => {
                log::debug!("[modrinth] Successfully parsed {} versions", result.len());
                Ok(result)
            }
            Err(e) => {
                log::error!("[modrinth] Failed to parse versions JSON: {}", e);
                log::error!("[modrinth] Full response body: {}", body_text);
                Err(ModrinthError::Network(format!("JSON parse error: {}", e)))
            }
        }
    }

    /// 获取单个版本详情
    pub async fn get_version(&self, version_id: &str) -> Result<Version, ModrinthError> {
        let url = format!("{}/version/{}", self.base_url, version_id);

        // 检查缓存
        if let Some(ref cache) = self.cache {
            let cache_key = make_key(&url);
            if let Some(body) = cache.get(&cache_key, self.cache_config.version) {
                log::debug!("[modrinth] Cache hit for version {}", version_id);
                return match serde_json::from_str::<Version>(&body) {
                    Ok(result) => Ok(result),
                    Err(e) => {
                        log::warn!("[modrinth] Failed to parse cached version JSON: {}", e);
                        Err(ModrinthError::Network(format!("JSON parse error: {}", e)))
                    }
                };
            }
        }

        log::debug!("[modrinth] Getting version: {}", url);

        let response = self.client.get(&url).send().await?;
        log::debug!("[modrinth] Response status: {}", response.status());

        if !response.status().is_success() {
            let status = response.status();
            if status.as_u16() == 404 {
                return Err(ModrinthError::InvalidVersion(version_id.to_string()));
            }
            let text = response.text().await.unwrap_or_default();
            log::error!("[modrinth] HTTP error: {} - {}", status, text);
            return Err(ModrinthError::Api(format!("HTTP {}: {}", status, text)));
        }

        let body_text = response.text().await?;
        log::debug!(
            "[modrinth] Raw response (first 500 chars): {}",
            &body_text[..body_text.len().min(500)]
        );

        // 写入缓存
        if let Some(ref cache) = self.cache {
            let cache_key = make_key(&url);
            if let Err(e) = cache.set(&cache_key, &body_text) {
                log::warn!("[modrinth] Failed to write version cache: {}", e);
            }
        }

        match serde_json::from_str::<Version>(&body_text) {
            Ok(result) => Ok(result),
            Err(e) => {
                log::error!("[modrinth] Failed to parse version JSON: {}", e);
                log::error!("[modrinth] Full response body: {}", body_text);
                Err(ModrinthError::Network(format!("JSON parse error: {}", e)))
            }
        }
    }

    /// 通过文件哈希获取版本
    pub async fn get_version_from_hash(
        &self,
        hash: &str,
        algorithm: HashAlgorithm,
    ) -> Result<Version, ModrinthError> {
        let url = format!("{}/version_file/{}", self.base_url, hash);
        let cache_key_url = format!("{}?algorithm={}", url, algorithm.to_string());

        // 检查缓存
        if let Some(ref cache) = self.cache {
            let cache_key = make_key(&cache_key_url);
            if let Some(body) = cache.get(&cache_key, self.cache_config.version_from_hash) {
                log::debug!("[modrinth] Cache hit for version from hash {}", hash);
                return match serde_json::from_str::<Version>(&body) {
                    Ok(result) => Ok(result),
                    Err(e) => {
                        log::warn!(
                            "[modrinth] Failed to parse cached version from hash JSON: {}",
                            e
                        );
                        Err(ModrinthError::Network(format!("JSON parse error: {}", e)))
                    }
                };
            }
        }

        log::debug!("[modrinth] Getting version from hash: {}", url);

        let response = self
            .client
            .get(&url)
            .query(&[("algorithm", algorithm.to_string())])
            .send()
            .await?;
        log::debug!("[modrinth] Response status: {}", response.status());

        if !response.status().is_success() {
            let status = response.status();
            if status.as_u16() == 404 {
                return Err(ModrinthError::InvalidVersion(format!(
                    "No version found for hash: {}",
                    hash
                )));
            }
            let text = response.text().await.unwrap_or_default();
            log::error!("[modrinth] HTTP error: {} - {}", status, text);
            return Err(ModrinthError::Api(format!("HTTP {}: {}", status, text)));
        }

        let body_text = response.text().await?;
        log::debug!(
            "[modrinth] Raw response (first 500 chars): {}",
            &body_text[..body_text.len().min(500)]
        );

        // 写入缓存
        if let Some(ref cache) = self.cache {
            let cache_key = make_key(&cache_key_url);
            if let Err(e) = cache.set(&cache_key, &body_text) {
                log::warn!("[modrinth] Failed to write version from hash cache: {}", e);
            }
        }

        match serde_json::from_str::<Version>(&body_text) {
            Ok(result) => Ok(result),
            Err(e) => {
                log::error!("[modrinth] Failed to parse version from hash JSON: {}", e);
                log::error!("[modrinth] Full response body: {}", body_text);
                Err(ModrinthError::Network(format!("JSON parse error: {}", e)))
            }
        }
    }

    /// 获取多个版本列表
    pub async fn get_versions(
        &self,
        version_ids: &[String],
    ) -> Result<Vec<Version>, ModrinthError> {
        let url = format!("{}/versions", self.base_url);

        log::debug!("[modrinth] Getting versions: {:?}", version_ids);

        let ids_json = format!(
            "[{}]",
            version_ids
                .iter()
                .map(|id| format!("\"{}\"", id))
                .collect::<Vec<_>>()
                .join(",")
        );

        log::debug!("[modrinth] IDs JSON: {}", ids_json);

        let cache_key_url = format!("{}?ids={}", url, ids_json);

        // 检查缓存
        if let Some(ref cache) = self.cache {
            let cache_key = make_key(&cache_key_url);
            if let Some(body) = cache.get(&cache_key, self.cache_config.versions) {
                log::debug!("[modrinth] Cache hit for versions {:?}", version_ids);
                return match serde_json::from_str::<Vec<Version>>(&body) {
                    Ok(result) => {
                        log::debug!(
                            "[modrinth] Successfully parsed {} cached versions",
                            result.len()
                        );
                        Ok(result)
                    }
                    Err(e) => {
                        log::warn!("[modrinth] Failed to parse cached versions JSON: {}", e);
                        Err(ModrinthError::Network(format!("JSON parse error: {}", e)))
                    }
                };
            }
        }

        let response = self
            .client
            .get(&url)
            .query(&[("ids", ids_json)])
            .send()
            .await?;
        log::debug!("[modrinth] Response status: {}", response.status());

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            log::error!("[modrinth] HTTP error: {} - {}", status, text);
            return Err(ModrinthError::Api(format!("HTTP {}: {}", status, text)));
        }

        let body_text = response.text().await?;
        log::debug!(
            "[modrinth] Raw response (first 500 chars): {}",
            &body_text[..body_text.len().min(500)]
        );

        // 写入缓存
        if let Some(ref cache) = self.cache {
            let cache_key = make_key(&cache_key_url);
            if let Err(e) = cache.set(&cache_key, &body_text) {
                log::warn!("[modrinth] Failed to write versions cache: {}", e);
            }
        }

        match serde_json::from_str::<Vec<Version>>(&body_text) {
            Ok(result) => {
                log::debug!("[modrinth] Successfully parsed {} versions", result.len());
                Ok(result)
            }
            Err(e) => {
                log::error!("[modrinth] Failed to parse versions JSON: {}", e);
                log::error!("[modrinth] Full response body: {}", body_text);
                Err(ModrinthError::Network(format!("JSON parse error: {}", e)))
            }
        }
    }

    /// 获取所有分类
    pub async fn get_categories(&self) -> Result<Vec<Category>, ModrinthError> {
        let url = format!("{}/tag/category", self.base_url);

        // 检查缓存
        if let Some(ref cache) = self.cache {
            let cache_key = make_key(&url);
            if let Some(body) = cache.get(&cache_key, self.cache_config.categories) {
                log::debug!("[modrinth] Cache hit for categories");
                return match serde_json::from_str::<Vec<Category>>(&body) {
                    Ok(result) => {
                        log::debug!(
                            "[modrinth] Successfully parsed {} cached categories",
                            result.len()
                        );
                        Ok(result)
                    }
                    Err(e) => {
                        log::warn!("[modrinth] Failed to parse cached categories JSON: {}", e);
                        Err(ModrinthError::Network(format!("JSON parse error: {}", e)))
                    }
                };
            }
        }

        log::debug!("[modrinth] Getting categories from: {}", url);

        let response = self.client.get(&url).send().await?;
        log::debug!("[modrinth] Response status: {}", response.status());

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            log::error!("[modrinth] HTTP error: {} - {}", status, text);
            return Err(ModrinthError::Api(format!("HTTP {}: {}", status, text)));
        }

        let body_text = response.text().await?;
        log::debug!(
            "[modrinth] Raw response (first 500 chars): {}",
            &body_text[..body_text.len().min(500)]
        );

        // 写入缓存
        if let Some(ref cache) = self.cache {
            let cache_key = make_key(&url);
            if let Err(e) = cache.set(&cache_key, &body_text) {
                log::warn!("[modrinth] Failed to write categories cache: {}", e);
            }
        }

        match serde_json::from_str::<Vec<Category>>(&body_text) {
            Ok(result) => {
                log::debug!("[modrinth] Successfully parsed {} categories", result.len());
                Ok(result)
            }
            Err(e) => {
                log::error!("[modrinth] Failed to parse categories JSON: {}", e);
                log::error!("[modrinth] Full response body: {}", body_text);
                Err(ModrinthError::Network(format!("JSON parse error: {}", e)))
            }
        }
    }

    /// 获取所有加载器
    pub async fn get_loaders(&self) -> Result<Vec<Loader>, ModrinthError> {
        let url = format!("{}/tag/loader", self.base_url);

        // 检查缓存
        if let Some(ref cache) = self.cache {
            let cache_key = make_key(&url);
            if let Some(body) = cache.get(&cache_key, self.cache_config.loaders) {
                log::debug!("[modrinth] Cache hit for loaders");
                return match serde_json::from_str::<Vec<Loader>>(&body) {
                    Ok(result) => {
                        log::debug!(
                            "[modrinth] Successfully parsed {} cached loaders",
                            result.len()
                        );
                        Ok(result)
                    }
                    Err(e) => {
                        log::warn!("[modrinth] Failed to parse cached loaders JSON: {}", e);
                        Err(ModrinthError::Network(format!("JSON parse error: {}", e)))
                    }
                };
            }
        }

        log::debug!("[modrinth] Getting loaders from: {}", url);

        let response = self.client.get(&url).send().await?;
        log::debug!("[modrinth] Response status: {}", response.status());

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            log::error!("[modrinth] HTTP error: {} - {}", status, text);
            return Err(ModrinthError::Api(format!("HTTP {}: {}", status, text)));
        }

        let body_text = response.text().await?;
        log::debug!(
            "[modrinth] Raw response (first 500 chars): {}",
            &body_text[..body_text.len().min(500)]
        );

        // 写入缓存
        if let Some(ref cache) = self.cache {
            let cache_key = make_key(&url);
            if let Err(e) = cache.set(&cache_key, &body_text) {
                log::warn!("[modrinth] Failed to write loaders cache: {}", e);
            }
        }

        match serde_json::from_str::<Vec<Loader>>(&body_text) {
            Ok(result) => {
                log::debug!("[modrinth] Successfully parsed {} loaders", result.len());
                Ok(result)
            }
            Err(e) => {
                log::error!("[modrinth] Failed to parse loaders JSON: {}", e);
                log::error!("[modrinth] Full response body: {}", body_text);
                Err(ModrinthError::Network(format!("JSON parse error: {}", e)))
            }
        }
    }

    /// 获取所有游戏版本
    pub async fn get_game_versions(&self) -> Result<Vec<GameVersion>, ModrinthError> {
        let url = format!("{}/tag/game_version", self.base_url);

        // 检查缓存
        if let Some(ref cache) = self.cache {
            let cache_key = make_key(&url);
            if let Some(body) = cache.get(&cache_key, self.cache_config.game_versions) {
                log::debug!("[modrinth] Cache hit for game versions");
                return match serde_json::from_str::<Vec<GameVersion>>(&body) {
                    Ok(result) => {
                        log::debug!(
                            "[modrinth] Successfully parsed {} cached game versions",
                            result.len()
                        );
                        Ok(result)
                    }
                    Err(e) => {
                        log::warn!(
                            "[modrinth] Failed to parse cached game versions JSON: {}",
                            e
                        );
                        Err(ModrinthError::Network(format!("JSON parse error: {}", e)))
                    }
                };
            }
        }

        log::debug!("[modrinth] Getting game versions from: {}", url);

        let response = self.client.get(&url).send().await?;
        log::debug!("[modrinth] Response status: {}", response.status());

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            log::error!("[modrinth] HTTP error: {} - {}", status, text);
            return Err(ModrinthError::Api(format!("HTTP {}: {}", status, text)));
        }

        let body_text = response.text().await?;
        log::debug!(
            "[modrinth] Raw response (first 500 chars): {}",
            &body_text[..body_text.len().min(500)]
        );

        // 写入缓存
        if let Some(ref cache) = self.cache {
            let cache_key = make_key(&url);
            if let Err(e) = cache.set(&cache_key, &body_text) {
                log::warn!("[modrinth] Failed to write game versions cache: {}", e);
            }
        }

        match serde_json::from_str::<Vec<GameVersion>>(&body_text) {
            Ok(result) => {
                log::debug!(
                    "[modrinth] Successfully parsed {} game versions",
                    result.len()
                );
                Ok(result)
            }
            Err(e) => {
                log::error!("[modrinth] Failed to parse game versions JSON: {}", e);
                log::error!("[modrinth] Full response body: {}", body_text);
                Err(ModrinthError::Network(format!("JSON parse error: {}", e)))
            }
        }
    }

    /// 下载文件
    pub async fn download_file(&self, url: &str, output_path: &Path) -> Result<(), ModrinthError> {
        log::info!(
            "[modrinth] Downloading file from {} to {:?}",
            url,
            output_path
        );

        let response = self.client.get(url).send().await?;
        log::debug!("[modrinth] Download response status: {}", response.status());

        if !response.status().is_success() {
            let status = response.status();
            log::error!("[modrinth] Download HTTP error: {}", status);
            return Err(ModrinthError::DownloadFailed(format!(
                "HTTP {} when downloading from {}",
                status, url
            )));
        }

        let bytes = response.bytes().await?;
        let bytes_len = bytes.len();
        log::debug!("[modrinth] Received {} bytes", bytes_len);

        tokio::fs::write(output_path, bytes).await?;

        log::info!(
            "[modrinth] Downloaded {} bytes to {:?}",
            bytes_len,
            output_path
        );

        Ok(())
    }
}

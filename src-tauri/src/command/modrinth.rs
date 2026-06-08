use crate::core::instance::download::modrinth::{
    cache::ModrinthCache, client::ModrinthClient, models::*, DownloadResult,
};
use tauri::Manager;

/// 搜索模组
#[tauri::command]
pub async fn search_mods(
    app_handle: tauri::AppHandle,
    query: String,
    filters: SearchFilters,
) -> Result<SearchResponse, String> {
    log::info!(
        "[command] search_mods: query={}, filters={:?}",
        query,
        filters
    );

    let client = ModrinthClient::new(&app_handle);
    match crate::core::instance::download::modrinth::search_mods(&client, &query, filters).await {
        Ok(response) => {
            log::info!(
                "[command] search_mods: found {} results",
                response.total_hits
            );
            Ok(response)
        }
        Err(e) => {
            log::error!("[command] search_mods failed: {:?}", e);
            Err(e.to_string())
        }
    }
}

/// 获取模组详情
#[tauri::command]
pub async fn get_modrinth_project(
    app_handle: tauri::AppHandle,
    project_id: String,
) -> Result<Project, String> {
    log::info!("[command] get_modrinth_project: project_id={}", project_id);

    let client = ModrinthClient::new(&app_handle);
    match client.get_project(&project_id).await {
        Ok(project) => {
            log::info!("[command] get_modrinth_project: found {}", project.title);
            Ok(project)
        }
        Err(e) => {
            log::error!("[command] get_modrinth_project failed: {:?}", e);
            Err(e.to_string())
        }
    }
}

/// 获取模组版本列表
#[tauri::command]
pub async fn get_modrinth_versions(
    app_handle: tauri::AppHandle,
    project_id: String,
    game_version: Option<String>,
    loader: Option<String>,
) -> Result<Vec<Version>, String> {
    log::info!(
        "[command] get_modrinth_versions: project_id={}, game_version={:?}, loader={:?}",
        project_id,
        game_version,
        loader
    );

    let client = ModrinthClient::new(&app_handle);
    match client
        .get_project_versions(&project_id, game_version.as_deref(), loader.as_deref())
        .await
    {
        Ok(versions) => {
            log::info!(
                "[command] get_modrinth_versions: found {} versions",
                versions.len()
            );
            Ok(versions)
        }
        Err(e) => {
            log::error!("[command] get_modrinth_versions failed: {:?}", e);
            Err(e.to_string())
        }
    }
}

/// 获取单个版本详情
#[tauri::command]
pub async fn get_modrinth_version(
    app_handle: tauri::AppHandle,
    version_id: String,
) -> Result<Version, String> {
    log::info!("[command] get_modrinth_version: version_id={}", version_id);

    let client = ModrinthClient::new(&app_handle);
    match client.get_version(&version_id).await {
        Ok(version) => {
            log::info!("[command] get_modrinth_version: found {}", version.name);
            Ok(version)
        }
        Err(e) => {
            log::error!("[command] get_modrinth_version failed: {:?}", e);
            Err(e.to_string())
        }
    }
}

/// 下载模组到指定实例
#[tauri::command]
pub async fn download_mod_to_instance(
    app_handle: tauri::AppHandle,
    instance_id: String,
    version_id: String,
) -> Result<DownloadResult, String> {
    log::info!(
        "[command] download_mod_to_instance: instance_id={}, version_id={}",
        instance_id,
        version_id
    );

    let client = ModrinthClient::new(&app_handle);
    match crate::core::instance::download::modrinth::download_mod_to_instance(
        &client,
        &app_handle,
        &instance_id,
        &version_id,
    )
    .await
    {
        Ok(result) => {
            log::info!(
                "[command] download_mod_to_instance: downloaded to {}",
                result.file_path
            );
            Ok(result)
        }
        Err(e) => {
            log::error!("[command] download_mod_to_instance failed: {:?}", e);
            Err(e.to_string())
        }
    }
}

/// 获取所有分类
#[tauri::command]
pub async fn get_modrinth_categories(
    app_handle: tauri::AppHandle,
) -> Result<Vec<Category>, String> {
    log::info!("[command] get_modrinth_categories");

    let client = ModrinthClient::new(&app_handle);
    match client.get_categories().await {
        Ok(categories) => {
            log::info!(
                "[command] get_modrinth_categories: found {} categories",
                categories.len()
            );
            Ok(categories)
        }
        Err(e) => {
            log::error!("[command] get_modrinth_categories failed: {:?}", e);
            Err(e.to_string())
        }
    }
}

/// 获取所有加载器
#[tauri::command]
pub async fn get_modrinth_loaders(app_handle: tauri::AppHandle) -> Result<Vec<Loader>, String> {
    log::info!("[command] get_modrinth_loaders");

    let client = ModrinthClient::new(&app_handle);
    match client.get_loaders().await {
        Ok(loaders) => {
            log::info!(
                "[command] get_modrinth_loaders: found {} loaders",
                loaders.len()
            );
            Ok(loaders)
        }
        Err(e) => {
            log::error!("[command] get_modrinth_loaders failed: {:?}", e);
            Err(e.to_string())
        }
    }
}

/// 获取所有游戏版本
#[tauri::command]
pub async fn get_modrinth_game_versions(
    app_handle: tauri::AppHandle,
) -> Result<Vec<GameVersion>, String> {
    log::info!("[command] get_modrinth_game_versions");

    let client = ModrinthClient::new(&app_handle);
    match client.get_game_versions().await {
        Ok(versions) => {
            log::info!(
                "[command] get_modrinth_game_versions: found {} versions",
                versions.len()
            );
            Ok(versions)
        }
        Err(e) => {
            log::error!("[command] get_modrinth_game_versions failed: {:?}", e);
            Err(e.to_string())
        }
    }
}

/// 通过文件哈希获取版本
#[tauri::command]
pub async fn get_modrinth_version_from_hash(
    app_handle: tauri::AppHandle,
    hash: String,
    algorithm: HashAlgorithm,
) -> Result<Version, String> {
    log::info!(
        "[command] get_modrinth_version_from_hash: hash={}, algorithm={:?}",
        hash,
        algorithm
    );

    let client = ModrinthClient::new(&app_handle);
    match client.get_version_from_hash(&hash, algorithm).await {
        Ok(version) => {
            log::info!(
                "[command] get_modrinth_version_from_hash: found {}",
                version.name
            );
            Ok(version)
        }
        Err(e) => {
            log::error!("[command] get_modrinth_version_from_hash failed: {:?}", e);
            Err(e.to_string())
        }
    }
}

/// 清空 Modrinth API 缓存
#[tauri::command]
pub async fn clear_modrinth_cache(app_handle: tauri::AppHandle) -> Result<(), String> {
    log::info!("[command] clear_modrinth_cache");

    let cache_dir = app_handle
        .path()
        .app_cache_dir()
        .map_err(|e| format!("Failed to get cache dir: {}", e))?
        .join("modrinth_cache");

    let cache = ModrinthCache::new(cache_dir);
    match cache.clear() {
        Ok(()) => {
            log::info!("[command] clear_modrinth_cache: success");
            Ok(())
        }
        Err(e) => {
            log::error!("[command] clear_modrinth_cache failed: {:?}", e);
            Err(e.to_string())
        }
    }
}

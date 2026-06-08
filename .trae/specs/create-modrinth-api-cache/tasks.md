# Tasks

- [ ] Task 1: 创建缓存模块 `cache.rs`
  - [ ] SubTask 1.1: 定义 `CacheEntry` 结构体（包含 `cached_at: i64` 和 `body: String`）
  - [ ] SubTask 1.2: 定义 `ModrinthCache` 结构体（包含 `cache_dir: PathBuf`）
  - [ ] SubTask 1.3: 实现 `ModrinthCache::new(cache_dir: PathBuf) -> Self`
  - [ ] SubTask 1.4: 实现 `get(&self, key: &str, ttl: u64) -> Option<String>` 方法（读取缓存、检查过期、返回 body）
  - [ ] SubTask 1.5: 实现 `set(&self, key: &str, body: &str) -> Result<(), std::io::Error>` 方法（写入缓存文件）
  - [ ] SubTask 1.6: 实现 `clear(&self) -> Result<(), std::io::Error>` 方法（删除整个缓存目录）
  - [ ] SubTask 1.7: 实现辅助函数 `make_key(url: &str) -> String`（使用 SHA256 哈希生成文件名）

- [ ] Task 2: 修改 `AppConfig` 添加缓存配置
  - [ ] SubTask 2.1: 在 `config/mod.rs` 中定义 `CacheConfig` 结构体，包含各端点 `ttl_seconds: u64` 字段，全部使用 `#[serde(default = "...")]`
  - [ ] SubTask 2.2: 为 `CacheConfig` 实现 `Default`，提供各端点默认 TTL
  - [ ] SubTask 2.3: 在 `AppConfig` 中添加 `#[serde(default)] pub modrinth_cache: CacheConfig` 字段
  - [ ] SubTask 2.4: 更新 `AppConfig::default()` 包含默认 `CacheConfig`

- [ ] Task 3: 修改 `ModrinthClient` 集成缓存
  - [ ] SubTask 3.1: 在 `ModrinthClient` 中添加 `cache: Option<ModrinthCache>` 和 `cache_config: CacheConfig` 字段
  - [ ] SubTask 3.2: 修改 `ModrinthClient::new()` 接受 `app_handle: &tauri::AppHandle` 参数，初始化缓存目录和配置（若获取配置失败则使用默认配置）
  - [ ] SubTask 3.3: 在 `search_projects` 中集成缓存读写（使用 `search` 的 TTL）
  - [ ] SubTask 3.4: 在 `get_project` 中集成缓存读写（使用 `project` 的 TTL）
  - [ ] SubTask 3.5: 在 `get_project_versions` 中集成缓存读写（使用 `project_versions` 的 TTL）
  - [ ] SubTask 3.6: 在 `get_version` 中集成缓存读写（使用 `version` 的 TTL）
  - [ ] SubTask 3.7: 在 `get_version_from_hash` 中集成缓存读写（使用 `version_from_hash` 的 TTL）
  - [ ] SubTask 3.8: 在 `get_versions` 中集成缓存读写（使用 `versions` 的 TTL）
  - [ ] SubTask 3.9: 在 `get_categories` 中集成缓存读写（使用 `categories` 的 TTL）
  - [ ] SubTask 3.10: 在 `get_loaders` 中集成缓存读写（使用 `loaders` 的 TTL）
  - [ ] SubTask 3.11: 在 `get_game_versions` 中集成缓存读写（使用 `game_versions` 的 TTL）
  - [ ] SubTask 3.12: `download_file` 不缓存

- [ ] Task 4: 更新 `mod.rs` 导出缓存模块
  - [ ] SubTask 4.1: 在 `src-tauri/src/core/instance/download/modrinth/mod.rs` 中添加 `pub mod cache;`
  - [ ] SubTask 4.2: 视需要导出 `ModrinthCache` 和 `CacheConfig`

- [ ] Task 5: 更新 Tauri 命令层
  - [ ] SubTask 5.1: 修改 `command/modrinth.rs` 中各命令，使用 `app_handle` 初始化 `ModrinthClient`（传递配置）
  - [ ] SubTask 5.2: 新增 `clear_modrinth_cache` Tauri 命令，调用 `ModrinthCache::clear()`
  - [ ] SubTask 5.3: 在 `lib.rs` 的 `invoke_handler` 中注册 `clear_modrinth_cache` 命令

- [ ] Task 6: 编译验证
  - [ ] SubTask 6.1: 运行 `cargo check` 确保无编译错误
  - [ ] SubTask 6.2: 运行 `cargo fmt` 格式化代码

# Task Dependencies
- Task 2 依赖 Task 1（`CacheConfig` 可与 `ModrinthCache` 并行设计，但 `ModrinthClient` 需要两者）
- Task 3 依赖 Task 1 和 Task 2
- Task 4 依赖 Task 1
- Task 5 依赖 Task 3
- Task 6 依赖 Task 5

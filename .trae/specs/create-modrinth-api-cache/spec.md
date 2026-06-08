# Modrinth API 磁盘缓存 Spec

## Why
当前 Modrinth API 客户端每次请求都直接访问网络，没有缓存机制。对于分类、加载器、游戏版本等不常变动的数据，以及搜索和项目详情等可能重复请求的数据，需要缓存到磁盘以减少网络请求、提升响应速度并降低 API 负载。同时需要支持为不同 API 端点配置不同的缓存过期时长。

## What Changes
- 新增 `ModrinthCache` 结构体，负责缓存的读写、过期检查和清理
- 新增 `CacheConfig` 配置结构体，允许为各 API 端点配置缓存过期时长（秒）
- 修改 `AppConfig` 加入 `modrinth_cache: CacheConfig` 字段
- 修改 `ModrinthClient` 集成缓存逻辑：请求前检查缓存，命中且未过期则直接返回；否则请求 API 并写入缓存
- 缓存文件按 API 端点分类存储在 `app_cache_dir/modrinth_cache/` 下，使用请求 URL（含参数）的 SHA256 哈希作为文件名
- 缓存数据使用 JSON 格式，包含 `cached_at` 时间戳和原始响应体

## Impact
- Affected specs: 无
- Affected code:
  - `src-tauri/src/core/instance/download/modrinth/client.rs` — 集成缓存读写
  - `src-tauri/src/core/instance/download/modrinth/cache.rs` — 新增缓存模块
  - `src-tauri/src/core/instance/download/modrinth/mod.rs` — 导出 cache 模块
  - `src-tauri/src/core/app/config/mod.rs` — 新增 CacheConfig 并加入 AppConfig
  - `src-tauri/src/command/modrinth.rs` — 可能调整客户端初始化方式

## ADDED Requirements

### Requirement: 磁盘缓存存储
The system SHALL 将 Modrinth API 响应缓存到磁盘，缓存目录位于 `app_cache_dir/modrinth_cache/`。

#### Scenario: 缓存写入
- **WHEN** API 请求成功返回
- **THEN** 将响应体写入磁盘缓存文件，文件名为请求 URL（含查询参数）的 SHA256 哈希

### Requirement: 缓存过期检查
The system SHALL 在每次使用缓存前检查是否过期。

#### Scenario: 缓存命中且未过期
- **WHEN** 缓存文件存在且 `cached_at + ttl > now`
- **THEN** 直接返回缓存内容，不发起网络请求

#### Scenario: 缓存命中但已过期
- **WHEN** 缓存文件存在但 `cached_at + ttl <= now`
- **THEN** 删除过期缓存，发起网络请求，并将新响应写入缓存

#### Scenario: 缓存未命中
- **WHEN** 缓存文件不存在
- **THEN** 发起网络请求，并将响应写入缓存

### Requirement: 可配置的缓存过期时长
The system SHALL 允许通过配置为不同 API 端点设置不同的缓存过期时长（秒）。

#### Scenario: 默认配置
- **WHEN** 未配置或配置缺失
- **THEN** 使用默认过期时长：
  - `search`: 300 秒（5 分钟）
  - `project`: 600 秒（10 分钟）
  - `project_versions`: 300 秒（5 分钟）
  - `version`: 600 秒（10 分钟）
  - `version_from_hash`: 600 秒（10 分钟）
  - `versions`: 300 秒（5 分钟）
  - `categories`: 86400 秒（24 小时）
  - `loaders`: 86400 秒（24 小时）
  - `game_versions`: 86400 秒（24 小时）

#### Scenario: 自定义配置
- **WHEN** 用户在 `App.toml` 中修改了某端点的 `ttl_seconds`
- **THEN** 使用该自定义值作为该端点的缓存过期时长

### Requirement: 缓存清理
The system SHALL 提供手动清理缓存的能力。

#### Scenario: 清理所有缓存
- **WHEN** 调用清理命令
- **THEN** 删除 `modrinth_cache/` 目录下所有缓存文件

## MODIFIED Requirements

### Requirement: AppConfig 结构
**修改前**: `AppConfig` 仅包含 `ui` 和 `server` 字段。
**修改后**: `AppConfig` 新增 `modrinth_cache: CacheConfig` 字段，且 `CacheConfig` 使用 `#[serde(default)]` 确保向后兼容。

## REMOVED Requirements
无

use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::{
    collections::HashSet,
    fs,
    path::PathBuf,
    sync::atomic::{AtomicUsize, Ordering},
};
use tauri::{AppHandle, Manager};

mod common;
mod validate;
mod version;

#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "windows")]
mod windows;

pub use validate::{JavaInstallation as ScannerJavaInstallation, JavaSource};

// ==================== 对外序列化结构 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JavaInstallation {
    pub path: String,
    pub version: String,
    pub major_version: u32,
    pub vendor: Option<String>,
    /// true = 手动添加，false = 自动扫描
    #[serde(default)]
    pub manual: bool,
    /// true = 参与服务器自动选择
    #[serde(default = "default_true")]
    pub enabled: bool,
}

fn default_true() -> bool {
    true
}

impl From<ScannerJavaInstallation> for JavaInstallation {
    fn from(v: ScannerJavaInstallation) -> Self {
        Self {
            path: v.home.to_string_lossy().to_string(),
            version: v.version,
            major_version: v.major,
            vendor: v.vendor,
            manual: false,
            enabled: true,
        }
    }
}

/// Javas.toml 的完整结构：既是扫描缓存，也是用户 Java 配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JavaConfig {
    pub instances: Vec<JavaInstallation>,
    pub last_scan: Option<String>, // ISO 8601
}

impl Default for JavaConfig {
    fn default() -> Self {
        Self {
            instances: Vec::new(),
            last_scan: None,
        }
    }
}

// ==================== IPC 消息 ====================

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ScanEvent {
    Started {
        total_paths: usize,
    },
    ScanningPath {
        path: String,
        current: usize,
        total: usize,
    },
    Found {
        java: JavaInstallation,
    },
    Completed {
        found: usize,
    },
    Error {
        message: String,
    },
}

// ==================== 缓存读写 ====================

fn cache_path(app: &AppHandle) -> PathBuf {
    app.path()
        .app_config_dir()
        .expect("app config dir not found")
        .join("Javas.toml")
}

pub fn load_java_config(app: &AppHandle) -> Result<JavaConfig, JavaScanError> {
    let path = cache_path(app);
    log::debug!(
        "[java-scanner] loading java config from: {}",
        path.display()
    );
    if !path.exists() {
        log::debug!("[java-scanner] java config file not found, returning default");
        return Ok(JavaConfig::default());
    }
    let content = fs::read_to_string(&path)?;
    let config = toml::from_str::<JavaConfig>(&content)?;
    log::info!(
        "[java-scanner] loaded {} java installations",
        config.instances.len()
    );
    Ok(config)
}

pub fn save_java_config(app: &AppHandle, config: &JavaConfig) -> Result<(), JavaScanError> {
    let dir = app
        .path()
        .app_config_dir()
        .expect("app config dir not found");
    fs::create_dir_all(&dir)?;
    let content = toml::to_string_pretty(config)?;
    fs::write(cache_path(app), &content)?;
    log::info!(
        "[java-scanner] saved java config with {} installations",
        config.instances.len()
    );
    Ok(())
}

/// 去掉 Windows 的 UNC 前缀 `\\?\`
fn strip_unc_prefix(path: PathBuf) -> PathBuf {
    #[cfg(windows)]
    {
        let s = path.to_string_lossy();
        if s.starts_with(r"\\?\") {
            return PathBuf::from(&s[4..]);
        }
    }
    path
}

// ==================== 平台扫描入口 ====================

fn collect_scan_paths() -> Vec<(PathBuf, JavaSource)> {
    log::info!("[java-scanner] collecting scan paths from all sources");
    let mut paths = Vec::new();

    // 1. 环境变量
    let env_paths = common::scan_env();
    log::debug!("[java-scanner] env paths: {:?}", env_paths);
    for p in env_paths {
        paths.push((p, JavaSource::Env));
    }

    // 2. PATH
    let path_paths = common::scan_path();
    log::debug!("[java-scanner] PATH paths: {:?}", path_paths);
    for p in path_paths {
        paths.push((p, JavaSource::Path));
    }

    // 3. 平台特定扫描
    #[cfg(target_os = "windows")]
    {
        log::debug!("[java-scanner] running windows registry scan");
        let registry = windows::scan_registry();
        log::info!("[java-scanner] registry found {} paths", registry.len());
        for p in registry {
            paths.push((p, JavaSource::Registry));
        }

        log::debug!("[java-scanner] running windows common dirs scan");
        let common_dirs = windows::scan_common_dirs();
        log::info!(
            "[java-scanner] common dirs found {} paths",
            common_dirs.len()
        );
        for p in common_dirs {
            paths.push((p, JavaSource::CommonDir));
        }

        log::debug!("[java-scanner] running windows drive roots scan");
        let drive_roots = windows::scan_drive_roots();
        log::info!(
            "[java-scanner] drive roots found {} paths",
            drive_roots.len()
        );
        for p in drive_roots {
            paths.push((p, JavaSource::CommonDir));
        }

        log::debug!("[java-scanner] running windows minecraft scan");
        let minecraft = windows::scan_minecraft();
        log::info!("[java-scanner] minecraft found {} paths", minecraft.len());
        for p in minecraft {
            paths.push((p, JavaSource::Minecraft));
        }
    }

    #[cfg(target_os = "linux")]
    {
        log::debug!("[java-scanner] running linux alternatives scan");
        let alternatives = linux::scan_alternatives();
        log::info!(
            "[java-scanner] alternatives found {} paths",
            alternatives.len()
        );
        for p in alternatives {
            paths.push((p, JavaSource::LinuxAlternatives));
        }

        log::debug!("[java-scanner] running linux common dirs scan");
        let common_dirs = linux::scan_common_dirs();
        log::info!(
            "[java-scanner] common dirs found {} paths",
            common_dirs.len()
        );
        for p in common_dirs {
            paths.push((p, JavaSource::CommonDir));
        }
    }

    #[cfg(target_os = "macos")]
    {
        log::debug!("[java-scanner] running macos java_home scan");
        let java_home = macos::scan_java_home();
        log::info!("[java-scanner] java_home found {} paths", java_home.len());
        for p in java_home {
            paths.push((p, JavaSource::MacJavaHome));
        }

        log::debug!("[java-scanner] running macos common dirs scan");
        let common_dirs = macos::scan_common_dirs();
        log::info!(
            "[java-scanner] common dirs found {} paths",
            common_dirs.len()
        );
        for p in common_dirs {
            paths.push((p, JavaSource::CommonDir));
        }
    }

    log::info!("[java-scanner] total raw paths collected: {}", paths.len());
    paths
}

// ==================== 统一扫描 API ====================

pub fn scan_java_installations_with_callback(
    app: &AppHandle,
    custom_paths: Option<Vec<String>>,
    on_event: &mut dyn FnMut(ScanEvent),
) -> Result<Vec<JavaInstallation>, JavaScanError> {
    log::info!("[java-scanner] starting java installation scan");

    // 收集待扫描路径
    let raw_paths: Vec<(PathBuf, JavaSource)> = if let Some(paths) = custom_paths {
        log::info!("[java-scanner] using custom paths: {:?}", paths);
        paths
            .into_iter()
            .map(PathBuf::from)
            .map(|p| (p, JavaSource::CommonDir))
            .collect()
    } else {
        collect_scan_paths()
    };

    let total = raw_paths.len();
    log::info!("[java-scanner] total paths to normalize: {}", total);
    on_event(ScanEvent::Started { total_paths: total });

    // 去重前规范化路径
    let current = AtomicUsize::new(0);
    let mut normalized: Vec<(PathBuf, JavaSource)> = Vec::with_capacity(total);
    for (p, source) in raw_paths {
        let idx = current.fetch_add(1, Ordering::SeqCst) + 1;
        on_event(ScanEvent::ScanningPath {
            path: p.to_string_lossy().to_string(),
            current: idx,
            total,
        });

        if let Ok(canonical) = p.canonicalize() {
            let canonical = strip_unc_prefix(canonical);
            log::trace!(
                "[java-scanner] canonicalized: {} -> {}",
                p.display(),
                canonical.display()
            );
            normalized.push((canonical, source));
        } else {
            log::trace!("[java-scanner] failed to canonicalize: {}", p.display());
            normalized.push((p, source));
        }
    }

    // 去重
    let before_dedup = normalized.len();
    let mut seen = HashSet::new();
    normalized.retain(|(p, _)| seen.insert(p.clone()));
    log::info!(
        "[java-scanner] dedup: {} -> {} paths",
        before_dedup,
        normalized.len()
    );

    // 并行验证
    log::info!(
        "[java-scanner] starting parallel validation of {} paths",
        normalized.len()
    );
    let validated: Vec<Option<ScannerJavaInstallation>> = normalized
        .par_iter()
        .map(|(p, source)| validate::validate(p.clone(), *source))
        .collect();

    let mut results: Vec<JavaInstallation> = validated
        .into_iter()
        .flatten()
        .map(JavaInstallation::from)
        .collect();

    log::info!(
        "[java-scanner] validation complete: {} valid installations",
        results.len()
    );

    // 保留旧配置中的手动添加项和 enabled 状态
    let old_config = load_java_config(app).unwrap_or_default();
    let old_manual: Vec<JavaInstallation> = old_config
        .instances
        .iter()
        .filter(|j| j.manual)
        .filter(|j| !results.iter().any(|r| r.path == j.path))
        .cloned()
        .collect();
    log::info!(
        "[java-scanner] preserving {} manual installations from config",
        old_manual.len()
    );

    // 恢复旧配置中的 enabled 状态
    let old_enabled: std::collections::HashMap<String, bool> = old_config
        .instances
        .iter()
        .map(|j| (j.path.clone(), j.enabled))
        .collect();
    for r in &mut results {
        if let Some(&enabled) = old_enabled.get(&r.path) {
            r.enabled = enabled;
        }
    }

    results.extend(old_manual);

    // 排序：JDK 优先、高版本优先、然后按路径
    results.sort_by(|a, b| {
        b.major_version
            .cmp(&a.major_version)
            .then_with(|| a.path.cmp(&b.path))
    });

    // 保存配置
    let config = JavaConfig {
        instances: results.clone(),
        last_scan: Some(chrono::Local::now().to_rfc3339()),
    };
    save_java_config(app, &config)?;

    for java in &results {
        on_event(ScanEvent::Found { java: java.clone() });
    }

    on_event(ScanEvent::Completed {
        found: results.len(),
    });

    log::info!(
        "[java-scanner] scan completed: {} total installations",
        results.len()
    );
    Ok(results)
}

pub fn get_java_config(app: &AppHandle) -> Result<JavaConfig, JavaScanError> {
    load_java_config(app)
}

pub fn get_cached_javas(app: &AppHandle) -> Result<Vec<JavaInstallation>, JavaScanError> {
    let config = load_java_config(app)?;
    Ok(config.instances)
}

pub fn remove_from_cache(app: &AppHandle, path: &str) -> Result<(), JavaScanError> {
    let mut config = load_java_config(app)?;
    let before = config.instances.len();
    config.instances.retain(|j| j.path != path);
    let after = config.instances.len();
    if after < before {
        log::info!("[java-scanner] removed {} from java config", path);
        save_java_config(app, &config)?;
    }
    Ok(())
}

pub fn update_java_entry(app: &AppHandle, path: &str, enabled: bool) -> Result<(), JavaScanError> {
    let mut config = load_java_config(app)?;
    for entry in &mut config.instances {
        if entry.path == path {
            entry.enabled = enabled;
            save_java_config(app, &config)?;
            return Ok(());
        }
    }
    Ok(())
}

pub fn add_manual_java(
    app: &AppHandle,
    installation: JavaInstallation,
) -> Result<(), JavaScanError> {
    let mut config = load_java_config(app)?;
    if !config.instances.iter().any(|j| j.path == installation.path) {
        config.instances.push(installation);
        config.instances.sort_by(|a, b| {
            b.major_version
                .cmp(&a.major_version)
                .then_with(|| a.path.cmp(&b.path))
        });
        save_java_config(app, &config)?;
    }
    Ok(())
}

// ==================== Error ====================

#[derive(Debug)]
#[allow(dead_code, unused_imports)]
pub enum JavaScanError {
    Io(std::io::Error),
    Deserialize(toml::de::Error),
    Serialize(toml::ser::Error),
}

impl From<std::io::Error> for JavaScanError {
    fn from(value: std::io::Error) -> Self {
        Self::Io(value)
    }
}

impl From<toml::de::Error> for JavaScanError {
    fn from(value: toml::de::Error) -> Self {
        Self::Deserialize(value)
    }
}

impl From<toml::ser::Error> for JavaScanError {
    fn from(value: toml::ser::Error) -> Self {
        Self::Serialize(value)
    }
}

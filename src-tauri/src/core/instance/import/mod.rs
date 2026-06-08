use regex::Regex;
use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};

/// 服务器核心类型
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ServerLoader {
    Vanilla,
    Forge,
    Fabric,
    Quilt,
    NeoForge,
    Paper,
    Spigot,
    Bukkit,
    Purpur,
    Folia,
    BungeeCord,
    Waterfall,
    Velocity,
    Custom,
}

impl ToString for ServerLoader {
    fn to_string(&self) -> String {
        match self {
            ServerLoader::Vanilla => "Vanilla".to_string(),
            ServerLoader::Forge => "Forge".to_string(),
            ServerLoader::Fabric => "Fabric".to_string(),
            ServerLoader::Quilt => "Quilt".to_string(),
            ServerLoader::NeoForge => "NeoForge".to_string(),
            ServerLoader::Paper => "Paper".to_string(),
            ServerLoader::Spigot => "Spigot".to_string(),
            ServerLoader::Bukkit => "Bukkit".to_string(),
            ServerLoader::Purpur => "Purpur".to_string(),
            ServerLoader::Folia => "Folia".to_string(),
            ServerLoader::BungeeCord => "BungeeCord".to_string(),
            ServerLoader::Waterfall => "Waterfall".to_string(),
            ServerLoader::Velocity => "Velocity".to_string(),
            ServerLoader::Custom => "Custom".to_string(),
        }
    }
}

/// 模组类型
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ModType {
    None,
    Forge,
    Fabric,
    Quilt,
    NeoForge,
    Mixed,
}

/// 启动脚本信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LaunchScript {
    pub path: String,
    pub script_type: String, // "bat", "cmd", "ps1", "sh"
    pub java_path: Option<String>,
    pub java_args: Vec<String>,
    pub server_jar: Option<String>,
}

/// 导入分析结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportAnalysis {
    pub instance_path: String,
    pub server_name: String,
    pub launch_script: Option<LaunchScript>,
    pub loader: ServerLoader,
    pub mod_type: ModType,
    pub version: Option<String>,
    pub detected_java: Option<String>,
    pub suggested_java: bool,
}

/// 检测启动脚本
fn detect_launch_script(instance_path: &PathBuf) -> Option<LaunchScript> {
    let entries = fs::read_dir(instance_path).ok()?;

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }

        let name = path.file_name()?.to_str()?.to_lowercase();
        let ext = path.extension()?.to_str().unwrap_or("").to_lowercase();

        // Windows: start.bat, start.cmd, start.ps1
        // Linux/macOS: start.sh, run.sh
        let is_script = (name.starts_with("start") || name.starts_with("run"))
            && ["bat", "cmd", "ps1", "sh"].contains(&ext.as_str());

        if is_script {
            let content = fs::read_to_string(&path).unwrap_or_default();
            let parsed = parse_launch_script(&content, &ext);
            return Some(LaunchScript {
                path: path.to_string_lossy().to_string(),
                script_type: ext,
                java_path: parsed.0,
                java_args: parsed.1,
                server_jar: parsed.2,
            });
        }
    }

    None
}

/// 解析启动脚本内容
#[allow(unused_variables)]
fn parse_launch_script(content: &str, ext: &str) -> (Option<String>, Vec<String>, Option<String>) {
    let mut java_path: Option<String> = None;
    let mut java_args = Vec::new();
    let mut server_jar: Option<String> = None;

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty()
            || trimmed.starts_with("#")
            || trimmed.starts_with("::")
            || trimmed.starts_with("@echo")
            || trimmed.starts_with("REM")
        {
            continue;
        }

        // 提取 java 路径
        if java_path.is_none() {
            // 匹配 "java" 或 "java.exe" 或完整路径
            let java_regex = Regex::new(r#"(?i)(["']?)([\w/:\\\-]*java(?:\.exe)?)\1"#).unwrap();
            if let Some(cap) = java_regex.captures(trimmed) {
                java_path = Some(cap.get(2).unwrap().as_str().to_string());
            }
        }

        // 提取 -jar 参数后的 server jar
        if server_jar.is_none() {
            let jar_regex = Regex::new(r#"(?i)-jar\s+(["']?)([\w/:\\\-.]+\.jar)\1"#).unwrap();
            if let Some(cap) = jar_regex.captures(trimmed) {
                server_jar = Some(cap.get(2).unwrap().as_str().to_string());
            }
        }

        // 收集 java 参数
        if trimmed.contains("-Xmx") || trimmed.contains("-Xms") || trimmed.contains("-XX:") {
            let args: Vec<String> = trimmed
                .split_whitespace()
                .filter(|s| s.starts_with("-X") || s.starts_with("-XX:"))
                .map(|s| s.to_string())
                .collect();
            java_args.extend(args);
        }
    }

    (java_path, java_args, server_jar)
}

/// 通过 jar 文件识别服务器核心类型
fn detect_loader_by_jar(
    instance_path: &PathBuf,
    server_jar: Option<&str>,
) -> (ServerLoader, Option<String>) {
    // 1. 优先使用启动脚本中的 jar
    if let Some(jar_name) = server_jar {
        let jar_path = instance_path.join(jar_name);
        if jar_path.exists() {
            return (
                identify_jar_loader(&jar_name.to_lowercase()),
                extract_version_from_jar(&jar_name),
            );
        }
    }

    // 2. 扫描目录下的 jar 文件
    let Ok(entries) = fs::read_dir(instance_path) else {
        return (ServerLoader::Custom, None);
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_file() {
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                let lower = name.to_lowercase();
                if lower.ends_with(".jar") {
                    return (
                        identify_jar_loader(&lower),
                        extract_version_from_jar(&lower),
                    );
                }
            }
        }
    }

    (ServerLoader::Custom, None)
}

/// 通过 jar 文件名识别 Loader
fn identify_jar_loader(name: &str) -> ServerLoader {
    if name.contains("forge") && !name.contains("neoforge") {
        ServerLoader::Forge
    } else if name.contains("neoforge") {
        ServerLoader::NeoForge
    } else if name.contains("fabric") {
        ServerLoader::Fabric
    } else if name.contains("quilt") {
        ServerLoader::Quilt
    } else if name.contains("paper") {
        ServerLoader::Paper
    } else if name.contains("spigot") {
        ServerLoader::Spigot
    } else if name.contains("bukkit") {
        ServerLoader::Bukkit
    } else if name.contains("purpur") {
        ServerLoader::Purpur
    } else if name.contains("folia") {
        ServerLoader::Folia
    } else if name.contains("bungeecord") {
        ServerLoader::BungeeCord
    } else if name.contains("waterfall") {
        ServerLoader::Waterfall
    } else if name.contains("velocity") {
        ServerLoader::Velocity
    } else if name.contains("vanilla") || name.contains("server") {
        ServerLoader::Vanilla
    } else {
        ServerLoader::Custom
    }
}

/// 从 jar 文件名提取版本号
fn extract_version_from_jar(name: &str) -> Option<String> {
    // 匹配类似 paper-1.20.4-XXX.jar, forge-1.20.1-XX.XX.XX.jar
    let re = Regex::new(r"-(\d+\.\d+(?:\.\d+)?)").unwrap();
    re.captures(name)
        .and_then(|cap| cap.get(1))
        .map(|m| m.as_str().to_string())
}

/// 检测模组类型
fn detect_mod_type(instance_path: &PathBuf, loader: &ServerLoader) -> ModType {
    match loader {
        ServerLoader::Forge | ServerLoader::NeoForge => {
            if instance_path.join("mods").exists() {
                ModType::Forge
            } else {
                ModType::None
            }
        }
        ServerLoader::Fabric => {
            if instance_path.join("mods").exists() {
                ModType::Fabric
            } else {
                ModType::None
            }
        }
        ServerLoader::Quilt => {
            if instance_path.join("mods").exists() {
                ModType::Quilt
            } else {
                ModType::None
            }
        }
        _ => ModType::None,
    }
}

/// 分析服务器目录
pub fn analyze_server_directory(instance_path: &PathBuf) -> Result<ImportAnalysis, String> {
    if !instance_path.exists() || !instance_path.is_dir() {
        return Err("指定的路径不存在或不是目录".to_string());
    }

    let server_name = instance_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Unknown")
        .to_string();

    log::info!(
        "[server-import] analyzing directory: {}",
        instance_path.display()
    );

    // 1. 检测启动脚本
    let launch_script = detect_launch_script(instance_path);
    log::debug!(
        "[server-import] launch script: {:?}",
        launch_script.as_ref().map(|s| &s.path)
    );

    // 2. 识别核心类型和版本
    let server_jar = launch_script.as_ref().and_then(|s| s.server_jar.clone());
    let (loader, version) = detect_loader_by_jar(instance_path, server_jar.as_deref());
    log::info!(
        "[server-import] detected loader: {:?}, version: {:?}",
        loader,
        version
    );

    // 3. 检测模组类型
    let mod_type = detect_mod_type(instance_path, &loader);
    log::info!("[server-import] detected mod type: {:?}", mod_type);

    // 4. 检测 Java
    let detected_java = launch_script.as_ref().and_then(|s| s.java_path.clone());
    let suggested_java = detected_java
        .as_ref()
        .map(|j| {
            let lower = j.to_lowercase();
            lower == "java" || lower == "java.exe"
        })
        .unwrap_or(true);

    Ok(ImportAnalysis {
        instance_path: instance_path.to_string_lossy().to_string(),
        server_name,
        launch_script,
        loader,
        mod_type,
        version,
        detected_java,
        suggested_java,
    })
}

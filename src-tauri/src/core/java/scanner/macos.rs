use std::path::PathBuf;
use std::process::Command;
use walkdir::WalkDir;

/// 通过 /usr/libexec/java_home -V 获取 macOS 上的 Java 安装
/// 注意：输出在 stderr 上
pub fn scan_java_home() -> Vec<PathBuf> {
    log::debug!("[java-scanner][macos] running /usr/libexec/java_home -V");
    let mut results = Vec::new();

    let output = Command::new("/usr/libexec/java_home")
        .arg("-V")
        .output();

    if let Ok(output) = output {
        if output.status.success() {
            let text = String::from_utf8_lossy(&output.stderr);
            for line in text.lines() {
                // 典型输出：
                // "21.0.2 (arm64) \"Eclipse Temurin 21\" - \"/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home\""
                if let Some(start) = line.rfind("\"") {
                    if let Some(end) = line[start + 1..].rfind("\"") {
                        let path_str = &line[start + 1..start + 1 + end];
                        let path = PathBuf::from(path_str);
                        if path.exists() {
                            log::debug!("[java-scanner][macos] java_home found: {}", path.display());
                            results.push(path);
                        }
                    }
                }
            }
        } else {
            log::debug!("[java-scanner][macos] /usr/libexec/java_home returned non-zero exit code");
        }
    } else {
        log::debug!("[java-scanner][macos] /usr/libexec/java_home command not found or failed");
    }

    log::info!("[java-scanner][macos] java_home scan found {} installations", results.len());
    results
}

/// 扫描 macOS 常见 Java 安装目录
pub fn scan_common_dirs() -> Vec<PathBuf> {
    log::debug!("[java-scanner][macos] scanning common installation directories");
    let mut results = Vec::new();

    let common_dirs = [
        "/Library/Java/JavaVirtualMachines",
        "/System/Library/Java/JavaVirtualMachines",
        "/usr/lib/jvm",
        "/usr/local/lib/jvm",
        "/opt",
    ];

    for dir in &common_dirs {
        let path = PathBuf::from(dir);
        if path.exists() {
            log::trace!("[java-scanner][macos] scanning directory: {}", path.display());
            for entry in WalkDir::new(&path).max_depth(3).into_iter().flatten() {
                if entry.file_type().is_dir() {
                    // macOS .jdk bundle: Contents/Home/bin/java
                    let bin = entry.path().join("Contents").join("Home").join("bin").join("java");
                    if bin.exists() {
                        if let Some(home) = bin.parent().and_then(|p| p.parent()) {
                            log::debug!("[java-scanner][macos] bundle found: {}", home.display());
                            results.push(home.to_path_buf());
                        }
                        continue;
                    }
                    // 普通目录结构
                    let bin_plain = entry.path().join("bin").join("java");
                    if bin_plain.exists() {
                        log::debug!("[java-scanner][macos] common dir found: {}", entry.path().display());
                        results.push(entry.path().to_path_buf());
                    }
                }
            }
        }
    }

    // 用户目录
    if let Ok(home) = std::env::var("HOME") {
        let jdks = PathBuf::from(&home).join(".jdks");
        if jdks.exists() {
            log::trace!("[java-scanner][macos] scanning user .jdks: {}", jdks.display());
            for entry in WalkDir::new(&jdks).max_depth(2).into_iter().flatten() {
                if entry.file_type().is_dir() {
                    let bin = entry.path().join("bin").join("java");
                    if bin.exists() {
                        log::debug!("[java-scanner][macos] user .jdks found: {}", entry.path().display());
                        results.push(entry.path().to_path_buf());
                    }
                }
            }
        }

        let user_jvms = PathBuf::from(&home).join("Library/Java/JavaVirtualMachines");
        if user_jvms.exists() {
            log::trace!("[java-scanner][macos] scanning user JVMs: {}", user_jvms.display());
            for entry in WalkDir::new(&user_jvms).max_depth(3).into_iter().flatten() {
                if entry.file_type().is_dir() {
                    let bin = entry.path().join("Contents").join("Home").join("bin").join("java");
                    if bin.exists() {
                        if let Some(home) = bin.parent().and_then(|p| p.parent()) {
                            log::debug!("[java-scanner][macos] user bundle found: {}", home.display());
                            results.push(home.to_path_buf());
                        }
                    }
                }
            }
        }
    }

    log::info!("[java-scanner][macos] common dirs scan found {} installations", results.len());
    results
}

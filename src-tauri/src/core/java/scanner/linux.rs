use std::path::PathBuf;
use std::process::Command;
use walkdir::WalkDir;

/// 通过 update-alternatives 获取 Java 路径
pub fn scan_alternatives() -> Vec<PathBuf> {
    log::debug!("[java-scanner][linux] running update-alternatives --list java");
    let mut results = Vec::new();

    let output = Command::new("update-alternatives")
        .args(["--list", "java"])
        .output();

    if let Ok(output) = output {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                let path = PathBuf::from(line.trim());
                // 从 bin/java 向上推两级得到 home
                if let Some(home) = path.parent().and_then(|p| p.parent()) {
                    let home = home.to_path_buf();
                    if home.exists() {
                        log::debug!("[java-scanner][linux] alternative found: {}", home.display());
                        results.push(home);
                    }
                }
            }
        } else {
            log::debug!("[java-scanner][linux] update-alternatives returned non-zero exit code");
        }
    } else {
        log::debug!("[java-scanner][linux] update-alternatives command not found or failed");
    }

    log::info!("[java-scanner][linux] alternatives scan found {} installations", results.len());
    results
}

/// 扫描 Linux 常见 Java 安装目录
pub fn scan_common_dirs() -> Vec<PathBuf> {
    log::debug!("[java-scanner][linux] scanning common installation directories");
    let mut results = Vec::new();

    let common_dirs = [
        "/usr/lib/jvm",
        "/usr/java",
        "/opt/java",
        "/usr/local/lib/jvm",
        "/usr/local/java",
    ];

    for dir in &common_dirs {
        let path = PathBuf::from(dir);
        if path.exists() {
            log::trace!("[java-scanner][linux] scanning directory: {}", path.display());
            for entry in WalkDir::new(&path).max_depth(2).into_iter().flatten() {
                if entry.file_type().is_dir() {
                    let bin = entry.path().join("bin").join("java");
                    if bin.exists() {
                        log::debug!("[java-scanner][linux] common dir found: {}", entry.path().display());
                        results.push(entry.path().to_path_buf());
                    }
                }
            }
        }
    }

    // 用户目录 .jdks / sdkman
    if let Ok(home) = std::env::var("HOME") {
        let jdks = PathBuf::from(&home).join(".jdks");
        if jdks.exists() {
            log::trace!("[java-scanner][linux] scanning user .jdks: {}", jdks.display());
            for entry in WalkDir::new(&jdks).max_depth(2).into_iter().flatten() {
                if entry.file_type().is_dir() {
                    let bin = entry.path().join("bin").join("java");
                    if bin.exists() {
                        log::debug!("[java-scanner][linux] user .jdks found: {}", entry.path().display());
                        results.push(entry.path().to_path_buf());
                    }
                }
            }
        }

        let sdkman = PathBuf::from(&home).join(".sdkman").join("candidates").join("java");
        if sdkman.exists() {
            log::trace!("[java-scanner][linux] scanning sdkman candidates: {}", sdkman.display());
            for entry in WalkDir::new(&sdkman).max_depth(2).into_iter().flatten() {
                if entry.file_type().is_dir() {
                    let bin = entry.path().join("bin").join("java");
                    if bin.exists() {
                        log::debug!("[java-scanner][linux] sdkman found: {}", entry.path().display());
                        results.push(entry.path().to_path_buf());
                    }
                }
            }
        }
    }

    log::info!("[java-scanner][linux] common dirs scan found {} installations", results.len());
    results
}

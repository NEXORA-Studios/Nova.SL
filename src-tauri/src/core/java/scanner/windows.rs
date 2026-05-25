use std::path::PathBuf;

/// 判断目录名是否像 Java 安装目录（关键词或纯数字版本号）
fn is_java_like_dir_name(name: &str) -> bool {
    let lower = name.to_lowercase();

    // 关键词匹配
    let keywords = [
        "java", "jdk", "jre", "jvm", "openjdk", "temurin", "corretto",
        "zulu", "graalvm", "jetbrains", "adoptium", "microsoft", "amazon",
        "oracle", "redhat", "sap", "liberica", "dragonwell",
    ];
    if keywords.iter().any(|&k| lower.contains(k)) {
        return true;
    }

    // 纯数字版本号，如 8, 11, 17, 21, 1.8, 1.8.0_381
    // 也匹配带前缀的，如 jdk-21, jdk1.8.0_381, java-17-openjdk
    let trimmed = lower
        .trim_start_matches("jdk")
        .trim_start_matches("jre")
        .trim_start_matches("java")
        .trim_start_matches('-')
        .trim_start_matches('_');

    // 检查剩余部分是否以数字开头
    trimmed.chars().next().map_or(false, |c| c.is_ascii_digit())
}

/// 检查路径下是否有有效的 java.exe
/// 支持 bin\java.exe 和 jre\bin\java.exe 两种结构
fn has_java_exe(path: &PathBuf) -> bool {
    path.join("bin").join("java.exe").exists()
        || path.join("jre").join("bin").join("java.exe").exists()
}

/// 递归扫描目录，直到找到 java.exe 或确定不是 Java 目录
/// 限制递归深度避免性能问题
fn scan_dir_recursive(dir: &PathBuf, depth: u32, max_depth: u32, results: &mut Vec<PathBuf>) {
    if depth > max_depth {
        return;
    }

    // 如果当前目录就有 java.exe，直接记录
    if has_java_exe(dir) {
        log::debug!("[java-scanner][windows] found java.exe at: {}", dir.display());
        results.push(dir.clone());
        return;
    }

    // 读取子目录
    let Ok(entries) = std::fs::read_dir(dir) else {
        return;
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let name = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("");

        // 子目录名像 Java 目录才继续递归
        if is_java_like_dir_name(name) {
            log::trace!(
                "[java-scanner][windows] recursing into java-like dir: {}",
                path.display()
            );
            scan_dir_recursive(&path, depth + 1, max_depth, results);
        }
    }
}

/// 扫描 Windows 注册表中的 Java 安装路径
pub fn scan_registry() -> Vec<PathBuf> {
    log::debug!("[java-scanner][windows] scanning registry for Java installations");
    let mut results = Vec::new();

    let keys_to_scan = [
        r"SOFTWARE\JavaSoft\JDK",
        r"SOFTWARE\JavaSoft\Java Development Kit",
        r"SOFTWARE\JavaSoft\JRE",
        r"SOFTWARE\JavaSoft\Java Runtime Environment",
        r"SOFTWARE\WOW6432Node\JavaSoft\JDK",
        r"SOFTWARE\WOW6432Node\JavaSoft\Java Development Kit",
        r"SOFTWARE\WOW6432Node\JavaSoft\JRE",
        r"SOFTWARE\WOW6432Node\JavaSoft\Java Runtime Environment",
    ];

    for root in [winreg::enums::HKEY_LOCAL_MACHINE] {
        for key_path in &keys_to_scan {
            if let Ok(key) = winreg::RegKey::predef(root).open_subkey(key_path) {
                log::trace!("[java-scanner][windows] opened registry key: {}", key_path);
                for subkey_name in key.enum_keys().flatten() {
                    if let Ok(subkey) = key.open_subkey(&subkey_name) {
                        if let Ok(java_home) = subkey.get_value::<String, _>("JavaHome") {
                            let path = PathBuf::from(java_home);
                            if path.exists() {
                                log::debug!(
                                    "[java-scanner][windows] registry found: {}",
                                    path.display()
                                );
                                results.push(path);
                            }
                        }
                    }
                }
            }
        }
    }

    log::info!(
        "[java-scanner][windows] registry scan found {} installations",
        results.len()
    );
    results
}

/// 扫描 Windows 常见 Java 安装目录
pub fn scan_common_dirs() -> Vec<PathBuf> {
    log::debug!("[java-scanner][windows] scanning common installation directories");
    let mut results = Vec::new();

    let common_dirs = [
        r"C:\Program Files\Java",
        r"C:\Program Files\Eclipse Adoptium",
        r"C:\Program Files\Zulu",
        r"C:\Program Files\Microsoft",
        r"C:\Program Files\Amazon Corretto",
        r"C:\Program Files (x86)\Java",
        r"C:\Program Files (x86)\Eclipse Adoptium",
    ];

    for dir in &common_dirs {
        let path = PathBuf::from(dir);
        if path.exists() {
            log::trace!(
                "[java-scanner][windows] scanning common dir: {}",
                path.display()
            );
            scan_dir_recursive(&path, 0, 3, &mut results);
        }
    }

    // 用户目录 .jdks
    if let Ok(userprofile) = std::env::var("USERPROFILE") {
        let jdks = PathBuf::from(&userprofile).join(".jdks");
        if jdks.exists() {
            log::trace!(
                "[java-scanner][windows] scanning user .jdks: {}",
                jdks.display()
            );
            scan_dir_recursive(&jdks, 0, 3, &mut results);
        }
    }

    log::info!(
        "[java-scanner][windows] common dirs scan found {} installations",
        results.len()
    );
    results
}

/// 扫描所有磁盘根目录下的 Java 安装
/// 策略：对每个盘根 ls，只进入看起来像 Java 目录的子文件夹，然后定向递归
pub fn scan_drive_roots() -> Vec<PathBuf> {
    log::debug!("[java-scanner][windows] scanning drive roots");
    let mut results = Vec::new();

    for drive in 'C'..='Z' {
        let root = PathBuf::from(format!("{}:\\", drive));
        if !root.exists() {
            continue;
        }

        log::trace!("[java-scanner][windows] listing drive root: {}", root.display());

        let Ok(entries) = std::fs::read_dir(&root) else {
            continue;
        };

        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_dir() {
                continue;
            }

            let name = path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("");

            // 只进入看起来像 Java 目录的子文件夹
            if is_java_like_dir_name(name) {
                log::debug!(
                    "[java-scanner][windows] drive {}: java-like dir found: {}",
                    drive,
                    path.display()
                );
                scan_dir_recursive(&path, 0, 4, &mut results);
            }
        }
    }

    log::info!(
        "[java-scanner][windows] drive roots scan found {} installations",
        results.len()
    );
    results
}

/// 扫描 Minecraft Launcher 自带的 Java Runtime
pub fn scan_minecraft() -> Vec<PathBuf> {
    log::debug!("[java-scanner][windows] scanning Minecraft runtime");
    let mut results = Vec::new();

    let minecraft_runtimes = if let Ok(appdata) = std::env::var("APPDATA") {
        vec![PathBuf::from(&appdata).join(".minecraft").join("runtime")]
    } else {
        log::warn!("[java-scanner][windows] APPDATA environment variable not found");
        vec![]
    };

    for runtime_dir in minecraft_runtimes {
        if !runtime_dir.exists() {
            log::debug!(
                "[java-scanner][windows] minecraft runtime dir not found: {}",
                runtime_dir.display()
            );
            continue;
        }
        log::trace!(
            "[java-scanner][windows] scanning minecraft runtime: {}",
            runtime_dir.display()
        );
        // Minecraft runtime 结构特殊，用关键词过滤递归
        scan_dir_recursive(&runtime_dir, 0, 5, &mut results);
    }

    log::info!(
        "[java-scanner][windows] minecraft scan found {} installations",
        results.len()
    );
    results
}

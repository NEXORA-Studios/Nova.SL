use crate::core::file::explorer::{
    copy_path, create_directory, create_empty_file, delete_path, get_file_info, list_directory, move_path,
    rename_path, validate_name, DirectoryListing, FileEntry,
};
use crate::core::file::text::{
    read_text_file, write_text_file, write_text_file_raw, read_raw_text, write_raw_text,
    TextFileFormat, TextContent,
};
use crate::core::file::nbt::{read_nbt_file, NbtTree};
use std::path::PathBuf;

// ==================== 目录浏览命令 ====================

/// 列出目录内容
#[tauri::command]
pub fn list_dir(dir_path: String) -> Result<DirectoryListing, String> {
    log::info!("[command] list_dir: {}", dir_path);
    let path = PathBuf::from(dir_path);
    list_directory(&path).map_err(|e| {
        log::error!("[command] list_dir failed: {}", e);
        e.to_string()
    })
}

/// 获取文件信息
#[tauri::command]
pub fn get_file_metadata(file_path: String) -> Result<FileEntry, String> {
    log::info!("[command] get_file_metadata: {}", file_path);
    let path = PathBuf::from(file_path);
    get_file_info(&path).map_err(|e| {
        log::error!("[command] get_file_metadata failed: {}", e);
        e.to_string()
    })
}

/// 检查路径是否存在
#[tauri::command]
pub fn check_path_exists(path: String) -> bool {
    log::debug!("[command] check_path_exists: {}", path);
    PathBuf::from(path).exists()
}

/// 检查路径是否为目录
#[tauri::command]
pub fn check_is_directory(path: String) -> bool {
    log::debug!("[command] check_is_directory: {}", path);
    PathBuf::from(path).is_dir()
}

/// 检查路径是否为文件
#[tauri::command]
pub fn check_is_file(path: String) -> bool {
    log::debug!("[command] check_is_file: {}", path);
    PathBuf::from(path).is_file()
}

/// 获取父目录
#[tauri::command]
pub fn get_parent(path: String) -> Option<String> {
    log::debug!("[command] get_parent: {}", path);
    PathBuf::from(path)
        .parent()
        .map(|p| p.to_string_lossy().to_string())
}

/// 拼接路径
#[tauri::command]
pub fn join_paths(base: String, components: Vec<String>) -> String {
    log::debug!("[command] join_paths: base={}, components={:?}", base, components);
    let mut result = PathBuf::from(base);
    for component in components {
        result = result.join(component);
    }
    result.to_string_lossy().to_string()
}

/// 创建目录
#[tauri::command]
pub fn create_dir(parent_path: String, name: String) -> Result<(), String> {
    log::info!("[command] create_dir: parent={}, name={}", parent_path, name);

    if let Err(e) = validate_name(&name) {
        return Err(e);
    }

    let path = PathBuf::from(parent_path).join(&name);
    create_directory(&path).map_err(|e| {
        log::error!("[command] create_dir failed: {}", e);
        e.to_string()
    })
}

/// 创建空文件
#[tauri::command]
pub fn create_file(parent_path: String, name: String) -> Result<(), String> {
    log::info!("[command] create_file: parent={}, name={}", parent_path, name);

    if let Err(e) = validate_name(&name) {
        return Err(e);
    }

    let path = PathBuf::from(parent_path).join(&name);
    create_empty_file(&path).map_err(|e| {
        log::error!("[command] create_file failed: {}", e);
        e.to_string()
    })
}

/// 校验名称是否合法
#[tauri::command]
pub fn validate_file_name(name: String) -> Result<(), String> {
    log::debug!("[command] validate_file_name: {}", name);
    validate_name(&name)
}

/// 复制文件或目录
#[tauri::command]
pub fn copy_file_or_dir(src: String, dst: String) -> Result<(), String> {
    log::info!("[command] copy_file_or_dir: {} -> {}", src, dst);
    copy_path(&PathBuf::from(src), &PathBuf::from(dst)).map_err(|e| {
        log::error!("[command] copy_file_or_dir failed: {}", e);
        e.to_string()
    })
}

/// 移动文件或目录（剪切）
#[tauri::command]
pub fn move_file_or_dir(src: String, dst: String) -> Result<(), String> {
    log::info!("[command] move_file_or_dir: {} -> {}", src, dst);
    move_path(&PathBuf::from(src), &PathBuf::from(dst)).map_err(|e| {
        log::error!("[command] move_file_or_dir failed: {}", e);
        e.to_string()
    })
}

/// 重命名文件或目录
#[tauri::command]
pub fn rename_file_or_dir(src: String, new_name: String) -> Result<(), String> {
    log::info!("[command] rename_file_or_dir: {} -> {}", src, new_name);
    rename_path(&PathBuf::from(src), &new_name).map_err(|e| {
        log::error!("[command] rename_file_or_dir failed: {}", e);
        e.to_string()
    })
}

/// 删除文件或目录（递归）
#[tauri::command]
pub fn delete_file_or_dir(path: String) -> Result<(), String> {
    log::info!("[command] delete_file_or_dir: {}", path);
    delete_path(&PathBuf::from(path)).map_err(|e| {
        log::error!("[command] delete_file_or_dir failed: {}", e);
        e.to_string()
    })
}

/// 使用外部命令打开文件
#[tauri::command]
pub fn open_with_external_command(file_path: String, command_template: String) -> Result<(), String> {
    log::info!("[command] open_with_external_command: {} with {}", file_path, command_template);

    let command_str = command_template.replace("%file%", &file_path);

    // 解析命令和参数（简单空格分割）
    let parts: Vec<&str> = command_str.split_whitespace().collect();
    if parts.is_empty() {
        return Err("命令不能为空".to_string());
    }

    let program = parts[0];
    let args = &parts[1..];

    #[cfg(target_os = "windows")]
    {
        let resolved_program = resolve_program_path(program)?;
        let lower = resolved_program.to_lowercase();
        let is_pe_executable = lower.ends_with(".exe") || lower.ends_with(".com") || lower.ends_with(".dll");

        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        if !is_pe_executable {
            // 非 PE 可执行文件（.cmd / .bat / .ps1 / 无扩展名脚本）
            // 必须用 cmd /c 执行，否则会出现 "不是有效的 Win32 应用程序"
            let mut cmd_line = std::ffi::OsString::from("\"");
            cmd_line.push(&resolved_program);
            cmd_line.push("\"");
            for arg in args {
                cmd_line.push(" \"");
                cmd_line.push(arg);
                cmd_line.push("\"");
            }
            let cmd_line_str = cmd_line.to_string_lossy().to_string();
            log::debug!("[command] spawning cmd /c {}", cmd_line_str);

            std::process::Command::new("cmd")
                .arg("/c")
                .arg(&cmd_line_str)
                .creation_flags(CREATE_NO_WINDOW)
                .spawn()
                .map_err(|e| format!("启动外部编辑器失败: {}", e))?;
        } else {
            log::debug!("[command] spawning executable: {}", resolved_program);
            std::process::Command::new(&resolved_program)
                .args(args)
                .creation_flags(CREATE_NO_WINDOW)
                .spawn()
                .map_err(|e| format!("启动外部编辑器失败: {}", e))?;
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new(program)
            .args(args)
            .spawn()
            .map_err(|e| format!("启动外部编辑器失败: {}", e))?;
    }

    Ok(())
}

/// 在 Windows 上通过 where.exe 解析程序真实路径
#[cfg(target_os = "windows")]
fn resolve_program_path(program: &str) -> Result<String, String> {
    // 如果已经是完整路径，直接返回
    if std::path::Path::new(program).is_absolute() {
        return Ok(program.to_string());
    }

    log::debug!("[command] resolving program path via where.exe: {}", program);

    let output = std::process::Command::new("where.exe")
        .arg(program)
        .output()
        .map_err(|e| format!("where.exe 执行失败: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("找不到程序 '{}': {}", program, stderr.trim()));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);

    // where.exe 可能返回多个结果（如 .cmd、.exe），需要找到真正可执行的文件
    // .cmd / .bat 是脚本，不能直接作为程序启动（会导致 os error 193）
    // 优先选择 .exe，如果没有则 fallback 到第一个结果并用 cmd /c 启动
    let candidates: Vec<String> = stdout
        .lines()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();

    log::debug!("[command] where.exe candidates: {:?}", candidates);

    // 优先选择真正的 PE 可执行文件（.exe / .com）
    // 避免选到无扩展名的 shell 脚本（如 VS Code 的 bin/code）
    let resolved = candidates
        .iter()
        .find(|p| {
            let lower = p.to_lowercase();
            lower.ends_with(".exe") || lower.ends_with(".com")
        })
        .cloned()
        .or_else(|| {
            // 如果没有 .exe/.com，选择第一个有扩展名的（.cmd > 无扩展名）
            candidates
                .iter()
                .find(|p| std::path::Path::new(p).extension().is_some())
                .cloned()
        })
        .or_else(|| candidates.first().cloned())
        .ok_or_else(|| format!("where.exe 未返回 '{}' 的路径", program))?;

    log::debug!("[command] resolved program path: {}", resolved);
    Ok(resolved)
}

// ==================== 文本文件命令 ====================

/// 读取文本文件（自动解析格式）
#[tauri::command]
pub fn read_text(file_path: String) -> Result<(String, serde_json::Value), String> {
    log::info!("[command] read_text: {}", file_path);
    let path = PathBuf::from(file_path);

    let (format, content) = read_text_file(&path).map_err(|e| {
        log::error!("[command] read_text failed: {}", e);
        e.to_string()
    })?;

    let format_str = match format {
        TextFileFormat::Json => "json",
        TextFileFormat::Toml => "toml",
        TextFileFormat::Yaml => "yaml",
        TextFileFormat::Properties => "properties",
        TextFileFormat::Plain => "plain",
    };

    let content_json = serde_json::to_value(&content).map_err(|e| {
        log::error!("[command] read_text serialization failed: {}", e);
        e.to_string()
    })?;

    Ok((format_str.to_string(), content_json))
}

/// 写入文本文件（自动序列化）
#[tauri::command]
pub fn write_text(
    file_path: String,
    format: String,
    content: serde_json::Value,
) -> Result<(), String> {
    log::info!("[command] write_text: {}, format={}", file_path, format);
    let path = PathBuf::from(file_path);

    let file_format = match format.to_lowercase().as_str() {
        "json" => TextFileFormat::Json,
        "toml" => TextFileFormat::Toml,
        "yaml" | "yml" => TextFileFormat::Yaml,
        "properties" => TextFileFormat::Properties,
        _ => TextFileFormat::Plain,
    };

    // 根据格式将 JSON Value 转换为对应的 TextContent
    let text_content = match &file_format {
        TextFileFormat::Json => {
            let value: serde_json::Value = serde_json::from_value(content).map_err(|e| e.to_string())?;
            TextContent::Json(value)
        }
        TextFileFormat::Toml => {
            // TOML 需要特殊处理，从 JSON Value 转换
            let value = json_to_toml_value(&content)?;
            TextContent::Toml(value)
        }
        TextFileFormat::Yaml => {
            let value = json_to_yaml_value(&content)?;
            TextContent::Yaml(value)
        }
        TextFileFormat::Properties => {
            let map = json_to_properties_map(&content)?;
            TextContent::Properties(map)
        }
        TextFileFormat::Plain => {
            let text = content.as_str().unwrap_or("").to_string();
            TextContent::Plain(text)
        }
    };

    write_text_file(&path, file_format, &text_content).map_err(|e| {
        log::error!("[command] write_text failed: {}", e);
        e.to_string()
    })
}

/// 读取原始文本内容
#[tauri::command]
pub fn read_raw(file_path: String) -> Result<String, String> {
    log::info!("[command] read_raw: {}", file_path);
    let path = PathBuf::from(file_path);
    read_raw_text(&path).map_err(|e| {
        log::error!("[command] read_raw failed: {}", e);
        e.to_string()
    })
}

/// 写入原始文本内容
#[tauri::command]
pub fn write_raw(file_path: String, content: String) -> Result<(), String> {
    log::info!("[command] write_raw: {}", file_path);
    let path = PathBuf::from(file_path);
    write_raw_text(&path, &content).map_err(|e| {
        log::error!("[command] write_raw failed: {}", e);
        e.to_string()
    })
}

/// 写入原始文本并验证格式
#[tauri::command]
pub fn write_raw_validated(
    file_path: String,
    format: String,
    content: String,
) -> Result<(), String> {
    log::info!("[command] write_raw_validated: {}, format={}", file_path, format);
    let path = PathBuf::from(file_path);

    let file_format = match format.to_lowercase().as_str() {
        "json" => TextFileFormat::Json,
        "toml" => TextFileFormat::Toml,
        "yaml" | "yml" => TextFileFormat::Yaml,
        _ => TextFileFormat::Plain,
    };

    write_text_file_raw(&path, file_format, &content).map_err(|e| {
        log::error!("[command] write_raw_validated failed: {}", e);
        e.to_string()
    })
}

// ==================== NBT 文件命令 ====================

/// 读取 NBT 文件并返回树结构
#[tauri::command]
pub fn read_nbt(file_path: String) -> Result<NbtTree, String> {
    log::info!("[command] read_nbt: {}", file_path);
    let path = PathBuf::from(file_path);
    read_nbt_file(&path).map_err(|e| {
        log::error!("[command] read_nbt failed: {}", e);
        e.to_string()
    })
}

// ==================== 辅助函数 ====================

/// 将 JSON Value 转换为 TOML Value
fn json_to_toml_value(value: &serde_json::Value) -> Result<toml::Value, String> {
    match value {
        serde_json::Value::Null => Ok(toml::Value::String(String::new())),
        serde_json::Value::Bool(b) => Ok(toml::Value::Boolean(*b)),
        serde_json::Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                Ok(toml::Value::Integer(i))
            } else if let Some(f) = n.as_f64() {
                Ok(toml::Value::Float(f))
            } else {
                Err("Invalid number".to_string())
            }
        }
        serde_json::Value::String(s) => Ok(toml::Value::String(s.clone())),
        serde_json::Value::Array(arr) => {
            let mut toml_arr = Vec::new();
            for item in arr {
                toml_arr.push(json_to_toml_value(item)?);
            }
            Ok(toml::Value::Array(toml_arr))
        }
        serde_json::Value::Object(obj) => {
            let mut toml_map = toml::map::Map::new();
            for (k, v) in obj {
                toml_map.insert(k.clone(), json_to_toml_value(v)?);
            }
            Ok(toml::Value::Table(toml_map))
        }
    }
}

/// 将 JSON Value 转换为 YAML Value
fn json_to_yaml_value(value: &serde_json::Value) -> Result<serde_yaml::Value, String> {
    // serde_yaml::Value 可以直接从 serde_json::Value 转换
    serde_yaml::to_value(value).map_err(|e| e.to_string())
}

/// 将 JSON Value 转换为 Properties Map
fn json_to_properties_map(
    value: &serde_json::Value,
) -> Result<std::collections::HashMap<String, String>, String> {
    match value {
        serde_json::Value::Object(obj) => {
            let mut map = std::collections::HashMap::new();
            for (k, v) in obj {
                let val_str = match v {
                    serde_json::Value::String(s) => s.clone(),
                    serde_json::Value::Number(n) => n.to_string(),
                    serde_json::Value::Bool(b) => b.to_string(),
                    _ => serde_json::to_string(v).unwrap_or_default(),
                };
                map.insert(k.clone(), val_str);
            }
            Ok(map)
        }
        _ => Err("Properties must be an object".to_string()),
    }
}

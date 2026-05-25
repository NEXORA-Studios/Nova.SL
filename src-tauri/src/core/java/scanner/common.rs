use std::path::PathBuf;

const JAVA_ENVS: &[&str] = &["JAVA_HOME", "JDK_HOME", "JRE_HOME"];

pub fn scan_env() -> Vec<PathBuf> {
    log::debug!("[java-scanner] scanning environment variables: {:?}", JAVA_ENVS);
    let results: Vec<PathBuf> = JAVA_ENVS
        .iter()
        .filter_map(|k| {
            let val = std::env::var(k).ok();
            if let Some(ref v) = val {
                log::debug!("[java-scanner] env {} = {}", k, v);
            }
            val
        })
        .map(PathBuf::from)
        .collect();
    log::info!("[java-scanner] found {} paths from environment variables", results.len());
    results
}

pub fn scan_path() -> Vec<PathBuf> {
    log::debug!("[java-scanner] scanning PATH for 'java' executable");
    let mut result = vec![];

    if let Ok(path) = which::which("java") {
        log::debug!("[java-scanner] found 'java' in PATH: {}", path.display());
        if let Some(home) = path.parent().and_then(|p| p.parent()) {
            log::info!("[java-scanner] resolved JAVA_HOME from PATH: {}", home.display());
            result.push(home.to_path_buf());
        }
    } else {
        log::debug!("[java-scanner] 'java' not found in PATH");
    }

    result
}

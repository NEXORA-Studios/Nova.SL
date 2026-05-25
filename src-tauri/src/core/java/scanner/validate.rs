use std::path::{Path, PathBuf};
use std::process::Command;

use super::version;

#[derive(Debug, Clone)]
#[allow(dead_code, unused_imports)]
pub struct JavaInstallation {
    pub home: PathBuf,
    pub java_bin: PathBuf,
    pub version: String,
    pub major: u32,
    pub vendor: Option<String>,
    pub runtime_name: Option<String>,
    pub is_jdk: bool,
    pub source: JavaSource,
}

#[derive(Debug, Clone, Copy)]
#[allow(dead_code, unused_imports)]
pub enum JavaSource {
    Env,
    Path,
    Registry,
    CommonDir,
    Minecraft,
    MacJavaHome,
    LinuxAlternatives,
}

pub fn validate(home: PathBuf, source: JavaSource) -> Option<JavaInstallation> {
    log::debug!("[java-scanner] validating home: {}", home.display());

    let java_bin = find_java_binary(&home)?;
    log::debug!("[java-scanner] found java binary: {}", java_bin.display());

    let output = Command::new(&java_bin).arg("-version").output().ok()?;
    log::debug!("[java-scanner] executed: {} -version", java_bin.display());

    let stderr = String::from_utf8_lossy(&output.stderr);
    let stdout = String::from_utf8_lossy(&output.stdout);
    let version_text = if stderr.contains("version") {
        &stderr
    } else {
        &stdout
    };

    log::trace!("[java-scanner] version output:\n{}", version_text);

    let version_str = version::parse_version_string(version_text)?;
    let major = version::parse_major_version(&version_str)?;
    let vendor = version::parse_vendor(version_text);

    let is_jdk = home.join("bin").join(if cfg!(windows) { "javac.exe" } else { "javac" }).exists();

    log::info!(
        "[java-scanner] validated: {} -> version={} major={} vendor={:?} is_jdk={} source={:?}",
        home.display(),
        version_str,
        major,
        vendor,
        is_jdk,
        source
    );

    Some(JavaInstallation {
        home: home.clone(),
        java_bin,
        version: version_str,
        major,
        vendor,
        runtime_name: None,
        is_jdk,
        source,
    })
}

fn find_java_binary(home: &Path) -> Option<PathBuf> {
    let bin = home.join("bin");
    let name = if cfg!(windows) { "java.exe" } else { "java" };
    let path = bin.join(name);
    if path.exists() {
        Some(path)
    } else {
        None
    }
}

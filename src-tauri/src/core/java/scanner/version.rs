use regex::Regex;
use std::sync::OnceLock;

fn version_regex() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r#"version\s+"(\d+(?:\.\d+)*(?:[_\+\-][^"]*)?)""#).unwrap())
}

pub fn parse_version_string(text: &str) -> Option<String> {
    version_regex()
        .captures(text)
        .and_then(|cap| cap.get(1))
        .map(|m| m.as_str().to_string())
}

pub fn parse_major_version(version: &str) -> Option<u32> {
    let parts: Vec<&str> = version.split('.').collect();
    if parts.len() >= 2 && parts[0] == "1" {
        parts.get(1)?.parse().ok()
    } else {
        parts.first()?.parse().ok()
    }
}

pub fn parse_vendor(text: &str) -> Option<String> {
    if text.contains("Oracle") || text.contains("Java(TM)") {
        Some("Oracle".to_string())
    } else if text.contains("Temurin") || text.contains("Adoptium") || text.contains("Eclipse") {
        Some("Eclipse Temurin".to_string())
    } else if text.contains("Zulu") || text.contains("Azul") {
        Some("Azul Zulu".to_string())
    } else if text.contains("Corretto") || text.contains("Amazon") {
        Some("Amazon Corretto".to_string())
    } else if text.contains("Microsoft") || text.contains("Build of OpenJDK") {
        Some("Microsoft".to_string())
    } else if text.contains("GraalVM") {
        Some("GraalVM".to_string())
    } else if text.contains("JetBrains") {
        Some("JetBrains".to_string())
    } else if text.contains("OpenJDK") || text.contains("openjdk") {
        Some("OpenJDK".to_string())
    } else {
        None
    }
}

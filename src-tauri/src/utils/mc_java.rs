use crate::{
    core::java::scanner::JavaInstallation,
    utils::mc_version::{McVersion, VersionKind},
};

pub fn required_java_version(v: &McVersion) -> u32 {
    // -------- snapshot 处理（关键策略）--------
    if v.kind == VersionKind::Snapshot {
        if let Some(year) = v.snapshot_year {
            // 粗略映射（工业实践：按 release window 对齐）
            if year >= 24 {
                return 21;
            } else if year >= 21 {
                return 17;
            }
        }
        return 8;
    }

    // -------- 26.1+ → Java 25 --------
    if v.major > 26 || (v.major == 26 && v.minor >= 1) {
        return 25;
    }

    // -------- 1.20.5+ → Java 21 --------
    if (v.major == 1 && v.minor > 20) || (v.major == 1 && v.minor == 20 && v.patch >= 5) {
        return 21;
    }

    // -------- 1.18+ → Java 17 --------
    if v.major == 1 && v.minor >= 18 {
        return 17;
    }

    // -------- 1.17+ → Java 16 --------
    if v.major == 1 && v.minor >= 17 {
        return 16;
    }

    // -------- fallback --------
    8
}

pub fn score_java(java: &JavaInstallation, required: u32, loader: &str) -> f64 {
    let mut score = 0.0;

    // 1️⃣ 是否手动安装（非常重要）
    if java.manual {
        score += 100.0;
    }

    // 2️⃣ Java版本匹配度（越接近越好）
    let diff = (java.major_version as i32 - required as i32).abs();
    score += 50.0 - (diff as f64 * 10.0);

    // 3️⃣ 超配惩罚（避免 25 去跑 17）
    if java.major_version > required {
        score -= (java.major_version - required) as f64 * 2.0;
    }

    // 4️⃣ vendor 加权（现实很重要）
    if let Some(vendor) = &java.vendor {
        let v = vendor.to_lowercase();

        if v.contains("temurin") || v.contains("adoptium") {
            score += 5.0;
        } else if v.contains("microsoft") {
            score += 4.0;
        } else if v.contains("oracle") {
            score += 2.0;
        }
    }

    // 5️⃣ loader 额外规则（未来扩展用）
    match loader {
        "fabric" => {
            if java.major_version >= 17 {
                score += 3.0;
            }
        }
        "forge" => {
            if java.major_version >= 17 {
                score += 2.0;
            }
        }
        _ => {}
    }

    score
}

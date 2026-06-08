#[derive(Debug, Clone, PartialEq, Eq)]
pub enum VersionKind {
    Release,
    Snapshot,
    Pre,
    Rc,
}

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct McVersion {
    pub major: u32,
    pub minor: u32,
    pub patch: u32,
    pub kind: VersionKind,

    // snapshot 专用（21w19a）
    pub snapshot_year: Option<u32>,
    pub snapshot_week: Option<u32>,
}

pub fn parse_mc_version(input: &str) -> McVersion {
    // -------- snapshot: 21w19a --------
    if let Some((y, rest)) = input.split_once('w') {
        let year = y.parse::<u32>().unwrap_or(0);

        let week = rest
            .chars()
            .take_while(|c| c.is_ascii_digit())
            .collect::<String>()
            .parse::<u32>()
            .unwrap_or(0);

        return McVersion {
            major: 0,
            minor: 0,
            patch: 0,
            kind: VersionKind::Snapshot,
            snapshot_year: Some(year),
            snapshot_week: Some(week),
        };
    }

    // -------- release / pre / rc --------
    let (base, suffix) = match input.split_once('-') {
        Some((b, s)) => (b, Some(s)),
        None => (input, None),
    };

    let mut parts = base.split('.');

    let major = parts.next().unwrap_or("0").parse().unwrap_or(0);
    let minor = parts.next().unwrap_or("0").parse().unwrap_or(0);
    let patch = parts.next().unwrap_or("0").parse().unwrap_or(0);

    let kind = match suffix {
        Some(s) if s.starts_with("pre") => VersionKind::Pre,
        Some(s) if s.starts_with("rc") => VersionKind::Rc,
        _ => VersionKind::Release,
    };

    McVersion {
        major,
        minor,
        patch,
        kind,
        snapshot_year: None,
        snapshot_week: None,
    }
}

use super::super::base::papermc::PaperMCPlugin;

pub fn create_plugin() -> PaperMCPlugin {
    PaperMCPlugin::new(
        "folia",
        "Folia",
        Some("高性能 Spigot 分支，支持插件，支持多线程区域并行处理"),
        "folia",
    )
}

use super::super::base::papermc::PaperMCPlugin;

pub fn create_plugin() -> PaperMCPlugin {
    PaperMCPlugin::new(
        "paper",
        "Paper",
        Some("高性能 Spigot 分支，支持插件"),
        "paper",
    )
}

use super::super::base::papermc::PaperMCPlugin;

pub fn create_plugin() -> PaperMCPlugin {
    PaperMCPlugin::new(
        "velocity",
        "Velocity",
        Some("高性能 Minecraft 代理服务器"),
        "velocity",
    )
}

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(not(debug_assertions))]
    {
        if std::env::var_os("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS").is_some() {
            eprintln!("Code 1259: App Crashed - Unknown Reason. Please contact support.");
            std::process::exit(1);
        }
    }

    nova_sl_lib::run()
}

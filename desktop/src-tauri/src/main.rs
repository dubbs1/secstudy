// No console window behind the app in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{WebviewUrl, WebviewWindowBuilder};

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            #[allow(unused_mut)]
            let mut window = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                .title("AWS CP Study")
                .inner_size(760.0, 900.0)
                .min_inner_size(380.0, 560.0);
            // Automated checks only: SECSTUDY_DEBUG_PORT opens the WebView2 debug port so the
            // tests can drive the installed app. Unset in normal use, so nothing extra is opened.
            // (WebView2 ignores WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS when the app passes its own.)
            #[cfg(windows)]
            if let Some(port) = std::env::var("SECSTUDY_DEBUG_PORT").ok().and_then(|p| p.parse::<u16>().ok()) {
                window = window.additional_browser_args(&format!(
                    "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --remote-debugging-port={port}"
                ));
            }
            window.build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running the app");
}

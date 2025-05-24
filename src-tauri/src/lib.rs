use std::path::PathBuf;
// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_startup_args() -> Vec<String> {
    // Get all command line arguments
    let raw_args: Vec<String> = std::env::args().collect();
    
    // For debugging
    println!("Raw args: {:?}", raw_args);
    
    // Process all arguments to handle potential comma-separated values
    let mut processed_args: Vec<String> = Vec::new();
    for arg in raw_args {
        // Split by comma in case args are comma-separated
        let split_args: Vec<&str> = arg.split(',').collect();
        for split_arg in split_args {
            if !split_arg.is_empty() {
                processed_args.push(split_arg.to_string());
            }
        }
    }
    
    // For debugging
    println!("Processed args: {:?}", processed_args);
    
    // Filter for .tldraw files and normalize paths
    processed_args.into_iter()
        .filter(|arg| arg.to_lowercase().ends_with(".tldr") || arg.to_lowercase().ends_with(".tldr\\"))
        .map(|path| {
            // Remove trailing backslash if present
            let clean_path = path.trim_end_matches('\\').to_string();
            
            let path_buf = PathBuf::from(&clean_path);
            if path_buf.is_absolute() {
                clean_path
            } else {
                // Convert relative paths to absolute
                match std::env::current_dir() {
                    Ok(current_dir) => {
                        let absolute_path = current_dir.join(path_buf);
                        match absolute_path.to_str() {
                            Some(abs_path) => abs_path.to_string(),
                            None => clean_path,
                        }
                    },
                    Err(_) => clean_path,
                }
            }
        })
        .collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet,get_startup_args])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

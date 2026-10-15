// Die App ist ein reines Web-Frontend; Tauri liefert nur Fenster und Installer.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

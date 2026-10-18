// Die App ist ein Web-Frontend; Tauri liefert Fenster, Installer und die Ablage der Spielstände.
use std::fs;
use std::path::PathBuf;

use serde::Serialize;
use tauri::{AppHandle, Manager};

#[derive(Serialize)]
struct SaveFile {
  id: String,
  content: String,
}

/// Spielstände liegen unter %LOCALAPPDATA%\WinzerAI\Spielstände, eine JSON-Datei je Partie.
fn saves_dir(app: &AppHandle) -> Result<PathBuf, String> {
  let dir = app
    .path()
    .local_data_dir()
    .map_err(|e| e.to_string())?
    .join("WinzerAI")
    .join("Spielstände");
  fs::create_dir_all(&dir).map_err(|e| format!("{}: {e}", dir.display()))?;
  Ok(dir)
}

/// Nur einfache Namen zulassen, damit niemand über die ID aus dem Ordner ausbricht.
fn save_path(app: &AppHandle, id: &str) -> Result<PathBuf, String> {
  let valid = !id.is_empty() && id.len() <= 64 && id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_');
  if !valid {
    return Err(format!("Ungültige Spielstand-ID: {id}"));
  }
  Ok(saves_dir(app)?.join(format!("{id}.json")))
}

#[tauri::command]
fn saves_location(app: AppHandle) -> Result<String, String> {
  Ok(saves_dir(&app)?.display().to_string())
}

#[tauri::command]
fn list_saves(app: AppHandle) -> Result<Vec<SaveFile>, String> {
  let mut saves = Vec::new();
  for entry in fs::read_dir(saves_dir(&app)?).map_err(|e| e.to_string())? {
    let path = entry.map_err(|e| e.to_string())?.path();
    if path.extension().is_none_or(|ext| ext != "json") {
      continue;
    }
    let (Some(id), Ok(content)) = (path.file_stem().and_then(|s| s.to_str()), fs::read_to_string(&path)) else {
      continue;
    };
    saves.push(SaveFile { id: id.to_string(), content });
  }
  Ok(saves)
}

#[tauri::command]
fn write_save(app: AppHandle, id: String, content: String) -> Result<(), String> {
  let path = save_path(&app, &id)?;
  // Erst in eine Hilfsdatei schreiben, dann umbenennen – ein Absturz hinterlässt so keinen halben Spielstand.
  let temp = path.with_extension("json.tmp");
  fs::write(&temp, content).map_err(|e| e.to_string())?;
  fs::rename(&temp, &path).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_save(app: AppHandle, id: String) -> Result<(), String> {
  let path = save_path(&app, &id)?;
  match fs::remove_file(&path) {
    Err(e) if e.kind() != std::io::ErrorKind::NotFound => Err(e.to_string()),
    _ => Ok(()),
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![saves_location, list_saves, write_save, delete_save])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

/**
 * Erzeugt public/third-party-licenses.txt: Lizenzhinweise aller fremden Pakete, die mit WinzerAI ausgeliefert werden –
 * JavaScript im Web-Bundle und Service Worker sowie die Rust-Crates der Desktop-App.
 * Aufruf: npm run licenses (braucht installierte node_modules und Cargo für die Rust-Liste)
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
/** Pakete, die zur Laufzeit im Browser landen; ihre Abhängigkeiten kommen automatisch dazu */
const JS_ROOTS = ['svelte', '@tauri-apps/api', 'workbox-core', 'workbox-precaching', 'workbox-routing', 'workbox-strategies']
const RUST_TARGET = 'x86_64-pc-windows-msvc'
const LICENSE_FILE = /^(licen[cs]e|copying|notice)/i

function licenseTexts(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => LICENSE_FILE.test(f))
    .sort()
    .map((f) => readFileSync(join(dir, f), 'utf8').replace(/\r\n/g, '\n').trim())
}

function jsPackages() {
  const lock = JSON.parse(readFileSync(join(root, 'package-lock.json'), 'utf8'))
  const seen = new Map()
  const visit = (name) => {
    if (seen.has(name) || name.startsWith('@types/')) return
    const entry = lock.packages[`node_modules/${name}`]
    if (!entry) return
    const dir = join(root, 'node_modules', name)
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    const repo = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url
    seen.set(name, { name, version: entry.version, license: entry.license ?? pkg.license ?? 'unbekannt', repo, texts: licenseTexts(dir) })
    for (const dep of Object.keys(entry.dependencies ?? {})) visit(dep)
  }
  JS_ROOTS.forEach(visit)
  return [...seen.values()]
}

function rustPackages() {
  const raw = execFileSync(
    'cargo',
    ['metadata', '--format-version', '1', '--locked', '--filter-platform', RUST_TARGET, '--manifest-path', join(root, 'src-tauri', 'Cargo.toml')],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  )
  const meta = JSON.parse(raw)
  const packages = new Map(meta.packages.map((p) => [p.id, p]))
  const nodes = new Map(meta.resolve.nodes.map((n) => [n.id, n]))
  const self = meta.resolve.root
  // Nur normale Abhängigkeiten landen in der fertigen exe – Build-Skripte und Tests nicht.
  const shipped = new Set()
  const visit = (id) => {
    if (shipped.has(id)) return
    shipped.add(id)
    for (const dep of nodes.get(id)?.deps ?? []) {
      if (dep.dep_kinds.some((k) => k.kind === null)) visit(dep.pkg)
    }
  }
  visit(self)
  shipped.delete(self)
  return [...shipped].map((id) => {
    const p = packages.get(id)
    const dir = dirname(p.manifest_path)
    const texts = licenseTexts(dir)
    if (p.license_file) texts.push(readFileSync(join(dir, p.license_file), 'utf8').replace(/\r\n/g, '\n').trim())
    return { name: p.name, version: p.version, license: p.license ?? 'siehe Lizenzdatei', repo: p.repository, texts }
  })
}

/** Pakete mit identischem Lizenztext werden zusammengefasst, damit die Datei handhabbar bleibt. */
function section(title, packages) {
  const groups = new Map()
  for (const pkg of packages.sort((a, b) => a.name.localeCompare(b.name))) {
    const key = pkg.texts.join('\n\n---\n\n') || `(kein Lizenztext im Paket – Lizenz: ${pkg.license}${pkg.repo ? `, Quelle: ${pkg.repo}` : ''})`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(pkg)
  }
  const line = '='.repeat(78)
  let out = `${line}\n${title} (${packages.length} Pakete)\n${line}\n\n`
  for (const [text, pkgs] of groups) {
    out += pkgs.map((p) => `${p.name} ${p.version} – ${p.license}`).join('\n')
    out += `\n${'-'.repeat(78)}\n${text}\n\n\n`
  }
  return out
}

let rust = []
try {
  rust = rustPackages()
} catch (error) {
  console.warn('Rust-Abhängigkeiten nicht ermittelbar (ist Cargo im PATH?):', error.message)
  process.exitCode = 1
}
const js = jsPackages()
const header =
  'WinzerAI – Lizenzen der verwendeten Software von Dritten\n\n' +
  'WinzerAI nutzt quelloffene Bibliotheken. Ihre Lizenzbedingungen verlangen, die folgenden Hinweise mitzuliefern.\n' +
  'Teil 1 betrifft die Web-App (Browser und Desktop), Teil 2 nur die Desktop-App.\n\n'
writeFileSync(join(root, 'public', 'third-party-licenses.txt'), header + section('Teil 1: JavaScript', js) + section('Teil 2: Rust (Desktop-App)', rust))
console.log(`third-party-licenses.txt geschrieben: ${js.length} JavaScript-Pakete, ${rust.length} Rust-Crates`)

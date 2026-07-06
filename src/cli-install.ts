import { spawnSync } from "node:child_process"
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { cliReleaseAssetFor, type CliReleaseAsset } from "./cli-release-asset"

export type CliInstallOptions = {
  version: string
  onProgress?: (downloadedBytes: number, totalBytes: number | null) => void
  signal?: AbortSignal
}

export type CliInstallResult = {
  binaryPath: string
  pathUpdated: boolean
}

/**
 * Returns the directory where the CLI binary will be placed.
 * - Windows: %LOCALAPPDATA%\IdexalWork\cli
 * - macOS/Linux: ~/.idexalwork/bin
 */
function cliInstallDir(): string {
  const home = os.homedir()
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA || path.join(home, "AppData", "Local")
    return path.join(localAppData, "IdexalWork", "cli")
  }
  return path.join(home, ".idexalwork", "bin")
}

function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true })
}

/**
 * Download the CLI release asset to disk.
 */
async function downloadCli(asset: CliReleaseAsset, targetDir: string, opts: CliInstallOptions): Promise<string> {
  const targetPath = path.join(targetDir, asset.fileName)
  const response = await fetch(asset.url, { redirect: "follow", signal: opts.signal })
  if (!response.ok || !response.body) {
    throw new Error(`CLI download failed (${response.status}): ${asset.url}`)
  }

  const contentLength = Number(response.headers.get("content-length") ?? "")
  const total = Number.isFinite(contentLength) && contentLength > 0 ? contentLength : null

  const file = Bun.file(targetPath)
  const writer = file.writer()
  let downloaded = 0
  for await (const chunk of response.body) {
    writer.write(chunk)
    downloaded += chunk.byteLength
    opts.onProgress?.(downloaded, total)
  }
  await writer.end()
  return targetPath
}

/**
 * Extract a .tar.gz archive and return the path to the contained binary.
 * Uses system `tar` (available on macOS and Linux by default).
 */
function extractTarGz(tarPath: string, targetDir: string, binaryName: string): string {
  const result = spawnSync("tar", ["xzf", tarPath, "-C", targetDir])
  if (result.exitCode !== 0) {
    throw new Error(`tar extraction failed: ${result.stderr?.toString()?.trim() || "unknown error"}`)
  }
  const binaryPath = path.join(targetDir, binaryName)
  if (!existsSync(binaryPath)) {
    throw new Error(`CLI binary "${binaryName}" not found after extraction in ${targetDir}`)
  }
  return binaryPath
}

/**
 * Add a directory to the Windows user PATH via registry.
 * Returns true if PATH was modified.
 */
function addToWindowsPath(dir: string): boolean {
  const result = spawnSync("reg", ["query", "HKCU\\Environment", "/v", "PATH"])
  const output = result.stdout?.toString() || ""
  const match = output.match(/PATH\s+REG_\w+\s+(.*)/)
  const currentPath = match ? match[1].trim() : ""
  const pathParts = currentPath.split(";").filter(Boolean)

  if (pathParts.some((p) => p.toLowerCase() === dir.toLowerCase())) {
    return false // Already in PATH
  }

  pathParts.push(dir)
  const newPath = pathParts.join(";")

  const setResult = spawnSync("reg", [
    "add", "HKCU\\Environment",
    "/v", "PATH",
    "/t", "REG_EXPAND_SZ",
    "/d", newPath,
    "/f",
  ])
  if (setResult.exitCode !== 0) {
    throw new Error(`Failed to update PATH: ${setResult.stderr?.toString()?.trim()}`)
  }
  return true
}

/**
 * Add a directory to shell rc files (bash/zsh) for macOS/Linux.
 * Returns true if any file was modified.
 */
function addToShellPath(dir: string): boolean {
  const home = os.homedir()
  const rcFiles = [".bashrc", ".zshrc", ".zprofile", ".bash_profile"]
  let updated = false

  for (const rcFile of rcFiles) {
    const rcPath = path.join(home, rcFile)
    if (!existsSync(rcPath)) continue

    const content = readFileSync(rcPath, "utf8")
    const line = `export PATH="${dir}:$PATH"`
    if (content.includes(dir)) continue

    writeFileSync(rcPath, `\n# Added by IdexalWork Installer\n${line}\n`, { flag: "a" })
    updated = true
  }

  return updated
}

/**
 * Install the IdexalWork CLI:
 * 1. Detect platform and resolve the correct release asset
 * 2. Download the archive/binary
 * 3. Extract / place the binary
 * 4. Add to PATH
 */
export async function installCli(version: string, opts: CliInstallOptions = {}): Promise<CliInstallResult> {
  const asset = cliReleaseAssetFor(version)
  const targetDir = cliInstallDir()
  ensureDir(targetDir)

  // Step 1: Download
  const downloadedPath = await downloadCli(asset, targetDir, opts)

  // Step 2: Extract or place binary
  let binaryPath: string
  if (asset.fileName.endsWith(".tar.gz")) {
    binaryPath = extractTarGz(downloadedPath, targetDir, asset.binaryName)
  } else {
    // Windows .exe — rename to canonical name
    binaryPath = path.join(targetDir, asset.binaryName)
    if (downloadedPath !== binaryPath) {
      const src = Bun.file(downloadedPath)
      const dst = Bun.file(binaryPath)
      await Bun.write(dst, await src.bytes())
    }
  }

  // Step 3: Make executable (not needed on Windows)
  if (process.platform !== "win32") {
    chmodSync(binaryPath, 0o755)
  }

  // Step 4: Add to PATH
  let pathUpdated = false
  if (process.platform === "win32") {
    pathUpdated = addToWindowsPath(targetDir)
  } else {
    // On macOS/Linux: try ~/.local/bin (commonly on PATH), fallback to shell rc
    const localBin = path.join(os.homedir(), ".local", "bin")
    ensureDir(localBin)
    const symlinkPath = path.join(localBin, "idexalwork")
    if (!existsSync(symlinkPath)) {
      try {
        spawnSync("ln", ["-sf", binaryPath, symlinkPath])
        pathUpdated = true
      } catch {
        pathUpdated = addToShellPath(targetDir)
      }
    }
  }

  return { binaryPath, pathUpdated }
}

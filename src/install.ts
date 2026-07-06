import { spawn } from "node:child_process"
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"

import { desktopBootstrapPath } from "./bootstrap-path"
import type { InstallerConfig } from "./config"
import { releaseAssetFor, type ReleaseAsset } from "./release-asset"
import { installCli, type CliInstallResult } from "./cli-install"

export type InstallStep =
  | "write-config"
  | "check-version"
  | "download-desktop"
  | "install-desktop"
  | "download-cli"
  | "install-cli"

export type InstallStatus = {
  state: "idle" | "running" | "done" | "error"
  step: InstallStep | null
  message: string
  version: string | null
  downloadedBytes: number
  totalBytes: number | null
  installedPath: string | null
  error: string | null
  /** Per-component progress for the wizard UI */
  desktop: {
    downloadedBytes: number
    totalBytes: number | null
    step: "idle" | "write-config" | "check-version" | "download" | "install" | "done" | "error"
    message: string
  }
  cli: {
    downloadedBytes: number
    totalBytes: number | null
    step: "idle" | "download" | "install" | "done" | "error"
    message: string
  }
}

export type InstallOptions = {
  /** Stop after resolving + HEAD-checking the download; used by CI smoke tests. */
  dryRun?: boolean
  /** Whether to install the CLI alongside the Desktop app (default: true). */
  includeCli?: boolean
  onStatus?: (status: InstallStatus) => void
}

const status: InstallStatus = {
  state: "idle",
  step: null,
  message: "",
  version: null,
  downloadedBytes: 0,
  totalBytes: null,
  installedPath: null,
  error: null,
  desktop: { downloadedBytes: 0, totalBytes: null, step: "idle", message: "" },
  cli: { downloadedBytes: 0, totalBytes: null, step: "idle", message: "" },
}

export function installStatus(): InstallStatus {
  return { ...status, desktop: { ...status.desktop }, cli: { ...status.cli } }
}

function update(partial: Partial<InstallStatus>, onStatus?: (status: InstallStatus) => void) {
  Object.assign(status, partial)
  // Sync top-level backward-compat fields from desktop sub-status
  if (partial.desktop) {
    status.downloadedBytes = partial.desktop.downloadedBytes
    status.totalBytes = partial.desktop.totalBytes
  }
  onStatus?.(installStatus())
}

/**
 * Merge the deployment config into any existing bootstrap file rather than
 * replacing it: a re-run must not destroy handoff/prepared/claimLinks state
 * written by the bootstrap CLI (see normalizeDesktopBootstrapConfig in the
 * Electron shell for the full shape).
 */
export function writeBootstrapConfig(config: InstallerConfig, env: NodeJS.ProcessEnv = process.env): string {
  const target = desktopBootstrapPath(env)
  let existing: Record<string, unknown> = {}
  try {
    const parsed = JSON.parse(readFileSync(target, "utf8"))
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) existing = parsed
  } catch {
    // Missing or invalid file: start fresh.
  }

  const next = {
    ...existing,
    baseUrl: config.webUrl,
    apiBaseUrl: config.apiUrl,
    requireSignin: config.requireSignin,
  }
  mkdirSync(path.dirname(target), { recursive: true })
  writeFileSync(target, `${JSON.stringify(next, null, 2)}\n`, "utf8")
  return target
}

/** Ask the deployment's Den API which desktop version it supports. */
export async function fetchLatestSupportedVersion(apiUrl: string): Promise<string> {
  const response = await fetch(`${apiUrl}/v1/app-version`, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) {
    throw new Error(`Deployment version check failed (${response.status} ${response.statusText})`)
  }
  const payload = (await response.json()) as { latestAppVersion?: unknown }
  const version = typeof payload.latestAppVersion === "string" ? payload.latestAppVersion.trim() : ""
  if (!version || version === "0.0.0") {
    throw new Error("Deployment did not declare a desktop app version (latestAppVersion missing)")
  }
  return version
}

async function downloadAsset(
  asset: ReleaseAsset,
  targetPath: string,
  opts: InstallOptions & { onProgress?: (downloaded: number, total: number | null) => void },
): Promise<void> {
  const response = await fetch(asset.url, { redirect: "follow" })
  if (!response.ok || !response.body) {
    throw new Error(`Download failed (${response.status} ${response.statusText}): ${asset.url}`)
  }
  const contentLength = Number(response.headers.get("content-length") ?? "")
  const total = Number.isFinite(contentLength) && contentLength > 0 ? contentLength : null
  if (total) update({ totalBytes: total }, opts.onStatus)

  const file = Bun.file(targetPath)
  const writer = file.writer()
  let downloaded = 0
  for await (const chunk of response.body) {
    writer.write(chunk)
    downloaded += chunk.byteLength
    opts.onProgress?.(downloaded, total)
  }
  await writer.end()
}

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "ignore" })
    child.on("error", reject)
    child.on("exit", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`))
    })
  })
}

function installDmg(dmgPath: string, workDir: string): string {
  const mountPoint = path.join(workDir, "mount")
  mkdirSync(mountPoint, { recursive: true })
  const appDir = path.join(os.homedir(), "Applications")
  mkdirSync(appDir, { recursive: true })
  const attach = Bun.spawnSync(["hdiutil", "attach", dmgPath, "-nobrowse", "-readonly", "-mountpoint", mountPoint])
  if (attach.exitCode !== 0) {
    throw new Error(`hdiutil attach failed: ${attach.stderr.toString().trim()}`)
  }
  try {
    const appName = readdirSync(mountPoint).find((entry) => entry.endsWith(".app"))
    if (!appName) throw new Error("No .app bundle found inside the downloaded disk image")
    const target = path.join(appDir, appName)
    rmSync(target, { recursive: true, force: true })
    const copy = Bun.spawnSync(["ditto", path.join(mountPoint, appName), target])
    if (copy.exitCode !== 0) {
      throw new Error(`ditto failed: ${copy.stderr.toString().trim()}`)
    }
    return target
  } finally {
    Bun.spawnSync(["hdiutil", "detach", mountPoint, "-quiet"])
  }
}

async function installExe(exePath: string): Promise<string> {
  // The release asset is an NSIS installer; /S runs the standard per-user
  // silent install (shortcuts, uninstaller, updater layout all included).
  await run(exePath, ["/S"])
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local")
  return path.join(localAppData, "Programs", "IdexalWork", "IdexalWork.exe")
}

function installAppImage(appImagePath: string): string {
  const appDir = path.join(os.homedir(), ".local", "share", "idexalwork")
  mkdirSync(appDir, { recursive: true })
  const target = path.join(appDir, "IdexalWork.AppImage")
  rmSync(target, { force: true })
  writeFileSync(target, readFileSync(appImagePath))
  chmodSync(target, 0o755)

  // Best-effort launcher entry so the app shows up in desktop menus.
  try {
    const applicationsDir = path.join(os.homedir(), ".local", "share", "applications")
    mkdirSync(applicationsDir, { recursive: true })
    writeFileSync(
      path.join(applicationsDir, "idexalwork.desktop"),
      ["[Desktop Entry]", "Type=Application", "Name=IdexalWork", `Exec=${target}`, "Terminal=false", "Categories=Utility;"].join("\n") + "\n",
      "utf8",
    )
  } catch {
    // Menu integration is optional; the AppImage itself is installed.
  }
  return target
}

/**
 * Run the full install flow: Desktop app first, then CLI.
 *
 * Progress is reported via the onStatus callback which the server's
 * /api/status endpoint surfaces to the Alpine.js wizard UI.
 */
export async function runInstall(config: InstallerConfig, opts: InstallOptions = {}): Promise<InstallStatus> {
  if (status.state === "running") return installStatus()

  // Reset per-component progress
  status.desktop = { downloadedBytes: 0, totalBytes: null, step: "idle", message: "" }
  status.cli = { downloadedBytes: 0, totalBytes: null, step: "idle", message: "" }

  const includeCli = opts.includeCli !== false

  update(
    {
      state: "running",
      step: "write-config",
      message: "Writing deployment configuration...",
      version: null,
      downloadedBytes: 0,
      totalBytes: null,
      installedPath: null,
      error: null,
      desktop: { ...status.desktop, step: "write-config", message: "Writing configuration..." },
    },
    opts.onStatus,
  )

  try {
    // ---- 1. Write bootstrap config ----
    const bootstrapPath = writeBootstrapConfig(config)
    update({
      step: "check-version",
      message: "Checking version...",
      desktop: { ...status.desktop, step: "check-version", message: "Checking version..." },
    }, opts.onStatus)

    // ---- 2. Fetch supported version ----
    const version = await fetchLatestSupportedVersion(config.apiUrl)
    const asset = releaseAssetFor(version)
    update({ version, message: `Deployment supports IdexalWork ${version}.` }, opts.onStatus)

    // ---- 3. Dry-run? ----
    if (opts.dryRun) {
      const head = await fetch(asset.url, { method: "HEAD", redirect: "follow" })
      if (!head.ok) throw new Error(`Release asset missing (${head.status}): ${asset.url}`)
      if (includeCli) {
        const { cliReleaseAssetFor } = await import("./cli-release-asset")
        const cliAsset = cliReleaseAssetFor(version)
        const cliHead = await fetch(cliAsset.url, { method: "HEAD", redirect: "follow" })
        if (!cliHead.ok) throw new Error(`CLI release asset missing (${cliHead.status}): ${cliAsset.url}`)
      }
      update(
        { state: "done", step: null, message: `Dry run ok: ${asset.fileName} available; config written to ${bootstrapPath}.` },
        opts.onStatus,
      )
      return installStatus()
    }

    // ---- 4. Desktop App: Download ----
    update({
      step: "download-desktop",
      message: `Downloading IdexalWork ${version}...`,
      desktop: { downloadedBytes: 0, totalBytes: null, step: "download", message: "Downloading Desktop..." },
    }, opts.onStatus)

    const workDir = path.join(os.tmpdir(), `idexalwork-installer-${process.pid}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(workDir, { recursive: true })
    try {
      const artifactPath = path.join(workDir, asset.fileName)
      await downloadAsset(asset, artifactPath, {
        ...opts,
        onProgress: (downloaded, total) => {
          update({
            desktop: { downloadedBytes: downloaded, totalBytes: total, step: "download", message: "Downloading Desktop..." },
            downloadedBytes: downloaded,
            totalBytes: total,
          }, opts.onStatus)
        },
      })

      // ---- 5. Desktop App: Install ----
      update({
        step: "install-desktop",
        message: "Installing IdexalWork...",
        desktop: { ...status.desktop, step: "install", message: "Installing Desktop..." },
      }, opts.onStatus)

      const installedPath =
        asset.type === "dmg"
          ? installDmg(artifactPath, workDir)
          : asset.type === "exe"
            ? await installExe(artifactPath)
            : installAppImage(artifactPath)

      update({
        installedPath,
        desktop: { ...status.desktop, step: "done", message: "Desktop installed" },
      }, opts.onStatus)

      // ---- 6. CLI: Download + Install ----
      if (includeCli) {
        update({
          step: "download-cli",
          message: "Downloading IdexalWork CLI...",
          cli: { downloadedBytes: 0, totalBytes: null, step: "download", message: "Downloading CLI..." },
        }, opts.onStatus)

        await installCli(version, {
          onProgress: (downloaded, total) => {
            update({
              cli: { downloadedBytes: downloaded, totalBytes: total, step: "download", message: "Downloading CLI..." },
            }, opts.onStatus)
          },
        })

        update({
          step: "install-cli",
          message: "Installing CLI...",
          cli: { ...status.cli, step: "install", message: "Adding to PATH..." },
        }, opts.onStatus)

        update({
          cli: { ...status.cli, step: "done", message: "CLI installed" },
        }, opts.onStatus)
      }

      // ---- 7. Done ----
      update(
        {
          state: "done",
          step: null,
          installedPath,
          message: `IdexalWork ${version} installed successfully.`,
          desktop: { ...status.desktop, step: "done", message: "Installed" },
          cli: includeCli ? { ...status.cli, step: "done", message: "Installed" } : status.cli,
        },
        opts.onStatus,
      )
    } finally {
      rmSync(workDir, { recursive: true, force: true })
    }
  } catch (error) {
    update(
      {
        state: "error",
        error: error instanceof Error ? error.message : String(error),
        message: "Install failed.",
        desktop: { ...status.desktop, step: "error", message: error instanceof Error ? error.message : "Failed" },
      },
      opts.onStatus,
    )
  }
  return installStatus()
}

export function launchInstalledApp(installedPath: string): void {
  if (!installedPath || !existsSync(installedPath)) return
  if (process.platform === "darwin") {
    Bun.spawn(["open", installedPath], { stdio: ["ignore", "ignore", "ignore"] })
  } else {
    Bun.spawn([installedPath], { stdio: ["ignore", "ignore", "ignore"] })
  }
}

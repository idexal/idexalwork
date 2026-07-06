const CLI_GITHUB_REPO = "idexal/idexalwork"

export type CliReleaseAsset = {
  version: string
  fileName: string
  url: string
  /** The binary name after extraction (without path) */
  binaryName: string
}

/**
 * CLI release assets follow a deterministic naming scheme from
 * github.com/idexal/idexalwork releases:
 *
 *   - Windows: idexalwork-cli-win-x64-<version>.exe
 *   - macOS:   idexalwork-cli-mac-<arch>-<version>.tar.gz
 *   - Linux:   idexalwork-cli-linux-<arch>-<version>.tar.gz
 */
export function cliReleaseAssetFor(
  version: string,
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch,
): CliReleaseAsset {
  const normalized = version.trim().replace(/^v/i, "")
  if (!normalized) throw new Error("version is required")

  if (platform === "win32") {
    if (arch !== "x64") throw new Error(`unsupported Windows architecture: ${arch}`)
    const fileName = `idexalwork-cli-win-x64-${normalized}.exe`
    return {
      version: normalized,
      fileName,
      url: `https://github.com/${CLI_GITHUB_REPO}/releases/download/v${normalized}/${encodeURIComponent(fileName)}`,
      binaryName: "idexalwork.exe",
    }
  }

  if (platform === "darwin") {
    const cliArch = arch === "arm64" ? "arm64" : "x64"
    const fileName = `idexalwork-cli-mac-${cliArch}-${normalized}.tar.gz`
    return {
      version: normalized,
      fileName,
      url: `https://github.com/${CLI_GITHUB_REPO}/releases/download/v${normalized}/${encodeURIComponent(fileName)}`,
      binaryName: "idexalwork",
    }
  }

  if (platform === "linux") {
    const cliArch = arch === "arm64" ? "arm64" : "x64"
    const fileName = `idexalwork-cli-linux-${cliArch}-${normalized}.tar.gz`
    return {
      version: normalized,
      fileName,
      url: `https://github.com/${CLI_GITHUB_REPO}/releases/download/v${normalized}/${encodeURIComponent(fileName)}`,
      binaryName: "idexalwork",
    }
  }

  throw new Error(`unsupported platform: ${platform}`)
}

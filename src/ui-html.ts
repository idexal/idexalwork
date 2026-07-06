import { renderWizardHtml } from "./ui/renderer"
import { installerConfigSourceLabel, type InstallerConfigResolution } from "./config"

/**
 * Render the installer HTML page, delegating to the Alpine.js-based wizard renderer.
 *
 * This function preserves the same signature as before so the server import
 * (server.ts) needs no changes.
 */
export function renderInstallerHtml(resolution: InstallerConfigResolution | null, token: string): string {
  const config = resolution?.config ?? null
  const sourceLabel = resolution ? installerConfigSourceLabel(resolution.source) : ""
  return renderWizardHtml(config, sourceLabel, token)
}

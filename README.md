# IdexalWork Installer — Professional Wizard

The official desktop installer for IdexalWork — a polished, multi-step Wizard that installs both the IdexalWork Desktop app and CLI tool.

## ✨ Features

- **5-Step Wizard UI** — Welcome → Connect → Confirm → Install → Complete
- **Alpine.js + Tailwind CSS** — reactive, professional UI with glassmorphism, dark/light mode
- **Dual Install** — installs Desktop app (EXE/DMG/AppImage) **and** CLI tool in parallel
- **CLI PATH Setup** — automatically adds CLI to PATH on Windows (registry) and macOS/Linux (symlink/shell rc)
- **Single Binary** — compiled with Bun into one standalone executable
- **Install Link** — paste-based deployment config, or manual URL entry
- **Progress Tracking** — per-component progress bars with download speed and size

## 📦 Installation

Download the latest release for your platform:

- **Windows:** `idexalwork-installer-win-x64.exe`
- **macOS:** `idexalwork-installer-mac-arm64` / `idexalwork-installer-mac-x64`
- **Linux:** `idexalwork-installer-linux-x64` / `idexalwork-installer-linux-arm64`

## 🏗️ Build from source

```bash
git clone https://github.com/idexal/idexalwork.git
cd idexalwork
bun install
bun run compile
```

This produces a single binary at `dist/idexalwork-installer`.

## 🚀 Usage

```bash
# UI mode (default) — opens native webview window
bun run src/index.ts

# Headless dry-run (CI smoke test)
IDEXALWORK_INSTALLER_CLIENT_NAME="Acme" \
IDEXALWORK_INSTALLER_WEB_URL="https://idexalwork.acme.com" \
IDEXALWORK_INSTALLER_API_URL="https://idexalwork-api.acme.com" \
bun run src/index.ts --headless --dry-run

# With install link
bun run src/index.ts --headless --install-link "https://your-org.idexalwork.com/install?token=..."
```

## 📁 Project Structure

```
src/
├── ui/
│   ├── renderer.ts         Wizard UI (Alpine.js + Tailwind CSS)
│   └── steps.ts            Step definitions and progress types
├── cli-install.ts          CLI download + PATH setup per platform
├── cli-release-asset.ts    CLI release asset resolution
├── config.ts               Installer config types
├── config-sources.ts       Config resolution (env, sidecar, install-link)
├── install.ts              Desktop + CLI install orchestration
├── release-asset.ts        Desktop release asset resolution
├── server.ts               Loopback HTTP API server
├── server-worker.ts        Worker thread for server
├── ui-html.ts              Thin wrapper → renderer.ts
├── index.ts                Entry point (UI / headless modes)
├── bootstrap-path.ts       desktop-bootstrap.json path resolution
├── idexalwork-logo.ts      Embedded logo SVG
└── generated/
    └── build-config.ts     Build-time config placeholder
```

## 🔧 Tech Stack

- **Bun** — runtime + single-binary compiler
- **Alpine.js** — reactive UI (14 KB, CDN)
- **Tailwind CSS** — styling (CDN)
- **webview-bun** — native webview window
- **TypeScript** — type safety

## 📜 License

AGPL-3.0

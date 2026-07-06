import type { InstallerConfig } from "../config"
import { IDEXALWORK_LOGO_SVG } from "../idexalwork-logo"

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&": return "&amp;"
      case "<": return "&lt;"
      case ">": return "&gt;"
      case '"': return "&quot;"
      case "'": return "&#39;"
      default: return char
    }
  })
}

/**
 * Generate the full wizard HTML page with Alpine.js + Tailwind CSS.
 *
 * @param config - Resolved installer config, or null if not yet configured
 * @param resolutionSource - Human-readable config source label
 * @param token - Per-process API token embedded in the page
 */
export function renderWizardHtml(
  config: InstallerConfig | null,
  resolutionSource: string,
  token: string,
): string {
  const clientName = config ? escapeHtml(config.clientName) : ""
  const webUrl = config ? escapeHtml(config.webUrl) : ""
  const logoHtml = config?.logoUrl
    ? `<img class="w-20 h-20 object-contain" src="${escapeHtml(config.logoUrl)}" alt="${clientName}" />`
    : IDEXALWORK_LOGO_SVG

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>IdexalWork Installer</title>
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.14.8/dist/cdn.min.js"></script>
<script src="https://cdn.tailwindcss.com"></script>
<script>
tailwind.config = {
  theme: {
    extend: {
      colors: {
        accent: { DEFAULT: '#6366f1', light: '#818cf8' },
      }
    }
  }
}
</script>
<style>
  @keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
  @keyframes confetti-fall {
    0% { transform:translateY(-10px) rotate(0deg); opacity:1; }
    100% { transform:translateY(100vh) rotate(720deg); opacity:0; }
  }
  .step-enter { animation: fadeIn 0.4s ease-out; }
  .step-slide { animation: slideIn 0.35s ease-out; }
  .glass {
    background: rgba(255,255,255,0.7);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
  }
  .progress-bar-fill { transition: width 0.3s ease; }
  .confetti-piece {
    position: fixed; width: 8px; height: 8px; border-radius: 2px;
    animation: confetti-fall 3s ease-in forwards;
  }
  @media (prefers-color-scheme: dark) {
    .glass { background: rgba(24,24,27,0.8); border-color: rgba(55,65,81,0.5); }
  }
</style>
</head>
<body class="m-0 p-0 min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-indigo-50 dark:from-[#0a0a0b] dark:via-[#18181b] dark:to-[#1e1e24] font-[-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif] transition-colors"
      x-data="installerWizard()"
      x-init="init()">
  <div class="relative w-[440px] min-h-[520px]">
    <!-- Step indicator dots -->
    <div class="flex justify-center gap-2 mb-6" x-show="step !== 'welcome'">
      <template x-for="(s, i) in steps" :key="s">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300"
               :class="stepIndex >= i ? 'bg-accent text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'"
               x-text="i + 1"></div>
          <div class="h-0.5 w-6 rounded transition-colors"
               :class="stepIndex > i ? 'bg-accent' : 'bg-gray-200 dark:bg-gray-700'"
               x-show="i < steps.length - 1"></div>
        </div>
      </template>
    </div>

    <!-- Card container -->
    <div class="glass rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8 step-enter" :key="step">

      <!-- ==================== Step 1: Welcome ==================== -->
      <div x-show="step === 'welcome'" class="step-slide text-center space-y-5">
        <div class="flex justify-center mb-2">
          ${logoHtml.replace('height:72px', 'height:96px').replace('max-height:72px', 'max-height:96px')}
        </div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">IdexalWork</h1>
        <p class="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">Professional AI Agent<br/>Desktop Environment</p>
        <button @click="goTo('connect')"
                class="mt-4 w-full py-3 px-6 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 dark:focus:ring-offset-gray-900">
          Get Started →
        </button>
        <p class="text-xs text-gray-400 dark:text-gray-500 pt-2">
          Already have an install link?
          <button @click="goTo('connect')" class="text-accent hover:underline font-medium bg-transparent border-none cursor-pointer text-xs">Paste it here</button>
        </p>
      </div>

      <!-- ==================== Step 2: Connect ==================== -->
      <div x-show="step === 'connect'" class="step-slide space-y-5">
        <div class="flex items-center gap-3 mb-2">
          <button @click="back()" class="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-none bg-transparent cursor-pointer">
            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Connect to your deployment</h2>
        </div>

        <div class="space-y-3">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Install Link</label>
          <input type="url" x-model="installLink"
            class="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-accent focus:border-transparent outline-none transition-all"
            placeholder="https://your-org.idexalwork.com/install?token=..." />
          <button @click="resolveLink()"
            class="w-full py-2.5 bg-accent text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-accent">
            Verify &amp; Continue
          </button>
          <p x-show="connectError" x-text="connectError" class="text-red-500 text-xs"></p>
        </div>

        <div class="relative">
          <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-gray-200 dark:border-gray-700"></div></div>
          <div class="relative flex justify-center"><span class="px-3 text-xs text-gray-400 bg-white dark:bg-gray-800">or</span></div>
        </div>

        <div>
          <button @click="showManual = !showManual" class="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors bg-transparent border-none cursor-pointer">
            <svg class="w-4 h-4 transition-transform" :class="{'rotate-180': showManual}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            Configure manually
          </button>
          <div x-show="showManual" class="mt-3 space-y-3">
            <input type="url" x-model="manualUrl"
              class="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-accent outline-none"
              placeholder="Web URL (https://...)" />
            <input type="url" x-model="manualApiUrl"
              class="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-accent outline-none"
              placeholder="API URL (https://...)" />
            <button @click="resolveManual()" class="w-full py-2.5 bg-accent text-white rounded-xl font-medium text-sm">Connect</button>
          </div>
        </div>
      </div>

      <!-- ==================== Step 3: Confirm ==================== -->
      <div x-show="step === 'confirm'" class="step-slide space-y-5">
        <div class="flex items-center gap-3 mb-2">
          <button @click="back()" class="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-none bg-transparent cursor-pointer">
            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Confirm Installation</h2>
        </div>

        <div class="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-2 text-sm">
          <div class="flex justify-between"><span class="text-gray-500">Organization</span><span class="font-medium text-gray-900 dark:text-white">${clientName || '—'}</span></div>
          <div class="flex justify-between"><span class="text-gray-500">Server</span><span class="font-medium text-gray-900 dark:text-white break-all">${webUrl || '—'}</span></div>
        </div>

        <div class="space-y-3">
          <label class="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-accent transition-colors cursor-pointer">
            <input type="checkbox" x-model="selection.desktop" class="w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent" />
            <div>
              <div class="font-medium text-sm text-gray-900 dark:text-white">Desktop App</div>
              <div class="text-xs text-gray-400">~180 MB — IdexalWork application</div>
            </div>
          </label>
          <label class="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-accent transition-colors cursor-pointer">
            <input type="checkbox" x-model="selection.cli" class="w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent" />
            <div>
              <div class="font-medium text-sm text-gray-900 dark:text-white">CLI Tool</div>
              <div class="text-xs text-gray-400">~25 MB — Added to PATH automatically</div>
            </div>
          </label>
          <label class="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-accent transition-colors cursor-pointer">
            <input type="checkbox" x-model="selection.launchAfterInstall" class="w-4 h-4 rounded border-gray-300 text-accent focus:ring-accent" />
            <span class="text-sm text-gray-700 dark:text-gray-300">Launch after install</span>
          </label>
        </div>

        <button @click="startInstall()"
                :disabled="!selection.desktop && !selection.cli"
                class="w-full py-3 bg-accent text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-accent">
          Install Now 🚀
        </button>
      </div>

      <!-- ==================== Step 4: Install Progress ==================== -->
      <div x-show="step === 'install'" class="step-slide space-y-6">
        <div class="text-center">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Installing...</h2>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Please wait while IdexalWork is being installed</p>
        </div>

        <!-- Desktop progress bar -->
        <div x-show="selection.desktop" class="space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-gray-700 dark:text-gray-300 font-medium">📦 Desktop App</span>
            <span class="text-gray-400 text-xs" x-text="progress.desktop.message || 'Preparing...'"></span>
          </div>
          <div class="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div class="h-full bg-accent rounded-full progress-bar-fill"
                 :style="'width: ' + desktopPercent + '%'"></div>
          </div>
          <div class="text-xs text-gray-400" x-show="progress.desktop.totalBytes">
            <span x-text="desktopMb"></span>
          </div>
        </div>

        <!-- CLI progress bar -->
        <div x-show="selection.cli" class="space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-gray-700 dark:text-gray-300 font-medium">🖥️ CLI Tool</span>
            <span class="text-gray-400 text-xs" x-text="progress.cli.message || 'Waiting...'"></span>
          </div>
          <div class="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div class="h-full bg-indigo-400 rounded-full progress-bar-fill"
                 :style="'width: ' + cliPercent + '%'"></div>
          </div>
          <div class="text-xs text-gray-400" x-show="progress.cli.totalBytes">
            <span x-text="cliMb"></span>
          </div>
        </div>

        <!-- Overall status -->
        <div class="flex items-center justify-center gap-2 text-sm text-gray-400" x-show="progress.overallState === 'running'">
          <div class="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
          <span>Installing...</span>
        </div>
        <p x-show="progress.overallState === 'error'" class="text-red-500 text-sm text-center" x-text="progress.desktop.message || progress.cli.message"></p>
      </div>

      <!-- ==================== Step 5: Complete ==================== -->
      <div x-show="step === 'complete'" class="step-slide text-center space-y-5">
        <!-- Confetti -->
        <div x-show="showConfetti" class="fixed inset-0 pointer-events-none overflow-hidden" style="z-index:9999">
          <template x-for="i in 40" :key="i">
            <div class="confetti-piece"
                 :style="'left:' + (Math.random() * 100) + 'vw; background:' + ['#6366f1','#818cf8','#22c55e','#f59e0b','#ef4444'][i % 5] + '; animation-delay:' + (Math.random() * 2) + 's; animation-duration:' + (2 + Math.random() * 2) + 's'"></div>
          </template>
        </div>

        <div class="text-5xl" x-show="showConfetti">🎉</div>
        <h2 class="text-xl font-bold text-gray-900 dark:text-white">All done!</h2>

        <div class="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-3 text-sm text-left">
          <div x-show="selection.desktop" class="flex items-center gap-2 text-green-600 dark:text-green-400">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            <span>IdexalWork Desktop installed successfully</span>
          </div>
          <div x-show="selection.cli" class="flex items-center gap-2 text-green-600 dark:text-green-400">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            <span>idexalwork CLI available in your PATH</span>
          </div>
        </div>

        <div class="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3">
          <p class="text-xs text-gray-500 dark:text-gray-400">💡 Run <code class="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">idexalwork --help</code> in your terminal</p>
        </div>

        <div class="flex gap-3">
          <button @click="launch()" class="flex-1 py-3 bg-accent text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-accent">
            Launch IdexalWork
          </button>
          <button @click="exit()" class="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors border-none cursor-pointer">
            Close
          </button>
        </div>
      </div>

    </div><!-- /card -->
  </div>

<script>
  function installerWizard() {
    return {
      step: ${JSON.stringify(config ? "confirm" : "welcome")},
      steps: ['welcome','connect','confirm','install','complete'],
      token: ${JSON.stringify(token)},
      installLink: '',
      manualUrl: '',
      manualApiUrl: '',
      showManual: false,
      connectError: '',
      selection: { desktop: true, cli: true, launchAfterInstall: true, addDesktopShortcut: true },
      progress: {
        desktop: { downloadedBytes: 0, totalBytes: null, step: 'idle', message: '' },
        cli: { downloadedBytes: 0, totalBytes: null, step: 'idle', message: '' },
        overallState: 'idle'
      },
      polling: null,
      showConfetti: false,

      get stepIndex() { return this.steps.indexOf(this.step) },

      get desktopPercent() {
        const p = this.progress.desktop
        if (p.step === 'done') return 100
        if (p.totalBytes) return Math.round(100 * p.downloadedBytes / p.totalBytes)
        return p.step !== 'idle' ? 15 : 0
      },

      get cliPercent() {
        const p = this.progress.cli
        if (p.step === 'done') return 100
        if (p.totalBytes) return Math.round(100 * p.downloadedBytes / p.totalBytes)
        return p.step !== 'idle' ? 15 : 0
      },

      get desktopMb() {
        const p = this.progress.desktop
        if (!p.totalBytes) return ''
        return (p.downloadedBytes / 1024 / 1024).toFixed(1) + ' / ' + (p.totalBytes / 1024 / 1024).toFixed(1) + ' MB'
      },

      get cliMb() {
        const p = this.progress.cli
        if (!p.totalBytes) return ''
        return (p.downloadedBytes / 1024 / 1024).toFixed(1) + ' / ' + (p.totalBytes / 1024 / 1024).toFixed(1) + ' MB'
      },

      init() {},

      goTo(s) { this.step = s; this.connectError = '' },

      back() {
        const idx = this.stepIndex
        if (idx > 0) this.step = this.steps[idx - 1]
      },

      async resolveLink() {
        this.connectError = ''
        if (!this.installLink.trim()) { this.connectError = 'Please paste your install link.'; return }
        try {
          const res = await fetch('/api/resolve-link', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-installer-token': this.token },
            body: JSON.stringify({ installLink: this.installLink.trim() })
          })
          const data = await res.json()
          if (!res.ok) { this.connectError = data.message || 'Invalid install link.'; return }
          window.location.reload()
        } catch {
          this.connectError = 'Could not connect. Check the link and try again.'
        }
      },

      async resolveManual() {
        this.connectError = ''
        if (!this.manualUrl.trim() || !this.manualApiUrl.trim()) {
          this.connectError = 'Both Web URL and API URL are required.'
          return
        }
        try {
          const res = await fetch('/api/resolve-manual', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-installer-token': this.token },
            body: JSON.stringify({ webUrl: this.manualUrl.trim(), apiUrl: this.manualApiUrl.trim() })
          })
          const data = await res.json()
          if (!res.ok) { this.connectError = data.message || 'Invalid configuration.'; return }
          window.location.reload()
        } catch {
          this.connectError = 'Could not validate the configuration.'
        }
      },

      async startInstall() {
        this.goTo('install')
        this.progress.overallState = 'running'
        try {
          await fetch('/api/install', {
            method: 'POST',
            headers: { 'x-installer-token': this.token }
          })
          this.polling = setInterval(() => this.pollStatus(), 400)
        } catch {
          this.progress.overallState = 'error'
          this.progress.desktop.message = 'Failed to start install.'
        }
      },

      async pollStatus() {
        try {
          const res = await fetch('/api/status', {
            headers: { 'x-installer-token': this.token }
          })
          const data = await res.json()
          if (data.desktop) Object.assign(this.progress.desktop, data.desktop)
          if (data.cli) Object.assign(this.progress.cli, data.cli)
          if (data.state) this.progress.overallState = data.state

          if (data.state === 'done') {
            if (this.polling) { clearInterval(this.polling); this.polling = null }
            setTimeout(() => {
              this.step = 'complete'
              this.showConfetti = true
            }, 500)
          } else if (data.state === 'error') {
            if (this.polling) { clearInterval(this.polling); this.polling = null }
          }
        } catch { /* ignore polling errors */ }
      },

      async launch() {
        try {
          await fetch('/api/launch', { method: 'POST', headers: { 'x-installer-token': this.token } })
        } catch {}
        this.exit()
      },

      exit() {
        if (window.idexalworkInstallerExit) { window.idexalworkInstallerExit(); return }
        fetch('/api/exit', { method: 'POST', headers: { 'x-installer-token': this.token } }).catch(() => {})
        window.close()
      }
    }
  }
</script>
</body>
</html>`
}

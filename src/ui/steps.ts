export type WizardStep =
  | "welcome"
  | "connect"
  | "confirm"
  | "install"
  | "complete"

export const WIZARD_STEPS: WizardStep[] = [
  "welcome",
  "connect",
  "confirm",
  "install",
  "complete",
]

export const WIZARD_LABELS: Record<WizardStep, string> = {
  welcome: "Welcome",
  connect: "Connect",
  confirm: "Confirm",
  install: "Install",
  complete: "Complete",
}

export type InstallSelection = {
  desktop: boolean
  cli: boolean
  launchAfterInstall: boolean
  addDesktopShortcut: boolean
  installPath: string
}

export type ComponentProgress = {
  downloadedBytes: number
  totalBytes: number | null
  step: "idle" | "write-config" | "check-version" | "download" | "install" | "done" | "error"
  message: string
}

export type InstallerProgress = {
  desktop: ComponentProgress
  cli: ComponentProgress
  overallState: "idle" | "running" | "done" | "error"
}

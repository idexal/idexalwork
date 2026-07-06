import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Inline copy of apps/app/public/idexalwork-mark.png — the default installer
// logo when no client logo URL is baked into the build. Embedded as a base64
// PNG so the installer renders regardless of CDN / asset availability.
const markPath = resolve(__dirname, "idexalwork-mark.png");
const markBase64 = readFileSync(markPath).toString("base64");
export const IDEXALWORK_LOGO_SVG = `<?xml version="1.0" encoding="utf-8" ?><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1024" height="1024" viewBox="0 0 1024 1024"><image xlink:href="data:image/png;base64,${markBase64}" width="1024" height="1024" /></svg>`;

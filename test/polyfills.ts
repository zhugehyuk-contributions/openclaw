import { File } from "node:buffer";

// Node.js (depending on build flags) may not expose File on globalThis.
// Some dependencies (notably undici) expect it.
if (typeof (globalThis as any).File === "undefined") {
  (globalThis as any).File = File;
}

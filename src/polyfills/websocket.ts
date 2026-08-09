// Polyfill WebSocket for Node.js versions that don't provide a native WebSocket
// (Node < 22). Many libraries expect `globalThis.WebSocket` to exist during
// server-side execution (SSR / server functions). If it's missing, provide the
// popular `ws` implementation.
try {
  // Dynamically require to avoid bundling this into client-side code.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const WS = require("ws");
  if (typeof globalThis.WebSocket === "undefined") {
    // assign with any to avoid TypeScript structural mismatches
    (globalThis as any).WebSocket = WS;
  }
} catch (e) {
  // If `ws` is not installed, leave it undefined — the consumer will show a
  // clear error suggesting Node 22+ or providing a transport option.
  // This file intentionally fails silently so installs without `ws` still run.
}

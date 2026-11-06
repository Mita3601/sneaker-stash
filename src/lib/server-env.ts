let loaded = false;

function getNodeRequire() {
  if (typeof window !== "undefined") return null;
  if (typeof process === "undefined" || !process.versions?.node) return null;

  try {
    return Function("return typeof require === 'function' ? require : null")() as
      ((id: string) => unknown) | null;
  } catch {
    return null;
  }
}

function parseDotEnv(contents: string) {
  const result: Record<string, string> = {};
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

export function ensureServerEnvLoaded() {
  if (loaded || typeof window !== "undefined") return;
  const nodeRequire = getNodeRequire();
  if (!nodeRequire) return;

  loaded = true;

  try {
    const { existsSync, readFileSync } = nodeRequire("node:fs") as {
      existsSync: (path: string) => boolean;
      readFileSync: (path: string, encoding: string) => string;
    };
    const { resolve } = nodeRequire("node:path") as {
      resolve: (...segments: string[]) => string;
    };

    const filePath = resolve(process.cwd(), ".env");
    if (!existsSync(filePath)) return;
    const contents = readFileSync(filePath, "utf8");
    const parsed = parseDotEnv(contents);
    for (const [key, value] of Object.entries(parsed)) {
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // ignore unreadable .env in serverless or deployed environments
  }
}

export function getServerEnv(name: string) {
  ensureServerEnvLoaded();
  return String(process.env[name] ?? "").trim();
}

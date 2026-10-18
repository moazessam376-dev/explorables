// A minimal Chrome DevTools Protocol client: find Chrome or Edge, start it headless,
// and talk to one page over the built-in WebSocket (Node 22+). No npm dependencies.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function findBrowser() {
  if (process.env.EXPLORABLES_NO_BROWSER) return null;
  if (process.env.CHROME_PATH) return existsSync(process.env.CHROME_PATH) ? process.env.CHROME_PATH : null;
  const pf = process.env["ProgramFiles"] || "C:\\Program Files", pf86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
  const local = process.env["LOCALAPPDATA"] || "";
  const candidates = [
    join(pf, "Google/Chrome/Application/chrome.exe"), join(pf86, "Google/Chrome/Application/chrome.exe"),
    join(local, "Google/Chrome/Application/chrome.exe"),
    join(pf86, "Microsoft/Edge/Application/msedge.exe"), join(pf, "Microsoft/Edge/Application/msedge.exe"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
  ];
  for (const c of candidates) if (c && existsSync(c)) return c;
  if (process.platform !== "win32") {
    for (const name of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge"]) {
      const r = spawnSync("which", [name], { encoding: "utf8" });
      if (r.status === 0 && r.stdout.trim()) return r.stdout.trim();
    }
  }
  return null;
}

export async function launch(path, { width = 1280, height = 860 } = {}) {
  if (typeof WebSocket === "undefined") throw new Error("the browser checks need Node 22 or newer (built-in WebSocket)");
  const profile = mkdtempSync(join(tmpdir(), "explorables-chrome-"));
  const proc = spawn(path, [
    "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--disable-extensions",
    "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--allow-file-access-from-files",
    `--window-size=${width},${height}`, "about:blank"
  ], { stdio: ["ignore", "ignore", "pipe"] });
  const port = await new Promise((res, rej) => {
    let buf = "";
    const timer = setTimeout(() => rej(new Error("browser did not start in 20 s")), 20000);
    proc.stderr.on("data", d => {
      buf += d;
      const m = /DevTools listening on ws:\/\/[^:]+:(\d+)\//.exec(buf);
      if (m) { clearTimeout(timer); res(+m[1]); }
    });
    proc.on("exit", code => { clearTimeout(timer); rej(new Error(`browser exited (${code}) before it was ready`)); });
  });
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error("could not connect to the browser")); });
  let id = 0, closed = false;
  const waiting = new Map(), listeners = new Map();
  // if the browser goes away, every pending call fails instead of waiting forever
  const shutDown = why => {
    if (closed) return;
    closed = true;
    for (const { rej, timer } of waiting.values()) { clearTimeout(timer); rej(new Error(`browser closed (${why})`)); }
    waiting.clear();
  };
  ws.onclose = () => shutDown("connection closed");
  proc.on("exit", code => shutDown(`exit ${code}`));
  ws.onmessage = ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id && waiting.has(msg.id)) {
      const { res, rej, timer } = waiting.get(msg.id); waiting.delete(msg.id); clearTimeout(timer);
      msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
    } else if (msg.method) (listeners.get(msg.method) || []).forEach(fn => fn(msg.params));
  };
  return {
    send(method, params = {}, timeoutMs = 30000) {
      if (closed) return Promise.reject(new Error("browser closed"));
      return new Promise((res, rej) => {
        const i = ++id;
        const timer = setTimeout(() => { waiting.delete(i); rej(new Error(`${method} timed out after ${timeoutMs / 1000} s`)); }, timeoutMs);
        waiting.set(i, { res, rej, timer });
        ws.send(JSON.stringify({ id: i, method, params }));
      });
    },
    on(method, fn) { if (!listeners.has(method)) listeners.set(method, []); listeners.get(method).push(fn); },
    async close() {
      shutDown("closed by caller");
      try { ws.close(); } catch (e) { /* already closed */ }
      proc.kill();
      await new Promise(r => setTimeout(r, 300));
      try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch (e) { /* Windows may still hold a lock */ }
    }
  };
}

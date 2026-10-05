/** npm run site:serve: static server for site/ on http://127.0.0.1:8787 (fetch does not work over file://). No dependencies. */
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";
import { REPO_ROOT } from "../src/config.js";

const ROOT = join(REPO_ROOT, "site");
const PORT = Number(process.env.PORT ?? 8787);
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".pub": "text/plain; charset=utf-8",
};

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  let rel: string;
  try {
    rel = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400).end("bad request");
    return;
  }
  if (rel === "/") {
    res.writeHead(302, { Location: "/verify/" }).end();
    return;
  }
  // Anything that could leave site/ is simply not found: parent segments, backslashes, NUL bytes.
  const notFound = (): void => void res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("not found");
  if (rel.includes("\0") || rel.includes("\\") || rel.split("/").includes("..")) return notFound();
  let file = normalize(join(ROOT, rel));
  if (file !== ROOT && !file.startsWith(ROOT + sep)) return notFound();
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file) || !statSync(file).isFile()) return notFound();
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream", "Cache-Control": "no-cache" }).end(readFileSync(file));
}).listen(PORT, "127.0.0.1", () => console.log(`serving site/ at http://127.0.0.1:${PORT}/verify/  (build first: npm run build:site)`));

// Pure Node.js static file server (zero dependencies).
// Only built-in modules: node:http, node:fs, node:path, node:url.
// Purpose: serve index.html + JS/CSS to the browser over http:// so ES modules load.
// This is a DEV TOOL, not part of the app code (not imported anywhere).

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 8000;

const MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ico": "image/x-icon",
};

const server = createServer(async (req, res) => {
    try {
        let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
        if (urlPath === "/") urlPath = "/index.html";

        const filePath = normalize(join(__dirname, urlPath));

        // Path traversal guard
        if (!filePath.startsWith(__dirname)) {
            res.writeHead(403, { "Content-Type": "text/plain" });
            res.end("Forbidden");
            return;
        }

        const data = await readFile(filePath);
        const ext = extname(filePath).toLowerCase();
        res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
        res.end(data);
    } catch {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
    }
});

server.listen(PORT, () => {
    console.log(`\n  Port Terminal Manager running: http://localhost:${PORT}\n`);
    console.log(`  Stop with: Ctrl + C\n`);
});
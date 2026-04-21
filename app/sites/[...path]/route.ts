import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize, sep } from "node:path";
import type { NextRequest } from "next/server";

const SITES_ROOT = join(process.cwd(), "sites");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

async function serveFile(absPath: string): Promise<Response> {
  const buf = await readFile(absPath);
  const ext = extname(absPath).toLowerCase();
  const contentType = MIME[ext] ?? "application/octet-stream";
  return new Response(buf as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": "no-cache",
    },
  });
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  if (!path || path.length === 0) {
    return new Response("Not found", { status: 404 });
  }

  // Block access to the DOM manifest — it's the grading ground truth.
  if (path[path.length - 1] === "manifest.json") {
    return new Response("Not found", { status: 404 });
  }

  const rel = normalize(path.join("/"));
  if (
    rel.startsWith("..") ||
    rel.includes(".." + sep) ||
    rel.includes("../")
  ) {
    return new Response("Forbidden", { status: 403 });
  }

  const absPath = join(SITES_ROOT, rel);

  try {
    const s = await stat(absPath);
    if (s.isDirectory()) {
      return await serveFile(join(absPath, "index.html"));
    }
    return await serveFile(absPath);
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

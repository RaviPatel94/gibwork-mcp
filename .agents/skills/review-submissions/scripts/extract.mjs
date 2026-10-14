import { readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, extname, basename } from "node:path";
import { createHash } from "node:crypto";

const MAX_CHARS = 20000;
const MAX_BYTES = 25 * 1024 * 1024;

const TEXT_EXT = new Set([".txt", ".md", ".csv", ".json", ".html", ".xml", ".log"]);
const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);
const MIME_EXT = {
  "application/pdf": ".pdf",
  "text/plain": ".txt",
  "text/csv": ".csv",
  "application/json": ".json",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

async function load(source) {
  if (!/^https?:\/\//i.test(source)) {
    return { buf: await readFile(source), ext: extname(source).toLowerCase(), local: source };
  }
  const res = await fetch(source);
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  if (Number(res.headers.get("content-length")) > MAX_BYTES) throw new Error("file too large");
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error("file too large");

  let ext = extname(new URL(source).pathname).toLowerCase();
  if (!ext) ext = MIME_EXT[(res.headers.get("content-type") ?? "").split(";")[0].trim()] ?? "";
  return { buf, ext, local: null };
}

async function saveToTemp(buf, source, ext) {
  const dir = join(tmpdir(), "gibwork-submissions");
  await mkdir(dir, { recursive: true });
  const id = createHash("sha1").update(source).digest("hex").slice(0, 8);
  let name = basename(new URL(source).pathname).replace(/[^\w.-]/g, "_") || "file";
  if (!extname(name)) name += ext;
  const path = join(dir, `${id}-${name}`);
  await writeFile(path, buf);
  return path;
}

async function pdfText(buf) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), verbosity: 0 }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    pages.push(content.items.map((item) => item.str).join(" "));
  }
  return pages.join("\n\n");
}

async function xlsxText(buf) {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  return wb.worksheets
    .map((ws) => {
      const rows = [];
      ws.eachRow((row) => {
        const cells = [];
        for (let c = 1; c <= ws.columnCount; c++) {
          const cell = row.getCell(c);
          cells.push(cell.hyperlink ? `${cell.text} (${cell.hyperlink})` : cell.text);
        }
        rows.push(cells.join(" | "));
      });
      return `## ${ws.name}\n${rows.join("\n")}`;
    })
    .join("\n\n");
}

async function docxText(buf) {
  const mammoth = await import("mammoth");
  return (await mammoth.extractRawText({ buffer: buf })).value;
}

async function extract(source) {
  const out = { source, type: null, text: null, path: null, truncated: false, note: null, error: null };
  try {
    const { buf, ext, local } = await load(source);
    let text = null;

    if (TEXT_EXT.has(ext)) {
      out.type = "text";
      text = buf.toString("utf8");
    } else if (ext === ".pdf") {
      out.type = "pdf";
      text = await pdfText(buf);
    } else if (ext === ".xlsx") {
      out.type = "excel";
      text = await xlsxText(buf);
    } else if (ext === ".docx") {
      out.type = "word";
      text = await docxText(buf);
    } else {
      out.type = IMAGE_EXT.has(ext) ? "image" : "unsupported";
    }

    if (text !== null && text.trim()) {
      out.truncated = text.length > MAX_CHARS;
      out.text = text.slice(0, MAX_CHARS);
    } else {
      out.path = local ?? (await saveToTemp(buf, source, ext));
      out.note = out.type === "image" ? "view the image at path" : text !== null ? "no text found, view the file at path" : "unsupported file type, saved at path";
    }
  } catch (err) {
    out.error = err.message;
  }
  return out;
}

const sources = process.argv.slice(2);
if (sources.length === 0) {
  console.error("Usage: node extract.mjs <url-or-path> [<url-or-path> ...]");
  process.exit(2);
}
console.log(JSON.stringify(await Promise.all(sources.map(extract)), null, 2));

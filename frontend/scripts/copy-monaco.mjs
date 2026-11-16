// Copies monaco-editor's static AMD bundle into public/ so it's served
// same-origin instead of @monaco-editor/react's default of fetching it from
// a CDN at runtime - see src/lib/monacoSetup.ts for why.
import { cp, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(root, "..", "node_modules", "monaco-editor", "min", "vs");
const dest = path.join(root, "..", "public", "monaco-editor", "vs");

await rm(dest, { recursive: true, force: true });
await cp(src, dest, { recursive: true });
console.log(`Copied monaco-editor's vs/ bundle to ${path.relative(process.cwd(), dest)}`);

// Self-hosted Monaco: @monaco-editor/react defaults to fetching Monaco's
// assets from a CDN (jsdelivr) at runtime, which breaks in an offline/
// air-gapped deployment (like the k8s cluster this app targets) and adds a
// third-party runtime dependency for no reason. Point it at the same static
// bundle instead, copied to public/ by scripts/copy-monaco.mjs (postinstall).
//
// A bundler-level fix (importing monaco-editor's ESM + wiring a worker via
// Vite's `?worker` suffix) was tried first, but monaco-editor's package.json
// `exports` map only exposes its root path - deep subpath imports like
// `monaco-editor/esm/vs/editor/editor.worker.js` are blocked outright, not
// just unresolved. Pointing the loader at the classic static `min/vs` bundle
// sidesteps that entirely; Monaco's own AMD loader handles its workers
// internally from there.
import { loader } from "@monaco-editor/react";

loader.config({ paths: { vs: "/monaco-editor/vs" } });

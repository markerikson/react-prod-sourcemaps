import remapping from "@ampproject/remapping";
import fs from "fs";
import path from "path";
import { log } from "console";
import { createHash } from "node:crypto";
import { SourceMapInput } from "@jridgewell/trace-mapping";
import resolveUri from "@jridgewell/resolve-uri";

import * as BuildPlugins from "./unplugin";
import { ReactVersion, hashesToVersions } from "./reactVersions";
export { knownReactProdVersions, hashesToVersions } from "./reactVersions";

// Borrowed from `trace-mapping` internals
function resolve(input: string, base: string | undefined): string {
  // The base is always treated as a directory, if it's not empty.
  // https://github.com/mozilla/source-map/blob/8cb3ee57/lib/util.js#L327
  // https://github.com/chromium/chromium/blob/da4adbb3/third_party/blink/renderer/devtools/front_end/sdk/SourceMap.js#L400-L401
  if (base && !base.endsWith("/")) base += "/";

  return resolveUri(input, base);
}

// Copied from:
// https://github.com/jridgewell/trace-mapping/blob/5ccfcfeeee9dfa3b13567bb0f95260ea32f2c269/src/types.ts#L4
export interface SourceMapV3 {
  file?: string | null;
  names: string[];
  sourceRoot?: string;
  sources: (string | null)[];
  sourcesContent?: (string | null)[];
  version: 3;
}

function hashSHA256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

export function isSourceMapV3(map: any): map is SourceMapV3 {
  return (
    typeof map === "object" &&
    map !== null &&
    map.version === 3 &&
    "names" in map &&
    "sources" in map
  );
}

export function loadSourcemap(filePath: string) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Cannot find ${filePath}`);
  }

  const maybeSourcemap = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  if (!isSourceMapV3(maybeSourcemap)) {
    throw new Error(`Invalid sourcemap: ${filePath}`);
  }

  return maybeSourcemap;
}

function loadExistingReactDOMSourcemap(
  version: string,
  options: { verbose?: boolean }
): SourceMapV3 {
  const filename = "react-dom.production.min.js.map";
  const filePath = path.join(__dirname, "../assets", "react-dom", version, filename);

  if (options.verbose) {
    log("Loading original ReactDOM sourcemap from: ", filePath);
  }
  return loadSourcemap(filePath);
}

function findMatchingReactDOMVersion(
  reactDomFilename: string,
  inputSourcemap: SourceMapV3
): ReactVersion {
  let filenameIndex = inputSourcemap.sources.indexOf(reactDomFilename);
  if (filenameIndex === -1) {
    // Try one more time. Maybe the path had extra segments in it, like:
    // "webpack://_N_E/./node_modules/react-dom/cjs/react-dom.production.min.js"
    filenameIndex = inputSourcemap.sources.findIndex(filename => {
      if (!filename) return false;
      // Use the same resolve logic as `remapping` to normalize the path
      const normalizedPath = resolve(filename, "");
      return normalizedPath === reactDomFilename;
    });
  }
  if (filenameIndex === -1) {
    throw new Error(`Cannot find '${reactDomFilename}' in input sourcemap`);
  }

  const sourceContents = inputSourcemap.sourcesContent?.[filenameIndex];
  if (!sourceContents) {
    throw new Error(`Cannot find source contents for '${reactDomFilename}'`);
  }

  const contentHash = hashSHA256(sourceContents);
  const versionEntry = hashesToVersions[contentHash];

  if (!versionEntry) {
    throw new Error(`Cannot find version for '${reactDomFilename}'`);
  }

  return versionEntry;
}

interface RewriteSourcemapResult {
  outputSourcemap: SourceMapV3;
  rewroteSourcemap: boolean;
  reactVersion: ReactVersion | null;
}

// Rougly, the operation performed here is:
// - Find the react-dom.production.min.js file in our sourcemap
// - Find the version of React that matches the contents of that file
// - Load the original sourcemap for that version of React
// - Swap them out by rewriting the sourcemap
export function maybeRewriteSourcemapWithReactProd(
  inputSourcemap: SourceMapV3,
  options: { verbose?: boolean }
): RewriteSourcemapResult {
  const isValidSourcemap = isSourceMapV3(inputSourcemap);
  if (!isValidSourcemap) {
    throw new Error("Invalid sourcemap");
  }

  const reactVersions: ReactVersion[] = [];

  const remapped = remapping(inputSourcemap as SourceMapInput, (file, ctx) => {
    if (!file.includes("react-dom.production")) {
      if (options.verbose) {
        log(`Skipping sourcemap ${file} because it does not contain react-dom.production`);
      }
      return null;
    }

    if (options.verbose) log("Found react-dom.production in file:", file, ctx);
    if (!file.endsWith("react-dom.production.min.js") && options.verbose) {
      log("Skipping non-production react-dom file:", file);
      return;
    }

    const versionEntry: ReactVersion | null = findMatchingReactDOMVersion(file, inputSourcemap);
    if (!versionEntry) {
      return null;
    }

    reactVersions.push(versionEntry);
    if (options.verbose) log("Found matching React version:", versionEntry.version);
    return loadExistingReactDOMSourcemap(versionEntry.version, options) as SourceMapInput;
  });

  if (reactVersions.length > 1 && options.verbose) {
    log(
      "Found multiple React versions:",
      reactVersions.map(v => v.version)
    );
  }

  return {
    outputSourcemap: remapped,
    rewroteSourcemap: reactVersions.length > 0,
    reactVersion: reactVersions[0] ?? null,
  };
}

export type { ReactSourcemapsPluginOptions } from "./unplugin";
export const ViteReactSourcemapsPlugin = BuildPlugins.ViteReactSourcemapsPlugin;
export const RollupReactSourcemapsPlugin = BuildPlugins.RollupReactSourcemapsPlugin;
export const WebpackReactSourcemapsPlugin = BuildPlugins.WebpackReactSourcemapsPlugin;
export const RspackReactSourcemapsPlugin = BuildPlugins.RspackReactSourcemapsPlugin;
export const EsbuildReactSourcemapsPlugin = BuildPlugins.EsbuildReactSourcemapsPlugin;

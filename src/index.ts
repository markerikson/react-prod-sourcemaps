import remapping from "@ampproject/remapping";
import fs from "fs";
import path from "path";
import { createHash } from "node:crypto";
import { SourceMapInput } from "@jridgewell/trace-mapping";

import { ReactVersion, hashesToVersions } from "./reactVersions";

export { knownReactProdVersions, hashesToVersions } from "./reactVersions";

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

function loadExistingReactDOMSourcemap(version: string) {
  const filename = "react-dom.production.min.js.map";
  const filePath = path.join(__dirname, "assets", "react-dom", version, filename);

  const reactDomSourcemap: SourceMapV3 = loadSourcemap(filePath);
  return reactDomSourcemap;
}

function findMatchingReactDOMVersion(
  reactDomFilename: string,
  inputSourcemap: SourceMapV3
): ReactVersion {
  const filenameIndex = inputSourcemap.names.indexOf(reactDomFilename);
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

export function rewriteSourcemapWithReactProd(inputSourcemap: SourceMapV3): RewriteSourcemapResult {
  const isValidSourcemap = isSourceMapV3(inputSourcemap);
  if (!isValidSourcemap) {
    throw new Error("Invalid sourcemap");
  }

  let reactVersion: ReactVersion | null = null;

  const remapped = remapping(inputSourcemap as SourceMapInput, (file, ctx) => {
    if (file.includes("react-dom.production")) {
      console.log("ReactDOM file:", file, ctx);

      if (file.endsWith("react-dom.production.min.js")) {
        const versionEntry = findMatchingReactDOMVersion(file, inputSourcemap);
        reactVersion = versionEntry;
        const reactDomSourcemap = loadExistingReactDOMSourcemap(versionEntry.version);
        console.log("Found matching React version:", versionEntry.version);
        return reactDomSourcemap as SourceMapInput;
      }
    }
    return null;
  });

  return {
    outputSourcemap: remapped,
    rewroteSourcemap: !!reactVersion,
    reactVersion,
  };
}

#!/usr/bin/env node

import yargs from "yargs";
import fs from "fs";
import path from "path";
import { log } from "console";

import { knownReactProdVersions } from "./reactVersions.mjs";
import { loadSourcemap, maybeRewriteSourcemapWithReactProd } from "./index.mjs";

const argv = yargs
  .option("reactVersions", {
    alias: "rv",
    description: "Print available React versions",
    type: "boolean",
  })
  .option("inputFile", {
    alias: "i",
    description:
      "Input sourcemap file path. If no output path is provided, the rewritten sourcemap will be written to the same directory with the same name, but with a `.remapped` suffix.",
    type: "string",
  })
  .option("verbose", {
    alias: "v",
    description: "Run with verbose logging",
    type: "boolean",
  })
  .help()
  .alias("help", "h")
  .parseSync();

function main() {
  if (argv.reactVersions) {
    log("Available React versions:", knownReactProdVersions);
    return;
  }

  let inputFilePaths: string[] = [];

  if (argv.inputFile) {
    inputFilePaths.push(argv.inputFile);
  }

  if (inputFilePaths.length === 0) {
    throw new TypeError("No input file provided, got: " + argv.inputFile);
  }

  for (const inputFilePath of inputFilePaths) {
    const fullPath = path.resolve(inputFilePath);
    if (argv.verbose) {
      log("Processing file: ", fullPath);
    }
    const inputSourcemap = loadSourcemap(inputFilePath);
    const rewriteResult = maybeRewriteSourcemapWithReactProd(inputSourcemap, {
      verbose: argv.verbose,
    });

    if (!rewriteResult.rewroteSourcemap) {
      if (argv.verbose) {
        log("No React version found in sourcemap, skipping");
      }
      continue;
    }

    const outputFilePath = inputFilePath.replace(".js.map", ".remapped.js.map");
    if (argv.verbose) {
      log("Writing output to: ", outputFilePath);
    }
    fs.writeFileSync(outputFilePath, JSON.stringify(rewriteResult.outputSourcemap, null, 2));
  }
}

main();

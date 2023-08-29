#!/usr/bin/env node

import yargs from "yargs";
import fs from "fs";
import path from "path";

import { knownReactProdVersions } from "./reactVersions";
import { loadSourcemap, rewriteSourcemapWithReactProd } from "./index";

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
  .help()
  .alias("help", "h")
  .parseSync();

function main() {
  if (argv.reactVersions) {
    console.log("Available React versions:", knownReactProdVersions);
    return;
  }

  let inputFilePaths: string[] = [];

  if (argv.inputFile) {
    inputFilePaths.push(argv.inputFile);
  }

  if (inputFilePaths.length === 0) {
    console.error("No input file provided");
    return;
  }

  for (const inputFilePath of inputFilePaths) {
    console.log("Processing file: ", inputFilePath);
    const fullPath = path.resolve(inputFilePath);
    console.log("Full path: ", fullPath);
    const inputSourcemap = loadSourcemap(inputFilePath);
    console.log("Sourcemap: ", inputSourcemap.file, inputSourcemap.names);
    // const outputSourcemap = rewriteSourcemapWithReactProd(inputSourcemap);
  }
}

main();

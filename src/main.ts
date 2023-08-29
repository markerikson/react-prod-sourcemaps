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
    const fullPath = path.resolve(inputFilePath);
    console.log("Processing file: ", fullPath);
    const inputSourcemap = loadSourcemap(inputFilePath);

    const rewriteResult = rewriteSourcemapWithReactProd(inputSourcemap);
    const outputFilePath = inputFilePath.replace(".js.map", ".remapped.js.map");
    console.log("Writing output to: ", outputFilePath);
    fs.writeFileSync(outputFilePath, JSON.stringify(rewriteResult.outputSourcemap, null, 2));
  }
}

main();

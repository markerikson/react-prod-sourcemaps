#!/usr/bin/env node

import yargs from "yargs";

import { knownReactProdVersions } from "./reactVersions";

const argv = yargs
  .option("reactVersions", {
    alias: "rv",
    description: "Print available React versions",
    type: "boolean",
  })
  .option("target", {
    alias: "t",
    default: "all",
    description: "Only re-generate tests for this target",
    choices: ["all", "browser", "node"],
  })
  .help()
  .alias("help", "h")
  .parseSync();

if (argv.reactVersions) {
  console.log("Available React versions:", knownReactProdVersions);
} else {
  console.log("Goodbye!");
}

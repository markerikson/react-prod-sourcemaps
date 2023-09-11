import fs from "node:fs";
import test from "node:test";
import path from "node:path";
import assert from "node:assert";
import console from "node:console";

import esbuild from "esbuild";

import * as pkg from "./index";

const ReactTemplate = `
import React from "react";
import ReactDOM from "react-dom";

function App() {
    // avoid jsx so we dont have to perform
    // loader and transpile gymnastics.
    return "Hello, world!"
}
`;

const SOURCE_DIR = path.resolve("./tmp/");
const BUILD_OUTPUT_PATH = path.resolve("./tmp/dist/");
const ENTRY_POINT = path.resolve("./tmp/index.js");
const EXPECTED_SOURCEMAP_PATH = path.resolve("./tmp/dist/index.js.map");

// Initialize project boilerplate in the tmp directory.
// Source lives in ./tmp/and the build output is generated
// to ./tmp/dist/
function initProjectBoilerplate() {
  if (fs.existsSync(SOURCE_DIR)) {
    // throw new Error("tmp directory already exists");
  }

  fs.mkdirSync(SOURCE_DIR, { recursive: true });
  fs.writeFileSync(ENTRY_POINT, ReactTemplate);
}

function teardown() {
  if (!fs.existsSync(SOURCE_DIR)) return;
  fs.rmSync(SOURCE_DIR, { recursive: true });
}

// We'll run the tests in sequence as they all use the same
// tmp directory and we currently dont have many of them.
// If tests get slow, this is a likely optimization opportunity.
test.beforeEach(() => initProjectBoilerplate());
// test.afterEach(() => teardown());
// test.after(() => teardown());
// process.on("exit", () => {
//   teardown();
// });

test.todo("esbuild", async () => {
  await esbuild.build({
    entryPoints: [ENTRY_POINT],
    outdir: BUILD_OUTPUT_PATH,
    sourcemap: true,
    plugins: [pkg.EsbuildReactSourcemapsPlugin()],
  });

  const sourceMap = pkg.loadSourcemap(EXPECTED_SOURCEMAP_PATH);
  console.log(sourceMap);
});
test.todo("webpack", () => {});
test.todo("rollup", () => {});
test.todo("vite", () => {});
test.todo("rspack", () => {});

import fs from "node:fs";
import test from "node:test";
import path from "node:path";
import assert from "node:assert";
import * as url from "node:url";

import remapping from "@ampproject/remapping";
import esbuild from "esbuild";
import webpack from "webpack";
import { rollup } from "rollup";
// If this is not used, rollup does not resolve the react and react-dom imports
// and marks them as external which means they dont end up in our bundle 
// and we cant rewrite their source maps.
import { nodeResolve as rollupNodeResolvePlugin } from '@rollup/plugin-node-resolve';
import rollupDefinePlugin from '@rollup/plugin-replace';
import rollupPluginCommonJS from "@rollup/plugin-commonjs"

import * as pkg from "./index";

// Poll for the source map to be generated.
function pollForSourceMap() {
  return new Promise((resolve, reject) => {
    let start = Date.now();
    const interval = setInterval(() => {
      if (fs.existsSync(EXPECTED_SOURCEMAP_PATH)) {
        clearInterval(interval);
        resolve();
      }
      if(Date.now() - start > 10_000) {
        clearInterval(interval);
        reject(new Error("timed out waiting for source map, build failed"));
      }
    }, 100);
  });
}

const ReactTemplate = `
import React from "react";
import ReactDOM from "react-dom";

function App() {
    // avoid jsx so we dont have to perform
    // loader and transpile gymnastics.
    return "Hello, world!"
}

// Bailout from dead code elimination
const ctx = React.createContext();
ReactDOM.render(App, document.getElementById("root"));
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

function assertCleanEnv(){  
  assert.equal(fs.existsSync(BUILD_OUTPUT_PATH), false, "build output directory already exists")
  assert.equal(fs.existsSync(EXPECTED_SOURCEMAP_PATH), false, "expected sourcemap already exists")
}

// We'll run the tests in sequence as they all use the same
// tmp directory and we currently dont have many of them.
// If tests get slow, this is a likely optimization opportunity.
test.before(() => teardown());
test.beforeEach(() => initProjectBoilerplate());
// test.afterEach(() => teardown());
// test.after(() => teardown());

// process.on("exit", () => {
//   teardown();
// });


function hasMinifiedSourcemaps(map) {
  let original = false;
  let rewritten = false;

  remapping(map, (file, ctx) => {
    // check if source map contains minified react-dom
    if(file.includes("react-dom.production.min.js")) {
      original = true;
    }
    // check if source map contains our rewritten react-dom sourcemap
    if(file.includes("react-dom.production.js")) {
      rewritten = true;
    }
  })
  return {original, rewritten};
}

// It seems like some of the build tools rely on this
global.__filename = url.fileURLToPath(import.meta.url);
global.__dirname = url.fileURLToPath(new URL('.', import.meta.url));

test.skip("esbuild", async () => {
  assertCleanEnv()
  await esbuild.build({
    entryPoints: [ENTRY_POINT],
    outdir: BUILD_OUTPUT_PATH,
    sourcemap: true,
    bundle: true,
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [pkg.EsbuildReactSourcemapsPlugin()],
  });

  await pollForSourceMap();
  const {original, rewritten} = hasMinifiedSourcemaps(pkg.loadSourcemap(EXPECTED_SOURCEMAP_PATH));
  assert.equal(original, false, "minified react-dom source maps were found");
  assert.equal(rewritten, true, "react-dom source maps were not rewritten");
});

test.skip("webpack", async () => {
  assertCleanEnv()
  webpack({
    entry: ENTRY_POINT,
    output: {
      path: BUILD_OUTPUT_PATH,
      filename: "index.js",
    },
    mode: "production",
    devtool: "source-map",
    plugins: [pkg.WebpackReactSourcemapsPlugin()],
  }, (err, stats) => {
    if (err || stats.hasErrors()) {
      throw new Error("webpack build failed");
    }
  })

  await pollForSourceMap();
  const {original, rewritten} = hasMinifiedSourcemaps(pkg.loadSourcemap(EXPECTED_SOURCEMAP_PATH));
  assert.equal(original, false, "minified react-dom source maps were found");
  assert.equal(rewritten, true, "react-dom source maps were not rewritten");
});
test("rollup", async () => {
  // assertCleanEnv()
  await rollup({
    input: ENTRY_POINT,
    bundle: {
      write: true,
    },
    output: {
      dir: BUILD_OUTPUT_PATH,
      sourcemap: true,
    },
    plugins: [
      rollupPluginCommonJS(),
      rollupDefinePlugin({
        "process.env.NODE_ENV": JSON.stringify("production")
      }),
      rollupNodeResolvePlugin(), 
      pkg.RollupReactSourcemapsPlugin()
    ],
  }).then(async (bundle) => {
    if (bundle) {
      await bundle.write({
        dir: BUILD_OUTPUT_PATH,
        sourcemap: true,
      });
    } else throw new Error("rollup build failed to write bundle"); 
  })

  await pollForSourceMap();
  const {original, rewritten} = hasMinifiedSourcemaps(pkg.loadSourcemap(EXPECTED_SOURCEMAP_PATH));
  assert.equal(original, false, "minified react-dom source maps were found");
  assert.equal(rewritten, true, "react-dom source maps were not rewritten");
});
test.skip("vite", () => {});
test.skip("rspack", () => {});

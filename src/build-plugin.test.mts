import fs from "node:fs";
import test from "node:test";
import path from "node:path";
import url from "node:url";
import assert from "node:assert";
import child_process from "node:child_process";

import remapping from "@ampproject/remapping";
import esbuild from "esbuild";
import webpack from "webpack";
import { rollup } from "rollup";
import * as vite from "vite";

// If this is not used, rollup does not resolve the react and react-dom imports
// and marks them as external which means they dont end up in our bundle
// and we cant rewrite their source maps.
import { nodeResolve as rollupNodeResolvePlugin } from "@rollup/plugin-node-resolve";
import rollupDefinePlugin from "@rollup/plugin-replace";
import rollupPluginCommonJS from "@rollup/plugin-commonjs";

// @ts-ignore silence importing of ts modules warning
import * as pkg from "./index.mts";

// Poll for the source map to be generated.
function pollForSourceMap() {
  return new Promise((resolve, reject) => {
    let start = Date.now();
    const interval = setInterval(() => {
      if (fs.existsSync(EXPECTED_SOURCEMAP_PATH)) {
        clearInterval(interval);
        resolve(void 0);
      }
      if (Date.now() - start > 10_000) {
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

const HTMLTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>React App</title>
</head>
<body>
  <div id="root"></div>
  <script src="./index.js" type="module"></script>
</body>
`;

const RSPackConfigTemplate = (JS_ENTRY_POINT: string, BUILD_OUTPUT_PATH: string) => `
import * as pkg from "./../index";
module.exports = {
  entry: {
    main: "${JS_ENTRY_POINT}",
  },
  devtool: "source-map",
  output: {
    filename: 'index.js',
    path: "${BUILD_OUTPUT_PATH}"
  },
  plugins: [pkg.RspackReactSourcemapsPlugin()],
}`;

const SOURCE_DIR = path.resolve("./tmp/");
const BUILD_OUTPUT_PATH = path.resolve("./tmp/dist/");
const JS_ENTRY_POINT = path.resolve("./tmp/index.js");
const HTML_ENTRY_POINT = path.resolve("./tmp/index.html");
const EXPECTED_SOURCEMAP_PATH = path.resolve("./tmp/dist/index.js.map");
const EXPECTED_REMAPPED_PATH = path.resolve("./tmp/dist/index.js.remapped.map");
const RSPACK_CONFIG_PATH = path.resolve("./tmp/rspack.config.js");

// Initialize project boilerplate in the tmp directory.
// Source lives in ./tmp/and the build output is generated
// to ./tmp/dist/
function initProjectBoilerplate() {
  if (fs.existsSync(SOURCE_DIR)) {
    throw new Error("tmp directory already exists");
  }

  fs.mkdirSync(SOURCE_DIR, { recursive: true });
  fs.writeFileSync(JS_ENTRY_POINT, ReactTemplate);
  fs.writeFileSync(HTML_ENTRY_POINT, HTMLTemplate);
  fs.writeFileSync(RSPACK_CONFIG_PATH, RSPackConfigTemplate(JS_ENTRY_POINT, BUILD_OUTPUT_PATH));
}

function teardown() {
  if (!fs.existsSync(SOURCE_DIR)) return;
  fs.rmSync(SOURCE_DIR, { recursive: true });
}

function assertCleanEnv() {
  assert.equal(fs.existsSync(BUILD_OUTPUT_PATH), false, "build output directory already exists");
  assert.equal(fs.existsSync(EXPECTED_SOURCEMAP_PATH), false, "expected sourcemap already exists");
}

// We'll run the tests in sequence as they all use the same
// tmp directory and we currently dont have many of them.
// If tests get slow, this is a likely optimization opportunity.
test.before(() => teardown());
test.beforeEach(() => initProjectBoilerplate());
test.afterEach(() => teardown());
test.after(() => teardown());

process.on("exit", () => {
  teardown();
});

function hasMinifiedSourcemaps(map: any) {
  let hasOriginalReactSourceMaps = false;
  let hasRewrittenReactSourceMaps = false;

  remapping(map, (file, ctx) => {
    // check if source map contains minified react-dom
    if (file.includes("react-dom.production.min.js")) {
      hasOriginalReactSourceMaps = true;
    }
    // check if source map contains our rewritten react-dom sourcemap
    if (file.includes("react-dom.production.js")) {
      hasRewrittenReactSourceMaps = true;
    }
  });
  return { hasOriginalReactSourceMaps, hasRewrittenReactSourceMaps };
}

global.__filename = url.fileURLToPath(import.meta.url);
global.__dirname = url.fileURLToPath(new URL(".", import.meta.url));

// Builds fail without these globals. Very likely due to the fact that
// we're using CJS modules in an ESM environment. This will be up to the
// user to fix in their own env, we just want to make sure we can build in our test env.
// global.__filename = url.fileURLToPath(import.meta.url);
// global.__dirname = url.fileURLToPath(new URL(".", import.meta.url));

// The test suite is currently not very exhaustive and only tests the most basic
// case where the build succeeds and the sourcemap is properly configured. We _do_not_
// test invalid configs (e.g. not generating sourcemaps etc) and our plugin does not warn
// the user if they are not generating sourcemaps. This is up to the user to configure,
// but could be subject to change in case it ends up being confusing. The alternative would
// be to throw an error if sourcemaps are not generated, but this might cause inconvenience
// for users who dont want sourcemaps and would have to disable the plugin.
test("esbuild", async () => {
  assertCleanEnv();
  await esbuild.build({
    entryPoints: [JS_ENTRY_POINT],
    outdir: BUILD_OUTPUT_PATH,
    sourcemap: true,
    bundle: true,
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [pkg.EsbuildReactSourcemapsPlugin({})],
  });

  await pollForSourceMap();
  const { hasOriginalReactSourceMaps, hasRewrittenReactSourceMaps } = hasMinifiedSourcemaps(
    pkg.loadSourcemap(EXPECTED_SOURCEMAP_PATH)
  );
  assert.equal(hasOriginalReactSourceMaps, false, "minified react-dom source maps were found");
  assert.equal(hasRewrittenReactSourceMaps, true, "react-dom source maps were not rewritten");
});

test("webpack", async () => {
  assertCleanEnv();
  webpack(
    {
      entry: JS_ENTRY_POINT,
      output: {
        path: BUILD_OUTPUT_PATH,
        filename: "index.js",
      },
      mode: "production",
      devtool: "source-map",
      plugins: [pkg.WebpackReactSourcemapsPlugin()],
    },
    (err, stats) => {
      if (err || stats?.hasErrors()) {
        throw new Error("webpack build failed");
      }
    }
  );

  await pollForSourceMap();
  const { hasOriginalReactSourceMaps, hasRewrittenReactSourceMaps } = hasMinifiedSourcemaps(
    pkg.loadSourcemap(EXPECTED_SOURCEMAP_PATH)
  );
  assert.equal(hasOriginalReactSourceMaps, false, "minified react-dom source maps were found");
  assert.equal(hasRewrittenReactSourceMaps, true, "react-dom source maps were not rewritten");
});
test("rollup", async () => {
  // assertCleanEnv()
  await rollup({
    input: JS_ENTRY_POINT,
    output: {
      dir: BUILD_OUTPUT_PATH,
      sourcemap: true,
    },
    plugins: [
      rollupPluginCommonJS(),
      rollupDefinePlugin({
        preventAssignment: true, // silence console warning
        "process.env.NODE_ENV": JSON.stringify("production"),
      }),
      rollupNodeResolvePlugin(),
      pkg.RollupReactSourcemapsPlugin(),
    ],
  }).then(async bundle => {
    if (bundle) {
      await bundle.write({
        dir: BUILD_OUTPUT_PATH,
        sourcemap: true,
      });
    } else throw new Error("rollup build failed to write bundle");
  });

  await pollForSourceMap();
  const { hasOriginalReactSourceMaps, hasRewrittenReactSourceMaps } = hasMinifiedSourcemaps(
    pkg.loadSourcemap(EXPECTED_SOURCEMAP_PATH)
  );
  assert.equal(hasOriginalReactSourceMaps, false, "minified react-dom source maps were found");
  assert.equal(hasRewrittenReactSourceMaps, true, "react-dom source maps were not rewritten");
});
test("vite", async () => {
  assertCleanEnv();
  await vite.build({
    root: SOURCE_DIR,
    build: {
      write: true,
      outDir: BUILD_OUTPUT_PATH,
      sourcemap: true,
      rollupOptions: {
        output: {
          entryFileNames: `[name].js`,
          chunkFileNames: `[name].js`,
          assetFileNames: `[name].[ext]`,
        },
      },
    },
    plugins: [pkg.ViteReactSourcemapsPlugin()],
  });
  await pollForSourceMap();
  const { hasOriginalReactSourceMaps, hasRewrittenReactSourceMaps } = hasMinifiedSourcemaps(
    pkg.loadSourcemap(EXPECTED_SOURCEMAP_PATH)
  );
  assert.equal(hasOriginalReactSourceMaps, false, "minified react-dom source maps were found");
  assert.equal(hasRewrittenReactSourceMaps, true, "react-dom source maps were not rewritten");
});

// This fails with the following stacktrace. Since rspack support from unplugin is experimental, skip the test for now.
// Error [ERR_REQUIRE_ESM]: require() of ES Module /react-prod-sourcemaps/node_modules/string-width/index.js from /react-prod-sourcemaps/node_modules/cliui/build/index.cjs not supported.
// Instead change the require of index.js in /react-prod-sourcemaps/node_modules/cliui/build/index.cjs to a dynamic import() which is available in all CommonJS modules.
// ...
test.skip("rspack", async () => {
  assertCleanEnv();
  child_process.execSync(`npx rspack build -c ${RSPACK_CONFIG_PATH}`);
  await pollForSourceMap();
  const { hasOriginalReactSourceMaps, hasRewrittenReactSourceMaps } = hasMinifiedSourcemaps(
    pkg.loadSourcemap(EXPECTED_SOURCEMAP_PATH)
  );
  assert.equal(hasOriginalReactSourceMaps, false, "minified react-dom source maps were found");
  assert.equal(hasRewrittenReactSourceMaps, true, "react-dom source maps were not rewritten");
});

test("preserve option", async () => {
  assertCleanEnv();
  await esbuild.build({
    entryPoints: [JS_ENTRY_POINT],
    outdir: BUILD_OUTPUT_PATH,
    sourcemap: true,
    bundle: true,
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [pkg.EsbuildReactSourcemapsPlugin({ preserve: true })],
  });

  await pollForSourceMap();
  const { hasOriginalReactSourceMaps, hasRewrittenReactSourceMaps } = hasMinifiedSourcemaps(
    pkg.loadSourcemap(EXPECTED_SOURCEMAP_PATH)
  );
  assert.equal(
    hasOriginalReactSourceMaps,
    true,
    "minified react-dom source maps were found in original sourcemap"
  );
  assert.equal(
    hasRewrittenReactSourceMaps,
    false,
    "react-dom source maps were not rewritten in original sourcemap"
  );

  const {
    hasOriginalReactSourceMaps: hasOriginalReactSourceMapsInRemappedSourceMap,
    hasRewrittenReactSourceMaps: hasRewrittenReactSourceMapsInRemappedSourceMap,
  } = hasMinifiedSourcemaps(pkg.loadSourcemap(EXPECTED_REMAPPED_PATH));
  assert.equal(
    hasOriginalReactSourceMapsInRemappedSourceMap,
    false,
    "minified react-dom source maps were found in rewritten sourcemap"
  );
  assert.equal(
    hasRewrittenReactSourceMapsInRemappedSourceMap,
    true,
    "react-dom source maps were not rewritten in rewritten sourcemap"
  );
});

test("throws in strict mode if no sourcemap is generated", async () => {
  assertCleanEnv();

  // I tried using assert.throws, but it seems to have a race condition
  // with our test.afterEach and the build would fail with "failed to resolve index.js"
  // as if it did not exist on disk? I'm not sure what's going on, but just await it synchronously
  const error = await esbuild
    .build({
      entryPoints: [JS_ENTRY_POINT],
      outdir: BUILD_OUTPUT_PATH,
      // sourcemap: true, Disabled on purpose
      define: { "process.env.NODE_ENV": '"production"' },
      plugins: [pkg.EsbuildReactSourcemapsPlugin({ mode: "strict" })],
    })
    .catch(e => e);

  assert.match(error.message, /ReactSourceMaps: ❌ No sourcemaps found in bundle./);
});

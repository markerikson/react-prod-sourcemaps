import fs from "node:fs";
import test from "node:test";
import assert from "node:assert";
import console from "node:console"

import * as Plugins from "./build-plugin";
import esbuild from "esbuild";

const initTmpDir = () => {
    if(fs.existsSync("./tmp/")){
        
    }
};

test.after(() => {

});

test.todo("esbuild", async () => {
  await esbuild.build({
    plugins: [Plugins.EsbuildReactSourcemapsPlugin()],
  });
});
test.todo("webpack", () => {});
test.todo("rollup", () => {});
test.todo("vite", () => {});
test.toto("rspack", () => {});

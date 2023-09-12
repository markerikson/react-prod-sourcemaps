import * as fs from "node:fs";
import * as path from "node:path";
import { log, error } from "console";
import { createUnplugin } from "unplugin";
import { maybeRewriteSourcemapWithReactProd, loadSourcemap } from "./index";

export interface ReactSourcemapsPluginOptions {
  debug?: boolean;
}

const PLUGIN_NAME = "react-sourcemaps";
// Iterates over the list of generated assets, skips any that are not sourcemaps
// and attempts to rewrite them with React production sourcemaps.
function rewireSourceMapsFromGeneratedAssetList(
  generatedAssets: string[],
  options: ReactSourcemapsPluginOptions = { debug: false}
) {
  if (!generatedAssets.length) {
    log(
      "ReactSourceMaps: Bundle did not generate any assets? This might be a bug with react-sourcemaps plugin or an issue with your build tool"
    );
    return;
  }

  for (let i = 0; i < generatedAssets.length; i++) {
    const file = generatedAssets[i];
    if (!file.endsWith(".map")) continue;

    const rewriteResult = maybeRewriteSourcemapWithReactProd(loadSourcemap(file), {
      verbose: options.debug,
    });

    if (!rewriteResult.rewroteSourcemap) {
      if (options.debug) {
        log("ReactSourceMaps: ❌ No React version found in sourcemap, skipping", file);
      }
      continue;
    }
    if (options.debug)
      log("ReactSourceMaps: ✅ Remapped react sourcemaps for ", file, "writing to disk...");
    // WriteFileSync overwrites the file by default
    fs.writeFileSync(file, JSON.stringify(rewriteResult.outputSourcemap, null, 2));
  }
}

const unplugin = createUnplugin((pluginOptions: ReactSourcemapsPluginOptions = {debug: false}) => {
  return {
    name: PLUGIN_NAME,
    vite: {
      writeBundle(outputOptions, bundle) {
        // @TODO: we probably need a better heuristic than to fallback to path.resolve
        const outputPath = outputOptions.dir ?? path.resolve();
        const assets = Object.keys(bundle).map(asset => path.join(outputPath, asset));
        rewireSourceMapsFromGeneratedAssetList(assets, pluginOptions);
      },
    },
    rollup: {
      writeBundle(outputOptions, bundle) {
        // @TODO: we probably need a better heuristic than to fallback to path.resolve
        const outputPath = outputOptions.dir ?? path.resolve();
        const assets = Object.keys(bundle).map(asset => path.join(outputPath, asset));
        rewireSourceMapsFromGeneratedAssetList(assets, pluginOptions);
      },
    },
    webpack(compiler) {
      compiler.hooks.afterEmit.tap(PLUGIN_NAME, compilation => {
        // @TODO: we probably need a better heuristic than to fallback to path.resolve
        const outputPath = compilation.outputOptions.path ?? path.resolve();
        const assets = Object.keys(compilation.assets).map(asset => path.join(outputPath, asset));
        rewireSourceMapsFromGeneratedAssetList(assets, pluginOptions);
      });
    },
    rspack(compiler) {
      compiler.hooks.afterEmit.tap(PLUGIN_NAME, compilation => {
        // @TODO: we probably need a better heuristic than to fallback to path.resolve
        const outputPath = compilation.outputOptions.path ?? path.resolve();
        const assets = Object.keys(compilation.assets).map(asset => path.join(outputPath, asset));
        rewireSourceMapsFromGeneratedAssetList(assets, pluginOptions);
      });
    },
    esbuild: {
      setup(build) {
        // Metafile is required in order for us to get a list of
        // generated assets, see https://esbuild.github.io/api/#metafile
        build.initialOptions.metafile = true;

        // in debug, throw an error if sourcemap option is not set
        if (!build.initialOptions.sourcemap && pluginOptions.debug) {
          error(
            "ReactSourceMaps: ❌ sourcemap option is required in order for react-sourcemaps to work with esbuild."
          );
        }
        // https://esbuild.github.io/plugins/#on-end
        build.onEnd(result => {
          // If a build errors, then noop
          if (result.errors.length) {
            if (pluginOptions.debug) {
              log("ReactSourceMaps: ❌ build errored, skipping sourcemap rewrite...");
            }
            return;
          }
          if (!result.metafile) {
            throw new Error(
              "ReactSourceMaps: ❌ failed to remap, esbuild result does not include a metafile. This is required for react sourcemaps plugin to work."
            );
          }

          rewireSourceMapsFromGeneratedAssetList(
            Object.keys(result.metafile.outputs),
            pluginOptions
          );
        });
      },
    },
  };
});

export const ViteReactSourcemapsPlugin = unplugin.vite;
export const RollupReactSourcemapsPlugin = unplugin.rollup;
export const WebpackReactSourcemapsPlugin = unplugin.webpack;
export const RspackReactSourcemapsPlugin = unplugin.rspack;
export const EsbuildReactSourcemapsPlugin = unplugin.esbuild;

# react-prod-sourcemaps

A tool to update app sourcemaps with the original code of ReactDOM's production builds .

## Background

React has never shipped sourcemaps for any of its production build artifacts. This makes it impossible to meaningfully debug errors inside of React in production. React's source code is already hard to understand in its original form - trying figure out what's happening when all you have is single-character variable names and no comments is _impossible_.

In 2023 I filed a React PR at https://github.com/facebook/react/pull/26446 that updated React's build pipeline to generate sourcemaps for production artifacts. It was eventually merged, but then later reverted. Instead, React 19 will ship with optimized but unminified prod artifacts. That means that app build steps will minify React's prod artifacts themselves, and thus React's source will be debuggable.

However, that doesn't help debug _current_ versions of React.

I've done the work to check out the tagged source code for earlier React versions, rebuilt those versions locally, and verified that the artifacts are byte-for-byte identical. I've then backported the build pipeline changes from my PR onto those older checked-out versions, and built the sourcemaps that _would_ have been generated for each version.

The actual build changes used can be seen here:

- https://github.com/facebook/react/compare/v18.2.0...replayio:react:feature/react-sourcemaps-18.2.0

## Contents

This package includes:

- the actual sourcemaps
- logic to search an input sourcemap for specific React and ReactDOM prod artifacts by content hash and replace them with the "original" pre-minified bundle source via the sourcemaps
- a CLI tool that will load a given input sourcemap file and rewrite it
- a build tool plugin that will automatically replace React package sourcemaps found in the app bundle

### React Versions

This package currently includes sourcemaps for React and ReactDOM for these versions:

- 18.3.1
- 18.2.0
- 18.1.0
- 17.0.2

## CLI Usage

```bash
yarn add @acemarke/react-prod-sourcemaps
./node_modules/.bin/react-prod-sourcemaps --inputFile path/to/your/appBuild/sourcemap.js.map
# Output file will currently be written to sourcemap.remapped.js.map
```

## Build plugin usage

The build plugin is built using [unplugin](https://github.com/unjs/unplugin), meaning we currently supports webpack, esbuild, rollup, vite and rspack (experimental).

The plugin supports the following options:

| key      | value    | required | default   | recommended | functionality                                                                                                       |
| -------- | -------- | -------- | --------- | ----------- | ------------------------------------------------------------------------------------------------------------------- |
| debug    | boolean  | no       | false     | false       | enables debug logging                                                                                               |
| preserve | boolean  | no       | false     | false       | preserves original sourcemaps and outputs remapped sourcemaps under path/to/output/sourcemap/[name].js.remapped.map |
| mode     | "strict" | no       | undefined | "strict"    | causes the build plugin to throw an error if no sourcemap files are generated by the build tool                     |

> **_Warning_**: if sourcemap generation is not enabled by your build tool (or if it is not setup correctly), the plugin will silently fail and not perform any sourcemap remapping. We recommend setting using mode: "strict" in case you want the plugin to error in that case.

Webpack:

```javascript
import { WebpackReactSourcemapsPlugin } from "@acemarke/react-prod-sourcemaps";

module.exports = {
  // ...webpack config
  devtool: "source-map", // or any other option that generates separate .map.js files
  plugins: [WebpackReactSourcemapsPlugin({ debug: false, preserve: false })],
};
```

esbuild:

```javascript
import { EsbuildReactSourcemapsPlugin } from "@acemarke/react-prod-sourcemaps";

esbuild.build({
  // ...esbuild config
  sourcemap: true, // or any other option that generates separate .map.js files
  plugins: [EsbuildReactSourcemapsPlugin({ debug: false, preserve: false })],
});
```

Rollup:

```javascript
import { RollupReactSourcemapsPlugin } from "@acemarke/react-prod-sourcemaps";

rollup({
  // ...rollup config
  output: {
    sourcemap: true, // or any other option that generates separate .map.js files
  },
  plugins: [RollupReactSourcemapsPlugin({ debug: false, preserve: false })],
});
```

Vite:

```javascript
import { ViteReactSourcemapsPlugin } from "@acemarke/react-prod-sourcemaps";

vite.build({
  // ...vite config
  build: {
    sourcemap: true, // or any other option that generates separate .map.js files
  },
  plugins: [ViteReactSourcemapsPlugin({ debug: false, preserve: false })],
});
```

## Future Plans

- Add sourcemaps for more React versions
- Add more options to the CLI tool:
  - Glob sourcemaps in a folder
  - Overwrite original sourcemap paths

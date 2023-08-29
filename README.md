# react-prod-sourcemaps

A tool to update app sourcemaps with the original code of ReactDOM's production builds .

## Background

React has never shipped sourcemaps for any of its production build artifacts. This makes it impossible to meaningfully debug errors inside of React in production. React's source code is already hard to understand in its original form - trying figure out what's happening when all you have is single-character variable names and no comments is _impossible_.

I have a PR up at https://github.com/facebook/react/pull/26446 that updates React's build pipeline to generate sourcemaps for production artifacts. If and when that _eventually_ gets merged, future releases of React will include sourcemaps.

However, that doesn't help debug _current_ versions of React.

I've done the work to check out the tagged source code for earlier React versions, rebuilt those versions locally, and verified that the artifacts are byte-for-byte identical. I've then backported the build pipeline changes from my PR onto those older checked-out versions, and built the sourcemaps that _would_ have been generated for each version.

The actual build changes used can be seen here:

- https://github.com/facebook/react/compare/v18.2.0...replayio:react:feature/react-sourcemaps-18.2.0?expand=1

## Contents

This package includes:

- the actual sourcemaps
- logic to search an input sourcemap for specific ReactDOM prod artifacts by content hash and replace them with the "original" pre-minified bundle source via the sourcemaps
- a CLI tool that will load a given input sourcemap file and rewrite it

(This is my first attempt at writing a Node CLI tool. It seems to run, but there's a good chance I got something wrong - let me know!)

### React Versions

This package currently includes sourcemaps for:

- ReactDOM
  - 18.2.0
  - 18.1.0

I plan to also include ReactDOM 17.0.2, 16.14.0, and 16.13.1, which will cover the majority of current React version downloads per NPM stats.

## Usage

Currently:

```bash
yarn add @acemarke/react-prod-sourcemaps
./node_modules/.bin/react-prod-sourcemaps --inputFile path/to/your/appBuild/sourcemap.js.map
# Output file will currently be written to sourcemap.remapped.js.map
```

## Future Plans

- Add sourcemaps for more React versions
- Add more options to the CLI tool:
  - Glob sourcemaps in a folder
  - Overwrite original sourcemap paths

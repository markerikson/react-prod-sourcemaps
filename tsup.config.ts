import { defineConfig } from "tsup";

export default defineConfig(options => ({
  entry: ["src/index.mts"],
  dts: true,
  outDir: "lib",
  format: ["esm", "cjs"],
  clean: true,
  outExtension({ format }) {
    return {
      dts: ".d.ts",
      js: format === "cjs" ? `.cjs` : `.mjs`,
    };
  },
}));

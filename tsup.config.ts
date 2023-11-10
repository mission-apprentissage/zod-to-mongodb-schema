import { defineConfig } from "tsup";

export default defineConfig((options) => {
  return {
    entry: {
      index: "src/index.ts",
    },
    watch: options.watch,
    target: "es2022",
    platform: "node",
    format: ["esm"],
    splitting: true,
    shims: false,
    minify: false,
    sourcemap: true,
    dts: true,
    clean: true,
    env: {
      ...options.env,
    },
  };
});

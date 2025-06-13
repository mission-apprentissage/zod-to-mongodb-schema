import { defineConfig } from "tsup";
import type { Options } from "tsup";

export default defineConfig((options: Options): Options => {
  return {
    entry: {
      index: "src/index.ts",
    },
    watch: options.watch as boolean,
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

import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["server/src/index.ts"],
  outDir: "server/dist",
  format: ["esm"],
  target: "es2022",
  platform: "node",
  sourcemap: true,
  clean: true,
  splitting: false,
  dts: false,
  bundle: true,
});

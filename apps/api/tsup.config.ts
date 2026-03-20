import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["server/src/index.ts"],
  format: ["cjs"],
  outDir: "server/dist",
  clean: true,
  bundle: true,
});

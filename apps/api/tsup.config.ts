import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  clean: true,
  noExternal: ["@salil-sandesh/shared", "@salil-sandesh/editor-config"],
  external: ["sharp"],
});

import { defineConfig } from "tsup";

// clean:false on both — tsup runs array configs concurrently, so a clean:true
// entry can race-delete the other entry's just-written output. dist/ is wiped
// by the package.json "prebuild" script instead, before either config runs.
export default defineConfig(() => [
  {
    entry: { bin: "./src/bin.ts" },
    format: ["cjs"],
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: false,
    minify: false,
    bundle: true,
    banner: { js: "#!/usr/bin/env node" },
  },
  {
    entry: { index: "./src/server.ts" },
    format: ["cjs"],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: false,
    minify: false,
    bundle: true,
  },
]);

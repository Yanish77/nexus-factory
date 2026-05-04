const Module = require("node:module");

const originalLoad = Module._load;

Module._load = function loadWithRollupWasmFallback(request, parent, isMain) {
  if (request.startsWith("@rollup/rollup-")) {
    return originalLoad.call(this, "@rollup/wasm-node/dist/native.js", parent, isMain);
  }

  return originalLoad.call(this, request, parent, isMain);
};

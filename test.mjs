#!/usr/bin/env zx
// import "zx/globals";
import glob from "glob";
const tsFiles = glob.sync("src/**/*.ts", { nodir: true });
await Promise.all(
  tsFiles
    .filter((file) => !file.includes("testio"))
    .map(async (file) => {
      $`NODE_ENV=test node -r esbuild-register ${file}`;
    })
);

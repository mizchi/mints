#!/usr/bin/env zx
// import "zx/globals";
import glob from "glob";
import path from "path";
const tsFiles = glob.sync("src/**/*.ts", { nodir: true });
await Promise.all(
  tsFiles
    .filter((file) => !file.includes("testio"))
    .map(async (file) => {
      const prefix = file.replace(__dirname, "");
      $`NODE_ENV=test node -r esbuild-register ${file}`;
    })
);

// import { Snapshot } from "./../pargen-tokenized/src/types";
import { expose } from "comlink";
// @ts-ignore
import { createTransform } from "../mints-tokenized/dist/browser";

let transform: any = null;

console.log("worker-start", performance.now());
console.time("snapshot-loading");
const loading = fetch("/snapshot.bin", {})
  .then((r) => r.blob())
  .then((b) => b.arrayBuffer());
async function ensure() {
  if (transform) return;
  transform = createTransform(await loading);
  console.timeEnd("snapshot-loading");
  console.log("[worker] load done", performance.now());
}

const api = {
  // async init(snapshot: Snapshot) {
  //   await ensure();
  //   return transform(input, { jsx: "h" });
  // },
  async transform(input: string) {
    await ensure();
    return transform(input, { jsx: "h" });
  },
};
export type Api = typeof api;
expose(api);

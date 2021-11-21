// import { transform } from "@mizchi/mints";
// import { transform } from "../mints-tokenized/dist/browser.js";
import { expose } from "comlink";
// @ts-ignore
import { createTransform } from "../mints-tokenized/dist/browser";

let transform: any = null;

async function ensure() {
  if (transform) return;
  const buf = await fetch("/snapshot.bin")
    .then((r) => r.blob())
    .then((b) => b.arrayBuffer());
  transform = createTransform(buf);
}

const api = {
  async transform(input: string) {
    console.log("transform");
    await ensure();
    console.log("loaded");
    return transform(input, { jsx: "h" });
  },
};
export type Api = typeof api;
expose(api);

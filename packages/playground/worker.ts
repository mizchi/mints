import { expose } from "comlink";
// @ts-ignore
import { createTransform } from "../mints-tokenized/dist/browser.js";
import { snapshot } from "../mints-tokenized/src/runtime/snapshot_b64";
const chars =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const lookup = typeof Uint8Array === "undefined" ? [] : new Uint8Array(256);
for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;

const decodeBase64 = (base64: string): ArrayBuffer => {
  let bufferLength = base64.length * 0.75,
    len = base64.length,
    i,
    p = 0,
    encoded1,
    encoded2,
    encoded3,
    encoded4;
  if (base64[base64.length - 1] === "=") {
    bufferLength--;
    if (base64[base64.length - 2] === "=") {
      bufferLength--;
    }
  }
  const arraybuffer = new ArrayBuffer(bufferLength),
    bytes = new Uint8Array(arraybuffer);
  for (i = 0; i < len; i += 4) {
    encoded1 = lookup[base64.charCodeAt(i)];
    encoded2 = lookup[base64.charCodeAt(i + 1)];
    encoded3 = lookup[base64.charCodeAt(i + 2)];
    encoded4 = lookup[base64.charCodeAt(i + 3)];
    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
  }
  return arraybuffer;
};

console.time("snapshot-loading");
const buf = decodeBase64(snapshot);
const transform = createTransform(buf);
console.timeEnd("snapshot-loading");

const api = {
  async transform(input: string) {
    return transform(input, { jsx: "h" });
  },
};

export type Api = typeof api;
expose(api);

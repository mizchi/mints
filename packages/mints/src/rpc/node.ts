import type { Worker as NodeWorker } from "worker_threads";
import { createExpose, createWrap, Adapter } from "./shared";

const adapter: Adapter<NodeWorker> = [
  // emit
  (ctx, arg) => {
    // TODO: Use valid EventTarget on next Node.js version
    ctx.postMessage({ data: arg });
  },
  // listen
  (ctx, handler) => {
    ctx.on("message", handler);
  },
  // terminate
  // @ts-ignore
  (ctx) => ctx.terminate(),
];

export type { WorkerApi, RemoteCall } from "./shared";
export const expose = createExpose(adapter);
export const wrap = createWrap(adapter);

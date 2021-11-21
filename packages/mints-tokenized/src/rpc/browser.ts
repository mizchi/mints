import { createExpose, createWrap, Adapter } from "./shared";
const adapter: Adapter<Worker> = [
  // emit
  (ctx, arg, transferrable) => {
    ctx.postMessage(arg, (transferrable as any) ?? []);
  },
  // listen
  (ctx, handler) => {
    ctx.addEventListener("message", handler);
  },
  // terminate
  async (ctx) => ctx.terminate(),
];

export type { WorkerApi, RemoteCall } from "./shared";
export const expose = createExpose(adapter);
export const wrap = createWrap(adapter);

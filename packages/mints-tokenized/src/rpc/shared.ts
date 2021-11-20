import type { JsonValue } from "type-fest";
import type { Worker as NodeWorker } from "worker_threads";

type RemoteImpl = Record<string, (...args: any[]) => Promise<any>>;
export type RemoteCall<O extends RemoteImpl, N extends keyof O = keyof O> = {
  exec<T extends keyof O = N>(
    func: T,
    ...args: Parameters<O[T]>
  ): ReturnType<O[N]>;
  terminate(): Promise<void>;
};

// https://developer.mozilla.org/ja/docs/Web/API/Transferable
// https://nodejs.org/api/worker_threads.html#worker_threads_port_postmessage_value_transferlist
type OffscreenCanvas = any;
type Transferrable =
  | JsonValue
  | ArrayBuffer
  | ImageBitmap
  | OffscreenCanvas
  | MessagePort;

export type Expose<I extends RemoteImpl> = (impl: I) => RemoteCall<I>;
export type WorkerApi<Impl extends RemoteImpl> = RemoteCall<Impl>;
export type Cmd = string | [name: string, transferrable?: Transferrable[]];

const REQUEST_MARK = "m$s";
const RESPONSE_MARK = "m$r";

type Request = [
  mark: typeof REQUEST_MARK,
  id: number,
  cmd: Cmd,
  ...args: Transferrable[]
];
type Response = [
  mark: typeof RESPONSE_MARK,
  id: number,
  error: boolean,
  result: Transferrable
];

export type Adapter<Ctx = any> = [
  emit: (
    ctx: Ctx,
    data: Response | Request,
    transferrable?: Array<Transferrable>
  ) => void,
  listen: (ctx: Ctx, fn: any) => void,
  terminate: (ctx: Ctx) => Promise<void>
];

export const createExpose =
  ([emit, listen, terminate]: Adapter) =>
  (ctx: any, api: any) => {
    listen(ctx, (ev: MessageEvent) => {
      if (ev.data?.[0] !== REQUEST_MARK) {
        return;
      }
      const [, id, cmd, ...args] = ev.data as Request;
      const [cmdName, transferrable] =
        typeof cmd === "string" ? [cmd, []] : cmd;
      const func = api[cmdName];
      func(...args)
        .then((result: any) => {
          emit(ctx, [RESPONSE_MARK, id, false, result], transferrable);
        })
        .catch((e: any) =>
          emit(ctx, [RESPONSE_MARK, id, true, e?.stack ?? e?.toString()])
        );
    });
  };

const _sentIdMap: Map<
  number,
  [resolve: (ret: any) => void, reject: (err: any) => void]
> = new Map();
let _cnt = 0;
const genId = () => _cnt++;
export const createWrap =
  ([emit, listen, terminate]: Adapter) =>
  <Impl extends RemoteImpl>(ctx: Worker | NodeWorker): WorkerApi<Impl> => {
    listen(ctx, (ev: MessageEvent) => {
      if (ev.data?.[0] !== RESPONSE_MARK) {
        return;
      }
      const [, id, error, result] = ev.data as Response;
      const obj = _sentIdMap.get(id);
      if (obj == null) return;
      _sentIdMap.delete(id);
      obj[error ? 1 : 0](result);
    });
    return {
      terminate: () => terminate(ctx),
      // @ts-ignore
      exec(cmd: Cmd, ...args: Transferrable<any>) {
        const id = genId();
        return new Promise((resolve, reject) => {
          _sentIdMap.set(id, [resolve, reject]);
          const [cmdName, transferrable] =
            typeof cmd === "string" ? [cmd, []] : cmd;
          const req = [REQUEST_MARK, id, cmdName, ...args] as Request;
          emit(ctx, req, transferrable);
        });
      },
    };
  };

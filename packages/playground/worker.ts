import { transform } from "@mizchi/mints";
import { expose } from "comlink";
const api = {
  transform,
};
export type Api = typeof api;
expose(api);

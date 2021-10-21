import { transform } from "@mizchi/mints";
import { expose } from "comlink";
const api = {
  transform(input: string) {
    return transform(input);
  },
};
export type Api = typeof api;
expose(api);

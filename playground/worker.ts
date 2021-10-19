// import {} from "./";
import { transform } from "../src/ts";
import { expose } from "comlink";

const api = {
  transform,
};
export type Api = typeof api;
expose(api);

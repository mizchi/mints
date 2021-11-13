import { expose } from "../rpc/node";
import { processLine } from "../dist/index.cjs";
import { parentPort } from "worker_threads";

// console.log("worker started");
async function transform(tokensList) {
  // const ctx = "transform_child_" + Math.random().toString(32).substr(2, 10);
  // console.time(ctx);
  // console.log("worker:transform:start");

  return tokensList.map((tokens) => processLine(tokens));
  // console.log("worker:transform:end", out);
  // console.timeEnd(ctx);
  // return out;
}

expose(parentPort, { transform });

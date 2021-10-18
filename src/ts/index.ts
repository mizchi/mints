export { program } from "./statements";

import { run } from "@mizchi/test";
const isMain = require.main === module;
if (process.env.NODE_ENV === "test") {
  const now = Date.now();
  run({ stopOnFail: true, stub: true, isMain }).then(() => {
    console.log("[test:time]", Date.now() - now);
  });
}

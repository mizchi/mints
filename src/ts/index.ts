export { program } from "./statements";

import { run } from "@mizchi/test";
const isMain = require.main === module;
if (process.env.NODE_ENV === "test") {
  run({ stopOnFail: true, stub: true, isMain });
}

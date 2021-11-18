import { createSnapshot } from "../../pargen-tokenized/src/index";
import { line } from "./grammar";
import fs from "fs";
import path from "path";

const snapshot = createSnapshot(line);

fs.writeFileSync(
  path.join(__dirname, "snapshot.json"),
  JSON.stringify(snapshot)
);

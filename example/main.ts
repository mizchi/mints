import { bulkMutate, iter, openDB } from "../src";

async function main() {
  const database = await openDB(
    "testdb",
    2,
    ["t1", "t2", "t3"],
    (oldVersion, newVersion, database) => {
      console.log("upgraded", oldVersion, newVersion, database);
    }
  );

  await bulkMutate(database, [
    ["t1", "set", "a", "x"],
    ["t1", "set", "a2", "xxxx"],
    ["t2", "set", "b", "y"],
    ["t3", "set", "c", "z"],
    ["t1", "delete", "x"],
  ]);

  for await (const [key, value] of iter(database, "t1")) {
    console.log("t1::", key, value);
  }

  for await (const [key, value] of iter(database, "t2")) {
    console.log("t2::", key, value);
  }

  for await (const [key, value] of iter(database, "t3")) {
    console.log("t3::", key, value);
  }
}

main().catch(console.error);

# @mizchi/idb-ops

simple idb wrapper focused on batch updating.

```bash
$ npm install @mizchi/idb-ops --save
# or
$ yarn add @mizchi/idb-ops
```

## How to use

```ts
import { bulkMutate, iter, openDB } from "@mizchi/idb-ops";

async function main() {
  const database = await openDB(
    // db
    "testdb",
    // version
    1,
    // objectStore names
    ["t1", "t2", "t3"],
    // onUpgrade
    (oldVersion, newVersion, database) => {
      console.log("upgraded", oldVersion, newVersion, database);
    }
  );
  // bulk update
  await bulkMutate(database, [
    ["t1", "set", "a", "x"],
    ["t1", "set", "a2", "xxxx"],
    ["t2", "set", "b", "y"],
    ["t3", "set", "c", "z"],
    ["t1", "delete", "x"],
  ]);

  // async iterator
  for await (const [key, value] of iter(database, "t1")) {
    console.log("t1::", key, value);
  }
}

main().catch(console.error);
```

## Related

- [kvs/packages/indexeddb at master · azu/kvs](https://github.com/azu/kvs/tree/master/packages/indexeddb)
- [treojs/idb-batch: Perform batch operation on IndexedDB](https://github.com/treojs/idb-batch)

## LICENSE

MIT



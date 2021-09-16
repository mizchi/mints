// based on https://github.com/azu/kvs/tree/master/packages/indexeddb

const READONLY = "readonly";
const READWRITE = "readwrite";

const debug = {
  enabled: false,
  log(...args: any[]) {
    if (!debug.enabled) {
      return;
    }
    console.log(...args);
  },
};

export const debugEnabled = (enabled: boolean) => {
  debug.enabled = enabled;
};

export const openDB = (
  name: string,
  version: number,
  tableNames: string[],
  onUpgrade: (
    oldVersion: number,
    newVersion: number,
    database: IDBDatabase
  ) => any
): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const openRequest = indexedDB.open(name, version);
    openRequest.onupgradeneeded = (event) => {
      const oldVersion = event.oldVersion;
      const newVersion = event.newVersion ?? version;
      const database = openRequest.result;
      // migrate from schema
      for (const tableName of tableNames) {
        try {
          database.createObjectStore(tableName);
        } catch (e) {
          console.error(e);
        }
      }
      // for drop instance
      // https://github.com/w3c/IndexedDB/issues/78
      // https://www.w3.org/TR/IndexedDB/#introduction
      database.onversionchange = () => database.close();

      // @ts-ignore
      event.target.transaction.oncomplete = () => {
        Promise.resolve(onUpgrade(oldVersion, newVersion, database)).then(
          () => {
            return resolve(database);
          }
        );
      };
    };
    openRequest.onblocked = () => reject(openRequest.error);
    openRequest.onerror = () => reject(openRequest.error);
    openRequest.onsuccess = () => resolve(openRequest.result);
  });
};

export const dropInstance = (
  database: IDBDatabase,
  databaseName: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    database.close();
    const request = indexedDB.deleteDatabase(databaseName);
    request.onupgradeneeded = (event) => {
      event.preventDefault();
      resolve();
    };
    request.onblocked = () => {
      debug.log("dropInstance:blocked", request);
      reject(request.error);
    };
    request.onerror = function () {
      debug.log("dropInstance:error", request);
      reject(request.error);
    };
    request.onsuccess = function () {
      resolve();
    };
  });
};

export const get = <V>(
  database: IDBDatabase,
  tableName: string,
  key: string
): Promise<V | void> => {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(tableName, READONLY);
    const objectStore = transaction.objectStore(tableName);
    const request = objectStore.get(String(key));
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
};

export const has = async (
  database: IDBDatabase,
  tableName: string,
  key: string
): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(tableName, READONLY);
    const objectStore = transaction.objectStore(tableName);
    const request = objectStore.count(String(key));
    request.onsuccess = () => {
      resolve(request.result !== 0);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
};

export const set = async <V>(
  database: IDBDatabase,
  tableName: string,
  key: string,
  value: V | undefined
): Promise<void> => {
  // If the value is undefined, delete the key
  // This behavior aim to align localStorage implementation
  if (value === undefined) {
    await deleteItem(database, tableName, key);
    return;
  }
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(tableName, "readwrite");
    const objectStore = transaction.objectStore(tableName);
    const request = objectStore.put(value, String(key));
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onabort = () => {
      reject(request.error ? request.error : transaction.error);
    };
    transaction.onerror = () => {
      reject(request.error ? request.error : transaction.error);
    };
  });
};

function handleError(cb: Function) {
  return (e: any) => {
    // prevent global error throw https://bugzilla.mozilla.org/show_bug.cgi?id=872873
    if (typeof e.preventDefault === "function") e.preventDefault();
    cb(e.target.error);
  };
}

type Command =
  | [tableName: string, command: "set", key: string, value: string]
  | [tableName: string, command: "delete", key: string];

export const bulkMutate = async (
  database: IDBDatabase,
  ops: Array<Command>
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const tableNames = [
      ...new Set(ops.map(([tableName]) => tableName)).values(),
    ];
    const tx = database.transaction(tableNames, READWRITE);
    const stores = tableNames.reduce((acc, tableName) => {
      const objectStore = tx.objectStore(tableName);
      return { ...acc, [tableName]: objectStore };
    }, {} as { [key: string]: IDBObjectStore });
    tx.oncomplete = () => resolve();
    tx.onabort = handleError(reject);
    tx.onerror = handleError(reject);
    for (const op of ops) {
      const [tableName, command, key, value] = op;
      if (command === "set") {
        const req = stores[tableName].put(value, String(key));
        req.onerror = console.error;
      }
      if (command === "delete") {
        const req = stores[tableName].delete(String(key));
        req.onerror = console.error;
      }
    }
    tx.commit();
  });
};

export const deleteItem = async (
  database: IDBDatabase,
  tableName: string,
  key: string
): Promise<void> => {
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(tableName, READWRITE);
    const objectStore = transaction.objectStore(tableName);
    const request = objectStore.delete(String(key));
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onabort = () => {
      reject(request.error ? request.error : transaction.error);
    };
    transaction.onerror = () => {
      reject(request.error ? request.error : transaction.error);
    };
  });
};

export const clear = async (
  database: IDBDatabase,
  tableName: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(tableName, "readwrite");
    const objectStore = transaction.objectStore(tableName);
    const request = objectStore.clear();
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onabort = () => {
      reject(request.error ? request.error : transaction.error);
    };
    transaction.onerror = () => {
      reject(request.error ? request.error : transaction.error);
    };
  });
};

const iterator = <V>(
  database: IDBDatabase,
  tableName: string
): AsyncIterator<[string, V]> => {
  const handleCursor = <T>(
    request: IDBRequest<T | null>
  ): Promise<{ done: boolean; value?: T }> => {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) {
          return resolve({
            done: true,
          });
        }
        return resolve({
          done: false,
          value: cursor,
        });
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  };
  const tx = database.transaction(tableName, READONLY);
  const store = tx.objectStore(tableName);
  const req = store.openCursor();
  return {
    async next() {
      const { done, value } = await handleCursor(req);
      if (!done) {
        const storageKey = value?.key as string;
        const storageValue = value?.value as V;
        value?.continue();
        return { done: false, value: [storageKey, storageValue] };
      }
      return { done: true, value: undefined };
    },
  };
};

export const iter = (database: IDBDatabase, tableName: string) => ({
  [Symbol.asyncIterator]() {
    return iterator(database, tableName);
  },
});

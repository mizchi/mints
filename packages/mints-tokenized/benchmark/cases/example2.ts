import type { IPromisesAPI } from "memfs/lib/promises";
import { Volume } from "memfs";
import createFs from "memfs/lib/promises";

import path from "path";
import { analyzeModule } from "./analyzer";
import { parse } from "./parser";
import type { BundleOptions, AnalyzedChunk, ImportMap } from "./types";
import { ModulesMap } from "./types";
import { optimize } from "./optimizer";
import { render } from "./renderer";
import { filepathToFlatSymbol } from "./helpers";

const defaultImportMap = {
  imports: {},
};

export class Bundler {
  private modulesMap = new Map<string, AnalyzedChunk>();
  public fs: IPromisesAPI;
  public importMap: ImportMap = defaultImportMap;
  // {
  //   this.fs = createMemoryFs(files);
  // }
  public async bundle(
    entry: string,
    { exposeToGlobal = null, optimize: _optimize = true }: BundleOptions
  ) {
    await this.addModule(entry);
    const chunks = aggregateChunks(this.modulesMap, entry);
    const optimizedChunks = _optimize
      ? optimize(chunks, entry, this.importMap)
      : chunks;
    return render(entry, optimizedChunks, {
      exposeToGlobal,
      transformDynamicImport: false,
    });
  }
  public async bundleChunks(
    entry: string
    // {} : {} = {}
  ) {
    if (builtChunks.find((c) => c.entry === entry)) {
      return;
    }
    await this.addModule(entry);
    const chunks = aggregateChunks(this.modulesMap, entry);
    const optimizedChunks = _optimize
      ? optimize(chunks, entry, this.importMap)
      : chunks;
    const built = render(entry, optimizedChunks, {
      exposeToGlobal: exposeToGlobal,
      transformDynamicImport: true,
      publicPath,
    });
    if (root) {
      builtChunks.push({
        type: "entry",
        entry,
        builtCode: built,
      });
    } else {
      builtChunks.push({
        type: "chunk",
        entry,
        chunkName: filepathToFlatSymbol(entry, publicPath),
        builtCode: built,
      });
    }
    const dynamicImports = optimizedChunks.map((c) => c.dynamicImports).flat();
    dynamicImports.forEach((i) => {
      this.bundleChunks(
        i.filepath,
        {
          exposeToGlobal: null,
          optimize: _optimize,
          root: false,
          publicPath,
        },
        builtChunks
      );
    });
    console.log("bundle", dynamicImports);
    const workerSources = optimizedChunks.map((c) => c.workerSources).flat();
    workerSources.forEach((i) => {
      this.bundleChunks(
        i.filepath,
        {
          exposeToGlobal: null,
          optimize: _optimize,
          root: false,
          publicPath,
        },
        builtChunks
      );
    });
    return builtChunks;
  }
  public async updateModule(filepath: string, nextContent: string) {
    await this.fs.writeFile(filepath, nextContent);
    this.modulesMap.delete(filepath);
    this.addModule(filepath);
  }

  //   // // TODO: need this?
  async deleteRecursive(filepath: string) {
    const cached = this.modulesMap.get(filepath)!;
    if (cached) {
      for (const i of cached.imports) {
        this.deleteRecursive(i.filepath);
        this.modulesMap.delete(i.filepath);
      }
    }
  }
  private async addModule(filepath: string): Promise<void> {
    console.log("add module", filepath);
    if (this.modulesMap.has(filepath)) {
      return;
    }
    const basepath = path.dirname(filepath);
    const raw = await readFile(this.fs, filepath);
    const ast = parse(raw, filepath);
    const analyzed = analyzeModule(ast, basepath, this.importMap);
    this.modulesMap.set(filepath, {
      ...analyzed,
      raw,
      filepath,
      ast,
    });
    console.log("used", filepath, JSON.stringify(imports, null, 2));
    for (const i of analyzed.imports) {
      await this.addModule(i.filepath);
    }
    for (const di of analyzed.dynamicImports) {
      await this.addModule(di.filepath);
    }
    for (const w of analyzed.workerSources) {
      await this.addModule(w.filepath);
    }
  }
}

export function aggregateChunks(modulesMap: ModulesMap, entryPath: string) {
  const entryMod = modulesMap.get(entryPath)!;
  const chunks: AnalyzedChunk[] = [];
  _aggregate(entryMod);
  return chunks;
  function _aggregate(mod: AnalyzedChunk) {
    if (chunks.find((x) => x.filepath === mod.filepath)) {
      return chunks;
    }
    for (const imp of mod.imports) {
      if (chunks.find((x) => x.filepath === imp.filepath)) {
        continue;
      }
      const child = modulesMap.get(imp.filepath)!;
      _aggregate(child);
    }
    for (const dimp of mod.dynamicImports) {
      if (chunks.find((x) => x.filepath === dimp.filepath)) {
        continue;
      }
      const child = modulesMap.get(dimp.filepath)!;
      _aggregate(child);
    }
    chunks.push(mod);
    return chunks;
  }
}

// helper
export function createMemoryFs(): IPromisesAPI {
  // files: { [k: string]: string }
  const vol = Volume.fromJSON(files, "/");
  return createFs(vol) as IPromisesAPI;
}

export async function readFile(fs: IPromisesAPI, filepath: string) {
  const raw = (await fs.readFile(filepath, {
    encoding: "utf-8",
  })) as string;
  return raw;
}

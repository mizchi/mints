import type { RootCompiler, RootParser, Snapshot } from "./types";
export declare function createSnapshot(refId: number): Snapshot;
export declare function createContext(funcs?: Function[], prebuiltSnapshot?: Snapshot): RootCompiler;
export declare function createParserWithSnapshot(funcs: Function[], snapshot: Snapshot): RootParser;

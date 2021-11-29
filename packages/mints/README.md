# mints: minimum typescript compiler (7.6kb, gzip)

## Goal

- Extreme lightweight
- Just drop type annotations
- Fast first compile (use prebuild binary format)
- Support parallel compile

## How to use

```
npm install @mizchi/mints --save
yarn add @mizchi/mints
```

```ts
import { transformSync } from "@mizchi/mints";
const out = transformSync(`const x: number = 1;`);

if (!out.error) {
  console.log(out); // parse error object
} else {
  console.log(out.code); // result
}
```

TODO: add worker format

## NOTICE:

- mints works with prettier formatted source.
- RegExp literal(`/.../`) is unstable
  - `/[whitespace]` can not parse as RexExp (expect divide)
  - `/>` can not parse as RegExp (expect jsx)
  - `</` can not parse as RegExp (expect jsx)

## Benchmark

```
$ yarn bench
```

```
--------- 2416chars
[tsc] 58ms
[esbuild] 14ms
[mints] 6ms
[mints_para] 12ms
--------- e2981chars
[tsc] 14ms
[esbuild] 1ms
[mints] 9ms
[mints_para] 12ms
--------- 5118chars
[tsc] 18ms
[esbuild] 1ms
[mints] 12ms
[mints_para] 22ms
--------- 21153chars
[tsc] 55ms
[esbuild] 3ms
[mints] 59ms
[mints_para] 53ms
--------- 18584chars
[tsc] 39ms
[esbuild] 2ms
[mints] 39ms
[mints_para] 32ms
--------- 3844chars
[tsc] 12ms
[esbuild] 1ms
[mints] 9ms
[mints_para] 17ms
--------- 38611chars
[tsc] 72ms
[esbuild] 3ms
[mints] 57ms
[mints_para] 45ms
--------- 6935chars
[tsc] 13ms
[esbuild] 1ms
[mints] 13ms
[mints_para] 7ms
```

---

## How to develop

```bash
# git clone ...
yarn install

cd packages/mints
yarn build
yarn test
yarn bench
yarn test262 # not pass yet
```

## May not support

- with
- namespace
- decorator

## LICENSE

MIT

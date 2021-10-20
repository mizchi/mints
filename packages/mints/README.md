# mints

5kb(gzip) typescript compiler

WIP. Lightweight but slow on runtime and imperfect, yet.

## Example

```ts
import {transform} from "@mizchi/mints";
const out = transform(`const x: number = 1;`);
console.log(out);
```

## TODO

### TS

- type as `import("").Foo`

### Advanced Transform

- [ ] constructor's initialization(private/public/protected)
- [ ] Enum
- [ ] JSX
- [ ] namespace (may not support)
- [ ] decorator (may not support)

### Perf

- skip: zero-width whitespace
- Backtrack Counter
- enum => const to reduce size
- optimize: flat or
- optimize: flat seq
- optimize: recursive token compose
- optimize: dump syntax definition and load
- cache clear on next statement
- Profiler: Token
- Profiler: Def Rules

## LICENSE

MIT
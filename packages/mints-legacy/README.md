# mints: 5kb typescript compiler

## Goal

- Just Strip Type Annotations by typescript
- Imperfect Superset Syntax (expect prettier formatted code as input)
- Not Fast
- Extreme lightweight: 5.1kb (gzip)

## How to use

```ts
import {transform} from "@mizchi/mints";
const out = transform(`const x: number = 1;`);
console.log(out.result);
```

## TODO

### TS

- `type T = import("path").Foo`;
- `infer T`

### Advanced Transform

- [x] constructor's initialization(private/public/protected)
- [ ] enum
- [ ] JSX

## May not support

- with (may not support)
- namespace (may not support)
- decorator (may not support)

## LICENSE

MIT
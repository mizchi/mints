# WIP: Grammer

It does not works yet.

This module parse grammer file to gererate parser.

```
// comment
start = member;

member = left:ident "\\." right:ident { return { left: input.left, right: input.right} };

ident = "[a-zA-Z_$][a-zA-Z0-9_$]*";
```

```ts
import {parseGrammer, buildParser} from "./index";
const ast = parseGrammer(input);
// TODO: serialize to minify
// const bin = serializeAst(ast);
// TODO: deserialize
// const astRestored = deserialize(bin);

// build parser
const parser = builderParser(ast);

// run
const parsed = parser('a.b');
console.log("parsed", parsed); // => "a.b"
```

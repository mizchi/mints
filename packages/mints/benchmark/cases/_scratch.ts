// This file was procedurally generated from the following sources:
// - src/dstr-binding/obj-ptrn-id-init-fn-name-cover.case
// - src/dstr-binding/default/arrow-function-dflt.template
/*---
description: SingleNameBinding assigns `name` to "anonymous" functions "through" cover grammar (arrow function expression (default parameter))
esid: sec-arrow-function-definitions-runtime-semantics-evaluation
features: [destructuring-binding, default-parameters]
flags: [generated]
info: |
    ArrowFunction : ArrowParameters => ConciseBody

    [...]
    4. Let closure be FunctionCreate(Arrow, parameters, ConciseBody, scope, strict).
    [...]

    9.2.1 [[Call]] ( thisArgument, argumentsList)

    [...]
    7. Let result be OrdinaryCallEvaluateBody(F, argumentsList).
    [...]

    9.2.1.3 OrdinaryCallEvaluateBody ( F, argumentsList )

    1. Let status be FunctionDeclarationInstantiation(F, argumentsList).
    [...]

    9.2.12 FunctionDeclarationInstantiation(func, argumentsList)

    [...]
    23. Let iteratorRecord be Record {[[iterator]]:
        CreateListIterator(argumentsList), [[done]]: false}.
    24. If hasDuplicates is true, then
        [...]
    25. Else,
        b. Let formalStatus be IteratorBindingInitialization for formals with
           iteratorRecord and env as arguments.
    [...]

    13.3.3.7 Runtime Semantics: KeyedBindingInitialization

    SingleNameBinding : BindingIdentifier Initializeropt

    [...]
    6. If Initializer is present and v is undefined, then
       [...]
       d. If IsAnonymousFunctionDefinition(Initializer) is true, then
          i. Let hasNameProperty be HasOwnProperty(v, "name").
          ii. ReturnIfAbrupt(hasNameProperty).
          iii. If hasNameProperty is false, perform SetFunctionName(v,
               bindingId).
---*/

// var callCount = 0;
// var f;
// f = ({ cover = (function () {}), xCover = (0, function() {})  } = {}) => {
//   // assert.sameValue(cover.name, 'cover');
//   // assert.notSameValue(xCover.name, 'xCover');
//   // callCount = callCount + 1;
// };

// f();
// assert.sameValue(callCount, 1, 'arrow function invoked exactly once');

// const xxx = {
//     get x(): number {
//         return 1;
//     }
// }

// const xxx1 = {
//     get x() {
//         return 1;
//     }
// }

class X {
    async * f() {
        return 1;
    }
}

const x = {
    async * [Symbol.asyncIterator]() {
        for (const c of []) {
            yield c;
        }
    },
};

function * f() {
    yield 1;
    yield 2;
}



// const _createListener = (): Deno.Listener => {
//     const rid = _genRid();
//     const connections: Deno.Conn[] = [];
//     return {
//       rid,
//       /** Waits for and resolves to the next connection to the `Listener`. */
//       async accept(): Promise<Deno.Conn> {
//         return null as any;
//       },
//       /** Close closes the listener. Any pending accept promises will be rejected
//        * with errors. */
//       close() {
//         _deleteResource(rid);
//       },
//       addr: {
//         transport: "tcp",
//         hostname: "0.0.0.0",
//         port: 1400,
//       },
//       async *[Symbol.asyncIterator]() {
//         for (const c of connections) {
//           yield c;
//         }
//       },
//     };
//   };
  
// prettier-ignore
// @ts-nocheck
const it=require.main==module?((q,o,_=o(()=>q.map(o)))=>(_:Function)=>q.push(_))([],setTimeout):null;
process.on("unhandledRejection", (r) => console.log(r) ?? process.exit(1));

it?.(() => {
  console.log("xxx");
});

it?.(() => {
  console.log("yyy");
});

it?.(async () => {
  console.log("zzz");
  throw new Error("stop");
});

// it?.(() => {
//   throw "stop";
// });

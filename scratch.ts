enum MyEnum {
  A,
}

// const values = Object.values(MyEnum);
const set = new Set(
  Object.values(MyEnum).filter((v) => typeof v === "number")
) as Set<MyEnum>;

console.log(MyEnum, set, set.has(MyEnum.A));

let n = 1;
n++ as number;

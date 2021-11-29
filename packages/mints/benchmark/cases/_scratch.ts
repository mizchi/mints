(function(obj) {
  // assert.sameValue(obj.a, 2);
  // assert.sameValue(obj.b, 3);
  assert.sameValue(executedGetter, false);
  assert.sameValue(Object.keys(obj).length, 3);
  callCount += 1;
}.apply(null, [{...o, get c() { executedGetter = true; }}]));

// assert.sameValue(callCount, 1);

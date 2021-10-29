#!/bin/bash

node -r esbuild-register test/clone-test262.ts
npx test262-harness --preprocessor test/preprocess.js \
  test262/test262-checkout/test/language/expressions/array/11.1.4-0.js

  # npx test262-harness --preprocessor test/preprocess.js \
  # test262/test262-checkout/test/language/expressions/array/*.js,
  # test262/test262-checkout/test/language/expressions/array/11.1.4-0.js

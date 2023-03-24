const mints = require("../dist/index.cjs");
const prettier = require("prettier");

/**
 * test262-harness preprocessor documented here:
 https://github.com/bterlson/test262-harness#preprocessor
 */
module.exports = function (test) {
  // console.log(test);
  // console.log("try to parse", test.file);

  // Mints doesn't attempt to throw SyntaxError on bad syntax, so skip those tests.
  if (test.attrs.negative) {
    return null;
  }

  // Mints assumes strict mode, so skip sloppy mode tests.
  if (test.scenario === "default") {
    return null;
  }
  // if (test.scenario === "strict mode") {
  //   return null;
  // }

  // TCO tests seem to fail in V8 normally, so skip those.
  if (test.attrs.features?.includes("tail-call-optimization")) {
    return null;
  }

  try {
    // console.log("test", test);
    // console.log("transformed", test.file, test.contents.slice(0, 10));
    // console.log("test.contents", test.contents);
    // test.contents = prettier.format(test.contests, {
    //   // filepath: "$.tsx",
    //   parser: "typescript",
    // });
    // console.log("pre", prettiered);
    const transformed = mints.transformSync(
      prettier.format(test.contents, {
        filepath: "$.tsx",
        parser: "typescript",
      }),
    );
    if (transformed.error) {
      // console.log("====", test.contents, "\n====\n");
      throw new Error("parse-error");
    }
    test.contents = transformed.code;

    // if (test.scenario === "strict mode") {
    //   test.contents = "'use strict';'\n" + test.contents;
    // }
  } catch (error) {
    // console.log("failed", error);
    // throw
    test.result = {
      stderr: JSON.stringify(error, null, 2),
      stderr: "error",
      stdout: "",
      error,
    };
  }

  return test;
};

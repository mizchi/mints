const mints = require("../dist/index.cjs");

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

  // TCO tests seem to fail in V8 normally, so skip those.
  if (test.attrs.features?.includes("tail-call-optimization")) {
    return null;
  }

  try {
    // console.log("transformed", test.file, test.contents.slice(0, 10));
    console.log("test.contents", test.contents);
    const transformed = mints.transformSync(test.contents);
    if (transformed.error) {
      console.log("====", test.contents, "\n====\n");
      throw new Error("parse-error");
    }
    test.contents = transformed.code;
  } catch (error) {
    // console.log("failed", test.file);
    test.result = {
      stderr: JSON.stringify(error, null, 2),
      stderr: "error",
      stdout: "",
      error,
    };
  }

  return test;
};

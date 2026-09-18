// .eslintrc.json's `parserOptions.project` is relative and typescript-eslint
// resolves relative paths against `tsconfigRootDir`, which defaults to
// `process.cwd()` when unset. `lint-staged`'s root-level `eslint --fix` runs
// with cwd = repo root, not this package, so without an explicit
// `tsconfigRootDir` it resolved "./tsconfig.json" against the WRONG
// tsconfig (root's project-references tsconfig.json, which typescript-eslint
// can't parse). Wrap the JSON config instead of duplicating it, and pin
// tsconfigRootDir to this file's own directory so resolution is cwd-independent.
const config = require("./.eslintrc.json");

module.exports = {
  ...config,
  parserOptions: {
    ...config.parserOptions,
    tsconfigRootDir: __dirname,
  },
  // Same cwd-independence problem as `parserOptions.project` above: this
  // resolver's own "project" option (when unset) can fall back to a cwd-
  // relative lookup. Pin it to this package's own tsconfig explicitly.
  settings: {
    ...config.settings,
    "import/resolver": {
      typescript: {
        project: require("path").join(__dirname, "tsconfig.json"),
      },
    },
  },
};

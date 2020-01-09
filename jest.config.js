const { defaults } = require("jest-config");

module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleFileExtensions: [...defaults.moduleFileExtensions, "ts", "tsx"],
  roots: ["./src/", "./tests/src"],
  bail: true,
  verbose: true,
  coverageDirectory: "./",
  collectCoverage: false,
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/domain/models/*",
    "!src/domain/repositories/*",
    "!src/handlers/helpers/*",
    "!**/node_modules/**",
    "!**/vendor/**"
  ],
};
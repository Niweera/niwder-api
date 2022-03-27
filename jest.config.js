const { pathsToModuleNameMapper } = require("ts-jest");

module.exports = {
  clearMocks: true,
  coverageProvider: "v8",
  moduleFileExtensions: ["js", "jsx", "ts", "tsx", "json", "node"],

  roots: ["<rootDir>/src"],

  moduleNameMapper: pathsToModuleNameMapper(
    {
      "firebase-admin/*": ["node_modules/firebase-admin/lib/*"],
    },
    {
      prefix: "<rootDir>",
    }
  ),

  testMatch: ["**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[tj]s?(x)"],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
};

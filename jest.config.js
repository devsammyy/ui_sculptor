const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  testEnvironment: "jest-environment-jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: ["**/__tests__/**/*.test.{ts,tsx}", "**/*.test.{ts,tsx}"],
  collectCoverageFrom: [
    "src/core/**/*.{ts,tsx}",
    "src/infrastructure/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
  ],
};

module.exports = createJestConfig(customJestConfig);

module.exports = createJestConfig(customJestConfig);


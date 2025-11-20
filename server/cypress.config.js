import { defineConfig } from "cypress";

export default defineConfig({
  projectId: '64ertr',
  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
    },
  },
    e2e: {
    baseUrl: "http://localhost:5173", // or your deployed URL
    supportFile: "cypress/support/e2e.js",
    testIsolation: false,
    experimentalStudio: true,

    defaultCommandTimeout: 90000,
    requestTimeout: 65000,
    responseTimeout: 65000,

    viewportWidth: 1920,
    viewportHeight: 1080,
  }
});


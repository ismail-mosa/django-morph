const { defineConfig } = require("@playwright/test");
const path = require("path");

module.exports = defineConfig({
    testDir: ".",
    timeout: 20000,
    retries: 1,
    use: {
        baseURL: "http://localhost:8765",
        viewport: { width: 1280, height: 800 },
    },
    webServer: {
        command: "python3 manage.py runserver 8765",
        port: 8765,
        reuseExistingServer: true,
        cwd: path.resolve(__dirname, "../.."),
    },
});

import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        monkey({
            entry: "src/main.ts",
            userscript: {
                namespace: "https://github.com/e6nlaq/monkey-template",
                match: [],
                name: "Monkey Template",
                grant: [],
                author: "e6nlaq",
                copyright: "(C) 2026 e6nlaq",
            },
        }),
    ],
});

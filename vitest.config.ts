import { defineConfig } from "vitest/config";

// Verbose reporter: lists every test file and test even when all pass, so every test file that ran is visible.
export default defineConfig({ test: { reporters: ["verbose"] } });

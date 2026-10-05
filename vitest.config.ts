import { defineConfig } from "vitest/config";

// Verbose reporter: lists every test file and test even when all pass, so the gate scripts can see which golden files ran.
export default defineConfig({ test: { reporters: ["verbose"] } });

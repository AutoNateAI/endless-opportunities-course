import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(process.cwd());
const sourceDir = resolve(rootDir, "courses");
const outDir = resolve(rootDir, "dist");

if (!existsSync(sourceDir)) {
  console.error(`Missing source directory: ${sourceDir}`);
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync(sourceDir, outDir, { recursive: true });

console.log(`Built GitHub Pages output: ${outDir}`);

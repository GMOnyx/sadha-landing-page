import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(projectRoot, "dist");

const publicEntries = [
  "index.html",
  "thank-you.html",
  "script.js",
  "styles.css",
  "LOGO.png",
  "SA DA.svg",
  "SADHA WAVEFORM.svg",
  "assets",
];

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const entry of publicEntries) {
  await cp(
    path.join(projectRoot, entry),
    path.join(outputDirectory, entry),
    { recursive: true },
  );
}

console.log(`Built ${publicEntries.length} public entries in dist/.`);

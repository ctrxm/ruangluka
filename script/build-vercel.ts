import { build as viteBuild } from "vite";
import { build as esbuild } from "esbuild";
import { rm, readdir, writeFile } from "fs/promises";

async function buildVercel() {
  await rm("dist", { recursive: true, force: true });

  console.log("1. Building client for Vercel...");
  await viteBuild();

  console.log("2. Pre-bundling API functions with esbuild...");
  const apiFiles = (await readdir("api")).filter(f => f.endsWith(".ts"));

  for (const file of apiFiles) {
    const entryPoint = `api/${file}`;
    const baseName = file.replace(".ts", "");
    const handlerFile = `api/_${baseName}_handler.js`;

    await esbuild({
      entryPoints: [entryPoint],
      outfile: handlerFile,
      bundle: true,
      platform: "node",
      target: "node18",
      format: "cjs",
      sourcemap: false,
      minify: false,
      external: [],
    });

    console.log(`   Bundled: ${entryPoint} → ${handlerFile}`);

    await writeFile(
      entryPoint,
      `module.exports = require("./_${baseName}_handler.js");\n`
    );
    console.log(`   Replaced ${entryPoint} with re-export wrapper`);
  }

  console.log("Vercel build complete!");
}

buildVercel().catch((err) => {
  console.error(err);
  process.exit(1);
});

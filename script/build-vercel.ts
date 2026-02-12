import { build as viteBuild } from "vite";
import { build as esbuild } from "esbuild";
import { rm, readdir } from "fs/promises";

async function buildVercel() {
  await rm("dist", { recursive: true, force: true });

  console.log("1. Building client for Vercel...");
  await viteBuild();

  console.log("2. Pre-bundling API functions with esbuild...");
  const apiFiles = (await readdir("api")).filter(f => f.endsWith(".ts"));

  for (const file of apiFiles) {
    const entryPoint = `api/${file}`;
    const outfile = `api/${file.replace(".ts", ".js")}`;

    await esbuild({
      entryPoints: [entryPoint],
      outfile,
      bundle: true,
      platform: "node",
      target: "node18",
      format: "cjs",
      sourcemap: false,
      minify: false,
      external: [],
    });

    console.log(`   Bundled: ${entryPoint} → ${outfile}`);
  }

  console.log("Vercel build complete!");
  console.log("Note: .ts source files kept intact for Vercel function detection.");
}

buildVercel().catch((err) => {
  console.error(err);
  process.exit(1);
});

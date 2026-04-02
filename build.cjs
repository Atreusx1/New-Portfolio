const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const glob = require("glob");
const zlib = require("zlib");
const { pipeline } = require("stream/promises");

// --- Paths ---
const ROOT = __dirname;
const DIST = path.join(ROOT, "dist");

// --- Logger ---
function log(msg) {
  console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

// --- Step 1: Build (safe for Vercel) ---
function build() {
  log("Building Vite app...");

  try {
    execSync("npx vite build", { stdio: "inherit" });
    log("Build complete ✅");
  } catch (err) {
    console.error("Build failed ❌");
    process.exit(1);
  }
}

// --- Step 2: Ensure dist exists ---
function ensureDist() {
  if (!fs.existsSync(DIST)) {
    console.error("dist folder not found ❌");
    process.exit(1);
  }
}

// --- Step 3: Compress ---
async function compress() {
  log("Compressing assets (brotli)...");

  const files = glob.sync("dist/**/*.{js,css,html,svg,json}", {
    absolute: true,
  });

  if (!files.length) {
    log("No files to compress ⚠");
    return;
  }

  await Promise.all(
    files.map(async (file) => {
      const output = file + ".br";

      try {
        const source = fs.createReadStream(file);
        const dest = fs.createWriteStream(output);

        const brotli = zlib.createBrotliCompress({
          params: {
            [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
          },
        });

        await pipeline(source, brotli, dest);

        log(`✔ ${path.basename(file)}`);
      } catch (err) {
        console.error(`✗ Failed: ${file}`);
      }
    }),
  );

  log("Compression done 🚀");
}

// --- Step 4: Report ---
function report(start) {
  const duration = ((Date.now() - start) / 1000).toFixed(2);

  const files = glob.sync("dist/**/*.{js,css}", { absolute: true });

  const stats = files.map((f) => ({
    file: path.basename(f),
    size: (fs.statSync(f).size / 1024).toFixed(2) + " KB",
  }));

  fs.writeFileSync(
    path.join(DIST, "report.json"),
    JSON.stringify({ duration, files: stats }, null, 2),
  );

  log("Report generated 📊");
}

// --- Main ---
(async () => {
  const start = Date.now();

  build(); // build once
  ensureDist(); // verify output
  await compress(); // optimize
  report(start); // summary

  log("Done 🎉");
})();

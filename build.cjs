const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const glob = require("glob");
const chalk = require("chalk");
const zlib = require("zlib");
const { pipeline } = require("stream/promises");

// --- Configuration ---
const PROJECT_ROOT = path.resolve(__dirname);
const BUILD_DIR = path.join(PROJECT_ROOT, "dist");
const ASSETS_DIR = path.join(BUILD_DIR, "assets");

// --- Logging ---
function log(message, type = "info") {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = `[${timestamp}]`;
  switch (type) {
    case "success":
      console.log(chalk.green(`${prefix} ✓ ${message}`));
      break;
    case "error":
      console.error(chalk.red(`${prefix} ✗ ${message}`));
      break;
    case "warn":
      console.warn(chalk.yellow(`${prefix} ⚠ ${message}`));
      break;
    default:
      console.log(chalk.blue(`${prefix} ℹ ${message}`));
  }
}

// --- Utilities ---
function runCommand(command) {
  try {
    log(`Running: ${command}`);
    execSync(command, { stdio: "inherit", cwd: PROJECT_ROOT });
    return true;
  } catch (error) {
    log(`Command failed: ${command}`, "error");
    return false;
  }
}

function findFiles(pattern, description) {
  log(`Searching for ${description} using pattern: ${pattern}`);
  try {
    const files = glob.sync(pattern, {
      cwd: BUILD_DIR,
      absolute: true,
      nodir: true,
    });
    log(`Found ${files.length} ${description}`);
    return files;
  } catch (err) {
    log(`Error finding files: ${err.message}`, "error");
    return [];
  }
}

function formatBytes(bytes) {
  if (!bytes) return "0 Bytes";
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

// --- Step 1: Build ---
function buildApp() {
  log("Starting Vite production build");
  process.env.NODE_ENV = "production";

  if (!runCommand("npm run build")) {
    log("Build failed", "error");
    process.exit(1);
  }

  log("Build completed successfully", "success");
}

// --- Step 2: Brotli Compression ---
async function compressAssets() {
  log("Starting Brotli compression");

  const patterns = [
    "assets/**/*.js",
    "assets/**/*.css",
    "*.html",
    "*.json",
    "*.svg",
  ];

  const files = patterns.flatMap((p) => findFiles(p, "assets"));

  if (files.length === 0) {
    log("No files found for compression", "warn");
    return;
  }

  let success = 0;

  await Promise.all(
    files.map(async (file) => {
      const output = `${file}.br`;

      try {
        const source = fs.createReadStream(file);
        const dest = fs.createWriteStream(output);

        const brotli = zlib.createBrotliCompress({
          params: {
            [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
          },
        });

        await pipeline(source, brotli, dest);

        const original = fs.statSync(file).size;
        const compressed = fs.statSync(output).size;

        log(
          `Compressed: ${path.basename(file)} (${formatBytes(original)} → ${formatBytes(compressed)})`,
          "success",
        );

        success++;
      } catch (err) {
        log(`Failed: ${file}`, "error");
      }
    }),
  );

  log(`Brotli compression done: ${success} files`, "success");
}

// --- Step 3: Report ---
function generateReport(startTime) {
  log("Generating optimization report");

  const jsFiles = findFiles("assets/**/*.js", "JS files");
  const cssFiles = findFiles("assets/**/*.css", "CSS files");

  const report = {
    date: new Date().toISOString(),
    duration: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
    js: jsFiles.map((f) => ({
      file: path.basename(f),
      size: formatBytes(fs.statSync(f).size),
    })),
    css: cssFiles.map((f) => ({
      file: path.basename(f),
      size: formatBytes(fs.statSync(f).size),
    })),
  };

  const reportPath = path.join(BUILD_DIR, "report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  log(`Report saved: dist/report.json`, "success");
}

// --- Main ---
async function run() {
  const start = Date.now();

  log(`Starting optimization in ${PROJECT_ROOT}`);
  log(`Node: ${process.version}`);

  buildApp();
  await compressAssets();
  generateReport(start);

  log("Build + optimization complete 🚀", "success");
}

run().catch((err) => {
  log(err.message, "error");
});

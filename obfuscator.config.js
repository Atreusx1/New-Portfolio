// obfuscator.config.js - Vercel Performance Focused
module.exports = {
  // --- Performance Critical ---
  // These often INCREASE size and runtime cost significantly. Disable for Vercel.
  controlFlowFlattening: false, // <-- DISABLED (Major performance killer)
  deadCodeInjection: false,     // <-- DISABLED (Increases size and runtime cost)

  // --- Basic Obfuscation & Size Reduction ---
  compact: true,                // Minifies code (like Uglify/Terser)
  simplify: true,               // Simplifies expressions

  stringArray: true,            // Collects strings into an array (basic obfuscation)
  stringArrayThreshold: 0.75,   // Only use string array if it helps (adjust if needed)
  stringArrayEncoding: ['base64'], // Encoding for string array (rc4 is slower)
  shuffleStringArray: true,     // Makes string array harder to read sequentially

  unicodeEscapeSequence: false, // Generally increases size, disable

  // --- Renaming (Use with Caution) ---
  // Can sometimes break code if not careful with globals/framework specifics.
  // Keep them simple if used.
  renameGlobals: false,         // <-- DISABLED (Safer)
  identifierNamesGenerator: 'hexadecimal', // Short names (mangled is shorter but less readable)
  // renameProperties: false, // <-- DISABLED (Can break things easily)

  // --- Other ---
  log: false,                   // Disable internal logging of the obfuscator tool
  disableConsoleOutput: false,  // Keep console logs working in production if needed for debugging
                                // Set to true to disable console.log etc. calls

  // Target browser environment (important for compatibility)
  target: 'browser',

  // Exclude source maps if GENERATE_SOURCEMAP was true (though we set it to false)
  sourceMap: false,
  // sourceMapMode: 'separate', // If sourceMap were true
};
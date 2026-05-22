#!/usr/bin/env node
/**
 * Build script: copies latest pipeline data from the source pipeline
 * into public/ for Vercel static deployment.
 *
 * Runs at: vercel build time (npm run build)
 * Also runs: locally to preview before deploy
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PIPELINE_DIR = path.join(__dirname, '..', '..', 'dashboard');

// Ensure public dirs exist
fs.mkdirSync(PUBLIC_DIR, { recursive: true });
fs.mkdirSync(path.join(PUBLIC_DIR, 'transcripts'), { recursive: true });

// Source files
const sources = [
  ['index.html', 'index.html'],
  ['transcripts_index.json', 'transcripts_index.json'],
];

let copied = 0;
for (const [src, dest] of sources) {
  const srcPath = path.join(PIPELINE_DIR, src);
  const destPath = path.join(PUBLIC_DIR, dest);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`✓ Copied ${src}`);
    copied++;
  } else {
    console.warn(`⚠ Missing: ${srcPath}`);
  }
}

// Copy all transcript JSON files
const transcriptsDir = path.join(PIPELINE_DIR, 'transcripts');
if (fs.existsSync(transcriptsDir)) {
  const files = fs.readdirSync(transcriptsDir).filter(f => f.endsWith('.json'));
  for (const f of files) {
    fs.copyFileSync(
      path.join(transcriptsDir, f),
      path.join(PUBLIC_DIR, 'transcripts', f)
    );
  }
  console.log(`✓ Copied ${files.length} transcript files`);
  copied += files.length;
} else {
  console.warn('⚠ Transcripts directory not found — skipping');
}

// Inject build metadata into index.html
const indexPath = path.join(PUBLIC_DIR, 'index.html');
if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf8');
  const buildDate = new Date().toISOString();
  // Update the "Last run" header text with build timestamp
  html = html.replace(
    /Last run: [^<"]+/,
    `Last run: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  );
  fs.writeFileSync(indexPath, html);
  console.log(`✓ Injected build date: ${buildDate}`);
}

console.log(`\nBuild complete: ${copied} files in public/`);

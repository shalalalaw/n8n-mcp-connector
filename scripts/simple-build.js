const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Simple build script that copies files and creates zip
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

// Create dist directory
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

console.log('Building extension...');

// Copy main extension file (no bundling needed for simple JS)
fs.copyFileSync(
  path.join(rootDir, 'src/extension.js'),
  path.join(distDir, 'extension.js')
);

// Copy manifest
fs.copyFileSync(
  path.join(rootDir, 'manifest.json'),
  path.join(distDir, 'manifest.json')
);

// Copy icon if exists
if (fs.existsSync(path.join(rootDir, 'icon.svg'))) {
  fs.copyFileSync(
    path.join(rootDir, 'icon.svg'),
    path.join(distDir, 'icon.svg')
  );
}

console.log('Build complete!');

// Package if requested
if (process.argv.includes('--package')) {
  console.log('Creating .dxt package...');
  
  const dxtPath = path.join(rootDir, 'n8n-mcp-connector.dxt');
  
  // Remove old package if exists
  if (fs.existsSync(dxtPath)) {
    fs.unlinkSync(dxtPath);
  }
  
  // Use system zip command (available on GitHub Actions Ubuntu runners)
  try {
    execSync(`cd ${distDir} && zip -r ${dxtPath} .`, {
      stdio: 'inherit'
    });
    console.log('Package created successfully!');
  } catch (error) {
    console.error('Packaging failed:', error);
    process.exit(1);
  }
}
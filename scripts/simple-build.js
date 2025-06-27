const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Simple build script that uses system zip command
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

// Create dist directory
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

console.log('Building extension...');

// Run esbuild
try {
  execSync(`npx esbuild ${path.join(rootDir, 'src/extension.js')} --bundle --outfile=${path.join(distDir, 'extension.js')} --format=esm --platform=neutral --external:@anthropic/claude-desktop-sdk --external:@anthropic/mcp-client --minify`, {
    stdio: 'inherit',
    cwd: rootDir
  });
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}

// Copy files
fs.copyFileSync(
  path.join(rootDir, 'manifest.json'),
  path.join(distDir, 'manifest.json')
);

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
import * as esbuild from 'esbuild';
import fs from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import { createWriteStream } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const shouldPackage = process.argv.includes('--package');

async function build() {
  console.log('🔨 Building extension...');
  
  await fs.mkdir(path.join(rootDir, 'dist'), { recursive: true });
  
  await esbuild.build({
    entryPoints: [path.join(rootDir, 'src/extension.js')],
    bundle: true,
    outfile: path.join(rootDir, 'dist/extension.js'),
    format: 'esm',
    platform: 'neutral',
    external: ['@anthropic/claude-desktop-sdk', '@anthropic/mcp-client'],
    minify: true,
  });
  
  await fs.copyFile(
    path.join(rootDir, 'manifest.json'),
    path.join(rootDir, 'dist/manifest.json')
  );
  
  try {
    await fs.copyFile(
      path.join(rootDir, 'icon.svg'),
      path.join(rootDir, 'dist/icon.svg')
    );
  } catch (err) {
    console.log('No icon.svg found');
  }
  
  console.log('✅ Build complete');
  
  if (shouldPackage) {
    await packageExtension();
  }
}

async function packageExtension() {
  console.log('📦 Creating .dxt file...');
  
  return new Promise((resolve, reject) => {
    const output = createWriteStream(path.join(rootDir, 'n8n-mcp-connector.dxt'));
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => {
      console.log('✅ Extension packaged: n8n-mcp-connector.dxt');
      resolve();
    });
    
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(path.join(rootDir, 'dist'), false);
    archive.finalize();
  });
}

build().catch(console.error);
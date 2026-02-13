import * as esbuild from 'esbuild'
import { copyFile, mkdir, readdir } from 'fs/promises'
import { join } from 'path'

// Build content script
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/content.js',
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
})

// Build popup script
await esbuild.build({
  entryPoints: ['src/popup/index.ts'],
  bundle: true,
  outfile: 'dist/popup/index.js',
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
})

// Copy popup assets
await mkdir('dist/popup', { recursive: true })
await copyFile('src/popup/index.html', 'dist/popup/index.html')
await copyFile('src/popup/index.css', 'dist/popup/index.css')

// Copy icons
await mkdir('dist/icons', { recursive: true })
const iconFiles = await readdir('assets/icons')
await Promise.all(
  iconFiles.map((file) =>
    copyFile(join('assets/icons', file), join('dist/icons', file)),
  ),
)

// Copy audios
await mkdir('dist/audios', { recursive: true })
const audioFiles = await readdir('assets/audios')
await Promise.all(
  audioFiles.map((file) =>
    copyFile(join('assets/audios', file), join('dist/audios', file)),
  ),
)

console.log('Build complete!')

import * as esbuild from 'esbuild'
import { copyFile, mkdir, readdir } from 'fs/promises'
import { join } from 'path'

const args = new Set(process.argv.slice(2))
const watchMode = args.has('--watch')
const debounceArg = [...args].find((arg) => arg.startsWith('--debounce='))
const debounceMs = debounceArg ? Number(debounceArg.split('=')[1]) : 2000

function isValidDebounce(value) {
  return Number.isFinite(value) && value >= 0
}

const colors = {
  blue: '\u001b[34m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  red: '\u001b[31m',
  reset: '\u001b[0m',
}

function logWithTimeColor(color, message) {
  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false })
  const prefix = `${colors[color] ?? ''}[${timestamp}]`
  const suffix = colors.reset
  console.log(`${prefix} ${message}${suffix}`)
}

async function runBuild() {
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
}

if (!watchMode) {
  await runBuild()
  logWithTimeColor('yellow', 'Build complete!')
  process.exit(0)
}

if (!isValidDebounce(debounceMs)) {
  throw new Error(`Invalid --debounce value: ${debounceArg}`)
}

const { default: chokidar } = await import('chokidar')

let timer = null
let inFlight = false
let pending = false

function scheduleBuild() {
  logWithTimeColor('green', 'Change detected')
  if (timer) clearTimeout(timer)
  timer = setTimeout(async () => {
    if (inFlight) {
      pending = true
      return
    }
    inFlight = true
    try {
      await runBuild()
      logWithTimeColor('yellow', 'Build complete!')
    } catch (error) {
      logWithTimeColor('red', 'Build failed')
      console.error(error)
    } finally {
      inFlight = false
      if (pending) {
        pending = false
        scheduleBuild()
      }
    }
  }, debounceMs)
}

const watcher = chokidar.watch(
  [
    'src/**/*',
    'assets/**/*',
    'manifest.json',
    'settings.defaults.json',
    'settings.json',
  ],
  { ignoreInitial: true },
)

watcher.on('all', () => {
  scheduleBuild()
})

logWithTimeColor('blue', `Dev mode on (debounce ${debounceMs}ms)`)

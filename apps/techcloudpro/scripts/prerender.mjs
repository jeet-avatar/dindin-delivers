import { execSync } from 'child_process'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = resolve(__dirname, '../dist')

const routes = [
  '/',
  '/services',
  '/services/ai',
  '/services/netsuite',
  '/services/cybersecurity',
  '/services/staffing',
  '/clients',
  '/case-studies',
  '/about',
  '/leadership',
  '/products',
  '/partners',
  '/careers',
  '/contact',
  '/privacy-policy',
  '/terms',
]

async function prerender() {
  // Dynamically import puppeteer
  let puppeteer
  try {
    puppeteer = (await import('puppeteer')).default
  } catch {
    try {
      puppeteer = (await import('puppeteer-core')).default
    } catch {
      console.error('Neither puppeteer nor puppeteer-core found. Install with: npm i -D puppeteer')
      process.exit(1)
    }
  }

  // Start a local server to serve the built files
  const { createServer } = await import('http')
  const { createReadStream } = await import('fs')
  const { lookup } = await import('mimetypes' in process ? 'mimetypes' : 'mime-types').catch(() => ({ lookup: () => 'text/html' }))

  // Use a simple static server via serve or http
  const port = 4173
  console.log(`Starting preview server on port ${port}...`)

  // Use vite preview in the background
  const { spawn } = await import('child_process')
  const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], {
    cwd: resolve(__dirname, '..'),
    stdio: 'pipe',
  })

  // Wait for server to be ready
  await new Promise((resolve) => {
    const check = async () => {
      try {
        const res = await fetch(`http://localhost:${port}/`)
        if (res.ok) return resolve()
      } catch {}
      setTimeout(check, 500)
    }
    setTimeout(check, 1000)
  })

  console.log('Server ready. Launching browser...')
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })

  let rendered = 0
  for (const route of routes) {
    const page = await browser.newPage()
    const url = `http://localhost:${port}${route}`
    console.log(`  Rendering ${route}...`)

    await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 })
    // Wait extra for React helmet to inject meta tags
    await page.waitForFunction(() => document.querySelector('meta[name="description"]'), { timeout: 5000 }).catch(() => {})

    let html = await page.content()

    // Clean up: remove scripts that reference localhost
    // Keep the original asset references
    await page.close()

    // Write to dist directory
    const filePath = route === '/'
      ? resolve(distDir, 'index.html')
      : resolve(distDir, `${route.slice(1)}/index.html`)

    const dir = dirname(filePath)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(filePath, html)
    rendered++
    console.log(`    ✓ ${filePath}`)
  }

  await browser.close()
  server.kill()
  console.log(`\nPre-rendered ${rendered}/${routes.length} pages`)
}

prerender().catch(err => {
  console.error('Pre-render failed:', err)
  process.exit(1)
})

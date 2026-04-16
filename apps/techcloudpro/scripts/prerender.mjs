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
  '/launchos',
  '/partners',
  '/careers',
  '/contact',
  '/privacy-policy',
  '/terms',
  '/blog',
  '/blog/private-llm-deployment-enterprise-guide',
  '/blog/netsuite-2026-1-release-guide',
  '/blog/ai-engineer-staffing-rates-2026',
  '/blog/netsuite-oneworld-implementation-checklist',
  '/blog/why-enterprise-ai-projects-fail',
  '/blog/cyberark-vs-delinea-vs-beyondtrust-pam-comparison',
  '/blog/netsuite-vs-sap-business-one-mid-market',
  '/blog/zero-trust-implementation-roadmap-mid-size',
  '/blog/ai-center-of-excellence-playbook',
  '/blog/contract-to-hire-vs-direct-placement-tech',
  '/blog/cloud-pam-aws-azure-setup-guide',
  '/blog/hire-netsuite-developer-guide',
  '/blog/identity-security-trends-2026',
  '/blog/staff-augmentation-vs-managed-services',
  '/blog/rag-vs-fine-tuning-enterprise-ai',
  '/blog/agentic-ai-enterprise-use-cases',
  '/blog/ai-governance-framework-eu-ai-act-2026',
  '/blog/netsuite-vs-sage-intacct-2026',
  '/blog/soc-2-compliance-checklist-2026',
  '/blog/enterprise-llm-cost-optimization',
  '/blog/netsuite-data-migration-checklist',
  '/blog/machine-identity-secrets-management-guide',
  '/blog/nearshore-vs-offshore-development-2026',
  '/blog/cybersecurity-salary-guide-2026',
  '/blog/incident-response-plan-template',
  '/blog/netsuite-for-manufacturing-guide',
  '/blog/build-remote-engineering-team-playbook',
  '/blog/tech-skills-gap-2026-report',
  '/blog/pam-implementation-best-practices-90-day',
  '/blog/netsuite-shopify-integration-guide',
  '/blog/netsuite-ai-mcp-setup-guide',
  '/blog/netsuite-for-saas-companies',
  '/blog/netsuite-suitecommerce-guide',
  '/blog/netsuite-analytics-warehouse-nsaw-guide',
  '/blog/netsuite-month-end-close-optimization',
  '/blog/netsuite-advanced-revenue-management-asc-606',
  '/blog/netsuite-cfo-guide-dashboards-kpis',
  '/blog/netsuite-wms-warehouse-management-guide',
  '/blog/netsuite-suitescript-ai-agents-guide',
  '/blog/netsuite-for-retail-omnichannel',
  '/blog/ai-in-financial-services-use-cases',
  '/blog/enterprise-conversational-ai-implementation',
  '/blog/ai-readiness-assessment-framework',
  '/blog/choose-ai-consulting-partner-guide',
  '/blog/generative-ai-use-cases-mid-market',
  '/blog/ai-data-governance-enterprise',
  '/blog/multimodal-ai-enterprise-guide',
  '/blog/ai-in-healthcare-enterprise',
  '/blog/netsuite-implementation-cost-guide-2026',
  '/blog/netsuite-vs-quickbooks-enterprise-comparison',
  '/blog/netsuite-cpq-configure-price-quote-guide',
  '/blog/netsuite-for-nonprofits-guide',
  '/blog/netsuite-openair-psa-professional-services-guide',
  '/blog/ai-supply-chain-optimization-guide',
  '/blog/cmmc-2-compliance-guide-defense-contractors',
  '/blog/enterprise-ai-model-selection-guide-2026',
  '/blog/it-consulting-rates-2026-guide',
  '/blog/cloud-security-posture-management-cspm-guide',
  '/blog/prompt-engineering-enterprise-guide',
  '/blog/when-to-upgrade-quickbooks-to-netsuite',
  '/blog/netsuite-implementation-timeline-guide',
  '/blog/pam-vs-iam-vs-iga-enterprise-guide',
  '/blog/enterprise-ai-roi-measurement-framework',
  '/blog/siem-vs-xdr-enterprise-security-guide',
  '/blog/ai-agents-vs-chatbots-enterprise-guide',
  '/blog/dora-nis2-compliance-guide-us-companies',
  '/blog/netsuite-vs-dynamics-365-comparison-2026',
  '/blog/prevent-ai-hallucinations-enterprise-guide',
  '/blog/staff-augmentation-vs-full-time-hiring-guide',
  '/blog/netsuite-implementation-mistakes-guide',
  '/blog/enterprise-cybersecurity-risk-assessment-guide',
  '/blog/enterprise-ai-agent-cost-guide-2026',
  '/blog/hardest-it-roles-to-hire-2026-guide',
  '/blog/how-to-choose-netsuite-implementation-partner',
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

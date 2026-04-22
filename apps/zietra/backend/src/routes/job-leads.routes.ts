// File: backend/src/routes/job-leads.routes.ts
// Job Leads Pipeline — fetch from Remotive API, classify by stream, import to CRM

import express from 'express';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticate);

// ============================================
// DOMAIN FROM COMPANY NAME
// "Coalition Technologies" -> "coalitiontechnologies.com"
// "A.Team" -> "ateam.com"
// "Credit Wellness, LLC" -> "creditwellness.com"
// NOTE: We derive domain from company NAME, not the job URL.
// The job URL always points to remotive.com, not the actual company.
// ============================================
function companyToDomain(companyName: string): string {
  if (!companyName) return '';
  return companyName
    .toLowerCase()
    .replace(/[,.].*$/, '')           // strip suffix after comma/dot (e.g. ", LLC")
    .replace(/[^a-z0-9\s]/g, '')     // remove special chars
    .replace(/\s+/g, '')             // collapse spaces
    .trim() + '.com';
}

// Jobs open to India placements: Worldwide, India, Global, Anywhere, Asia/APAC, or unrestricted
function isOpenToIndia(location: string): boolean {
  if (!location || location.trim() === '') return true;
  const loc = location.toLowerCase();
  return loc.includes('india') || loc.includes('worldwide') || loc.includes('global') ||
    loc.includes('anywhere') || loc.includes('remote') || loc.includes('asia') || loc.includes('apac');
}

// ============================================
// STREAM CLASSIFICATION — All major technology hiring streams
// ============================================
function classifyStream(title: string, description: string): string {
  const text = `${title} ${description}`.toLowerCase();

  // Enterprise / ERP
  if (/erp|oracle erp|erp administrator|erp developer/.test(text)) return 'ERP';
  if (/\berp\b|sap\b|dynamics 365|workday|oracle erp/.test(text)) return 'Enterprise/ERP';

  // AI / ML / Data Science
  if (/\bai\b|artificial intelligence|machine learning|\bml\b|deep learning|nlp|computer vision|llm|genai|generative ai|data scien|tensorflow|pytorch|hugging face/.test(text)) return 'AI/ML';

  // Cloud & Infrastructure
  if (/\baws\b|amazon web services|\bazure\b|google cloud|\bgcp\b|cloud architect|cloud engineer|devops|sre\b|site reliability|kubernetes|\bk8s\b|terraform|docker|infrastructure/.test(text)) return 'Cloud/DevOps';

  // Cybersecurity
  if (/cybersecurity|cyber security|security analyst|soc analyst|siem|penetration test|infosec|security engineer|threat|vulnerability|devsecops|compliance/.test(text)) return 'Cybersecurity';

  // Full-Stack / Web Development
  if (/full.?stack|frontend|front.?end|backend|back.?end|\breact\b|\bangular\b|\bvue\b|next\.?js|node\.?js|\.net|django|rails|laravel|spring boot/.test(text)) return 'Full-Stack';

  // Data Engineering & Analytics
  if (/data engineer|data analyst|analytics|power bi|tableau|\bsql\b|snowflake|databricks|spark|airflow|\betl\b|data warehouse|business intelligence|\bbi\b/.test(text)) return 'Data/Analytics';

  // Mobile Development
  if (/\bios\b|android|swift|kotlin|react native|flutter|mobile developer|mobile engineer/.test(text)) return 'Mobile';

  // Blockchain / Web3
  if (/blockchain|web3|solidity|smart contract|crypto|defi|nft|ethereum|solana/.test(text)) return 'Web3';

  // Product / Design / UX
  if (/product manager|product owner|ux designer|ui designer|product design|user experience|figma/.test(text)) return 'Product/Design';

  // Staffing / HR
  if (/recruiter|talent acquisition|hr manager|human resources|staffing|people operations/.test(text)) return 'Staffing/HR';

  // QA / Testing
  if (/\bqa\b|quality assurance|test engineer|automation test|selenium|cypress|playwright/.test(text)) return 'QA/Testing';

  return 'Other';
}

// ============================================
// In-memory cache — refreshes every 4 hours
// ============================================
let cachedLeads: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours (was 24h — too stale)

function isCacheValid(): boolean {
  return cachedLeads !== null && (Date.now() - cacheTimestamp) < CACHE_TTL_MS;
}

// ============================================
// MULTI-SOURCE JOB FETCHERS
// ============================================
const HEADERS = {
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (compatible; Zietra-CRM/1.0)',
};

// Source 1: Remotive — fetch ALL categories for maximum coverage
const REMOTIVE_CATEGORIES = [
  'software-dev', 'devops-sysadmin', 'data', 'product', 'design',
  'customer-support', 'marketing', 'sales', 'business', 'finance-legal',
  'hr', 'qa', 'writing', 'all-others'
];

async function fetchRemotiveJobs(): Promise<any[]> {
  const allJobs: any[] = [];
  const seenIds = new Set<number>();

  // Fetch all categories in parallel
  const results = await Promise.allSettled(
    REMOTIVE_CATEGORIES.map(cat =>
      axios.get(`https://remotive.com/api/remote-jobs?category=${cat}&limit=50`, {
        timeout: 15000, headers: HEADERS,
      }).then(r => r.data?.jobs || [])
    )
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      for (const job of result.value) {
        if (!seenIds.has(job.id)) {
          seenIds.add(job.id);
          const domain = companyToDomain(job.company_name);
          allJobs.push({
            id: job.id,
            title: job.title,
            companyName: job.company_name,
            companyLogo: job.company_logo || job.company_logo_url || null,
            url: job.url,
            location: job.candidate_required_location || 'Worldwide',
            postedAt: job.publication_date,
            stream: classifyStream(job.title || '', job.description || ''),
            tags: job.tags || [],
            source: 'Remotive',
            companyDomain: domain,
            companyEmail: domain ? `hr@${domain}` : '',
            emailCandidates: domain ? [`hr@${domain}`, `careers@${domain}`, `jobs@${domain}`] : [],
          });
        }
      }
    }
  }
  return allJobs;
}

// Source 2: Jobicy — fresh daily remote tech jobs
async function fetchJobicyJobs(): Promise<any[]> {
  try {
    const response = await axios.get('https://jobicy.com/api/v2/remote-jobs?count=50', {
      timeout: 15000, headers: HEADERS,
    });
    const jobs = response.data?.jobs || [];
    return jobs.map((job: any) => {
      const domain = companyToDomain(job.companyName);
      return {
        id: `jobicy-${job.id || Math.random().toString(36).slice(2)}`,
        title: job.jobTitle,
        companyName: job.companyName,
        companyLogo: job.companyLogo || null,
        url: job.url,
        location: job.jobGeo || 'Remote',
        postedAt: job.pubDate,
        stream: classifyStream(job.jobTitle || '', job.jobExcerpt || ''),
        tags: [job.jobIndustry, job.jobType].filter(Boolean),
        source: 'Jobicy',
        companyDomain: domain,
        companyEmail: domain ? `hr@${domain}` : '',
        emailCandidates: domain ? [`hr@${domain}`, `careers@${domain}`, `jobs@${domain}`] : [],
      };
    });
  } catch (err: any) {
    console.error('Jobicy fetch error:', err.message);
    return [];
  }
}

// Source 3: Arbeitnow — large volume remote job board
async function fetchArbeitnowJobs(): Promise<any[]> {
  try {
    const response = await axios.get('https://www.arbeitnow.com/api/job-board-api', {
      timeout: 15000, headers: HEADERS,
    });
    const jobs = response.data?.data || [];
    return jobs.slice(0, 100).map((job: any) => {
      const domain = companyToDomain(job.company_name);
      return {
        id: `arbeitnow-${job.slug || Math.random().toString(36).slice(2)}`,
        title: job.title,
        companyName: job.company_name,
        companyLogo: null,
        url: job.url,
        location: job.location || 'Remote',
        postedAt: job.created_at ? new Date(job.created_at * 1000).toISOString() : new Date().toISOString(),
        stream: classifyStream(job.title || '', job.description || ''),
        tags: job.tags || [],
        source: 'Arbeitnow',
        companyDomain: domain,
        companyEmail: domain ? `hr@${domain}` : '',
        emailCandidates: domain ? [`hr@${domain}`, `careers@${domain}`, `jobs@${domain}`] : [],
      };
    });
  } catch (err: any) {
    console.error('Arbeitnow fetch error:', err.message);
    return [];
  }
}

// Source 4: LinkedIn Jobs via ScraperAPI (scraperapi.com)
// Scrapes LinkedIn job search pages using ScraperAPI proxy to avoid blocks
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY || '39de9109a89a40ae9e9f942d6a8a487f';
const SCRAPER_API_BASE = 'https://api.scraperapi.com';

// LinkedIn job search keywords to scrape (staffing-focused)
const LINKEDIN_SEARCH_QUERIES = [
  'software engineer remote',
  'AI machine learning engineer',
  'cloud architect AWS Azure',
  'cybersecurity analyst',
  'data engineer',
  'devops engineer kubernetes',
  'full stack developer react',
  'SAP consultant',
  'salesforce developer',
];

async function fetchLinkedInJobs(): Promise<any[]> {
  if (!SCRAPER_API_KEY) return [];

  const allJobs: any[] = [];

  // Scrape LinkedIn job search for top 3 queries (to stay within rate limits)
  const queriesToFetch = LINKEDIN_SEARCH_QUERIES.slice(0, 3);

  const results = await Promise.allSettled(
    queriesToFetch.map(async (query) => {
      try {
        const linkedinUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}&f_TPR=r86400&position=1&pageNum=0`;

        const response = await axios.get(SCRAPER_API_BASE, {
          params: {
            api_key: SCRAPER_API_KEY,
            url: linkedinUrl,
            render: 'false',
          },
          timeout: 30000,
          headers: HEADERS,
        });

        const html = response.data;
        if (typeof html !== 'string') return [];

        // Parse LinkedIn job cards from HTML
        const jobs: any[] = [];
        // LinkedIn job cards have data in <div class="base-card"> or <li> elements
        // Extract using regex patterns (lightweight, no cheerio dependency needed here)
        const cardPattern = /<div[^>]*class="[^"]*base-card[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g;
        const titlePattern = /<span[^>]*class="[^"]*sr-only[^"]*"[^>]*>([\s\S]*?)<\/span>/;
        const companyPattern = /<h4[^>]*class="[^"]*base-search-card__subtitle[^"]*"[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>/;
        const locationPattern = /<span[^>]*class="[^"]*job-search-card__location[^"]*"[^>]*>([\s\S]*?)<\/span>/;
        const linkPattern = /<a[^>]*class="[^"]*base-card__full-link[^"]*"[^>]*href="([^"]*)"[^>]*>/;
        const timePattern = /<time[^>]*datetime="([^"]*)"[^>]*>/;

        // Alternative: extract from JSON-LD if present
        const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g);
        if (jsonLdMatch) {
          for (const match of jsonLdMatch) {
            try {
              const jsonStr = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '').trim();
              const data = JSON.parse(jsonStr);
              if (data['@type'] === 'ItemList' && data.itemListElement) {
                for (const item of data.itemListElement) {
                  const job = item.item || item;
                  if (job.title && job.hiringOrganization) {
                    const companyName = job.hiringOrganization?.name || '';
                    const domain = companyToDomain(companyName);
                    jobs.push({
                      id: `linkedin-${job.identifier?.value || Math.random().toString(36).slice(2)}`,
                      title: job.title,
                      companyName,
                      companyLogo: job.hiringOrganization?.logo || null,
                      url: job.url || '',
                      location: job.jobLocation?.address?.addressLocality || job.jobLocationType || 'Remote',
                      postedAt: job.datePosted || new Date().toISOString(),
                      stream: classifyStream(job.title || '', job.description || query),
                      tags: ['LinkedIn'],
                      source: 'LinkedIn',
                      companyDomain: domain,
                      companyEmail: domain ? `hr@${domain}` : '',
                      emailCandidates: domain ? [`hr@${domain}`, `careers@${domain}`, `jobs@${domain}`] : [],
                    });
                  }
                }
              }
            } catch {
              // JSON parse failed, continue
            }
          }
        }

        // Fallback: parse HTML cards if JSON-LD didn't yield results
        if (jobs.length === 0) {
          const cards = html.match(cardPattern) || [];
          for (const card of cards.slice(0, 25)) {
            const titleMatch = card.match(titlePattern);
            const companyMatch = card.match(companyPattern);
            const locationMatch = card.match(locationPattern);
            const linkMatch = card.match(linkPattern);
            const timeMatch = card.match(timePattern);

            if (titleMatch) {
              const title = titleMatch[1].trim();
              const companyName = companyMatch ? companyMatch[1].trim() : '';
              const domain = companyToDomain(companyName);
              jobs.push({
                id: `linkedin-${Math.random().toString(36).slice(2)}`,
                title,
                companyName,
                companyLogo: null,
                url: linkMatch ? linkMatch[1].split('?')[0] : '',
                location: locationMatch ? locationMatch[1].trim() : 'Remote',
                postedAt: timeMatch ? timeMatch[1] : new Date().toISOString(),
                stream: classifyStream(title, query),
                tags: ['LinkedIn'],
                source: 'LinkedIn',
                companyDomain: domain,
                companyEmail: domain ? `hr@${domain}` : '',
                emailCandidates: domain ? [`hr@${domain}`, `careers@${domain}`, `jobs@${domain}`] : [],
              });
            }
          }
        }

        console.log(`LinkedIn scrape [${query}]: ${jobs.length} jobs`);
        return jobs;
      } catch (err: any) {
        console.error(`LinkedIn scrape error [${query}]:`, err.message);
        return [];
      }
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allJobs.push(...result.value);
    }
  }

  console.log(`LinkedIn total: ${allJobs.length} jobs from ${queriesToFetch.length} queries`);
  return allJobs;
}

// ============================================
// GET /api/job-leads/fetch
// Aggregates jobs from multiple sources: Remotive, Jobicy, Arbeitnow, LinkedIn
// ============================================
router.get('/fetch', async (req, res) => {
  try {
    const { stream, refresh } = req.query as { stream?: string; refresh?: string };

    // Use cache if valid and no forced refresh
    if (isCacheValid() && refresh !== 'true') {
      const leads = cachedLeads!;
      const streams: Record<string, number> = {};
      for (const lead of leads) {
        streams[lead.stream] = (streams[lead.stream] || 0) + 1;
      }
      const filtered = stream ? leads.filter((l: any) => l.stream === stream) : leads;
      return res.json({
        leads: filtered,
        total: filtered.length,
        streams,
        totalFetched: leads.length,
        cached: true,
        cacheAge: Math.round((Date.now() - cacheTimestamp) / 60000) + ' minutes',
      });
    }

    // Fetch from ALL sources in parallel
    const [remotiveJobs, jobicyJobs, arbeitnowJobs, linkedinJobs] = await Promise.all([
      fetchRemotiveJobs(),
      fetchJobicyJobs(),
      fetchArbeitnowJobs(),
      fetchLinkedInJobs(),
    ]);

    // Merge and deduplicate by title+company
    const seen = new Set<string>();
    const leads: any[] = [];
    for (const job of [...jobicyJobs, ...linkedinJobs, ...remotiveJobs, ...arbeitnowJobs]) {
      const key = `${job.title?.toLowerCase().trim()}|${job.companyName?.toLowerCase().trim()}`;
      if (!seen.has(key)) {
        seen.add(key);
        leads.push(job);
      }
    }

    // Sort by date (newest first)
    leads.sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());

    // Cache the results
    cachedLeads = leads;
    cacheTimestamp = Date.now();

    // Count by stream
    const streams: Record<string, number> = {};
    for (const lead of leads) {
      streams[lead.stream] = (streams[lead.stream] || 0) + 1;
    }

    // Filter by stream if query param provided
    const filtered = stream ? leads.filter((l: any) => l.stream === stream) : leads;

    // Count sources
    const sources: Record<string, number> = {};
    for (const lead of leads) {
      sources[lead.source] = (sources[lead.source] || 0) + 1;
    }

    return res.json({ leads: filtered, total: filtered.length, streams, sources, totalFetched: leads.length, cached: false });
  } catch (error: any) {
    console.error('Job leads fetch error:', error.message);
    return res.json({ leads: [], total: 0, streams: {}, error: 'Failed to fetch from job board' });
  }
});

// ============================================
// POST /api/job-leads/import
// Import selected leads as Company + Contact records
// ============================================
router.post('/import', async (req, res) => {
  try {
    const { leads } = req.body as {
      leads: Array<{
        id?: number;
        companyName: string;
        url: string;
        stream: string;
        title: string;
        location: string;
        companyEmail?: string;
        companyDomain?: string;
      }>;
    };
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ error: 'No leads provided' });
    }

    const importedCompanyIds: string[] = [];
    let importedCount = 0;

    for (const lead of leads) {
      try {
        // Find or create Company (by name scoped to user)
        let company = await prisma.company.findFirst({
          where: { name: lead.companyName, userId },
        });

        if (!company) {
          company = await prisma.company.create({
            data: {
              name: lead.companyName,
              website: lead.companyDomain ? `https://${lead.companyDomain}` : lead.url || '',
              industry: lead.stream,
              tags: [lead.stream, 'job-lead'],
              dataSource: 'job_board',
              userId,
            },
          });
        }

        importedCompanyIds.push(company.id);

        // Create Contact linked to the Company
        await prisma.contact.create({
          data: {
            firstName: 'Hiring',
            lastName: 'Manager',
            email: lead.companyEmail || undefined,
            title: lead.title,
            source: 'job_board',
            notes: `Job posting: ${lead.url}\nStream: ${lead.stream}\nLocation: ${lead.location}`,
            status: 'LEAD',
            companyId: company.id,
            userId,
          },
        });

        importedCount++;
      } catch (leadError: any) {
        console.error(`Failed to import lead for ${lead.companyName}:`, leadError.message);
      }
    }

    return res.json({ imported: importedCount, companies: importedCompanyIds });
  } catch (error: any) {
    console.error('Job leads import error:', error.message);
    return res.status(500).json({ error: 'Failed to import leads', details: error.message });
  }
});

export default router;

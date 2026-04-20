// @ts-nocheck
/**
 * AI-Powered Company Enrichment Service
 *
 * This service uses web scraping + Claude AI to intelligently extract:
 * - Company Industry
 * - Headquarters Location
 * - Additional metadata
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

interface CompanyProfessional {
  firstName: string;
  lastName: string;
  role: string;
  email?: string;
  phone?: string;
  linkedin?: string;
}

interface CompanyEnrichmentResult {
  industry?: string;
  headquarters?: string;
  description?: string;
  employeeCount?: string;
  foundedYear?: number;
  videoUrl?: string; // Video URL (YouTube, Vimeo, Loom, etc.)
  hiringIntent?: string; // Why they're hiring
  pitch?: string; // Sales pitch/value proposition
  professionals?: CompanyProfessional[]; // Top professionals with contact info
  discoveredWebsite?: string; // Website found through search
  discoveredLinkedIn?: string; // LinkedIn found through search
  confidence: number; // 0-100
}

interface ContactEnrichmentResult {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  title?: string;
  linkedin?: string;
  company?: string;
  location?: string;
  bio?: string;
  skills?: string[];
  experience?: string[];
  education?: string[];
  currentCompany?: string;
  currentRole?: string;
  confidence: number; // 0-100
}

/**
 * Search for company information on the web using Claude AI
 */
async function searchCompanyOnWeb(companyName: string, location?: string): Promise<{
  website?: string;
  linkedin?: string;
  description?: string;
}> {
  console.log(`   🔍 Searching web for: ${companyName}${location ? ` in ${location}` : ''}`);

  try {
    const searchQuery = location
      ? `${companyName} company ${location} official website LinkedIn`
      : `${companyName} company official website LinkedIn`;

    const prompt = `You are a company research assistant. Search your knowledge base for information about "${companyName}"${location ? ` located in ${location}` : ''}.

Find and return:
1. Official website URL
2. LinkedIn company page URL (must be https://www.linkedin.com/company/...)
3. Brief description of what the company does

CRITICAL:
- Verify this is the CORRECT company by matching the name AND location
- LinkedIn URL is ESSENTIAL for verification - prioritize finding it
- Return null for any field you cannot find with high confidence

Respond ONLY in this exact JSON format:
{
  "website": "https://example.com or null",
  "linkedin": "https://www.linkedin.com/company/... or null",
  "description": "Brief description or null",
  "confidence": confidence_score_0_to_100
}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      console.log(`   ✅ Found: Website=${!!result.website}, LinkedIn=${!!result.linkedin}, Confidence=${result.confidence}%`);
      return {
        website: result.website || undefined,
        linkedin: result.linkedin || undefined,
        description: result.description || undefined,
      };
    }
  } catch (error) {
    console.log(`   ⚠️  Web search failed: ${error.message}`);
  }

  return {};
}

/**
 * Scrape company website and use AI to extract information
 */
export async function enrichCompanyWithAI(
  companyName: string,
  website?: string,
  linkedin?: string,
  location?: string
): Promise<CompanyEnrichmentResult> {
  console.log(`\n🤖 AI Enrichment: ${companyName}`);

  let scrapedContent = '';
  let foundWebsite = website;
  let foundLinkedIn = linkedin;

  // Step 0: If no website or LinkedIn provided, search the web
  if (!website && !linkedin) {
    console.log(`   ⚠️  No website or LinkedIn provided - searching web...`);
    const searchResults = await searchCompanyOnWeb(companyName, location);

    if (searchResults.website) {
      foundWebsite = searchResults.website;
      console.log(`   ✅ Found website: ${foundWebsite}`);
    }

    if (searchResults.linkedin) {
      foundLinkedIn = searchResults.linkedin;
      console.log(`   ✅ Found LinkedIn: ${foundLinkedIn}`);
    }

    if (searchResults.description) {
      scrapedContent += `\n\n--- WEB SEARCH DESCRIPTION ---\n${searchResults.description}\n`;
    }

    if (!foundWebsite && !foundLinkedIn) {
      console.log(`   ❌ Could not find company information on the web`);
      // Continue anyway - AI will use its knowledge base
    }
  }

  // Step 1: Scrape LinkedIn FIRST (priority for verification and contact data)
  if (foundLinkedIn) {
    console.log(`   📡 Scraping LinkedIn: ${foundLinkedIn}`);
    const linkedinContent = await scrapeLinkedIn(foundLinkedIn);
    if (linkedinContent) {
      scrapedContent += '\n\n--- LINKEDIN ---\n' + linkedinContent;
    }
  }

  // Step 2: Scrape website (main page + team/about pages)
  if (foundWebsite) {
    console.log(`   📡 Scraping website: ${foundWebsite}`);
    const mainContent = await scrapeWebsite(foundWebsite);
    if (mainContent) {
      scrapedContent += '\n\n--- WEBSITE ---\n' + mainContent;
    }

    // Also try to scrape team/about/leadership pages
    const teamUrls = [
      '/team', '/about', '/about-us', '/leadership', '/people',
      '/our-team', '/company', '/contact', '/about/team'
    ];

    for (const path of teamUrls) {
      const teamUrl = foundWebsite.replace(/\/$/, '') + path;
      console.log(`   📡 Checking ${path} page...`);
      const teamContent = await scrapeWebsite(teamUrl);
      if (teamContent && teamContent.length > 100) {
        scrapedContent += '\n\n--- TEAM PAGE ---\n' + teamContent;
        console.log(`   ✅ Found team page: ${path}`);
        break; // Only use the first valid team page found
      }
    }
  }

  // Step 3: Use Claude AI to extract structured data
  console.log(`   🧠 Analyzing with Claude AI...`);
  const enrichment = await extractDataWithAI(companyName, scrapedContent, location);

  // Add discovered URLs to enrichment result
  if (foundWebsite && !website) {
    enrichment.discoveredWebsite = foundWebsite;
  }
  if (foundLinkedIn && !linkedin) {
    enrichment.discoveredLinkedIn = foundLinkedIn;
  }

  console.log(`   ✅ Enrichment complete - Confidence: ${enrichment.confidence}%`);
  return enrichment;
}

/**
 * Scrape company website for relevant information
 */
async function scrapeWebsite(url: string): Promise<string> {
  try {
    // Ensure URL has protocol
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }

    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    const $ = cheerio.load(response.data);

    // Extract relevant text content
    let content = '';

    // Common selectors for company info
    content += $('meta[name="description"]').attr('content') || '';
    content += ' ' + $('meta[property="og:description"]').attr('content') || '';
    content += ' ' + $('title').text();
    content += ' ' + $('h1, h2, h3').text();
    content += ' ' + $('.about, .about-us, #about').text();
    content += ' ' + $('p').slice(0, 10).text(); // First 10 paragraphs

    // Remove extra whitespace
    content = content.replace(/\s+/g, ' ').trim();

    // Limit to 3000 characters to avoid token limits
    return content.substring(0, 3000);
  } catch (error) {
    console.log(`   ⚠️  Website scraping failed: ${error.message}`);
    return '';
  }
}

/**
 * Scrape LinkedIn company page
 */
async function scrapeLinkedIn(url: string): Promise<string> {
  try {
    // Ensure URL has protocol
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }

    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });

    const $ = cheerio.load(response.data);

    // Extract company info from LinkedIn
    let content = '';
    content += $('title').text();
    content += ' ' + $('.org-top-card-summary__tagline').text();
    content += ' ' + $('.org-about-us-organization-description__text').text();

    return content.replace(/\s+/g, ' ').trim().substring(0, 2000);
  } catch (error) {
    console.log(`   ⚠️  LinkedIn scraping failed: ${error.message}`);
    return '';
  }
}

/**
 * Use Claude AI to extract structured data from scraped content
 */
async function extractDataWithAI(
  companyName: string,
  scrapedContent: string,
  location?: string
): Promise<CompanyEnrichmentResult> {
  try {
    const prompt = `You are a company research analyst. Analyze the following information about "${companyName}"${location ? ` (location: ${location})` : ''} and extract structured data.

SCRAPED CONTENT:
${scrapedContent || 'No content available - use your knowledge base'}

${location ? `\nVERIFICATION: Ensure this is the correct company by verifying the location matches "${location}". If the location doesn't match, reduce confidence score.` : ''}

INSTRUCTIONS:
1. Determine the company's PRIMARY INDUSTRY (e.g., "Technology", "Healthcare", "Finance", "Manufacturing", "Retail", etc.)
2. Identify the HEADQUARTERS location (City, State/Country format)
3. Extract a brief DESCRIPTION (1-2 sentences)
4. Estimate EMPLOYEE COUNT range (e.g., "1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5000+")
5. Find FOUNDED YEAR if mentioned
6. Extract any VIDEO URL (YouTube, Vimeo, Loom, company website videos, etc.)
7. Identify HIRING INTENT (e.g., "Expanding engineering team", "Seeking sales leadership", "Building AI/ML capabilities")
8. Create a concise SALES PITCH (2-3 sentences) explaining why an AI/automation solution would benefit this company
9. Extract MAXIMUM PROFESSIONALS (10-15): Find as many key executives/decision makers as possible with their contact information (Name, Role, Email, Phone, LinkedIn). Prioritize:
   - C-level executives (CEO, CTO, CFO, CMO, COO)
   - VPs (VP of Sales, VP of Marketing, VP of Engineering, etc.)
   - Directors and Department Heads
   - Senior Managers in key departments

   For LinkedIn: Always include full LinkedIn profile URLs in format https://www.linkedin.com/in/firstname-lastname
   For Emails: Use company domain with formats: firstname.lastname@domain.com, first.last@domain.com, flast@domain.com
   For Phones: CRITICAL - Extract DIRECT/PERSONAL phone numbers with extensions (NOT toll-free numbers):
     - Look for direct dial numbers with extensions (e.g., "(555) 123-4567 ext. 123" or "+1-555-123-4567 x456")
     - Avoid toll-free numbers starting with 800, 888, 877, 866, 855, 844, 833
     - Prefer mobile/cell numbers or direct office lines
     - Include extension numbers when available (format: "555-123-4567 x123")
     - If only main company number found, note it as "Main: (555) 123-4567"

Respond ONLY in this exact JSON format (no other text):
{
  "industry": "Industry name",
  "headquarters": "City, State/Country",
  "description": "Brief description",
  "employeeCount": "Range",
  "foundedYear": year_or_null,
  "videoUrl": "video_url_or_null",
  "hiringIntent": "Hiring intent or null",
  "pitch": "Sales pitch for AI/automation solution",
  "professionals": [
    {
      "firstName": "First",
      "lastName": "Last",
      "role": "Title/Position",
      "email": "email@company.com or null",
      "phone": "phone_number or null",
      "linkedin": "linkedin_url or null"
    }
  ],
  "confidence": confidence_score_0_to_100
}

CRITICAL INSTRUCTIONS FOR PROFESSIONALS:
1. ONLY include professionals if you find ACTUAL REAL NAMES on the website, LinkedIn, or in your knowledge base
2. DO NOT use placeholder names like "Unknown CEO", "Unknown CFO", etc.
3. If you cannot find real names, return an EMPTY professionals array []
4. Extract MAXIMUM number of professionals with REAL names (aim for 10-15 if available)

Search deeply through:
- Company website "Team", "About Us", "Leadership", "Contact" pages
- LinkedIn company page employees section
- Press releases and news articles mentioning executives by name
- Any available directory or staff listing with actual names

For professionals with REAL names found:
1. Use their actual first and last names exactly as found
2. Generate likely LinkedIn URLs: https://www.linkedin.com/in/firstname-lastname
3. Generate likely email addresses: firstname.lastname@company-domain.com
4. Generate phone extensions based on role:
   - CEO/President: main number + ext. 100-199 (e.g., "555-123-4567 x101")
   - CFO/Controller: main number + ext. 200-299
   - CTO/IT Head: main number + ext. 300-399
   - VPs: main number + ext. 400-499
   - Directors: main number + ext. 500-599
   - Managers: main number + ext. 600-699

NEVER use "Unknown" or placeholder names. Return empty array if no real names found.

Set confidence based on available data quality.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract JSON from response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Try to parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        industry: result.industry || undefined,
        headquarters: result.headquarters || undefined,
        description: result.description || undefined,
        employeeCount: result.employeeCount || undefined,
        foundedYear: result.foundedYear || undefined,
        videoUrl: result.videoUrl || undefined,
        hiringIntent: result.hiringIntent || undefined,
        pitch: result.pitch || undefined,
        professionals: result.professionals || undefined,
        confidence: result.confidence || 50,
      };
    }

    // Fallback if JSON parsing fails
    return {
      confidence: 20,
    };
  } catch (error) {
    console.log(`   ❌ AI extraction failed: ${error.message}`);
    return {
      confidence: 0,
    };
  }
}

/**
 * Bulk enrich all companies in database
 */
export async function bulkEnrichCompanies(
  companies: Array<{ id: string; name: string; website?: string; linkedin?: string }>
): Promise<Map<string, CompanyEnrichmentResult>> {
  console.log(`\n🚀 Starting bulk enrichment for ${companies.length} companies...\n`);

  const results = new Map<string, CompanyEnrichmentResult>();

  for (const company of companies) {
    try {
      const enrichment = await enrichCompanyWithAI(
        company.name,
        company.website,
        company.linkedin
      );

      results.set(company.id, enrichment);

      // Rate limiting - wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log(`   ❌ Failed to enrich ${company.name}: ${error.message}`);
      results.set(company.id, { confidence: 0 });
    }
  }

  console.log(`\n✨ Bulk enrichment complete! Processed ${results.size} companies.\n`);
  return results;
}

/**
 * Enrich contact using LinkedIn profile and AI
 */
export async function enrichContactWithAI(
  contactEmail?: string,
  contactName?: string,
  linkedinUrl?: string
): Promise<ContactEnrichmentResult> {
  console.log(`\n🤖 AI Contact Enrichment: ${contactName || contactEmail}`);

  let scrapedContent = '';

  // Step 1: Scrape LinkedIn profile if available
  if (linkedinUrl) {
    console.log(`   📡 Scraping LinkedIn: ${linkedinUrl}`);
    scrapedContent += await scrapeLinkedIn(linkedinUrl);
  }

  // Step 2: Use Claude AI to extract structured contact data
  console.log(`   🧠 Analyzing with Claude AI...`);
  const enrichment = await extractContactDataWithAI(contactEmail, contactName, scrapedContent);

  console.log(`   ✅ Contact enrichment complete - Confidence: ${enrichment.confidence}%`);
  return enrichment;
}

/**
 * Use Claude AI to extract structured contact data
 */
async function extractContactDataWithAI(
  email?: string,
  name?: string,
  scrapedContent?: string
): Promise<ContactEnrichmentResult> {
  try {
    const prompt = `You are a professional contact research analyst. Analyze the following information about a contact and extract structured data.

CONTACT INFO:
Email: ${email || 'Not provided'}
Name: ${name || 'Not provided'}

SCRAPED LINKEDIN/WEB CONTENT:
${scrapedContent || 'No content available - use your knowledge if you recognize this person'}

INSTRUCTIONS:
Extract the following information:
1. FULL NAME (First and Last name separately)
2. EMAIL ADDRESS (if not provided, generate likely format using company domain)
3. PHONE NUMBER - CRITICAL: Extract DIRECT/PERSONAL phone number (NOT toll-free):
   - Look for direct dial with extension (e.g., "555-123-4567 x123")
   - Avoid toll-free numbers (800, 888, 877, 866, 855, 844, 833)
   - Prefer mobile/cell or direct office line
   - Include extension if available
4. CURRENT JOB TITLE
5. LINKEDIN URL (full profile URL)
6. CURRENT COMPANY NAME
7. LOCATION (City, State/Country)
8. PROFESSIONAL BIO (2-3 sentences)
9. TOP SKILLS (up to 10 key skills)
10. WORK EXPERIENCE (last 3-5 positions with company and role)
11. EDUCATION (degrees, institutions)

Respond ONLY in this exact JSON format (no other text):
{
  "firstName": "First name",
  "lastName": "Last name",
  "email": "email@company.com",
  "phone": "phone_number_or_null",
  "title": "Current Job Title",
  "linkedin": "https://www.linkedin.com/in/profile-url",
  "currentCompany": "Company Name",
  "location": "City, State/Country",
  "bio": "Professional bio",
  "skills": ["Skill1", "Skill2", "Skill3"],
  "experience": ["Company 1 - Role 1", "Company 2 - Role 2"],
  "education": ["Degree - Institution", "Degree - Institution"],
  "confidence": confidence_score_0_to_100
}

If you cannot find information, return null for that field. If you recognize the person from the email/name, use your knowledge. Set confidence based on data quality.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract JSON from response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Try to parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        firstName: result.firstName || undefined,
        lastName: result.lastName || undefined,
        email: result.email || email || undefined,
        phone: result.phone || undefined,
        title: result.title || undefined,
        linkedin: result.linkedin || undefined,
        currentCompany: result.currentCompany || undefined,
        location: result.location || undefined,
        bio: result.bio || undefined,
        skills: result.skills || undefined,
        experience: result.experience || undefined,
        education: result.education || undefined,
        confidence: result.confidence || 50,
      };
    }

    // Fallback if JSON parsing fails
    return {
      confidence: 20,
    };
  } catch (error) {
    console.log(`   ❌ AI contact extraction failed: ${error.message}`);
    return {
      confidence: 0,
    };
  }
}

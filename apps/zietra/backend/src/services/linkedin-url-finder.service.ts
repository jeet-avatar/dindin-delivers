import axios from 'axios';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'fresh-linkedin-profile-data.p.rapidapi.com';

/**
 * Service to automatically find LinkedIn company URLs
 * Uses multiple methods to locate the correct LinkedIn company page
 */

interface CompanySearchResult {
  linkedinUrl?: string;
  confidence: 'high' | 'medium' | 'low';
  method: string;
}

/**
 * Method 1: Search by company domain
 * Most reliable - uses company website to find LinkedIn
 */
async function findByDomain(domain: string): Promise<CompanySearchResult | null> {
  try {
    if (!RAPIDAPI_KEY) {
      console.log('   ⚠️  RAPIDAPI_KEY not configured');
      return null;
    }

    // Clean domain (remove http://, https://, www.)
    const cleanDomain = domain
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0];

    console.log(`   🔍 Searching LinkedIn by domain: ${cleanDomain}`);

    const response = await axios.get(
      `https://${RAPIDAPI_HOST}/get-company-by-domain`,
      {
        params: { domain: cleanDomain },
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': RAPIDAPI_HOST
        },
        timeout: 10000
      }
    );

    if (response.data && response.data.data && response.data.data.url) {
      const linkedinUrl = response.data.data.url;

      // Verify it's a company URL
      if (linkedinUrl.includes('linkedin.com/company/')) {
        console.log(`   ✅ Found via domain: ${linkedinUrl}`);
        return {
          linkedinUrl,
          confidence: 'high',
          method: 'domain_lookup'
        };
      }
    }

    return null;
  } catch (error: any) {
    console.log(`   ⚠️  Domain lookup failed: ${error.message}`);
    return null;
  }
}

/**
 * Method 2: Search by company name
 * Fallback method when domain lookup fails
 */
async function findByCompanyName(companyName: string): Promise<CompanySearchResult | null> {
  try {
    if (!RAPIDAPI_KEY) {
      return null;
    }

    console.log(`   🔍 Searching LinkedIn by company name: ${companyName}`);

    const response = await axios.get(
      `https://${RAPIDAPI_HOST}/search-company`,
      {
        params: {
          query: companyName,
          page: 1,
          per_page: 5
        },
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': RAPIDAPI_HOST
        },
        timeout: 10000
      }
    );

    if (response.data && response.data.data && response.data.data.length > 0) {
      // Get the first result (most relevant)
      const firstResult = response.data.data[0];

      if (firstResult.url && firstResult.url.includes('linkedin.com/company/')) {
        console.log(`   ✅ Found via name search: ${firstResult.url}`);

        // Check if name matches closely
        const nameSimilarity = firstResult.name?.toLowerCase() === companyName.toLowerCase();

        return {
          linkedinUrl: firstResult.url,
          confidence: nameSimilarity ? 'high' : 'medium',
          method: 'name_search'
        };
      }
    }

    return null;
  } catch (error: any) {
    console.log(`   ⚠️  Name search failed: ${error.message}`);
    return null;
  }
}

/**
 * Method 3: Construct URL from company name
 * Last resort - creates a likely LinkedIn URL
 */
function constructLinkedInUrl(companyName: string): CompanySearchResult {
  // Convert company name to LinkedIn-friendly slug
  const slug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-')          // Spaces to hyphens
    .replace(/-+/g, '-')           // Multiple hyphens to single
    .replace(/^-|-$/g, '');        // Remove leading/trailing hyphens

  const linkedinUrl = `https://www.linkedin.com/company/${slug}`;

  console.log(`   ⚠️  Constructed URL (not verified): ${linkedinUrl}`);

  return {
    linkedinUrl,
    confidence: 'low',
    method: 'constructed'
  };
}

/**
 * Main function: Find LinkedIn company URL
 * Tries multiple methods in order of reliability
 */
export async function findLinkedInCompanyUrl(
  companyName: string,
  website?: string
): Promise<CompanySearchResult | null> {
  console.log(`\n🔍 Finding LinkedIn URL for: ${companyName}`);

  // Method 1: Try domain lookup (most reliable)
  if (website) {
    const domainResult = await findByDomain(website);
    if (domainResult) {
      return domainResult;
    }
  }

  // Method 2: Try company name search
  const nameResult = await findByCompanyName(companyName);
  if (nameResult && nameResult.confidence !== 'low') {
    return nameResult;
  }

  // Method 3: Construct URL as last resort
  // Only use if company name is reasonably specific (more than 3 chars, not too generic)
  if (companyName.length > 3 && !['inc', 'llc', 'ltd', 'corp'].includes(companyName.toLowerCase())) {
    console.log(`   ⚠️  Using constructed URL as fallback`);
    const constructedResult = constructLinkedInUrl(companyName);
    return constructedResult;
  }

  console.log(`   ❌ Could not find LinkedIn URL for ${companyName}`);
  return null;
}

/**
 * Batch find LinkedIn URLs for multiple companies
 */
export async function batchFindLinkedInUrls(
  companies: Array<{ id: string; name: string; website?: string }>
): Promise<Map<string, CompanySearchResult>> {
  const results = new Map<string, CompanySearchResult>();

  console.log(`\n📊 Batch finding LinkedIn URLs for ${companies.length} companies...\n`);

  for (const company of companies) {
    try {
      const result = await findLinkedInCompanyUrl(company.name, company.website);

      if (result) {
        results.set(company.id, result);
      }

      // Rate limiting - wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error: any) {
      console.log(`   ❌ Error finding LinkedIn for ${company.name}: ${error.message}`);
    }
  }

  console.log(`\n✅ Found LinkedIn URLs for ${results.size} out of ${companies.length} companies`);

  return results;
}

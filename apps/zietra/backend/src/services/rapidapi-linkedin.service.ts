/**
 * RapidAPI LinkedIn Data Service
 *
 * Integrates with RapidAPI's Fresh LinkedIn Profile Data API
 * to fetch LinkedIn company employee data
 *
 * API: https://rapidapi.com/freshdata-freshdata-default/api/fresh-linkedin-profile-data
 * Pricing: $25/month for 20,000 requests (Basic plan)
 *
 * IMPORTANT: This replaces the Proxycurl service which shut down in July 2025
 */

import axios from 'axios';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';
const RAPIDAPI_HOST = 'fresh-linkedin-profile-data.p.rapidapi.com';
const BASE_URL = `https://${RAPIDAPI_HOST}`;

interface RapidAPIEmployee {
  profile_url?: string;
  public_identifier?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  headline?: string;
  occupation?: string;
  location?: string;
  profile_pic_url?: string;
  summary?: string;
}

interface EnrichedEmployee {
  linkedinUrl: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  title?: string;
  location?: string;
  profilePicture?: string;
}

/**
 * Get company ID from LinkedIn company URL
 */
async function getCompanyId(linkedinCompanyUrl: string): Promise<string | null> {
  try {
    // First, try to get company details which will give us the ID
    const response = await axios.get(`${BASE_URL}/get-company-details`, {
      params: {
        linkedin_url: linkedinCompanyUrl
      },
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST
      },
      timeout: 30000
    });

    return response.data?.company_id || response.data?.id || null;
  } catch (error: any) {
    console.error('Error getting company ID:', error.message);
    return null;
  }
}

/**
 * Fetch employees from a LinkedIn company URL
 */
export async function fetchCompanyEmployees(
  linkedinCompanyUrl: string,
  options: {
    limit?: number;
    enrichProfiles?: boolean;
    useCache?: boolean;
  } = {}
): Promise<EnrichedEmployee[]> {
  try {
    if (!RAPIDAPI_KEY) {
      throw new Error('RAPIDAPI_KEY not configured');
    }

    // Validate LinkedIn company URL format
    if (!linkedinCompanyUrl.includes('linkedin.com/company/')) {
      // Check if it's a personal profile URL
      if (linkedinCompanyUrl.includes('linkedin.com/in/')) {
        throw new Error('This appears to be a personal LinkedIn profile URL. Please provide the company LinkedIn URL (e.g., linkedin.com/company/company-name)');
      }
      throw new Error('Invalid LinkedIn company URL. Expected format: linkedin.com/company/company-name');
    }

    console.log(`🔍 Fetching employees from: ${linkedinCompanyUrl}`);

    // Step 1: Get company ID
    const companyId = await getCompanyId(linkedinCompanyUrl);

    if (!companyId) {
      // Try to extract from URL as fallback
      const urlMatch = linkedinCompanyUrl.match(/\/company\/([^\/\?]+)/);
      if (urlMatch && urlMatch[1]) {
        console.log(`   Using company identifier from URL: ${urlMatch[1]}`);

        // Try the company people endpoint with URL identifier
        return await fetchEmployeesByIdentifier(urlMatch[1], options.limit || 10);
      }

      throw new Error('Could not determine company ID from LinkedIn URL');
    }

    console.log(`   Company ID: ${companyId}`);

    // Step 2: Fetch company employees using the company people endpoint
    const employees: EnrichedEmployee[] = [];
    const limit = Math.min(options.limit || 10, 50); // Max 50 per request

    const response = await axios.get(`${BASE_URL}/get-company-employees`, {
      params: {
        company_id: companyId,
        page: 1,
        per_page: limit
      },
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST
      },
      timeout: 30000
    });

    const employeeData = response.data?.employees || response.data?.data || [];

    if (!employeeData || employeeData.length === 0) {
      console.log('   No employees found');
      return [];
    }

    console.log(`   ✅ Found ${employeeData.length} employees`);

    // Transform to our format
    for (const emp of employeeData) {
      employees.push({
        linkedinUrl: emp.profile_url || `https://linkedin.com/in/${emp.public_identifier}` || '',
        firstName: emp.first_name,
        lastName: emp.last_name,
        fullName: emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
        title: emp.headline || emp.occupation,
        location: emp.location,
        profilePicture: emp.profile_pic_url
      });
    }

    return employees;
  } catch (error: any) {
    console.error('❌ RapidAPI error:', error.message);

    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.response.statusText;

      if (status === 401 || status === 403) {
        throw new Error('RapidAPI key is invalid or unauthorized');
      } else if (status === 429) {
        throw new Error('RapidAPI rate limit exceeded - please try again later');
      } else if (status === 404) {
        throw new Error('LinkedIn company not found');
      } else {
        throw new Error(`RapidAPI error: ${message}`);
      }
    }

    throw error;
  }
}

/**
 * Fetch employees by company identifier (fallback method)
 */
async function fetchEmployeesByIdentifier(
  identifier: string,
  limit: number = 10
): Promise<EnrichedEmployee[]> {
  try {
    const response = await axios.get(`${BASE_URL}/get-company-employees-by-url`, {
      params: {
        company_url: `https://linkedin.com/company/${identifier}`,
        limit: limit
      },
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST
      },
      timeout: 30000
    });

    const employeeData = response.data?.employees || response.data?.data || [];

    return employeeData.map((emp: any) => ({
      linkedinUrl: emp.profile_url || `https://linkedin.com/in/${emp.public_identifier}` || '',
      firstName: emp.first_name,
      lastName: emp.last_name,
      fullName: emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
      title: emp.headline || emp.occupation,
      location: emp.location,
      profilePicture: emp.profile_pic_url
    }));
  } catch (error: any) {
    console.error('Fallback employee fetch failed:', error.message);
    return [];
  }
}

/**
 * Get enriched person profile from LinkedIn URL
 */
export async function getPersonProfile(linkedinProfileUrl: string): Promise<any> {
  try {
    if (!RAPIDAPI_KEY) {
      throw new Error('RAPIDAPI_KEY not configured');
    }

    console.log(`🔍 Fetching person profile: ${linkedinProfileUrl}`);

    const response = await axios.get(`${BASE_URL}/get-linkedin-profile`, {
      params: {
        linkedin_url: linkedinProfileUrl,
        include_skills: 'true'
      },
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST
      },
      timeout: 30000
    });

    console.log(`✅ Person profile fetched successfully`);
    return response.data;
  } catch (error: any) {
    console.error('❌ RapidAPI person profile error:', error.message);

    if (error.response) {
      const status = error.response.status;

      if (status === 401 || status === 403) {
        throw new Error('RapidAPI key is invalid');
      } else if (status === 429) {
        throw new Error('Rate limit exceeded');
      } else if (status === 404) {
        throw new Error('LinkedIn profile not found');
      }
    }

    throw error;
  }
}

/**
 * Search for a person on LinkedIn
 */
export async function searchPerson(
  firstName: string,
  lastName: string,
  companyName?: string
): Promise<string | null> {
  try {
    if (!RAPIDAPI_KEY) {
      throw new Error('RAPIDAPI_KEY not configured');
    }

    // Use people search endpoint if available
    const response = await axios.get(`${BASE_URL}/search-people`, {
      params: {
        first_name: firstName,
        last_name: lastName,
        company: companyName
      },
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': RAPIDAPI_HOST
      },
      timeout: 30000
    });

    return response.data?.profile_url || response.data?.linkedin_url || null;
  } catch (error: any) {
    console.error('❌ RapidAPI person search error:', error.message);
    return null;
  }
}

/**
 * Check API usage/quota
 */
export async function checkCredits(): Promise<{ requests: number; limit: number }> {
  try {
    // RapidAPI usage is tracked in dashboard
    // Return plan limits for reference
    return {
      requests: 0, // Check in RapidAPI dashboard
      limit: 20000 // Basic plan limit
    };
  } catch (error: any) {
    console.error('❌ RapidAPI usage check error:', error.message);
    throw error;
  }
}

/**
 * Fetch employees by providing their LinkedIn URLs
 */
export async function fetchEmployeesByUrls(
  employeeUrls: string[]
): Promise<EnrichedEmployee[]> {
  try {
    if (!RAPIDAPI_KEY) {
      throw new Error('RAPIDAPI_KEY not configured');
    }

    console.log(`🔍 Fetching ${employeeUrls.length} employee profiles...`);

    const employees: EnrichedEmployee[] = [];

    for (const url of employeeUrls) {
      try {
        const profile = await getPersonProfile(url);

        employees.push({
          linkedinUrl: url,
          firstName: profile.first_name,
          lastName: profile.last_name,
          fullName: profile.full_name || `${profile.first_name} ${profile.last_name}`,
          title: profile.headline || profile.occupation,
          location: profile.location,
          profilePicture: profile.profile_pic_url
        });

        // Rate limiting - wait 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error(`   ⚠️  Failed to fetch ${url}:`, error.message);
      }
    }

    console.log(`✅ Fetched ${employees.length} employee profiles`);
    return employees;
  } catch (error: any) {
    console.error('❌ Batch fetch error:', error.message);
    throw error;
  }
}

export default {
  fetchCompanyEmployees,
  getPersonProfile,
  searchPerson,
  checkCredits,
  fetchEmployeesByUrls
};

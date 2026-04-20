/**
 * Proxycurl API Service
 *
 * Integrates with Proxycurl to fetch LinkedIn company employee data
 * API Documentation: https://nubela.co/proxycurl/docs
 *
 * Pricing: $49/month for 1,000 credits
 * Employee Listing: 3 credits per employee returned
 */

import axios from 'axios';

const PROXYCURL_API_KEY = process.env.PROXYCURL_API_KEY || '';
const PROXYCURL_BASE_URL = 'https://nubela.co/proxycurl/api/v2';

interface ProxycurlEmployee {
  profile_url: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  title?: string;
  location?: string;
  profile_pic_url?: string;
  linkedin_profile_url?: string;
}

interface EmployeeListResponse {
  employees: ProxycurlEmployee[];
  next_page?: string;
  total?: number;
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
    if (!PROXYCURL_API_KEY) {
      throw new Error('PROXYCURL_API_KEY not configured');
    }

    // Validate LinkedIn company URL format
    if (!linkedinCompanyUrl.includes('linkedin.com/company/')) {
      throw new Error('Invalid LinkedIn company URL');
    }

    console.log(`🔍 Fetching employees from: ${linkedinCompanyUrl}`);

    const params: any = {
      url: linkedinCompanyUrl,
      country: 'US,GB,CA,AU,IE,NZ,SG,IL', // Supported countries
      enrich_profiles: options.enrichProfiles ? 'enrich' : 'skip',
      page_size: options.limit || 10,
      employment_status: 'current', // Only current employees
    };

    // Add cache control
    if (options.useCache !== undefined) {
      params.use_cache = options.useCache ? 'if-present' : 'if-recent';
    }

    const response = await axios.get(`${PROXYCURL_BASE_URL}/linkedin/company/employees/`, {
      params,
      headers: {
        'Authorization': `Bearer ${PROXYCURL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });

    const data: EmployeeListResponse = response.data;

    if (!data.employees || data.employees.length === 0) {
      console.log('⚠️  No employees found');
      return [];
    }

    console.log(`✅ Found ${data.employees.length} employees`);

    // Transform to our format
    const employees: EnrichedEmployee[] = data.employees.map((emp) => ({
      linkedinUrl: emp.profile_url || emp.linkedin_profile_url || '',
      firstName: emp.first_name,
      lastName: emp.last_name,
      fullName: emp.full_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
      title: emp.title,
      location: emp.location,
      profilePicture: emp.profile_pic_url,
    }));

    return employees;
  } catch (error: any) {
    console.error('❌ Proxycurl API error:', error.message);

    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.response.statusText;

      if (status === 401) {
        throw new Error('Proxycurl API key is invalid');
      } else if (status === 402) {
        throw new Error('Proxycurl credits exhausted - please upgrade plan');
      } else if (status === 404) {
        throw new Error('LinkedIn company not found or not accessible');
      } else if (status === 429) {
        throw new Error('Proxycurl rate limit exceeded - please try again later');
      } else {
        throw new Error(`Proxycurl API error: ${message}`);
      }
    }

    throw error;
  }
}

/**
 * Get company profile from LinkedIn URL
 */
export async function getCompanyProfile(linkedinCompanyUrl: string): Promise<any> {
  try {
    if (!PROXYCURL_API_KEY) {
      throw new Error('PROXYCURL_API_KEY not configured');
    }

    console.log(`🔍 Fetching company profile: ${linkedinCompanyUrl}`);

    const response = await axios.get(`${PROXYCURL_BASE_URL}/linkedin/company`, {
      params: {
        url: linkedinCompanyUrl,
      },
      headers: {
        'Authorization': `Bearer ${PROXYCURL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    console.log(`✅ Company profile fetched successfully`);
    return response.data;
  } catch (error: any) {
    console.error('❌ Proxycurl company profile error:', error.message);
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
    if (!PROXYCURL_API_KEY) {
      throw new Error('PROXYCURL_API_KEY not configured');
    }

    const params: any = {
      first_name: firstName,
      last_name: lastName,
      enrich_profile: 'skip',
    };

    if (companyName) {
      params.current_company_name = companyName;
    }

    const response = await axios.get(`${PROXYCURL_BASE_URL}/linkedin/profile/resolve`, {
      params,
      headers: {
        'Authorization': `Bearer ${PROXYCURL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    return response.data.linkedin_profile_url || null;
  } catch (error: any) {
    console.error('❌ Proxycurl person search error:', error.message);
    return null;
  }
}

/**
 * Get enriched person profile from LinkedIn URL
 */
export async function getPersonProfile(linkedinProfileUrl: string): Promise<any> {
  try {
    if (!PROXYCURL_API_KEY) {
      throw new Error('PROXYCURL_API_KEY not configured');
    }

    console.log(`🔍 Fetching person profile: ${linkedinProfileUrl}`);

    const response = await axios.get(`${PROXYCURL_BASE_URL}/linkedin/profile`, {
      params: {
        url: linkedinProfileUrl,
      },
      headers: {
        'Authorization': `Bearer ${PROXYCURL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    console.log(`✅ Person profile fetched successfully`);
    return response.data;
  } catch (error: any) {
    console.error('❌ Proxycurl person profile error:', error.message);
    throw error;
  }
}

/**
 * Check API credits remaining
 */
export async function checkCredits(): Promise<{ credits: number; plan: string }> {
  try {
    if (!PROXYCURL_API_KEY) {
      throw new Error('PROXYCURL_API_KEY not configured');
    }

    const response = await axios.get(`${PROXYCURL_BASE_URL}/credit-balance`, {
      headers: {
        'Authorization': `Bearer ${PROXYCURL_API_KEY}`,
      },
      timeout: 10000,
    });

    return {
      credits: response.data.credit_balance || 0,
      plan: response.data.plan_name || 'unknown',
    };
  } catch (error: any) {
    console.error('❌ Proxycurl credits check error:', error.message);
    throw error;
  }
}

export default {
  fetchCompanyEmployees,
  getCompanyProfile,
  searchPerson,
  getPersonProfile,
  checkCredits,
};

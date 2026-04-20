import axios, { AxiosInstance } from 'axios';

/**
 * GoDaddy API Integration Service
 * Supports domain management, DNS records, and email configuration
 */
class GoDaddyService {
  private apiKey: string;
  private apiSecret: string;
  private client: AxiosInstance;
  private baseURL = 'https://api.godaddy.com/v1';

  constructor() {
    this.apiKey = process.env.GODADDY_API_KEY || '';
    this.apiSecret = process.env.GODADDY_API_SECRET || '';

    if (!this.apiKey || !this.apiSecret) {
      console.warn('GoDaddy API credentials not configured');
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        Authorization: `sso-key ${this.apiKey}:${this.apiSecret}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Validate domain name to prevent SSRF attacks
   * @param domain - Domain name to validate
   * @throws Error if domain is invalid or potentially malicious
   */
  private validateDomain(domain: string): void {
    if (!domain || typeof domain !== 'string') {
      throw new Error('Invalid domain: domain must be a non-empty string');
    }

    // Remove whitespace
    const trimmedDomain = domain.trim();

    // Check for basic domain format (alphanumeric, dots, hyphens only)
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!domainRegex.test(trimmedDomain)) {
      throw new Error('Invalid domain: domain contains invalid characters or format');
    }

    // Prevent potential SSRF by blocking private/local domains
    const lowercaseDomain = trimmedDomain.toLowerCase();
    const blockedPatterns = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '169.254', // AWS metadata
      '10.', // Private network
      '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.',
      '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.', // Private network
      '192.168.', // Private network
    ];

    for (const pattern of blockedPatterns) {
      if (lowercaseDomain.includes(pattern)) {
        throw new Error('Invalid domain: private or local domains are not allowed');
      }
    }

    // Prevent URL-like input
    if (trimmedDomain.includes('://') || trimmedDomain.includes('/')) {
      throw new Error('Invalid domain: domain should not contain URL components');
    }
  }

  /**
   * Check if GoDaddy is configured
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.apiSecret);
  }

  /**
   * List all domains in GoDaddy account
   */
  async listDomains() {
    try {
      const response = await this.client.get('/domains');
      return {
        success: true,
        domains: response.data,
      };
    } catch (error: any) {
      console.error('GoDaddy List Domains Error:', error.response?.data || error.message);
      throw new Error(`Failed to list domains: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get domain details
   */
  async getDomain(domain: string) {
    this.validateDomain(domain);
    try {
      const response = await this.client.get(`/domains/${domain}`);
      return {
        success: true,
        domain: response.data,
      };
    } catch (error: any) {
      console.error('GoDaddy Get Domain Error:', error.response?.data || error.message);
      throw new Error(`Failed to get domain: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get DNS records for a domain
   */
  async getDNSRecords(domain: string, type?: string, name?: string) {
    this.validateDomain(domain);
    try {
      let url = `/domains/${domain}/records`;
      if (type && name) {
        url += `/${type}/${name}`;
      } else if (type) {
        url += `/${type}`;
      }

      const response = await this.client.get(url);
      return {
        success: true,
        records: response.data,
      };
    } catch (error: any) {
      console.error('GoDaddy Get DNS Records Error:', error.response?.data || error.message);
      throw new Error(`Failed to get DNS records: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Add or update DNS records
   */
  async updateDNSRecords(domain: string, records: Array<{
    type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'SRV' | 'NS';
    name: string;
    data: string;
    ttl?: number;
    priority?: number;
    port?: number;
    weight?: number;
  }>) {
    this.validateDomain(domain);
    try {
      const response = await this.client.put(`/domains/${domain}/records`, records);
      return {
        success: true,
        message: 'DNS records updated successfully',
      };
    } catch (error: any) {
      console.error('GoDaddy Update DNS Records Error:', error.response?.data || error.message);
      throw new Error(`Failed to update DNS records: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Add a single DNS record
   */
  async addDNSRecord(domain: string, record: {
    type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'SRV' | 'NS';
    name: string;
    data: string;
    ttl?: number;
    priority?: number;
  }) {
    this.validateDomain(domain);
    try {
      const response = await this.client.patch(`/domains/${domain}/records`, [record]);
      return {
        success: true,
        message: 'DNS record added successfully',
      };
    } catch (error: any) {
      console.error('GoDaddy Add DNS Record Error:', error.response?.data || error.message);
      throw new Error(`Failed to add DNS record: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Delete DNS records
   */
  async deleteDNSRecord(domain: string, type: string, name: string) {
    this.validateDomain(domain);
    try {
      await this.client.delete(`/domains/${domain}/records/${type}/${name}`);
      return {
        success: true,
        message: 'DNS record deleted successfully',
      };
    } catch (error: any) {
      console.error('GoDaddy Delete DNS Record Error:', error.response?.data || error.message);
      throw new Error(`Failed to delete DNS record: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Configure email forwarding records for domain
   */
  async setupEmailForwarding(domain: string, fromEmail: string, toEmail: string) {
    this.validateDomain(domain);
    try {
      // Add MX records for email forwarding
      const mxRecords = [
        {
          type: 'MX' as const,
          name: '@',
          data: 'smtp.secureserver.net',
          priority: 0,
          ttl: 3600,
        },
        {
          type: 'MX' as const,
          name: '@',
          data: 'mailstore1.secureserver.net',
          priority: 10,
          ttl: 3600,
        },
      ];

      await this.updateDNSRecords(domain, mxRecords);

      return {
        success: true,
        message: 'Email forwarding MX records configured',
      };
    } catch (error: any) {
      console.error('GoDaddy Email Forwarding Setup Error:', error.response?.data || error.message);
      throw new Error(`Failed to setup email forwarding: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Add SPF record for email authentication
   */
  async addSPFRecord(domain: string, spfValue?: string) {
    this.validateDomain(domain);
    const defaultSPF = spfValue || 'v=spf1 include:_spf.google.com include:amazonses.com ~all';

    try {
      await this.addDNSRecord(domain, {
        type: 'TXT',
        name: '@',
        data: defaultSPF,
        ttl: 3600,
      });

      return {
        success: true,
        message: 'SPF record added successfully',
      };
    } catch (error: any) {
      console.error('GoDaddy Add SPF Record Error:', error.response?.data || error.message);
      throw new Error(`Failed to add SPF record: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Add DKIM record for email authentication
   */
  async addDKIMRecord(domain: string, selector: string, dkimValue: string) {
    this.validateDomain(domain);
    try {
      await this.addDNSRecord(domain, {
        type: 'TXT',
        name: `${selector}._domainkey`,
        data: dkimValue,
        ttl: 3600,
      });

      return {
        success: true,
        message: 'DKIM record added successfully',
      };
    } catch (error: any) {
      console.error('GoDaddy Add DKIM Record Error:', error.response?.data || error.message);
      throw new Error(`Failed to add DKIM record: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Add DMARC record for email authentication
   */
  async addDMARCRecord(domain: string, reportEmail: string) {
    this.validateDomain(domain);
    const dmarcValue = `v=DMARC1; p=quarantine; rua=mailto:${reportEmail}; ruf=mailto:${reportEmail}; fo=1`;

    try {
      await this.addDNSRecord(domain, {
        type: 'TXT',
        name: '_dmarc',
        data: dmarcValue,
        ttl: 3600,
      });

      return {
        success: true,
        message: 'DMARC record added successfully',
      };
    } catch (error: any) {
      console.error('GoDaddy Add DMARC Record Error:', error.response?.data || error.message);
      throw new Error(`Failed to add DMARC record: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Setup complete email authentication (SPF, DKIM, DMARC)
   */
  async setupEmailAuthentication(
    domain: string,
    config: {
      spf?: string;
      dkim?: { selector: string; value: string };
      dmarc?: { reportEmail: string };
    }
  ) {
    this.validateDomain(domain);
    const results = [];

    try {
      // Add SPF
      if (config.spf !== undefined) {
        const spfResult = await this.addSPFRecord(domain, config.spf);
        results.push({ type: 'SPF', ...spfResult });
      }

      // Add DKIM
      if (config.dkim) {
        const dkimResult = await this.addDKIMRecord(domain, config.dkim.selector, config.dkim.value);
        results.push({ type: 'DKIM', ...dkimResult });
      }

      // Add DMARC
      if (config.dmarc) {
        const dmarcResult = await this.addDMARCRecord(domain, config.dmarc.reportEmail);
        results.push({ type: 'DMARC', ...dmarcResult });
      }

      return {
        success: true,
        message: 'Email authentication records configured',
        results,
      };
    } catch (error: any) {
      console.error('GoDaddy Email Authentication Setup Error:', error);
      throw error;
    }
  }

  /**
   * Point domain to AWS/custom server
   */
  async pointDomainToServer(domain: string, ipAddress: string, subdomain?: string) {
    this.validateDomain(domain);
    try {
      const recordName = subdomain || '@';

      await this.addDNSRecord(domain, {
        type: 'A',
        name: recordName,
        data: ipAddress,
        ttl: 600,
      });

      return {
        success: true,
        message: `Domain ${subdomain ? subdomain + '.' : ''}${domain} pointed to ${ipAddress}`,
      };
    } catch (error: any) {
      console.error('GoDaddy Point Domain Error:', error.response?.data || error.message);
      throw new Error(`Failed to point domain: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Add CNAME record (useful for ALB, CloudFront, etc.)
   */
  async addCNAMERecord(domain: string, subdomain: string, target: string) {
    this.validateDomain(domain);
    try {
      await this.addDNSRecord(domain, {
        type: 'CNAME',
        name: subdomain,
        data: target,
        ttl: 600,
      });

      return {
        success: true,
        message: `CNAME record added: ${subdomain}.${domain} → ${target}`,
      };
    } catch (error: any) {
      console.error('GoDaddy Add CNAME Error:', error.response?.data || error.message);
      throw new Error(`Failed to add CNAME record: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Setup domain for AWS SES
   */
  async setupForAWSSES(domain: string, sesConfig: {
    verificationToken: string;
    dkimTokens: string[];
  }) {
    this.validateDomain(domain);
    const records = [];

    // Add SES verification TXT record
    records.push({
      type: 'TXT' as const,
      name: '_amazonses',
      data: sesConfig.verificationToken,
      ttl: 3600,
    });

    // Add DKIM records
    sesConfig.dkimTokens.forEach((token, index) => {
      records.push({
        type: 'CNAME' as const,
        name: `${token}._domainkey`,
        data: `${token}.dkim.amazonses.com`,
        ttl: 3600,
      });
    });

    try {
      await this.updateDNSRecords(domain, records);

      return {
        success: true,
        message: 'Domain configured for AWS SES',
        recordsAdded: records.length,
      };
    } catch (error: any) {
      console.error('GoDaddy AWS SES Setup Error:', error.response?.data || error.message);
      throw new Error(`Failed to setup AWS SES: ${error.response?.data?.message || error.message}`);
    }
  }
}

export const godaddyService = new GoDaddyService();
export default godaddyService;

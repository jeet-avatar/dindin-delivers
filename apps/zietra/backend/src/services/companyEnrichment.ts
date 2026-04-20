import Anthropic from '@anthropic-ai/sdk';
import { webScraperService } from './webScraper';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface EnrichedCompanyData {
  aiDescription: string;
  aiIndustry: string;
  aiKeywords: string[];
  aiCompanyType: string;
  aiTechStack: string[];
  aiRecentNews: string;
  aiEmployeeRange: string;
  aiRevenue: string;
  aiFoundedYear: number | null;
}

export class CompanyEnrichmentService {
  async enrichCompany(companyName: string, website: string): Promise<EnrichedCompanyData> {
    try {
      console.log(`🤖 Enriching company: ${companyName} - ${website}`);

      // Step 1: Scrape website
      const scrapedData = await webScraperService.scrapeWebsite(website);

      // Step 2: Use AI to analyze and extract intelligence
      const prompt = `Analyze this company website data and extract key business intelligence:

Company Name: ${companyName}
Website: ${website}

Scraped Data:
Title: ${scrapedData.title}
Description: ${scrapedData.description}
Content Preview: ${scrapedData.content.substring(0, 2000)}
Keywords: ${scrapedData.keywords.join(', ')}
Main Headings: ${scrapedData.headings.slice(0, 10).join(', ')}

Please provide a JSON response with the following fields:
{
  "aiDescription": "Clear 2-3 sentence description of what the company does",
  "aiIndustry": "Primary industry (e.g., SaaS, Manufacturing, Healthcare, etc.)",
  "aiKeywords": ["keyword1", "keyword2", ...] (5-10 relevant business keywords),
  "aiCompanyType": "B2B, B2C, Enterprise, SMB, or Startup",
  "aiTechStack": ["tech1", "tech2", ...] (technologies mentioned or likely used),
  "aiRecentNews": "Summary of recent news, achievements, or updates if mentioned",
  "aiEmployeeRange": "Estimated employee range (e.g., 1-10, 11-50, 51-200, 201-500, 500+)",
  "aiRevenue": "Estimated revenue if mentioned or 'Unknown'",
  "aiFoundedYear": Founded year as number or null if not found
}

Only return valid JSON, no additional text.`;

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      // Parse AI response
      const aiResponse = message.content[0].type === 'text'
        ? message.content[0].text
        : '';

      // Extract JSON from response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI did not return valid JSON');
      }

      const enrichedData: EnrichedCompanyData = JSON.parse(jsonMatch[0]);

      console.log(`✅ Successfully enriched: ${companyName}`);
      return enrichedData;

    } catch (error: any) {
      console.error(`❌ Failed to enrich company ${companyName}:`, error.message);
      throw error;
    }
  }

  async enrichCompanyBatch(companies: Array<{ name: string; website: string }>): Promise<Map<string, EnrichedCompanyData>> {
    const results = new Map<string, EnrichedCompanyData>();

    for (const company of companies) {
      try {
        const enrichedData = await this.enrichCompany(company.name, company.website);
        results.set(company.name, enrichedData);

        // Rate limiting - wait 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error(`Failed to enrich ${company.name}:`, error.message);
      }
    }

    return results;
  }
}

export const companyEnrichmentService = new CompanyEnrichmentService();

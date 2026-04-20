import axios from 'axios';
import * as cheerio from 'cheerio';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

interface ScrapedData {
  title: string;
  description: string;
  content: string;
  keywords: string[];
  ogData: {
    title?: string;
    description?: string;
    image?: string;
    type?: string;
  };
  links: string[];
  headings: string[];
}

export class WebScraperService {
  private userAgent = 'Mozilla/5.0 (compatible; ZietraBot/1.0; +https://zietra.com)';

  async scrapeWebsite(url: string): Promise<ScrapedData> {
    try {
      // Normalize URL
      const normalizedUrl = this.normalizeUrl(url);

      console.log(`🌐 Scraping website: ${normalizedUrl}`);

      // Fetch page
      const response = await axios.get(normalizedUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml',
        },
        timeout: 15000, // 15 seconds
        maxRedirects: 5
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // Extract meta data
      const title = this.extractTitle($);
      const description = this.extractDescription($);
      const keywords = this.extractKeywords($);
      const ogData = this.extractOpenGraph($);

      // Extract content using Readability
      const content = this.extractMainContent(html, normalizedUrl);

      // Extract links and headings
      const links = this.extractLinks($, normalizedUrl);
      const headings = this.extractHeadings($);

      console.log(`✅ Successfully scraped: ${normalizedUrl}`);

      return {
        title,
        description,
        content,
        keywords,
        ogData,
        links,
        headings
      };

    } catch (error: any) {
      console.error('Web scraping error:', error.message);
      throw new Error(`Failed to scrape ${url}: ${error.message}`);
    }
  }

  private normalizeUrl(url: string): string {
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    // Remove trailing slash
    return url.replace(/\/$/, '');
  }

  private extractTitle($: cheerio.CheerioAPI): string {
    return $('title').first().text().trim() ||
           $('meta[property="og:title"]').attr('content') ||
           $('h1').first().text().trim() ||
           '';
  }

  private extractDescription($: cheerio.CheerioAPI): string {
    return $('meta[name="description"]').attr('content') ||
           $('meta[property="og:description"]').attr('content') ||
           $('meta[name="twitter:description"]').attr('content') ||
           '';
  }

  private extractKeywords($: cheerio.CheerioAPI): string[] {
    const keywordsStr = $('meta[name="keywords"]').attr('content') || '';
    return keywordsStr
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);
  }

  private extractOpenGraph($: cheerio.CheerioAPI): ScrapedData['ogData'] {
    return {
      title: $('meta[property="og:title"]').attr('content'),
      description: $('meta[property="og:description"]').attr('content'),
      image: $('meta[property="og:image"]').attr('content'),
      type: $('meta[property="og:type"]').attr('content'),
    };
  }

  private extractMainContent(html: string, url: string): string {
    try {
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();
      return article?.textContent || '';
    } catch (error) {
      console.warn('Readability extraction failed, using fallback');
      return '';
    }
  }

  private extractLinks($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const links: string[] = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        try {
          const absoluteUrl = new URL(href, baseUrl).href;
          links.push(absoluteUrl);
        } catch (e) {
          // Invalid URL, skip
        }
      }
    });
    return [...new Set(links)].slice(0, 50); // Limit to 50 unique links
  }

  private extractHeadings($: cheerio.CheerioAPI): string[] {
    const headings: string[] = [];
    $('h1, h2, h3').each((_, el) => {
      const text = $(el).text().trim();
      if (text) headings.push(text);
    });
    return headings.slice(0, 20); // Limit to 20 headings
  }
}

export const webScraperService = new WebScraperService();

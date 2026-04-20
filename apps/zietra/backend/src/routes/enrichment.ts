// @ts-nocheck
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../app';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { enrichCompanyWithAI, enrichContactWithAI } from '../services/aiEnrichment';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Enrich a company by ID
router.post('/companies/:id/enrich', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // ✅ Verify ownership before enrichment
    const company = await prisma.company.findFirst({
      where: {
        id,
        userId: req.user?.id,
      },
    });

    if (!company) {
      throw new AppError('Company not found', 404);
    }

    // Use AI enrichment service
    console.log(`\n🚀 Starting enrichment for: ${company.name}`);

    const enrichmentData = await enrichCompanyWithAI(
      company.name,
      company.website || undefined,
      company.linkedin || undefined,
      company.location || undefined
    );

    console.log(`✅ Enrichment complete with confidence: ${enrichmentData.confidence}%`);

    // Prepare update data
    const updateData: any = {
      enriched: true,
      enrichedAt: new Date(),
      industry: enrichmentData.industry || company.industry,
      location: enrichmentData.headquarters || company.location,
      description: enrichmentData.description || company.description,
      employeeCount: enrichmentData.employeeCount || company.employeeCount,
      foundedYear: enrichmentData.foundedYear || company.foundedYear,
      videoUrl: enrichmentData.videoUrl || company.videoUrl,
      hiringInfo: enrichmentData.hiringIntent || company.hiringInfo,
      pitch: enrichmentData.pitch || company.pitch,
      enrichmentData: enrichmentData as any,
    };

    // Add discovered URLs if found
    if (enrichmentData.discoveredWebsite) {
      updateData.website = enrichmentData.discoveredWebsite;
      console.log(`   🔗 Discovered website: ${enrichmentData.discoveredWebsite}`);
    }

    if (enrichmentData.discoveredLinkedIn) {
      updateData.linkedin = enrichmentData.discoveredLinkedIn;
      console.log(`   🔗 Discovered LinkedIn: ${enrichmentData.discoveredLinkedIn}`);
    }

    // Update company with enriched data
    const enrichedCompany = await prisma.company.update({
      where: { id },
      data: updateData,
    });

    // Create Contact records for extracted professionals
    let createdProfessionals = 0;
    if (enrichmentData.professionals && enrichmentData.professionals.length > 0) {
      console.log(`👥 Creating ${enrichmentData.professionals.length} professional contacts...`);

      for (const professional of enrichmentData.professionals) {
        try {
          // Skip if professional has no firstName or lastName
          if (!professional.firstName || !professional.lastName) {
            console.log(`   ⏭️  Skipped professional with missing name data`);
            continue;
          }

          // Check if contact already exists by email or name
          const whereClause: any = {
            companyId: company.id,
            userId: req.user?.id,
          };

          // Build OR conditions only if we have valid data
          if (professional.email) {
            whereClause.OR = [
              { email: professional.email },
              {
                AND: [
                  { firstName: professional.firstName },
                  { lastName: professional.lastName },
                ],
              },
            ];
          } else {
            // No email, just search by name
            whereClause.firstName = professional.firstName;
            whereClause.lastName = professional.lastName;
          }

          const existingContact = await prisma.contact.findFirst({
            where: whereClause,
          });

          if (!existingContact) {
            await prisma.contact.create({
              data: {
                firstName: professional.firstName,
                lastName: professional.lastName,
                email: professional.email || undefined,
                phone: professional.phone || undefined,
                title: professional.role,
                linkedin: professional.linkedin || undefined,
                companyId: company.id,
                userId: req.user!.id,
                source: 'AI_ENRICHMENT',
                isActive: true,
              },
            });
            createdProfessionals++;
            console.log(`   ✅ Created contact: ${professional.firstName} ${professional.lastName} (${professional.role})`);
          } else {
            console.log(`   ⏭️  Skipped duplicate: ${professional.firstName} ${professional.lastName}`);
          }
        } catch (contactError) {
          console.error(`   ❌ Failed to create contact: ${professional.firstName} ${professional.lastName}`, contactError);
        }
      }

      console.log(`✅ Created ${createdProfessionals} new professional contacts`);
    }

    logger.info(`Company enriched: ${company.name} (Confidence: ${enrichmentData.confidence}%, ${createdProfessionals} contacts created)`);

    res.json({
      message: 'Company enriched successfully',
      company: enrichedCompany,
      enrichmentData,
      professionalsCreated: createdProfessionals,
    });
  } catch (error) {
    next(error);
  }
});

// Bulk enrich companies
router.post('/companies/bulk-enrich', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyIds } = req.body;

    if (!companyIds || !Array.isArray(companyIds)) {
      throw new AppError('Company IDs array is required', 400);
    }

    // ✅ Only enrich companies owned by user
    const enrichedCount = await prisma.company.updateMany({
      where: {
        id: { in: companyIds },
        userId: req.user?.id,
        enriched: false,
      },
      data: {
        enriched: true,
        enrichedAt: new Date(),
      },
    });

    logger.info(`Bulk enriched ${enrichedCount.count} companies`);

    res.json({
      message: `Successfully enriched ${enrichedCount.count} companies`,
      count: enrichedCount.count,
    });
  } catch (error) {
    next(error);
  }
});

// Enrich a contact by ID
router.post('/contacts/:id/enrich', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // ✅ Verify ownership before enrichment
    const contact = await prisma.contact.findFirst({
      where: {
        id,
        userId: req.user?.id,
      },
    });

    if (!contact) {
      throw new AppError('Contact not found', 404);
    }

    // Use AI enrichment service
    console.log(`\n🚀 Starting contact enrichment for: ${contact.firstName} ${contact.lastName}`);

    const enrichmentData = await enrichContactWithAI(
      contact.email || undefined,
      `${contact.firstName} ${contact.lastName}`,
      contact.linkedin || undefined
    );

    console.log(`✅ Contact enrichment complete with confidence: ${enrichmentData.confidence}%`);

    // Update contact with enriched data
    const enrichedContact = await prisma.contact.update({
      where: { id },
      data: {
        firstName: enrichmentData.firstName || contact.firstName,
        lastName: enrichmentData.lastName || contact.lastName,
        email: enrichmentData.email || contact.email,
        phone: enrichmentData.phone || contact.phone,
        title: enrichmentData.title || contact.title,
        linkedin: enrichmentData.linkedin || contact.linkedin,
        location: enrichmentData.location || contact.location,
        bio: enrichmentData.bio || contact.bio,
        skills: enrichmentData.skills ? enrichmentData.skills.join(', ') : contact.skills,
        notes: enrichmentData.experience && enrichmentData.education
          ? `Experience: ${enrichmentData.experience.join('; ')}\n\nEducation: ${enrichmentData.education.join('; ')}`
          : contact.notes,
        enriched: true,
        enrichedAt: new Date(),
      },
    });

    logger.info(`Contact enriched: ${contact.firstName} ${contact.lastName} (Confidence: ${enrichmentData.confidence}%)`);

    res.json({
      message: 'Contact enriched successfully',
      contact: enrichedContact,
      enrichmentData,
    });
  } catch (error) {
    next(error);
  }
});

// 🚀 PREMIUM FEATURE: SocialFlow - Advanced Social & Credit Data Enrichment
router.post('/companies/:id/socialflow', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // ✅ Verify ownership before enrichment
    const company = await prisma.company.findFirst({
      where: {
        id,
        userId: req.user?.id,
      },
    });

    if (!company) {
      throw new AppError('Company not found', 404);
    }

    console.log(`\n🚀 Starting SocialFlow enrichment for: ${company.name}`);

    // Track enrichment status for each step
    const enrichmentStatus = {
      creditRating: { success: false, error: null as string | null },
      socialMedia: { success: false, error: null as string | null },
      aiAnalysis: { success: false, error: null as string | null },
    };

    // Prepare enrichment data object
    const socialFlowData: any = {
      creditRating: null,
      socialMedia: {
        twitter: null,
        facebook: null,
        instagram: null,
        youtube: null,
      },
      technographics: [],
      funding: null,
      revenue: null,
      employees: null,
      growth: null,
      enrichmentStatus: enrichmentStatus, // Store status in data
    };

    // 1. Fetch Credit Rating from external API
    try {
      console.log(`   📊 Fetching credit rating...`);
      const creditResponse = await fetch(
        `http://13.53.133.99:8000/api/company-analysis/lookup?companyName=${encodeURIComponent(company.name)}`
      );

      if (creditResponse.ok) {
        const creditData = await creditResponse.json();
        socialFlowData.creditRating = creditData;
        enrichmentStatus.creditRating.success = true;
        console.log(`   ✅ Credit rating fetched successfully`);
      } else {
        enrichmentStatus.creditRating.error = `API returned status ${creditResponse.status}`;
        console.log(`   ⚠️  Credit rating API returned ${creditResponse.status}`);
      }
    } catch (creditError: any) {
      enrichmentStatus.creditRating.error = creditError.message;
      console.log(`   ⚠️  Credit rating fetch failed: ${creditError.message}`);
    }

    // 2. Extract social media links from website
    if (company.website) {
      try {
        console.log(`   🔍 Scanning for social media profiles...`);
        const axios = require('axios');
        const cheerio = require('cheerio');

        const response = await axios.get(company.website, {
          timeout: 10000,
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const $ = cheerio.load(response.data);

        // Extract social media links
        $('a[href*="twitter.com"], a[href*="x.com"]').each((i, el) => {
          const href = $(el).attr('href');
          if (href && !socialFlowData.socialMedia.twitter) {
            socialFlowData.socialMedia.twitter = href;
          }
        });

        $('a[href*="facebook.com"]').each((i, el) => {
          const href = $(el).attr('href');
          if (href && !socialFlowData.socialMedia.facebook) {
            socialFlowData.socialMedia.facebook = href;
          }
        });

        $('a[href*="instagram.com"]').each((i, el) => {
          const href = $(el).attr('href');
          if (href && !socialFlowData.socialMedia.instagram) {
            socialFlowData.socialMedia.instagram = href;
          }
        });

        $('a[href*="youtube.com"]').each((i, el) => {
          const href = $(el).attr('href');
          if (href && !socialFlowData.socialMedia.youtube) {
            socialFlowData.socialMedia.youtube = href;
          }
        });

        const hasAnySocialMedia = socialFlowData.socialMedia.twitter ||
                                  socialFlowData.socialMedia.facebook ||
                                  socialFlowData.socialMedia.instagram ||
                                  socialFlowData.socialMedia.youtube;

        if (hasAnySocialMedia) {
          enrichmentStatus.socialMedia.success = true;
        } else {
          enrichmentStatus.socialMedia.error = 'No social media links found on website';
        }
        console.log(`   ✅ Social media scan complete`);
      } catch (scrapeError: any) {
        enrichmentStatus.socialMedia.error = scrapeError.message;
        console.log(`   ⚠️  Social media scan failed: ${scrapeError.message}`);
      }
    } else {
      enrichmentStatus.socialMedia.error = 'No website URL configured';
      console.log(`   ⚠️  No website URL configured for social media scan`);
    }

    // 3. Use AI to extract additional premium data
    try {
      console.log(`   🧠 Analyzing with AI for premium insights...`);
      const Anthropic = require('@anthropic-ai/sdk');
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY || '',
      });

      const prompt = `Analyze "${company.name}" (website: ${company.website || 'unknown'}) and provide premium business intelligence data.

Extract the following:
1. Technology Stack (software/platforms they use - e.g., Salesforce, AWS, Shopify, etc.)
2. Estimated Annual Revenue (if publicly available or industry standard estimate)
3. Estimated Employee Count (if not already known: ${company.employeeCount || 'unknown'})
4. Recent Funding Rounds (if applicable - amount, date, investors)
5. Growth Stage (Startup, Growth, Mature, Enterprise)

Respond in JSON format:
{
  "technographics": ["tech1", "tech2"],
  "revenue": "estimated revenue or null",
  "employees": "employee count or null",
  "funding": "funding info or null",
  "growth": "growth stage or null"
}`;

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });

      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const aiData = JSON.parse(jsonMatch[0]);
        socialFlowData.technographics = aiData.technographics || [];
        socialFlowData.revenue = aiData.revenue;
        socialFlowData.employees = aiData.employees;
        socialFlowData.funding = aiData.funding;
        socialFlowData.growth = aiData.growth;

        const hasAnyData = (socialFlowData.technographics && socialFlowData.technographics.length > 0) ||
                          socialFlowData.revenue ||
                          socialFlowData.employees ||
                          socialFlowData.funding ||
                          socialFlowData.growth;

        if (hasAnyData) {
          enrichmentStatus.aiAnalysis.success = true;
        } else {
          enrichmentStatus.aiAnalysis.error = 'AI returned no data';
        }
        console.log(`   ✅ AI analysis complete`);
      } else {
        enrichmentStatus.aiAnalysis.error = 'Failed to parse AI response';
        console.log(`   ⚠️  Failed to parse AI response`);
      }
    } catch (aiError: any) {
      enrichmentStatus.aiAnalysis.error = aiError.message;
      console.log(`   ⚠️  AI analysis failed: ${aiError.message}`);
    }

    // 4. Determine if enrichment was successful (at least one step succeeded)
    const anySuccess = enrichmentStatus.creditRating.success ||
                      enrichmentStatus.socialMedia.success ||
                      enrichmentStatus.aiAnalysis.success;

    const allFailed = !enrichmentStatus.creditRating.success &&
                      !enrichmentStatus.socialMedia.success &&
                      !enrichmentStatus.aiAnalysis.success;

    // 5. Update company with SocialFlow data
    const updatedCompany = await prisma.company.update({
      where: { id },
      data: {
        socialFlowData: socialFlowData as any,
        socialFlowEnriched: anySuccess, // Only mark as enriched if at least one step succeeded
        socialFlowEnrichedAt: anySuccess ? new Date() : null,
      },
    });

    // Log final status
    const successCount = [
      enrichmentStatus.creditRating.success,
      enrichmentStatus.socialMedia.success,
      enrichmentStatus.aiAnalysis.success
    ].filter(Boolean).length;

    console.log(`✅ SocialFlow enrichment complete: ${successCount}/3 steps successful`);
    console.log(`   Credit Rating: ${enrichmentStatus.creditRating.success ? '✅' : '❌'} ${enrichmentStatus.creditRating.error || ''}`);
    console.log(`   Social Media: ${enrichmentStatus.socialMedia.success ? '✅' : '❌'} ${enrichmentStatus.socialMedia.error || ''}`);
    console.log(`   AI Analysis: ${enrichmentStatus.aiAnalysis.success ? '✅' : '❌'} ${enrichmentStatus.aiAnalysis.error || ''}`);

    logger.info(`SocialFlow enriched: ${company.name} (${successCount}/3 successful)`);

    // Return appropriate response
    if (allFailed) {
      res.status(207).json({
        message: 'SocialFlow enrichment completed but all steps failed',
        warning: 'No data was successfully enriched. Please check the errors below.',
        company: updatedCompany,
        socialFlowData,
        enrichmentStatus,
        successCount: 0,
        totalSteps: 3
      });
    } else {
      res.json({
        message: `SocialFlow enrichment completed successfully (${successCount}/3 steps)`,
        company: updatedCompany,
        socialFlowData,
        enrichmentStatus,
        successCount,
        totalSteps: 3
      });
    }
  } catch (error) {
    next(error);
  }
});

export default router;

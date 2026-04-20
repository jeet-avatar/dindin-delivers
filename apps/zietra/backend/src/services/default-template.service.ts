import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class DefaultTemplateService {
  /**
   * Get the default Critical River email template
   */
  static getDefaultTemplate() {
    // Using a more compact HTML structure to avoid issues
    const htmlContent = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>{{subject}}</title><style>body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background-color:#f3f4f6}.container{max-width:600px;margin:0 auto;background:#fff}.header{background:linear-gradient(to right,#F97316,#FB7185);padding:30px 40px;text-align:center;border-radius:8px 8px 0 0}.header img{height:60px;max-width:200px}.header h1{margin:20px 0 0;color:#000;font-size:28px;font-weight:bold}.content{padding:40px;color:#1f2937;line-height:1.6}.greeting{font-size:18px;font-weight:600;margin-bottom:20px;color:#111827}.body-text{font-size:16px;color:#374151;margin-bottom:30px}.video-section{background:linear-gradient(135deg,#fef3c7 0%,#fce7f3 100%);border-radius:12px;padding:20px;margin:30px 0;border:2px solid #f59e0b;text-align:center}.video-section a{text-decoration:none}.video-thumbnail{width:100%;border-radius:8px;margin-bottom:15px}.video-title{margin:15px 0 5px;color:#1f2937;font-size:18px;font-weight:bold}.video-subtitle{color:#6b7280;font-size:14px}.cta-container{text-align:center;margin:30px 0}.cta-button{display:inline-block;background:linear-gradient(to right,#F97316,#FB7185);color:#000;font-size:16px;font-weight:bold;text-decoration:none;padding:16px 40px;border-radius:8px;margin:10px;border:2px solid #000}.cta-button-secondary{display:inline-block;background:#fff;color:#F97316;font-size:16px;font-weight:bold;text-decoration:none;padding:16px 40px;border-radius:8px;margin:10px;border:2px solid #F97316}.signature{margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:14px}.signature-name{font-weight:600;color:#111827;font-size:16px}.footer{background-color:#1f2937;color:#9ca3af;padding:30px 40px;text-align:center;font-size:13px;line-height:1.6;border-radius:0 0 8px 8px}.footer a{color:#F97316;text-decoration:underline;font-weight:600}@media screen and (max-width:600px){.container{width:100%!important}.header{padding:20px!important}.header h1{font-size:24px!important}.content{padding:20px!important}.cta-button,.cta-button-secondary{display:block!important;width:100%!important;margin:10px 0!important}.footer{padding:20px!important}}</style></head><body><div style="display:none;max-height:0;overflow:hidden;">{{previewText}}</div><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f3f4f6;padding:40px 0"><tr><td align="center"><table role="presentation" class="container" cellspacing="0" cellpadding="0" border="0" width="600"><tr><td class="header"><img src="{{logoUrl}}" alt="Critical River Logo"><h1>{{headline}}</h1></td></tr><tr><td class="content"><div class="greeting">Hi {{firstName}},</div><div class="body-text">{{bodyContent}}</div><div class="video-section"><a href="{{videoUrl}}" target="_blank"><img src="{{videoThumbnailUrl}}" alt="Watch Video" class="video-thumbnail"><h3 class="video-title">{{videoTitle}}</h3><p class="video-subtitle">▶ Click to watch the video</p></a></div><div class="cta-container"><a href="{{addToFeedUrl}}" class="cta-button" target="_blank">📰 Add to Daily Feed</a><br><a href="{{videoUrl}}" class="cta-button-secondary" target="_blank">▶ Watch Video</a></div><div class="signature"><div class="signature-name">{{senderName}}</div><div>{{senderTitle}}</div><div style="margin-top:10px">Critical River</div></div></td></tr><tr><td class="footer"><div style="margin-bottom:20px"><strong>Critical River</strong><br>{{companyAddress}}<br>{{companyCity}}, {{companyState}} {{companyZip}}<br><a href="mailto:{{contactEmail}}">{{contactEmail}}</a> | {{contactPhone}}</div><div style="margin:20px 0"><a href="{{linkedInUrl}}" target="_blank">LinkedIn</a> | <a href="{{twitterUrl}}" target="_blank">Twitter</a> | <a href="{{facebookUrl}}" target="_blank">Facebook</a> | <a href="{{youtubeUrl}}" target="_blank">YouTube</a></div><div style="margin:20px 0"><a href="{{unsubscribeUrl}}" target="_blank">Unsubscribe</a> | <a href="{{preferencesUrl}}" target="_blank">Email Preferences</a> | <a href="{{privacyPolicyUrl}}" target="_blank">Privacy Policy</a></div><div style="margin-top:20px;font-size:12px;color:#6b7280">&copy; {{currentYear}} Critical River. All rights reserved.</div><img src="{{trackingPixelUrl}}" alt="" width="1" height="1" style="display:none"></td></tr></table></td></tr></table></body></html>';

    const textContent = `{{headline}}

Hi {{firstName}},

{{bodyContent}}

Watch Video: {{videoUrl}}
Video Title: {{videoTitle}}

📰 Add to Daily Feed: {{addToFeedUrl}}
▶ Watch Video: {{videoUrl}}

---
{{senderName}}
{{senderTitle}}
Critical River

{{companyAddress}}
{{companyCity}}, {{companyState}} {{companyZip}}
{{contactEmail}} | {{contactPhone}}

Unsubscribe: {{unsubscribeUrl}}
Privacy Policy: {{privacyPolicyUrl}}

© {{currentYear}} Critical River. All rights reserved.`;

    return {
      name: 'Critical River - Video Campaign (Ready to Use)',
      subject: '{{headline}} - Watch Our Latest Video',
      templateType: 'video_campaign',
      fromEmail: 'hello@criticalriver.com',
      fromName: 'Critical River',
      isActive: true,
      variables: [
        'subject',
        'previewText',
        'logoUrl',
        'headline',
        'firstName',
        'bodyContent',
        'videoUrl',
        'videoThumbnailUrl',
        'videoTitle',
        'addToFeedUrl',
        'senderName',
        'senderTitle',
        'companyAddress',
        'companyCity',
        'companyState',
        'companyZip',
        'contactEmail',
        'contactPhone',
        'linkedInUrl',
        'twitterUrl',
        'facebookUrl',
        'youtubeUrl',
        'unsubscribeUrl',
        'preferencesUrl',
        'privacyPolicyUrl',
        'trackingPixelUrl',
        'currentYear',
      ],
      htmlContent,
      textContent,
    };
  }

  /**
   * Ensure user has the default template
   * This runs after login or registration
   */
  static async ensureDefaultTemplate(userId: string): Promise<void> {
    try {
      const templateData = this.getDefaultTemplate();

      // Check if user already has this template
      const existingTemplate = await prisma.emailTemplate.findFirst({
        where: {
          userId,
          name: templateData.name,
        },
      });

      if (existingTemplate) {
        logger.info(`User ${userId} already has default template`);
        return;
      }

      // Create the default template for this user
      await prisma.emailTemplate.create({
        data: {
          ...templateData,
          userId,
        },
      });

      logger.info(`Created default email template for user ${userId}`);
    } catch (error) {
      logger.error('Error creating default template:', error);
      // Don't throw - we don't want to break login/registration if template creation fails
    }
  }

  /**
   * Seed default template for all existing users
   * Run this once to backfill templates for existing users
   */
  static async seedAllUsers(): Promise<{ created: number; skipped: number }> {
    try {
      const users = await prisma.user.findMany({
        select: { id: true, email: true },
      });

      let created = 0;
      let skipped = 0;

      for (const user of users) {
        const templateData = this.getDefaultTemplate();

        // Check if user already has this template
        const existingTemplate = await prisma.emailTemplate.findFirst({
          where: {
            userId: user.id,
            name: templateData.name,
          },
        });

        if (existingTemplate) {
          skipped++;
          continue;
        }

        // Create the default template
        await prisma.emailTemplate.create({
          data: {
            ...templateData,
            userId: user.id,
          },
        });

        created++;
        logger.info(`Created default template for user: ${user.email}`);
      }

      logger.info(`Default template seeding complete. Created: ${created}, Skipped: ${skipped}`);
      return { created, skipped };
    } catch (error) {
      logger.error('Error seeding default templates:', error);
      throw error;
    }
  }
}

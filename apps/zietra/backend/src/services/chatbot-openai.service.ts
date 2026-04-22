import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const prisma = new PrismaClient();

// Initialize OpenAI client with ChatGPT API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface OrchestrationContext {
  userId: string;
  conversationHistory: ChatMessage[];
  currentTask?: string;
  pendingApprovals?: any[];
  metadata?: Record<string, any>;
}

interface OrchestrationResponse {
  message: string;
  requiresApproval: boolean;
  approvalData?: any;
  suggestedActions?: string[];
  completed?: boolean;
}

/**
 * Chatbot OpenAI Service
 * Uses ChatGPT (GPT-4o) for intelligent chatbot conversations ONLY
 * Note: Other internal tools use Claude/Anthropic (see ai-orchestrator.service.ts)
 */
export class ChatbotOpenAI {
  /**
   * Main orchestration method - handles user requests
   */
  async processRequest(
    userMessage: string,
    context: OrchestrationContext
  ): Promise<OrchestrationResponse> {
    try {
      // Add user message to history
      context.conversationHistory.push({
        role: 'user',
        content: userMessage,
      });

      // Get CRM data context
      const crmContext = await this.getCRMContext(context.userId);

      // Build system prompt with orchestration capabilities
      const systemPrompt = this.buildSystemPrompt(crmContext);

      // Call Claude for orchestration
      const response = await this.callClaude(systemPrompt, context.conversationHistory);

      // Parse response and determine if approval needed
      const orchestrationResponse = this.parseOrchestrationResponse(response);

      // Add assistant response to history
      context.conversationHistory.push({
        role: 'assistant',
        content: orchestrationResponse.message,
      });

      return orchestrationResponse;
    } catch (error: any) {
      console.error('AI Orchestration error:', error);
      throw new Error(`Orchestration failed: ${error.message}`);
    }
  }

  /**
   * Execute approved action
   */
  async executeApprovedAction(
    action: string,
    data: any,
    userId: string
  ): Promise<{ success: boolean; result: any }> {
    try {
      switch (action) {
        case 'create_campaign':
          return await this.createCampaign(data, userId);

        case 'send_email':
          return await this.sendEmail(data, userId);

        case 'create_segment':
          return await this.createSegment(data, userId);

        case 'schedule_campaign':
          return await this.scheduleCampaign(data, userId);

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error: any) {
      console.error('Action execution error:', error);
      return { success: false, result: error.message };
    }
  }

  /**
   * Build system prompt with orchestration capabilities
   */
  private buildSystemPrompt(crmContext: any): string {
    // Format sample data for better context
    const industriesBreakdown = crmContext.sampleCompanies
      .filter((c: any) => c.industry && c.industry.trim())
      .reduce((acc: any, c: any) => {
        acc[c.industry] = (acc[c.industry] || 0) + 1;
        return acc;
      }, {});

    const topIndustries = Object.entries(industriesBreakdown)
      .filter(([industry]) => industry && industry !== 'null' && industry !== 'undefined')
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 5)
      .map(([industry]) => industry)
      .join(', ') || 'Not specified';

    const sampleContactTitles = crmContext.sampleContacts
      .map((c: any) => c.title)
      .filter((t: any) => t && t.trim())
      .slice(0, 5)
      .join(', ') || 'Various roles';

    return `You are an intelligent CRM AI assistant. Your goal is to help users manage their CRM efficiently with direct, action-oriented responses.

**ZIETRA CRM — SYSTEM KNOWLEDGE:**

You are the Zietra AI Assistant. Zietra is a 100% web-based CRM and email marketing platform. No installation needed — just go to https://zietra.com and log in.

**CURRENT USER — RAJESH:**
- Email: rajesh@zietra.com
- Password: TechCloud@2025!
- Company: TechCloud Pro
- Contacts already imported: 18,373 contacts from ERP

**🚨🚨🚨 DECISION RULE — READ BEFORE EVERY RESPONSE 🚨🚨🚨**

EVERY campaign-related message falls into ONE of two buckets. Pick the right one:

BUCKET A — User mentions a SPECIFIC COMPANY NAME (e.g. "create campaign for Acme Corp", "send email to TechCorp"):
→ Use the orchestration flow: search DB → validate → generate → approval

BUCKET B — User asks HOW to use the product in general, WITHOUT a company name (e.g. "how do I create a campaign", "walk me through sending a campaign", "what are the steps", "guide me", "what do I click", "how to send", "I want to send an email to my contacts", "show me steps"):
→ DO NOT use orchestration flow. DO NOT say "tell me the company name". INSTEAD: output the FULL UI Walkthrough below, all 5 STEPS, word for word. No summarizing. No shortening.

❌ WRONG answer for Bucket B questions:
"To create a campaign, please provide the company name. I'll search the database..."
^ This is WRONG. The user is asking how to use the UI, not asking you to create one for them.

✅ CORRECT answer for Bucket B questions:
Output STEP 1 through STEP 5 of the UI walkthrough below, in full, no skipping.

This rule overrides EVERYTHING else including the "3-4 line" limit.

**HOW TO CREATE AND SEND AN EMAIL CAMPAIGN (step-by-step UI guide):**

STEP 1 — Open the Campaigns page:
Look at the LEFT SIDE of the screen. You will see a dark sidebar with menu items. Find the word "Campaigns" in that sidebar (it has a megaphone icon). Click it. The page will change and show your campaigns list.

STEP 2 — Start a new campaign:
Look at the TOP RIGHT of the Campaigns page. You will see a purple button that says "+ Create Campaign". Click that button. A big popup box will appear — this is the Campaign Wizard.

STEP 3 — Write Your Email (Step 1 of 3 in the wizard):
You will see a text box labeled "Describe your campaign". Type what your email is about in plain English. Example: "Offer 20% discount on IT staffing to our clients". Below the text box are 3 tone buttons: Professional, Friendly, Urgent. Click the one that fits best (it turns purple when selected). Now click the big button "✨ Write my email". Wait a few seconds — the AI will write the email for you. The RIGHT side of the popup will show a Subject Line and Email Body. You can edit them by clicking into them, or click "🔄 Regenerate" to get a new version. When happy, click "Next →" at the bottom right.

STEP 4 — Choose Who Gets It (Step 2 of 3):
You will see a grid of company tiles. Each tile shows a company name and how many contacts it has. Click the tiles for the companies you want to send to — they turn purple when selected. You can select more than one. At the bottom you will see "✅ X groups selected — Y contacts will receive this email". When done selecting, click "Next →" at the bottom right.

STEP 5 — Review and Send (Step 3 of 3):
You will see 4 summary boxes: Campaign Name (editable), Sending To (shows companies + total contacts), Subject Line, and From Address. Read everything carefully. When ready, click the big green button "🚀 Send Campaign to X People". The emails go out immediately. The wizard closes and you are back on the Campaigns page — your new campaign will show there with a Sent status.

DONE! To see open rates and click rates, click on the campaign name in the list.

**HOW TO IMPORT CONTACTS:**
1. Click "CRM Import" in the left sidebar
2. Click "Upload CSV"
3. Map your columns (First Name, Last Name, Email, Company, etc.)
4. Click Import — contacts appear immediately

**HOW TO USE LEAD DISCOVERY:**
1. Go to Contacts page
2. Click "Lead Discovery" button at the top
3. Enter industry, job title, or company name
4. The system finds and imports matching leads automatically

**WHEN ASKED ABOUT LOGIN/SETUP:**
Always say: it's web-based, go to https://zietra.com, log in with rajesh@zietra.com / TechCloud@2025!. No install needed.

---

**LIVE CRM DATABASE:**
- Companies: ${crmContext.companiesCount}
- Contacts: ${crmContext.contactsCount}
- Active Campaigns: ${crmContext.campaignsCount}
- Top Industries: ${topIndustries}

**🚨🚨🚨 CRITICAL RESPONSE FORMAT RULES - MUST FOLLOW 🚨🚨🚨**

YOUR RESPONSES MUST BE PLAIN TEXT - NEVER USE MARKDOWN CODE BLOCKS!

❌ NEVER EVER DO THIS:
"Campaign ready!

\`\`\`json
{
  "requiresApproval": true
}
\`\`\`"

✅ ALWAYS DO THIS INSTEAD:
Just write plain text responses. The system will automatically parse your intent and create the proper JSON structure for you.

When you want to trigger the approval workflow:
1. Write a clear, concise message explaining what you will create
2. The system automatically detects keywords like "Ready to add?" or "Ready to create?"
3. The system automatically shows approval buttons to the user
4. You do NOT need to return any JSON yourself

**🚨 CRITICAL ANTI-HALLUCINATION RULES - READ FIRST 🚨**

You have access to real-time function calling that queries the actual database. When you call a function and get results:

1. **USE ONLY THE EXACT DATA RETURNED** - Do NOT invent, guess, or make up ANY information
2. **IF THE FUNCTION RETURNS EMPTY** - Say "Not found in database" - do NOT create fake data
3. **COMPANY NAME** - Use the EXACT name from database response, not a modified version
4. **INDUSTRY** - Use the EXACT industry from database response, not what you think it should be
5. **CONTACTS** - Use the EXACT contact names and titles from database, NEVER invent people
6. **CONTACT COUNT** - If database says 0 contacts, say "No contacts found" - do NOT invent contacts

**EXAMPLE OF CORRECT BEHAVIOR:**

Function returns: {"company": {"name": "7 Nation", "industry": "Sporting Goods", "contacts": []}}

✅ CORRECT Response:
"Found 7 Nation (Sporting Goods) in database, but no contacts available. Should I look up contact information online?"

❌ WRONG Response (HALLUCINATION):
"Found 7 Nation Army LLC (Marketing) with 1 contact: Mitch Russo"
^ This is COMPLETELY INVENTED - company name wrong, industry wrong, fake contact

**IF YOU INVENT ANY DATA, YOU WILL CAUSE SERIOUS ERRORS IN THE CRM SYSTEM.**

**CORE BEHAVIORAL PRINCIPLES:**

1. **BE INTELLIGENT & CONTEXT-AWARE**
   - When user mentions a company name, IMMEDIATELY search CRM database
   - Use real company data (contacts, industry, website) from database
   - Make smart inferences from industry context
   - Only ask questions when information is truly missing

2. **BE DIRECT & CONCISE** (⚠️ EXCEPTION: How-to/walkthrough questions are exempt — give full step-by-step UI guide)
   - Maximum 3-4 lines per response (NOT for how-to questions — those get the full walkthrough)
   - No verbose explanations or long paragraphs
   - Get straight to the action
   - Provide clear next steps

3. **BE ACTION-ORIENTED**
   - Always include action buttons in suggestedActions array
   - Format: ["✓ Primary Action", "Option 2", "Cancel"]
   - Use requiresApproval:true for create/update/delete operations

**CAMPAIGN CREATION INTELLIGENCE:**

When user says "create campaign for [Company Name]":

STEP 1 - Search Database:
- Call searchCompanies function with the company name
- Wait for database response
- **USE EXACT DATA FROM RESPONSE** - do not modify or invent

STEP 2 - Validate Results:
- If company found with contacts → Use EXACT company name, industry, contact names from database
- If company found with 0 contacts → Say "Found [EXACT NAME] but no contacts. Add contacts first?"
- If company NOT found → Say "Not in database. Should I research it online?"
- **NEVER invent company names, industries, or contacts**

STEP 3 - Generate Campaign (only if contacts exist):
- Campaign name: Use EXACT company name from database + purpose
- Subject line: Professional, based on EXACT industry from database
- Content: Generate full HTML email using industry from database
- Target: Use EXACT contact IDs from database response

STEP 4 - Present with Approval:
Return this JSON structure:
{
  "message": "Campaign ready for [Company Name]\n\nSubject: [subject line]\nTargeting: X contacts ([titles])\n\nReady to add?",
  "requiresApproval": true,
  "approvalData": {
    "action": "create_campaign",
    "details": {
      "name": "[Campaign Name]",
      "subject": "[Subject Line]",
      "content": "<html>[COMPLETE HTML EMAIL]</html>",
      "contactIds": [array of contact IDs],
      "scheduled": false
    }
  },
  "suggestedActions": ["✓ Add to Campaigns", "Edit Content", "Cancel"]
}

**INDUSTRY-SPECIFIC INTELLIGENCE:**

Use these insights to craft relevant campaigns automatically:

- **Home Warranty/Insurance**: Focus on customer retention, claim efficiency, policy upgrades
- **Technology/SaaS**: Focus on innovation, ROI, integration capabilities
- **Manufacturing**: Focus on cost savings, efficiency, supply chain optimization
- **Retail/E-commerce**: Focus on customer experience, conversion rates, loyalty
- **Healthcare**: Focus on patient outcomes, compliance, operational efficiency
- **Financial Services**: Focus on security, returns, client trust

**RESPONSE RULES:**

✓ When company name is mentioned: Search CRM first, use real data
✓ Keep responses under 4 lines maximum
✓ Always provide 2-3 action buttons
✓ Generate COMPLETE email content (never partial/draft)
✓ Use requiresApproval:true for all create/update actions
✓ Be professional - minimal emojis (only in action buttons)

✗ Don't ask unnecessary questions - infer from context
✗ Don't show data snapshots unless specifically requested
✗ Don't use emoji overload (📊 🎯 ✅ everywhere)
✗ Don't give multiple-choice quizzes
✗ Don't say "I've created" - always use approval workflow

**EXAMPLE INTERACTION:**

User: "create campaign for America's Preferred Home Warranty"

Bad Response (verbose, asks questions):
"📊 Quick CRM Snapshot: 602 contacts...
Let's build something great! Tell me:
1️⃣ Main goal? A) Generate leads B) Nurture...
2️⃣ Target? Option 1: CEOs..."

Good Response (direct, intelligent):
"Campaign ready: Home Warranty Services Partnership

Subject: Enhancing Your Customer Experience with Proven Solutions
Targeting: 3 contacts (CEO, President, VP Marketing)

Ready to add to your campaigns?"

[Shows: "✓ Add to Campaigns" button]

**CRITICAL RULES:**

1. NEVER say "I've added" or "It's done" - always use requiresApproval:true
2. ALWAYS search CRM when company name is mentioned
3. ALWAYS generate COMPLETE HTML email content
4. Keep responses SHORT (3-4 lines maximum)
5. Provide clear action buttons for next steps
6. Use industry context to craft intelligent campaign content

Remember: You are a smart, efficient assistant. Be direct, be intelligent, take action.`;
  }

  /**
   * Call ChatGPT via OpenAI API (for chatbot ONLY)
   */
  private async callClaude(
    systemPrompt: string,
    conversationHistory: ChatMessage[]
  ): Promise<string> {
    try {
      // Build messages for ChatGPT (system message first, then conversation)
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...conversationHistory.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      ];

      // Call OpenAI API with GPT-4o for intelligent chatbot responses
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: messages,
        max_tokens: 4096,
        temperature: 0.3, // Lower temperature for more consistent outputs
      });

      return response.choices[0]?.message?.content || '';
    } catch (error: any) {
      console.error('OpenAI API error:', error);
      throw new Error(`Failed to call ChatGPT: ${error.message}`);
    }
  }

  /**
   * Parse Claude's response
   */
  private parseOrchestrationResponse(response: string): OrchestrationResponse {
    try {
      // Try to extract JSON from response - look for the LAST JSON block
      const jsonMatches = response.match(/\{[\s\S]*?\}/g);
      if (jsonMatches && jsonMatches.length > 0) {
        // Try parsing from the last JSON block (most likely to be the actual response)
        for (let i = jsonMatches.length - 1; i >= 0; i--) {
          try {
            const parsed = JSON.parse(jsonMatches[i]);
            // Check if this looks like a valid orchestration response
            if (parsed.message || parsed.requiresApproval !== undefined) {
              // Clean the message - remove any JSON blocks from it
              let cleanMessage = parsed.message || response;
              cleanMessage = cleanMessage.replace(/\{[\s\S]*?\}/g, '').trim();

              // If message is empty after removing JSON, extract text before first {
              if (!cleanMessage) {
                const textBeforeJson = response.split('{')[0].trim();
                cleanMessage = textBeforeJson || response;
              }

              return {
                message: cleanMessage,
                requiresApproval: parsed.requiresApproval || false,
                approvalData: parsed.approvalData,
                suggestedActions: parsed.suggestedActions || [],
                completed: parsed.completed || false,
              };
            }
          } catch (parseError) {
            // Try next JSON block
            continue;
          }
        }
      }

      // Fallback: No valid JSON found, return as plain message
      return {
        message: response,
        requiresApproval: false,
        completed: false,
      };
    } catch (error) {
      // If parsing fails, return as plain message
      return {
        message: response,
        requiresApproval: false,
        completed: false,
      };
    }
  }

  /**
   * Get CRM context for the user
   */
  private async getCRMContext(userId: string) {
    try {
      const [companiesCount, contactsCount, campaignsCount, recentActivitiesCount] = await Promise.all([
        prisma.company.count({ where: { userId } }),
        prisma.contact.count({ where: { userId } }),
        prisma.campaign.count({ where: { userId } }),
        prisma.activity.count({
          where: {
            userId,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
        }),
      ]);

      // Get sample companies and contacts for context
      const sampleCompanies = await prisma.company.findMany({
        where: { userId },
        take: 10,
        select: { name: true, industry: true },
      });

      const sampleContacts = await prisma.contact.findMany({
        where: { userId },
        take: 10,
        select: { firstName: true, lastName: true, title: true, company: { select: { name: true } } },
      });

      return {
        companiesCount,
        contactsCount,
        campaignsCount,
        recentActivitiesCount,
        sampleCompanies,
        sampleContacts,
      };
    } catch (error) {
      console.error('Error getting CRM context:', error);
      return {
        companiesCount: 0,
        contactsCount: 0,
        campaignsCount: 0,
        recentActivitiesCount: 0,
        sampleCompanies: [],
        sampleContacts: [],
      };
    }
  }

  /**
   * Create campaign based on AI orchestration
   */
  private async createCampaign(data: any, userId: string) {
    try {
      const campaign = await prisma.campaign.create({
        data: {
          name: data.name,
          subject: data.subject,
          htmlContent: data.content,
          textContent: data.textContent || data.content.replace(/<[^>]*>/g, ''),
          userId,
          status: data.scheduled ? 'SCHEDULED' : 'DRAFT',
          scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
        },
      });

      // If contacts specified, create email logs for campaign
      if (data.contactIds && data.contactIds.length > 0) {
        await prisma.emailLog.createMany({
          data: data.contactIds.map((contactId: string) => ({
            campaignId: campaign.id,
            contactId,
            status: 'PENDING',
          })),
        });
      }

      return {
        success: true,
        result: {
          campaignId: campaign.id,
          name: campaign.name,
          contactCount: data.contactIds?.length || 0,
        },
      };
    } catch (error: any) {
      console.error('Campaign creation error:', error);
      return {
        success: false,
        result: error.message,
      };
    }
  }

  /**
   * Send email via campaign
   */
  private async sendEmail(data: any, userId: string) {
    try {
      // Import email service
      const { EmailService } = await import('./google-smtp.service'); const emailService = new EmailService();

      const results = [];

      for (const recipient of data.recipients) {
        try {
          await emailService.sendEmail({
            to: [recipient.email],
            subject: data.subject,
            html: data.html,
          });

          results.push({ email: recipient.email, status: 'sent' });
        } catch (error) {
          results.push({ email: recipient.email, status: 'failed', error });
        }
      }

      return {
        success: true,
        result: {
          sent: results.filter(r => r.status === 'sent').length,
          failed: results.filter(r => r.status === 'failed').length,
          details: results,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        result: error.message,
      };
    }
  }

  /**
   * Create contact segment
   */
  private async createSegment(data: any, userId: string) {
    try {
      // Build filter based on segment criteria
      const where: any = { userId };

      if (data.industry) {
        where.company = { industry: data.industry };
      }

      if (data.title) {
        where.title = { contains: data.title, mode: 'insensitive' };
      }

      if (data.location) {
        where.location = { contains: data.location, mode: 'insensitive' };
      }

      const contacts = await prisma.contact.findMany({
        where,
        include: { company: true },
      });

      return {
        success: true,
        result: {
          segmentName: data.name,
          contactCount: contacts.length,
          contacts: contacts.slice(0, 10), // Preview first 10
        },
      };
    } catch (error: any) {
      return {
        success: false,
        result: error.message,
      };
    }
  }

  /**
   * Schedule campaign
   */
  private async scheduleCampaign(data: any, userId: string) {
    try {
      await prisma.campaign.update({
        where: { id: data.campaignId },
        data: {
          status: 'SCHEDULED',
          scheduledAt: new Date(data.scheduledAt),
        },
      });

      return {
        success: true,
        result: {
          campaignId: data.campaignId,
          scheduledAt: data.scheduledAt,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        result: error.message,
      };
    }
  }
}

export const chatbotOpenAI = new ChatbotOpenAI();

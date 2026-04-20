import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { chatbotOpenAI } from '../services/chatbot-openai.service';
import { prisma } from '../app';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

interface ChatSession {
  userId: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  createdAt: Date;
  lastActivity: Date;
}

// In-memory session storage (consider Redis for production)
const chatSessions = new Map<string, ChatSession>();

/**
 * POST /api/ai-chat/message
 * Send message to AI orchestrator
 */
router.post('/message', async (req, res, next) => {
  try {
    const { message, sessionId } = req.body;
    const userId = req.user!.id;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get or create session
    let session = chatSessions.get(sessionId);
    if (!session || session.userId !== userId) {
      session = {
        userId,
        conversationHistory: [],
        createdAt: new Date(),
        lastActivity: new Date(),
      };
      chatSessions.set(sessionId || userId, session);
    }

    // Update last activity
    session.lastActivity = new Date();

    // How-to intercept: return UI walkthrough ONLY for campaign/email-sending questions
    const campaignHowToPatterns = /\b(how (do i|to|can i)|walk me through|steps to|guide me|help me|show me how to)\b.*\b(campaign|send (a |an )?(campaign|email|bulk email|mass email)|create (a |an )?(campaign|email)|launch (a |an )?campaign)\b/i;
    const campaignHowToReverse = /\b(campaign|email campaign|send (a |an )?(campaign|email)|create (a |an )?(campaign|email))\b.*\b(how|steps|guide|walk me)\b/i;
    if (campaignHowToPatterns.test(message) || campaignHowToReverse.test(message)) {
      const walkthrough = `Here's exactly how to create and send a campaign — follow every step:

STEP 1 — Open the Campaigns page:
Look at the LEFT SIDE of the screen. You will see a dark sidebar with menu items. Find the word "Campaigns" in that sidebar (it has a megaphone icon next to it). Click it. The page will change and show your campaigns list.

STEP 2 — Start a new campaign:
Look at the TOP RIGHT of the Campaigns page. You will see a purple button that says "+ Create Campaign". Click that button. A big popup box will appear on the screen — this is the Campaign Wizard.

STEP 3 — Write Your Email (Step 1 of 3 in the wizard):
You will see a text box labeled "Describe your campaign". Type what your email is about in plain English — example: "Offer 20% discount on IT staffing services to our clients". Below the text box are 3 tone buttons: Professional, Friendly, Urgent. Click the one that fits best (it turns purple when selected). Now click the big button "✨ Write my email". Wait a few seconds — the AI will write the email for you. On the RIGHT side you will see a Subject Line and Email Body appear. You can click into them to edit, or click "🔄 Regenerate" for a new version. When happy, click "Next →" at the bottom right.

STEP 4 — Choose Who Gets It (Step 2 of 3 in the wizard):
You will now see a grid of company tiles. Each tile shows a company name and how many contacts it has. Click the tiles for the companies you want to send to — they turn purple when selected. You can pick more than one. At the bottom you will see "✅ X groups selected — Y contacts will receive this email". When done, click "Next →" at the bottom right.

STEP 5 — Review and Send (Step 3 of 3 in the wizard):
You will see 4 summary boxes: Campaign Name (editable), Sending To (companies + total contacts), Subject Line, and From Address. Read everything carefully. When ready, click the big green button "🚀 Send Campaign to X People". The emails go out immediately. The wizard closes and you are back on the Campaigns page — your campaign will appear there with a Sent status.

That's it! To check open rates and click rates later, click on the campaign name in the list.`;

      session.conversationHistory.push({ role: 'user', content: message });
      session.conversationHistory.push({ role: 'assistant', content: walkthrough });
      chatSessions.set(sessionId || userId, session);
      return res.json({ success: true, response: walkthrough, requiresApproval: false, completed: false, sessionId: sessionId || userId });
    }

    // Process request through AI orchestrator
    const response = await chatbotOpenAI.processRequest(message, {
      userId,
      conversationHistory: session.conversationHistory,
    });

    // Save updated session
    chatSessions.set(sessionId || userId, session);

    res.json({
      success: true,
      response: response.message,
      requiresApproval: response.requiresApproval,
      approvalData: response.approvalData,
      suggestedActions: response.suggestedActions,
      completed: response.completed,
      sessionId: sessionId || userId,
    });
  } catch (error: any) {
    console.error('[AI Chat] Error:', error);
    console.error('[AI Chat] Error stack:', error.stack);
    console.error('[AI Chat] Error details:', JSON.stringify(error, null, 2));
    res.status(500).json({
      success: false,
      error: 'AI processing failed',
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/ai-chat/approve
 * Approve and execute AI-suggested action
 */
router.post('/approve', async (req, res, next) => {
  try {
    const { action, data, sessionId } = req.body;
    const userId = req.user!.id;

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    // Verify session belongs to user
    const session = chatSessions.get(sessionId);
    if (!session || session.userId !== userId) {
      return res.status(403).json({ error: 'Invalid session' });
    }

    // Execute approved action
    const result = await chatbotOpenAI.executeApprovedAction(action, data, userId);

    // Add execution result to conversation history
    session.conversationHistory.push({
      role: 'assistant',
      content: `Action "${action}" executed. Result: ${JSON.stringify(result.result)}`,
    });

    res.json({
      success: result.success,
      result: result.result,
    });
  } catch (error: any) {
    console.error('[AI Chat] Approval error:', error);
    console.error('[AI Chat] Approval error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Action execution failed',
      details: error.message,
    });
  }
});

/**
 * DELETE /api/ai-chat/session/:sessionId
 * Clear chat session
 */
router.delete('/session/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user!.id;

    const session = chatSessions.get(sessionId);
    if (session && session.userId === userId) {
      chatSessions.delete(sessionId);
    }

    res.json({ success: true, message: 'Session cleared' });
  } catch (error: any) {
    console.error('[AI Chat] Session delete error:', error);
    next(error);
  }
});

/**
 * GET /api/ai-chat/history/:sessionId
 * Get chat history
 */
router.get('/history/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user!.id;

    const session = chatSessions.get(sessionId);
    if (!session || session.userId !== userId) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      success: true,
      history: session.conversationHistory,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
    });
  } catch (error: any) {
    console.error('[AI Chat] History error:', error);
    next(error);
  }
});

/**
 * POST /api/ai-chat/quick-action
 * Execute quick actions (pre-defined templates)
 */
router.post('/quick-action', async (req, res, next) => {
  try {
    const { actionType, params } = req.body;
    const userId = req.user!.id;

    const quickActions: Record<string, string> = {
      'create-campaign': `Create a new email campaign for ${params.segment || 'all contacts'} about ${params.topic || 'our latest updates'}`,
      'analyze-contacts': 'Analyze my contact database and suggest segmentation strategies',
      'email-template': `Generate an email template for ${params.purpose || 'general outreach'}`,
      'best-time': 'Suggest the best time to send my next campaign based on past performance',
    };

    const message = quickActions[actionType];
    if (!message) {
      return res.status(400).json({ error: 'Invalid quick action type' });
    }

    // Create new session for quick action
    const sessionId = `quick-${Date.now()}`;
    const session: ChatSession = {
      userId,
      conversationHistory: [],
      createdAt: new Date(),
      lastActivity: new Date(),
    };
    chatSessions.set(sessionId, session);

    // Process as regular message
    const response = await chatbotOpenAI.processRequest(message, {
      userId,
      conversationHistory: session.conversationHistory,
    });

    chatSessions.set(sessionId, session);

    res.json({
      success: true,
      response: response.message,
      requiresApproval: response.requiresApproval,
      approvalData: response.approvalData,
      sessionId,
    });
  } catch (error: any) {
    console.error('[AI Chat] Quick action error:', error);
    next(error);
  }
});

export default router;

/**
 * Sarah - Customer Support AI Employee
 *
 * Handles customer inquiries, complaints, refunds, and order issues.
 * Part of the Dollor.ai AI Employee system.
 *
 * @version 1.0.0
 */

const id = 'sarah';

const config = {
  name: 'Sarah',
  role: 'customer_support',
  department: 'support',
  version: '1.0.0',
  avatar: '👩‍💼',
  description: 'AI Customer Support Specialist for order issues, refunds, and general inquiries',
  capabilities: [
    'order_status_inquiry',
    'refund_processing',
    'complaint_handling',
    'account_assistance',
    'restaurant_info',
    'delivery_tracking'
  ],
  sla: {
    firstResponseMinutes: 2,
    resolutionMinutes: 15,
    satisfactionTarget: 4.5
  },
  escalationRules: {
    refundAmountLimit: 50,
    safetyIssues: 'immediate',
    legalThreats: 'compliance_bot',
    fraudSuspected: 'security_bot'
  },
  metrics: {
    trackResponseTime: true,
    trackResolutionTime: true,
    trackSatisfaction: true,
    trackEscalationRate: true
  }
};

/**
 * Get the system prompt for Sarah
 * @param {Object} context - Optional context for dynamic prompt generation
 * @returns {string} The system prompt
 */
function getPrompt(context = {}) {
  const basePrompt = `You are Sarah, an AI Customer Support Specialist for Dollor.ai food delivery platform.

## Your Role
You help customers with:
- Order status inquiries
- Missing or wrong item issues
- Refund requests (up to $${config.escalationRules.refundAmountLimit})
- Delivery delays and tracking
- Account problems
- Restaurant information

## Dollor.ai Business Model
- We are a MATCHMAKING SERVICE, not a delivery company
- Platform fee: $1 flat per order (customer) + $1 per order (restaurant)
- Drivers keep 100% of delivery fees and tips
- No percentage commission like DoorDash/Uber

## Response Guidelines
1. Be empathetic, professional, and solution-oriented
2. Always verify order details before taking action
3. Follow the refund decision matrix:
   - Order not delivered >30 min late: Offer $5 credit
   - Order not delivered >60 min late: Full refund + $5 credit
   - Missing item: Refund item cost
   - Wrong item: Refund + $3 credit
   - Entire order wrong: Full refund + $10 credit

## Escalation Triggers
- Safety concerns: Escalate immediately to human
- Legal threats: Escalate to compliance
- Fraud suspected: Escalate to security
- Refunds > $${config.escalationRules.refundAmountLimit}: Require approval

## Your Tone
- Friendly but professional
- Empathetic without being excessive
- Clear and concise
- Solution-focused`;

  // Add dynamic context if provided
  if (context.customerName) {
    return `${basePrompt}\n\nCurrent Customer: ${context.customerName}`;
  }

  if (context.orderId) {
    return `${basePrompt}\n\nCurrent Order ID: ${context.orderId}`;
  }

  return basePrompt;
}

/**
 * Health check for the employee module
 * @returns {Object} Health status
 */
async function healthCheck() {
  return {
    healthy: true,
    employeeId: id,
    name: config.name,
    version: config.version,
    timestamp: new Date().toISOString(),
    checks: {
      config: config !== undefined,
      prompt: typeof getPrompt === 'function',
      promptLength: getPrompt().length > 100
    }
  };
}

/**
 * Process a customer support request
 * @param {Object} request - The support request
 * @returns {Object} Processing result
 */
async function processRequest(request) {
  const { type, orderId, customerId, message } = request;

  // Determine action based on request type
  const actions = {
    order_status: 'Check order status and provide update',
    refund_request: 'Evaluate refund eligibility and process if approved',
    complaint: 'Acknowledge, investigate, and propose resolution',
    general_inquiry: 'Provide helpful information',
    escalation: 'Route to appropriate team'
  };

  return {
    employeeId: id,
    requestType: type,
    action: actions[type] || actions.general_inquiry,
    orderId,
    customerId,
    timestamp: new Date().toISOString(),
    metadata: {
      version: config.version,
      department: config.department
    }
  };
}

/**
 * Get employee statistics
 * @returns {Object} Current statistics
 */
function getStats() {
  return {
    employeeId: id,
    name: config.name,
    version: config.version,
    capabilities: config.capabilities,
    sla: config.sla,
    status: 'active'
  };
}

// Export all required fields and functions
module.exports = {
  id,
  config,
  getPrompt,
  healthCheck,
  processRequest,
  getStats
};

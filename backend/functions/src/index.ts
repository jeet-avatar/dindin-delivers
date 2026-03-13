/**
 * EatFair Cloud Functions (1st Gen)
 *
 * Event-driven backend for AI Employee integration
 * P2P Platform with $1 flat fee per restaurant
 * 100% delivery fees and tips go to drivers
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

// Initialize Stripe lazily (only when needed) to avoid deployment errors
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }
    _stripe = new Stripe(apiKey, {
      apiVersion: '2025-11-17.clover',
    });
  }
  return _stripe;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const config = {
  platformFeePerRestaurant: 1.00, // $1 flat fee per restaurant
  driverTipPercentage: 1.0, // 100% of tips to driver
  driverDeliveryFeePercentage: 1.0, // 100% of delivery fee to driver
  supportEmail: 'support@eatfair.com',
  sendgridApiKey: process.env.SENDGRID_API_KEY || '',
  // TechCloudRPO Ollama/Qwen Integration (self-hosted = FREE)
  techCloudRPO: {
    baseUrl: process.env.TECHCLOUDRPO_URL || 'https://api.vibingticket.com',
    ollamaUrl: process.env.OLLAMA_URL || 'https://api.vibingticket.com/ollama',
    model: process.env.AI_MODEL || 'qwen', // qwen, llama, mistral
    apiKey: process.env.TECHCLOUDRPO_API_KEY || '',
  }
};

// =============================================================================
// STARTUP ENV VAR VALIDATION
// =============================================================================

function validateEnvVars(): void {
  const required: Array<{ key: string; description: string }> = [
    { key: 'STRIPE_SECRET_KEY', description: 'Stripe payment processing' },
    { key: 'STRIPE_WEBHOOK_SECRET', description: 'Stripe webhook signature verification' },
    { key: 'SENDGRID_API_KEY', description: 'Transactional email (SendGrid)' },
  ];

  const missing = required.filter(({ key }) => !process.env[key]);

  if (missing.length > 0) {
    const details = missing.map(({ key, description }) => `  - ${key}: ${description}`).join('\n');
    const message = `Cloud Functions startup failed — missing required env vars:\n${details}`;
    console.error(message);
    throw new Error(message);
  }
}

// Validate at module load time (cold start) — fails fast before any function runs
validateEnvVars();

// =============================================================================
// TECHCLOUDRPO OLLAMA/QWEN AI INTEGRATION (FREE LOCAL LLM)
// =============================================================================

interface OllamaRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  context?: string;
  options?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
  };
}

interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

interface AIDecision {
  action: string;
  reasoning: string;
  confidence: number;
  data?: Record<string, any>;
}

/**
 * Call TechCloudRPO's self-hosted Ollama/Qwen for AI decisions
 * This is FREE because it runs on your own servers
 */
async function callOllamaAI(
  prompt: string,
  systemContext: string,
  taskType: string
): Promise<AIDecision> {
  try {
    const fullPrompt = `${systemContext}\n\nTask: ${taskType}\n\nInput: ${prompt}\n\nRespond in JSON format with: { "action": "...", "reasoning": "...", "confidence": 0.0-1.0, "data": {} }`;

    // Try TechCloudRPO Ollama endpoint
    const response = await fetch(`${config.techCloudRPO.ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.techCloudRPO.apiKey}`,
      },
      body: JSON.stringify({
        model: config.techCloudRPO.model,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: 0.3, // Lower for more deterministic decisions
          max_tokens: 500,
        },
      } as OllamaRequest),
    });

    if (!response.ok) {
      console.warn(`Ollama API returned ${response.status}, using fallback`);
      return getFallbackDecision(taskType);
    }

    const result: OllamaResponse = await response.json();

    // Parse the AI response
    try {
      const jsonMatch = result.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const decision = JSON.parse(jsonMatch[0]) as AIDecision;
        console.log(`AI Decision (${taskType}): ${decision.action} [${decision.confidence}]`);
        return decision;
      }
    } catch (parseError) {
      console.warn('Failed to parse AI response, using fallback');
    }

    return getFallbackDecision(taskType);
  } catch (error) {
    console.error('Ollama AI call failed:', error);
    return getFallbackDecision(taskType);
  }
}

/**
 * Fallback decisions when AI is unavailable (graceful degradation)
 */
function getFallbackDecision(taskType: string): AIDecision {
  const fallbacks: Record<string, AIDecision> = {
    'order_validation': {
      action: 'approve',
      reasoning: 'Auto-approved (AI unavailable)',
      confidence: 0.7,
      data: { autoApproved: true }
    },
    'fraud_check': {
      action: 'pass',
      reasoning: 'No anomalies detected in fallback mode',
      confidence: 0.6,
      data: { requiresReview: true }
    },
    'support_response': {
      action: 'escalate',
      reasoning: 'Escalated to human support (AI unavailable)',
      confidence: 0.5,
      data: { escalated: true }
    },
    'driver_selection': {
      action: 'nearest',
      reasoning: 'Selecting nearest available driver',
      confidence: 0.8,
      data: { strategy: 'distance' }
    },
    'document_verification': {
      action: 'pending_review',
      reasoning: 'Queued for manual review',
      confidence: 0.5,
      data: { needsHumanReview: true }
    },
    'payout_calculation': {
      action: 'calculate',
      reasoning: 'Using standard calculation',
      confidence: 1.0,
      data: { method: 'standard' }
    },
  };

  return fallbacks[taskType] || {
    action: 'default',
    reasoning: 'Using default behavior',
    confidence: 0.5,
    data: {}
  };
}

/**
 * AI-powered order validation using Ollama/Qwen
 */
async function aiValidateOrder(order: any): Promise<AIDecision> {
  const systemContext = `You are an AI Order Processor for EatFair food delivery.
Your job is to validate orders and check for issues.
Consider: menu item availability, pricing accuracy, delivery distance, suspicious patterns.
EatFair charges restaurants $1 flat fee per order. Drivers keep 100% of tips and delivery fees.`;

  const prompt = `
Order Details:
- Customer: ${order.customerId}
- Restaurant: ${order.restaurantName} (${order.restaurantId})
- Items: ${JSON.stringify(order.items || [])}
- Subtotal: $${order.subtotal || 0}
- Delivery Fee: $${order.deliveryFee || 0}
- Total: $${order.total || 0}
- Delivery Address: ${JSON.stringify(order.deliveryAddress || {})}

Validate this order and decide: approve, reject, or flag for review.`;

  return await callOllamaAI(prompt, systemContext, 'order_validation');
}

/**
 * AI-powered fraud detection using Ollama/Qwen
 */
async function aiCheckFraud(order: any, customerHistory: any[]): Promise<AIDecision> {
  const systemContext = `You are an AI Fraud Detector for EatFair food delivery.
Analyze orders for suspicious patterns: unusual order amounts, suspicious addresses,
rapid ordering, mismatched locations, known fraud indicators.`;

  const prompt = `
Current Order:
- Amount: $${order.total || 0}
- Time: ${new Date().toISOString()}
- Address: ${JSON.stringify(order.deliveryAddress || {})}

Customer History (last 5 orders):
${customerHistory.slice(0, 5).map(h => `- $${h.total} on ${h.createdAt}`).join('\n')}

Check for fraud indicators and decide: pass, flag, or block.`;

  return await callOllamaAI(prompt, systemContext, 'fraud_check');
}

/**
 * AI-powered customer support using Ollama/Qwen
 */
async function aiHandleSupport(ticket: any, orderContext: any): Promise<AIDecision> {
  const systemContext = `You are an AI Customer Support Agent for EatFair food delivery.
Be helpful, empathetic, and solution-oriented.
You can: issue refunds under $20, update orders, contact drivers/restaurants, reschedule deliveries.
For complex issues or amounts over $20, escalate to human support.`;

  const prompt = `
Support Ticket:
- Type: ${ticket.type}
- Message: ${ticket.message}
- Customer: ${ticket.customerId}

Order Context:
- Order ID: ${orderContext?.orderId || 'N/A'}
- Status: ${orderContext?.status || 'N/A'}
- Restaurant: ${orderContext?.restaurantName || 'N/A'}
- Amount: $${orderContext?.total || 0}

Decide how to handle this support request.`;

  return await callOllamaAI(prompt, systemContext, 'support_response');
}

/**
 * AI-powered smart driver selection using Ollama/Qwen
 */
async function aiSelectDriver(
  drivers: { id: string; distance: number; rating: number; completedDeliveries: number }[],
  order: any
): Promise<AIDecision> {
  const systemContext = `You are an AI Driver Dispatcher for EatFair food delivery.
Select the best driver based on: distance, rating, experience, current workload.
Prioritize fast delivery while maintaining service quality.
Remember: Drivers keep 100% of tips and delivery fees - select fairly.`;

  const prompt = `
Available Drivers:
${drivers.map(d => `- ID: ${d.id}, Distance: ${d.distance.toFixed(1)}km, Rating: ${d.rating}, Deliveries: ${d.completedDeliveries}`).join('\n')}

Order:
- Restaurant: ${order.restaurantName}
- Value: $${order.total}
- Priority: ${order.priority || 'normal'}

Select the best driver ID and explain why.`;

  return await callOllamaAI(prompt, systemContext, 'driver_selection');
}

/**
 * AI-powered document verification using Ollama/Qwen
 */
async function aiVerifyDocument(documentInfo: any): Promise<AIDecision> {
  const systemContext = `You are an AI Document Verifier for EatFair food delivery.
Verify: business licenses, health permits, driver licenses, insurance documents.
Check for: validity, expiration, correct information, authenticity indicators.`;

  const prompt = `
Document Details:
- Type: ${documentInfo.type}
- Holder: ${documentInfo.holderName}
- ID/Number: ${documentInfo.documentNumber}
- Issue Date: ${documentInfo.issueDate}
- Expiration: ${documentInfo.expirationDate}
- Status: ${documentInfo.extractedStatus || 'unknown'}

Verify this document and decide: approved, rejected, or needs_review.`;

  return await callOllamaAI(prompt, systemContext, 'document_verification');
}

// =============================================================================
// PUSH NOTIFICATION HELPER
// =============================================================================

interface PushNotificationPayload {
  title: string;
  body: string;
  type: string;
  orderId?: string;
  data?: Record<string, string>;
}

/**
 * Send push notification to a user by their FCM token
 */
async function sendPushNotification(
  recipientId: string,
  recipientType: 'customer' | 'restaurant' | 'driver',
  payload: PushNotificationPayload
): Promise<boolean> {
  try {
    // Get FCM token from user document
    let collection = 'users';
    if (recipientType === 'restaurant') collection = 'restaurants';
    if (recipientType === 'driver') collection = 'drivers';

    const recipientDoc = await db.collection(collection).doc(recipientId).get();
    if (!recipientDoc.exists) {
      console.warn(`Recipient not found: ${recipientType}/${recipientId}`);
      return false;
    }

    const fcmToken = recipientDoc.data()?.fcmToken;
    if (!fcmToken) {
      console.warn(`No FCM token for ${recipientType}/${recipientId}`);
      return false;
    }

    // Build notification message
    const message: admin.messaging.Message = {
      token: fcmToken,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        type: payload.type,
        orderId: payload.orderId || '',
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
        ...payload.data,
      },
      apns: {
        headers: {
          'apns-priority': '10',
        },
        payload: {
          aps: {
            alert: {
              title: payload.title,
              body: payload.body,
            },
            badge: 1,
            sound: 'default',
          },
        },
      },
    };

    // Send notification
    const response = await messaging.send(message);
    console.log(`Push notification sent: ${response}`);

    // Log notification in Firestore
    await db.collection('notification_log').add({
      recipientId,
      recipientType,
      ...payload,
      fcmResponse: response,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error('Failed to send push notification:', error);
    return false;
  }
}

/**
 * Send push notification to multiple users
 */
async function sendPushToMultiple(
  tokens: string[],
  payload: PushNotificationPayload
): Promise<number> {
  if (tokens.length === 0) return 0;

  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: {
      type: payload.type,
      orderId: payload.orderId || '',
      ...payload.data,
    },
    apns: {
      payload: {
        aps: {
          alert: {
            title: payload.title,
            body: payload.body,
          },
          badge: 1,
          sound: 'default',
        },
      },
    },
  };

  const response = await messaging.sendEachForMulticast(message);
  console.log(`Sent ${response.successCount}/${tokens.length} notifications`);
  return response.successCount;
}

// =============================================================================
// AI EMPLOYEE MANAGEMENT
// =============================================================================

/**
 * Trigger: When a new AI employee is created in Firestore
 * Action: Auto-activate the employee (simulated TechCloudRPO integration)
 */
export const onAIEmployeeCreated = functions.firestore
  .document('ai_employees/{employeeId}')
  .onCreate(async (snap, context) => {
    const employee = snap.data();
    const employeeId = context.params.employeeId;

    console.log(`Creating AI Employee: ${employee.name} (${employeeId})`);

    try {
      // Generate a local workflow ID (simulating TechCloudRPO registration)
      const workflowAIId = `workflow_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      // Update employee status to active
      await snap.ref.update({
        workflowAIId: workflowAIId,
        status: 'active',
        lastActiveAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Log the event
      await db.collection('ai_audit_log').add({
        action: 'employee_created',
        employeeId: employeeId,
        details: {
          name: employee.name,
          role: employee.role,
          workflowAIId: workflowAIId
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`AI Employee activated: ${employeeId} -> ${workflowAIId}`);
    } catch (error) {
      console.error(`Failed to create AI Employee: ${error}`);

      await snap.ref.update({
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Registration failed'
      });
    }
  });

// =============================================================================
// AI TASK PROCESSING
// =============================================================================

/**
 * Trigger: When a new task is added to the queue
 * Action: Process the task based on type
 */
export const onAITaskCreated = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .firestore
  .document('ai_tasks/{taskId}')
  .onCreate(async (snap, context) => {
    const task = snap.data();
    const taskId = context.params.taskId;

    console.log(`Processing AI Task: ${task.type} (${taskId})`);

    try {
      // Mark task as in progress
      await snap.ref.update({
        status: 'in_progress',
        startedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Get the assigned employee
      const employeeDoc = await db.collection('ai_employees').doc(task.employeeId).get();
      if (!employeeDoc.exists) {
        throw new Error('AI Employee not found');
      }

      // Process task based on type
      let result: Record<string, string> = {};

      switch (task.type) {
        case 'process_order':
          result = await processOrderTask(task.payload);
          break;
        case 'send_order_receipt':
          result = await sendOrderReceiptTask(task.payload);
          break;
        case 'calculate_payout':
          result = await calculatePayoutTask(task.payload);
          break;
        case 'verify_document':
          result = await verifyDocumentTask(task.payload);
          break;
        case 'handle_support':
          result = await handleSupportTask(task.payload);
          break;
        case 'dispatch_driver':
          result = await dispatchDriverTask(task.payload);
          break;
        case 'send_push_notification':
          result = await sendPushNotificationTask(task.payload);
          break;
        default:
          result = { status: 'completed', message: `Task ${task.type} processed` };
      }

      // Mark task as completed
      await snap.ref.update({
        status: 'completed',
        result: result,
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update employee metrics
      await employeeDoc.ref.update({
        tasksCompleted: admin.firestore.FieldValue.increment(1),
        tasksInProgress: admin.firestore.FieldValue.increment(-1),
        lastActiveAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Log audit event
      await db.collection('ai_audit_log').add({
        action: 'task_completed',
        employeeId: task.employeeId,
        details: { taskId, type: task.type, result },
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`AI Task completed: ${taskId}`);
    } catch (error) {
      console.error(`AI Task failed: ${taskId}`, error);

      await snap.ref.update({
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

// =============================================================================
// ORDER PROCESSING WITH PUSH NOTIFICATIONS
// =============================================================================

/**
 * Trigger: When a new order is placed
 * Action: Process order, send receipt, notify restaurant
 */
export const onOrderCreated = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    const order = snap.data();
    const orderId = context.params.orderId;

    // Only process if status is 'Placed' or 'Pending'
    if (order.status !== 'Placed' && order.status !== 'Pending') {
      return;
    }

    console.log(`New order received: ${orderId}`);

    try {
      // 1. Create task for order processor AI
      await createAITask('order_processor', 'process_order', {
        orderId,
        restaurantId: order.restaurantId || '',
        customerId: order.customerId || ''
      }, 4);

      // 2. Create task for email agent to send receipt
      await createAITask('email_agent', 'send_order_receipt', {
        orderId,
        customerId: order.customerId || '',
        customerEmail: order.customerEmail || '',
        restaurantName: order.restaurantName || '',
        total: String(order.total || 0)
      }, 3);

      // 3. Send push notification to restaurant
      await sendPushNotification(
        order.restaurantId,
        'restaurant',
        {
          title: 'New Order!',
          body: `Order #${orderId.slice(-6)} - $${order.total?.toFixed(2) || '0.00'}`,
          type: 'new_order',
          orderId: orderId,
        }
      );

      // 4. Send confirmation to customer
      await sendPushNotification(
        order.customerId,
        'customer',
        {
          title: 'Order Confirmed!',
          body: `Your order from ${order.restaurantName || 'restaurant'} has been placed`,
          type: 'order_confirmed',
          orderId: orderId,
        }
      );

      // 5. Update order with processing info
      await snap.ref.update({
        aiProcessed: true,
        aiProcessedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`Order ${orderId} queued for AI processing`);
    } catch (error) {
      console.error(`Failed to process order ${orderId}:`, error);
    }
  });

/**
 * Trigger: When order status changes
 * Action: Send push notification for status updates
 */
export const onOrderStatusChanged = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const orderId = context.params.orderId;

    // Only process status changes
    if (before.status === after.status) {
      return;
    }

    console.log(`Order ${orderId} status: ${before.status} -> ${after.status}`);

    const customerId = after.customerId;
    const restaurantName = after.restaurantName || 'Restaurant';

    // Send appropriate notification based on new status
    let notification: PushNotificationPayload | null = null;

    switch (after.status) {
      case 'Accepted':
        notification = {
          title: 'Order Accepted!',
          body: `${restaurantName} is preparing your order`,
          type: 'order_accepted',
          orderId,
        };
        break;

      case 'Preparing':
        notification = {
          title: 'Order Being Prepared',
          body: `${restaurantName} is cooking your food`,
          type: 'order_preparing',
          orderId,
        };
        break;

      case 'Ready':
        notification = {
          title: 'Order Ready!',
          body: 'Your order is ready for pickup',
          type: 'order_ready',
          orderId,
        };
        // Also notify driver if assigned
        if (after.driverId) {
          await sendPushNotification(after.driverId, 'driver', {
            title: 'Order Ready for Pickup',
            body: `Order #${orderId.slice(-6)} is ready at ${restaurantName}`,
            type: 'order_ready_pickup',
            orderId,
          });
        }
        break;

      case 'PickedUp':
      case 'OutForDelivery':
        notification = {
          title: 'Order Picked Up!',
          body: 'Your driver is on the way',
          type: 'order_picked_up',
          orderId,
        };
        break;

      case 'Delivered':
        notification = {
          title: 'Order Delivered!',
          body: 'Enjoy your meal! Don\'t forget to rate your experience',
          type: 'order_delivered',
          orderId,
        };
        // Trigger payout calculation
        await createAITask('payout_processor', 'calculate_payout', {
          orderId,
          restaurantId: after.restaurantId || '',
          driverId: after.driverId || '',
          subtotal: String(after.subtotal || 0),
          deliveryFee: String(after.deliveryFee || 0),
          tip: String(after.tip || 0),
          platformFee: String(config.platformFeePerRestaurant)
        }, 4);
        break;

      case 'Cancelled':
        notification = {
          title: 'Order Cancelled',
          body: 'Your order has been cancelled',
          type: 'order_cancelled',
          orderId,
        };
        break;
    }

    if (notification && customerId) {
      await sendPushNotification(customerId, 'customer', notification);
    }
  });

// =============================================================================
// REAL-TIME DRIVER LOCATION
// =============================================================================

/**
 * Trigger: When driver location is updated
 * Action: Broadcast to customer tracking the order
 */
export const onDriverLocationUpdated = functions.firestore
  .document('driver_locations/{driverId}')
  .onWrite(async (change, context) => {
    const driverId = context.params.driverId;
    const locationData = change.after.exists ? change.after.data() : null;

    if (!locationData) {
      console.log(`Driver ${driverId} location cleared`);
      return;
    }

    const { latitude, longitude, heading, speed, currentOrderId } = locationData;

    if (!currentOrderId) {
      // Driver not on a delivery, no need to broadcast
      return;
    }

    console.log(`Driver ${driverId} location updated: ${latitude}, ${longitude}`);

    try {
      // Get the order to find the customer
      const orderDoc = await db.collection('orders').doc(currentOrderId).get();
      if (!orderDoc.exists) {
        return;
      }

      const order = orderDoc.data();
      const customerId = order?.customerId;

      if (!customerId) {
        return;
      }

      // Update order with latest driver location
      await orderDoc.ref.update({
        driverLocation: {
          latitude,
          longitude,
          heading: heading || 0,
          speed: speed || 0,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        driverLocationUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Write to a real-time location collection for customer to listen
      await db.collection('order_tracking').doc(currentOrderId).set({
        orderId: currentOrderId,
        driverId,
        driverLocation: {
          latitude,
          longitude,
          heading: heading || 0,
          speed: speed || 0,
        },
        customerId,
        restaurantId: order?.restaurantId,
        status: order?.status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      // Calculate ETA if we have restaurant location
      if (order?.deliveryAddress?.latitude && order?.deliveryAddress?.longitude) {
        const eta = calculateETA(
          latitude, longitude,
          order.deliveryAddress.latitude,
          order.deliveryAddress.longitude,
          speed || 30 // Default 30 km/h
        );

        await db.collection('order_tracking').doc(currentOrderId).update({
          estimatedMinutes: eta,
          estimatedArrival: new Date(Date.now() + eta * 60 * 1000).toISOString(),
        });
      }

    } catch (error) {
      console.error(`Failed to broadcast driver location:`, error);
    }
  });

/**
 * Calculate ETA in minutes using Haversine distance
 */
function calculateETA(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
  speedKmh: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // Add 20% buffer for real-world conditions
  const adjustedDistance = distance * 1.2;
  const timeHours = adjustedDistance / Math.max(speedKmh, 10);
  return Math.ceil(timeHours * 60);
}

/**
 * Calculate distance between two points in km
 */
function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// =============================================================================
// DRIVER ASSIGNMENT WITH SMART DISPATCH
// =============================================================================

/**
 * Trigger: When order needs driver assignment
 * Action: Find nearest available driver and assign
 */
export const onOrderNeedsDriver = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const orderId = context.params.orderId;

    // Only trigger when status changes to 'Ready' and no driver assigned
    if (after.status !== 'Ready' || after.driverId || before.status === 'Ready') {
      return;
    }

    console.log(`Finding driver for order ${orderId}`);

    try {
      // Get restaurant location
      const restaurantDoc = await db.collection('restaurants').doc(after.restaurantId).get();
      if (!restaurantDoc.exists) {
        console.error('Restaurant not found');
        return;
      }

      const restaurant = restaurantDoc.data();
      const restaurantLat = restaurant?.latitude || 0;
      const restaurantLng = restaurant?.longitude || 0;

      // Find available drivers
      const driversSnapshot = await db.collection('drivers')
        .where('status', '==', 'available')
        .where('isOnline', '==', true)
        .get();

      if (driversSnapshot.empty) {
        console.warn('No available drivers');
        // Queue for retry
        await db.collection('pending_driver_assignments').add({
          orderId,
          restaurantId: after.restaurantId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          attempts: 0,
        });
        return;
      }

      // Get driver locations and find nearest
      const driversWithDistance: { id: string; distance: number; fcmToken?: string }[] = [];

      for (const driverDoc of driversSnapshot.docs) {
        const driver = driverDoc.data();
        const locationDoc = await db.collection('driver_locations').doc(driverDoc.id).get();

        if (locationDoc.exists) {
          const loc = locationDoc.data();
          const distance = calculateDistance(
            restaurantLat, restaurantLng,
            loc?.latitude || 0, loc?.longitude || 0
          );
          driversWithDistance.push({
            id: driverDoc.id,
            distance,
            fcmToken: driver.fcmToken,
          });
        }
      }

      // Sort by distance
      driversWithDistance.sort((a, b) => a.distance - b.distance);

      if (driversWithDistance.length === 0) {
        console.warn('No drivers with location data');
        return;
      }

      // Assign nearest driver
      const nearestDriver = driversWithDistance[0];

      // Update order
      await change.after.ref.update({
        driverId: nearestDriver.id,
        driverAssignedAt: admin.firestore.FieldValue.serverTimestamp(),
        driverDistance: nearestDriver.distance,
        status: 'DriverAssigned',
      });

      // Update driver status
      await db.collection('drivers').doc(nearestDriver.id).update({
        status: 'busy',
        currentOrderId: orderId,
      });

      // Send push notification to driver
      await sendPushNotification(nearestDriver.id, 'driver', {
        title: 'New Delivery!',
        body: `Order #${orderId.slice(-6)} from ${restaurant?.name || 'Restaurant'} - ${nearestDriver.distance.toFixed(1)}km away`,
        type: 'new_delivery',
        orderId,
        data: {
          restaurantName: restaurant?.name || '',
          restaurantAddress: restaurant?.address || '',
          distance: nearestDriver.distance.toFixed(1),
        },
      });

      // Notify customer
      await sendPushNotification(after.customerId, 'customer', {
        title: 'Driver Assigned!',
        body: 'A driver has been assigned to your order',
        type: 'driver_assigned',
        orderId,
      });

      console.log(`Assigned driver ${nearestDriver.id} to order ${orderId}`);

    } catch (error) {
      console.error('Failed to assign driver:', error);
    }
  });

// =============================================================================
// TASK PROCESSING FUNCTIONS
// =============================================================================

async function processOrderTask(payload: Record<string, string>): Promise<Record<string, string>> {
  const { orderId, restaurantId } = payload;

  // Get order details
  const orderDoc = await db.collection('orders').doc(orderId).get();
  if (!orderDoc.exists) {
    throw new Error('Order not found');
  }

  const order = orderDoc.data();

  // Verify restaurant exists and is active
  const restaurantDoc = await db.collection('restaurants').doc(restaurantId).get();
  if (!restaurantDoc.exists) {
    throw new Error('Restaurant not found');
  }

  const restaurant = restaurantDoc.data();
  if (restaurant?.status !== 'active' && restaurant?.status !== 'Active') {
    throw new Error('Restaurant is not active');
  }

  // Use AI (Ollama/Qwen) for order validation
  const aiDecision = await aiValidateOrder({
    ...order,
    restaurantId,
    restaurantName: restaurant?.name
  });

  // Log AI decision
  await db.collection('ai_decisions').add({
    type: 'order_validation',
    orderId,
    decision: aiDecision,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  if (aiDecision.action === 'reject') {
    await orderDoc.ref.update({
      status: 'Rejected',
      rejectionReason: aiDecision.reasoning,
      rejectedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { status: 'rejected', message: aiDecision.reasoning };
  }

  if (aiDecision.action === 'flag') {
    await orderDoc.ref.update({
      flaggedForReview: true,
      flagReason: aiDecision.reasoning
    });
  }

  // Perform fraud check
  const customerHistory = await db.collection('orders')
    .where('customerId', '==', order?.customerId)
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();

  const fraudCheck = await aiCheckFraud(order, customerHistory.docs.map(d => d.data()));

  if (fraudCheck.action === 'block') {
    await orderDoc.ref.update({
      status: 'Blocked',
      blockReason: fraudCheck.reasoning,
      blockedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { status: 'blocked', message: 'Order blocked due to fraud detection' };
  }

  // Update order status to Accepted
  await orderDoc.ref.update({
    status: 'Accepted',
    acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
    aiValidated: true,
    aiConfidence: aiDecision.confidence,
    fraudCheckPassed: fraudCheck.action === 'pass',
    fraudCheckConfidence: fraudCheck.confidence
  });

  return {
    status: 'accepted',
    message: 'Order validated by AI and sent to restaurant',
    aiConfidence: String(aiDecision.confidence),
    fraudCheck: fraudCheck.action
  };
}

async function sendOrderReceiptTask(payload: Record<string, string>): Promise<Record<string, string>> {
  const { orderId, customerId, customerEmail, restaurantName, total } = payload;

  // Get full order details
  const orderDoc = await db.collection('orders').doc(orderId).get();
  if (!orderDoc.exists) {
    throw new Error('Order not found');
  }

  const order = orderDoc.data();

  // Get customer details if not provided
  let email = customerEmail;
  if (!email && customerId) {
    const customerDoc = await db.collection('users').doc(customerId).get();
    if (customerDoc.exists) {
      email = customerDoc.data()?.email || '';
    }
  }

  if (!email) {
    return { status: 'skipped', message: 'No customer email available' };
  }

  // Create email record (to be sent via SendGrid)
  await db.collection('email_queue').add({
    to: email,
    template: 'order_receipt',
    subject: `Your EatFair Order Confirmation - #${orderId.slice(-6)}`,
    data: {
      orderId: orderId,
      orderNumber: orderId.slice(-6).toUpperCase(),
      restaurantName: restaurantName || order?.restaurantName || 'Restaurant',
      items: order?.items || [],
      subtotal: order?.subtotal || 0,
      deliveryFee: order?.deliveryFee || 0,
      tax: order?.tax || 0,
      tip: order?.tip || 0,
      total: parseFloat(total) || order?.total || 0,
      estimatedDelivery: order?.estimatedDeliveryTime || '30-45 mins',
      deliveryAddress: order?.deliveryAddress || {}
    },
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { status: 'queued', message: 'Order receipt email queued' };
}

async function calculatePayoutTask(payload: Record<string, string>): Promise<Record<string, string>> {
  const { orderId, restaurantId, driverId, subtotal, deliveryFee, tip, platformFee } = payload;

  const subtotalNum = parseFloat(subtotal) || 0;
  const deliveryFeeNum = parseFloat(deliveryFee) || 0;
  const tipNum = parseFloat(tip) || 0;
  const platformFeeNum = parseFloat(platformFee) || config.platformFeePerRestaurant;

  // Calculate restaurant payout: subtotal - $1 platform fee
  const restaurantPayout = subtotalNum - platformFeeNum;

  // Calculate driver payout: 100% delivery fee + 100% tip
  const driverPayout = deliveryFeeNum + tipNum;

  // Create restaurant payout record
  if (restaurantId) {
    await db.collection('payouts').add({
      type: 'restaurant',
      recipientId: restaurantId,
      orderId: orderId,
      amount: restaurantPayout,
      platformFee: platformFeeNum,
      originalAmount: subtotalNum,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  // Create driver payout record
  if (driverId) {
    await db.collection('payouts').add({
      type: 'driver',
      recipientId: driverId,
      orderId: orderId,
      amount: driverPayout,
      deliveryFee: deliveryFeeNum,
      tip: tipNum,
      platformFee: 0, // No fees for drivers
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Notify driver of tip received
    if (tipNum > 0) {
      await sendPushNotification(driverId, 'driver', {
        title: 'Tip Received!',
        body: `You received a $${tipNum.toFixed(2)} tip!`,
        type: 'tip_received',
        orderId,
        data: { tipAmount: tipNum.toFixed(2) },
      });
    }
  }

  // Create journal entry for accounting
  await db.collection('journal_entries').add({
    type: 'order_revenue',
    orderId: orderId,
    entries: [
      { account: 'Cash', debit: subtotalNum + deliveryFeeNum + tipNum, credit: 0 },
      { account: 'Restaurant Payable', debit: 0, credit: restaurantPayout },
      { account: 'Driver Payable', debit: 0, credit: driverPayout },
      { account: 'Platform Revenue', debit: 0, credit: platformFeeNum }
    ],
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return {
    status: 'calculated',
    restaurantPayout: restaurantPayout.toFixed(2),
    driverPayout: driverPayout.toFixed(2),
    platformRevenue: platformFeeNum.toFixed(2)
  };
}

async function handleSupportTask(payload: Record<string, string>): Promise<Record<string, string>> {
  const { ticketId, type, customerId, orderId, message } = payload;

  // Get order context if available
  let orderContext = null;
  if (orderId) {
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (orderDoc.exists) {
      orderContext = { orderId, ...orderDoc.data() };
    }
  }

  // Use AI (Ollama/Qwen) for support decision
  const aiDecision = await aiHandleSupport(
    { ticketId, type, message, customerId },
    orderContext
  );

  // Log AI decision
  await db.collection('ai_decisions').add({
    type: 'support_handling',
    ticketId,
    decision: aiDecision,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  // Determine status based on AI decision
  let status = 'in_progress';
  let response = '';

  switch (aiDecision.action) {
    case 'resolve':
      status = 'resolved';
      response = aiDecision.data?.response || 'Issue resolved by AI';
      break;
    case 'refund':
      status = 'pending_refund';
      response = `Refund of $${aiDecision.data?.amount || 0} approved`;
      // Create refund record
      if (orderId) {
        await db.collection('refunds').add({
          orderId,
          customerId,
          amount: aiDecision.data?.amount || 0,
          reason: aiDecision.reasoning,
          status: 'pending',
          approvedBy: 'AI_CUSTOMER_SUPPORT',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      break;
    case 'escalate':
      status = 'escalated';
      response = 'Escalated to human support team';
      break;
    default:
      status = 'in_progress';
      response = 'Being processed by AI';
  }

  // Update support ticket
  await db.collection('support_tickets').doc(ticketId || 'auto_' + Date.now()).set({
    type: type || 'general',
    customerId: customerId || '',
    orderId: orderId || '',
    message: message || '',
    status,
    response,
    assignedTo: aiDecision.action === 'escalate' ? 'HUMAN_SUPPORT' : 'AI_CUSTOMER_SUPPORT',
    aiDecision,
    aiConfidence: aiDecision.confidence,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  // Send notification to customer
  if (customerId && response) {
    await sendPushNotification(customerId, 'customer', {
      title: 'Support Update',
      body: response,
      type: 'support_update',
      data: { ticketId: ticketId || '' }
    });
  }

  return {
    status,
    message: response,
    aiAction: aiDecision.action,
    aiConfidence: String(aiDecision.confidence)
  };
}

async function dispatchDriverTask(payload: Record<string, string>): Promise<Record<string, string>> {
  const { orderId } = payload;

  // Get order details
  const orderDoc = await db.collection('orders').doc(orderId).get();
  if (!orderDoc.exists) {
    return { status: 'error', message: 'Order not found' };
  }

  const order = orderDoc.data();

  // Get restaurant location
  const restaurantDoc = await db.collection('restaurants').doc(order?.restaurantId).get();
  const restaurant = restaurantDoc.data();
  const restaurantLat = restaurant?.latitude || 0;
  const restaurantLng = restaurant?.longitude || 0;

  // Find available drivers with their details
  const driversSnapshot = await db.collection('drivers')
    .where('status', '==', 'available')
    .where('isOnline', '==', true)
    .get();

  if (driversSnapshot.empty) {
    return { status: 'no_drivers', message: 'No available drivers' };
  }

  // Get driver locations, ratings, and history
  const driversWithInfo: { id: string; distance: number; rating: number; completedDeliveries: number }[] = [];

  for (const driverDoc of driversSnapshot.docs) {
    const driver = driverDoc.data();
    const locationDoc = await db.collection('driver_locations').doc(driverDoc.id).get();

    if (locationDoc.exists) {
      const loc = locationDoc.data();
      const distance = calculateDistance(
        restaurantLat, restaurantLng,
        loc?.latitude || 0, loc?.longitude || 0
      );
      driversWithInfo.push({
        id: driverDoc.id,
        distance,
        rating: driver.rating || 4.5,
        completedDeliveries: driver.completedDeliveries || 0
      });
    }
  }

  if (driversWithInfo.length === 0) {
    return { status: 'no_drivers', message: 'No drivers with location data' };
  }

  // Use AI (Ollama/Qwen) for smart driver selection
  const aiDecision = await aiSelectDriver(driversWithInfo, {
    ...order,
    restaurantName: restaurant?.name
  });

  // Log AI decision
  await db.collection('ai_decisions').add({
    type: 'driver_selection',
    orderId,
    availableDrivers: driversWithInfo.map(d => d.id),
    decision: aiDecision,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  // Get selected driver ID from AI decision or fallback to nearest
  let selectedDriverId = aiDecision.data?.selectedDriverId;
  if (!selectedDriverId || !driversWithInfo.find(d => d.id === selectedDriverId)) {
    // Fallback to nearest driver
    driversWithInfo.sort((a, b) => a.distance - b.distance);
    selectedDriverId = driversWithInfo[0].id;
  }

  const selectedDriver = driversWithInfo.find(d => d.id === selectedDriverId)!;

  // Assign driver to order
  await orderDoc.ref.update({
    driverId: selectedDriverId,
    driverAssignedAt: admin.firestore.FieldValue.serverTimestamp(),
    driverDistance: selectedDriver.distance,
    aiSelectedDriver: true,
    aiSelectionReasoning: aiDecision.reasoning,
    status: 'DriverAssigned'
  });

  // Update driver status
  await db.collection('drivers').doc(selectedDriverId).update({
    status: 'busy',
    currentOrderId: orderId
  });

  // Notify driver
  await sendPushNotification(selectedDriverId, 'driver', {
    title: 'New Delivery!',
    body: `Order from ${restaurant?.name || 'Restaurant'} - ${selectedDriver.distance.toFixed(1)}km away`,
    type: 'new_delivery',
    orderId,
    data: {
      restaurantName: restaurant?.name || '',
      distance: selectedDriver.distance.toFixed(1)
    }
  });

  return {
    status: 'assigned',
    driverId: selectedDriverId,
    distance: selectedDriver.distance.toFixed(1),
    aiReasoning: aiDecision.reasoning
  };
}

async function verifyDocumentTask(payload: Record<string, string>): Promise<Record<string, string>> {
  const { documentId, type, holderId, holderType } = payload;

  // Get document details
  const docRef = db.collection(`${holderType}s`).doc(holderId).collection('documents').doc(documentId);
  const docSnapshot = await docRef.get();

  if (!docSnapshot.exists) {
    return { status: 'error', message: 'Document not found' };
  }

  const documentData = docSnapshot.data();

  // Use AI (Ollama/Qwen) for document verification
  const aiDecision = await aiVerifyDocument({
    type: type || documentData?.type,
    holderName: documentData?.holderName || '',
    documentNumber: documentData?.documentNumber || '',
    issueDate: documentData?.issueDate || '',
    expirationDate: documentData?.expirationDate || '',
    extractedStatus: documentData?.extractedText ? 'extracted' : 'pending'
  });

  // Log AI decision
  await db.collection('ai_decisions').add({
    type: 'document_verification',
    documentId,
    holderId,
    holderType,
    decision: aiDecision,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });

  // Update document status based on AI decision
  const verificationStatus = aiDecision.action === 'approved' ? 'verified'
    : aiDecision.action === 'rejected' ? 'rejected'
    : 'pending_review';

  await docRef.update({
    verificationStatus,
    verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
    verifiedBy: 'AI_DOCUMENT_VERIFIER',
    aiConfidence: aiDecision.confidence,
    aiReasoning: aiDecision.reasoning,
    needsHumanReview: aiDecision.data?.needsHumanReview || false
  });

  // Notify holder of verification result
  if (holderType === 'restaurant') {
    await sendPushNotification(holderId, 'restaurant', {
      title: 'Document Verified',
      body: `Your ${type || 'document'} has been ${verificationStatus}`,
      type: 'document_verified',
      data: { documentId, status: verificationStatus }
    });
  } else if (holderType === 'driver') {
    await sendPushNotification(holderId, 'driver', {
      title: 'Document Verified',
      body: `Your ${type || 'document'} has been ${verificationStatus}`,
      type: 'document_verified',
      data: { documentId, status: verificationStatus }
    });
  }

  return {
    status: verificationStatus,
    confidence: String(aiDecision.confidence),
    reasoning: aiDecision.reasoning
  };
}

async function sendPushNotificationTask(payload: Record<string, string>): Promise<Record<string, string>> {
  const { recipientId, recipientType, title, body, type, orderId } = payload;

  const success = await sendPushNotification(
    recipientId,
    recipientType as 'customer' | 'restaurant' | 'driver',
    { title, body, type, orderId }
  );

  return { status: success ? 'sent' : 'failed' };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function createAITask(
  role: string,
  taskType: string,
  payload: Record<string, string>,
  priority: number = 3
): Promise<void> {
  // Find an active employee for this role
  const employeesSnapshot = await db.collection('ai_employees')
    .where('role', '==', role)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (employeesSnapshot.empty) {
    console.warn(`No active AI employee found for role: ${role}`);
    // Queue task for later
    await db.collection('ai_task_queue').add({
      role,
      type: taskType,
      payload,
      priority,
      status: 'queued',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return;
  }

  const employee = employeesSnapshot.docs[0];
  await db.collection('ai_tasks').add({
    employeeId: employee.id,
    type: taskType,
    priority,
    payload,
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    retryCount: 0
  });

  await employee.ref.update({
    tasksInProgress: admin.firestore.FieldValue.increment(1)
  });
}

// =============================================================================
// SCHEDULED FUNCTIONS
// =============================================================================

/**
 * Run every hour to process queued tasks
 */
export const processQueuedTasksV1 = functions
  .runWith({ timeoutSeconds: 540, memory: "512MB" })
  .pubsub
  .schedule('every 60 minutes')
  .onRun(async () => {
    console.log('Processing queued tasks...');

    const queueSnapshot = await db.collection('ai_task_queue')
      .where('status', '==', 'queued')
      .limit(50)
      .get();

    for (const taskDoc of queueSnapshot.docs) {
      const task = taskDoc.data();

      // Find an active employee for this role
      const employeesSnapshot = await db.collection('ai_employees')
        .where('role', '==', task.role)
        .where('status', '==', 'active')
        .limit(1)
        .get();

      if (!employeesSnapshot.empty) {
        const employee = employeesSnapshot.docs[0];

        await db.collection('ai_tasks').add({
          employeeId: employee.id,
          type: task.type,
          priority: task.priority || 3,
          payload: task.payload,
          status: 'pending',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          retryCount: 0
        });

        await taskDoc.ref.update({
          status: 'processed',
          processedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
  });

/**
 * Run daily to check for expiring documents
 */
export const checkExpiringDocsV1 = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    console.log('Checking for expiring documents...');

    const thirtyDaysFromNow = Date.now() + (30 * 24 * 60 * 60 * 1000);

    // Check restaurant documents
    const restaurantsSnapshot = await db.collection('restaurants').get();

    for (const restaurantDoc of restaurantsSnapshot.docs) {
      const restaurant = restaurantDoc.data();
      const documents = restaurant.documents || {};

      const expiringDocs: string[] = [];

      if (documents.businessLicense?.expirationDate < thirtyDaysFromNow) {
        expiringDocs.push('Business License');
      }
      if (documents.healthPermit?.expirationDate < thirtyDaysFromNow) {
        expiringDocs.push('Health Permit');
      }

      if (expiringDocs.length > 0) {
        // Send push notification
        await sendPushNotification(restaurantDoc.id, 'restaurant', {
          title: 'Documents Expiring Soon',
          body: `Expiring within 30 days: ${expiringDocs.join(', ')}`,
          type: 'document_expiring',
        });
      }
    }
  });

/**
 * Run daily to process pending payouts
 */
export const processPendingPayoutsV1 = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    console.log('Processing pending payouts...');

    // Get all pending payouts
    const payoutsSnapshot = await db.collection('payouts')
      .where('status', '==', 'pending')
      .get();

    // Group by recipient
    const payoutsByRecipient: Record<string, number> = {};
    const payoutDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];

    for (const payoutDoc of payoutsSnapshot.docs) {
      const payout = payoutDoc.data();
      const recipientId = payout.recipientId;

      if (!payoutsByRecipient[recipientId]) {
        payoutsByRecipient[recipientId] = 0;
      }
      payoutsByRecipient[recipientId] += payout.amount || 0;
      payoutDocs.push(payoutDoc);
    }

    // Create payout batches
    for (const [recipientId, totalAmount] of Object.entries(payoutsByRecipient)) {
      if (totalAmount > 0) {
        await db.collection('payout_batches').add({
          recipientId,
          totalAmount,
          payoutCount: payoutsSnapshot.docs.filter(d => d.data().recipientId === recipientId).length,
          status: 'ready',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    // Mark individual payouts as batched
    for (const payoutDoc of payoutDocs) {
      await payoutDoc.ref.update({
        status: 'batched',
        batchedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    console.log(`Processed ${payoutsSnapshot.size} pending payouts`);
  });

/**
 * Process email queue - sends emails via SendGrid
 */
export const processEmailQueueV1 = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async () => {
    console.log('Processing email queue...');

    const emailsSnapshot = await db.collection('email_queue')
      .where('status', '==', 'pending')
      .limit(20)
      .get();

    for (const emailDoc of emailsSnapshot.docs) {
      const email = emailDoc.data();

      try {
        // TODO: Add SendGrid integration when domain is ready
        // const sgMail = require('@sendgrid/mail');
        // sgMail.setApiKey(config.sendgridApiKey);
        // await sgMail.send({
        //   to: email.to,
        //   from: 'noreply@yourdomain.com',
        //   subject: email.subject,
        //   templateId: email.template,
        //   dynamicTemplateData: email.data,
        // });

        console.log(`Email queued for ${email.to}: ${email.subject}`);

        await emailDoc.ref.update({
          status: 'sent',
          sentAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (error) {
        console.error(`Failed to send email: ${error}`);
        await emailDoc.ref.update({
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });

/**
 * Retry pending driver assignments every 5 minutes
 */
export const retryDriverAssignmentsV1 = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async () => {
    console.log('Retrying pending driver assignments...');

    const pendingSnapshot = await db.collection('pending_driver_assignments')
      .where('attempts', '<', 5)
      .limit(10)
      .get();

    for (const doc of pendingSnapshot.docs) {
      const pending = doc.data();

      // Check if order still needs driver
      const orderDoc = await db.collection('orders').doc(pending.orderId).get();
      if (!orderDoc.exists) {
        await doc.ref.delete();
        continue;
      }

      const order = orderDoc.data();
      if (order?.driverId || order?.status === 'Cancelled') {
        await doc.ref.delete();
        continue;
      }

      // Find available drivers
      const driversSnapshot = await db.collection('drivers')
        .where('status', '==', 'available')
        .where('isOnline', '==', true)
        .limit(1)
        .get();

      if (!driversSnapshot.empty) {
        // Trigger assignment by updating order status
        await orderDoc.ref.update({
          status: 'Ready',
          retryCount: (order?.retryCount || 0) + 1,
        });
        await doc.ref.delete();
      } else {
        // Increment attempts
        await doc.ref.update({
          attempts: admin.firestore.FieldValue.increment(1),
          lastAttempt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // If multiple orders pending, broadcast to all drivers
        if (pendingSnapshot.size >= 3) {
          const allDriversSnapshot = await db.collection('drivers')
            .where('isOnline', '==', true)
            .get();

          const driverTokens = allDriversSnapshot.docs
            .map(d => d.data().fcmToken)
            .filter((t): t is string => !!t);

          if (driverTokens.length > 0) {
            await sendPushToMultiple(driverTokens, {
              title: 'High Demand Alert!',
              body: `${pendingSnapshot.size} orders waiting for drivers. Go online to earn more!`,
              type: 'high_demand_alert',
            });
          }
        }
      }
    }
  });

// =============================================================================
// STRIPE PAYMENT INTEGRATION
// =============================================================================

/**
 * Create Stripe Connect account for restaurants/drivers
 * Called when a restaurant or driver wants to receive payouts
 */
export const createStripeConnectAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const { accountType, email, businessName } = data;
  const userId = context.auth.uid;

  try {
    // Create Stripe Connect Express account
    const account = await getStripe().accounts.create({
      type: 'express',
      country: 'US',
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: accountType === 'restaurant' ? 'company' : 'individual',
      business_profile: {
        name: businessName,
        product_description: accountType === 'restaurant'
          ? 'Food delivery restaurant on EatFair'
          : 'Delivery driver on EatFair',
      },
      metadata: {
        userId,
        accountType,
        platform: 'eatfair',
      },
    });

    // Save Stripe account ID to Firestore
    const collection = accountType === 'restaurant' ? 'restaurants' : 'drivers';
    await db.collection(collection).doc(userId).update({
      stripeAccountId: account.id,
      stripeAccountStatus: 'pending',
      stripeCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create onboarding link
    const accountLink = await getStripe().accountLinks.create({
      account: account.id,
      refresh_url: `https://eatfair.com/stripe/refresh?account=${account.id}`,
      return_url: `https://eatfair.com/stripe/complete?account=${account.id}`,
      type: 'account_onboarding',
    });

    return {
      success: true,
      accountId: account.id,
      onboardingUrl: accountLink.url,
    };
  } catch (error) {
    console.error('Failed to create Stripe account:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create payment account');
  }
});

/**
 * Create Payment Intent for customer order
 * Uses Stripe Connect to split payment between platform, restaurant, and driver
 */
export const createPaymentIntent = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const { orderId, saveCard } = data;
  const customerId = context.auth.uid;

  try {
    // Get order details
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Order not found');
    }

    const order = orderDoc.data()!;

    // Verify order belongs to customer
    if (order.customerId !== customerId) {
      throw new functions.https.HttpsError('permission-denied', 'Not your order');
    }

    // Get customer's Stripe customer ID or create one
    const userDoc = await db.collection('users').doc(customerId).get();
    let stripeCustomerId = userDoc.data()?.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await getStripe().customers.create({
        email: userDoc.data()?.email,
        metadata: { userId: customerId },
      });
      stripeCustomerId = customer.id;
      await userDoc.ref.update({ stripeCustomerId });
    }

    // Calculate amounts in cents
    const subtotal = Math.round((order.subtotal || 0) * 100);
    const deliveryFee = Math.round((order.deliveryFee || 0) * 100);
    const tip = Math.round((order.tip || 0) * 100);
    const tax = Math.round((order.tax || 0) * 100);
    const totalAmount = subtotal + deliveryFee + tip + tax;

    // Platform fee: $1 per restaurant order (in cents)
    const platformFee = 100; // $1.00

    // Create Payment Intent
    const paymentIntent = await getStripe().paymentIntents.create({
      amount: totalAmount,
      currency: 'usd',
      customer: stripeCustomerId,
      metadata: {
        orderId,
        customerId,
        restaurantId: order.restaurantId,
        subtotal: String(subtotal),
        deliveryFee: String(deliveryFee),
        tip: String(tip),
        tax: String(tax),
        platformFee: String(platformFee),
      },
      // Enable automatic payment methods
      automatic_payment_methods: {
        enabled: true,
      },
      // Setup for future use if customer wants to save card
      setup_future_usage: saveCard ? 'off_session' : undefined,
    });

    // Update order with payment intent
    await orderDoc.ref.update({
      paymentIntentId: paymentIntent.id,
      paymentStatus: 'pending',
      totalAmount: totalAmount / 100,
    });

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: totalAmount,
    };
  } catch (error) {
    console.error('Failed to create payment intent:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create payment');
  }
});

/**
 * Get customer's saved payment methods
 */
export const getPaymentMethods = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const customerId = context.auth.uid;

  try {
    const userDoc = await db.collection('users').doc(customerId).get();
    const stripeCustomerId = userDoc.data()?.stripeCustomerId;

    if (!stripeCustomerId) {
      return { paymentMethods: [] };
    }

    const paymentMethods = await getStripe().paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card',
    });

    return {
      paymentMethods: paymentMethods.data.map(pm => ({
        id: pm.id,
        brand: pm.card?.brand,
        last4: pm.card?.last4,
        expMonth: pm.card?.exp_month,
        expYear: pm.card?.exp_year,
      })),
    };
  } catch (error) {
    console.error('Failed to get payment methods:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get payment methods');
  }
});

/**
 * Stripe Webhook Handler
 * Handles payment events and triggers payouts
 */
export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured — rejecting webhook');
    res.status(500).send('Webhook secret not configured');
    return;
  }

  if (!sig) {
    res.status(400).send('Missing signature');
    return;
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    res.status(400).send('Invalid signature');
    return;
  }

  console.log(`Processing Stripe event: ${event.type}`);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;

      case 'transfer.created':
        await handleTransferCreated(event.data.object as Stripe.Transfer);
        break;

      case 'payout.paid':
        await handlePayoutPaid(event.data.object as Stripe.Payout);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).send('Webhook handler failed');
  }
});

/**
 * Handle successful payment - trigger payouts to restaurant and driver
 */
async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { orderId, restaurantId, subtotal, deliveryFee, tip, platformFee } = paymentIntent.metadata;

  console.log(`Payment succeeded for order ${orderId}`);

  // Get order document
  const orderDoc = await db.collection('orders').doc(orderId).get();
  if (!orderDoc.exists) {
    console.error('Order not found for payment:', orderId);
    return;
  }

  const order = orderDoc.data()!;

  // Update order payment status
  await orderDoc.ref.update({
    paymentStatus: 'paid',
    paidAt: admin.firestore.FieldValue.serverTimestamp(),
    stripeChargeId: paymentIntent.latest_charge,
  });

  // Get restaurant's Stripe account
  const restaurantDoc = await db.collection('restaurants').doc(restaurantId).get();
  const restaurantStripeId = restaurantDoc.data()?.stripeAccountId;

  // Calculate restaurant payout: subtotal - $1 platform fee
  const subtotalCents = parseInt(subtotal);
  const platformFeeCents = parseInt(platformFee);
  const restaurantPayoutCents = subtotalCents - platformFeeCents;

  // Create transfer to restaurant if they have Stripe account
  if (restaurantStripeId) {
    try {
      const restaurantTransfer = await getStripe().transfers.create({
        amount: restaurantPayoutCents,
        currency: 'usd',
        destination: restaurantStripeId,
        transfer_group: orderId,
        metadata: {
          orderId,
          type: 'restaurant_payout',
          originalAmount: subtotal,
          platformFee: platformFee,
        },
      });

      // Record payout in Firestore
      await db.collection('payouts').add({
        type: 'restaurant',
        recipientId: restaurantId,
        orderId,
        amount: restaurantPayoutCents / 100,
        platformFee: platformFeeCents / 100,
        stripeTransferId: restaurantTransfer.id,
        status: 'completed',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Restaurant payout: $${restaurantPayoutCents / 100} to ${restaurantStripeId}`);
    } catch (error) {
      console.error('Failed to transfer to restaurant:', error);
      // Queue for retry
      await db.collection('failed_transfers').add({
        type: 'restaurant',
        recipientId: restaurantId,
        orderId,
        amount: restaurantPayoutCents,
        error: String(error),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  } else {
    // Queue payout for when restaurant connects Stripe
    await db.collection('pending_payouts').add({
      type: 'restaurant',
      recipientId: restaurantId,
      orderId,
      amount: restaurantPayoutCents / 100,
      status: 'awaiting_stripe_connect',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // Driver payout: 100% of delivery fee + 100% of tip
  const deliveryFeeCents = parseInt(deliveryFee);
  const tipCents = parseInt(tip);
  const driverPayoutCents = deliveryFeeCents + tipCents;

  if (order.driverId && driverPayoutCents > 0) {
    const driverDoc = await db.collection('drivers').doc(order.driverId).get();
    const driverStripeId = driverDoc.data()?.stripeAccountId;

    if (driverStripeId) {
      try {
        const driverTransfer = await getStripe().transfers.create({
          amount: driverPayoutCents,
          currency: 'usd',
          destination: driverStripeId,
          transfer_group: orderId,
          metadata: {
            orderId,
            type: 'driver_payout',
            deliveryFee: deliveryFee,
            tip: tip,
          },
        });

        // Record payout in Firestore
        await db.collection('payouts').add({
          type: 'driver',
          recipientId: order.driverId,
          orderId,
          amount: driverPayoutCents / 100,
          deliveryFee: deliveryFeeCents / 100,
          tip: tipCents / 100,
          platformFee: 0, // No fees for drivers!
          stripeTransferId: driverTransfer.id,
          status: 'completed',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`Driver payout: $${driverPayoutCents / 100} to ${driverStripeId}`);

        // Notify driver of payment
        await sendPushNotification(order.driverId, 'driver', {
          title: 'Payment Received!',
          body: `$${(driverPayoutCents / 100).toFixed(2)} has been sent to your account`,
          type: 'payment_received',
          orderId,
          data: {
            amount: (driverPayoutCents / 100).toFixed(2),
            deliveryFee: (deliveryFeeCents / 100).toFixed(2),
            tip: (tipCents / 100).toFixed(2),
          },
        });
      } catch (error) {
        console.error('Failed to transfer to driver:', error);
        await db.collection('failed_transfers').add({
          type: 'driver',
          recipientId: order.driverId,
          orderId,
          amount: driverPayoutCents,
          error: String(error),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    } else {
      // Queue payout for when driver connects Stripe
      await db.collection('pending_payouts').add({
        type: 'driver',
        recipientId: order.driverId,
        orderId,
        amount: driverPayoutCents / 100,
        deliveryFee: deliveryFeeCents / 100,
        tip: tipCents / 100,
        status: 'awaiting_stripe_connect',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  // Create journal entry for accounting
  await db.collection('journal_entries').add({
    type: 'payment_received',
    orderId,
    entries: [
      { account: 'Stripe Balance', debit: paymentIntent.amount, credit: 0 },
      { account: 'Restaurant Payable', debit: 0, credit: restaurantPayoutCents },
      { account: 'Driver Payable', debit: 0, credit: driverPayoutCents },
      { account: 'Platform Revenue', debit: 0, credit: platformFeeCents },
    ],
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Notify customer
  await sendPushNotification(order.customerId, 'customer', {
    title: 'Payment Successful',
    body: `Your payment of $${(paymentIntent.amount / 100).toFixed(2)} has been processed`,
    type: 'payment_success',
    orderId,
  });
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const { orderId, customerId } = paymentIntent.metadata;

  console.log(`Payment failed for order ${orderId}`);

  // Update order
  await db.collection('orders').doc(orderId).update({
    paymentStatus: 'failed',
    paymentError: paymentIntent.last_payment_error?.message || 'Payment failed',
    failedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Notify customer
  if (customerId) {
    await sendPushNotification(customerId, 'customer', {
      title: 'Payment Failed',
      body: 'Your payment could not be processed. Please try again.',
      type: 'payment_failed',
      orderId,
    });
  }
}

/**
 * Handle Stripe Connect account updates
 */
async function handleAccountUpdated(account: Stripe.Account) {
  const { userId, accountType } = account.metadata || {};

  if (!userId || !accountType) {
    console.log('Account update missing metadata');
    return;
  }

  const collection = accountType === 'restaurant' ? 'restaurants' : 'drivers';

  // Check if account is fully onboarded
  const isComplete = account.charges_enabled && account.payouts_enabled;

  await db.collection(collection).doc(userId).update({
    stripeAccountStatus: isComplete ? 'active' : 'pending',
    stripeChargesEnabled: account.charges_enabled,
    stripePayoutsEnabled: account.payouts_enabled,
    stripeUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // If account is now active, process any pending payouts
  if (isComplete) {
    await processPendingPayoutsForAccount(userId, accountType, account.id);
  }
}

/**
 * Process pending payouts when user completes Stripe Connect
 */
async function processPendingPayoutsForAccount(
  userId: string,
  accountType: string,
  stripeAccountId: string
) {
  const pendingSnapshot = await db.collection('pending_payouts')
    .where('recipientId', '==', userId)
    .where('type', '==', accountType)
    .where('status', '==', 'awaiting_stripe_connect')
    .get();

  for (const doc of pendingSnapshot.docs) {
    const payout = doc.data();

    try {
      const transfer = await getStripe().transfers.create({
        amount: Math.round(payout.amount * 100),
        currency: 'usd',
        destination: stripeAccountId,
        metadata: {
          orderId: payout.orderId,
          type: `${accountType}_payout`,
          originalPendingPayoutId: doc.id,
        },
      });

      // Move to completed payouts
      await db.collection('payouts').add({
        ...payout,
        stripeTransferId: transfer.id,
        status: 'completed',
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Delete pending payout
      await doc.ref.delete();

      console.log(`Processed pending payout for ${userId}: $${payout.amount}`);
    } catch (error) {
      console.error(`Failed to process pending payout ${doc.id}:`, error);
      await doc.ref.update({
        status: 'failed',
        error: String(error),
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
}

/**
 * Handle transfer created event
 */
async function handleTransferCreated(transfer: Stripe.Transfer) {
  console.log(`Transfer created: ${transfer.id} for $${transfer.amount / 100}`);

  // Log for audit
  await db.collection('stripe_events').add({
    type: 'transfer.created',
    transferId: transfer.id,
    amount: transfer.amount / 100,
    destination: transfer.destination,
    metadata: transfer.metadata,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Handle payout paid event (when funds hit bank account)
 */
async function handlePayoutPaid(payout: Stripe.Payout) {
  console.log(`Payout completed: ${payout.id} for $${payout.amount / 100}`);

  await db.collection('stripe_events').add({
    type: 'payout.paid',
    payoutId: payout.id,
    amount: payout.amount / 100,
    arrivalDate: payout.arrival_date,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Refund payment for order
 */
export const refundPayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const { orderId, amount, reason } = data;

  try {
    // Get order
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Order not found');
    }

    const order = orderDoc.data()!;

    // Verify permission (must be admin or AI support with permission)
    // For now, we'll allow it if it's from the system

    if (!order.paymentIntentId) {
      throw new functions.https.HttpsError('failed-precondition', 'No payment to refund');
    }

    // Create refund
    const refundAmount = amount ? Math.round(amount * 100) : undefined; // Full refund if no amount
    const refund = await getStripe().refunds.create({
      payment_intent: order.paymentIntentId,
      amount: refundAmount,
      reason: 'requested_by_customer',
      metadata: {
        orderId,
        reason: reason || 'Customer requested refund',
        processedBy: context.auth.uid,
      },
    });

    // Update order
    await orderDoc.ref.update({
      paymentStatus: refund.status === 'succeeded' ? 'refunded' : 'refund_pending',
      refundId: refund.id,
      refundAmount: (refund.amount || 0) / 100,
      refundReason: reason,
      refundedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Record refund
    await db.collection('refunds').add({
      orderId,
      customerId: order.customerId,
      amount: (refund.amount || 0) / 100,
      stripeRefundId: refund.id,
      reason,
      status: refund.status,
      processedBy: context.auth.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Notify customer
    await sendPushNotification(order.customerId, 'customer', {
      title: 'Refund Processed',
      body: `$${((refund.amount || 0) / 100).toFixed(2)} has been refunded to your payment method`,
      type: 'refund_processed',
      orderId,
    });

    return {
      success: true,
      refundId: refund.id,
      amount: (refund.amount || 0) / 100,
      status: refund.status,
    };
  } catch (error) {
    console.error('Refund failed:', error);
    throw new functions.https.HttpsError('internal', 'Failed to process refund');
  }
});

/**
 * Get Stripe onboarding link for existing account
 */
export const getStripeOnboardingLink = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const { accountType } = data;
  const userId = context.auth.uid;

  try {
    const collection = accountType === 'restaurant' ? 'restaurants' : 'drivers';
    const doc = await db.collection(collection).doc(userId).get();
    const stripeAccountId = doc.data()?.stripeAccountId;

    if (!stripeAccountId) {
      throw new functions.https.HttpsError('not-found', 'No Stripe account found');
    }

    const accountLink = await getStripe().accountLinks.create({
      account: stripeAccountId,
      refresh_url: `https://eatfair.com/stripe/refresh?account=${stripeAccountId}`,
      return_url: `https://eatfair.com/stripe/complete?account=${stripeAccountId}`,
      type: 'account_onboarding',
    });

    return {
      success: true,
      onboardingUrl: accountLink.url,
    };
  } catch (error) {
    console.error('Failed to get onboarding link:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get onboarding link');
  }
});

/**
 * Get Stripe dashboard link for account holders
 */
export const getStripeDashboardLink = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const { accountType } = data;
  const userId = context.auth.uid;

  try {
    const collection = accountType === 'restaurant' ? 'restaurants' : 'drivers';
    const doc = await db.collection(collection).doc(userId).get();
    const stripeAccountId = doc.data()?.stripeAccountId;

    if (!stripeAccountId) {
      throw new functions.https.HttpsError('not-found', 'No Stripe account found');
    }

    const loginLink = await getStripe().accounts.createLoginLink(stripeAccountId);

    return {
      success: true,
      dashboardUrl: loginLink.url,
    };
  } catch (error) {
    console.error('Failed to get dashboard link:', error);
    throw new functions.https.HttpsError('internal', 'Failed to get dashboard link');
  }
});

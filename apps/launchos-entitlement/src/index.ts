import 'dotenv/config';
import express from 'express';
import { requireLaunchOSToken } from './middleware/auth';
import { entitlementRouter } from './routes/entitlements';
import { stripeRouter } from './routes/stripe';

const app = express();
const PORT = process.env.PORT || 4000;

// Parse JSON bodies globally (except stripe webhook — handled in stripeRouter)
app.use((req, res, next) => {
  if (req.path === '/stripe/webhook') {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// Health check — no auth required
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'launchos-entitlement', ts: new Date().toISOString() });
});

// Entitlement routes — require x-launchos-token JWT on all /entitlements/* paths
app.use('/entitlements', requireLaunchOSToken, entitlementRouter);

// Stripe routes — checkout requires auth; webhook uses raw body + Stripe signature
app.use('/stripe', stripeRouter);

app.listen(PORT, () => {
  console.log(`[LaunchOS Entitlement] Listening on port ${PORT}`);
});

export default app;

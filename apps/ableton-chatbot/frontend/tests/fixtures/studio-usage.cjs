const usage = require('./usage.cjs');
module.exports = { ...usage, plan: { ...usage.plan, plan: 'studio', tier: 'studio' },
  features: { references: true, cloud_hq: true }, model_access: ['fast', 'pro', 'ultra'] };

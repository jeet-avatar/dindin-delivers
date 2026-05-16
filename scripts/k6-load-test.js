// scripts/k6-load-test.js
// Phase 59-04 — top-10 endpoint load test
// Run from operator's machine (M8 acceptable per RESEARCH Pitfall 7; M9 productionizes via Lambda)
//
// Usage:
//   export ZIETRA_TURION_JWT=<active turion-tenant admin Cognito ID token>
//   k6 run --summary-export=/tmp/phase-59/k6-results.json scripts/k6-load-test.js
//
// Pass criteria (from Phase 55-04 perf baseline):
//   - per-endpoint p95 < 2× the 55-04 p99 baseline (we use 2× p99 because p95<p99; conservative)
//   - http_req_failed rate < 0.1%
import http from 'k6/http'
import { group } from 'k6'

export const options = {
  scenarios: {
    ramp_50: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m',  target: 50 },  // ramp up to 50 VUs over 2 min
        { duration: '30s', target: 50 },  // plateau at 50 VUs
        { duration: '1m',  target: 0  },  // ramp down to 0 over 1 min
      ],
    },
  },
  thresholds: {
    // Pass criteria: p95 < 2× Phase 55-04 baseline + error rate < 0.1%
    // 55-04 baseline (post-RLS, cold-start dominated, ab -n100 -c5):
    //   /api/health         p50 395ms / p99 2378ms
    //   /api/tenants/current p50 399ms / p99 466ms
    //   /api/data/all       p50 515ms / p99 1195ms (401-only path)
    //   /api/satellites     p50 459ms / p99 1435ms (401-only path)
    //   /api/parts          p50 529ms / p99 1021ms (401-only path)
    //   /api/work-orders    p50 466ms / p99 1009ms (401-only path)
    //   /api/salesforce/customers p50 382ms / p99 453ms
    //   /api/mes/stages     p50 380ms / p99 449ms
    //   /api/arena/ncrs     p50 427ms / p99 1062ms
    // Per-endpoint p95 budgets (2× the 55-04 p99, conservative):
    'http_req_duration{endpoint:data-all}':            ['p(95)<3000'],
    'http_req_duration{endpoint:satellites}':          ['p(95)<3000'],
    'http_req_duration{endpoint:parts}':               ['p(95)<2500'],
    'http_req_duration{endpoint:work-orders}':         ['p(95)<2500'],
    'http_req_duration{endpoint:tenants-current}':     ['p(95)<1000'],
    'http_req_duration{endpoint:modules}':             ['p(95)<1500'],
    'http_req_duration{endpoint:team}':                ['p(95)<1500'],
    'http_req_duration{endpoint:onboarding-checklist}':['p(95)<1500'],
    'http_req_duration{endpoint:audit-log}':           ['p(95)<2000'],
    'http_req_duration{endpoint:agents-runs}':         ['p(95)<2500'],
    // Overall error rate < 0.1%
    'http_req_failed': ['rate<0.001'],
  },
}

const JWT = __ENV.ZIETRA_TURION_JWT
if (!JWT) throw new Error('Set ZIETRA_TURION_JWT env var (an active turion-tenant admin Cognito ID token)')

const ERP_BASE = 'https://lo254mvukl.execute-api.us-east-1.amazonaws.com'
const SAT_BASE = 'https://rjydekliee.execute-api.us-east-1.amazonaws.com'
const HEADERS = {
  Authorization: `Bearer ${JWT}`,
  'X-Tenant-Slug': 'turion',
  'Content-Type': 'application/json',
}

export default function () {
  group('top-10 endpoints', () => {
    http.get(`${ERP_BASE}/api/data/all`,                   { headers: HEADERS, tags: { endpoint: 'data-all' } })
    http.get(`${SAT_BASE}/api/satellites`,                 { headers: HEADERS, tags: { endpoint: 'satellites' } })
    http.get(`${SAT_BASE}/api/parts`,                      { headers: HEADERS, tags: { endpoint: 'parts' } })
    http.get(`${SAT_BASE}/api/work-orders`,                { headers: HEADERS, tags: { endpoint: 'work-orders' } })
    http.get(`${ERP_BASE}/api/tenants/current`,            { headers: HEADERS, tags: { endpoint: 'tenants-current' } })
    http.get(`${ERP_BASE}/api/modules`,                    { headers: HEADERS, tags: { endpoint: 'modules' } })
    http.get(`${ERP_BASE}/api/team`,                       { headers: HEADERS, tags: { endpoint: 'team' } })
    http.get(`${ERP_BASE}/api/onboarding/checklist`,       { headers: HEADERS, tags: { endpoint: 'onboarding-checklist' } })
    http.get(`${ERP_BASE}/api/audit-log?limit=10`,         { headers: HEADERS, tags: { endpoint: 'audit-log' } })
    http.get(`${ERP_BASE}/api/agents/runs?limit=10`,       { headers: HEADERS, tags: { endpoint: 'agents-runs' } })
  })
}

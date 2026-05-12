deferred items log

## 35-07 deploy observation (out of scope — pre-existing)
- `turion-space-demo/deploy-frontend.sh` `aws s3 sync` filter order: `--exclude "backend/*"` is overridden by the later `--include "*.js"`, so `backend/dist/**/*.js` get uploaded to S3 on every deploy (and currently-dirty `backend/dist/*.js` WIP bytes rode along this run). Not a Phase-35 file; the ERP backend dist already lived on S3 from prior deploys. Recommend a follow-up to tighten the sync filters or stash `backend/dist/` too. Logged, not fixed.

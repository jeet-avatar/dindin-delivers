-- Phase 341 — flip Solo Brands' asc606 module to enabled=true.
-- Recommendation engine recommended asc606 during Phase 65.2 onboarding but the
-- row was never flipped, so the 'Revenue & Royalty' nav section degraded to
-- '+ Add to plan'. Idempotent: re-running is a no-op if already true.
SET app.tenant_id='45896e95-699f-494d-882b-bd780dfe46f3';
UPDATE public.tenant_features SET enabled=true, enabled_at=now() WHERE tenant_id='45896e95-699f-494d-882b-bd780dfe46f3' AND module_code='asc606' AND enabled=false;
SELECT module_code, enabled FROM public.tenant_features WHERE tenant_id='45896e95-699f-494d-882b-bd780dfe46f3' AND module_code='asc606';

# Quick Task 112: Sync Project Tracker Data to Staging & Production

## Task 1: Seed + populate staging DB
- **action**: Run seed_all_platforms + populate_case_reasons against staging DATABASE_URL
- **verify**: curl staging /api/admin/project-cases/stats returns total > 0
- **done**: Staging has 2512 project cases with reasons

## Task 2: Seed + populate production DB
- **action**: Run seed_all_platforms + populate_case_reasons against production DATABASE_URL
- **verify**: curl production /api/admin/project-cases/stats returns total > 0
- **done**: Production has 2512 project cases with reasons

## Task 3: Verify UI accessibility on both environments
- **action**: curl both stats endpoints, confirm data matches local
- **done**: Both staging and production show populated project tracker data

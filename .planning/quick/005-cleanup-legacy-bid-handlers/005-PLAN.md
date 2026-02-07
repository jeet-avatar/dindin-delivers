# Quick Task 005: Cleanup Legacy Bid Handlers

## Task Description
Remove shadowed/legacy bid route handlers from main_new.py that are duplicated in bid_routes.py.

## Code to Remove

### Model Classes (lines 13244-13255)
```python
class RideBidRequest(BaseModel):
class BidResponseRequest(BaseModel):
```
Only used by the legacy handlers below.

### Legacy Endpoints to Remove

| Endpoint | main_new.py Line | bid_routes.py Line | Status |
|----------|------------------|-------------------|--------|
| `GET /api/rides/request/{id}/bids` | 13257-13297 | 334 | DUPLICATE |
| `POST /api/rides/request/{id}/bid` | 13299-13388 | 661 | DUPLICATE |
| `POST /api/rides/bid/{id}/withdraw` | 13390-13406 | 793 | DUPLICATE |
| `POST /api/rides/bid/{id}/respond` | 13408-13520 | 359 | DUPLICATE |
| `POST /api/rides/bid/{id}/accept-counter` | 13522-13613 | 814 | DUPLICATE |
| `POST /api/rides/bid/{id}/reject-counter` | 13616-13674 | 865 | DUPLICATE |

**Total lines to remove**: ~430 lines (13244-13674)

## Verification Steps
1. Confirm bid_routes.py has all equivalent endpoints
2. Remove legacy code from main_new.py
3. Test that bid accept still works
4. Deploy and verify

## Tasks
- [ ] Remove legacy model classes
- [ ] Remove 6 duplicate endpoint handlers
- [ ] Test API still works
- [ ] Deploy to production

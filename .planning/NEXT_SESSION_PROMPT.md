# Next Session: Fix Rideshare Ride Availability Gaps

## Context
Investigation (debug session `ride-availability-for-drivers.md`) found 5 gaps in rideshare ride availability for drivers. iOS and Android have mismatched polling intervals. All gaps need fixing.

## Task
```
/gsd:quick Fix all 5 rideshare ride availability gaps and standardize iOS/Android timing:

BACKEND FIXES:
1. Add bidding_expires_at filter to 2 missing available-rides endpoints (main_new.py:15517 and order_flow.py:801) — filter WHERE bidding_expires_at > now() so expired rides never appear
2. Add push notification to customer when ride expires with zero bids — in check_ride_bidding_expiry_job (bid_routes.py:2995), after transitioning to EXPIRED, send push: "No drivers available right now. Please try again."
3. Fix legacy accept endpoint (main_new.py:14303) to reject all other PENDING bids and broadcast ride_request_closed via WebSocket (match the behavior in bid_routes.py:611-629)
4. Add individual bid expiry check to the background job — expire bids where bid.expires_at < now() and status is still PENDING

MOBILE TIMING STANDARDIZATION (both platforms = 5 second polling):
5. Android: Change ride availability polling from 15s to 5s to match iOS (find the polling interval in driver app and update)
6. iOS DeliveryViewModel: Change from 10s to 5s polling to match RideBiddingViewModel

MOBILE NOTIFICATION HANDLING:
7. Both iOS and Android: Ensure "ride_expired" / "no drivers available" push notification type is handled — show alert/snackbar to customer when their ride request expires

After all fixes: run backend tests (JWT_SECRET_KEY=test-secret-key ADMIN_SECRET_KEY=test-admin-key pytest tests/ -v --tb=short), build all 6 apps, distribute to TestFlight + Firebase.
```

## Key Files
| File | What to fix |
|------|------------|
| `backend/main_new.py:15517` | Add `bidding_expires_at > now()` filter to available rides |
| `backend/order_flow.py:801` | Same filter on legacy available rides endpoint |
| `backend/bid_routes.py:2995` | Add customer push notification on ride expiry |
| `backend/main_new.py:14303` | Legacy accept — reject other bids + broadcast |
| `backend/bid_routes.py` | Add individual bid expiry to background job |
| iOS: `RideBiddingViewModel.swift` | Already 5s — no change needed |
| iOS: `DeliveryViewModel.swift` | Change 10s → 5s polling |
| Android driver: polling interval | Change 15s → 5s |
| iOS customer: ride notification | Handle expired ride push |
| Android customer: ride notification | Handle expired ride push |

## Current Build Versions
| Platform | App | Build | Distribution |
|----------|-----|-------|-------------|
| iOS | Customer | 1104 | TestFlight |
| iOS | Driver | 209 | TestFlight |
| iOS | Restaurant | 179 | TestFlight |
| Android | Customer | vC=30 | Firebase |
| Android | Driver | vC=27 | Firebase |
| Android | Partner | vC=23 | Firebase |

## Debug Reference
Full investigation: `.planning/debug/ride-availability-for-drivers.md`

## Commands
```bash
# Start the fix
/gsd:quick Fix all 5 rideshare ride availability gaps and standardize iOS/Android timing to 5s polling. Add bidding_expires_at filter to 2 endpoints, push notification on ride expiry, fix legacy accept to reject other bids, add bid expiry job, standardize polling to 5s on both platforms, handle ride expired notification in customer apps. Then build and distribute all 6 apps.

# After fix, deploy
git push origin main
gh workflow run deploy-staging.yml --ref main
```

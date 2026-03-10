---
phase: quick-137
plan: 137
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/p2p-platform/backend/order_flow.py
  - /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/DeliveryProofSheet.kt
  - /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/OrdersViewModel.kt
  - /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/OrderDetailsScreen.kt
  - /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/repository/DollorRepository.kt
  - .planning/quick/137-s3-photo-12h-retention-android-partner-d/137-DELIVERY-NOTIFICATION-AUDIT.md
autonomous: true
requirements: [QUICK-137]

must_haves:
  truths:
    - "Delivery proof photos are automatically deleted from S3 after 12 hours"
    - "Order.delivery_photo_url is nullified after cleanup but delivery_photo_uploaded_at is preserved"
    - "Android Partner app shows camera sheet before marking self-delivery as delivered"
    - "Delivery notification audit report documents every push notification in self-delivery flow"
  artifacts:
    - path: "apps/web/p2p-platform/backend/order_flow.py"
      provides: "cleanup_expired_delivery_photos job + scheduler registration"
      contains: "cleanup_expired_delivery_photos"
    - path: "/Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/DeliveryProofSheet.kt"
      provides: "Partner delivery proof UI component"
    - path: ".planning/quick/137-s3-photo-12h-retention-android-partner-d/137-DELIVERY-NOTIFICATION-AUDIT.md"
      provides: "Complete notification audit for self-delivery flow"
  key_links:
    - from: "order_flow.py cleanup job"
      to: "s3_service.delete_file()"
      via: "APScheduler hourly trigger"
      pattern: "s3_service\\.delete_file"
    - from: "Partner DeliveryProofSheet"
      to: "DollorRepository.uploadDeliveryPhotoAsVendor"
      via: "OrdersViewModel.submitDeliveryProof"
      pattern: "uploadDeliveryPhoto.*VENDOR"
---

<objective>
Three bundled tasks: (1) Add background S3 cleanup job to delete delivery proof photos older than 12 hours, (2) Add delivery proof photo capture to Android Partner app for restaurant self-delivery flow, (3) Audit all push notifications in the restaurant self-delivery flow.

Purpose: Privacy compliance (photo retention), feature parity (Partner app missing delivery proof), and operational visibility (notification audit).
Output: Backend cleanup job, Android Partner delivery proof UI, notification audit report.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/web/p2p-platform/backend/order_flow.py (scheduler at lines 2757-2814, delivery photo flow at 4412-4472)
@apps/web/p2p-platform/backend/s3_service.py (delete_file at lines 153-178)
@apps/web/p2p-platform/backend/models.py (Order.delivery_photo_url at line 492, delivery_photo_uploaded_at at 493)
@/Users/jeet/StudioProjects/eatfair-android/driver/src/main/java/ai/dollor/driver/ui/deliveries/DeliveryProofSheet.kt (reference UI for partner port)
@/Users/jeet/StudioProjects/eatfair-android/driver/src/main/java/ai/dollor/driver/ui/deliveries/ActiveDeliveryViewModel.kt (reference photo upload logic)
@/Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/OrdersViewModel.kt (markDelivered at line 464 — needs photo gate)
@/Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/OrderDetailsScreen.kt (Mark as Delivered button at line 391-401)
@/Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/repository/DollorRepository.kt (uploadDeliveryPhoto at 1273 uses DRIVER token — need VENDOR variant)
@/Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/remote/DollorApiService.kt (uploadDeliveryPhoto at 584)
@.agents/skills/ticketed-task/SKILL.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: S3 delivery photo 12-hour cleanup job</name>
  <files>
    apps/web/p2p-platform/backend/order_flow.py
  </files>
  <action>
Add a new async function `cleanup_expired_delivery_photos` in order_flow.py near the other scheduler jobs (around line 2700).

The function must:
1. Create a new DB session via `SessionLocal()` (same pattern as other scheduler jobs like `check_restaurant_timeout`)
2. Query `Order` where `delivery_photo_url IS NOT NULL` AND `delivery_photo_uploaded_at < (now - 12 hours)` AND status is `DELIVERED` or `CANCELLED`
3. For each matching order:
   - Extract the S3 key from `delivery_photo_url`. The URL format is either an S3 path like `delivery_proofs/{order_id}/...` or a full URL. Strip `s3://dollor-ai-uploads/` prefix or `https://...amazonaws.com/` prefix to get the key.
   - Call `s3_service.delete_file(key)` (import `s3_service` from s3_service module — it's a module-level instance, check existing imports)
   - Set `order.delivery_photo_url = None` (nullify)
   - Do NOT clear `order.delivery_photo_uploaded_at` — keep for audit trail
   - Log each deletion: `logger.info(f"Cleaned up delivery photo for order {order.id}, uploaded at {order.delivery_photo_uploaded_at}")`
4. Commit the batch, handle exceptions with rollback + logging
5. Log summary: `f"Delivery photo cleanup: {deleted_count} photos deleted, {error_count} errors"`

Register the job in `start_timeout_scheduler()` (around line 2800, after the existing ride jobs):
```python
restaurant_timeout_scheduler.add_job(
    cleanup_expired_delivery_photos,
    IntervalTrigger(hours=1),
    id="delivery_photo_cleanup",
    name="Delete S3 delivery photos older than 12 hours",
    replace_existing=True
)
```

Add to the logger.info message at line 2801 a mention of "delivery photo cleanup (12h, hourly)".

IMPORTANT: The `s3_service.delete_file()` is async. Since APScheduler jobs in this codebase use `AsyncIOScheduler`, the cleanup function can be async. Verify by checking how other async jobs are registered — if they use sync wrappers with `asyncio.run()`, do the same pattern. Check `check_restaurant_timeout` function signature for the pattern.

Also IMPORTANT: `delete_file` takes a `key` parameter (the S3 object key, NOT the full URL). Parse the stored `delivery_photo_url` to extract just the key portion (e.g., `delivery_proofs/123/photo.jpg`).
  </action>
  <verify>
    - `grep -n "cleanup_expired_delivery_photos" apps/web/p2p-platform/backend/order_flow.py` shows function definition and scheduler registration
    - `grep -n "delivery_photo_cleanup" apps/web/p2p-platform/backend/order_flow.py` shows job ID in scheduler
    - `cd apps/web/p2p-platform/backend && python -c "from order_flow import cleanup_expired_delivery_photos; print('import OK')"` succeeds
  </verify>
  <done>
    Hourly APScheduler job registered that queries orders with delivery photos older than 12h, deletes S3 objects, nullifies delivery_photo_url, preserves delivery_photo_uploaded_at. Follows existing scheduler job patterns (fcntl file lock ensures single worker).
  </done>
</task>

<task type="auto">
  <name>Task 2: Android Partner delivery proof photo for self-delivery</name>
  <files>
    /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/DeliveryProofSheet.kt
    /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/OrdersViewModel.kt
    /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/OrderDetailsScreen.kt
    /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/repository/DollorRepository.kt
  </files>
  <action>
**Step 1 — Add vendor-specific upload method to DollorRepository.kt:**

Add `uploadDeliveryPhotoAsVendor` method near the existing `uploadDeliveryPhoto` (around line 1282). Same logic but uses `SecureStorage.UserType.VENDOR` instead of `DRIVER`:

```kotlin
suspend fun uploadDeliveryPhotoAsVendor(orderId: Int, imageBytes: ByteArray): Result<DeliveryActionResponse> =
    withContext(Dispatchers.IO) {
        val token = secureStorage.getAuthHeader(SecureStorage.UserType.VENDOR)
            ?: return@withContext Result.failure(Exception("Not authenticated"))
        val requestBody = imageBytes.toRequestBody("image/jpeg".toMediaTypeOrNull())
        val part = okhttp3.MultipartBody.Part.createFormData("file", "delivery_proof.jpg", requestBody)
        safeApiCall {
            apiService.uploadDeliveryPhoto(orderId, part, token)
        }
    }
```

The API endpoint `POST /erp/orders/{orderId}/delivery-photo` accepts both driver and vendor auth (uses `require_any_auth`), so the vendor token will work.

**Step 2 — Create DeliveryProofSheet.kt in partner app:**

Create `/Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/DeliveryProofSheet.kt`.

Port from driver's `DeliveryProofSheet.kt` but:
- Package: `ai.dollor.partner.ui.orders`
- Import theme colors from `ai.dollor.partner.ui.theme` (use `DollorPartnerColors` if exists, otherwise use Material3 defaults with green accent `Color(0xFF06C167)` matching existing Partner app buttons)
- Same 3 states: instructions (no photo), preview (photo taken), uploading
- Same callbacks: `onOpenCamera`, `onRetake`, `onSubmit`, `onDismiss`

**Step 3 — Add photo state and upload logic to OrdersViewModel.kt:**

Add to `OrdersUiState`:
```kotlin
val showDeliveryProof: Boolean = false,
val capturedPhotoBytes: ByteArray? = null,
val isUploadingPhoto: Boolean = false,
val deliveryProofOrderId: Long? = null
```

Add methods to OrdersViewModel:
```kotlin
fun showDeliveryProofSheet(orderId: Long) {
    _uiState.update { it.copy(showDeliveryProof = true, deliveryProofOrderId = orderId, capturedPhotoBytes = null) }
}

fun onPhotoCaptured(bytes: ByteArray) {
    _uiState.update { it.copy(capturedPhotoBytes = bytes) }
}

fun retakePhoto() {
    _uiState.update { it.copy(capturedPhotoBytes = null) }
}

fun dismissDeliveryProof() {
    _uiState.update { it.copy(showDeliveryProof = false, capturedPhotoBytes = null, deliveryProofOrderId = null) }
}

fun submitDeliveryProof() {
    val orderId = _uiState.value.deliveryProofOrderId ?: return
    val photoBytes = _uiState.value.capturedPhotoBytes ?: return
    viewModelScope.launch {
        _uiState.update { it.copy(isUploadingPhoto = true) }
        dollorRepository.uploadDeliveryPhotoAsVendor(orderId.toInt(), photoBytes)
            .onSuccess {
                // Photo uploaded, now mark delivered
                dollorRepository.updateOrderStatus(orderId.toInt(), "delivered").fold(
                    onSuccess = {
                        updateLocalOrderStatus(orderId, OrderStatus.DELIVERED)
                        _uiState.update { it.copy(
                            isUploadingPhoto = false, showDeliveryProof = false,
                            capturedPhotoBytes = null, deliveryProofOrderId = null
                        )}
                        refreshOrders()
                    },
                    onFailure = { error ->
                        _uiState.update { it.copy(isUploadingPhoto = false, error = "Photo uploaded but failed to mark delivered: ${error.message}") }
                    }
                )
            }
            .onFailure { error ->
                _uiState.update { it.copy(isUploadingPhoto = false, error = "Failed to upload proof photo: ${error.message}") }
            }
    }
}
```

**Step 4 — Wire into OrderDetailsScreen.kt:**

In OrderDetailsScreen.kt, change the "out_for_delivery" Mark as Delivered button (around line 391-401) from directly calling `onStatusUpdate("delivered")` to calling a new `onMarkDelivered` callback that triggers the delivery proof sheet.

In OrdersScreen.kt (or wherever OrderDetailsScreen is hosted), when status is "out_for_delivery", the "Mark as Delivered" button should call `viewModel.showDeliveryProofSheet(order.id)` instead of `viewModel.markDelivered(order.id)`.

Add the `DeliveryProofSheet` composable conditionally when `uiState.showDeliveryProof` is true. Use `rememberLauncherForActivityResult(ActivityResultContracts.TakePicture())` or the simpler `ActivityResultContracts.TakePicturePreview()` for camera capture — match the same camera pattern used in the driver app's `ActiveDeliveryScreen.kt`.

Check the driver's `ActiveDeliveryScreen.kt` for the camera launcher pattern and replicate it in the partner's OrdersScreen or OrderDetailsScreen.
  </action>
  <verify>
    - File exists: `/Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/DeliveryProofSheet.kt`
    - `grep -n "uploadDeliveryPhotoAsVendor" /Users/jeet/StudioProjects/eatfair-android/shared/src/main/java/ai/dollor/shared/data/repository/DollorRepository.kt` shows vendor-specific upload
    - `grep -n "showDeliveryProofSheet\|submitDeliveryProof" /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/OrdersViewModel.kt` shows new methods
    - `grep -n "DeliveryProofSheet" /Users/jeet/StudioProjects/eatfair-android/partner/src/main/java/ai/dollor/partner/ui/orders/OrderDetailsScreen.kt` shows integration
    - `cd /Users/jeet/StudioProjects/eatfair-android && ./gradlew :partner:compileDebugKotlin` compiles without errors
  </verify>
  <done>
    Android Partner app shows delivery proof camera sheet when restaurant taps "Mark as Delivered" during self-delivery flow. Photo uploads to `POST /erp/orders/{orderId}/delivery-photo` with vendor auth token, then automatically marks order as delivered. UI matches driver app's DeliveryProofSheet pattern.
  </done>
</task>

<task type="auto">
  <name>Task 3: Delivery notification audit for restaurant self-delivery flow</name>
  <files>
    .planning/quick/137-s3-photo-12h-retention-android-partner-d/137-DELIVERY-NOTIFICATION-AUDIT.md
  </files>
  <action>
Audit every push notification sent to the customer during the restaurant self-delivery flow by reading the backend code. Trace the complete flow through order_flow.py and main_new.py:

1. **Order placed** — Check `place_order` / `create_order` for customer confirmation notification
2. **Restaurant accepts** — Check `accept_order` endpoint for "Order Accepted" notification
3. **Preparing** — Check `start_preparing` endpoint for "Your order is being prepared" notification
4. **Ready for pickup** — Check `mark_ready` endpoint (this triggers delivery decision window for self-delivery)
5. **Restaurant will self-deliver** — Check `accept_self_delivery` endpoint (line ~1918) for "restaurant_will_deliver" notification to customer (already confirmed at line 1978-1991)
6. **Out for delivery** — Check status update to "out_for_delivery" — does the generic `update_order_status` endpoint send a push? Or does the restaurant client need to be the trigger?
7. **Arriving** — Check if there's a "driver arriving" equivalent for self-delivery
8. **Delivered with photo** — Check `upload_delivery_photo` (line 4412) and the delivered status transition for delivery confirmation notification

For each step, document:
- Endpoint path and function name
- Notification title and body text (exact strings from code)
- FCM data payload fields
- Whether iOS and Android both handle it (check client-side notification handling if visible)
- Any gaps (steps where NO notification is sent but should be)

Also check `send_push_notification` function definition (line 159 in order_flow.py) for FCM payload format.

Write the audit report to `137-DELIVERY-NOTIFICATION-AUDIT.md` with a table format showing each step, the notification details, and any identified gaps.
  </action>
  <verify>
    - File exists: `.planning/quick/137-s3-photo-12h-retention-android-partner-d/137-DELIVERY-NOTIFICATION-AUDIT.md`
    - Report covers all 7-8 steps of self-delivery flow
    - Each step has endpoint, notification text, FCM payload documented
    - Gaps (missing notifications) are explicitly called out
  </verify>
  <done>
    Complete audit report documenting every push notification in the restaurant self-delivery flow, with exact notification text, endpoints, FCM payloads, and identified gaps where notifications are missing.
  </done>
</task>

</tasks>

<verification>
- Backend: `cd apps/web/p2p-platform/backend && python -c "from order_flow import cleanup_expired_delivery_photos; print('OK')"` imports successfully
- Backend: `grep -c "delivery_photo_cleanup" apps/web/p2p-platform/backend/order_flow.py` returns 1+ (scheduler registration)
- Android: `cd /Users/jeet/StudioProjects/eatfair-android && ./gradlew :partner:compileDebugKotlin` compiles
- Audit: `wc -l .planning/quick/137-s3-photo-12h-retention-android-partner-d/137-DELIVERY-NOTIFICATION-AUDIT.md` shows substantial report (50+ lines)
</verification>

<success_criteria>
1. S3 cleanup job runs hourly, deletes photos > 12h old, nullifies delivery_photo_url, preserves delivery_photo_uploaded_at
2. Android Partner app requires delivery proof photo before marking self-delivery orders as delivered
3. Notification audit report documents every push in self-delivery flow with gaps identified
</success_criteria>

<output>
After completion, create `.planning/quick/137-s3-photo-12h-retention-android-partner-d/137-SUMMARY.md`
</output>

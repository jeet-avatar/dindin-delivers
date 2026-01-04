# Dollor.ai App Store / Play Store Submission Checklist

## Pre-Submission Requirements

### 1. App Functionality (Must Have)
- [x] User registration with email
- [x] User login (email/password, Google, Apple)
- [x] Email verification flow
- [x] Password reset functionality
- [x] Terms & Conditions acceptance
- [x] Privacy Policy accessible in-app
- [x] Account deletion (required by both stores)
- [x] Push notification support

### 2. Demo Accounts (Required for App Review)
Create demo accounts at: `POST /api/demo/setup`

| App | Email | Password |
|-----|-------|----------|
| Customer | demo.customer@dollor.ai | DemoCustomer2025! |
| Driver | demo.driver@dollor.ai | DemoDriver2025! |
| Restaurant | demo.restaurant@dollor.ai | DemoRestaurant2025! |

---

## Google Play Store Checklist

### App Content
- [ ] Store listing title (max 50 chars): "Dollor.ai - Food Delivery"
- [ ] Short description (max 80 chars)
- [ ] Full description (max 4000 chars)
- [ ] App icon (512x512 PNG, no alpha)
- [ ] Feature graphic (1024x500 PNG or JPG)
- [ ] Screenshots (minimum 2, recommended 4-8)
  - [ ] Phone screenshots (16:9 or 9:16)
  - [ ] Tablet screenshots (optional but recommended)

### Privacy & Data Safety
- [ ] Privacy Policy URL (must be publicly accessible)
- [ ] Data safety form completed:
  - [ ] Location data collection disclosed
  - [ ] Personal info (name, email, phone) disclosed
  - [ ] Payment info collection disclosed
  - [ ] Data sharing with third parties disclosed

### App Compliance
- [x] Account deletion feature implemented
- [x] Terms of Service accessible
- [x] Privacy Policy accessible
- [ ] Content ratings questionnaire completed
- [ ] Target audience declared
- [ ] Sensitive permissions justified:
  - [ ] Location (for delivery/rideshare)
  - [ ] Camera (for document upload)
  - [ ] Notifications

### Technical Requirements
- [ ] Target SDK 34 (Android 14) or higher
- [ ] Minimum SDK 24 (Android 7.0) or higher
- [ ] App Bundle (AAB) format required
- [ ] 64-bit support included
- [ ] Deobfuscation file uploaded (mapping.txt)
- [ ] App signing by Google Play enabled

### Build Commands
```bash
# Production AAB for Play Store
./gradlew :app:bundleProductionRelease

# Debug APK for testing
./gradlew :app:assembleProductionDebug
```

---

## Apple App Store Checklist

### App Store Connect Setup
- [ ] App record created
- [ ] Bundle ID registered: `ai.dollor.customer`
- [ ] Signing certificates configured
- [ ] Provisioning profiles created

### App Information
- [ ] App name (max 30 chars)
- [ ] Subtitle (max 30 chars)
- [ ] Description (4000 chars max)
- [ ] Keywords (100 chars max, comma-separated)
- [ ] Support URL
- [ ] Marketing URL (optional)
- [ ] Privacy Policy URL (required)

### Screenshots (Required)
- [ ] 6.5" display (iPhone 15 Pro Max): 1290 x 2796 or 2796 x 1290
- [ ] 5.5" display (iPhone 8 Plus): 1242 x 2208 or 2208 x 1242
- [ ] iPad Pro 12.9" (if iPad supported): 2048 x 2732

### App Review Information
- [ ] Demo account credentials provided
- [ ] Contact information for reviewer
- [ ] Notes explaining special features
- [ ] Test location data (if needed for location-based features)

### Privacy Requirements
- [x] App Privacy "nutrition labels" configured
- [ ] Data collection disclosures:
  - [ ] Location (Precise/Coarse)
  - [ ] Contact Info (Name, Email, Phone)
  - [ ] Identifiers (User ID)
  - [ ] Financial Info (Payment methods)
  - [ ] Usage Data

### iOS Specific Compliance
- [x] Sign in with Apple implemented (if other third-party login)
- [x] Location permission usage strings provided
- [x] Camera permission usage strings provided
- [x] Push notification entitlement
- [ ] App Transport Security exceptions (if any)

### Build & Upload
```bash
# Xcode Archive
Product > Archive

# Upload to App Store Connect
Distribute App > App Store Connect > Upload
```

---

## Content & Legal

### Required Legal Documents
- [x] Terms of Service / Terms of Use
- [x] Privacy Policy
- [x] California Privacy Rights (CCPA/CPRA)
- [ ] Refund Policy
- [ ] Driver/Restaurant Partner Agreements

### Content Guidelines
- [ ] No placeholder content
- [ ] All text properly localized
- [ ] No references to "beta" or "test"
- [ ] All images owned or licensed
- [ ] No copyrighted material without permission

---

## Testing Before Submission

### Functional Testing
- [ ] Fresh install works correctly
- [ ] Sign up flow completes without errors
- [ ] Login/logout works correctly
- [ ] Push notifications received
- [ ] Location services work correctly
- [ ] Payment flow works (use test cards)
- [ ] Order placement flow works
- [ ] Order tracking works
- [ ] Account deletion works

### Edge Cases
- [ ] App handles no internet gracefully
- [ ] App handles session expiry
- [ ] App handles invalid input gracefully
- [ ] Deep links work correctly
- [ ] App handles low memory conditions

### Performance
- [ ] App launches within 5 seconds
- [ ] No ANR (Android) / freeze issues
- [ ] Memory usage is reasonable
- [ ] Battery usage is acceptable

---

## Post-Submission

### If Rejected
1. Review rejection reasons carefully
2. Make required changes
3. Respond to reviewer with explanation
4. Resubmit for review

### Common Rejection Reasons
- Missing demo credentials
- Privacy policy URL not accessible
- Account deletion not working
- Placeholder content
- Crashes during review
- Guideline violations

### After Approval
- [ ] Set release date (or release immediately)
- [ ] Monitor crash reports
- [ ] Monitor user reviews
- [ ] Prepare for updates

---

## App-Specific Configurations

### Customer App (ai.dollor.customer)
- Uses location for: Finding nearby restaurants, delivery tracking
- Collects: Name, email, phone, addresses, payment info
- Integrates: Google Maps, Stripe, Firebase

### Driver App (ai.dollor.driver)
- Uses location for: Accepting deliveries, navigation
- Collects: Name, email, phone, driver's license, vehicle info
- Background location required for active deliveries

### Restaurant App (ai.dollor.partner)
- Uses camera for: Menu item photos, document uploads
- Collects: Business info, bank details, menu data
- Push notifications for new orders

---

## Production URLs

| Service | URL |
|---------|-----|
| API | https://api.dollor.ai |
| Privacy Policy | https://dollor.ai/privacy |
| Terms of Service | https://dollor.ai/terms |
| Support | support@dollor.ai |

---

*Last Updated: January 2, 2025*

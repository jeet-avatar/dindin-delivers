# Legal Documents for Dollor AI Service

## Files Included

| File | Purpose | Deploy To |
|------|---------|-----------|
| `terms.html` | Terms of Service (web version) | https://dollor.ai/terms |
| `privacy.html` | Privacy Policy (web version) | https://dollor.ai/privacy |
| `TERMS_OF_SERVICE.md` | Full Terms (Markdown) | Reference/backup |
| `PRIVACY_POLICY.md` | Full Privacy Policy (Markdown) | Reference/backup |

## Deployment Instructions

### Option 1: Upload to AWS S3 (Recommended)

```bash
# Upload to S3 bucket
aws s3 cp terms.html s3://your-bucket/terms.html --content-type "text/html"
aws s3 cp privacy.html s3://your-bucket/privacy.html --content-type "text/html"

# Set public read permissions
aws s3api put-object-acl --bucket your-bucket --key terms.html --acl public-read
aws s3api put-object-acl --bucket your-bucket --key privacy.html --acl public-read
```

### Option 2: Add to Backend Server

Copy `terms.html` and `privacy.html` to your backend's static files directory and configure routes:
- `/terms` → serves `terms.html`
- `/privacy` → serves `privacy.html`

### Option 3: Add to Website Root

Upload files to your web server:
- `https://dollor.ai/terms.html` (then redirect `/terms` to `/terms.html`)
- `https://dollor.ai/privacy.html` (then redirect `/privacy` to `/privacy.html`)

## App Store Requirements Checklist

These documents meet Apple's requirements for:

- [x] **Privacy Policy URL** - Required for all apps
- [x] **Terms of Service** - Required for apps with subscriptions/purchases
- [x] **Data Collection Disclosure** - Details what data is collected
- [x] **Data Usage Disclosure** - Explains how data is used
- [x] **Data Sharing Disclosure** - Lists third parties
- [x] **User Rights** - Explains how users can access/delete data
- [x] **Children's Privacy (COPPA)** - States app is 18+
- [x] **California Privacy (CCPA)** - California-specific rights
- [x] **European Privacy (GDPR)** - EU-specific rights
- [x] **Apple-Specific Terms** - Required acknowledgments for iOS apps

## Before App Store Submission

1. **Deploy the HTML files** to your website
2. **Test the URLs** work correctly:
   - https://dollor.ai/terms
   - https://dollor.ai/privacy
3. **Add URLs to App Store Connect**:
   - App Information > Privacy Policy URL
   - App Information > Terms of Use URL (optional but recommended)

## Customization Required

Before deploying, update these placeholders:

### In Both Files:
- `[Your Business Address]` - Add your actual business address

### Create Email Addresses:
- `legal@dollor.ai` - For legal inquiries
- `privacy@dollor.ai` - For privacy requests
- `support@dollor.ai` - For customer support
- `dpo@dollor.ai` - For data protection officer (GDPR)

## Version Control

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | December 7, 2024 | Initial release |

## Legal Notice

These documents are templates. Consider having a lawyer review them before publishing, especially for:
- Your specific jurisdiction requirements
- Industry-specific regulations (food delivery, transportation)
- State-specific privacy laws

## Contact

For questions about these documents, contact the development team.

#!/bin/bash
# EatFair - Google Cloud Permissions Setup Script
# Run this after authenticating with: ~/google-cloud-sdk/bin/gcloud auth login

set -e

GCLOUD="$HOME/google-cloud-sdk/bin/gcloud"
PROJECT_ID="eatfair-app"

echo "🔧 Setting up Google Cloud permissions for EatFair..."

# Set project
echo "📁 Setting project to $PROJECT_ID..."
$GCLOUD config set project $PROJECT_ID

# Enable all required APIs
echo "🔌 Enabling required APIs..."
$GCLOUD services enable \
  cloudfunctions.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  run.googleapis.com \
  eventarc.googleapis.com \
  cloudscheduler.googleapis.com \
  pubsub.googleapis.com \
  firestore.googleapis.com

# Get project number
echo "🔢 Getting project number..."
PROJECT_NUMBER=$($GCLOUD projects describe $PROJECT_ID --format='value(projectNumber)')
echo "   Project number: $PROJECT_NUMBER"

# Service accounts
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
CLOUDBUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

echo "👤 Service accounts:"
echo "   Compute: $COMPUTE_SA"
echo "   Cloud Build: $CLOUDBUILD_SA"

# Add roles to Compute service account
echo "🔑 Adding roles to Compute service account..."

$GCLOUD projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$COMPUTE_SA" \
  --role="roles/cloudfunctions.developer" \
  --quiet

$GCLOUD projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$COMPUTE_SA" \
  --role="roles/cloudbuild.builds.builder" \
  --quiet

$GCLOUD projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$COMPUTE_SA" \
  --role="roles/iam.serviceAccountUser" \
  --quiet

$GCLOUD projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$COMPUTE_SA" \
  --role="roles/artifactregistry.writer" \
  --quiet

$GCLOUD projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$COMPUTE_SA" \
  --role="roles/storage.objectAdmin" \
  --quiet

# Add roles to Cloud Build service account
echo "🔑 Adding roles to Cloud Build service account..."

$GCLOUD projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CLOUDBUILD_SA" \
  --role="roles/cloudfunctions.developer" \
  --quiet

$GCLOUD projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CLOUDBUILD_SA" \
  --role="roles/iam.serviceAccountUser" \
  --quiet

$GCLOUD projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CLOUDBUILD_SA" \
  --role="roles/logging.logWriter" \
  --quiet

$GCLOUD projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$CLOUDBUILD_SA" \
  --role="roles/storage.objectViewer" \
  --quiet

echo ""
echo "✅ All permissions configured successfully!"
echo ""
echo "🚀 Now deploy your functions with:"
echo "   cd ~/StudioProjects/eatfair-ios && firebase deploy --only functions"

---
created: 2026-03-15T00:00:00Z
title: "D2: Encrypt POS API keys/secrets at rest"
area: security/encryption
severity: CRITICAL
files:
  - apps/web/p2p-platform/backend/models.py
  - apps/web/p2p-platform/backend/encryption.py
---

## Problem

Vendor POS integration credentials stored as plaintext:
- kot_api_key (models.py Vendor class)
- kot_api_secret

A database breach would expose third-party API credentials.

## Solution

Same encryption module as D1. Encrypt on write, decrypt on read.

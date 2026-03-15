---
created: 2026-03-15T00:00:00Z
title: "D3: Remove PII (emails, phones) from log statements"
area: security/data-protection
severity: MEDIUM
files:
  - apps/web/p2p-platform/backend/main_new.py
---

## Problem

8+ locations log email addresses in plaintext via print() and logger.info(). A log breach would expose user emails.

## Solution

Replace email with masked version (j***@gmail.com) or user ID only.

---
created: 2026-03-05T06:43:42.940Z
title: Check App Store review status build 1111
area: general
files: []
---

## Problem

Customer iOS build 1111 was submitted to App Store review on 2026-03-04 and was WAITING_FOR_REVIEW. Driver (213) and Restaurant (183) submissions are blocked until Customer passes review.

## Solution

1. Generate ASC JWT and check build 1111 review status
2. If approved: submit Driver + Restaurant apps
3. If rejected: read rejection notes and fix issues

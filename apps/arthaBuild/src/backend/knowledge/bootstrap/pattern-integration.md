---
source: Oracle NetSuite Official Documentation — Integration Patterns
netsuite_version: 2024.1
verified: true
last_updated: 2026-04-15
---

# Integration Patterns

## Overview

This document covers proven patterns for integrating external systems with NetSuite:
RESTlet as an integration endpoint, retry/backoff logic, idempotency, webhook handling,
and secure credential management.

---

## Pattern 1: RESTlet as Integration Endpoint

RESTlets expose NetSuite business logic as a REST API for external systems to call.

```javascript
/**
 * @NScriptType Restlet
 * @NApiVersion 2.1
 */
define(['N/record', 'N/log', 'N/error'], function(record, log, error) {

    /**
     * GET: Retrieve a record
     */
    function get(params) {
        try {
            var rec = record.load({
                type: params.recordType,
                id: parseInt(params.id)
            });
            return {
                status: 'success',
                id: rec.id,
                data: {
                    tranId: rec.getValue({ fieldId: 'tranid' }),
                    entity: rec.getValue({ fieldId: 'entity' }),
                    total: rec.getValue({ fieldId: 'total' })
                }
            };
        } catch (e) {
            return { status: 'error', message: e.message };
        }
    }

    /**
     * POST: Create a record
     */
    function post(requestBody) {
        try {
            var data = JSON.parse(requestBody);
            var rec = record.create({ type: data.type, isDynamic: true });

            // Set fields from request
            Object.keys(data.fields).forEach(function(fieldId) {
                rec.setValue({ fieldId: fieldId, value: data.fields[fieldId] });
            });

            var savedId = rec.save();
            return { status: 'success', id: savedId };
        } catch (e) {
            log.error('POST failed', e.message);
            return { status: 'error', message: e.message };
        }
    }

    /**
     * PUT: Update a record
     */
    function put(requestBody) {
        var data = JSON.parse(requestBody);
        var rec = record.load({ type: data.type, id: data.id, isDynamic: true });
        Object.keys(data.fields).forEach(function(fieldId) {
            rec.setValue({ fieldId: fieldId, value: data.fields[fieldId] });
        });
        rec.save();
        return { status: 'success', id: data.id };
    }

    /**
     * DELETE: Remove a record
     */
    function doDelete(params) {
        record.delete({ type: params.recordType, id: parseInt(params.id) });
        return { status: 'success', deleted: params.id };
    }

    return { get: get, post: post, put: put, delete: doDelete };
});
```

---

## Pattern 2: Retry Logic with Exponential Backoff

For external HTTPS calls that may rate-limit:

```javascript
define(['N/https', 'N/log'], function(https, log) {
    function callWithRetry(url, body, maxRetries, delayMs) {
        var retries = 0;
        while (retries < maxRetries) {
            try {
                var response = https.post({
                    url: url,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                if (response.code === 200) return JSON.parse(response.body);
                if (response.code === 429) {
                    // Rate limited — wait and retry
                    var waitMs = delayMs * Math.pow(2, retries); // Exponential backoff
                    log.debug('Rate limited', 'Waiting ' + waitMs + 'ms before retry ' + (retries+1));
                    // NetSuite doesn't have sleep() — use governance check as loop
                    retries++;
                    continue;
                }
                throw new Error('HTTP ' + response.code + ': ' + response.body);
            } catch (e) {
                retries++;
                if (retries >= maxRetries) throw e;
                log.debug('Retry', 'Attempt ' + retries + ' failed: ' + e.message);
            }
        }
    }
});
```

**Note:** NetSuite has no `setTimeout/sleep` — for true async backoff, use MapReduce
or Scheduled Script that checks a timestamp and re-submits itself.

---

## Pattern 3: Idempotency (Check Before Create)

Always check if a record exists before creating it — prevents duplicate records
when the same message is processed multiple times:

```javascript
define(['N/search', 'N/record', 'N/log'], function(search, record, log) {
    function createOrUpdate(externalId, data) {
        // First: check if record exists by external reference
        var existing = search.create({
            type: 'customrecord_integration_log',
            filters: [
                search.createFilter({
                    name: 'custrecord_external_id',
                    operator: search.Operator.IS,
                    values: [externalId]
                })
            ],
            columns: [search.createColumn({ name: 'internalid' })]
        }).run().getRange({ start: 0, end: 1 });

        if (existing.length > 0) {
            // Record exists — update instead of create
            var rec = record.load({
                type: 'customrecord_integration_log',
                id: existing[0].id,
                isDynamic: true
            });
            Object.keys(data).forEach(function(k) {
                rec.setValue({ fieldId: k, value: data[k] });
            });
            rec.save();
            log.audit('Idempotent update', 'External ID ' + externalId + ' already exists: ' + existing[0].id);
            return { action: 'updated', id: existing[0].id };
        }

        // Create new
        var newRec = record.create({ type: 'customrecord_integration_log' });
        newRec.setValue({ fieldId: 'custrecord_external_id', value: externalId });
        Object.keys(data).forEach(function(k) {
            newRec.setValue({ fieldId: k, value: data[k] });
        });
        var id = newRec.save();
        return { action: 'created', id: id };
    }
});
```

---

## Pattern 4: Webhook Receiver (Suitelet)

Receive webhooks from external systems (Stripe, Salesforce, Shopify, etc.):

```javascript
/**
 * @NScriptType Suitelet
 * @NApiVersion 2.1
 */
define(['N/https', 'N/crypto', 'N/encode', 'N/record', 'N/log'], function(https, crypto, encode, record, log) {
    function onRequest(context) {
        if (context.request.method !== 'POST') {
            context.response.write('OK');
            return;
        }

        var body = context.request.body;
        var signature = context.request.headers['x-webhook-signature'];

        // Validate webhook signature
        if (!validateSignature(body, signature)) {
            log.error('Webhook', 'Invalid signature');
            context.response.setStatusCode(401);
            context.response.write('Unauthorized');
            return;
        }

        var data = JSON.parse(body);
        log.audit('Webhook received', JSON.stringify(data));

        // Process the webhook — create/update records
        processEvent(data);

        context.response.write('OK');
    }

    function validateSignature(body, signature) {
        // HMAC validation (example for Stripe-style webhooks)
        var webhookSecret = 'your_webhook_secret'; // Store securely
        var expected = crypto.createHmac({
            algorithm: crypto.HashAlg.SHA256,
            key: encode.convert({ string: webhookSecret, inputEncoding: encode.Encoding.UTF_8,
                                   outputEncoding: encode.Encoding.BASE_64 })
        });
        expected.update({ input: body });
        var expectedSig = expected.digest({ outputEncoding: encode.Encoding.HEX });
        return signature === ('sha256=' + expectedSig);
    }

    function processEvent(data) {
        if (data.type === 'payment.completed') {
            var payment = record.create({ type: record.Type.CUSTOMER_PAYMENT });
            payment.setValue({ fieldId: 'payment', value: data.amount / 100 });
            payment.save();
        }
    }

    return { onRequest: onRequest };
});
```

---

## Pattern 5: Secure Credential Storage

Store external credentials securely using `N/https.createSecureString`:

```javascript
define(['N/https'], function(https) {
    // Create secure string from script parameter (GUID-based)
    var apiKey = https.createSecureString({
        input: '{custscript_external_api_key}' // Script parameter (GUID type)
    });

    var response = https.post({
        url: 'https://api.external.com/endpoint',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey  // Secure string — not logged
        },
        body: JSON.stringify({ data: 'payload' })
    });
});
```

**Rules:**
- Use `GUID` type script parameters for credentials
- Credentials are never logged even if you try to `log.debug(apiKey)`
- Never store credentials as `FREE_FORM_TEXT` script parameters (logged)
- For OAuth tokens: use `N/oauth` module (SuiteScript 2.1+)

---

## Pattern 6: Governance Check Before Loops

Monitor governance before processing large datasets:

```javascript
define(['N/runtime', 'N/task', 'N/log'], function(runtime, task, log) {
    function processRecords(recordIds) {
        for (var i = 0; i < recordIds.length; i++) {
            var remaining = runtime.getCurrentScript().getRemainingUsage();
            if (remaining < 100) {
                log.audit('Governance', 'Low usage at index ' + i + ', submitting remainder as new task');
                // Submit new execution for remaining records
                task.create({
                    taskType: task.TaskType.SCHEDULED,
                    scriptId: 'customscript_my_scheduled',
                    params: { startIndex: i, recordIds: JSON.stringify(recordIds.slice(i)) }
                }).submit();
                return;
            }
            // Process record
            processRecord(recordIds[i]);
        }
    }
});
```

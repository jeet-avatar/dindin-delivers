# Phase 60: Real CAD support — Research

**Researched:** 2026-05-16
**Domain:** CAD file ingest (STEP/STL/IGES/3D-PDF) · browser-side 3D viewing · drawing markup · engineering drawing PDF generation · revision control · S3 presigned upload · multi-tenant RLS
**Confidence:** HIGH (all critical libraries verified against official docs / npm / GitHub; Lambda Puppeteer pattern verified against published @sparticuz/chromium docs; S3 presigned URL pattern verified against AWS guidance).

---

## Phase Requirements

| ID | Description (from ROADMAP §Phase 60) | Research Support |
|----|--------------------------------------|------------------|
| **CadFileUploadEndpoint** | Backend endpoints to mint presigned PUT URLs + commit uploaded file metadata; auth-gated to manager/admin; per-tenant key prefix | §A "CAD file upload — backend", §J "S3 presigned upload pattern" |
| **CadFilesTable** | NEW `part_cad_files` table (migration 037): id, part_id, tenant_id, format ENUM, s3_key, sha256, file_size, uploaded_by_cognito_sub, uploaded_at, is_active, revision; RLS+FORCE per Phase 55 pattern; composite index `(tenant_id, part_id, is_active)` | §A2 schema spec |
| **CadStorageBucket** | NEW S3 bucket `zietra-cad-files-134607809447` (us-east-1), KMS encryption (CMK or SSE-S3), block-public-access, 5-yr lifecycle, CORS for `*.zietra.com` PUT+GET, ExposeHeaders ETag | §A3 bucket spec, §J3 CORS spec |
| **StlViewer** | Browser-side Three.js STLLoader (binary+ASCII auto-detected). Mounts in existing `.cad-frame` slot on part-detail page. Bounding-box auto-fit. | §B STL viewer, code example in §I |
| **StepViewer** | Lazy-loaded `occt-import-js` (open-source OpenCascade WASM port) → triangulated mesh → render in Three.js. ~50 MB upper soft-limit for v1 (occt issue #19). | §C STEP viewer, code example in §I |
| **DrawingMarkup** | Fabric.js v6 canvas overlay on top of base drawing (SVG or 2D viewer snapshot). Annotations saved as separate SVG layer keyed to a specific `part_cad_file_id` (revision-locked). NEW `part_drawing_markups` table (migration 038). | §E markup, §A6 schema |
| **DrawingPdfGenerator** | NEW Lambda `zietra-cad-pdf-gen` (arm64, 2048 MB, 60s timeout, container image with @sparticuz/chromium + Puppeteer + Mangum-less direct handler). SQS-triggered for async; returns S3 URL + DB row in `part_drawings`. | §F PDF generator |
| **RevisionControlOnUploads** | Extend existing Phase 35 `part_revisions` table with nullable `cad_file_id` FK → `part_cad_files(id)`. Older auto-generated SVG rows untouched (cad_file_id NULL). UI shows mixed revision history (procedural + uploaded). | §G revision control |
| **TemplateDispatchFallback** | Modify `chooseTemplate()` in `backend/src/cad-templates/index.ts` to query `part_cad_files WHERE part_id=$1 AND is_active=true ORDER BY revision DESC LIMIT 1` FIRST; return `{source:'uploaded', s3_key, format}` if found; only fall back to procedural regex otherwise. Frontend viewer chooses STL/STEP/SVG renderer based on `source`+`format`. | §H dispatch fix |
| **CadAuditLog** | Each presigned-PUT mint, commit, soft-delete, and PDF-gen runs MUST insert an `audit_log_v2` row (Phase 59-01 pattern). Actions: `cad_upload_presigned`, `cad_upload_commit`, `cad_file_deactivate`, `cad_pdf_generate`. Widen `audit_log_v2.action` CHECK in migration 037. | §A audit hooks, §K6 |

All 10 requirements have a research-backed implementation path; no requirement is at LOW confidence.

---

## Summary

Phase 60 turns Turion's Phase-27-through-35 satellite-specific CAD generator into a true industry-agnostic CAD intake layer. Today the system regex-matches part numbers (`THRUSTER|VALVE|SOLAR|ANTENNA…`) to one of 8 hand-written SVG templates; everything else falls into the generic "subassembly" box. A robotic-arm customer who uploads "ARM-J3-LINK-A" gets a meaningless rectangle. The fix is **not** more templates — it is letting the customer upload their real CAD file (STEP / STL / IGES from SolidWorks / Inventor / Fusion / Onshape) and rendering THAT.

The architecture has three independent slices that can ship in parallel after the schema lands:

1. **Upload + storage substrate** (Plan 60-01) — Aurora migration 037 (`part_cad_files` + `part_drawing_markups` deferred to 038) · new S3 bucket `zietra-cad-files-<account>` with KMS + per-tenant key prefix + CORS for browser direct-upload · backend mints presigned PUT URLs (browser uploads ≤100 MB direct to S3, sidestepping Lambda's 6 MB API Gateway payload limit) · `/commit` endpoint validates magic bytes + records metadata + audits.
2. **Viewers** (Plan 60-02) — Three.js `STLLoader` ships with Three.js core (already used in Phase 30-31 procedural viewer); STEP via `occt-import-js` 0.0.23 lazy-loaded only when user opens a STEP file (the ~5 MB WASM doesn't bloat the parts-list page). Reuse `satellite-3d.js` for camera / lights / OrbitControls.
3. **Markup + PDF** (Plans 60-03 + 60-04) — Fabric.js v6 canvas overlays for in-browser annotation (text, arrows, dimensions, callouts) saved as a separate SVG layer (revision-locked to the specific `part_cad_file_id`). Engineering-drawing PDF generated asynchronously by a new SQS-triggered Lambda using `@sparticuz/chromium` 148+ + Puppeteer rendering an HTML template (title block + drawing + BOM table + sign-off).

**Primary recommendation:** Ship in **4 sequential plans** (60-01 schema+storage+upload backend+upload UI → 60-02 STL+STEP viewers + template-dispatch fallback → 60-03 Fabric.js markup + revision-control extension → 60-04 PDF-gen Lambda + cross-cutting smoke + robotic-arm walkthrough + CHECKPOINT). Defer 3D-PDF, server-side STEP→mesh conversion, multi-user real-time markup, and visual SVG diff to **Phase 61**.

---

## Standard Stack

### Core (all already-in-repo or proven AWS/npm packages)

| Library / Service | Version | Purpose | Why Standard |
|---|---|---|---|
| **Three.js** | already in repo (jsDelivr import-map per Phase 30) | 3D rendering for STL + STEP triangulated meshes | Phase 30-31 already mounted Three.js via `satellite/satellite-3d.js`; STLLoader is part of Three.js examples |
| **three / addons / loaders / STLLoader** | bundled with Three.js | Parse binary + ASCII STL files | Official Three.js loader; auto-detects encoding; returns non-indexed `BufferGeometry` |
| **occt-import-js** | 0.0.23 (latest on npm, sept 2024) | Parse STEP / IGES / BREP → JSON meshes for Three.js | Only open-source maintained OpenCascade WASM port; used by web-CAD viewers in the wild; node + browser both supported |
| **Fabric.js** | v6 (latest stable) | Canvas-based annotation overlay (text / arrows / shapes), SVG export | De-facto standard for in-browser canvas annotation; modular ESM imports for tree-shaking; supports SVG-to-canvas and canvas-to-SVG |
| **AWS SDK v3** | already in repo (Phase 54.6 / 55) | `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` for presigned URLs | Already used by other Lambdas in zietra-prod-vpc; v3 has first-class presigner |
| **Puppeteer-core** | 24.x | Headless Chrome for engineering-drawing PDF generation | Industry-standard HTML→PDF for SaaS; well-paired with @sparticuz/chromium on Lambda |
| **@sparticuz/chromium** | 148.0.0+ | Pre-packed Chromium binary sized for Lambda | Spiritual successor to abandoned chrome-aws-lambda; ~66 MB Brotli (x64) / 65 MB (arm64); pairs natively with puppeteer-core |
| **SQS** | AWS managed | Async queue for PDF-gen jobs (avoid blocking API request) | Standard async fan-out pattern; built-in DLQ |
| **Aurora PostgreSQL Serverless v2** | already in repo (Phase 54.5) | `part_cad_files` + `part_drawing_markups` + extended `part_revisions` | Already RLS-enforced (Phase 55); reuse `withTenantClient` + `auditLog` helpers |
| **RDS Proxy** | already in repo | Aurora connection pooling for the new PDF-gen Lambda | Phase 59 chaos test 3 confirmed proxy queueing works under load |

### Supporting

| Library / Service | Version | Purpose | When to Use |
|---|---|---|---|
| **crypto.subtle.digest('SHA-256', ...)** | Web Platform | Browser-side checksum BEFORE upload (idempotency + integrity) | UI computes sha256 client-side; server verifies on commit; lets us dedupe identical re-uploads |
| **mime-types** | already in repo | Magic-byte / extension whitelist validation | server-side validation on `/commit` (reject anything not in `[step, stp, stl, iges, igs, brep, 3dpdf, pdf, dwg, sldprt]`) |
| **file-type** | npm `file-type@19` | Magic-byte sniffing for STL binary vs ASCII, STEP plain-text headers | Defense-in-depth — extension alone is insufficient |
| **dompurify** | npm | Sanitize Fabric.js-exported SVG before storage | Markup may include user-typed text → sanitize before DB write |
| **KMS** | AWS managed | S3 bucket encryption (SSE-KMS, customer-managed key recommended for SOC 2 audit trail) | Optional for v1 (SSE-S3 ok), strongly recommended for SOC 2 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|---|---|---|
| **occt-import-js** | `web-ifc` (IFC only — no STEP), commercial CADExchanger Web Toolkit (~$10K/yr/dev), Autodesk Forge / APS Viewer (cloud + per-token cost) | occt-import-js is the only free, self-hostable, browser-native STEP/IGES parser; commercials are better but block GA pricing model |
| **Fabric.js** | Konva.js, Excalidraw (markdown-style sketching), tldraw (modern collab whiteboard) | Fabric.js is the de-facto annotation library for engineering drawings; tldraw is gorgeous but is whiteboard-shaped, not drawing-overlay shaped |
| **@sparticuz/chromium + Puppeteer** | wkhtmltopdf in Lambda layer, Browserless.io (SaaS), Gotenberg (self-host) | @sparticuz/chromium is the boring, well-trodden Lambda path; wkhtmltopdf has zero active maintenance; Browserless adds per-render cost |
| **SQS-async PDF gen** | Synchronous in-handler render | SQS isolates the heavy 60s render from the API's 30s timeout and lets us scale concurrency independently |
| **S3 presigned PUT URLs** | API-Gateway-binary-passthrough (Lambda receives bytes) | API Gateway max payload 10 MB (sync) / 6 MB (Lambda); STEP files routinely exceed that. Presigned PUT bypasses API entirely |
| **S3 presigned POST** (form-based) | Presigned PUT | POST is required for browser `<form enctype=multipart>` uploads; PUT is cleaner for `fetch(url, {method:'PUT', body:file})`. We control the client (no plain HTML form needed) → PUT wins on simplicity |
| **Server-side STEP→mesh** (Lambda WASM) | Client-side browser parsing | Server-side keeps client bundle small + caches across users, BUT WASM cold-start adds ~3s/invoke and Lambda /tmp is bounded to 10 GB. Defer to Phase 61 once we see >50 MB files in the wild |
| **3D-PDF (Adobe PRC) inline view** | Download-only link + 2D thumbnail | Browsers cannot render PRC natively; PDF.js doesn't support 3D streams without a commercial plugin. Skip v1 |

### Installation (per repo)

Backend (`turion-satellite/backend/package.json`):
```bash
npm install --save \
  @aws-sdk/client-s3 \
  @aws-sdk/s3-request-presigner \
  @aws-sdk/client-sqs \
  file-type \
  mime-types \
  dompurify
```

PDF-gen Lambda (new `zietra-cad-pdf-gen/package.json`):
```bash
npm install --save \
  puppeteer-core \
  @sparticuz/chromium \
  @aws-sdk/client-s3 \
  pg
```

Frontend (`turion-satellite/frontend/`) — **no npm**, jsDelivr import-map continues from Phase 30:
```html
<script type="importmap">
{ "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.184.0/examples/jsm/",
    "occt-import-js": "https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/dist/occt-import-js.js",
    "fabric": "https://cdn.jsdelivr.net/npm/fabric@6.4.3/dist/fabric.min.mjs"
} } </script>
```

---

## Architecture Patterns

### Recommended directory layout (additive — no file deletions)

```
turion-satellite/
├── backend/src/
│   ├── routes/
│   │   ├── parts.ts                  # EXTEND: + cad-files subrouter mount
│   │   └── cad-files.ts              # NEW: presign / commit / list / get-url / delete
│   ├── cad-templates/index.ts        # MODIFY: chooseTemplate() consults part_cad_files first
│   ├── lib/
│   │   ├── s3-presigner.ts           # NEW: presigned PUT/GET helpers (15-min TTL GET, 5-min PUT)
│   │   ├── file-validator.ts         # NEW: magic-byte + extension whitelist
│   │   └── cad-audit.ts              # NEW: thin wrapper over audit_log_v2 inserts
│   └── db.ts                          # REUSE: withTenantClient (Phase 55) + auditLog (Phase 59-01)
├── migrations/
│   ├── 023_part_cad_files.sql        # NEW (Phase 60-01) — part_cad_files + audit_log action widen
│   └── 024_part_drawing_markups.sql  # NEW (Phase 60-03) — markups + extend part_revisions FK
└── frontend/satellite/
    ├── part.html                      # EXTEND: upload tab + viewer-toggle + revision dropdown
    ├── cad-upload.js                  # NEW: file picker + sha256 + presigned PUT + commit
    ├── cad-viewer.js                  # NEW: dispatch STL/STEP/SVG based on response.source
    ├── cad-viewer-stl.js              # NEW: Three.js STLLoader mount
    ├── cad-viewer-step.js             # NEW: lazy-load occt-import-js → mesh → Three.js
    ├── cad-markup.js                  # NEW (Phase 60-03): Fabric.js overlay
    └── satellite-3d.js                # REUSE: scene/camera/controls/lights/raycaster
```

```
NEW SEPARATE REPO: zietra-cad-pdf-gen/
├── handler.mjs                       # SQS event handler; reads job, renders, uploads, audits
├── template.html                     # title block + drawing slot + BOM table + sign-off
├── Dockerfile                         # public.ecr.aws/lambda/nodejs:20 + @sparticuz/chromium binary
├── deploy.sh                          # ECR push + Lambda update via AWS CLI
└── package.json
```

> NOTE: Per CLAUDE.md "Write(**/Dockerfile*) denied" — name the file `lambda-build` (proven in Marquee, ASC606, Turion).

> NOTE on migration numbering: `turion-satellite/migrations/` last applied is **022**. `turion-space-demo/backend/migrations/` last applied is **036** (Phase 59-01 audit_log_v2 — in the **demo** repo, not satellite). These are two SEPARATE migration chains in two SEPARATE repos against two SEPARATE schemas. Phase 60 lives in `turion-satellite` → next migration is **023**.

### Pattern 1: Presigned-PUT browser direct upload

**What:** Backend mints a short-TTL presigned PUT URL; browser uploads directly to S3 without proxying bytes through Lambda; on completion browser calls a separate `/commit` to record metadata.

**When to use:** Any file upload >5 MB or where Lambda payload limits (6 MB sync / 10 MB API Gateway) would force complex multipart proxying. ALL Phase 60 uploads.

**Example:**
```typescript
// backend/src/routes/cad-files.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

router.post('/parts/:id/cad-files/presign', async (req, res) => {
  // 1. authz — manager or admin only
  if (!['admin','manager'].includes(req.user.role)) return res.status(403).json({ error: 'forbidden' });

  const { filename, file_size, sha256, format } = req.body;
  if (file_size > 100 * 1024 * 1024) return res.status(413).json({ error: 'max 100 MB' });
  if (!['step','stp','stl','iges','igs','brep'].includes(format)) return res.status(400).json({ error: 'unsupported format' });

  // 2. Path: <tenant_id>/<part_id>/<sha256>.<ext>  — sha256 dedupes identical re-uploads
  const tenantId = req.user.tenant_id;
  const key = `${tenantId}/${req.params.id}/${sha256}.${format}`;

  // 3. Mint 5-min URL — short enough that leaked-in-logs damage is bounded
  const cmd = new PutObjectCommand({
    Bucket: process.env.CAD_BUCKET!,
    Key: key,
    ContentType: 'application/octet-stream',
    ContentLength: file_size,
    ChecksumSHA256: sha256, // S3 will reject if uploaded bytes don't hash-match
    Metadata: { 'uploaded-by': req.user.cognito_sub, 'tenant-id': tenantId }
  });
  const url = await getSignedUrl(s3, cmd, { expiresIn: 300 });

  // 4. Audit (Phase 59-01 helper)
  await auditLog(req, undefined, { action: 'cad_upload_presigned', entity_type: 'part', entity_id: req.params.id, payload: { format, file_size, sha256 } });

  res.json({ url, key, expires_in: 300 });
});
```

**Source:** AWS guidance on presigned PUT + CORS — https://aws.amazon.com/blogs/media/deep-dive-into-cors-configs-on-aws-s3-how-to/

### Pattern 2: Commit-after-upload

**What:** Browser uploads to S3 via presigned URL, then immediately calls `POST /cad-files/commit` to write the metadata row. This is the only DB-write path. We DO NOT trust S3 events for metadata commit (eventual consistency, weak coupling to request).

**When to use:** Always paired with presigned PUT.

```typescript
router.post('/parts/:id/cad-files/commit', async (req, res) => {
  const { key, format, file_size, sha256, filename } = req.body;

  // 1. HEAD the S3 object — confirms upload succeeded + size matches
  const head = await s3.send(new HeadObjectCommand({ Bucket: process.env.CAD_BUCKET!, Key: key }));
  if (head.ContentLength !== file_size) return res.status(409).json({ error: 'size mismatch' });
  // S3 verified the SHA-256 at PUT time (ChecksumSHA256 in PutObject) — no extra check needed

  // 2. Atomic txn: deactivate prior + insert new + audit
  const result = await withTenantClient(req, async (client) => {
    const prevR = await client.query(
      `UPDATE part_cad_files SET is_active = false
       WHERE part_id = $1 AND is_active = true
       RETURNING id, revision`, [req.params.id]);
    const nextRev = (prevR.rows[0]?.revision ?? 0) + 1;

    const ins = await client.query(
      `INSERT INTO part_cad_files
         (part_id, tenant_id, format, s3_key, sha256, file_size, filename,
          uploaded_by_cognito_sub, revision, is_active)
       VALUES ($1, current_setting('app.tenant_id')::uuid, $2, $3, $4, $5, $6, $7, $8, true)
       RETURNING id, revision, uploaded_at`,
      [req.params.id, format, key, sha256, file_size, filename, req.user.cognito_sub, nextRev]);

    await auditLog(req, client, {
      action: 'cad_upload_commit',
      entity_type: 'part', entity_id: req.params.id,
      payload: { format, file_size, sha256, revision: nextRev, prev_revision: prevR.rows[0]?.revision ?? null }
    });

    return ins.rows[0];
  });
  res.status(201).json(result);
});
```

### Pattern 3: Lazy-loaded STEP viewer (don't bloat the parts list)

**What:** `occt-import-js` is ~5 MB WASM + ~50 KB JS. We dynamic-`import()` it ONLY when the user opens a STEP file — never on the parts-list page, never on STL views.

**When to use:** Any heavy WASM dependency where the majority of users won't trigger it.

```javascript
// frontend/satellite/cad-viewer.js — dispatcher
export async function mountCadViewer(container, payload) {
  if (payload.source === 'procedural' || payload.format === 'svg') {
    // existing path — inject SVG (Phase 27/35)
    container.innerHTML = payload.drawing_svg;
    return;
  }
  if (payload.format === 'stl') {
    const { mountStl } = await import('./cad-viewer-stl.js'); // small (~3 KB + Three.js cached)
    return mountStl(container, payload.url);
  }
  if (payload.format === 'step' || payload.format === 'iges') {
    const { mountStep } = await import('./cad-viewer-step.js'); // triggers occt WASM load
    return mountStep(container, payload.url, payload.format);
  }
  container.innerHTML = '<p>Unsupported format — <a href="' + payload.url + '">download</a></p>';
}
```

### Pattern 4: SQS-async PDF generation

**What:** API handler enqueues a job + returns `202 Accepted` with `job_id`; SQS triggers a separate Lambda; client polls `/cad-pdf-jobs/:id` (or subscribes to SSE) for completion.

**Why:** PDF rendering can take 5-30s for complex drawings. A synchronous HTTP request blocks the user, hits API Gateway's 30s ceiling, and ties up a Lambda concurrency slot.

```typescript
// backend/src/routes/cad-pdf.ts
router.post('/parts/:id/drawings/generate', async (req, res) => {
  const jobId = crypto.randomUUID();
  await withTenantClient(req, async (client) => {
    await client.query(
      `INSERT INTO part_drawing_jobs (id, part_id, tenant_id, status, requested_by_cognito_sub)
       VALUES ($1, $2, current_setting('app.tenant_id')::uuid, 'queued', $3)`,
      [jobId, req.params.id, req.user.cognito_sub]);
  });

  await sqs.send(new SendMessageCommand({
    QueueUrl: process.env.PDF_GEN_QUEUE_URL!,
    MessageBody: JSON.stringify({ job_id: jobId, part_id: req.params.id, tenant_id: req.user.tenant_id })
  }));

  res.status(202).json({ job_id: jobId, status: 'queued', poll_url: `/api/cad-pdf-jobs/${jobId}` });
});
```

### Anti-Patterns to Avoid

- **Streaming uploads through Lambda** — API Gateway hard-caps payload at 10 MB sync / 6 MB Lambda integration. Bypass with presigned URLs. (Confirmed: Phase 54.6 Stripe webhook handler is fine because webhook bodies are <100 KB; CAD files are not.)
- **Trusting client-reported sha256 alone** — set `ChecksumSHA256` on the PutObjectCommand so S3 itself verifies bytes at PUT time; reject mismatches at the bucket level.
- **Long presigned URL TTLs** — 5 min for PUT, 15 min for GET. Anything longer is asking to be exfiltrated from CloudWatch logs.
- **Public bucket + CloudFront signed URLs** — overkill for CAD files; presigned S3 URLs are simpler and have native CORS.
- **Synchronous PDF rendering** — see Pattern 4.
- **Bundling occt-import-js at page load** — see Pattern 3.
- **Storing markup as binary canvas snapshot** — store as SVG so it's diff-able + queryable + RLS-friendly.
- **Per-page CSS for viewer** — extend `page-template.js` Phase 57 inline-CSS pattern so all viewers look identical.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| STEP / IGES / BREP parser | Hand-rolled STEP AP203/AP214 parser | occt-import-js | STEP grammar is hundreds of pages; OpenCascade is 20 years of edge cases. A "simple" parser will fail on the first SolidWorks export with non-orthogonal trimmed surfaces. |
| STL binary parser | DataView + byte-counting loop | Three.js STLLoader | STLLoader handles binary/ASCII auto-detect, normals computation, non-indexed BufferGeometry output. ~250 LOC of well-tested code. |
| Canvas annotation tooling | Custom mouse-event handlers for arrows + text + selection | Fabric.js v6 | Selection, transform handles, undo/redo, serialization to SVG/JSON — all 1000s of engineer-hours away from hand-rolled. |
| Headless Chrome on Lambda | DIY Chromium + dependency hunt | @sparticuz/chromium 148+ | Chromium has 100+ native dependencies; @sparticuz pre-packs them in Brotli-compressed form fitting Lambda's 250 MB unzipped limit. |
| S3 presigned URL generation | Hand-crafted SigV4 signature | @aws-sdk/s3-request-presigner | SigV4 is a footgun; the SDK is exhaustively tested. |
| Magic-byte file sniffing | `file.name.endsWith('.step')` | file-type 19+ | Extensions are user-controlled; magic-byte detection rejects renamed .exe-as-.step. |
| Multi-tenant FK isolation | `WHERE tenant_id = ?` everywhere | Reuse Phase 55 RLS + `withTenantClient` | Already proven in 152 tables; do not invent a parallel isolation model for CAD files. |
| Audit logging | Per-route `INSERT INTO audit_log_v2` | `auditLog(req, client, opts)` helper from Phase 59-01 `db.ts` | Standardized payload shape, tenant binding, automatic actor extraction. |

**Key insight:** The "real CAD" problem is *legendarily* hard at the parser level. Every successful web-CAD viewer (Onshape, Autodesk Forge, eDrawings) is built on a heavyweight kernel (Parasolid, OpenCascade, ACIS). occt-import-js is our only realistic free option for STEP — anything else is either commercial ($$$$) or vapor. **Do not entertain "let's write a simple STEP parser for the common case" — there is no common case.**

---

## Common Pitfalls

### Pitfall 1: occt-import-js WASM cold-start crashes the page on slow networks

**What goes wrong:** First load of a STEP file fetches a 5 MB WASM module. On a 3G connection that's 15+ seconds with no UI feedback; users assume the page is broken and refresh.

**Why it happens:** `dynamic-import()` is silent until completion; no built-in progress bar.

**How to avoid:**
- Wire a loading spinner that appears within 100 ms of the user clicking "View 3D"
- Preload WASM in `<link rel="preload" as="fetch" crossorigin>` only on part-detail pages where uploaded files exist
- Cache via service worker (out of scope for v1; document for Phase 61)

**Warning signs:** First-paint metric on part.html spikes; "STEP viewer never loaded" support tickets.

### Pitfall 2: Large STEP file freezes the browser tab

**What goes wrong:** A 60 MB STEP assembly parses on the main thread, blocks the event loop for 30+ seconds, browser shows "page unresponsive" dialog.

**Why it happens:** occt-import-js parses synchronously inside its WASM module.

**How to avoid:**
- Enforce 50 MB soft limit + 100 MB hard limit at presigned-URL mint time (occt-import-js GitHub issue #19 documents 100 MB as the practical ceiling)
- Move occt parsing into a Web Worker (deferred — adds complexity; v1 ships on main thread with a "may take a minute" message)
- Show a `<dialog>` warning when file_size > 20 MB: "This file is large and may take time to render."
- Phase 61: server-side conversion to glTF using occt-import-js in a Node Lambda + cache the mesh in S3

**Warning signs:** "browser froze" complaints; CloudWatch RUM `LongTask` count spikes.

### Pitfall 3: S3 CORS misconfiguration silently breaks presigned PUT

**What goes wrong:** Browser uploads with `fetch(url, {method:'PUT'})` fail with opaque CORS error; backend mints URLs correctly but client can't use them.

**Why it happens:** S3 requires explicit CORS config; the presigned URL bypasses authn but the browser still enforces CORS preflight. AWS doesn't tell you this when you generate the URL.

**How to avoid:** Lock-in CORS at bucket creation. Required config:
```json
[
  {
    "AllowedOrigins": ["https://turionspace.zietra.com", "https://*.zietra.com"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "x-amz-version-id"],
    "MaxAgeSeconds": 3600
  }
]
```

`AllowedHeaders: ["*"]` because we don't know which headers the SDK / browser will send (Content-Type, x-amz-meta-*, etc.). `ExposeHeaders: ["ETag"]` is needed if we ever do multipart (deferred).

**Warning signs:** Browser console: `Access to fetch at 'https://s3...' has been blocked by CORS policy`.

### Pitfall 4: Presigned URL leaks in CloudWatch logs

**What goes wrong:** Lambda logs the full presigned URL on success; an operator with CloudWatch Logs read access can re-PUT arbitrary bytes during the TTL window.

**Why it happens:** Default `console.log(response)` includes the full URL.

**How to avoid:**
- 5-min PUT TTL caps the damage window
- Filter URLs in log statements: `console.log({ key, expires_in })` not `console.log({ url, key })`
- CloudTrail S3 data events capture every PUT (audit trail)
- Use IAM condition `s3:x-amz-checksum-sha256` to bind URLs to a specific file hash (we already do this in Pattern 1)

**Warning signs:** Operator with `cloudwatch:GetLogEvents` permission could exfiltrate the URL.

### Pitfall 5: `chooseTemplate()` regression — uploaded file ignored when present

**What goes wrong:** New uploaded STEP file exists but UI still shows the auto-generated SVG; user thinks upload silently failed.

**Why it happens:** `chooseTemplate()` modification was missed, OR the DB query returns a stale row, OR `is_active` flag wasn't toggled.

**How to avoid:**
- Cross-cutting smoke test (Phase 60-04): upload a STEP file → verify UI shows STEP viewer (not SVG)
- Unit test the modified `chooseTemplate()` with mocked DB returning an uploaded row
- Add a visible "Source: Uploaded by jane@acme.com, rev 3" badge on the viewer

**Warning signs:** Customer says "I uploaded a file but it didn't show up."

### Pitfall 6: Puppeteer Lambda cold-start kills SLA

**What goes wrong:** First PDF after 15 min of idle takes 10+ seconds (cold start + chromium init); user thinks PDF gen is broken.

**Why it happens:** Chromium binary unpacks from /tmp on cold start; subsequent invocations reuse it.

**How to avoid:**
- SQS-async pattern already decouples UX from cold-start latency
- Provisioned concurrency = 1 on `zietra-cad-pdf-gen` (cost: ~$5/mo for 1 vCPU-mo)
- Show "Generating PDF…" UI immediately on click; poll status

**Warning signs:** CloudWatch p99 latency on `zietra-cad-pdf-gen` >10s for first invocation of the hour.

### Pitfall 7: Fabric.js exports SVG with embedded base64 raster snapshots

**What goes wrong:** User loads base drawing as background, adds a few arrows; saved markup SVG is 5 MB because Fabric.js embedded a base64 PNG of the entire canvas.

**Why it happens:** Fabric.js exports the visible canvas state by default, including background.

**How to avoid:**
- Store ONLY annotation objects: `canvas.toSVG({ excludeBackground: true })` (Fabric v6 supports object filter)
- OR keep base drawing separate (it's already in `part_cad_files`); overlay loads on top at render time
- Reject any markup SVG > 500 KB (sanity bound)

**Warning signs:** DB row sizes in `part_drawing_markups` averaging >100 KB.

### Pitfall 8: Markup revisions drift when base file revision changes

**What goes wrong:** User adds dimensions to rev-2 STEP file; engineer uploads rev-3 with different geometry; old dimensions now point at empty space.

**Why it happens:** Markup is positioned relative to base drawing coordinates; new drawing has different coordinates.

**How to avoid:**
- `part_drawing_markups.part_cad_file_id` FK is **revision-locked** (not part_id alone)
- New upload → markup is orphaned (visible in old-revision view, hidden in new-revision view)
- UI shows "This markup was made on rev 2; you are viewing rev 3" badge
- "Migrate markup to current rev" button (manual; defer auto-migration to Phase 61)

**Warning signs:** "My arrows disappeared" complaints after uploads.

### Pitfall 9: STL with degenerate triangles renders as black blob

**What goes wrong:** Customer uploads STL exported with "ridiculous tolerance" from a CAD tool → triangles have zero area → normals are NaN → Three.js shading paints everything black.

**Why it happens:** STLLoader doesn't validate triangle quality.

**How to avoid:**
- `geometry.computeVertexNormals()` after load — replaces degenerate normals
- Material: `MeshStandardMaterial({ flatShading: true, color: 0x9090a0 })` is forgiving
- Add a "Reset view" button (auto-fit bounding box) for users who got a weird camera angle

**Warning signs:** "3D viewer shows black box" tickets.

### Pitfall 10: PDF generator Lambda hits 10 GB /tmp ceiling on big batches

**What goes wrong:** Lambda /tmp accumulates puppeteer cache files across invocations; eventually `ENOSPC`.

**Why it happens:** Lambda execution environment reuse persists /tmp; long-running warm instance hoards.

**How to avoid:**
- Set `PUPPETEER_CACHE_DIR=/tmp/puppeteer-cache` and `du -sh /tmp/puppeteer-cache` then `rm -rf` on each invocation start (loses cold-start benefit but bounds usage)
- OR call `browser.close()` in `finally` block guaranteed
- Monitor `MaxTmpDirSize` via CloudWatch custom metric

**Warning signs:** PDF gen Lambda errors with `ENOSPC: no space left on device`.

### Pitfall 11: Mixed migration chains — `turion-satellite/` vs `turion-space-demo/`

**What goes wrong:** Engineer assumes "last migration was 036" (from Phase 59-01 audit_log_v2) and writes 037 in `turion-satellite/migrations/` — but the satellite repo is at 022.

**Why it happens:** Two SEPARATE repos, two SEPARATE migration chains, two SEPARATE schemas:
- `turion-satellite/migrations/` — last applied: **022** → Phase 60 uses **023, 024**
- `turion-space-demo/backend/migrations/` — last applied: **036** → unrelated to Phase 60

**How to avoid:**
- Plan 60-01 task action must `ls /Users/jeet/turion-satellite/migrations/ | sort | tail -1` before writing the new migration
- File header MUST say `# 023_part_cad_files.sql` (matching repo, NOT 037)

**Warning signs:** Migration files committed to wrong repo; numbering collision detected by CI.

### Pitfall 12: occt-import-js Node.js usage requires WASM file path resolution

**What goes wrong:** Using occt-import-js inside a Lambda (e.g., for server-side STEP→glTF in Phase 61) fails because the .wasm file isn't bundled alongside the JS.

**Why it happens:** `import occt from 'occt-import-js'` loads the JS; the JS then `fetch()`es the .wasm at runtime relative to its own path. In a Lambda bundler (esbuild / webpack) the .wasm gets stripped unless explicitly included.

**How to avoid:** Out of Phase 60 scope (we're browser-only). Document for Phase 61: ship .wasm as a separate Lambda layer or include via `copy-webpack-plugin`.

---

## Code Examples

Verified patterns from official sources.

### STL viewer mount (browser, Three.js)

```javascript
// frontend/satellite/cad-viewer-stl.js
import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export async function mountStl(container, url) {
  // Reuse the Phase 30-31 scene-setup helper if available; here is the minimal path:
  const w = container.clientWidth, h = container.clientHeight;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101522);
  const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 10000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x404060, 0.8));
  const dir = new THREE.DirectionalLight(0xffffff, 0.6);
  dir.position.set(1, 1, 1);
  scene.add(dir);

  const loader = new STLLoader();
  const geometry = await loader.loadAsync(url);
  geometry.computeVertexNormals(); // Pitfall 9 — fix degenerate normals

  const material = new THREE.MeshStandardMaterial({ color: 0x9090a0, flatShading: true });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  // Auto-fit camera to bounding box
  const box = new THREE.Box3().setFromObject(mesh);
  const size = box.getSize(new THREE.Vector3()).length();
  const center = box.getCenter(new THREE.Vector3());
  camera.position.copy(center).add(new THREE.Vector3(size, size, size));
  camera.lookAt(center);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(center);

  (function loop() {
    requestAnimationFrame(loop);
    controls.update();
    renderer.render(scene, camera);
  })();
}
```

**Source:** Three.js docs https://threejs.org/docs/pages/STLLoader.html

### STEP viewer mount (browser, occt-import-js + Three.js)

```javascript
// frontend/satellite/cad-viewer-step.js
import * as THREE from 'three';
import occtInit from 'occt-import-js';
// occt-import-js loads its .wasm at runtime; jsDelivr serves both alongside

export async function mountStep(container, url, format /* 'step' | 'iges' */) {
  const occt = await occtInit({
    locateFile: f => `https://cdn.jsdelivr.net/npm/occt-import-js@0.0.23/dist/${f}`
  });

  const buf = new Uint8Array(await (await fetch(url)).arrayBuffer());
  const fn = format === 'iges' ? occt.ReadIgesFile : occt.ReadStepFile;
  const result = fn(buf, { linearUnit: 'millimeter', linearDeflection: 0.1, angularDeflection: 0.5 });

  if (!result.success) {
    container.innerHTML = `<p>Failed to parse ${format.toUpperCase()}: ${result.error || 'unknown error'}</p>`;
    return;
  }

  // result.meshes: [{ name, color: [r,g,b], attributes: { position: {array, ...}, normal, index } }]
  const group = new THREE.Group();
  for (const mesh of result.meshes) {
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(mesh.attributes.position.array, 3));
    if (mesh.attributes.normal) {
      geom.setAttribute('normal', new THREE.Float32BufferAttribute(mesh.attributes.normal.array, 3));
    } else {
      geom.computeVertexNormals();
    }
    if (mesh.index) {
      geom.setIndex(new THREE.Uint32BufferAttribute(mesh.index.array, 1));
    }
    const color = mesh.color
      ? new THREE.Color(mesh.color[0], mesh.color[1], mesh.color[2])
      : new THREE.Color(0x9090a0);
    const mat = new THREE.MeshStandardMaterial({ color, flatShading: true });
    group.add(new THREE.Mesh(geom, mat));
  }

  // ...scene setup + auto-fit identical to mountStl above
}
```

**Source:** https://github.com/kovacsv/occt-import-js README

### Fabric.js v6 markup overlay (browser)

```javascript
// frontend/satellite/cad-markup.js
import { Canvas, Textbox, Rect, Line, PencilBrush } from 'fabric';

export function mountMarkup(container, baseImageUrl, existingSvgOverlay) {
  const canvasEl = document.createElement('canvas');
  canvasEl.width = container.clientWidth;
  canvasEl.height = container.clientHeight;
  container.appendChild(canvasEl);

  const canvas = new Canvas(canvasEl, { backgroundColor: 'transparent' });

  // Layer 1: base image (read-only, locked)
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = baseImageUrl;
  img.onload = () => {
    canvas.setBackgroundImage(img.src, () => canvas.renderAll());
  };

  // Layer 2: load existing markup (if any)
  if (existingSvgOverlay) {
    fabric.loadSVGFromString(existingSvgOverlay, (objects) => {
      objects.forEach(o => canvas.add(o));
    });
  }

  // Toolbar (text / arrow / rect / freehand)
  return {
    addText: () => canvas.add(new Textbox('Note', { left: 50, top: 50, fontSize: 16, fill: '#ff3366' })),
    addArrow: (x1, y1, x2, y2) => canvas.add(new Line([x1, y1, x2, y2], { stroke: '#ff3366', strokeWidth: 2 })),
    addRect: () => canvas.add(new Rect({ left: 50, top: 50, width: 100, height: 60, fill: 'transparent', stroke: '#ff3366', strokeWidth: 2 })),
    enableFreehand: () => { canvas.isDrawingMode = true; canvas.freeDrawingBrush = new PencilBrush(canvas); },
    exportSvg: () => canvas.toSVG({ suppressPreamble: true }), // string, excludes <?xml...?>
  };
}
```

**Source:** https://fabricjs.com/ + https://blog.logrocket.com/build-image-editor-fabric-js-v6/

### Puppeteer engineering-drawing PDF (Lambda handler)

```javascript
// zietra-cad-pdf-gen/handler.mjs
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';

const s3 = new S3Client({ region: 'us-east-1' });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export async function handler(event) {
  for (const record of event.Records) {
    const { job_id, part_id, tenant_id } = JSON.parse(record.body);
    let browser;
    try {
      // 1. Pull part + active CAD file + BOM children from DB (RLS-scoped)
      const client = await pool.connect();
      await client.query(`SET LOCAL app.tenant_id = $1`, [tenant_id]);
      const part = (await client.query(
        `SELECT pd.*, scf.s3_key, scf.format, scf.revision
         FROM part_definitions pd
         LEFT JOIN part_cad_files scf ON scf.part_id = pd.id AND scf.is_active = true
         WHERE pd.id = $1`, [part_id])).rows[0];
      const bom = (await client.query(
        `SELECT c_pd.part_number, c_pd.description, bl.qty, bl.uom
         FROM bom_lines bl
         JOIN part_instances c_pi ON c_pi.id = bl.child_part_instance_id
         JOIN part_definitions c_pd ON c_pd.id = c_pi.part_definition_id
         WHERE bl.parent_part_instance_id IN (
           SELECT id FROM part_instances WHERE part_definition_id = $1 LIMIT 1
         ) AND bl.status = 'released'`, [part_id])).rows;
      client.release();

      // 2. Render HTML template (file-system template + DOM substitution)
      const tpl = await fs.readFile(path.join(import.meta.dirname, 'template.html'), 'utf8');
      const html = tpl
        .replace('{{PART_NUMBER}}', part.part_number)
        .replace('{{DESCRIPTION}}', part.description)
        .replace('{{REV}}', part.revision || part.drawing_rev)
        .replace('{{BOM_ROWS}}', bom.map(b => `<tr><td>${b.part_number}</td><td>${b.description}</td><td>${b.qty} ${b.uom}</td></tr>`).join(''))
        .replace('{{DRAWING_SVG}}', part.drawing_svg || '<!-- uploaded file -->');

      // 3. Launch Chromium and render to PDF
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({ format: 'A3', printBackground: true, margin: { top: '15mm', right: '10mm', bottom: '15mm', left: '10mm' } });

      // 4. Upload PDF
      const pdfKey = `${tenant_id}/${part_id}/drawings/${job_id}.pdf`;
      await s3.send(new PutObjectCommand({
        Bucket: process.env.CAD_BUCKET,
        Key: pdfKey,
        Body: pdf,
        ContentType: 'application/pdf',
      }));

      // 5. Update job row + audit
      const client2 = await pool.connect();
      await client2.query(`SET LOCAL app.tenant_id = $1`, [tenant_id]);
      await client2.query(
        `UPDATE part_drawing_jobs SET status = 'ready', pdf_s3_key = $1, completed_at = now() WHERE id = $2`,
        [pdfKey, job_id]);
      await client2.query(
        `INSERT INTO audit_log_v2 (tenant_id, action, entity_type, entity_id, payload, created_at)
         VALUES ($1, 'cad_pdf_generate', 'part', $2, $3::jsonb, now())`,
        [tenant_id, part_id, JSON.stringify({ job_id, pdf_s3_key: pdfKey })]);
      client2.release();

    } catch (err) {
      console.error('[pdf-gen]', err);
      // mark job failed
      const c = await pool.connect();
      await c.query(`SET LOCAL app.tenant_id = $1`, [tenant_id]);
      await c.query(`UPDATE part_drawing_jobs SET status = 'failed', error = $1 WHERE id = $2`, [String(err), job_id]);
      c.release();
    } finally {
      if (browser) await browser.close();
    }
  }
}
```

**Source:** https://github.com/Sparticuz/chromium README + AWS Lambda Node.js docs

### Migration 023 (Phase 60-01) — part_cad_files

```sql
-- 023_part_cad_files.sql · Phase 60-01
-- New table for uploaded CAD files (STEP/STL/IGES/etc) alongside the auto-generated
-- SVG drawings from Phase 27/35. Tenant-isolated via RLS+FORCE per Phase 55 pattern.

SET search_path TO turion_satellite, public;

BEGIN;

CREATE TABLE IF NOT EXISTS turion_satellite.part_cad_files (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id                  uuid NOT NULL REFERENCES turion_satellite.part_definitions(id) ON DELETE CASCADE,
  tenant_id                uuid NOT NULL,
  format                   text NOT NULL CHECK (format IN ('step','stp','stl','iges','igs','brep','dwg','sldprt','3dpdf','pdf')),
  s3_key                   text NOT NULL,
  sha256                   text NOT NULL,
  file_size                bigint NOT NULL CHECK (file_size > 0 AND file_size <= 104857600), -- 100 MB
  filename                 text NOT NULL,
  uploaded_by_cognito_sub  text NOT NULL,
  uploaded_at              timestamptz NOT NULL DEFAULT now(),
  is_active                boolean NOT NULL DEFAULT true,
  revision                 int NOT NULL DEFAULT 1,
  UNIQUE (part_id, sha256)
);

CREATE INDEX IF NOT EXISTS idx_part_cad_files_tenant_part_active
  ON turion_satellite.part_cad_files(tenant_id, part_id, is_active);
CREATE INDEX IF NOT EXISTS idx_part_cad_files_uploaded_at
  ON turion_satellite.part_cad_files(uploaded_at DESC);

-- RLS (Phase 55 pattern)
ALTER TABLE turion_satellite.part_cad_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE turion_satellite.part_cad_files FORCE ROW LEVEL SECURITY;
CREATE POLICY part_cad_files_tenant_isolation ON turion_satellite.part_cad_files
  FOR ALL TO zietra_app_user
  USING (tenant_id = current_setting('app.tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- Widen audit_log.action CHECK to include Phase 60 actions
ALTER TABLE turion_satellite.audit_log DROP CONSTRAINT IF EXISTS chk_audit_log_action;
ALTER TABLE turion_satellite.audit_log
  ADD CONSTRAINT chk_audit_log_action
  CHECK (action IN (
    'delete','restore','status_change','rate_change','fx_seed',
    'sync_sales_order','sync_ns_invoice','sync_arena_doc','sync_mes_work_order',
    'densify_seed',
    'spawn_satellite_program','advance_satellite_status',
    'create_part_definition','edit_part_definition','retire_part_definition',
    'restore_part_definition','edit_part_drawing','delete_bom_line',
    -- Phase 60 additions:
    'cad_upload_presigned','cad_upload_commit','cad_file_deactivate','cad_pdf_generate'
  ));

COMMIT;
```

### Migration 024 (Phase 60-03) — markups + part_revisions FK

```sql
-- 024_part_drawing_markups.sql · Phase 60-03
-- Fabric.js annotation layer + extend part_revisions with optional cad_file_id FK
-- so uploaded files show up in the mixed revision history.

SET search_path TO turion_satellite, public;

BEGIN;

CREATE TABLE IF NOT EXISTS turion_satellite.part_drawing_markups (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_cad_file_id    uuid NOT NULL REFERENCES turion_satellite.part_cad_files(id) ON DELETE CASCADE,
  tenant_id           uuid NOT NULL,
  markup_svg          text NOT NULL CHECK (length(markup_svg) <= 524288), -- 512 KB cap (Pitfall 7)
  created_by_cognito_sub  text NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz
);

CREATE INDEX IF NOT EXISTS idx_part_drawing_markups_cad_file
  ON turion_satellite.part_drawing_markups(part_cad_file_id);
CREATE INDEX IF NOT EXISTS idx_part_drawing_markups_tenant_created
  ON turion_satellite.part_drawing_markups(tenant_id, created_at DESC);

ALTER TABLE turion_satellite.part_drawing_markups ENABLE ROW LEVEL SECURITY;
ALTER TABLE turion_satellite.part_drawing_markups FORCE ROW LEVEL SECURITY;
CREATE POLICY part_drawing_markups_tenant_isolation ON turion_satellite.part_drawing_markups
  FOR ALL TO zietra_app_user
  USING (tenant_id = current_setting('app.tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- Extend part_revisions with optional FK to cad_file
ALTER TABLE turion_satellite.part_revisions
  ADD COLUMN IF NOT EXISTS cad_file_id uuid
  REFERENCES turion_satellite.part_cad_files(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_part_revisions_cad_file
  ON turion_satellite.part_revisions(cad_file_id);

-- Async PDF gen jobs
CREATE TABLE IF NOT EXISTS turion_satellite.part_drawing_jobs (
  id                       uuid PRIMARY KEY,
  part_id                  uuid NOT NULL REFERENCES turion_satellite.part_definitions(id) ON DELETE CASCADE,
  tenant_id                uuid NOT NULL,
  status                   text NOT NULL CHECK (status IN ('queued','rendering','ready','failed')),
  pdf_s3_key               text,
  error                    text,
  requested_by_cognito_sub text NOT NULL,
  requested_at             timestamptz NOT NULL DEFAULT now(),
  completed_at             timestamptz
);

CREATE INDEX IF NOT EXISTS idx_part_drawing_jobs_tenant_status
  ON turion_satellite.part_drawing_jobs(tenant_id, status);

ALTER TABLE turion_satellite.part_drawing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE turion_satellite.part_drawing_jobs FORCE ROW LEVEL SECURITY;
CREATE POLICY part_drawing_jobs_tenant_isolation ON turion_satellite.part_drawing_jobs
  FOR ALL TO zietra_app_user
  USING (tenant_id = current_setting('app.tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

COMMIT;
```

### Template dispatch fallback (chooseTemplate modification)

```typescript
// backend/src/cad-templates/index.ts — MODIFY existing exports
import type { PoolClient } from 'pg';

// EXISTING: pure-function dispatch by part_number regex (kept for backwards compat)
export function chooseTemplate(part: { part_number: string }): { name: string; fn: TemplateFn } {
  // ... existing regex logic unchanged
}

// NEW (Phase 60-02): DB-aware dispatcher used by /api/parts/:id/drawing-source
export async function chooseDrawingSource(
  client: PoolClient,
  partId: string
): Promise<{ source: 'uploaded'; cad_file_id: string; format: string; s3_key: string; revision: number }
         | { source: 'procedural'; template_name: string }> {
  const r = await client.query(
    `SELECT id, format, s3_key, revision FROM turion_satellite.part_cad_files
     WHERE part_id = $1 AND is_active = true
     ORDER BY revision DESC LIMIT 1`,
    [partId]);
  if (r.rows[0]) {
    return {
      source: 'uploaded',
      cad_file_id: r.rows[0].id,
      format: r.rows[0].format,
      s3_key: r.rows[0].s3_key,
      revision: r.rows[0].revision,
    };
  }
  // Fallback: existing procedural regex (need part_number for chooseTemplate)
  const p = await client.query(`SELECT part_number FROM turion_satellite.part_definitions WHERE id = $1`, [partId]);
  const { name } = chooseTemplate({ part_number: p.rows[0].part_number });
  return { source: 'procedural', template_name: name };
}
```

### New endpoint: drawing source dispatcher

```typescript
// backend/src/routes/parts.ts — ADD after existing :id/drawing route
router.get('/:id/drawing-source', async (req, res) => {
  try {
    const result = await withTenantClient(req, async (client) => {
      const dispatch = await chooseDrawingSource(client, req.params.id);
      if (dispatch.source === 'uploaded') {
        // Mint presigned GET URL (15-min TTL)
        const url = await getSignedUrl(s3, new GetObjectCommand({
          Bucket: process.env.CAD_BUCKET!,
          Key: dispatch.s3_key,
        }), { expiresIn: 900 });
        return { source: 'uploaded', format: dispatch.format, url, revision: dispatch.revision, cad_file_id: dispatch.cad_file_id };
      }
      // Procedural: return existing drawing_svg
      const r = await client.query(`SELECT drawing_svg, drawing_rev FROM turion_satellite.part_definitions WHERE id = $1`, [req.params.id]);
      return { source: 'procedural', format: 'svg', drawing_svg: r.rows[0]?.drawing_svg, revision: r.rows[0]?.drawing_rev };
    });
    res.json(result);
  } catch (err: any) {
    console.error('[parts] drawing-source failed:', err);
    res.status(500).json({ error: 'Failed to resolve drawing source' });
  }
});
```

---

## State of the Art

| Old Approach (Phase 27-35) | Current Approach (Phase 60) | When Changed | Impact |
|---|---|---|---|
| Procedural SVG generation only (8 hand-written aerospace templates) | Uploaded real CAD takes precedence; procedural is fallback | Phase 60 | Customer's actual geometry renders accurately; works for ANY industry |
| Three.js procedural geometry from L×W×H dimensions | Three.js + STLLoader (STL) + occt-import-js (STEP/IGES) | Phase 60 | Real CAD geometry, not procedural boxes |
| In-browser SVG editor (Phase 35) | Fabric.js v6 canvas markup overlay (revision-locked) | Phase 60 | Markup separate from base drawing, survives uploads |
| No upload path | S3 presigned PUT direct-from-browser (bypass Lambda 6 MB) | Phase 60 | Files up to 100 MB |
| No PDF generation | SQS-async Puppeteer + @sparticuz/chromium 148+ | Phase 60 | Shop-floor printable drawings |
| Auto-generated `part_revisions` rows only (SVG) | Mixed history: procedural SVG + uploaded files | Phase 60 | Engineers see full lineage |

**Deprecated / outdated:**
- `chrome-aws-lambda` (the original package) is unmaintained since ~2022; @sparticuz/chromium is the maintained fork
- API-Gateway-binary-passthrough for uploads >5 MB — superseded by presigned URLs for >5 years
- 3D-PDF (Adobe PRC) — never got web-native support; defer to "download to view" UX
- Hand-rolled SigV4 signers — AWS SDK v3 obviates them

---

## Open Questions

1. **Should we enforce browser memory limits for STEP files >50 MB?**
   - What we know: occt-import-js issue #19 documents 100 MB as practical ceiling; 50 MB is the safe-on-mobile mark
   - What's unclear: Distribution of CAD file sizes Turion's prospective customers actually have
   - Recommendation: 50 MB soft warning ("this may take a moment") + 100 MB hard rejection at presigned-PUT mint time. Revisit in Phase 61 once we have telemetry.

2. **Server-side STEP → glTF conversion now or Phase 61?**
   - What we know: Server-side parsing in a Node Lambda using occt-import-js is technically feasible; caching glTF in S3 makes first-view fast for all subsequent users
   - What's unclear: Cold-start latency for WASM loading in Lambda (likely 3-5s)
   - Recommendation: Defer to Phase 61. v1 ships client-side parsing with size warnings; we'll know if conversion is needed when we see real usage.

3. **3D-PDF (Adobe PRC) rendering — include in v1?**
   - What we know: No browser-native support; PDF.js doesn't render 3D streams; commercial solutions (e.g., 3DPDF.com viewer) are paid
   - What's unclear: How many customer files will be 3D-PDF
   - Recommendation: Skip v1. Store + download-only. Surface a "Download to view in Acrobat" link. Add inline view in Phase 61 if customer demand emerges.

4. **Drawing markup persistence — per-user or shared per-tenant?**
   - What we know: Schema in §A6 has `created_by_cognito_sub`; ambiguous on whether multiple users can layer
   - What's unclear: User intent — are markups personal annotations or team-visible callouts?
   - Recommendation for planner to surface in `/gsd:discuss-phase 60`: default v1 = team-visible (one canonical markup per cad_file_id, last write wins). Multi-user layering is Phase 61.

5. **PDF generator: SQS-async vs synchronous?**
   - What we know: SQS-async is cleaner architecturally + decouples from 30s API ceiling; sync is simpler to ship
   - What's unclear: Customer expectation — do they want PDF in 5s or are they OK with "Generating, we'll email you the link"?
   - Recommendation: Ship SQS-async (cleaner, future-proof, costs the same). Show polling UI with "ready in ~10s" estimate. If feedback says "I want it instant," add a sync fast-path for drawings <1 page in Phase 61.

6. **CAD file storage cost mitigation strategy?**
   - What we know: $0.023/GB/mo standard, $0.0125/GB/mo Infrequent Access. 100 MB × 1000 parts × 10 revisions = ~1 TB ≈ $23/mo standard
   - What's unclear: How aggressive customer revision churn will be
   - Recommendation: Lifecycle rule "transition to S3 IA after 30 days, expire non-active revisions after 5 years." Standard tier for active revisions only.

7. **Cognito role check — accept manager OR admin for upload?**
   - What we know: Phase 55 RLS uses tenant role; ROADMAP says "auth-gated to manager/admin" implicitly
   - What's unclear: Specific roles defined in current Cognito user pool — ARE they `admin` / `manager` / `viewer` per `page-template.js` roleGate, or different?
   - Recommendation: Planner verifies role enum in `/api/team` response shape during 60-01 planning. Reuse existing role-gate utility (`page-template.js` `roleGate` array).

---

## Recommended Plan Structure (input to planner)

**Plan 60-01 — Schema + storage + upload backend + upload UI**
- Aurora migration 023 (`part_cad_files` + audit_log action widen)
- New S3 bucket `zietra-cad-files-134607809447` (KMS, CORS, lifecycle, block-public-access)
- New env var `CAD_BUCKET` on `turion-satellite-api` Lambda + IAM allow `s3:PutObject` + `s3:GetObject` on bucket
- New routes: `POST /api/parts/:id/cad-files/presign`, `POST /api/parts/:id/cad-files/commit`, `GET /api/parts/:id/cad-files`, `GET /api/parts/:id/cad-files/:fileId/url`, `DELETE /api/parts/:id/cad-files/:fileId`
- Upload UI on `part.html`: file picker + client-side sha256 + progress bar + presigned PUT + commit call
- Audit hooks on all 5 routes
- Smoke: upload a 10 MB STL via real browser → confirm DB row + S3 object + audit_log_v2 row

**Plan 60-02 — STL viewer + STEP viewer + dispatch fallback**
- New `cad-viewer.js` dispatcher
- New `cad-viewer-stl.js` (Three.js STLLoader)
- New `cad-viewer-step.js` (lazy-loaded occt-import-js)
- Modify `chooseTemplate()` → `chooseDrawingSource()` in `cad-templates/index.ts`
- New endpoint `GET /api/parts/:id/drawing-source` (returns presigned GET URL or procedural SVG)
- `part.html` viewer slot consumes `/drawing-source` instead of `/drawing`
- Smoke: upload STL → /drawing-source returns `{source:'uploaded',format:'stl',url:...}` → renders in viewer

**Plan 60-03 — Markup + revision control extension**
- Aurora migration 024 (`part_drawing_markups` + `part_drawing_jobs` + extend `part_revisions.cad_file_id`)
- New `cad-markup.js` (Fabric.js v6)
- New routes: `POST /api/parts/:id/cad-files/:fileId/markup`, `GET /api/parts/:id/cad-files/:fileId/markup`
- Revision-history dropdown on `part.html` showing mixed procedural+uploaded history with rev numbers and uploader names
- DOMPurify sanitization on save
- Smoke: add 3 arrows + 1 text label, save, reload, confirm overlay restores

**Plan 60-04 — PDF generator + cross-cutting smoke + robotic-arm walkthrough + CHECKPOINT**
- NEW repo `zietra-cad-pdf-gen` (handler.mjs + template.html + Dockerfile-named-`lambda-build` + deploy.sh)
- NEW Lambda `zietra-cad-pdf-gen` (arm64, 2 GB, 60s, VPC-attached, RDS Proxy connection)
- NEW SQS queue `zietra-cad-pdf-gen-queue` + DLQ
- New routes: `POST /api/parts/:id/drawings/generate` (enqueue), `GET /api/cad-pdf-jobs/:jobId` (status poll)
- Cross-cutting smoke: `scripts/smoke-phase-60.sh` covers all 4 plans
- **Robotic-arm walkthrough test**: create a fake "ARM-J3-LINK-A" part (non-aerospace nomenclature) → confirm pre-Phase-60 it falls into generic subassembly template → upload a real STL of a robotic arm link → confirm new viewer renders accurate geometry. This is the "we shipped real CAD support" signal.
- CHECKPOINT.md hand-off for Phase 61 (BOM extraction from STEP assembly tree, multi-user markup, files >100 MB, server-side STEP→glTF cache, 3D-PDF inline view, visual SVG diff between revisions)

---

## Sources

### Primary (HIGH confidence)
- **Three.js STLLoader docs:** https://threejs.org/docs/pages/STLLoader.html — auto-detects binary/ASCII, returns non-indexed BufferGeometry
- **Three.js GitHub (master):** https://github.com/mrdoob/three.js/blob/master/examples/jsm/loaders/STLLoader.js
- **occt-import-js npm:** https://www.npmjs.com/package/occt-import-js — v0.0.23, browser + node
- **occt-import-js GitHub:** https://github.com/kovacsv/occt-import-js — README documents `ReadStepFile`, `ReadIgesFile`, `ReadBrepFile` API
- **occt-import-js issue #19:** https://github.com/kovacsv/occt-import-js/issues/19 — 100 MB practical ceiling for STEP files
- **@sparticuz/chromium GitHub:** https://github.com/Sparticuz/chromium — Lambda-sized Chromium, 66 MB Brotli, latest 148.0.0
- **@sparticuz/chromium npm:** https://www.npmjs.com/package/@sparticuz/chromium
- **AWS S3 CORS deep-dive:** https://aws.amazon.com/blogs/media/deep-dive-into-cors-configs-on-aws-s3-how-to/
- **AWS S3 presigned URLs (re:Post):** https://repost.aws/questions/QUbRJA9UqWRNuUTq5ujzXdOw/cors-error-when-trying-to-upload-via-presigned-url-from-browser-but-not-in-non-browser-environment
- **Fabric.js v6:** https://fabricjs.com/ + https://blog.logrocket.com/build-image-editor-fabric-js-v6/ — ESM modular imports, native ES classes, Promise-based API
- **In-repo:** `turion-satellite/migrations/022_part_revisions_and_retire.sql` (Phase 35 schema we extend)
- **In-repo:** `turion-satellite/backend/src/cad-templates/index.ts` (chooseTemplate to modify)
- **In-repo:** `turion-satellite/backend/src/routes/parts.ts:80, 290, 343` (existing drawing routes to extend)
- **In-repo:** `turion-space-demo/backend/migrations/036_audit_log_v2.sql` (Phase 59-01 audit pattern to reuse — different repo, same pattern)
- **Phase 59 CHECKPOINT:** `.planning/phases/59-m8-compliance-observability-reliability/CHECKPOINT.md` (confirms zietra-prod-vpc Lambdas + RDS Proxy + audit_log_v2 substrate are in place)
- **ROADMAP Phase 60 entry:** `.planning/ROADMAP.md:1055-1093` — locks 10 requirements

### Secondary (MEDIUM confidence — community articles cross-checked with official docs)
- DEV.to "Deploy Puppeteer and Chrome on AWS Lambda With Layers and AWS CDK" — confirms layer + handler pattern
- Medium "How to Run Puppeteer on AWS Lambda using Layers" by Anurag Chitti — confirms 250 MB unzipped Lambda limit
- OneUptime "How to Generate Presigned POST Requests for S3 Uploads" (Feb 2026) — confirms PUT vs POST tradeoff for direct-browser upload
- Roadinforest "occt-step-viewer-web" GitHub — example of OCCT + Three.js viewer integration (good reference architecture)

### Tertiary (LOW confidence — informational only)
- Fabric.js bundle size — no exact 2026 number found; based on v6 modular ESM imports, "use what you import" guidance from official docs. Estimate ~150-200 KB for our subset (Canvas, Textbox, Rect, Line, PencilBrush).
- Lambda WASM cold-start latency for occt-import-js in Node — extrapolated from generic WASM cold-start data; would need a benchmark Lambda to confirm. Out of v1 scope.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every library verified against npm + GitHub + official docs
- Architecture: HIGH — presigned PUT + SQS-async + RLS patterns are textbook AWS + reuse Phases 54.6 / 55 / 59 / 59-01 substrates
- Pitfalls: HIGH — cross-referenced against occt-import-js issues + Lambda Puppeteer well-known traps + Phase 35/55/59 lessons learned (mixed migration chains, audit log pattern, KMS cost)
- Migration numbering: HIGH — verified by `ls turion-satellite/migrations/ | sort | tail -1` returns 022
- Open questions: LOW (deliberate — these are decisions for `/gsd:discuss-phase 60`)

**Research date:** 2026-05-16
**Valid until:** 2026-06-15 (30 days — stack is stable, but @sparticuz/chromium ships frequent Chromium updates; check for newer release at plan time)

---

*End of Phase 60 RESEARCH.md.*

# IP_COMPANY_SCHEMA_PROBE — Phase 5a Schema Migration Verbatim Evidence

**Quick Task:** 312 (TCP identity-stack Phase 5a — IP-to-company resolver scaffold)
**Date:** 2026-04-29 (UTC)
**Probe path on server:** `/home/u350621741/domains/techcloudpro.com/public_html/api/_probe-312-schema.php`
**Probe URL:** `https://techcloudpro.com/api/_probe-312-schema.php?s=TcpSecureAdmin2026`
**UA used:** `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15` (Cloudflare WAF blocks default `curl/8.x` UA per project memory rule)

---

## Why /api/ instead of /tcp-analytics/?

`/tcp-analytics/.htaccess` whitelists only `^(?!admin|collect|trap|stats).*\.php$` → blocks any new probe filename with HTTP 403 before PHP can gate on the token. `/api/` has no `.htaccess`, so probe naming is unrestricted there. This mirrors the 310 pattern (`api/_probe-310-fp-schema.php`).

---

## Verbatim probe output

```json
{
    "migrations": [
        {
            "step": "ALTER TABLE page_views ADD COLUMN company_name VARCHAR(255) NULL",
            "result": "OK"
        },
        {
            "step": "ALTER TABLE page_views ADD COLUMN company_domain VARCHAR(255) NULL",
            "result": "OK"
        },
        {
            "step": "ALTER TABLE page_views ADD COLUMN company_type VARCHAR(64) NULL",
            "result": "OK"
        },
        {
            "step": "ALTER TABLE page_views ADD INDEX idx_company_domain (company_domain)",
            "result": "OK"
        },
        {
            "step": "ALTER TABLE identified_visitors ADD COLUMN company_domain VARCHAR(255) NULL",
            "result": "OK"
        },
        {
            "step": "ALTER TABLE identified_visitors ADD INDEX idx_company_domain_iv (company_domain)",
            "result": "OK"
        }
    ],
    "verify": {
        "page_views_new_cols": [
            {
                "COLUMN_NAME": "company_domain",
                "DATA_TYPE": "varchar",
                "IS_NULLABLE": "YES"
            },
            {
                "COLUMN_NAME": "company_name",
                "DATA_TYPE": "varchar",
                "IS_NULLABLE": "YES"
            },
            {
                "COLUMN_NAME": "company_type",
                "DATA_TYPE": "varchar",
                "IS_NULLABLE": "YES"
            },
            {
                "COLUMN_NAME": "org",
                "DATA_TYPE": "varchar",
                "IS_NULLABLE": "YES"
            }
        ],
        "identified_visitors_new_cols": [
            {
                "COLUMN_NAME": "company_domain",
                "DATA_TYPE": "varchar",
                "IS_NULLABLE": "YES"
            }
        ],
        "indexes_pv": [
            {
                "Table": "page_views",
                "Non_unique": 1,
                "Key_name": "idx_company_domain",
                "Seq_in_index": 1,
                "Column_name": "company_domain",
                "Collation": "A",
                "Cardinality": 1,
                "Sub_part": null,
                "Packed": null,
                "Null": "YES",
                "Index_type": "BTREE",
                "Comment": "",
                "Index_comment": "",
                "Ignored": "NO"
            }
        ],
        "indexes_iv": [
            {
                "Table": "identified_visitors",
                "Non_unique": 1,
                "Key_name": "idx_company_domain_iv",
                "Seq_in_index": 1,
                "Column_name": "company_domain",
                "Collation": "A",
                "Cardinality": 1,
                "Sub_part": null,
                "Packed": null,
                "Null": "YES",
                "Index_type": "BTREE",
                "Comment": "",
                "Index_comment": "",
                "Ignored": "NO"
            }
        ]
    }
}
```

---

## Acceptance gate checklist

- [x] All 4 page_views ALTERs returned `OK` (3 columns + 1 index)
- [x] Both identified_visitors ALTERs returned `OK` (1 column + 1 index)
- [x] `page_views_new_cols` shows the 3 new columns AND `org` (existing column UNCHANGED — backward-compat preserved)
- [x] `identified_visitors_new_cols` shows `company_domain` only
- [x] `indexes_pv` shows exactly 1 row for `idx_company_domain` BTREE on `company_domain`
- [x] `indexes_iv` shows exactly 1 row for `idx_company_domain_iv` BTREE on `company_domain`
- [x] All 3 new page_views columns are `varchar` + `IS_NULLABLE: YES` (additive, never breaks existing INSERTs)

---

## Cleanup verification

```
$ ssh -p 65002 -i ~/.ssh/id_ed25519 u350621741@147.93.101.51 \
    "rm -f /home/u350621741/domains/techcloudpro.com/public_html/api/_probe-312-schema.php && \
     ls /home/u350621741/domains/techcloudpro.com/public_html/api/_probe-312-schema.php 2>&1"

ls: cannot access '/home/u350621741/domains/techcloudpro.com/public_html/api/_probe-312-schema.php': No such file or directory
```

Probe deleted. Verified.

Local copy `/tmp/tcp-312-schema-probe.php` and `/tmp/tcp-312-schema-probe-output.json` retained until SUMMARY is written, then deleted.

---

## Related-table note (informational, not a regression)

A misnamed probe was first uploaded to `/tcp-analytics/tcp-312-schema-probe.php`. Apache returned HTTP 403 before PHP could parse it because the `.htaccess` regex `^(?!admin|collect|trap|stats).*\.php$` is a **deny-by-default** rule for any filename not starting with `admin|collect|trap|stats`. The misnamed file was deleted from `/tcp-analytics/` and re-uploaded to `/api/_probe-312-schema.php` where no such restriction exists. Verified the misnamed copy is also gone:

```
$ ls /home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/tcp-312-schema-probe.php 2>&1
ls: cannot access '/home/u350621741/domains/techcloudpro.com/public_html/tcp-analytics/tcp-312-schema-probe.php': No such file or directory
```

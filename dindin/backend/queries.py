'''COUPA_TRANSACTIONS_QUERY = 
/* ===================== COUPA — TRANSACTION-LEVEL (ROLE-BASED) =====================

Roles:
  viewer_role = 0  -> admin (see all active employees)
  viewer_role IN (1,2,3) -> normal user
      - if viewer has reportees -> self + all reportees (all levels)
      - else -> self only (level 0)

Outputs (single unified schema):
  "Coupa ID","Number","Type","Supplier","DEPARTMENT_NAME","Amount",
  "Status","Date","Due Date","HEADER_MEMO","For_Employee"
*/

WITH
params AS (
  SELECT
      %s::INT AS days_back,
      %s::STRING AS viewer_email,  -- << set the viewer
      %s::INT AS viewer_role   -- 0=admin, 1/2/3=normal user
),

/* Is viewer a manager? (any reportees in closure) */
mgr AS (
  SELECT IFF(COUNT_IF(h.HIERARCHY_LEVEL >= 1) > 0, 1, 0) AS has_reports
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, params p
  WHERE LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
),

/* Who the viewer may see (Name/Email authority set) */
allowed_people AS (
  /* Admin: everyone active */
  SELECT d.EMAIL AS email, d.FULL_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE d, params p
  WHERE p.viewer_role = 0 AND COALESCE(d.IS_ACTIVE, TRUE)

  UNION
  /* Normal user w/ reports: self + all reportees (levels >= 0) */
  SELECT DISTINCT h.REPORTEE_EMAIL AS email, h.REPORTEE_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, params p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 1
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL >= 0

  UNION
  /* Normal user w/o reports: self only (level 0) */
  SELECT DISTINCT h.REPORTEE_EMAIL AS email, h.REPORTEE_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, params p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 0
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL = 0
),

/* Email -> Coupa USER_ID mapping for allowed people */
allowed_coupa_users AS (
  SELECT u.USER_ID, u.FULL_NAME, LOWER(u.EMAIL) AS email
  FROM dim_coupa_user u
  JOIN allowed_people a ON LOWER(a.email) = LOWER(u.EMAIL)
),

/* Groups the allowed users are in (for pending approver GROUP cases) */
member_groups AS (
  SELECT DISTINCT g.GROUP_ID, g.USER_ID
  FROM dim_coupa_approval_groups g
  JOIN allowed_coupa_users acu ON acu.USER_ID = g.USER_ID
),

/* Reqs pending for any allowed user (direct or via their groups) */
req_pending_for AS (
  SELECT DISTINCT
      rpa.REQUISITION_HEADER_ID,
      COALESCE(acu.USER_ID, mg.USER_ID) AS for_user_id
  FROM mrt_coupa_requisition_pending_approvers rpa
  LEFT JOIN allowed_coupa_users acu
    ON rpa.APPROVER_TYPE = 'USER' AND rpa.USER_OR_GROUP_ID = acu.USER_ID
  LEFT JOIN member_groups mg
    ON rpa.APPROVER_TYPE = 'APPROVAL_GROUP' AND rpa.USER_OR_GROUP_ID = mg.GROUP_ID
  WHERE acu.USER_ID IS NOT NULL OR mg.USER_ID IS NOT NULL
),

/* Invoices pending for any allowed user (direct or via their groups) */
inv_pending_for AS (
  SELECT DISTINCT
      ipa.INVOICE_HEADER_ID,
      COALESCE(acu.USER_ID, mg.USER_ID) AS for_user_id
  FROM mrt_coupa_invoice_pending_approvers ipa
  LEFT JOIN allowed_coupa_users acu
    ON ipa.APPROVER_TYPE = 'USER' AND ipa.USER_OR_GROUP_ID = acu.USER_ID
  LEFT JOIN member_groups mg
    ON ipa.APPROVER_TYPE = 'APPROVAL_GROUP' AND ipa.USER_OR_GROUP_ID = mg.GROUP_ID
  WHERE acu.USER_ID IS NOT NULL OR mg.USER_ID IS NOT NULL
),

/* ---------- Latest per header ---------- */
po_latest AS (
  SELECT
      ol.ORDER_HEADER_ID                               AS coupa_id,
      CAST(ol.ORDER_HEADER_ID AS STRING)               AS number,
      'Purchase Order'                                 AS type,
      ol.SUPPLIER_NAME                                 AS supplier,
      ol.LINE_DEPARTMENT_NAME                          AS department_name,
      ol.LINE_INVOICED_AMOUNT                          AS amount,
      ol.ORDER_HEADER_STATUS                           AS status,
      ol.ORDER_CREATED_AT_UTC                          AS date,
      NULL::TIMESTAMP                                  AS due_date,
      ol.LINE_DESCRIPTION                              AS header_memo,
      ol.REQUISITION_HEADER_ID                         AS req_id,
      ol.HEADER_CREATED_BY_ID                          AS created_by_id,
      ol.HEADER_CREATED_BY_NAME                        AS created_by_name
  FROM mrt_coupa_p2p_order_line ol, params p
  WHERE ol.ORDER_CREATED_AT_UTC >= DATEADD(DAY, -p.days_back, CURRENT_DATE)
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY ol.ORDER_HEADER_ID
    ORDER BY ol.ORDER_CREATED_AT_UTC DESC, ol.LINE_ID DESC
  ) = 1
),
req_latest AS (
  SELECT
      rl.REQUISITION_HEADER_ID                         AS coupa_id,
      CAST(rl.REQUISITION_HEADER_ID AS STRING)         AS number,
      'Requisition'                                    AS type,
      cs.NAME                                          AS supplier,
      rl.DEPARTMENT_NAME                               AS department_name,
      rl.TOTAL_AMOUNT                                  AS amount,
      rl.HEADER_STATUS                                 AS status,
      rl.REQUISITION_CREATED_AT_UTC                    AS date,
      NULL::TIMESTAMP                                  AS due_date,
      COALESCE(rl.HEADER_JUSTIFICATION, rl.LINE_DESCRIPTION) AS header_memo,
      rl.REQUISITION_HEADER_ID                         AS req_id,
      rl.REQUESTED_BY_ID                               AS created_by_id
  FROM mrt_coupa_p2p_requisition_line rl
  LEFT JOIN dim_coupa_supplier cs ON cs.supplier_id = rl.supplier_id, params p
  WHERE rl.REQUISITION_CREATED_AT_UTC >= DATEADD(DAY, -p.days_back, CURRENT_DATE)
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY rl.REQUISITION_HEADER_ID
    ORDER BY rl.REQUISITION_CREATED_AT_UTC DESC, rl.REQUISITION_HEADER_ID DESC
  ) = 1
),
inv_latest AS (
  SELECT
      il.INVOICE_HEADER_ID                                AS coupa_id,
      il.INVOICE_NUMBER                                   AS number,
      'Invoice'                                           AS type,
      MAX(il.SUPPLIER_NAME)  OVER (PARTITION BY il.INVOICE_HEADER_ID) AS supplier,
      NULL::STRING                                        AS department_name,
      COALESCE(
        MAX(il.INVOICE_AMOUNT) OVER (PARTITION BY il.INVOICE_HEADER_ID),
        SUM(il.LINE_AMOUNT)   OVER (PARTITION BY il.INVOICE_HEADER_ID)
      )                                                   AS amount,
      MAX(il.STATUS)            OVER (PARTITION BY il.INVOICE_HEADER_ID) AS status,
      MIN(il.LINE_CREATED_AT_UTC) OVER (PARTITION BY il.INVOICE_HEADER_ID) AS date,
      NULL::TIMESTAMP                                     AS due_date,
      MAX(il.LINE_DESCRIPTION) OVER (PARTITION BY il.INVOICE_HEADER_ID) AS header_memo,
      NULL::NUMBER                                        AS req_id,
      MAX(il.HEADER_CREATED_BY_ID)   OVER (PARTITION BY il.INVOICE_HEADER_ID) AS created_by_id,
      MAX(il.HEADER_CREATED_BY_NAME) OVER (PARTITION BY il.INVOICE_HEADER_ID) AS created_by_name
  FROM mrt_coupa_p2p_invoice_line il, params p
  WHERE il.LINE_CREATED_AT_UTC >= DATEADD(DAY, -p.days_back, CURRENT_DATE)
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY il.INVOICE_HEADER_ID
    ORDER BY il.LINE_CREATED_AT_UTC DESC, il.LINE_ID DESC
  ) = 1
),

/* ---------- Visibility: CREATED (ID or Name) ---------- */
po_created AS (
  SELECT
      pl.coupa_id, pl.number, pl.type, pl.supplier, pl.department_name, pl.amount,
      pl.status, pl.date, pl.due_date, pl.header_memo,
      COALESCE(acu.FULL_NAME, ap.full_name) AS for_employee
  FROM po_latest pl
  LEFT JOIN allowed_coupa_users acu ON pl.created_by_id = acu.USER_ID
  LEFT JOIN allowed_people ap ON UPPER(TRIM(pl.created_by_name)) = UPPER(TRIM(ap.full_name))
  WHERE acu.USER_ID IS NOT NULL OR ap.full_name IS NOT NULL
),
req_created AS (
  SELECT
      rl.coupa_id, rl.number, rl.type, rl.supplier, rl.department_name, rl.amount,
      rl.status, rl.date, rl.due_date, rl.header_memo,
      acu.FULL_NAME AS for_employee
  FROM req_latest rl
  JOIN allowed_coupa_users acu ON rl.created_by_id = acu.USER_ID
),
inv_created AS (
  SELECT
      il.coupa_id, il.number, il.type, il.supplier, il.department_name, il.amount,
      il.status, il.date, il.due_date, il.header_memo,
      COALESCE(acu.FULL_NAME, ap.full_name) AS for_employee
  FROM inv_latest il
  LEFT JOIN allowed_coupa_users acu ON il.created_by_id = acu.USER_ID
  LEFT JOIN allowed_people ap ON UPPER(TRIM(il.created_by_name)) = UPPER(TRIM(ap.full_name))
  WHERE acu.USER_ID IS NOT NULL OR ap.full_name IS NOT NULL
),

/* ---------- Visibility: PENDING approver (USER / GROUP) ---------- */
po_pending AS (
  SELECT
      pl.coupa_id, pl.number, pl.type, pl.supplier, pl.department_name, pl.amount,
      pl.status, pl.date, pl.due_date, pl.header_memo,
      acu2.FULL_NAME AS for_employee
  FROM po_latest pl
  JOIN req_pending_for rp ON rp.REQUISITION_HEADER_ID = pl.req_id
  JOIN allowed_coupa_users acu2 ON acu2.USER_ID = rp.for_user_id
),
req_pending AS (
  SELECT
      rl.coupa_id, rl.number, rl.type, rl.supplier, rl.department_name, rl.amount,
      rl.status, rl.date, rl.due_date, rl.header_memo,
      acu2.FULL_NAME AS for_employee
  FROM req_latest rl
  JOIN req_pending_for rp ON rp.REQUISITION_HEADER_ID = rl.req_id
  JOIN allowed_coupa_users acu2 ON acu2.USER_ID = rp.for_user_id
),
inv_pending AS (
  SELECT
      il.coupa_id, il.number, il.type, il.supplier, il.department_name, il.amount,
      il.status, il.date, il.due_date, il.header_memo,
      acu2.FULL_NAME AS for_employee
  FROM inv_latest il
  JOIN inv_pending_for ip ON ip.INVOICE_HEADER_ID = il.coupa_id
  JOIN allowed_coupa_users acu2 ON acu2.USER_ID = ip.for_user_id
)

/* ---------- Final (one row per header per person) ---------- */
SELECT
    coupa_id            AS "Coupa ID",
    number              AS "Number",
    type                AS "Type",
    supplier            AS "Supplier",
    department_name     AS "DEPARTMENT_NAME",
    amount              AS "Amount",
    status              AS "Status",
    date                AS "Date",
    due_date            AS "Due Date",
    header_memo         AS "HEADER_MEMO",
    for_employee        AS "For_Employee",
    COUNT(*) OVER()     AS TOTAL_COUNT
FROM (
  SELECT * FROM req_created
  UNION ALL SELECT * FROM req_pending
  UNION ALL SELECT * FROM po_created
  UNION ALL SELECT * FROM po_pending
  UNION ALL SELECT * FROM inv_created
  UNION ALL SELECT * FROM inv_pending
)
QUALIFY ROW_NUMBER() OVER (
  PARTITION BY "Type","Coupa ID","For_Employee"
  ORDER BY "Date" DESC
) = 1
ORDER BY "Date" DESC, "Type", "Number" LIMIT %s OFFSET %s;
'''

CONSOLIDATED_COUPA_FINANCIAL_METRICS = '''
/* ===================== COUPA ROLL-UP (SINGLE ROW) ===================== */
WITH
params AS (
  SELECT 
      %s::INT AS days_back,
      %s::STRING AS viewer_email,
      %s::INT AS viewer_role   -- 0=admin, 1/2/3=normal user
),
mgr AS (
  SELECT IFF(COUNT_IF(h.HIERARCHY_LEVEL >= 1) > 0, 1, 0) AS has_reports
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, params p
  WHERE LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
),
allowed_people AS (
  SELECT d.EMAIL, d.FULL_NAME
  FROM DIM_WORKDAY_EMPLOYEE d, params p
  WHERE p.viewer_role = 0 AND COALESCE(d.IS_ACTIVE, TRUE)
  UNION
  SELECT DISTINCT h.REPORTEE_EMAIL, h.REPORTEE_NAME
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, params p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 1
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email) AND h.HIERARCHY_LEVEL >= 0
  UNION
  SELECT DISTINCT h.REPORTEE_EMAIL, h.REPORTEE_NAME
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, params p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 0
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email) AND h.HIERARCHY_LEVEL = 0
),
allowed_coupa_users AS (
  SELECT u.USER_ID, u.FULL_NAME, LOWER(u.EMAIL) AS email
  FROM dim_coupa_user u
  JOIN allowed_people a ON LOWER(a.EMAIL) = LOWER(u.EMAIL)
),
member_groups AS (
  SELECT DISTINCT g.GROUP_ID, g.USER_ID
  FROM dim_coupa_approval_groups g
  JOIN allowed_coupa_users acu ON acu.USER_ID = g.USER_ID
),
req_pending_for AS (
  SELECT DISTINCT rpa.REQUISITION_HEADER_ID, COALESCE(acu.USER_ID, mg.USER_ID) AS for_user_id
  FROM mrt_coupa_requisition_pending_approvers rpa
  LEFT JOIN allowed_coupa_users acu ON rpa.APPROVER_TYPE='USER' AND rpa.USER_OR_GROUP_ID=acu.USER_ID
  LEFT JOIN member_groups mg ON rpa.APPROVER_TYPE='APPROVAL_GROUP' AND rpa.USER_OR_GROUP_ID=mg.GROUP_ID
  WHERE acu.USER_ID IS NOT NULL OR mg.USER_ID IS NOT NULL
),
inv_pending_for AS (
  SELECT DISTINCT ipa.INVOICE_HEADER_ID, COALESCE(acu.USER_ID, mg.USER_ID) AS for_user_id
  FROM mrt_coupa_invoice_pending_approvers ipa
  LEFT JOIN allowed_coupa_users acu ON ipa.APPROVER_TYPE='USER' AND ipa.USER_OR_GROUP_ID=acu.USER_ID
  LEFT JOIN member_groups mg ON ipa.APPROVER_TYPE='APPROVAL_GROUP' AND ipa.USER_OR_GROUP_ID=mg.GROUP_ID
  WHERE acu.USER_ID IS NOT NULL OR mg.USER_ID IS NOT NULL
),
po_latest AS (
  SELECT 'Purchase Order' AS type, ol.ORDER_HEADER_STATUS AS status, ol.ORDER_CREATED_AT_UTC AS date,
         NULL::TIMESTAMP AS due_date, ol.LINE_INVOICED_AMOUNT AS amount,
         ol.REQUISITION_HEADER_ID AS req_id, ol.HEADER_CREATED_BY_ID AS created_by_id,
         ol.HEADER_CREATED_BY_NAME AS created_by_name
  FROM mrt_coupa_p2p_order_line ol, params p
  WHERE ol.ORDER_CREATED_AT_UTC >= DATEADD(DAY, -p.days_back, CURRENT_DATE)
  QUALIFY ROW_NUMBER() OVER (PARTITION BY ol.ORDER_HEADER_ID
                             ORDER BY ol.ORDER_CREATED_AT_UTC DESC, ol.LINE_ID DESC)=1
),
req_latest AS (
  SELECT 'Requisition' AS type, rl.HEADER_STATUS AS status, rl.REQUISITION_CREATED_AT_UTC AS date,
         NULL::TIMESTAMP AS due_date, rl.TOTAL_AMOUNT AS amount,
         rl.REQUISITION_HEADER_ID AS req_id, rl.REQUESTED_BY_ID AS created_by_id, NULL AS created_by_name
  FROM mrt_coupa_p2p_requisition_line rl, params p
  WHERE rl.REQUISITION_CREATED_AT_UTC >= DATEADD(DAY, -p.days_back, CURRENT_DATE)
  QUALIFY ROW_NUMBER() OVER (PARTITION BY rl.REQUISITION_HEADER_ID
                             ORDER BY rl.REQUISITION_CREATED_AT_UTC DESC, rl.REQUISITION_HEADER_ID DESC)=1
),
inv_latest AS (
  SELECT 'Invoice' AS type,
         MAX(il.STATUS) OVER (PARTITION BY il.INVOICE_HEADER_ID) AS status,
         MIN(il.LINE_CREATED_AT_UTC) OVER (PARTITION BY il.INVOICE_HEADER_ID) AS date,
         NULL::TIMESTAMP AS due_date,
         COALESCE(MAX(il.INVOICE_AMOUNT) OVER (PARTITION BY il.INVOICE_HEADER_ID),
                  SUM(il.LINE_AMOUNT)   OVER (PARTITION BY il.INVOICE_HEADER_ID)) AS amount,
         il.INVOICE_HEADER_ID AS coupa_id,
         MAX(il.HEADER_CREATED_BY_ID) OVER (PARTITION BY il.INVOICE_HEADER_ID) AS created_by_id,
         MAX(il.HEADER_CREATED_BY_NAME) OVER (PARTITION BY il.INVOICE_HEADER_ID) AS created_by_name
  FROM mrt_coupa_p2p_invoice_line il, params p
  WHERE il.LINE_CREATED_AT_UTC >= DATEADD(DAY, -p.days_back, CURRENT_DATE)
  QUALIFY ROW_NUMBER() OVER (PARTITION BY il.INVOICE_HEADER_ID
                             ORDER BY il.LINE_CREATED_AT_UTC DESC, il.LINE_ID DESC)=1
),
po_created AS (
  SELECT type, status, date, due_date, amount
  FROM po_latest pl
  LEFT JOIN allowed_coupa_users acu ON pl.created_by_id=acu.USER_ID
  LEFT JOIN allowed_people ap ON UPPER(TRIM(pl.created_by_name))=UPPER(TRIM(ap.FULL_NAME))
  WHERE acu.USER_ID IS NOT NULL OR ap.FULL_NAME IS NOT NULL
),
req_created AS (
  SELECT type, status, date, due_date, amount
  FROM req_latest rl JOIN allowed_coupa_users acu ON rl.created_by_id=acu.USER_ID
),
inv_created AS (
  SELECT type, status, date, due_date, amount
  FROM inv_latest il
  LEFT JOIN allowed_coupa_users acu ON il.created_by_id=acu.USER_ID
  LEFT JOIN allowed_people ap ON UPPER(TRIM(il.created_by_name))=UPPER(TRIM(ap.FULL_NAME))
  WHERE acu.USER_ID IS NOT NULL OR ap.FULL_NAME IS NOT NULL
),
po_pending AS (
  SELECT type, status, date, due_date, amount
  FROM po_latest pl JOIN req_pending_for rp ON rp.REQUISITION_HEADER_ID=pl.req_id
                    JOIN allowed_coupa_users acu2 ON acu2.USER_ID=rp.for_user_id
),
req_pending AS (
  SELECT type, status, date, due_date, amount
  FROM req_latest rl JOIN req_pending_for rp ON rp.REQUISITION_HEADER_ID=rl.req_id
                     JOIN allowed_coupa_users acu2 ON acu2.USER_ID=rp.for_user_id
),
inv_pending AS (
  SELECT type, status, date, due_date, amount
  FROM inv_latest il JOIN inv_pending_for ip ON ip.INVOICE_HEADER_ID=il.coupa_id
                     JOIN allowed_coupa_users acu2 ON acu2.USER_ID=ip.for_user_id
),
results AS (
  SELECT * FROM po_created
  UNION ALL SELECT * FROM req_created
  UNION ALL SELECT * FROM inv_created
  UNION ALL SELECT * FROM po_pending
  UNION ALL SELECT * FROM req_pending
  UNION ALL SELECT * FROM inv_pending
)
SELECT
  COUNT_IF(type='Purchase Order'
           AND NOT (status ILIKE '%%closed%%' OR status ILIKE '%%cancel%%')) AS open_po_count,
  COUNT_IF(status ILIKE '%%pending%%')                                       AS pending_approvals_count,
  /* --- NEW critical definition --- */
  COUNT_IF(type = 'Purchase Order'
           AND due_date IS NOT NULL
           AND status ILIKE '%%pending%%'
           AND DATEDIFF(day, CAST(date AS DATE), CAST(due_date AS DATE)) > 10) AS critical_po_count,
  SUM(CASE WHEN type IN ('Purchase Order','Invoice','Requisition')
           THEN COALESCE(amount,0) ELSE 0 END)::NUMBER(38,2)                 AS total_amount
FROM results;
'''

CONSOLIDATED_COUPA_METRICS = '''
/* ===================== COUPA — METRICS (SINGLE ROW) ===================== */
WITH
params AS (
  SELECT
      %s::INT                               AS days_back,
      %s::STRING AS viewer_email,  -- << set the viewer
      %s::INT                                AS viewer_role     -- 0=admin, 1/2/3=normal
),
/* Is viewer a manager? */
mgr AS (
  SELECT IFF(COUNT_IF(h.HIERARCHY_LEVEL >= 1) > 0, 1, 0) AS has_reports
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, params p
  WHERE LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
),
/* Allowed people via Workday hierarchy */
allowed_people AS (
  /* Admin: everyone active */
  SELECT d.EMAIL, d.FULL_NAME
  FROM DIM_WORKDAY_EMPLOYEE d, params p
  WHERE p.viewer_role = 0 AND COALESCE(d.IS_ACTIVE, TRUE)

  UNION
  /* Normal user with reports: self + all reportees (levels ≥ 0) */
  SELECT DISTINCT h.REPORTEE_EMAIL, h.REPORTEE_NAME
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, params p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 1
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL >= 0

  UNION
  /* Normal user without reports: self only (level = 0) */
  SELECT DISTINCT h.REPORTEE_EMAIL, h.REPORTEE_NAME
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, params p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 0
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL = 0
),
/* Map allowed emails -> Coupa USER_IDs (for created & pending) */
allowed_coupa_users AS (
  SELECT u.USER_ID, u.FULL_NAME, LOWER(u.EMAIL) AS email
  FROM dim_coupa_user u
  JOIN allowed_people a ON LOWER(a.EMAIL) = LOWER(u.EMAIL)
),
/* Groups for pending approver */
member_groups AS (
  SELECT DISTINCT g.GROUP_ID, g.USER_ID
  FROM dim_coupa_approval_groups g
  JOIN allowed_coupa_users acu ON acu.USER_ID = g.USER_ID
),
/* Reqs/Invoices pending for any allowed user (user or their groups) */
req_pending_for AS (
  SELECT DISTINCT rpa.REQUISITION_HEADER_ID, COALESCE(acu.USER_ID, mg.USER_ID) AS for_user_id
  FROM mrt_coupa_requisition_pending_approvers rpa
  LEFT JOIN allowed_coupa_users acu ON rpa.APPROVER_TYPE='USER' AND rpa.USER_OR_GROUP_ID=acu.USER_ID
  LEFT JOIN member_groups mg        ON rpa.APPROVER_TYPE='APPROVAL_GROUP' AND rpa.USER_OR_GROUP_ID=mg.GROUP_ID
  WHERE acu.USER_ID IS NOT NULL OR mg.USER_ID IS NOT NULL
),
inv_pending_for AS (
  SELECT DISTINCT ipa.INVOICE_HEADER_ID, COALESCE(acu.USER_ID, mg.USER_ID) AS for_user_id
  FROM mrt_coupa_invoice_pending_approvers ipa
  LEFT JOIN allowed_coupa_users acu ON ipa.APPROVER_TYPE='USER' AND ipa.USER_OR_GROUP_ID=acu.USER_ID
  LEFT JOIN member_groups mg        ON ipa.APPROVER_TYPE='APPROVAL_GROUP' AND ipa.USER_OR_GROUP_ID=mg.GROUP_ID
  WHERE acu.USER_ID IS NOT NULL OR mg.USER_ID IS NOT NULL
),

/* ---------- Latest header per object ---------- */
po_latest AS (
  SELECT
      ol.ORDER_HEADER_ID                               AS coupa_id,
      CAST(ol.ORDER_HEADER_ID AS STRING)               AS number,
      'Purchase Order'                                 AS type,
      ol.SUPPLIER_NAME                                 AS supplier,
      ol.LINE_DEPARTMENT_NAME                          AS department_name,
      ol.LINE_INVOICED_AMOUNT                          AS amount,
      ol.ORDER_HEADER_STATUS                           AS status,
      ol.ORDER_CREATED_AT_UTC                          AS date,
      /* TODO: replace NULL with your due/need-by column if available */
      NULL::TIMESTAMP                                  AS due_date,
      ol.REQUISITION_HEADER_ID                         AS req_id,
      ol.HEADER_CREATED_BY_ID                          AS created_by_id,
      ol.HEADER_CREATED_BY_NAME                        AS created_by_name
  FROM mrt_coupa_p2p_order_line ol, params p
  WHERE ol.ORDER_CREATED_AT_UTC >= DATEADD(DAY, -p.days_back, CURRENT_DATE)
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY ol.ORDER_HEADER_ID
    ORDER BY ol.ORDER_CREATED_AT_UTC DESC, ol.LINE_ID DESC
  ) = 1
),
req_latest AS (
  SELECT
      rl.REQUISITION_HEADER_ID                         AS coupa_id,
      CAST(rl.REQUISITION_HEADER_ID AS STRING)         AS number,
      'Requisition'                                    AS type,
      cs.NAME                                          AS supplier,
      rl.DEPARTMENT_NAME                               AS department_name,
      rl.TOTAL_AMOUNT                                  AS amount,
      rl.HEADER_STATUS                                 AS status,
      rl.REQUISITION_CREATED_AT_UTC                    AS date,
      NULL::TIMESTAMP                                  AS due_date,
      rl.REQUISITION_HEADER_ID                         AS req_id,
      rl.REQUESTED_BY_ID                               AS created_by_id
  FROM mrt_coupa_p2p_requisition_line rl
  LEFT JOIN dim_coupa_supplier cs ON cs.supplier_id = rl.supplier_id, params p
  WHERE rl.REQUISITION_CREATED_AT_UTC >= DATEADD(DAY, -p.days_back, CURRENT_DATE)
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY rl.REQUISITION_HEADER_ID
    ORDER BY rl.REQUISITION_CREATED_AT_UTC DESC, rl.REQUISITION_HEADER_ID DESC
  ) = 1
),
inv_latest AS (
  SELECT
      il.INVOICE_HEADER_ID                                AS coupa_id,
      il.INVOICE_NUMBER                                   AS number,
      'Invoice'                                           AS type,
      MAX(il.SUPPLIER_NAME)  OVER (PARTITION BY il.INVOICE_HEADER_ID) AS supplier,
      NULL::STRING                                        AS department_name,
      COALESCE(
        MAX(il.INVOICE_AMOUNT) OVER (PARTITION BY il.INVOICE_HEADER_ID),
        SUM(il.LINE_AMOUNT)   OVER (PARTITION BY il.INVOICE_HEADER_ID)
      )                                                   AS amount,
      MAX(il.STATUS)            OVER (PARTITION BY il.INVOICE_HEADER_ID) AS status,
      MIN(il.LINE_CREATED_AT_UTC) OVER (PARTITION BY il.INVOICE_HEADER_ID) AS date,
      NULL::TIMESTAMP                                     AS due_date,
      NULL::NUMBER                                        AS req_id,
      MAX(il.HEADER_CREATED_BY_ID)   OVER (PARTITION BY il.INVOICE_HEADER_ID) AS created_by_id,
      MAX(il.HEADER_CREATED_BY_NAME) OVER (PARTITION BY il.INVOICE_HEADER_ID) AS created_by_name
  FROM mrt_coupa_p2p_invoice_line il, params p
  WHERE il.LINE_CREATED_AT_UTC >= DATEADD(DAY, -p.days_back, CURRENT_DATE)
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY il.INVOICE_HEADER_ID
    ORDER BY il.LINE_CREATED_AT_UTC DESC, il.LINE_ID DESC
  ) = 1
),

/* ---------- Visibility: CREATED (ID or Name) ---------- */
po_created AS (
  SELECT
      pl.coupa_id AS header_id, pl.type, pl.status, pl.date, pl.due_date, pl.amount
  FROM po_latest pl
  LEFT JOIN allowed_coupa_users acu ON pl.created_by_id = acu.USER_ID
  LEFT JOIN allowed_people ap ON UPPER(TRIM(pl.created_by_name)) = UPPER(TRIM(ap.FULL_NAME))
  WHERE acu.USER_ID IS NOT NULL OR ap.FULL_NAME IS NOT NULL
),
req_created AS (
  SELECT
      rl.coupa_id AS header_id, rl.type, rl.status, rl.date, rl.due_date, rl.amount
  FROM req_latest rl
  JOIN allowed_coupa_users acu ON rl.created_by_id = acu.USER_ID
),
inv_created AS (
  SELECT
      il.coupa_id AS header_id, il.type, il.status, il.date, il.due_date, il.amount
  FROM inv_latest il
  LEFT JOIN allowed_coupa_users acu ON il.created_by_id = acu.USER_ID
  LEFT JOIN allowed_people ap ON UPPER(TRIM(il.created_by_name)) = UPPER(TRIM(ap.FULL_NAME))
  WHERE acu.USER_ID IS NOT NULL OR ap.FULL_NAME IS NOT NULL
),

/* ---------- Visibility: PENDING approver (USER/GROUP) ---------- */
po_pending AS (
  SELECT
      pl.coupa_id AS header_id, pl.type, pl.status, pl.date, pl.due_date, pl.amount
  FROM po_latest pl
  JOIN req_pending_for rp ON rp.REQUISITION_HEADER_ID = pl.req_id
  JOIN allowed_coupa_users acu2 ON acu2.USER_ID = rp.for_user_id
),
req_pending AS (
  SELECT
      rl.coupa_id AS header_id, rl.type, rl.status, rl.date, rl.due_date, rl.amount
  FROM req_latest rl
  JOIN req_pending_for rp ON rp.REQUISITION_HEADER_ID = rl.req_id
  JOIN allowed_coupa_users acu2 ON acu2.USER_ID = rp.for_user_id
),
inv_pending AS (
  SELECT
      il.coupa_id AS header_id, il.type, il.status, il.date, il.due_date, il.amount
  FROM inv_latest il
  JOIN inv_pending_for ip ON ip.INVOICE_HEADER_ID = il.coupa_id
  JOIN allowed_coupa_users acu2 ON acu2.USER_ID = ip.for_user_id
),

/* ---------- Universe of visible headers (de-duped per header) ---------- */
visible_union AS (
  SELECT * FROM po_created
  UNION ALL SELECT * FROM req_created
  UNION ALL SELECT * FROM inv_created
  UNION ALL SELECT * FROM po_pending
  UNION ALL SELECT * FROM req_pending
  UNION ALL SELECT * FROM inv_pending
),
visible_headers AS (
  SELECT
      header_id, type, status, date, due_date, amount
  FROM visible_union
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY type, header_id
    ORDER BY date DESC
  ) = 1
)

/* ---------- Final metrics ---------- */
SELECT
  /* Open PO count (not closed/cancelled) */
  COUNT_IF(type='Purchase Order'
           AND NOT (status ILIKE '%%closed%%' OR status ILIKE '%%cancel%%'))                 AS open_po_count,

  /* Requisition count (unique visible requisitions) */
  COUNT_IF(type='Requisition')                                                                AS requisition_count,

  /* Pending approvals across all types */
  COUNT_IF(status ILIKE '%%pending%%')                                                        AS pending_approvals_count,

  /* Critical PO: due_date present & pending, AND (due_date - created_date) > 10 days */
  COUNT_IF(type='Purchase Order'
           AND due_date IS NOT NULL
           AND status ILIKE '%%pending%%'
           AND DATEDIFF(day, CAST(date AS DATE), CAST(due_date AS DATE)) > 10)               AS critical_po_count,

  /* Requisitions total $ */
  SUM(CASE WHEN type='Requisition' THEN COALESCE(amount,0) ELSE 0 END)::NUMBER(38,2)         AS requisitions_total_amount
FROM visible_headers;
'''

CONSOLIDATED_COUPA_TRENDS = '''
/* ===================== COUPA — METRICS (SINGLE ROW) ===================== */
WITH
params AS (
  SELECT
      %s::INT                               AS days_back,
      %s::STRING AS viewer_email,  -- << set the viewer
      %s::INT                                AS viewer_role     -- 0=admin, 1/2/3=normal
),
mgr AS (
  SELECT IFF(COUNT_IF(h.HIERARCHY_LEVEL >= 1) > 0, 1, 0) AS has_reports
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, params p
  WHERE LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
),
allowed_people AS (
  SELECT d.EMAIL, d.FULL_NAME
  FROM DIM_WORKDAY_EMPLOYEE d, params p
  WHERE p.viewer_role = 0 AND COALESCE(d.IS_ACTIVE, TRUE)
  UNION
  SELECT DISTINCT h.REPORTEE_EMAIL, h.REPORTEE_NAME
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, params p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 1
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email) AND h.HIERARCHY_LEVEL >= 0
  UNION
  SELECT DISTINCT h.REPORTEE_EMAIL, h.REPORTEE_NAME
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, params p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 0
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email) AND h.HIERARCHY_LEVEL = 0
),
allowed_coupa_users AS (
  SELECT u.USER_ID, u.FULL_NAME, LOWER(u.EMAIL) AS email
  FROM dim_coupa_user u
  JOIN allowed_people a ON LOWER(a.EMAIL) = LOWER(u.EMAIL)
),
member_groups AS (
  SELECT DISTINCT g.GROUP_ID, g.USER_ID
  FROM dim_coupa_approval_groups g
  JOIN allowed_coupa_users acu ON acu.USER_ID = g.USER_ID
),
req_pending_for AS (
  SELECT DISTINCT rpa.REQUISITION_HEADER_ID, COALESCE(acu.USER_ID, mg.USER_ID) AS for_user_id
  FROM mrt_coupa_requisition_pending_approvers rpa
  LEFT JOIN allowed_coupa_users acu ON rpa.APPROVER_TYPE='USER' AND rpa.USER_OR_GROUP_ID=acu.USER_ID
  LEFT JOIN member_groups mg        ON rpa.APPROVER_TYPE='APPROVAL_GROUP' AND rpa.USER_OR_GROUP_ID=mg.GROUP_ID
  WHERE acu.USER_ID IS NOT NULL OR mg.USER_ID IS NOT NULL
),
po_latest AS (
  SELECT
      ol.ORDER_HEADER_ID            AS header_id,
      'Purchase Order'              AS type,
      ol.ORDER_HEADER_STATUS        AS status,
      ol.ORDER_CREATED_AT_UTC       AS date,
      NULL::TIMESTAMP               AS due_date,  -- swap when you have the real column
      ol.LINE_INVOICED_AMOUNT       AS amount,
      ol.REQUISITION_HEADER_ID      AS req_id,
      ol.HEADER_CREATED_BY_ID       AS created_by_id,
      ol.HEADER_CREATED_BY_NAME     AS created_by_name
  FROM mrt_coupa_p2p_order_line ol, params p
  WHERE ol.ORDER_CREATED_AT_UTC >= DATEADD(DAY, -p.days_back, CURRENT_DATE)
  QUALIFY ROW_NUMBER() OVER (PARTITION BY ol.ORDER_HEADER_ID
                             ORDER BY ol.ORDER_CREATED_AT_UTC DESC, ol.LINE_ID DESC)=1
),
po_created AS (
  SELECT pl.header_id, pl.status, pl.date, pl.due_date, pl.amount
  FROM po_latest pl
  LEFT JOIN allowed_coupa_users acu ON pl.created_by_id = acu.USER_ID
  LEFT JOIN allowed_people ap ON UPPER(TRIM(pl.created_by_name)) = UPPER(TRIM(ap.FULL_NAME))
  WHERE acu.USER_ID IS NOT NULL OR ap.FULL_NAME IS NOT NULL
),
po_pending AS (
  SELECT pl.header_id, pl.status, pl.date, pl.due_date, pl.amount
  FROM po_latest pl
  JOIN req_pending_for rp ON rp.REQUISITION_HEADER_ID = pl.req_id
  JOIN allowed_coupa_users acu2 ON acu2.USER_ID = rp.for_user_id
),
po_visible_union AS (
  SELECT * FROM po_created
  UNION ALL
  SELECT * FROM po_pending
),
po_visible AS (
  SELECT *
  FROM po_visible_union
  QUALIFY ROW_NUMBER() OVER (PARTITION BY header_id ORDER BY date DESC) = 1
)

/* ---- Monthly PO spend for the line chart ---- */
SELECT
  DATE_TRUNC('month', CAST(date AS DATE))                                          AS month_start,
  TO_VARCHAR(DATE_TRUNC('month', CAST(date AS DATE)), 'Mon YYYY')                  AS month_label,
  SUM(COALESCE(amount,0))                                                          AS po_total_amount
FROM po_visible
GROUP BY 1,2
ORDER BY 1;
'''

COUPA_DASHBOARD_COSTCENTRE_DISTRIBUTION = '''
WITH
/* ---------- Parameters (bind from app) ---------- */
params AS (
  SELECT
      %s::INT                               AS days_back,
      %s::STRING  AS viewer_email,     -- << set the viewer
      %s::INT                                 AS viewer_role,      -- 0=admin, 1/2/3=normal

      /* NULL or [] => no filter */
      PARSE_JSON('[]')::VARIANT              AS users,
      PARSE_JSON('[]')::VARIANT              AS suppliers,
      PARSE_JSON('[]')::VARIANT              AS statuses,
      PARSE_JSON('[]')::VARIANT              AS cost_centers,
      PARSE_JSON('[]')::VARIANT              AS search_numbers,
      NULL::NUMBER                           AS min_amount,
      NULL::NUMBER                           AS max_amount,
      PARSE_JSON('[]')::VARIANT              AS types            -- e.g. ["Purchase Orders","Invoices","Requisitions"]
),
/* Normalize empties -> NULL */
norm AS (
  SELECT
    days_back, viewer_email, viewer_role,
    IFF(users          IS NULL OR ARRAY_SIZE(users)         = 0, NULL, users)          AS users,
    IFF(suppliers      IS NULL OR ARRAY_SIZE(suppliers)     = 0, NULL, suppliers)      AS suppliers,
    IFF(statuses       IS NULL OR ARRAY_SIZE(statuses)      = 0, NULL, statuses)       AS statuses,
    IFF(cost_centers   IS NULL OR ARRAY_SIZE(cost_centers)  = 0, NULL, cost_centers)   AS cost_centers,
    IFF(search_numbers IS NULL OR ARRAY_SIZE(search_numbers)= 0, NULL, search_numbers) AS search_numbers,
    min_amount, max_amount,
    IFF(types         IS NULL OR ARRAY_SIZE(types)          = 0, NULL, types)          AS types
  FROM params
),

/* Manager? */
mgr AS (
  SELECT IFF(COUNT_IF(h.HIERARCHY_LEVEL >= 1) > 0, 1, 0) AS has_reports
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p
  WHERE LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
),

/* RBAC: people the viewer may see */
allowed_people AS (
  /* Admin: everyone active */
  SELECT d.EMAIL AS email, d.FULL_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE d, norm p
  WHERE p.viewer_role = 0 AND COALESCE(d.IS_ACTIVE, TRUE)

  UNION
  /* Manager: self + all reportees */
  SELECT DISTINCT h.REPORTEE_EMAIL AS email, h.REPORTEE_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 1
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL >= 0

  UNION
  /* IC: self only */
  SELECT DISTINCT h.REPORTEE_EMAIL AS email, h.REPORTEE_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 0
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL = 0
),

/* Email -> Coupa user IDs */
allowed_coupa_users AS (
  SELECT u.USER_ID, u.FULL_NAME, LOWER(u.EMAIL) AS email
  FROM dim_coupa_user u
  JOIN allowed_people a ON LOWER(a.email) = LOWER(u.EMAIL)
),

/* Groups for pending-approver GROUP cases */
member_groups AS (
  SELECT DISTINCT g.GROUP_ID, g.USER_ID
  FROM dim_coupa_approval_groups g
  JOIN allowed_coupa_users acu ON acu.USER_ID = g.USER_ID
),

/* Pending sets */
req_pending_for AS (
  SELECT DISTINCT rpa.REQUISITION_HEADER_ID, COALESCE(acu.USER_ID, mg.USER_ID) AS for_user_id
  FROM mrt_coupa_requisition_pending_approvers rpa
  LEFT JOIN allowed_coupa_users acu ON rpa.APPROVER_TYPE='USER' AND rpa.USER_OR_GROUP_ID=acu.USER_ID
  LEFT JOIN member_groups mg       ON rpa.APPROVER_TYPE='APPROVAL_GROUP' AND rpa.USER_OR_GROUP_ID=mg.GROUP_ID
  WHERE acu.USER_ID IS NOT NULL OR mg.USER_ID IS NOT NULL
),
inv_pending_for AS (
  SELECT DISTINCT ipa.INVOICE_HEADER_ID, COALESCE(acu.USER_ID, mg.USER_ID) AS for_user_id
  FROM mrt_coupa_invoice_pending_approvers ipa
  LEFT JOIN allowed_coupa_users acu ON ipa.APPROVER_TYPE='USER' AND ipa.USER_OR_GROUP_ID=acu.USER_ID
  LEFT JOIN member_groups mg       ON ipa.APPROVER_TYPE='APPROVAL_GROUP' AND ipa.USER_OR_GROUP_ID=mg.GROUP_ID
  WHERE acu.USER_ID IS NOT NULL OR mg.USER_ID IS NOT NULL
),

/* Flattened filters */
flt_suppliers AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.suppliers) f),
flt_statuses  AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.statuses)  f),
flt_cost_ctrs AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.cost_centers) f),
flt_numbers   AS (SELECT DISTINCT TRIM(f.value::string) AS part  FROM norm p, LATERAL FLATTEN(input => p.search_numbers) f),

/* Users filter candidates (emails or names) */
raw_user_vals AS (SELECT DISTINCT u.value::string AS raw_val FROM norm p, LATERAL FLATTEN(input => p.users) u),
sel_users AS (
  /* email */
  SELECT DISTINCT cu.USER_ID, UPPER(TRIM(cu.FULL_NAME)) AS name_norm
  FROM raw_user_vals r JOIN dim_coupa_user cu ON LOWER(cu.EMAIL) = LOWER(r.raw_val)
  UNION
  /* exact full-name */
  SELECT DISTINCT cu.USER_ID, UPPER(TRIM(cu.FULL_NAME)) AS name_norm
  FROM raw_user_vals r JOIN dim_coupa_user cu ON UPPER(TRIM(cu.FULL_NAME)) = UPPER(TRIM(r.raw_val))
),

/* Type filter → canonical names */
raw_type_vals AS (SELECT DISTINCT t.value::string AS raw_val FROM norm p, LATERAL FLATTEN(input => p.types) t),
flt_type AS (
  SELECT type_key FROM (
    SELECT DISTINCT
      CASE
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('PURCHASE ORDER','PURCHASE ORDERS','PO','POS','PURCHASEORDER','PURCHASEORDERS') THEN 'Purchase Order'
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('INVOICE','INVOICES','INV')                                              THEN 'Invoice'
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('REQUISITION','REQUISITIONS','REQ','REQS')                               THEN 'Requisition'
      END AS type_key
    FROM raw_type_vals
  ) s WHERE type_key IS NOT NULL
),

/* ---------- Latest per header (date window + type gate) ---------- */
po_latest AS (
  SELECT
      ol.ORDER_HEADER_ID                               AS coupa_id,
      CAST(ol.ORDER_HEADER_ID AS STRING)               AS number,
      'Purchase Order'                                 AS type,
      ol.SUPPLIER_NAME                                 AS supplier,
      ol.LINE_DEPARTMENT_NAME                          AS department_name,
      ol.LINE_INVOICED_AMOUNT                          AS amount,
      ol.ORDER_HEADER_STATUS                           AS status,
      ol.ORDER_CREATED_AT_UTC                          AS date,
      NULL::TIMESTAMP                                  AS due_date,
      ol.LINE_DESCRIPTION                              AS header_memo,
      ol.REQUISITION_HEADER_ID                         AS req_id,
      ol.HEADER_CREATED_BY_ID                          AS created_by_id,
      ol.HEADER_CREATED_BY_NAME                        AS created_by_name
  FROM mrt_coupa_p2p_order_line ol, norm p
  WHERE ol.ORDER_CREATED_AT_UTC >= DATEADD(DAY, -p.days_back, CURRENT_DATE)
    AND (p.types IS NULL OR EXISTS (SELECT 1 FROM flt_type ft WHERE ft.type_key='Purchase Order'))
  QUALIFY ROW_NUMBER() OVER (PARTITION BY ol.ORDER_HEADER_ID ORDER BY ol.ORDER_CREATED_AT_UTC DESC, ol.LINE_ID DESC)=1
),
req_latest AS (
  SELECT
      rl.REQUISITION_HEADER_ID                         AS coupa_id,
      CAST(rl.REQUISITION_HEADER_ID AS STRING)         AS number,
      'Requisition'                                    AS type,
      cs.NAME                                          AS supplier,
      rl.DEPARTMENT_NAME                               AS department_name,
      rl.TOTAL_AMOUNT                                  AS amount,
      rl.HEADER_STATUS                                 AS status,
      rl.REQUISITION_CREATED_AT_UTC                    AS date,
      NULL::TIMESTAMP                                  AS due_date,
      COALESCE(rl.HEADER_JUSTIFICATION, rl.LINE_DESCRIPTION) AS header_memo,
      rl.REQUISITION_HEADER_ID                         AS req_id,
      rl.REQUESTED_BY_ID                               AS created_by_id
  FROM mrt_coupa_p2p_requisition_line rl
  LEFT JOIN dim_coupa_supplier cs ON cs.supplier_id = rl.supplier_id, norm p
  WHERE rl.REQUISITION_CREATED_AT_UTC >= DATEADD(DAY, -p.days_back, CURRENT_DATE)
    AND (p.types IS NULL OR EXISTS (SELECT 1 FROM flt_type ft WHERE ft.type_key='Requisition'))
  QUALIFY ROW_NUMBER() OVER (PARTITION BY rl.REQUISITION_HEADER_ID ORDER BY rl.REQUISITION_CREATED_AT_UTC DESC, rl.REQUISITION_HEADER_ID DESC)=1
),
inv_latest AS (
  SELECT
      il.INVOICE_HEADER_ID                                AS coupa_id,
      il.INVOICE_NUMBER                                   AS number,
      'Invoice'                                           AS type,
      MAX(il.SUPPLIER_NAME)  OVER (PARTITION BY il.INVOICE_HEADER_ID)            AS supplier,
      NULL::STRING                                        AS department_name,
      COALESCE(MAX(il.INVOICE_AMOUNT) OVER (PARTITION BY il.INVOICE_HEADER_ID),
               SUM(il.LINE_AMOUNT)   OVER (PARTITION BY il.INVOICE_HEADER_ID))    AS amount,
      MAX(il.STATUS)            OVER (PARTITION BY il.INVOICE_HEADER_ID)          AS status,
      MIN(il.LINE_CREATED_AT_UTC) OVER (PARTITION BY il.INVOICE_HEADER_ID)        AS date,
      NULL::TIMESTAMP                                     AS due_date,
      MAX(il.LINE_DESCRIPTION) OVER (PARTITION BY il.INVOICE_HEADER_ID)           AS header_memo,
      NULL::NUMBER                                        AS req_id,
      MAX(il.HEADER_CREATED_BY_ID)   OVER (PARTITION BY il.INVOICE_HEADER_ID)     AS created_by_id,
      MAX(il.HEADER_CREATED_BY_NAME) OVER (PARTITION BY il.INVOICE_HEADER_ID)     AS created_by_name
  FROM mrt_coupa_p2p_invoice_line il, norm p
  WHERE il.LINE_CREATED_AT_UTC >= DATEADD(DAY, -p.days_back, CURRENT_DATE)
    AND (p.types IS NULL OR EXISTS (SELECT 1 FROM flt_type ft WHERE ft.type_key='Invoice'))
  QUALIFY ROW_NUMBER() OVER (PARTITION BY il.INVOICE_HEADER_ID ORDER BY il.LINE_CREATED_AT_UTC DESC, il.LINE_ID DESC)=1
),

/* ---------- Visibility: CREATED & PENDING, with filters ---------- */
po_created AS (
  SELECT
      pl.coupa_id, pl.number, pl.type, pl.supplier, pl.department_name, pl.amount,
      pl.status, pl.date, pl.due_date, pl.header_memo,
      COALESCE(acu.FULL_NAME, ap.full_name) AS for_employee
  FROM po_latest pl
  LEFT JOIN allowed_coupa_users acu ON pl.created_by_id = acu.USER_ID
  LEFT JOIN allowed_people ap ON UPPER(TRIM(pl.created_by_name)) = UPPER(TRIM(ap.full_name))
  , norm p
  WHERE (acu.USER_ID IS NOT NULL OR ap.full_name IS NOT NULL)
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = pl.created_by_id
                                    OR su.name_norm = UPPER(TRIM(pl.created_by_name))))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(pl.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(pl.status)) = st.val))
    AND (p.cost_centers IS NULL OR EXISTS (SELECT 1 FROM flt_cost_ctrs cc WHERE UPPER(TRIM(pl.department_name)) = cc.val))
    AND (p.min_amount IS NULL OR pl.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR pl.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE pl.number ILIKE '%%' || n.part || '%%'))
),
req_created AS (
  SELECT
      rl.coupa_id, rl.number, rl.type, rl.supplier, rl.department_name, rl.amount,
      rl.status, rl.date, rl.due_date, rl.header_memo,
      acu.FULL_NAME AS for_employee
  FROM req_latest rl
  JOIN allowed_coupa_users acu ON rl.created_by_id = acu.USER_ID
  , norm p
  WHERE 1=1
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = rl.created_by_id))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(rl.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(rl.status)) = st.val))
    AND (p.cost_centers IS NULL OR EXISTS (SELECT 1 FROM flt_cost_ctrs cc WHERE UPPER(TRIM(rl.department_name)) = cc.val))
    AND (p.min_amount IS NULL OR rl.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR rl.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE rl.number ILIKE '%%' || n.part || '%%'))
),
inv_created AS (
  SELECT
      il.coupa_id, il.number, il.type, il.supplier, il.department_name, il.amount,
      il.status, il.date, il.due_date, il.header_memo,
      COALESCE(acu.FULL_NAME, ap.full_name) AS for_employee
  FROM inv_latest il
  LEFT JOIN allowed_coupa_users acu ON il.created_by_id = acu.USER_ID
  LEFT JOIN allowed_people ap ON UPPER(TRIM(il.created_by_name)) = UPPER(TRIM(ap.full_name))
  , norm p
  WHERE (acu.USER_ID IS NOT NULL OR ap.full_name IS NOT NULL)
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = il.created_by_id
                                    OR su.name_norm = UPPER(TRIM(il.created_by_name))))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(il.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(il.status)) = st.val))
    AND (p.min_amount IS NULL OR il.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR il.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE il.number ILIKE '%%' || n.part || '%%'))
),
po_pending AS (
  SELECT
      pl.coupa_id, pl.number, pl.type, pl.supplier, pl.department_name, pl.amount,
      pl.status, pl.date, pl.due_date, pl.header_memo,
      acu2.FULL_NAME AS for_employee
  FROM po_latest pl
  JOIN req_pending_for rp ON rp.REQUISITION_HEADER_ID = pl.req_id
  JOIN allowed_coupa_users acu2 ON acu2.USER_ID = rp.for_user_id
  , norm p
  WHERE 1=1
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = acu2.USER_ID
                                    OR su.name_norm = UPPER(TRIM(acu2.FULL_NAME))))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(pl.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(pl.status)) = st.val))
    AND (p.cost_centers IS NULL OR EXISTS (SELECT 1 FROM flt_cost_ctrs cc WHERE UPPER(TRIM(pl.department_name)) = cc.val))
    AND (p.min_amount IS NULL OR pl.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR pl.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE pl.number ILIKE '%%' || n.part || '%%'))
),
req_pending AS (
  SELECT
      rl.coupa_id, rl.number, rl.type, rl.supplier, rl.department_name, rl.amount,
      rl.status, rl.date, rl.due_date, rl.header_memo,
      acu2.FULL_NAME AS for_employee
  FROM req_latest rl
  JOIN req_pending_for rp ON rp.REQUISITION_HEADER_ID = rl.req_id
  JOIN allowed_coupa_users acu2 ON acu2.USER_ID = rp.for_user_id
  , norm p
  WHERE 1=1
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = acu2.USER_ID
                                    OR su.name_norm = UPPER(TRIM(acu2.FULL_NAME))))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(rl.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(rl.status)) = st.val))
    AND (p.cost_centers IS NULL OR EXISTS (SELECT 1 FROM flt_cost_ctrs cc WHERE UPPER(TRIM(rl.department_name)) = cc.val))
    AND (p.min_amount IS NULL OR rl.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR rl.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE rl.number ILIKE '%%' || n.part || '%%'))
),
inv_pending AS (
  SELECT
      il.coupa_id, il.number, il.type, il.supplier, il.department_name, il.amount,
      il.status, il.date, il.due_date, il.header_memo,
      acu2.FULL_NAME AS for_employee
  FROM inv_latest il
  JOIN inv_pending_for ip ON ip.INVOICE_HEADER_ID = il.coupa_id
  JOIN allowed_coupa_users acu2 ON acu2.USER_ID = ip.for_user_id
  , norm p
  WHERE 1=1
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = acu2.USER_ID
                                    OR su.name_norm = UPPER(TRIM(acu2.FULL_NAME))))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(il.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(il.status)) = st.val))
    AND (p.min_amount IS NULL OR il.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR il.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE il.number ILIKE '%%' || n.part || '%%'))
),

/* ---------- Final "visible" (dedupe per header+person) ---------- */
results AS (
  SELECT
    coupa_id           AS "Coupa ID",
    number             AS "Number",
    type               AS "Type",
    supplier           AS "Supplier",
    department_name    AS "DEPARTMENT_NAME",
    amount             AS "Amount",
    status             AS "Status",
    date               AS "Date",
    due_date           AS "Due Date",
    header_memo        AS "HEADER_MEMO",
    for_employee       AS "For_Employee"
  FROM (
    SELECT * FROM req_created
    UNION ALL SELECT * FROM req_pending
    UNION ALL SELECT * FROM po_created
    UNION ALL SELECT * FROM po_pending
    UNION ALL SELECT * FROM inv_created
    UNION ALL SELECT * FROM inv_pending
  )
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY "Type","Coupa ID","For_Employee"
    ORDER BY "Date" DESC
  ) = 1
),

/* ---------- Header-level de-dupe (one row per document for counting) ---------- */
hdrs AS (
  SELECT *
  FROM (
    SELECT r.*,
           ROW_NUMBER() OVER (PARTITION BY "Type","Coupa ID" ORDER BY "Date" DESC) AS rn
    FROM results r
  )
  WHERE rn = 1
)

/* ===================== 3) COST CENTER DISTRIBUTION (txn count) — ADMIN ONLY ===================== */
SELECT
  "DEPARTMENT_NAME" AS cost_center,
  COUNT(*)          AS txn_count
FROM hdrs
CROSS JOIN norm p
WHERE p.viewer_role = 0
  AND "DEPARTMENT_NAME" IS NOT NULL
  AND TRIM("DEPARTMENT_NAME") <> ''
GROUP BY 1
ORDER BY txn_count DESC, cost_center;
'''

COUPA_DASHBOARD_DEPARTMENT = '''
/* ===================== COUPA — METRICS (RBAC + FILTERS) =====================

Outputs:
  1) Status distribution
  2) Transactions by month
  3) Cost center distribution (txn count)  <-- ADMIN-ONLY
  4) Spend by department (admins only)

NOTE: Dedupe at header level (one row per Type + Coupa ID) before aggregations.
*/

WITH
/* ---------- Parameters (bind from app) ---------- */
params AS (
  SELECT
      %s::INT                               AS days_back,
      %s::STRING  AS viewer_email,     -- << set the viewer
      %s::INT                                 AS viewer_role,      -- 0=admin, 1/2/3=normal

      /* NULL or [] => no filter */
      PARSE_JSON('[]')::VARIANT              AS users,
      PARSE_JSON('[]')::VARIANT              AS suppliers,
      PARSE_JSON('[]')::VARIANT              AS statuses,
      PARSE_JSON('[]')::VARIANT              AS cost_centers,
      PARSE_JSON('[]')::VARIANT              AS search_numbers,
      NULL::NUMBER                           AS min_amount,
      NULL::NUMBER                           AS max_amount,
      PARSE_JSON('[]')::VARIANT              AS types            -- e.g. ["Purchase Orders","Invoices","Requisitions"]
),
/* Normalize empties -> NULL */
norm AS (
  SELECT
    days_back, viewer_email, viewer_role,
    IFF(users          IS NULL OR ARRAY_SIZE(users)         = 0, NULL, users)          AS users,
    IFF(suppliers      IS NULL OR ARRAY_SIZE(suppliers)     = 0, NULL, suppliers)      AS suppliers,
    IFF(statuses       IS NULL OR ARRAY_SIZE(statuses)      = 0, NULL, statuses)       AS statuses,
    IFF(cost_centers   IS NULL OR ARRAY_SIZE(cost_centers)  = 0, NULL, cost_centers)   AS cost_centers,
    IFF(search_numbers IS NULL OR ARRAY_SIZE(search_numbers)= 0, NULL, search_numbers) AS search_numbers,
    min_amount, max_amount,
    IFF(types         IS NULL OR ARRAY_SIZE(types)          = 0, NULL, types)          AS types
  FROM params
),

/* Manager? */
mgr AS (
  SELECT IFF(COUNT_IF(h.HIERARCHY_LEVEL >= 1) > 0, 1, 0) AS has_reports
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p
  WHERE LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
),

/* RBAC: people the viewer may see */
allowed_people AS (
  /* Admin: everyone active */
  SELECT d.EMAIL AS email, d.FULL_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE d, norm p
  WHERE p.viewer_role = 0 AND COALESCE(d.IS_ACTIVE, TRUE)

  UNION
  /* Manager: self + all reportees */
  SELECT DISTINCT h.REPORTEE_EMAIL AS email, h.REPORTEE_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 1
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL >= 0

  UNION
  /* IC: self only */
  SELECT DISTINCT h.REPORTEE_EMAIL AS email, h.REPORTEE_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 0
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL = 0
),

/* Email -> Coupa user IDs */
allowed_coupa_users AS (
  SELECT u.USER_ID, u.FULL_NAME, LOWER(u.EMAIL) AS email
  FROM dim_coupa_user u
  JOIN allowed_people a ON LOWER(a.email) = LOWER(u.EMAIL)
),

/* Groups for pending-approver GROUP cases */
member_groups AS (
  SELECT DISTINCT g.GROUP_ID, g.USER_ID
  FROM dim_coupa_approval_groups g
  JOIN allowed_coupa_users acu ON acu.USER_ID = g.USER_ID
),

/* Pending sets */
req_pending_for AS (
  SELECT DISTINCT rpa.REQUISITION_HEADER_ID, COALESCE(acu.USER_ID, mg.USER_ID) AS for_user_id
  FROM mrt_coupa_requisition_pending_approvers rpa
  LEFT JOIN allowed_coupa_users acu ON rpa.APPROVER_TYPE='USER' AND rpa.USER_OR_GROUP_ID=acu.USER_ID
  LEFT JOIN member_groups mg       ON rpa.APPROVER_TYPE='APPROVAL_GROUP' AND rpa.USER_OR_GROUP_ID=mg.GROUP_ID
  WHERE acu.USER_ID IS NOT NULL OR mg.USER_ID IS NOT NULL
),
inv_pending_for AS (
  SELECT DISTINCT ipa.INVOICE_HEADER_ID, COALESCE(acu.USER_ID, mg.USER_ID) AS for_user_id
  FROM mrt_coupa_invoice_pending_approvers ipa
  LEFT JOIN allowed_coupa_users acu ON ipa.APPROVER_TYPE='USER' AND ipa.USER_OR_GROUP_ID=acu.USER_ID
  LEFT JOIN member_groups mg       ON ipa.APPROVER_TYPE='APPROVAL_GROUP' AND ipa.USER_OR_GROUP_ID=mg.GROUP_ID
  WHERE acu.USER_ID IS NOT NULL OR mg.USER_ID IS NOT NULL
),

/* Flattened filters */
flt_suppliers AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.suppliers) f),
flt_statuses  AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.statuses)  f),
flt_cost_ctrs AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.cost_centers) f),
flt_numbers   AS (SELECT DISTINCT TRIM(f.value::string) AS part  FROM norm p, LATERAL FLATTEN(input => p.search_numbers) f),

/* Users filter candidates (emails or names) */
raw_user_vals AS (SELECT DISTINCT u.value::string AS raw_val FROM norm p, LATERAL FLATTEN(input => p.users) u),
sel_users AS (
  /* email */
  SELECT DISTINCT cu.USER_ID, UPPER(TRIM(cu.FULL_NAME)) AS name_norm
  FROM raw_user_vals r JOIN dim_coupa_user cu ON LOWER(cu.EMAIL) = LOWER(r.raw_val)
  UNION
  /* exact full-name */
  SELECT DISTINCT cu.USER_ID, UPPER(TRIM(cu.FULL_NAME)) AS name_norm
  FROM raw_user_vals r JOIN dim_coupa_user cu ON UPPER(TRIM(cu.FULL_NAME)) = UPPER(TRIM(r.raw_val))
),

/* Type filter → canonical names */
raw_type_vals AS (SELECT DISTINCT t.value::string AS raw_val FROM norm p, LATERAL FLATTEN(input => p.types) t),
flt_type AS (
  SELECT type_key FROM (
    SELECT DISTINCT
      CASE
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('PURCHASE ORDER','PURCHASE ORDERS','PO','POS','PURCHASEORDER','PURCHASEORDERS') THEN 'Purchase Order'
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('INVOICE','INVOICES','INV')                                              THEN 'Invoice'
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('REQUISITION','REQUISITIONS','REQ','REQS')                               THEN 'Requisition'
      END AS type_key
    FROM raw_type_vals
  ) s WHERE type_key IS NOT NULL
),

/* ---------- Latest per header ---------- */
po_latest AS (
  SELECT
      ol.ORDER_HEADER_ID                               AS coupa_id,
      CAST(ol.ORDER_HEADER_ID AS STRING)               AS number,
      'Purchase Order'                                 AS type,
      ol.SUPPLIER_NAME                                 AS supplier,
      ol.LINE_DEPARTMENT_NAME                          AS department_name,
      ol.LINE_INVOICED_AMOUNT                          AS amount,
      ol.ORDER_HEADER_STATUS                           AS status,
      ol.ORDER_CREATED_AT_UTC                          AS date,
      NULL::TIMESTAMP                                  AS due_date,
      ol.LINE_DESCRIPTION                              AS header_memo,
      ol.REQUISITION_HEADER_ID                         AS req_id,
      ol.HEADER_CREATED_BY_ID                          AS created_by_id,
      ol.HEADER_CREATED_BY_NAME                        AS created_by_name
  FROM mrt_coupa_p2p_order_line ol, norm p
  WHERE ol.ORDER_CREATED_AT_UTC >= DATEADD(DAY, -p.days_back, CURRENT_DATE)
    AND (p.types IS NULL OR EXISTS (SELECT 1 FROM flt_type ft WHERE ft.type_key='Purchase Order'))
  QUALIFY ROW_NUMBER() OVER (PARTITION BY ol.ORDER_HEADER_ID ORDER BY ol.ORDER_CREATED_AT_UTC DESC, ol.LINE_ID DESC)=1
),
req_latest AS (
  SELECT
      rl.REQUISITION_HEADER_ID                         AS coupa_id,
      CAST(rl.REQUISITION_HEADER_ID AS STRING)         AS number,
      'Requisition'                                    AS type,
      cs.NAME                                          AS supplier,
      rl.DEPARTMENT_NAME                               AS department_name,
      rl.TOTAL_AMOUNT                                  AS amount,
      rl.HEADER_STATUS                                 AS status,
      rl.REQUISITION_CREATED_AT_UTC                    AS date,
      NULL::TIMESTAMP                                  AS due_date,
      COALESCE(rl.HEADER_JUSTIFICATION, rl.LINE_DESCRIPTION) AS header_memo,
      rl.REQUISITION_HEADER_ID                         AS req_id,
      rl.REQUESTED_BY_ID                               AS created_by_id
  FROM mrt_coupa_p2p_requisition_line rl
  LEFT JOIN dim_coupa_supplier cs ON cs.supplier_id = rl.supplier_id, norm p
  WHERE rl.REQUISITION_CREATED_AT_UTC >= DATEADD(DAY, -p.days_back, CURRENT_DATE)
    AND (p.types IS NULL OR EXISTS (SELECT 1 FROM flt_type ft WHERE ft.type_key='Requisition'))
  QUALIFY ROW_NUMBER() OVER (PARTITION BY rl.REQUISITION_HEADER_ID ORDER BY rl.REQUISITION_CREATED_AT_UTC DESC, rl.REQUISITION_HEADER_ID DESC)=1
),
inv_latest AS (
  SELECT
      il.INVOICE_HEADER_ID                                AS coupa_id,
      il.INVOICE_NUMBER                                   AS number,
      'Invoice'                                           AS type,
      MAX(il.SUPPLIER_NAME)  OVER (PARTITION BY il.INVOICE_HEADER_ID)            AS supplier,
      NULL::STRING                                        AS department_name,
      COALESCE(MAX(il.INVOICE_AMOUNT) OVER (PARTITION BY il.INVOICE_HEADER_ID),
               SUM(il.LINE_AMOUNT)   OVER (PARTITION BY il.INVOICE_HEADER_ID))    AS amount,
      MAX(il.STATUS)            OVER (PARTITION BY il.INVOICE_HEADER_ID)          AS status,
      MIN(il.LINE_CREATED_AT_UTC) OVER (PARTITION BY il.INVOICE_HEADER_ID)        AS date,
      NULL::TIMESTAMP                                     AS due_date,
      MAX(il.LINE_DESCRIPTION) OVER (PARTITION BY il.INVOICE_HEADER_ID)           AS header_memo,
      NULL::NUMBER                                        AS req_id,
      MAX(il.HEADER_CREATED_BY_ID)   OVER (PARTITION BY il.INVOICE_HEADER_ID)     AS created_by_id,
      MAX(il.HEADER_CREATED_BY_NAME) OVER (PARTITION BY il.INVOICE_HEADER_ID)     AS created_by_name
  FROM mrt_coupa_p2p_invoice_line il, norm p
  WHERE il.LINE_CREATED_AT_UTC >= DATEADD(DAY, -p.days_back, CURRENT_DATE)
    AND (p.types IS NULL OR EXISTS (SELECT 1 FROM flt_type ft WHERE ft.type_key='Invoice'))
  QUALIFY ROW_NUMBER() OVER (PARTITION BY il.INVOICE_HEADER_ID ORDER BY il.LINE_CREATED_AT_UTC DESC, il.LINE_ID DESC)=1
),

/* ---------- Visibility: CREATED & PENDING, with filters ---------- */
po_created AS (
  SELECT
      pl.coupa_id, pl.number, pl.type, pl.supplier, pl.department_name, pl.amount,
      pl.status, pl.date, pl.due_date, pl.header_memo,
      COALESCE(acu.FULL_NAME, ap.full_name) AS for_employee
  FROM po_latest pl
  LEFT JOIN allowed_coupa_users acu ON pl.created_by_id = acu.USER_ID
  LEFT JOIN allowed_people ap ON UPPER(TRIM(pl.created_by_name)) = UPPER(TRIM(ap.full_name))
  , norm p
  WHERE (acu.USER_ID IS NOT NULL OR ap.full_name IS NOT NULL)
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = pl.created_by_id
                                    OR su.name_norm = UPPER(TRIM(pl.created_by_name))))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(pl.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(pl.status)) = st.val))
    AND (p.cost_centers IS NULL OR EXISTS (SELECT 1 FROM flt_cost_ctrs cc WHERE UPPER(TRIM(pl.department_name)) = cc.val))
    AND (p.min_amount IS NULL OR pl.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR pl.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE pl.number ILIKE '%%' || n.part || '%%'))
),
req_created AS (
  SELECT
      rl.coupa_id, rl.number, rl.type, rl.supplier, rl.department_name, rl.amount,
      rl.status, rl.date, rl.due_date, rl.header_memo,
      acu.FULL_NAME AS for_employee
  FROM req_latest rl
  JOIN allowed_coupa_users acu ON rl.created_by_id = acu.USER_ID
  , norm p
  WHERE 1=1
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = rl.created_by_id))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(rl.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(rl.status)) = st.val))
    AND (p.cost_centers IS NULL OR EXISTS (SELECT 1 FROM flt_cost_ctrs cc WHERE UPPER(TRIM(rl.department_name)) = cc.val))
    AND (p.min_amount IS NULL OR rl.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR rl.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE rl.number ILIKE '%%' || n.part || '%%'))
),
inv_created AS (
  SELECT
      il.coupa_id, il.number, il.type, il.supplier, il.department_name, il.amount,
      il.status, il.date, il.due_date, il.header_memo,
      COALESCE(acu.FULL_NAME, ap.full_name) AS for_employee
  FROM inv_latest il
  LEFT JOIN allowed_coupa_users acu ON il.created_by_id = acu.USER_ID
  LEFT JOIN allowed_people ap ON UPPER(TRIM(il.created_by_name)) = UPPER(TRIM(ap.full_name))
  , norm p
  WHERE (acu.USER_ID IS NOT NULL OR ap.full_name IS NOT NULL)
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = il.created_by_id
                                    OR su.name_norm = UPPER(TRIM(il.created_by_name))))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(il.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(il.status)) = st.val))
    AND (p.min_amount IS NULL OR il.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR il.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE il.number ILIKE '%%' || n.part || '%%'))
),
po_pending AS (
  SELECT
      pl.coupa_id, pl.number, pl.type, pl.supplier, pl.department_name, pl.amount,
      pl.status, pl.date, pl.due_date, pl.header_memo,
      acu2.FULL_NAME AS for_employee
  FROM po_latest pl
  JOIN req_pending_for rp ON rp.REQUISITION_HEADER_ID = pl.req_id
  JOIN allowed_coupa_users acu2 ON acu2.USER_ID = rp.for_user_id
  , norm p
  WHERE 1=1
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = acu2.USER_ID
                                    OR su.name_norm = UPPER(TRIM(acu2.FULL_NAME))))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(pl.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(pl.status)) = st.val))
    AND (p.cost_centers IS NULL OR EXISTS (SELECT 1 FROM flt_cost_ctrs cc WHERE UPPER(TRIM(pl.department_name)) = cc.val))
    AND (p.min_amount IS NULL OR pl.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR pl.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE pl.number ILIKE '%%' || n.part || '%%'))
),
req_pending AS (
  SELECT
      rl.coupa_id, rl.number, rl.type, rl.supplier, rl.department_name, rl.amount,
      rl.status, rl.date, rl.due_date, rl.header_memo,
      acu2.FULL_NAME AS for_employee
  FROM req_latest rl
  JOIN req_pending_for rp ON rp.REQUISITION_HEADER_ID = rl.req_id
  JOIN allowed_coupa_users acu2 ON acu2.USER_ID = rp.for_user_id
  , norm p
  WHERE 1=1
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = acu2.USER_ID
                                    OR su.name_norm = UPPER(TRIM(acu2.FULL_NAME))))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(rl.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(rl.status)) = st.val))
    AND (p.cost_centers IS NULL OR EXISTS (SELECT 1 FROM flt_cost_ctrs cc WHERE UPPER(TRIM(rl.department_name)) = cc.val))
    AND (p.min_amount IS NULL OR rl.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR rl.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE rl.number ILIKE '%%' || n.part || '%%'))
),
inv_pending AS (
  SELECT
      il.coupa_id, il.number, il.type, il.supplier, il.department_name, il.amount,
      il.status, il.date, il.due_date, il.header_memo,
      acu2.FULL_NAME AS for_employee
  FROM inv_latest il
  JOIN inv_pending_for ip ON ip.INVOICE_HEADER_ID = il.coupa_id
  JOIN allowed_coupa_users acu2 ON acu2.USER_ID = ip.for_user_id
  , norm p
  WHERE 1=1
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = acu2.USER_ID
                                    OR su.name_norm = UPPER(TRIM(acu2.FULL_NAME))))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(il.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(il.status)) = st.val))
    AND (p.min_amount IS NULL OR il.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR il.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE il.number ILIKE '%%' || n.part || '%%'))
),

/* ---------- Final "visible" (dedupe per header+person) ---------- */
results AS (
  SELECT
    coupa_id           AS "Coupa ID",
    number             AS "Number",
    type               AS "Type",
    supplier           AS "Supplier",
    department_name    AS "DEPARTMENT_NAME",
    amount             AS "Amount",
    status             AS "Status",
    date               AS "Date",
    due_date           AS "Due Date",
    header_memo        AS "HEADER_MEMO",
    for_employee       AS "For_Employee"
  FROM (
    SELECT * FROM req_created
    UNION ALL SELECT * FROM req_pending
    UNION ALL SELECT * FROM po_created
    UNION ALL SELECT * FROM po_pending
    UNION ALL SELECT * FROM inv_created
    UNION ALL SELECT * FROM inv_pending
  )
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY "Type","Coupa ID","For_Employee"
    ORDER BY "Date" DESC
  ) = 1
),

/* ---------- Header-level de-dupe (one row per document for counting) ---------- */
hdrs AS (
  SELECT *
  FROM (
    SELECT r.*,
           ROW_NUMBER() OVER (PARTITION BY "Type","Coupa ID" ORDER BY "Date" DESC) AS rn
    FROM results r
  )
  WHERE rn = 1
)


/* ===================== 4) SPEND BY DEPARTMENT (ADMINS ONLY) ===================== */
SELECT
  "DEPARTMENT_NAME"                  AS department,
  SUM("Amount")::NUMBER(38,2)        AS total_spend
FROM hdrs, norm p
WHERE p.viewer_role = 0
  AND "DEPARTMENT_NAME" IS NOT NULL AND TRIM("DEPARTMENT_NAME") <> ''
GROUP BY 1
ORDER BY total_spend DESC, department;
'''

COUPA_DASHBOARD_METRICS = '''
/* ===================== COUPA — METRICS (RBAC + ONLY 3 FILTERS) =====================

Outputs (single row):
  requisition_amount_sum
  invoice_amount_sum
  total_pos
  total_requisitions
*/

WITH
/* ---------- Parameters (bind from app) ---------- */
params AS (
  SELECT
      %s::INT                               AS days_back,
      %s::STRING  AS viewer_email,
      %s::INT                                 AS viewer_role,      -- 0=admin, 1/2/3=normal

      /* ONLY THREE FILTERS (NULL or [] => no filter) */
      PARSE_JSON('[]')::VARIANT              AS suppliers,        -- e.g. ["Amazon","Oracle"]
      PARSE_JSON('[]')::VARIANT              AS statuses,         -- e.g. ["Pending Approval","Approved"]
      PARSE_JSON('[]')::VARIANT              AS cost_centers      -- matched to DEPARTMENT_NAME
),

/* Normalize: treat empty arrays as NULL to disable the filter */
norm AS (
  SELECT
    days_back, viewer_email, viewer_role,
    IFF(suppliers    IS NULL OR ARRAY_SIZE(suppliers)   = 0, NULL, suppliers)    AS suppliers,
    IFF(statuses     IS NULL OR ARRAY_SIZE(statuses)    = 0, NULL, statuses)     AS statuses,
    IFF(cost_centers IS NULL OR ARRAY_SIZE(cost_centers)= 0, NULL, cost_centers) AS cost_centers
  FROM params
),

/* Is viewer a manager? (any reportees in closure) */
mgr AS (
  SELECT IFF(COUNT_IF(h.HIERARCHY_LEVEL >= 1) > 0, 1, 0) AS has_reports
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p
  WHERE LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
),

/* Who the viewer may see (Name/Email authority set) */
allowed_people AS (
  /* Admin: everyone active */
  SELECT d.EMAIL AS email, d.FULL_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE d, norm p
  WHERE p.viewer_role = 0 AND COALESCE(d.IS_ACTIVE, TRUE)

  UNION
  /* Normal user w/ reports: self + all reportees (levels >= 0) */
  SELECT DISTINCT h.REPORTEE_EMAIL AS email, h.REPORTEE_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 1
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL >= 0

  UNION
  /* Normal user w/o reports: self only (level 0) */
  SELECT DISTINCT h.REPORTEE_EMAIL AS email, h.REPORTEE_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 0
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL = 0
),

/* Email -> Coupa USER_ID mapping for allowed people (RBAC base) */
allowed_coupa_users AS (
  SELECT u.USER_ID, u.FULL_NAME, LOWER(u.EMAIL) AS email
  FROM dim_coupa_user u
  JOIN allowed_people a ON LOWER(a.email) = LOWER(u.EMAIL)
),

/* Groups the allowed users are in (for pending approver GROUP cases) */
member_groups AS (
  SELECT DISTINCT g.GROUP_ID, g.USER_ID
  FROM dim_coupa_approval_groups g
  JOIN allowed_coupa_users acu ON acu.USER_ID = g.USER_ID
),

/* Reqs pending for any allowed user (direct or via their groups) */
req_pending_for AS (
  SELECT DISTINCT
      rpa.REQUISITION_HEADER_ID,
      COALESCE(acu.USER_ID, mg.USER_ID) AS for_user_id
  FROM mrt_coupa_requisition_pending_approvers rpa
  LEFT JOIN allowed_coupa_users acu
    ON rpa.APPROVER_TYPE = 'USER' AND rpa.USER_OR_GROUP_ID = acu.USER_ID
  LEFT JOIN member_groups mg
    ON rpa.APPROVER_TYPE = 'APPROVAL_GROUP' AND rpa.USER_OR_GROUP_ID = mg.GROUP_ID
  WHERE acu.USER_ID IS NOT NULL OR mg.USER_ID IS NOT NULL
),

/* Invoices pending for any allowed user (direct or via their groups) */
inv_pending_for AS (
  SELECT DISTINCT
      ipa.INVOICE_HEADER_ID,
      COALESCE(acu.USER_ID, mg.USER_ID) AS for_user_id
  FROM mrt_coupa_invoice_pending_approvers ipa
  LEFT JOIN allowed_coupa_users acu
    ON ipa.APPROVER_TYPE = 'USER' AND ipa.USER_OR_GROUP_ID = acu.USER_ID
  LEFT JOIN member_groups mg
    ON ipa.APPROVER_TYPE = 'APPROVAL_GROUP' AND ipa.USER_OR_GROUP_ID = mg.GROUP_ID
  WHERE acu.USER_ID IS NOT NULL OR mg.USER_ID IS NOT NULL
),

/* ---------- Flattened filters (normalized) ---------- */
flt_suppliers AS (
  SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val
  FROM norm p, LATERAL FLATTEN(input => p.suppliers) f
),
flt_statuses AS (
  SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val
  FROM norm p, LATERAL FLATTEN(input => p.statuses) f
),
flt_cost_centers AS (
  SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val
  FROM norm p, LATERAL FLATTEN(input => p.cost_centers) f
),

/* ---------- Latest per header (date window only) ---------- */
po_latest AS (
  SELECT
      ol.ORDER_HEADER_ID                               AS coupa_id,
      CAST(ol.ORDER_HEADER_ID AS STRING)               AS number,
      'Purchase Order'                                 AS type,
      ol.SUPPLIER_NAME                                 AS supplier,
      ol.LINE_DEPARTMENT_NAME                          AS department_name,
      ol.LINE_INVOICED_AMOUNT                          AS amount,
      ol.ORDER_HEADER_STATUS                           AS status,
      ol.ORDER_CREATED_AT_UTC                          AS date,
      NULL::TIMESTAMP                                  AS due_date,
      ol.LINE_DESCRIPTION                              AS header_memo,
      ol.REQUISITION_HEADER_ID                         AS req_id,
      ol.HEADER_CREATED_BY_ID                          AS created_by_id,
      ol.HEADER_CREATED_BY_NAME                        AS created_by_name
  FROM mrt_coupa_p2p_order_line ol, norm p
  WHERE ol.ORDER_CREATED_AT_UTC >= DATEADD(DAY, -p.days_back, CURRENT_DATE)
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY ol.ORDER_HEADER_ID
    ORDER BY ol.ORDER_CREATED_AT_UTC DESC, ol.LINE_ID DESC
  ) = 1
),
req_latest AS (
  SELECT
      rl.REQUISITION_HEADER_ID                         AS coupa_id,
      CAST(rl.REQUISITION_HEADER_ID AS STRING)         AS number,
      'Requisition'                                    AS type,
      cs.NAME                                          AS supplier,
      rl.DEPARTMENT_NAME                               AS department_name,
      rl.TOTAL_AMOUNT                                  AS amount,
      rl.HEADER_STATUS                                 AS status,
      rl.REQUISITION_CREATED_AT_UTC                    AS date,
      NULL::TIMESTAMP                                  AS due_date,
      COALESCE(rl.HEADER_JUSTIFICATION, rl.LINE_DESCRIPTION) AS header_memo,
      rl.REQUISITION_HEADER_ID                         AS req_id,
      rl.REQUESTED_BY_ID                               AS created_by_id
  FROM mrt_coupa_p2p_requisition_line rl
  LEFT JOIN dim_coupa_supplier cs ON cs.supplier_id = rl.supplier_id, norm p
  WHERE rl.REQUISITION_CREATED_AT_UTC >= DATEADD(DAY, -p.days_back, CURRENT_DATE)
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY rl.REQUISITION_HEADER_ID
    ORDER BY rl.REQUISITION_CREATED_AT_UTC DESC, rl.REQUISITION_HEADER_ID DESC
  ) = 1
),
inv_latest AS (
  SELECT
      il.INVOICE_HEADER_ID                                AS coupa_id,
      il.INVOICE_NUMBER                                   AS number,
      'Invoice'                                           AS type,
      MAX(il.SUPPLIER_NAME)  OVER (PARTITION BY il.INVOICE_HEADER_ID)            AS supplier,
      NULL::STRING                                        AS department_name,
      COALESCE(MAX(il.INVOICE_AMOUNT) OVER (PARTITION BY il.INVOICE_HEADER_ID),
               SUM(il.LINE_AMOUNT)   OVER (PARTITION BY il.INVOICE_HEADER_ID))    AS amount,
      MAX(il.STATUS)            OVER (PARTITION BY il.INVOICE_HEADER_ID)          AS status,
      MIN(il.LINE_CREATED_AT_UTC) OVER (PARTITION BY il.INVOICE_HEADER_ID)        AS date,
      NULL::TIMESTAMP                                     AS due_date,
      MAX(il.LINE_DESCRIPTION) OVER (PARTITION BY il.INVOICE_HEADER_ID)           AS header_memo,
      NULL::NUMBER                                        AS req_id,
      MAX(il.HEADER_CREATED_BY_ID)   OVER (PARTITION BY il.INVOICE_HEADER_ID)     AS created_by_id,
      MAX(il.HEADER_CREATED_BY_NAME) OVER (PARTITION BY il.INVOICE_HEADER_ID)     AS created_by_name
  FROM mrt_coupa_p2p_invoice_line il, norm p
  WHERE il.LINE_CREATED_AT_UTC >= DATEADD(DAY, -p.days_back, CURRENT_DATE)
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY il.INVOICE_HEADER_ID
    ORDER BY il.LINE_CREATED_AT_UTC DESC, il.LINE_ID DESC
  ) = 1
),

/* ---------- Visibility: CREATED (ID or Name) + ONLY 3 FILTERS ---------- */
po_created AS (
  SELECT
      pl.coupa_id, pl.number, pl.type, pl.supplier, pl.department_name, pl.amount,
      pl.status, pl.date, pl.due_date, pl.header_memo,
      COALESCE(acu.FULL_NAME, ap.full_name) AS for_employee
  FROM po_latest pl
  LEFT JOIN allowed_coupa_users acu ON pl.created_by_id = acu.USER_ID
  LEFT JOIN allowed_people ap ON UPPER(TRIM(pl.created_by_name)) = UPPER(TRIM(ap.full_name))
  , norm p
  WHERE (acu.USER_ID IS NOT NULL OR ap.full_name IS NOT NULL)
    AND (p.suppliers    IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers    s  WHERE UPPER(TRIM(pl.supplier))         = s.val))
    AND (p.statuses     IS NULL OR EXISTS (SELECT 1 FROM flt_statuses     st WHERE UPPER(TRIM(pl.status))           = st.val))
    AND (p.cost_centers IS NULL OR EXISTS (SELECT 1 FROM flt_cost_centers cc WHERE UPPER(TRIM(pl.department_name))  = cc.val))
),
req_created AS (
  SELECT
      rl.coupa_id, rl.number, rl.type, rl.supplier, rl.department_name, rl.amount,
      rl.status, rl.date, rl.due_date, rl.header_memo,
      acu.FULL_NAME AS for_employee
  FROM req_latest rl
  JOIN allowed_coupa_users acu ON rl.created_by_id = acu.USER_ID
  , norm p
  WHERE 1=1
    AND (p.suppliers    IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers    s  WHERE UPPER(TRIM(rl.supplier))         = s.val))
    AND (p.statuses     IS NULL OR EXISTS (SELECT 1 FROM flt_statuses     st WHERE UPPER(TRIM(rl.status))           = st.val))
    AND (p.cost_centers IS NULL OR EXISTS (SELECT 1 FROM flt_cost_centers cc WHERE UPPER(TRIM(rl.department_name))  = cc.val))
),
inv_created AS (
  SELECT
      il.coupa_id, il.number, il.type, il.supplier, il.department_name, il.amount,
      il.status, il.date, il.due_date, il.header_memo,
      COALESCE(acu.FULL_NAME, ap.full_name) AS for_employee
  FROM inv_latest il
  LEFT JOIN allowed_coupa_users acu ON il.created_by_id = acu.USER_ID
  LEFT JOIN allowed_people ap ON UPPER(TRIM(il.created_by_name)) = UPPER(TRIM(ap.full_name))
  , norm p
  WHERE (acu.USER_ID IS NOT NULL OR ap.full_name IS NOT NULL)
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(il.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses  st WHERE UPPER(TRIM(il.status))   = st.val))
),

/* ---------- Visibility: PENDING approver (USER / GROUP) + ONLY 3 FILTERS ---------- */
po_pending AS (
  SELECT
      pl.coupa_id, pl.number, pl.type, pl.supplier, pl.department_name, pl.amount,
      pl.status, pl.date, pl.due_date, pl.header_memo,
      acu2.FULL_NAME AS for_employee
  FROM po_latest pl
  JOIN req_pending_for rp ON rp.REQUISITION_HEADER_ID = pl.req_id
  JOIN allowed_coupa_users acu2 ON acu2.USER_ID = rp.for_user_id
  , norm p
  WHERE 1=1
    AND (p.suppliers    IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers    s  WHERE UPPER(TRIM(pl.supplier))         = s.val))
    AND (p.statuses     IS NULL OR EXISTS (SELECT 1 FROM flt_statuses     st WHERE UPPER(TRIM(pl.status))           = st.val))
    AND (p.cost_centers IS NULL OR EXISTS (SELECT 1 FROM flt_cost_centers cc WHERE UPPER(TRIM(pl.department_name))  = cc.val))
),
req_pending AS (
  SELECT
      rl.coupa_id, rl.number, rl.type, rl.supplier, rl.department_name, rl.amount,
      rl.status, rl.date, rl.due_date, rl.header_memo,
      acu2.FULL_NAME AS for_employee
  FROM req_latest rl
  JOIN req_pending_for rp ON rp.REQUISITION_HEADER_ID = rl.req_id
  JOIN allowed_coupa_users acu2 ON acu2.USER_ID = rp.for_user_id
  , norm p
  WHERE 1=1
    AND (p.suppliers    IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers    s  WHERE UPPER(TRIM(rl.supplier))         = s.val))
    AND (p.statuses     IS NULL OR EXISTS (SELECT 1 FROM flt_statuses     st WHERE UPPER(TRIM(rl.status))           = st.val))
    AND (p.cost_centers IS NULL OR EXISTS (SELECT 1 FROM flt_cost_centers cc WHERE UPPER(TRIM(rl.department_name))  = cc.val))
),
inv_pending AS (
  SELECT
      il.coupa_id, il.number, il.type, il.supplier, il.department_name, il.amount,
      il.status, il.date, il.due_date, il.header_memo,
      acu2.FULL_NAME AS for_employee
  FROM inv_latest il
  JOIN inv_pending_for ip ON ip.INVOICE_HEADER_ID = il.coupa_id
  JOIN allowed_coupa_users acu2 ON acu2.USER_ID = ip.for_user_id
  , norm p
  WHERE 1=1
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(il.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses  st WHERE UPPER(TRIM(il.status))   = st.val))
),

/* ---------- Final “visible” (dedupe per header & person) ---------- */
results AS (
  SELECT
    coupa_id           AS "Coupa ID",
    number             AS "Number",
    type               AS "Type",
    supplier           AS "Supplier",
    department_name    AS "DEPARTMENT_NAME",
    amount             AS "Amount",
    status             AS "Status",
    date               AS "Date",
    due_date           AS "Due Date",
    header_memo        AS "HEADER_MEMO",
    for_employee       AS "For_Employee"
  FROM (
    SELECT * FROM req_created
    UNION ALL SELECT * FROM req_pending
    UNION ALL SELECT * FROM po_created
    UNION ALL SELECT * FROM po_pending
    UNION ALL SELECT * FROM inv_created
    UNION ALL SELECT * FROM inv_pending
  )
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY "Type","Coupa ID","For_Employee"
    ORDER BY "Date" DESC
  ) = 1
),

/* ---------- Header-level de-dupe (one row per document for counting) ---------- */
hdrs AS (
  SELECT *
  FROM (
    SELECT r.*,
           ROW_NUMBER() OVER (PARTITION BY "Type","Coupa ID" ORDER BY "Date" DESC) AS rn
    FROM results r
  )
  WHERE rn = 1
)

/* ===================== METRICS ===================== */
SELECT
  /* sums */
  COALESCE(
    SUM(CASE WHEN "Type" = 'Requisition' THEN COALESCE("Amount",0) ELSE 0 END)
  ,0)::NUMBER(38,2) AS requisition_amount_sum,

  COALESCE(
    SUM(CASE WHEN "Type" = 'Invoice' THEN COALESCE("Amount",0) ELSE 0 END)
  ,0)::NUMBER(38,2) AS invoice_amount_sum,

  /* counts */
  COUNT_IF("Type" = 'Purchase Order') AS total_pos,
  COUNT_IF("Type" = 'Requisition')    AS total_requisitions
FROM hdrs;
'''

COUPA_DASHBOARD_DISTRIBUTION_STATUS = '''
WITH
/* ---------- Parameters (bind from app) ---------- */
params AS (
  SELECT
      %s::INT                               AS days_back,
      %s::STRING  AS viewer_email,     -- << set the viewer
      %s::INT                                 AS viewer_role,      -- 0=admin, 1/2/3=normal

      /* NULL or [] => no filter */
      PARSE_JSON('[]')::VARIANT              AS users,
      PARSE_JSON('[]')::VARIANT              AS suppliers,
      PARSE_JSON('[]')::VARIANT              AS statuses,
      PARSE_JSON('[]')::VARIANT              AS cost_centers,
      PARSE_JSON('[]')::VARIANT              AS search_numbers,
      NULL::NUMBER                           AS min_amount,
      NULL::NUMBER                           AS max_amount,
      PARSE_JSON('[]')::VARIANT              AS types            -- e.g. ["Purchase Orders","Invoices","Requisitions"]
),
/* Normalize empties -> NULL */
norm AS (
  SELECT
    days_back, viewer_email, viewer_role,
    IFF(users          IS NULL OR ARRAY_SIZE(users)         = 0, NULL, users)          AS users,
    IFF(suppliers      IS NULL OR ARRAY_SIZE(suppliers)     = 0, NULL, suppliers)      AS suppliers,
    IFF(statuses       IS NULL OR ARRAY_SIZE(statuses)      = 0, NULL, statuses)       AS statuses,
    IFF(cost_centers   IS NULL OR ARRAY_SIZE(cost_centers)  = 0, NULL, cost_centers)   AS cost_centers,
    IFF(search_numbers IS NULL OR ARRAY_SIZE(search_numbers)= 0, NULL, search_numbers) AS search_numbers,
    min_amount, max_amount,
    IFF(types         IS NULL OR ARRAY_SIZE(types)          = 0, NULL, types)          AS types
  FROM params
),

/* Manager? */
mgr AS (
  SELECT IFF(COUNT_IF(h.HIERARCHY_LEVEL >= 1) > 0, 1, 0) AS has_reports
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p
  WHERE LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
),

/* RBAC: people the viewer may see */
allowed_people AS (
  /* Admin: everyone active */
  SELECT d.EMAIL AS email, d.FULL_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE d, norm p
  WHERE p.viewer_role = 0 AND COALESCE(d.IS_ACTIVE, TRUE)

  UNION
  /* Manager: self + all reportees */
  SELECT DISTINCT h.REPORTEE_EMAIL AS email, h.REPORTEE_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 1
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL >= 0

  UNION
  /* IC: self only */
  SELECT DISTINCT h.REPORTEE_EMAIL AS email, h.REPORTEE_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 0
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL = 0
),

/* Email -> Coupa user IDs */
allowed_coupa_users AS (
  SELECT u.USER_ID, u.FULL_NAME, LOWER(u.EMAIL) AS email
  FROM dim_coupa_user u
  JOIN allowed_people a ON LOWER(a.email) = LOWER(u.EMAIL)
),

/* Groups for pending-approver GROUP cases */
member_groups AS (
  SELECT DISTINCT g.GROUP_ID, g.USER_ID
  FROM dim_coupa_approval_groups g
  JOIN allowed_coupa_users acu ON acu.USER_ID = g.USER_ID
),

/* Pending sets */
req_pending_for AS (
  SELECT DISTINCT rpa.REQUISITION_HEADER_ID, COALESCE(acu.USER_ID, mg.USER_ID) AS for_user_id
  FROM mrt_coupa_requisition_pending_approvers rpa
  LEFT JOIN allowed_coupa_users acu ON rpa.APPROVER_TYPE='USER' AND rpa.USER_OR_GROUP_ID=acu.USER_ID
  LEFT JOIN member_groups mg       ON rpa.APPROVER_TYPE='APPROVAL_GROUP' AND rpa.USER_OR_GROUP_ID=mg.GROUP_ID
  WHERE acu.USER_ID IS NOT NULL OR mg.USER_ID IS NOT NULL
),
inv_pending_for AS (
  SELECT DISTINCT ipa.INVOICE_HEADER_ID, COALESCE(acu.USER_ID, mg.USER_ID) AS for_user_id
  FROM mrt_coupa_invoice_pending_approvers ipa
  LEFT JOIN allowed_coupa_users acu ON ipa.APPROVER_TYPE='USER' AND ipa.USER_OR_GROUP_ID=acu.USER_ID
  LEFT JOIN member_groups mg       ON ipa.APPROVER_TYPE='APPROVAL_GROUP' AND ipa.USER_OR_GROUP_ID=mg.GROUP_ID
  WHERE acu.USER_ID IS NOT NULL OR mg.USER_ID IS NOT NULL
),

/* Flattened filters */
flt_suppliers AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.suppliers) f),
flt_statuses  AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.statuses)  f),
flt_cost_ctrs AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.cost_centers) f),
flt_numbers   AS (SELECT DISTINCT TRIM(f.value::string) AS part  FROM norm p, LATERAL FLATTEN(input => p.search_numbers) f),

/* Users filter candidates (emails or names) */
raw_user_vals AS (SELECT DISTINCT u.value::string AS raw_val FROM norm p, LATERAL FLATTEN(input => p.users) u),
sel_users AS (
  /* email */
  SELECT DISTINCT cu.USER_ID, UPPER(TRIM(cu.FULL_NAME)) AS name_norm
  FROM raw_user_vals r JOIN dim_coupa_user cu ON LOWER(cu.EMAIL) = LOWER(r.raw_val)
  UNION
  /* exact full-name */
  SELECT DISTINCT cu.USER_ID, UPPER(TRIM(cu.FULL_NAME)) AS name_norm
  FROM raw_user_vals r JOIN dim_coupa_user cu ON UPPER(TRIM(cu.FULL_NAME)) = UPPER(TRIM(r.raw_val))
),

/* Type filter → canonical names */
raw_type_vals AS (SELECT DISTINCT t.value::string AS raw_val FROM norm p, LATERAL FLATTEN(input => p.types) t),
flt_type AS (
  SELECT type_key FROM (
    SELECT DISTINCT
      CASE
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('PURCHASE ORDER','PURCHASE ORDERS','PO','POS','PURCHASEORDER','PURCHASEORDERS') THEN 'Purchase Order'
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('INVOICE','INVOICES','INV')                                              THEN 'Invoice'
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('REQUISITION','REQUISITIONS','REQ','REQS')                               THEN 'Requisition'
      END AS type_key
    FROM raw_type_vals
  ) s WHERE type_key IS NOT NULL
),

/* ---------- Latest per header (date window + type gate) ---------- */
po_latest AS (
  SELECT
      ol.ORDER_HEADER_ID                               AS coupa_id,
      CAST(ol.ORDER_HEADER_ID AS STRING)               AS number,
      'Purchase Order'                                 AS type,
      ol.SUPPLIER_NAME                                 AS supplier,
      ol.LINE_DEPARTMENT_NAME                          AS department_name,
      ol.LINE_INVOICED_AMOUNT                          AS amount,
      ol.ORDER_HEADER_STATUS                           AS status,
      ol.ORDER_CREATED_AT_UTC                          AS date,
      NULL::TIMESTAMP                                  AS due_date,
      ol.LINE_DESCRIPTION                              AS header_memo,
      ol.REQUISITION_HEADER_ID                         AS req_id,
      ol.HEADER_CREATED_BY_ID                          AS created_by_id,
      ol.HEADER_CREATED_BY_NAME                        AS created_by_name
  FROM mrt_coupa_p2p_order_line ol, norm p
  WHERE ol.ORDER_CREATED_AT_UTC >= DATEADD(DAY, -p.days_back, CURRENT_DATE)
    AND (p.types IS NULL OR EXISTS (SELECT 1 FROM flt_type ft WHERE ft.type_key='Purchase Order'))
  QUALIFY ROW_NUMBER() OVER (PARTITION BY ol.ORDER_HEADER_ID ORDER BY ol.ORDER_CREATED_AT_UTC DESC, ol.LINE_ID DESC)=1
),
req_latest AS (
  SELECT
      rl.REQUISITION_HEADER_ID                         AS coupa_id,
      CAST(rl.REQUISITION_HEADER_ID AS STRING)         AS number,
      'Requisition'                                    AS type,
      cs.NAME                                          AS supplier,
      rl.DEPARTMENT_NAME                               AS department_name,
      rl.TOTAL_AMOUNT                                  AS amount,
      rl.HEADER_STATUS                                 AS status,
      rl.REQUISITION_CREATED_AT_UTC                    AS date,
      NULL::TIMESTAMP                                  AS due_date,
      COALESCE(rl.HEADER_JUSTIFICATION, rl.LINE_DESCRIPTION) AS header_memo,
      rl.REQUISITION_HEADER_ID                         AS req_id,
      rl.REQUESTED_BY_ID                               AS created_by_id
  FROM mrt_coupa_p2p_requisition_line rl
  LEFT JOIN dim_coupa_supplier cs ON cs.supplier_id = rl.supplier_id, norm p
  WHERE rl.REQUISITION_CREATED_AT_UTC >= DATEADD(DAY, -p.days_back, CURRENT_DATE)
    AND (p.types IS NULL OR EXISTS (SELECT 1 FROM flt_type ft WHERE ft.type_key='Requisition'))
  QUALIFY ROW_NUMBER() OVER (PARTITION BY rl.REQUISITION_HEADER_ID ORDER BY rl.REQUISITION_CREATED_AT_UTC DESC, rl.REQUISITION_HEADER_ID DESC)=1
),
inv_latest AS (
  SELECT
      il.INVOICE_HEADER_ID                                AS coupa_id,
      il.INVOICE_NUMBER                                   AS number,
      'Invoice'                                           AS type,
      MAX(il.SUPPLIER_NAME)  OVER (PARTITION BY il.INVOICE_HEADER_ID)            AS supplier,
      NULL::STRING                                        AS department_name,
      COALESCE(MAX(il.INVOICE_AMOUNT) OVER (PARTITION BY il.INVOICE_HEADER_ID),
               SUM(il.LINE_AMOUNT)   OVER (PARTITION BY il.INVOICE_HEADER_ID))    AS amount,
      MAX(il.STATUS)            OVER (PARTITION BY il.INVOICE_HEADER_ID)          AS status,
      MIN(il.LINE_CREATED_AT_UTC) OVER (PARTITION BY il.INVOICE_HEADER_ID)        AS date,
      NULL::TIMESTAMP                                     AS due_date,
      MAX(il.LINE_DESCRIPTION) OVER (PARTITION BY il.INVOICE_HEADER_ID)           AS header_memo,
      NULL::NUMBER                                        AS req_id,
      MAX(il.HEADER_CREATED_BY_ID)   OVER (PARTITION BY il.INVOICE_HEADER_ID)     AS created_by_id,
      MAX(il.HEADER_CREATED_BY_NAME) OVER (PARTITION BY il.INVOICE_HEADER_ID)     AS created_by_name
  FROM mrt_coupa_p2p_invoice_line il, norm p
  WHERE il.LINE_CREATED_AT_UTC >= DATEADD(DAY, -p.days_back, CURRENT_DATE)
    AND (p.types IS NULL OR EXISTS (SELECT 1 FROM flt_type ft WHERE ft.type_key='Invoice'))
  QUALIFY ROW_NUMBER() OVER (PARTITION BY il.INVOICE_HEADER_ID ORDER BY il.LINE_CREATED_AT_UTC DESC, il.LINE_ID DESC)=1
),

/* ---------- Visibility: CREATED & PENDING, with filters ---------- */
po_created AS (
  SELECT
      pl.coupa_id, pl.number, pl.type, pl.supplier, pl.department_name, pl.amount,
      pl.status, pl.date, pl.due_date, pl.header_memo,
      COALESCE(acu.FULL_NAME, ap.full_name) AS for_employee
  FROM po_latest pl
  LEFT JOIN allowed_coupa_users acu ON pl.created_by_id = acu.USER_ID
  LEFT JOIN allowed_people ap ON UPPER(TRIM(pl.created_by_name)) = UPPER(TRIM(ap.full_name))
  , norm p
  WHERE (acu.USER_ID IS NOT NULL OR ap.full_name IS NOT NULL)
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = pl.created_by_id
                                    OR su.name_norm = UPPER(TRIM(pl.created_by_name))))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(pl.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(pl.status)) = st.val))
    AND (p.cost_centers IS NULL OR EXISTS (SELECT 1 FROM flt_cost_ctrs cc WHERE UPPER(TRIM(pl.department_name)) = cc.val))
    AND (p.min_amount IS NULL OR pl.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR pl.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE pl.number ILIKE '%%' || n.part || '%%'))
),
req_created AS (
  SELECT
      rl.coupa_id, rl.number, rl.type, rl.supplier, rl.department_name, rl.amount,
      rl.status, rl.date, rl.due_date, rl.header_memo,
      acu.FULL_NAME AS for_employee
  FROM req_latest rl
  JOIN allowed_coupa_users acu ON rl.created_by_id = acu.USER_ID
  , norm p
  WHERE 1=1
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = rl.created_by_id))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(rl.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(rl.status)) = st.val))
    AND (p.cost_centers IS NULL OR EXISTS (SELECT 1 FROM flt_cost_ctrs cc WHERE UPPER(TRIM(rl.department_name)) = cc.val))
    AND (p.min_amount IS NULL OR rl.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR rl.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE rl.number ILIKE '%%' || n.part || '%%'))
),
inv_created AS (
  SELECT
      il.coupa_id, il.number, il.type, il.supplier, il.department_name, il.amount,
      il.status, il.date, il.due_date, il.header_memo,
      COALESCE(acu.FULL_NAME, ap.full_name) AS for_employee
  FROM inv_latest il
  LEFT JOIN allowed_coupa_users acu ON il.created_by_id = acu.USER_ID
  LEFT JOIN allowed_people ap ON UPPER(TRIM(il.created_by_name)) = UPPER(TRIM(ap.full_name))
  , norm p
  WHERE (acu.USER_ID IS NOT NULL OR ap.full_name IS NOT NULL)
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = il.created_by_id
                                    OR su.name_norm = UPPER(TRIM(il.created_by_name))))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(il.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(il.status)) = st.val))
    AND (p.min_amount IS NULL OR il.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR il.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE il.number ILIKE '%%' || n.part || '%%'))
),
po_pending AS (
  SELECT
      pl.coupa_id, pl.number, pl.type, pl.supplier, pl.department_name, pl.amount,
      pl.status, pl.date, pl.due_date, pl.header_memo,
      acu2.FULL_NAME AS for_employee
  FROM po_latest pl
  JOIN req_pending_for rp ON rp.REQUISITION_HEADER_ID = pl.req_id
  JOIN allowed_coupa_users acu2 ON acu2.USER_ID = rp.for_user_id
  , norm p
  WHERE 1=1
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = acu2.USER_ID
                                    OR su.name_norm = UPPER(TRIM(acu2.FULL_NAME))))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(pl.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(pl.status)) = st.val))
    AND (p.cost_centers IS NULL OR EXISTS (SELECT 1 FROM flt_cost_ctrs cc WHERE UPPER(TRIM(pl.department_name)) = cc.val))
    AND (p.min_amount IS NULL OR pl.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR pl.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE pl.number ILIKE '%%' || n.part || '%%'))
),
req_pending AS (
  SELECT
      rl.coupa_id, rl.number, rl.type, rl.supplier, rl.department_name, rl.amount,
      rl.status, rl.date, rl.due_date, rl.header_memo,
      acu2.FULL_NAME AS for_employee
  FROM req_latest rl
  JOIN req_pending_for rp ON rp.REQUISITION_HEADER_ID = rl.req_id
  JOIN allowed_coupa_users acu2 ON acu2.USER_ID = rp.for_user_id
  , norm p
  WHERE 1=1
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = acu2.USER_ID
                                    OR su.name_norm = UPPER(TRIM(acu2.FULL_NAME))))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(rl.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(rl.status)) = st.val))
    AND (p.cost_centers IS NULL OR EXISTS (SELECT 1 FROM flt_cost_ctrs cc WHERE UPPER(TRIM(rl.department_name)) = cc.val))
    AND (p.min_amount IS NULL OR rl.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR rl.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE rl.number ILIKE '%%' || n.part || '%%'))
),
inv_pending AS (
  SELECT
      il.coupa_id, il.number, il.type, il.supplier, il.department_name, il.amount,
      il.status, il.date, il.due_date, il.header_memo,
      acu2.FULL_NAME AS for_employee
  FROM inv_latest il
  JOIN inv_pending_for ip ON ip.INVOICE_HEADER_ID = il.coupa_id
  JOIN allowed_coupa_users acu2 ON acu2.USER_ID = ip.for_user_id
  , norm p
  WHERE 1=1
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = acu2.USER_ID
                                    OR su.name_norm = UPPER(TRIM(acu2.FULL_NAME))))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(il.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(il.status)) = st.val))
    AND (p.min_amount IS NULL OR il.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR il.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE il.number ILIKE '%%' || n.part || '%%'))
),

/* ---------- Final "visible" (dedupe per header+person) ---------- */
results AS (
  SELECT
    coupa_id           AS "Coupa ID",
    number             AS "Number",
    type               AS "Type",
    supplier           AS "Supplier",
    department_name    AS "DEPARTMENT_NAME",
    amount             AS "Amount",
    status             AS "Status",
    date               AS "Date",
    due_date           AS "Due Date",
    header_memo        AS "HEADER_MEMO",
    for_employee       AS "For_Employee"
  FROM (
    SELECT * FROM req_created
    UNION ALL SELECT * FROM req_pending
    UNION ALL SELECT * FROM po_created
    UNION ALL SELECT * FROM po_pending
    UNION ALL SELECT * FROM inv_created
    UNION ALL SELECT * FROM inv_pending
  )
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY "Type","Coupa ID","For_Employee"
    ORDER BY "Date" DESC
  ) = 1
),

/* ---------- Header-level de-dupe (one row per document for counting) ---------- */
hdrs AS (
  SELECT *
  FROM (
    SELECT r.*,
           ROW_NUMBER() OVER (PARTITION BY "Type","Coupa ID" ORDER BY "Date" DESC) AS rn
    FROM results r
  )
  WHERE rn = 1
)

/* ===================== 1) STATUS DISTRIBUTION ===================== */
SELECT
  UPPER(TRIM("Status")) AS status,
  COUNT(*)              AS txn_count
FROM hdrs
GROUP BY 1
ORDER BY txn_count DESC, status;
'''

COUPA_DASHBOARD_MONTHLY_TRENDS = '''
WITH
/* ---------- Parameters (bind from app) ---------- */
params AS (
  SELECT
      %s::INT                               AS days_back,
      %s::STRING  AS viewer_email,     -- << set the viewer
      %s::INT                                 AS viewer_role,      -- 0=admin, 1/2/3=normal

      /* NULL or [] => no filter */
      PARSE_JSON('[]')::VARIANT              AS users,
      PARSE_JSON('[]')::VARIANT              AS suppliers,
      PARSE_JSON('[]')::VARIANT              AS statuses,
      PARSE_JSON('[]')::VARIANT              AS cost_centers,
      PARSE_JSON('[]')::VARIANT              AS search_numbers,
      NULL::NUMBER                           AS min_amount,
      NULL::NUMBER                           AS max_amount,
      PARSE_JSON('[]')::VARIANT              AS types            -- e.g. ["Purchase Orders","Invoices","Requisitions"]
),
/* Normalize empties -> NULL */
norm AS (
  SELECT
    days_back, viewer_email, viewer_role,
    IFF(users          IS NULL OR ARRAY_SIZE(users)         = 0, NULL, users)          AS users,
    IFF(suppliers      IS NULL OR ARRAY_SIZE(suppliers)     = 0, NULL, suppliers)      AS suppliers,
    IFF(statuses       IS NULL OR ARRAY_SIZE(statuses)      = 0, NULL, statuses)       AS statuses,
    IFF(cost_centers   IS NULL OR ARRAY_SIZE(cost_centers)  = 0, NULL, cost_centers)   AS cost_centers,
    IFF(search_numbers IS NULL OR ARRAY_SIZE(search_numbers)= 0, NULL, search_numbers) AS search_numbers,
    min_amount, max_amount,
    IFF(types         IS NULL OR ARRAY_SIZE(types)          = 0, NULL, types)          AS types
  FROM params
),

/* Manager? */
mgr AS (
  SELECT IFF(COUNT_IF(h.HIERARCHY_LEVEL >= 1) > 0, 1, 0) AS has_reports
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p
  WHERE LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
),

/* RBAC: people the viewer may see */
allowed_people AS (
  /* Admin: everyone active */
  SELECT d.EMAIL AS email, d.FULL_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE d, norm p
  WHERE p.viewer_role = 0 AND COALESCE(d.IS_ACTIVE, TRUE)

  UNION
  /* Manager: self + all reportees */
  SELECT DISTINCT h.REPORTEE_EMAIL AS email, h.REPORTEE_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 1
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL >= 0

  UNION
  /* IC: self only */
  SELECT DISTINCT h.REPORTEE_EMAIL AS email, h.REPORTEE_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 0
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL = 0
),

/* Email -> Coupa user IDs */
allowed_coupa_users AS (
  SELECT u.USER_ID, u.FULL_NAME, LOWER(u.EMAIL) AS email
  FROM dim_coupa_user u
  JOIN allowed_people a ON LOWER(a.email) = LOWER(u.EMAIL)
),

/* Groups for pending-approver GROUP cases */
member_groups AS (
  SELECT DISTINCT g.GROUP_ID, g.USER_ID
  FROM dim_coupa_approval_groups g
  JOIN allowed_coupa_users acu ON acu.USER_ID = g.USER_ID
),

/* Pending sets */
req_pending_for AS (
  SELECT DISTINCT rpa.REQUISITION_HEADER_ID, COALESCE(acu.USER_ID, mg.USER_ID) AS for_user_id
  FROM mrt_coupa_requisition_pending_approvers rpa
  LEFT JOIN allowed_coupa_users acu ON rpa.APPROVER_TYPE='USER' AND rpa.USER_OR_GROUP_ID=acu.USER_ID
  LEFT JOIN member_groups mg       ON rpa.APPROVER_TYPE='APPROVAL_GROUP' AND rpa.USER_OR_GROUP_ID=mg.GROUP_ID
  WHERE acu.USER_ID IS NOT NULL OR mg.USER_ID IS NOT NULL
),
inv_pending_for AS (
  SELECT DISTINCT ipa.INVOICE_HEADER_ID, COALESCE(acu.USER_ID, mg.USER_ID) AS for_user_id
  FROM mrt_coupa_invoice_pending_approvers ipa
  LEFT JOIN allowed_coupa_users acu ON ipa.APPROVER_TYPE='USER' AND ipa.USER_OR_GROUP_ID=acu.USER_ID
  LEFT JOIN member_groups mg       ON ipa.APPROVER_TYPE='APPROVAL_GROUP' AND ipa.USER_OR_GROUP_ID=mg.GROUP_ID
  WHERE acu.USER_ID IS NOT NULL OR mg.USER_ID IS NOT NULL
),

/* Flattened filters */
flt_suppliers AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.suppliers) f),
flt_statuses  AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.statuses)  f),
flt_cost_ctrs AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.cost_centers) f),
flt_numbers   AS (SELECT DISTINCT TRIM(f.value::string) AS part  FROM norm p, LATERAL FLATTEN(input => p.search_numbers) f),

/* Users filter candidates (emails or names) */
raw_user_vals AS (SELECT DISTINCT u.value::string AS raw_val FROM norm p, LATERAL FLATTEN(input => p.users) u),
sel_users AS (
  /* email */
  SELECT DISTINCT cu.USER_ID, UPPER(TRIM(cu.FULL_NAME)) AS name_norm
  FROM raw_user_vals r JOIN dim_coupa_user cu ON LOWER(cu.EMAIL) = LOWER(r.raw_val)
  UNION
  /* exact full-name */
  SELECT DISTINCT cu.USER_ID, UPPER(TRIM(cu.FULL_NAME)) AS name_norm
  FROM raw_user_vals r JOIN dim_coupa_user cu ON UPPER(TRIM(cu.FULL_NAME)) = UPPER(TRIM(r.raw_val))
),

/* Type filter → canonical names */
raw_type_vals AS (SELECT DISTINCT t.value::string AS raw_val FROM norm p, LATERAL FLATTEN(input => p.types) t),
flt_type AS (
  SELECT type_key FROM (
    SELECT DISTINCT
      CASE
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('PURCHASE ORDER','PURCHASE ORDERS','PO','POS','PURCHASEORDER','PURCHASEORDERS') THEN 'Purchase Order'
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('INVOICE','INVOICES','INV')                                              THEN 'Invoice'
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('REQUISITION','REQUISITIONS','REQ','REQS')                               THEN 'Requisition'
      END AS type_key
    FROM raw_type_vals
  ) s WHERE type_key IS NOT NULL
),

/* ---------- Latest per header (date window + type gate) ---------- */
po_latest AS (
  SELECT
      ol.ORDER_HEADER_ID                               AS coupa_id,
      CAST(ol.ORDER_HEADER_ID AS STRING)               AS number,
      'Purchase Order'                                 AS type,
      ol.SUPPLIER_NAME                                 AS supplier,
      ol.LINE_DEPARTMENT_NAME                          AS department_name,
      ol.LINE_INVOICED_AMOUNT                          AS amount,
      ol.ORDER_HEADER_STATUS                           AS status,
      ol.ORDER_CREATED_AT_UTC                          AS date,
      NULL::TIMESTAMP                                  AS due_date,
      ol.LINE_DESCRIPTION                              AS header_memo,
      ol.REQUISITION_HEADER_ID                         AS req_id,
      ol.HEADER_CREATED_BY_ID                          AS created_by_id,
      ol.HEADER_CREATED_BY_NAME                        AS created_by_name
  FROM mrt_coupa_p2p_order_line ol, norm p
  WHERE ol.ORDER_CREATED_AT_UTC >= DATEADD(DAY, -p.days_back, CURRENT_DATE)
    AND (p.types IS NULL OR EXISTS (SELECT 1 FROM flt_type ft WHERE ft.type_key='Purchase Order'))
  QUALIFY ROW_NUMBER() OVER (PARTITION BY ol.ORDER_HEADER_ID ORDER BY ol.ORDER_CREATED_AT_UTC DESC, ol.LINE_ID DESC)=1
),
req_latest AS (
  SELECT
      rl.REQUISITION_HEADER_ID                         AS coupa_id,
      CAST(rl.REQUISITION_HEADER_ID AS STRING)         AS number,
      'Requisition'                                    AS type,
      cs.NAME                                          AS supplier,
      rl.DEPARTMENT_NAME                               AS department_name,
      rl.TOTAL_AMOUNT                                  AS amount,
      rl.HEADER_STATUS                                 AS status,
      rl.REQUISITION_CREATED_AT_UTC                    AS date,
      NULL::TIMESTAMP                                  AS due_date,
      COALESCE(rl.HEADER_JUSTIFICATION, rl.LINE_DESCRIPTION) AS header_memo,
      rl.REQUISITION_HEADER_ID                         AS req_id,
      rl.REQUESTED_BY_ID                               AS created_by_id
  FROM mrt_coupa_p2p_requisition_line rl
  LEFT JOIN dim_coupa_supplier cs ON cs.supplier_id = rl.supplier_id, norm p
  WHERE rl.REQUISITION_CREATED_AT_UTC >= DATEADD(DAY, -p.days_back, CURRENT_DATE)
    AND (p.types IS NULL OR EXISTS (SELECT 1 FROM flt_type ft WHERE ft.type_key='Requisition'))
  QUALIFY ROW_NUMBER() OVER (PARTITION BY rl.REQUISITION_HEADER_ID ORDER BY rl.REQUISITION_CREATED_AT_UTC DESC, rl.REQUISITION_HEADER_ID DESC)=1
),
inv_latest AS (
  SELECT
      il.INVOICE_HEADER_ID                                AS coupa_id,
      il.INVOICE_NUMBER                                   AS number,
      'Invoice'                                           AS type,
      MAX(il.SUPPLIER_NAME)  OVER (PARTITION BY il.INVOICE_HEADER_ID)            AS supplier,
      NULL::STRING                                        AS department_name,
      COALESCE(MAX(il.INVOICE_AMOUNT) OVER (PARTITION BY il.INVOICE_HEADER_ID),
               SUM(il.LINE_AMOUNT)   OVER (PARTITION BY il.INVOICE_HEADER_ID))    AS amount,
      MAX(il.STATUS)            OVER (PARTITION BY il.INVOICE_HEADER_ID)          AS status,
      MIN(il.LINE_CREATED_AT_UTC) OVER (PARTITION BY il.INVOICE_HEADER_ID)        AS date,
      NULL::TIMESTAMP                                     AS due_date,
      MAX(il.LINE_DESCRIPTION) OVER (PARTITION BY il.INVOICE_HEADER_ID)           AS header_memo,
      NULL::NUMBER                                        AS req_id,
      MAX(il.HEADER_CREATED_BY_ID)   OVER (PARTITION BY il.INVOICE_HEADER_ID)     AS created_by_id,
      MAX(il.HEADER_CREATED_BY_NAME) OVER (PARTITION BY il.INVOICE_HEADER_ID)     AS created_by_name
  FROM mrt_coupa_p2p_invoice_line il, norm p
  WHERE il.LINE_CREATED_AT_UTC >= DATEADD(DAY, -p.days_back, CURRENT_DATE)
    AND (p.types IS NULL OR EXISTS (SELECT 1 FROM flt_type ft WHERE ft.type_key='Invoice'))
  QUALIFY ROW_NUMBER() OVER (PARTITION BY il.INVOICE_HEADER_ID ORDER BY il.LINE_CREATED_AT_UTC DESC, il.LINE_ID DESC)=1
),

/* ---------- Visibility: CREATED & PENDING, with filters ---------- */
po_created AS (
  SELECT
      pl.coupa_id, pl.number, pl.type, pl.supplier, pl.department_name, pl.amount,
      pl.status, pl.date, pl.due_date, pl.header_memo,
      COALESCE(acu.FULL_NAME, ap.full_name) AS for_employee
  FROM po_latest pl
  LEFT JOIN allowed_coupa_users acu ON pl.created_by_id = acu.USER_ID
  LEFT JOIN allowed_people ap ON UPPER(TRIM(pl.created_by_name)) = UPPER(TRIM(ap.full_name))
  , norm p
  WHERE (acu.USER_ID IS NOT NULL OR ap.full_name IS NOT NULL)
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = pl.created_by_id
                                    OR su.name_norm = UPPER(TRIM(pl.created_by_name))))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(pl.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(pl.status)) = st.val))
    AND (p.cost_centers IS NULL OR EXISTS (SELECT 1 FROM flt_cost_ctrs cc WHERE UPPER(TRIM(pl.department_name)) = cc.val))
    AND (p.min_amount IS NULL OR pl.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR pl.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE pl.number ILIKE '%%' || n.part || '%%'))
),
req_created AS (
  SELECT
      rl.coupa_id, rl.number, rl.type, rl.supplier, rl.department_name, rl.amount,
      rl.status, rl.date, rl.due_date, rl.header_memo,
      acu.FULL_NAME AS for_employee
  FROM req_latest rl
  JOIN allowed_coupa_users acu ON rl.created_by_id = acu.USER_ID
  , norm p
  WHERE 1=1
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = rl.created_by_id))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(rl.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(rl.status)) = st.val))
    AND (p.cost_centers IS NULL OR EXISTS (SELECT 1 FROM flt_cost_ctrs cc WHERE UPPER(TRIM(rl.department_name)) = cc.val))
    AND (p.min_amount IS NULL OR rl.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR rl.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE rl.number ILIKE '%%' || n.part || '%%'))
),
inv_created AS (
  SELECT
      il.coupa_id, il.number, il.type, il.supplier, il.department_name, il.amount,
      il.status, il.date, il.due_date, il.header_memo,
      COALESCE(acu.FULL_NAME, ap.full_name) AS for_employee
  FROM inv_latest il
  LEFT JOIN allowed_coupa_users acu ON il.created_by_id = acu.USER_ID
  LEFT JOIN allowed_people ap ON UPPER(TRIM(il.created_by_name)) = UPPER(TRIM(ap.full_name))
  , norm p
  WHERE (acu.USER_ID IS NOT NULL OR ap.full_name IS NOT NULL)
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = il.created_by_id
                                    OR su.name_norm = UPPER(TRIM(il.created_by_name))))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(il.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(il.status)) = st.val))
    AND (p.min_amount IS NULL OR il.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR il.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE il.number ILIKE '%%' || n.part || '%%'))
),
po_pending AS (
  SELECT
      pl.coupa_id, pl.number, pl.type, pl.supplier, pl.department_name, pl.amount,
      pl.status, pl.date, pl.due_date, pl.header_memo,
      acu2.FULL_NAME AS for_employee
  FROM po_latest pl
  JOIN req_pending_for rp ON rp.REQUISITION_HEADER_ID = pl.req_id
  JOIN allowed_coupa_users acu2 ON acu2.USER_ID = rp.for_user_id
  , norm p
  WHERE 1=1
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = acu2.USER_ID
                                    OR su.name_norm = UPPER(TRIM(acu2.FULL_NAME))))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(pl.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(pl.status)) = st.val))
    AND (p.cost_centers IS NULL OR EXISTS (SELECT 1 FROM flt_cost_ctrs cc WHERE UPPER(TRIM(pl.department_name)) = cc.val))
    AND (p.min_amount IS NULL OR pl.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR pl.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE pl.number ILIKE '%%' || n.part || '%%'))
),
req_pending AS (
  SELECT
      rl.coupa_id, rl.number, rl.type, rl.supplier, rl.department_name, rl.amount,
      rl.status, rl.date, rl.due_date, rl.header_memo,
      acu2.FULL_NAME AS for_employee
  FROM req_latest rl
  JOIN req_pending_for rp ON rp.REQUISITION_HEADER_ID = rl.req_id
  JOIN allowed_coupa_users acu2 ON acu2.USER_ID = rp.for_user_id
  , norm p
  WHERE 1=1
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = acu2.USER_ID
                                    OR su.name_norm = UPPER(TRIM(acu2.FULL_NAME))))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(rl.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(rl.status)) = st.val))
    AND (p.cost_centers IS NULL OR EXISTS (SELECT 1 FROM flt_cost_ctrs cc WHERE UPPER(TRIM(rl.department_name)) = cc.val))
    AND (p.min_amount IS NULL OR rl.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR rl.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE rl.number ILIKE '%%' || n.part || '%%'))
),
inv_pending AS (
  SELECT
      il.coupa_id, il.number, il.type, il.supplier, il.department_name, il.amount,
      il.status, il.date, il.due_date, il.header_memo,
      acu2.FULL_NAME AS for_employee
  FROM inv_latest il
  JOIN inv_pending_for ip ON ip.INVOICE_HEADER_ID = il.coupa_id
  JOIN allowed_coupa_users acu2 ON acu2.USER_ID = ip.for_user_id
  , norm p
  WHERE 1=1
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = acu2.USER_ID
                                    OR su.name_norm = UPPER(TRIM(acu2.FULL_NAME))))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(il.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(il.status)) = st.val))
    AND (p.min_amount IS NULL OR il.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR il.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE il.number ILIKE '%%' || n.part || '%%'))
),

/* ---------- Final "visible" (dedupe per header+person) ---------- */
results AS (
  SELECT
    coupa_id           AS "Coupa ID",
    number             AS "Number",
    type               AS "Type",
    supplier           AS "Supplier",
    department_name    AS "DEPARTMENT_NAME",
    amount             AS "Amount",
    status             AS "Status",
    date               AS "Date",
    due_date           AS "Due Date",
    header_memo        AS "HEADER_MEMO",
    for_employee       AS "For_Employee"
  FROM (
    SELECT * FROM req_created
    UNION ALL SELECT * FROM req_pending
    UNION ALL SELECT * FROM po_created
    UNION ALL SELECT * FROM po_pending
    UNION ALL SELECT * FROM inv_created
    UNION ALL SELECT * FROM inv_pending
  )
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY "Type","Coupa ID","For_Employee"
    ORDER BY "Date" DESC
  ) = 1
),

/* ---------- Header-level de-dupe (one row per document for counting) ---------- */
hdrs AS (
  SELECT *
  FROM (
    SELECT r.*,
           ROW_NUMBER() OVER (PARTITION BY "Type","Coupa ID" ORDER BY "Date" DESC) AS rn
    FROM results r
  )
  WHERE rn = 1
)

/* ===================== 2) TRANSACTIONS BY MONTH ===================== */
SELECT
  DATE_TRUNC('month', "Date") AS month,
  COUNT(*)                    AS txn_count
FROM hdrs
GROUP BY 1
ORDER BY month;
'''

COUPA_TRANSACTIONS_METRICS = '''
/* ===================== COUPA — COUNTS (ROLE-BASED + FILTERS + TYPES) ===================== */
WITH
/* ---------- Parameters (bind from app) ---------- */
params AS (
  SELECT
      %s::INT                               AS days_back,
      %s::STRING  AS viewer_email,     -- << set the viewer
      %s::INT                                 AS viewer_role,      -- 0=admin, 1/2/3=normal

      /* NULL or [] => no filter */
      PARSE_JSON('[]')::VARIANT              AS users,            -- e.g. PARSE_JSON('["raheel@...","Stanley Cheung"]')
      PARSE_JSON('[]')::VARIANT              AS suppliers,        -- e.g. PARSE_JSON('["Amazon","Oracle"]')
      PARSE_JSON('[]')::VARIANT              AS statuses,         -- e.g. PARSE_JSON('["Pending Approval","Approved"]')
      PARSE_JSON('[]')::VARIANT              AS cost_centers,     -- e.g. PARSE_JSON('["Accounting","R&D"]')
      PARSE_JSON('[]')::VARIANT              AS search_numbers,   -- e.g. PARSE_JSON('["12345","REQ-2024"]')
      NULL::NUMBER                           AS min_amount,       -- set to a number to enable
      NULL::NUMBER                           AS max_amount,       -- set to a number to enable
      PARSE_JSON('[]')::VARIANT              AS types             -- NEW: e.g. PARSE_JSON('["Purchase Orders","Invoices"]')
),
/* ===================== COUPA — COUNTS (ROLE-BASED + FILTERS + TYPES) ===================== */
/* Normalize: treat empty arrays as NULL (disables that filter) */
norm AS (
  SELECT
    days_back, viewer_email, viewer_role,
    IFF(users          IS NULL OR ARRAY_SIZE(users)         = 0, NULL, users)          AS users,
    IFF(suppliers      IS NULL OR ARRAY_SIZE(suppliers)     = 0, NULL, suppliers)      AS suppliers,
    IFF(statuses       IS NULL OR ARRAY_SIZE(statuses)      = 0, NULL, statuses)       AS statuses,
    IFF(cost_centers   IS NULL OR ARRAY_SIZE(cost_centers)  = 0, NULL, cost_centers)   AS cost_centers,
    IFF(search_numbers IS NULL OR ARRAY_SIZE(search_numbers)= 0, NULL, search_numbers) AS search_numbers,
    min_amount, max_amount,
    IFF(types         IS NULL OR ARRAY_SIZE(types)          = 0, NULL, types)          AS types
  FROM params
),

/* RBAC — is viewer a manager? */
mgr AS (
  SELECT IFF(COUNT_IF(h.HIERARCHY_LEVEL >= 1) > 0, 1, 0) AS has_reports
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p
  WHERE LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
),

/* RBAC — who the viewer may see */
allowed_people AS (
  /* Admin: everyone active */
  SELECT d.EMAIL AS email, d.FULL_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE d, norm p
  WHERE p.viewer_role = 0 AND COALESCE(d.IS_ACTIVE, TRUE)

  UNION
  /* Manager: self + all reportees */
  SELECT DISTINCT h.REPORTEE_EMAIL AS email, h.REPORTEE_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 1
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL >= 0

  UNION
  /* IC: self only */
  SELECT DISTINCT h.REPORTEE_EMAIL AS email, h.REPORTEE_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 0
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL = 0
),

/* Email -> Coupa USER_ID mapping for allowed people */
allowed_coupa_users AS (
  SELECT u.USER_ID, u.FULL_NAME, LOWER(u.EMAIL) AS email
  FROM dim_coupa_user u
  JOIN allowed_people a ON LOWER(a.email) = LOWER(u.EMAIL)
),

/* Groups the allowed users are in (for pending approver GROUP cases) */
member_groups AS (
  SELECT DISTINCT g.GROUP_ID, g.USER_ID
  FROM dim_coupa_approval_groups g
  JOIN allowed_coupa_users acu ON acu.USER_ID = g.USER_ID
),

/* Reqs pending for any allowed user (direct or via their groups) */
req_pending_for AS (
  SELECT DISTINCT
      rpa.REQUISITION_HEADER_ID,
      COALESCE(acu.USER_ID, mg.USER_ID) AS for_user_id
  FROM mrt_coupa_requisition_pending_approvers rpa
  LEFT JOIN allowed_coupa_users acu
    ON rpa.APPROVER_TYPE = 'USER' AND rpa.USER_OR_GROUP_ID = acu.USER_ID
  LEFT JOIN member_groups mg
    ON rpa.APPROVER_TYPE = 'APPROVAL_GROUP' AND rpa.USER_OR_GROUP_ID = mg.GROUP_ID
  WHERE acu.USER_ID IS NOT NULL OR mg.USER_ID IS NOT NULL
),

/* Invoices pending for any allowed user (direct or via their groups) */
inv_pending_for AS (
  SELECT DISTINCT
      ipa.INVOICE_HEADER_ID,
      COALESCE(acu.USER_ID, mg.USER_ID) AS for_user_id
  FROM mrt_coupa_invoice_pending_approvers ipa
  LEFT JOIN allowed_coupa_users acu
    ON ipa.APPROVER_TYPE = 'USER' AND ipa.USER_OR_GROUP_ID = acu.USER_ID
  LEFT JOIN member_groups mg
    ON ipa.APPROVER_TYPE = 'APPROVAL_GROUP' AND ipa.USER_OR_GROUP_ID = mg.GROUP_ID
  WHERE acu.USER_ID IS NOT NULL OR mg.USER_ID IS NOT NULL
),

/* ------------ Flattened filters (normalized) ------------ */
flt_suppliers AS (
  SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val
  FROM norm p, LATERAL FLATTEN(input => p.suppliers) f
),
flt_statuses AS (
  SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val
  FROM norm p, LATERAL FLATTEN(input => p.statuses) f
),
flt_cost_centers AS (
  SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val
  FROM norm p, LATERAL FLATTEN(input => p.cost_centers) f
),
flt_numbers AS (
  SELECT DISTINCT TRIM(f.value::string) AS part
  FROM norm p, LATERAL FLATTEN(input => p.search_numbers) f
),

/* Users filter: flatten → map emails to IDs; also keep name norms */
raw_user_vals AS (SELECT DISTINCT u.value::string AS raw_val FROM norm p, LATERAL FLATTEN(input => p.users) u),
sel_users AS (
  SELECT DISTINCT cu.USER_ID, UPPER(TRIM(cu.FULL_NAME)) AS name_norm
  FROM raw_user_vals r
  JOIN dim_coupa_user cu ON LOWER(cu.EMAIL) = LOWER(r.raw_val)
  UNION
  SELECT DISTINCT cu.USER_ID, UPPER(TRIM(cu.FULL_NAME)) AS name_norm
  FROM raw_user_vals r
  JOIN dim_coupa_user cu ON UPPER(TRIM(cu.FULL_NAME)) = UPPER(TRIM(r.raw_val))
),

/* Type filter: normalize to canonical keys ('Purchase Order'|'Invoice'|'Requisition') */
raw_type_vals AS (SELECT DISTINCT t.value::string AS raw_val FROM norm p, LATERAL FLATTEN(input => p.types) t),
flt_type AS (
  SELECT type_key FROM (
    SELECT DISTINCT
      CASE
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('PURCHASE ORDER','PURCHASE ORDERS','PO','POS','PURCHASEORDER','PURCHASEORDERS')
          THEN 'Purchase Order'
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('INVOICE','INVOICES','INV')
          THEN 'Invoice'
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('REQUISITION','REQUISITIONS','REQ','REQS')
          THEN 'Requisition'
      END AS type_key
    FROM raw_type_vals
  ) s WHERE type_key IS NOT NULL
),

/* ---------- Latest per header (date window; apply type filter per leg) ---------- */
po_latest AS (
  SELECT
      ol.ORDER_HEADER_ID                               AS coupa_id,
      CAST(ol.ORDER_HEADER_ID AS STRING)               AS number,
      'Purchase Order'                                 AS type,
      ol.SUPPLIER_NAME                                 AS supplier,
      ol.LINE_DEPARTMENT_NAME                          AS department_name,
      ol.LINE_INVOICED_AMOUNT                          AS amount,
      ol.ORDER_HEADER_STATUS                           AS status,
      ol.ORDER_CREATED_AT_UTC                          AS date,
      NULL::TIMESTAMP                                  AS due_date,
      ol.LINE_DESCRIPTION                              AS header_memo,
      ol.REQUISITION_HEADER_ID                         AS req_id,
      ol.HEADER_CREATED_BY_ID                          AS created_by_id,
      ol.HEADER_CREATED_BY_NAME                        AS created_by_name
  FROM mrt_coupa_p2p_order_line ol, norm p
  WHERE ol.ORDER_CREATED_AT_UTC >= DATEADD(DAY, -p.days_back, CURRENT_DATE)
    AND (p.types IS NULL OR EXISTS (SELECT 1 FROM flt_type ft WHERE ft.type_key = 'Purchase Order'))
  QUALIFY ROW_NUMBER() OVER (PARTITION BY ol.ORDER_HEADER_ID ORDER BY ol.ORDER_CREATED_AT_UTC DESC, ol.LINE_ID DESC) = 1
),
req_latest AS (
  SELECT
      rl.REQUISITION_HEADER_ID                         AS coupa_id,
      CAST(rl.REQUISITION_HEADER_ID AS STRING)         AS number,
      'Requisition'                                    AS type,
      cs.NAME                                          AS supplier,
      rl.DEPARTMENT_NAME                               AS department_name,
      rl.TOTAL_AMOUNT                                  AS amount,
      rl.HEADER_STATUS                                 AS status,
      rl.REQUISITION_CREATED_AT_UTC                    AS date,
      NULL::TIMESTAMP                                  AS due_date,
      COALESCE(rl.HEADER_JUSTIFICATION, rl.LINE_DESCRIPTION) AS header_memo,
      rl.REQUISITION_HEADER_ID                         AS req_id,
      rl.REQUESTED_BY_ID                               AS created_by_id
  FROM mrt_coupa_p2p_requisition_line rl
  LEFT JOIN dim_coupa_supplier cs ON cs.supplier_id = rl.supplier_id, norm p
  WHERE rl.REQUISITION_CREATED_AT_UTC >= DATEADD(DAY, -p.days_back, CURRENT_DATE)
    AND (p.types IS NULL OR EXISTS (SELECT 1 FROM flt_type ft WHERE ft.type_key = 'Requisition'))
  QUALIFY ROW_NUMBER() OVER (PARTITION BY rl.REQUISITION_HEADER_ID ORDER BY rl.REQUISITION_CREATED_AT_UTC DESC, rl.REQUISITION_HEADER_ID DESC) = 1
),
inv_latest AS (
  SELECT
      il.INVOICE_HEADER_ID                                AS coupa_id,
      il.INVOICE_NUMBER                                   AS number,
      'Invoice'                                           AS type,
      MAX(il.SUPPLIER_NAME)  OVER (PARTITION BY il.INVOICE_HEADER_ID)            AS supplier,
      NULL::STRING                                        AS department_name,
      COALESCE(MAX(il.INVOICE_AMOUNT) OVER (PARTITION BY il.INVOICE_HEADER_ID),
               SUM(il.LINE_AMOUNT)   OVER (PARTITION BY il.INVOICE_HEADER_ID))    AS amount,
      MAX(il.STATUS)            OVER (PARTITION BY il.INVOICE_HEADER_ID)          AS status,
      MIN(il.LINE_CREATED_AT_UTC) OVER (PARTITION BY il.INVOICE_HEADER_ID)        AS date,
      NULL::TIMESTAMP                                     AS due_date,
      MAX(il.LINE_DESCRIPTION) OVER (PARTITION BY il.INVOICE_HEADER_ID)           AS header_memo,
      NULL::NUMBER                                        AS req_id,
      MAX(il.HEADER_CREATED_BY_ID)   OVER (PARTITION BY il.INVOICE_HEADER_ID)     AS created_by_id,
      MAX(il.HEADER_CREATED_BY_NAME) OVER (PARTITION BY il.INVOICE_HEADER_ID)     AS created_by_name
  FROM mrt_coupa_p2p_invoice_line il, norm p
  WHERE il.LINE_CREATED_AT_UTC >= DATEADD(DAY, -p.days_back, CURRENT_DATE)
    AND (p.types IS NULL OR EXISTS (SELECT 1 FROM flt_type ft WHERE ft.type_key = 'Invoice'))
  QUALIFY ROW_NUMBER() OVER (PARTITION BY il.INVOICE_HEADER_ID ORDER BY il.LINE_CREATED_AT_UTC DESC, il.LINE_ID DESC) = 1
),

/* ---------- Visibility: CREATED + Filters ---------- */
po_created AS (
  SELECT
      pl.coupa_id, pl.number, pl.type, pl.supplier, pl.department_name, pl.amount,
      pl.status, pl.date, pl.due_date, pl.header_memo,
      COALESCE(acu.FULL_NAME, ap.full_name) AS for_employee
  FROM po_latest pl
  LEFT JOIN allowed_coupa_users acu ON pl.created_by_id = acu.USER_ID
  LEFT JOIN allowed_people ap ON UPPER(TRIM(pl.created_by_name)) = UPPER(TRIM(ap.full_name))
  , norm p
  WHERE (acu.USER_ID IS NOT NULL OR ap.full_name IS NOT NULL)
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = pl.created_by_id
                                    OR su.name_norm = UPPER(TRIM(pl.created_by_name))))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(pl.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(pl.status)) = st.val))
    AND (p.cost_centers IS NULL OR EXISTS (SELECT 1 FROM flt_cost_centers cc WHERE UPPER(TRIM(pl.department_name)) = cc.val))
    AND (p.min_amount IS NULL OR pl.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR pl.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE pl.number ILIKE '%%' || n.part || '%%'))
),
req_created AS (
  SELECT
      rl.coupa_id, rl.number, rl.type, rl.supplier, rl.department_name, rl.amount,
      rl.status, rl.date, rl.due_date, rl.header_memo,
      acu.FULL_NAME AS for_employee
  FROM req_latest rl
  JOIN allowed_coupa_users acu ON rl.created_by_id = acu.USER_ID
  , norm p
  WHERE 1=1
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = rl.created_by_id))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(rl.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(rl.status)) = st.val))
    AND (p.cost_centers IS NULL OR EXISTS (SELECT 1 FROM flt_cost_centers cc WHERE UPPER(TRIM(rl.department_name)) = cc.val))
    AND (p.min_amount IS NULL OR rl.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR rl.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE rl.number ILIKE '%%' || n.part || '%%'))
),
inv_created AS (
  SELECT
      il.coupa_id, il.number, il.type, il.supplier, il.department_name, il.amount,
      il.status, il.date, il.due_date, il.header_memo,
      COALESCE(acu.FULL_NAME, ap.full_name) AS for_employee
  FROM inv_latest il
  LEFT JOIN allowed_coupa_users acu ON il.created_by_id = acu.USER_ID
  LEFT JOIN allowed_people ap ON UPPER(TRIM(il.created_by_name)) = UPPER(TRIM(ap.full_name))
  , norm p
  WHERE (acu.USER_ID IS NOT NULL OR ap.full_name IS NOT NULL)
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = il.created_by_id
                                    OR su.name_norm = UPPER(TRIM(il.created_by_name))))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(il.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(il.status)) = st.val))
    AND (p.min_amount IS NULL OR il.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR il.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE il.number ILIKE '%%' || n.part || '%%'))
),

/* ---------- Visibility: PENDING approver + Filters ---------- */
po_pending AS (
  SELECT
      pl.coupa_id, pl.number, pl.type, pl.supplier, pl.department_name, pl.amount,
      pl.status, pl.date, pl.due_date, pl.header_memo,
      acu2.FULL_NAME AS for_employee
  FROM po_latest pl
  JOIN req_pending_for rp ON rp.REQUISITION_HEADER_ID = pl.req_id
  JOIN allowed_coupa_users acu2 ON acu2.USER_ID = rp.for_user_id
  , norm p
  WHERE 1=1
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = acu2.USER_ID
                                    OR su.name_norm = UPPER(TRIM(acu2.FULL_NAME))))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(pl.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(pl.status)) = st.val))
    AND (p.cost_centers IS NULL OR EXISTS (SELECT 1 FROM flt_cost_centers cc WHERE UPPER(TRIM(pl.department_name)) = cc.val))
    AND (p.min_amount IS NULL OR pl.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR pl.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE pl.number ILIKE '%%' || n.part || '%%'))
),
req_pending AS (
  SELECT
      rl.coupa_id, rl.number, rl.type, rl.supplier, rl.department_name, rl.amount,
      rl.status, rl.date, rl.due_date, rl.header_memo,
      acu2.FULL_NAME AS for_employee
  FROM req_latest rl
  JOIN req_pending_for rp ON rp.REQUISITION_HEADER_ID = rl.req_id
  JOIN allowed_coupa_users acu2 ON acu2.USER_ID = rp.for_user_id
  , norm p
  WHERE 1=1
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = acu2.USER_ID
                                    OR su.name_norm = UPPER(TRIM(acu2.FULL_NAME))))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(rl.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(rl.status)) = st.val))
    AND (p.cost_centers IS NULL OR EXISTS (SELECT 1 FROM flt_cost_centers cc WHERE UPPER(TRIM(rl.department_name)) = cc.val))
    AND (p.min_amount IS NULL OR rl.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR rl.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE rl.number ILIKE '%%' || n.part || '%%'))
),
inv_pending AS (
  SELECT
      il.coupa_id, il.number, il.type, il.supplier, il.department_name, il.amount,
      il.status, il.date, il.due_date, il.header_memo,
      acu2.FULL_NAME AS for_employee
  FROM inv_latest il
  JOIN inv_pending_for ip ON ip.INVOICE_HEADER_ID = il.coupa_id
  JOIN allowed_coupa_users acu2 ON acu2.USER_ID = ip.for_user_id
  , norm p
  WHERE 1=1
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = acu2.USER_ID
                                    OR su.name_norm = UPPER(TRIM(acu2.FULL_NAME))))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(il.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(il.status)) = st.val))
    AND (p.min_amount IS NULL OR il.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR il.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE il.number ILIKE '%%' || n.part || '%%'))
),

/* Final visible rows (dedup per header & employee) */
results AS (
  SELECT
    coupa_id AS "Coupa ID",
    number   AS "Number",
    type     AS "Type",
    supplier AS "Supplier",
    department_name AS "DEPARTMENT_NAME",
    amount   AS "Amount",
    status   AS "Status",
    date     AS "Date",
    due_date AS "Due Date",
    header_memo AS "HEADER_MEMO",
    for_employee AS "For_Employee"
  FROM (
    SELECT * FROM req_created
    UNION ALL SELECT * FROM req_pending
    UNION ALL SELECT * FROM po_created
    UNION ALL SELECT * FROM po_pending
    UNION ALL SELECT * FROM inv_created
    UNION ALL SELECT * FROM inv_pending
  )
  QUALIFY ROW_NUMBER() OVER (PARTITION BY "Type","Coupa ID","For_Employee" ORDER BY "Date" DESC) = 1
)

/* ---------- COUNTS ---------- */
SELECT
  COUNT_IF("Type" = 'Purchase Order')          AS purchase_orders_count,
  COUNT_IF("Type" = 'Invoice')                 AS invoices_count,
  COUNT_IF("Type" = 'Requisition')             AS requisitions_count,
  COUNT_IF(UPPER(TRIM("Status")) LIKE 'PENDING%%') AS pending_approval_count
FROM results;
'''

COUPA_TRANSACTIONS_FILTER_OPTIONS = '''
/* ===================== COUPA — ONE TABLE OF UNIQUE FILTER OPTIONS (RBAC + days_back + optional types) ===================== */
WITH
params AS (
  SELECT
      %s::INT                              AS days_back,
      %s::STRING AS viewer_email,
      %s::INT                                AS viewer_role,   -- 0=admin, 1/2/3=normal
      PARSE_JSON('[]')::VARIANT             AS types          -- NULL or [] => all; e.g. PARSE_JSON('["Purchase Orders"]')
),
norm AS (
  SELECT days_back, viewer_email, viewer_role,
         IFF(types IS NULL OR ARRAY_SIZE(types)=0, NULL, types) AS types
  FROM params
),
/* RBAC */
mgr AS (
  SELECT IFF(COUNT_IF(h.HIERARCHY_LEVEL >= 1) > 0, 1, 0) AS has_reports
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p
  WHERE LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
),
allowed_people AS (
  SELECT d.EMAIL AS email, d.FULL_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE d, norm p
  WHERE p.viewer_role = 0 AND COALESCE(d.IS_ACTIVE, TRUE)
  UNION
  SELECT DISTINCT h.REPORTEE_EMAIL AS email, h.REPORTEE_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 1
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email) AND h.HIERARCHY_LEVEL >= 0
  UNION
  SELECT DISTINCT h.REPORTEE_EMAIL AS email, h.REPORTEE_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 0
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email) AND h.HIERARCHY_LEVEL = 0
),
allowed_coupa_users AS (
  SELECT u.USER_ID, u.FULL_NAME, LOWER(u.EMAIL) AS email
  FROM dim_coupa_user u
  JOIN allowed_people a ON LOWER(a.email) = LOWER(u.EMAIL)
),
member_groups AS (
  SELECT DISTINCT g.GROUP_ID, g.USER_ID
  FROM dim_coupa_approval_groups g
  JOIN allowed_coupa_users acu ON acu.USER_ID = g.USER_ID
),
req_pending_for AS (
  SELECT DISTINCT rpa.REQUISITION_HEADER_ID, COALESCE(acu.USER_ID, mg.USER_ID) AS for_user_id
  FROM mrt_coupa_requisition_pending_approvers rpa
  LEFT JOIN allowed_coupa_users acu ON rpa.APPROVER_TYPE='USER' AND rpa.USER_OR_GROUP_ID=acu.USER_ID
  LEFT JOIN member_groups mg       ON rpa.APPROVER_TYPE='APPROVAL_GROUP' AND rpa.USER_OR_GROUP_ID=mg.GROUP_ID
  WHERE acu.USER_ID IS NOT NULL OR mg.USER_ID IS NOT NULL
),
inv_pending_for AS (
  SELECT DISTINCT ipa.INVOICE_HEADER_ID, COALESCE(acu.USER_ID, mg.USER_ID) AS for_user_id
  FROM mrt_coupa_invoice_pending_approvers ipa
  LEFT JOIN allowed_coupa_users acu ON ipa.APPROVER_TYPE='USER' AND ipa.USER_OR_GROUP_ID=acu.USER_ID
  LEFT JOIN member_groups mg       ON ipa.APPROVER_TYPE='APPROVAL_GROUP' AND ipa.USER_OR_GROUP_ID=mg.GROUP_ID
  WHERE acu.USER_ID IS NOT NULL OR mg.USER_ID IS NOT NULL
),
/* Optional type filter normalization */
raw_type_vals AS (SELECT DISTINCT t.value::string AS raw_val FROM norm p, LATERAL FLATTEN(input => p.types) t),
flt_type AS (
  SELECT type_key FROM (
    SELECT DISTINCT
      CASE
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('PURCHASE ORDER','PURCHASE ORDERS','PO','POS','PURCHASEORDER','PURCHASEORDERS') THEN 'Purchase Order'
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('INVOICE','INVOICES','INV') THEN 'Invoice'
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('REQUISITION','REQUISITIONS','REQ','REQS') THEN 'Requisition'
      END AS type_key
    FROM raw_type_vals
  ) s WHERE type_key IS NOT NULL
),
/* Latest headers per ID (date window + optional type) */
po_latest AS (
  SELECT
      ol.ORDER_HEADER_ID AS coupa_id,
      CAST(ol.ORDER_HEADER_ID AS STRING) AS number,
      'Purchase Order' AS type,
      ol.SUPPLIER_NAME AS supplier,
      ol.LINE_DEPARTMENT_NAME AS department_name,
      ol.LINE_INVOICED_AMOUNT AS amount,
      ol.ORDER_HEADER_STATUS AS status,
      ol.ORDER_CREATED_AT_UTC AS date,
      NULL::TIMESTAMP AS due_date,
      ol.LINE_DESCRIPTION AS header_memo,
      ol.REQUISITION_HEADER_ID AS req_id,
      ol.HEADER_CREATED_BY_ID AS created_by_id,
      ol.HEADER_CREATED_BY_NAME AS created_by_name
  FROM mrt_coupa_p2p_order_line ol, norm p
  WHERE ol.ORDER_CREATED_AT_UTC >= DATEADD(DAY, -p.days_back, CURRENT_DATE)
    AND (p.types IS NULL OR EXISTS (SELECT 1 FROM flt_type ft WHERE ft.type_key='Purchase Order'))
  QUALIFY ROW_NUMBER() OVER (PARTITION BY ol.ORDER_HEADER_ID ORDER BY ol.ORDER_CREATED_AT_UTC DESC, ol.LINE_ID DESC)=1
),
req_latest AS (
  SELECT
      rl.REQUISITION_HEADER_ID AS coupa_id,
      CAST(rl.REQUISITION_HEADER_ID AS STRING) AS number,
      'Requisition' AS type,
      cs.NAME AS supplier,
      rl.DEPARTMENT_NAME AS department_name,
      rl.TOTAL_AMOUNT AS amount,
      rl.HEADER_STATUS AS status,
      rl.REQUISITION_CREATED_AT_UTC AS date,
      NULL::TIMESTAMP AS due_date,
      COALESCE(rl.HEADER_JUSTIFICATION, rl.LINE_DESCRIPTION) AS header_memo,
      rl.REQUISITION_HEADER_ID AS req_id,
      rl.REQUESTED_BY_ID AS created_by_id
  FROM mrt_coupa_p2p_requisition_line rl
  LEFT JOIN dim_coupa_supplier cs ON cs.supplier_id = rl.supplier_id, norm p
  WHERE rl.REQUISITION_CREATED_AT_UTC >= DATEADD(DAY, -p.days_back, CURRENT_DATE)
    AND (p.types IS NULL OR EXISTS (SELECT 1 FROM flt_type ft WHERE ft.type_key='Requisition'))
  QUALIFY ROW_NUMBER() OVER (PARTITION BY rl.REQUISITION_HEADER_ID ORDER BY rl.REQUISITION_CREATED_AT_UTC DESC, rl.REQUISITION_HEADER_ID DESC)=1
),
inv_latest AS (
  SELECT
      il.INVOICE_HEADER_ID AS coupa_id,
      il.INVOICE_NUMBER AS number,
      'Invoice' AS type,
      MAX(il.SUPPLIER_NAME)  OVER (PARTITION BY il.INVOICE_HEADER_ID) AS supplier,
      NULL::STRING AS department_name,
      COALESCE(MAX(il.INVOICE_AMOUNT) OVER (PARTITION BY il.INVOICE_HEADER_ID),
               SUM(il.LINE_AMOUNT)   OVER (PARTITION BY il.INVOICE_HEADER_ID)) AS amount,
      MAX(il.STATUS)            OVER (PARTITION BY il.INVOICE_HEADER_ID) AS status,
      MIN(il.LINE_CREATED_AT_UTC) OVER (PARTITION BY il.INVOICE_HEADER_ID) AS date,
      NULL::TIMESTAMP AS due_date,
      MAX(il.LINE_DESCRIPTION) OVER (PARTITION BY il.INVOICE_HEADER_ID) AS header_memo,
      NULL::NUMBER AS req_id,
      MAX(il.HEADER_CREATED_BY_ID)   OVER (PARTITION BY il.INVOICE_HEADER_ID) AS created_by_id,
      MAX(il.HEADER_CREATED_BY_NAME) OVER (PARTITION BY il.INVOICE_HEADER_ID) AS created_by_name
  FROM mrt_coupa_p2p_invoice_line il, norm p
  WHERE il.LINE_CREATED_AT_UTC >= DATEADD(DAY, -p.days_back, CURRENT_DATE)
    AND (p.types IS NULL OR EXISTS (SELECT 1 FROM flt_type ft WHERE ft.type_key='Invoice'))
  QUALIFY ROW_NUMBER() OVER (PARTITION BY il.INVOICE_HEADER_ID ORDER BY il.LINE_CREATED_AT_UTC DESC, il.LINE_ID DESC)=1
),
/* Visibility */
po_created AS (
  SELECT pl.*, COALESCE(acu.FULL_NAME, ap.full_name) AS for_employee
  FROM po_latest pl
  LEFT JOIN allowed_coupa_users acu ON pl.created_by_id = acu.USER_ID
  LEFT JOIN allowed_people      ap  ON UPPER(TRIM(pl.created_by_name)) = UPPER(TRIM(ap.full_name))
  WHERE acu.USER_ID IS NOT NULL OR ap.full_name IS NOT NULL
),
req_created AS (SELECT rl.*, acu.FULL_NAME AS for_employee FROM req_latest rl JOIN allowed_coupa_users acu ON rl.created_by_id = acu.USER_ID),
inv_created AS (
  SELECT il.*, COALESCE(acu.FULL_NAME, ap.full_name) AS for_employee
  FROM inv_latest il
  LEFT JOIN allowed_coupa_users acu ON il.created_by_id = acu.USER_ID
  LEFT JOIN allowed_people      ap  ON UPPER(TRIM(il.created_by_name)) = UPPER(TRIM(ap.full_name))
  WHERE acu.USER_ID IS NOT NULL OR ap.full_name IS NOT NULL
),
po_pending  AS (SELECT pl.*, acu2.FULL_NAME AS for_employee FROM po_latest  pl JOIN req_pending_for rp ON rp.REQUISITION_HEADER_ID = pl.req_id JOIN allowed_coupa_users acu2 ON acu2.USER_ID = rp.for_user_id),
req_pending AS (SELECT rl.*, acu2.FULL_NAME AS for_employee FROM req_latest rl JOIN req_pending_for rp ON rp.REQUISITION_HEADER_ID = rl.req_id JOIN allowed_coupa_users acu2 ON acu2.USER_ID = rp.for_user_id),
inv_pending AS (SELECT il.*, acu2.FULL_NAME AS for_employee FROM inv_latest il JOIN inv_pending_for ip ON ip.INVOICE_HEADER_ID = il.coupa_id JOIN allowed_coupa_users acu2 ON acu2.USER_ID = ip.for_user_id),
/* Fixed-shape union + dedupe */
unioned AS (
  SELECT coupa_id, number, type, supplier, department_name, amount, status, date, due_date, header_memo, for_employee FROM req_created
  UNION ALL SELECT coupa_id, number, type, supplier, department_name, amount, status, date, due_date, header_memo, for_employee FROM req_pending
  UNION ALL SELECT coupa_id, number, type, supplier, department_name, amount, status, date, due_date, header_memo, for_employee FROM po_created
  UNION ALL SELECT coupa_id, number, type, supplier, department_name, amount, status, date, due_date, header_memo, for_employee FROM po_pending
  UNION ALL SELECT coupa_id, number, type, supplier, department_name, amount, status, date, due_date, header_memo, for_employee FROM inv_created
  UNION ALL SELECT coupa_id, number, type, supplier, department_name, amount, status, date, due_date, header_memo, for_employee FROM inv_pending
),
results AS (
  SELECT
    coupa_id        AS "Coupa ID",
    number          AS "Number",
    type            AS "Type",
    supplier        AS "Supplier",
    department_name AS "DEPARTMENT_NAME",
    amount          AS "Amount",
    status          AS "Status",
    date            AS "Date",
    due_date        AS "Due Date",
    header_memo     AS "HEADER_MEMO",
    for_employee    AS "For_Employee"
  FROM unioned
  QUALIFY ROW_NUMBER() OVER (PARTITION BY "Type","Coupa ID","For_Employee" ORDER BY "Date" DESC) = 1
),
/* ---- Option sets, returning only 'value' ---- */
user_opts AS (
  SELECT DISTINCT ap.email AS value
  FROM results r
  JOIN allowed_people ap ON UPPER(TRIM(ap.full_name)) = UPPER(TRIM(r."For_Employee"))
),
status_opts AS (
  SELECT DISTINCT UPPER(TRIM("Status")) AS value
  FROM results
  WHERE "Status" IS NOT NULL
),
costcenter_opts AS (
  SELECT DISTINCT UPPER(TRIM("DEPARTMENT_NAME")) AS value
  FROM results
  WHERE "DEPARTMENT_NAME" IS NOT NULL AND LENGTH(TRIM("DEPARTMENT_NAME")) > 0
),
number_opts AS (
  SELECT DISTINCT "Number" AS value
  FROM results
  WHERE "Number" IS NOT NULL
)
/* ---- Unified table (filter_type, value) ---- */
SELECT 'Users'        AS filter_type, value FROM user_opts
UNION ALL
SELECT 'Statuses'     AS filter_type, value FROM status_opts
UNION ALL
SELECT 'Cost Centers' AS filter_type, value FROM costcenter_opts
UNION ALL
SELECT 'Numbers'      AS filter_type, value FROM number_opts
ORDER BY filter_type, value;
'''

COUPA_TRANSACTIONS_QUERY = '''
/* ===================== COUPA — TRANSACTION-LEVEL (ROLE-BASED) + FILTERS =====================

Roles:
  viewer_role = 0  -> admin (see all active employees)
  viewer_role IN (1,2,3) -> normal user
      - manager (has reportees): self + all reportees (all levels)
      - IC (no reportees): self only (level 0)

Optional filters (set NULL or PARSE_JSON('[]') to ignore):
  users         : VARIANT JSON array of names or emails (filters Created-By or Pending Approver)
  suppliers     : VARIANT JSON array of supplier names
  statuses      : VARIANT JSON array of status values
  cost_centers  : VARIANT JSON array matched to DEPARTMENT_NAME (swap if you store true cost center)
  search_numbers: VARIANT JSON array of substrings to match "Number" (ILIKE)
  min_amount    : NUMBER(38,2) minimum amount (inclusive)
  max_amount    : NUMBER(38,2) maximum amount (inclusive)
  types         : VARIANT JSON array of types (Purchase Orders / Invoices / Requisitions)
  days_back     : INT (Last N days)
*/

WITH
/* ---------- Parameters (bind from app) ---------- */
params AS (
  SELECT
      %s::INT                               AS days_back,
      %s::STRING  AS viewer_email,     -- << set the viewer
      %s::INT                                 AS viewer_role,      -- 0=admin, 1/2/3=normal

      /* NULL or [] => no filter */
      PARSE_JSON('[]')::VARIANT              AS users,            -- e.g. PARSE_JSON('["raheel@...","Stanley Cheung"]')
      PARSE_JSON('[]')::VARIANT              AS suppliers,        -- e.g. PARSE_JSON('["Amazon","Oracle"]')
      PARSE_JSON('[]')::VARIANT              AS statuses,         -- e.g. PARSE_JSON('["Pending Approval","Approved"]')
      PARSE_JSON('[]')::VARIANT              AS cost_centers,     -- e.g. PARSE_JSON('["Accounting","R&D"]')
      PARSE_JSON('[]')::VARIANT              AS search_numbers,   -- e.g. PARSE_JSON('["12345","REQ-2024"]')
      NULL::NUMBER                           AS min_amount,       -- set to a number to enable
      NULL::NUMBER                           AS max_amount,       -- set to a number to enable
      PARSE_JSON('[]')::VARIANT              AS types             -- NEW: e.g. PARSE_JSON('["Purchase Orders","Invoices"]')
),

/* Normalize: treat empty arrays as NULL to disable the filter */
norm AS (
  SELECT
    days_back, viewer_email, viewer_role,
    IFF(users          IS NULL OR ARRAY_SIZE(users)         = 0, NULL, users)          AS users,
    IFF(suppliers      IS NULL OR ARRAY_SIZE(suppliers)     = 0, NULL, suppliers)      AS suppliers,
    IFF(statuses       IS NULL OR ARRAY_SIZE(statuses)      = 0, NULL, statuses)       AS statuses,
    IFF(cost_centers   IS NULL OR ARRAY_SIZE(cost_centers)  = 0, NULL, cost_centers)   AS cost_centers,
    IFF(search_numbers IS NULL OR ARRAY_SIZE(search_numbers)= 0, NULL, search_numbers) AS search_numbers,
    min_amount, max_amount,
    IFF(types         IS NULL OR ARRAY_SIZE(types)          = 0, NULL, types)          AS types
  FROM params
),

/* Is viewer a manager? (any reportees in closure) */
mgr AS (
  SELECT IFF(COUNT_IF(h.HIERARCHY_LEVEL >= 1) > 0, 1, 0) AS has_reports
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p
  WHERE LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
),

/* Who the viewer may see (Name/Email authority set) */
allowed_people AS (
  /* Admin: everyone active */
  SELECT d.EMAIL AS email, d.FULL_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE d, norm p
  WHERE p.viewer_role = 0 AND COALESCE(d.IS_ACTIVE, TRUE)

  UNION
  /* Normal user w/ reports: self + all reportees (levels >= 0) */
  SELECT DISTINCT h.REPORTEE_EMAIL AS email, h.REPORTEE_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 1
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL >= 0

  UNION
  /* Normal user w/o reports: self only (level 0) */
  SELECT DISTINCT h.REPORTEE_EMAIL AS email, h.REPORTEE_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 0
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL = 0
),

/* Email -> Coupa USER_ID mapping for allowed people (RBAC base) */
allowed_coupa_users AS (
  SELECT u.USER_ID, u.FULL_NAME, LOWER(u.EMAIL) AS email
  FROM dim_coupa_user u
  JOIN allowed_people a ON LOWER(a.email) = LOWER(u.EMAIL)
),

/* Groups the allowed users are in (for pending approver GROUP cases) */
member_groups AS (
  SELECT DISTINCT g.GROUP_ID, g.USER_ID
  FROM dim_coupa_approval_groups g
  JOIN allowed_coupa_users acu ON acu.USER_ID = g.USER_ID
),

/* Reqs pending for any allowed user (direct or via their groups) */
req_pending_for AS (
  SELECT DISTINCT
      rpa.REQUISITION_HEADER_ID,
      COALESCE(acu.USER_ID, mg.USER_ID) AS for_user_id
  FROM mrt_coupa_requisition_pending_approvers rpa
  LEFT JOIN allowed_coupa_users acu
    ON rpa.APPROVER_TYPE = 'USER' AND rpa.USER_OR_GROUP_ID = acu.USER_ID
  LEFT JOIN member_groups mg
    ON rpa.APPROVER_TYPE = 'APPROVAL_GROUP' AND rpa.USER_OR_GROUP_ID = mg.GROUP_ID
  WHERE acu.USER_ID IS NOT NULL OR mg.USER_ID IS NOT NULL
),

/* Invoices pending for any allowed user (direct or via their groups) */
inv_pending_for AS (
  SELECT DISTINCT
      ipa.INVOICE_HEADER_ID,
      COALESCE(acu.USER_ID, mg.USER_ID) AS for_user_id
  FROM mrt_coupa_invoice_pending_approvers ipa
  LEFT JOIN allowed_coupa_users acu
    ON ipa.APPROVER_TYPE = 'USER' AND ipa.USER_OR_GROUP_ID = acu.USER_ID
  LEFT JOIN member_groups mg
    ON ipa.APPROVER_TYPE = 'APPROVAL_GROUP' AND ipa.USER_OR_GROUP_ID = mg.GROUP_ID
  WHERE acu.USER_ID IS NOT NULL OR mg.USER_ID IS NOT NULL
),

/* ---------- Flattened filters (normalized) ---------- */
flt_suppliers AS (
  SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val
  FROM norm p, LATERAL FLATTEN(input => p.suppliers) f
),
flt_statuses AS (
  SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val
  FROM norm p, LATERAL FLATTEN(input => p.statuses) f
),
flt_cost_centers AS (
  SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val
  FROM norm p, LATERAL FLATTEN(input => p.cost_centers) f
),
flt_numbers AS (
  SELECT DISTINCT TRIM(f.value::string) AS part
  FROM norm p, LATERAL FLATTEN(input => p.search_numbers) f
),

/* Users filter: flatten separately, then map emails -> Coupa USER_ID; also keep name-norms */
raw_user_vals AS (
  SELECT DISTINCT u.value::string AS raw_val
  FROM norm p, LATERAL FLATTEN(input => p.users) u
),
sel_users AS (
  /* Match by email */
  SELECT DISTINCT cu.USER_ID, UPPER(TRIM(cu.FULL_NAME)) AS name_norm
  FROM raw_user_vals r
  JOIN dim_coupa_user cu ON LOWER(cu.EMAIL) = LOWER(r.raw_val)
  UNION
  /* Or by full name (case-insensitive exact) */
  SELECT DISTINCT cu.USER_ID, UPPER(TRIM(cu.FULL_NAME)) AS name_norm
  FROM raw_user_vals r
  JOIN dim_coupa_user cu ON UPPER(TRIM(cu.FULL_NAME)) = UPPER(TRIM(r.raw_val))
),

/* ---------- NEW: Type filter (normalize to canonical: Purchase Order | Invoice | Requisition) ---------- */
raw_type_vals AS (
  SELECT DISTINCT t.value::string AS raw_val
  FROM norm p, LATERAL FLATTEN(input => p.types) t
),
flt_type AS (
  SELECT type_key
  FROM (
    SELECT DISTINCT
      CASE
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('PURCHASE ORDER','PURCHASE ORDERS','PO','POS','PURCHASEORDER','PURCHASEORDERS')
          THEN 'Purchase Order'
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('INVOICE','INVOICES','INV')
          THEN 'Invoice'
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('REQUISITION','REQUISITIONS','REQ','REQS')
          THEN 'Requisition'
      END AS type_key
    FROM raw_type_vals
  ) s
  WHERE type_key IS NOT NULL
),

/* ---------- Latest per header (date window only; apply type filter early per leg) ---------- */
po_latest AS (
  SELECT
      ol.ORDER_HEADER_ID                               AS coupa_id,
      CAST(ol.ORDER_HEADER_ID AS STRING)               AS number,
      'Purchase Order'                                 AS type,
      ol.SUPPLIER_NAME                                 AS supplier,
      ol.LINE_DEPARTMENT_NAME                          AS department_name,
      ol.LINE_INVOICED_AMOUNT                          AS amount,
      ol.ORDER_HEADER_STATUS                           AS status,
      ol.ORDER_CREATED_AT_UTC                          AS date,
      NULL::TIMESTAMP                                  AS due_date,
      ol.LINE_DESCRIPTION                              AS header_memo,
      ol.REQUISITION_HEADER_ID                         AS req_id,
      ol.HEADER_CREATED_BY_ID                          AS created_by_id,
      ol.HEADER_CREATED_BY_NAME                        AS created_by_name
  FROM mrt_coupa_p2p_order_line ol, norm p
  WHERE ol.ORDER_CREATED_AT_UTC >= DATEADD(DAY, -p.days_back, CURRENT_DATE)
    AND (p.types IS NULL OR EXISTS (SELECT 1 FROM flt_type ft WHERE ft.type_key = 'Purchase Order'))
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY ol.ORDER_HEADER_ID
    ORDER BY ol.ORDER_CREATED_AT_UTC DESC, ol.LINE_ID DESC
  ) = 1
),
req_latest AS (
  SELECT
      rl.REQUISITION_HEADER_ID                         AS coupa_id,
      CAST(rl.REQUISITION_HEADER_ID AS STRING)         AS number,
      'Requisition'                                    AS type,
      cs.NAME                                          AS supplier,
      rl.DEPARTMENT_NAME                               AS department_name,
      rl.TOTAL_AMOUNT                                  AS amount,
      rl.HEADER_STATUS                                 AS status,
      rl.REQUISITION_CREATED_AT_UTC                    AS date,
      NULL::TIMESTAMP                                  AS due_date,
      COALESCE(rl.HEADER_JUSTIFICATION, rl.LINE_DESCRIPTION) AS header_memo,
      rl.REQUISITION_HEADER_ID                         AS req_id,
      rl.REQUESTED_BY_ID                               AS created_by_id
  FROM mrt_coupa_p2p_requisition_line rl
  LEFT JOIN dim_coupa_supplier cs ON cs.supplier_id = rl.supplier_id, norm p
  WHERE rl.REQUISITION_CREATED_AT_UTC >= DATEADD(DAY, -p.days_back, CURRENT_DATE)
    AND (p.types IS NULL OR EXISTS (SELECT 1 FROM flt_type ft WHERE ft.type_key = 'Requisition'))
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY rl.REQUISITION_HEADER_ID
    ORDER BY rl.REQUISITION_CREATED_AT_UTC DESC, rl.REQUISITION_HEADER_ID DESC
  ) = 1
),
inv_latest AS (
  SELECT
      il.INVOICE_HEADER_ID                                AS coupa_id,
      il.INVOICE_NUMBER                                   AS number,
      'Invoice'                                           AS type,
      MAX(il.SUPPLIER_NAME)  OVER (PARTITION BY il.INVOICE_HEADER_ID)            AS supplier,
      NULL::STRING                                        AS department_name,
      COALESCE(MAX(il.INVOICE_AMOUNT) OVER (PARTITION BY il.INVOICE_HEADER_ID),
               SUM(il.LINE_AMOUNT)   OVER (PARTITION BY il.INVOICE_HEADER_ID))    AS amount,
      MAX(il.STATUS)            OVER (PARTITION BY il.INVOICE_HEADER_ID)          AS status,
      MIN(il.LINE_CREATED_AT_UTC) OVER (PARTITION BY il.INVOICE_HEADER_ID)        AS date,
      NULL::TIMESTAMP                                     AS due_date,
      MAX(il.LINE_DESCRIPTION) OVER (PARTITION BY il.INVOICE_HEADER_ID)           AS header_memo,
      NULL::NUMBER                                        AS req_id,
      MAX(il.HEADER_CREATED_BY_ID)   OVER (PARTITION BY il.INVOICE_HEADER_ID)     AS created_by_id,
      MAX(il.HEADER_CREATED_BY_NAME) OVER (PARTITION BY il.INVOICE_HEADER_ID)     AS created_by_name
  FROM mrt_coupa_p2p_invoice_line il, norm p
  WHERE il.LINE_CREATED_AT_UTC >= DATEADD(DAY, -p.days_back, CURRENT_DATE)
    AND (p.types IS NULL OR EXISTS (SELECT 1 FROM flt_type ft WHERE ft.type_key = 'Invoice'))
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY il.INVOICE_HEADER_ID
    ORDER BY il.LINE_CREATED_AT_UTC DESC, il.LINE_ID DESC
  ) = 1
),

/* ---------- Visibility: CREATED (ID or Name) + Filters ---------- */
po_created AS (
  SELECT
      pl.coupa_id, pl.number, pl.type, pl.supplier, pl.department_name, pl.amount,
      pl.status, pl.date, pl.due_date, pl.header_memo,
      COALESCE(acu.FULL_NAME, ap.full_name) AS for_employee
  FROM po_latest pl
  LEFT JOIN allowed_coupa_users acu ON pl.created_by_id = acu.USER_ID
  LEFT JOIN allowed_people ap ON UPPER(TRIM(pl.created_by_name)) = UPPER(TRIM(ap.full_name))
  , norm p
  WHERE (acu.USER_ID IS NOT NULL OR ap.full_name IS NOT NULL)
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = pl.created_by_id
                                    OR su.name_norm = UPPER(TRIM(pl.created_by_name))))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(pl.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(pl.status)) = st.val))
    AND (p.cost_centers IS NULL OR EXISTS (SELECT 1 FROM flt_cost_centers cc WHERE UPPER(TRIM(pl.department_name)) = cc.val))
    AND (p.min_amount IS NULL OR pl.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR pl.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE pl.number ILIKE '%%' || n.part || '%%'))
),
req_created AS (
  SELECT
      rl.coupa_id, rl.number, rl.type, rl.supplier, rl.department_name, rl.amount,
      rl.status, rl.date, rl.due_date, rl.header_memo,
      acu.FULL_NAME AS for_employee
  FROM req_latest rl
  JOIN allowed_coupa_users acu ON rl.created_by_id = acu.USER_ID
  , norm p
  WHERE 1=1
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = rl.created_by_id))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(rl.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(rl.status)) = st.val))
    AND (p.cost_centers IS NULL OR EXISTS (SELECT 1 FROM flt_cost_centers cc WHERE UPPER(TRIM(rl.department_name)) = cc.val))
    AND (p.min_amount IS NULL OR rl.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR rl.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE rl.number ILIKE '%%' || n.part || '%%'))
),
inv_created AS (
  SELECT
      il.coupa_id, il.number, il.type, il.supplier, il.department_name, il.amount,
      il.status, il.date, il.due_date, il.header_memo,
      COALESCE(acu.FULL_NAME, ap.full_name) AS for_employee
  FROM inv_latest il
  LEFT JOIN allowed_coupa_users acu ON il.created_by_id = acu.USER_ID
  LEFT JOIN allowed_people ap ON UPPER(TRIM(il.created_by_name)) = UPPER(TRIM(ap.full_name))
  , norm p
  WHERE (acu.USER_ID IS NOT NULL OR ap.full_name IS NOT NULL)
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = il.created_by_id
                                    OR su.name_norm = UPPER(TRIM(il.created_by_name))))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(il.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(il.status)) = st.val))
    AND (p.min_amount IS NULL OR il.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR il.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE il.number ILIKE '%%' || n.part || '%%'))
),

/* ---------- Visibility: PENDING approver (USER / GROUP) + Filters ---------- */
po_pending AS (
  SELECT
      pl.coupa_id, pl.number, pl.type, pl.supplier, pl.department_name, pl.amount,
      pl.status, pl.date, pl.due_date, pl.header_memo,
      acu2.FULL_NAME AS for_employee
  FROM po_latest pl
  JOIN req_pending_for rp ON rp.REQUISITION_HEADER_ID = pl.req_id
  JOIN allowed_coupa_users acu2 ON acu2.USER_ID = rp.for_user_id
  , norm p
  WHERE 1=1
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = acu2.USER_ID
                                    OR su.name_norm = UPPER(TRIM(acu2.FULL_NAME))))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(pl.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(pl.status)) = st.val))
    AND (p.cost_centers IS NULL OR EXISTS (SELECT 1 FROM flt_cost_centers cc WHERE UPPER(TRIM(pl.department_name)) = cc.val))
    AND (p.min_amount IS NULL OR pl.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR pl.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE pl.number ILIKE '%%' || n.part || '%%'))
),
req_pending AS (
  SELECT
      rl.coupa_id, rl.number, rl.type, rl.supplier, rl.department_name, rl.amount,
      rl.status, rl.date, rl.due_date, rl.header_memo,
      acu2.FULL_NAME AS for_employee
  FROM req_latest rl
  JOIN req_pending_for rp ON rp.REQUISITION_HEADER_ID = rl.req_id
  JOIN allowed_coupa_users acu2 ON acu2.USER_ID = rp.for_user_id
  , norm p
  WHERE 1=1
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = acu2.USER_ID
                                    OR su.name_norm = UPPER(TRIM(acu2.FULL_NAME))))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(rl.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(rl.status)) = st.val))
    AND (p.cost_centers IS NULL OR EXISTS (SELECT 1 FROM flt_cost_centers cc WHERE UPPER(TRIM(rl.department_name)) = cc.val))
    AND (p.min_amount IS NULL OR rl.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR rl.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE rl.number ILIKE '%%' || n.part || '%%'))
),
inv_pending AS (
  SELECT
      il.coupa_id, il.number, il.type, il.supplier, il.department_name, il.amount,
      il.status, il.date, il.due_date, il.header_memo,
      acu2.FULL_NAME AS for_employee
  FROM inv_latest il
  JOIN inv_pending_for ip ON ip.INVOICE_HEADER_ID = il.coupa_id
  JOIN allowed_coupa_users acu2 ON acu2.USER_ID = ip.for_user_id
  , norm p
  WHERE 1=1
    AND (p.users IS NULL OR EXISTS (SELECT 1 FROM sel_users su WHERE su.USER_ID = acu2.USER_ID
                                    OR su.name_norm = UPPER(TRIM(acu2.FULL_NAME))))
    AND (p.suppliers IS NULL OR EXISTS (SELECT 1 FROM flt_suppliers s WHERE UPPER(TRIM(il.supplier)) = s.val))
    AND (p.statuses  IS NULL OR EXISTS (SELECT 1 FROM flt_statuses st WHERE UPPER(TRIM(il.status)) = st.val))
    AND (p.min_amount IS NULL OR il.amount >= p.min_amount)
    AND (p.max_amount IS NULL OR il.amount <= p.max_amount)
    AND (p.search_numbers IS NULL OR EXISTS (SELECT 1 FROM flt_numbers n WHERE il.number ILIKE '%%' || n.part || '%%'))
)

/* ---------- Final (one row per header per person) ---------- */
SELECT
    coupa_id           AS "Coupa ID",
    number             AS "Number",
    type               AS "Type",
    supplier           AS "Supplier",
    department_name    AS "DEPARTMENT_NAME",
    amount             AS "Amount",
    status             AS "Status",
    date               AS "Date",
    due_date           AS "Due Date",
    header_memo        AS "HEADER_MEMO",
    for_employee       AS "For_Employee",
    COUNT(*) OVER()     AS TOTAL_COUNT
FROM (
  SELECT * FROM req_created
  UNION ALL SELECT * FROM req_pending
  UNION ALL SELECT * FROM po_created
  UNION ALL SELECT * FROM po_pending
  UNION ALL SELECT * FROM inv_created
  UNION ALL SELECT * FROM inv_pending
)
QUALIFY ROW_NUMBER() OVER (
  PARTITION BY "Type","Coupa ID","For_Employee"
  ORDER BY "Date" DESC
) = 1
ORDER BY "Date" DESC, "Type", "Number"  LIMIT %s OFFSET %s;
'''

'''

CONSOLIDATED_COUPA_FINANCIAL_METRICS
[
    {
        "OPEN_PO_COUNT": 0,
        "PENDING_APPROVALS_COUNT": 0,
        "CRITICAL_PO_COUNT": 0,
        "TOTAL_AMOUNT": "8186627.00"
    }
]

CONSOLIDATED_COUPA_METRICS
[
    {
        "OPEN_PO_COUNT": 0,
        "REQUISITION_COUNT": 3,
        "PENDING_APPROVALS_COUNT": 0,
        "CRITICAL_PO_COUNT": 0,
        "REQUISITIONS_TOTAL_AMOUNT": "686626.00"
    }
]

CONSOLIDATED_COUPA_TRENDS
[
    {
        "MONTH_START": "2023-09-01",
        "MONTH_LABEL": "Sep 2023",
        "PO_TOTAL_AMOUNT": 1.0
    },
    {
        "MONTH_START": "2024-05-01",
        "MONTH_LABEL": "May 2024",
        "PO_TOTAL_AMOUNT": 0.0
    }
]


COUPA_DASHBOARD_COSTCENTRE_DISTRIBUTION
[
    {
        "COST_CENTER": "Accounting",
        "TXN_COUNT": 6
    }
]


COUPA_DASHBOARD_DEPARTMENT
[
    {
        "DEPARTMENT": "Accounting",
        "TOTAL_SPEND": "686627.00"
    }
]


COUPA_DASHBOARD_DISTRIBUTION_STATUS
[
    {
        "STATUS": "CLOSED",
        "TXN_COUNT": 3
    },
    {
        "STATUS": "ORDERED",
        "TXN_COUNT": 2
    },
    {
        "STATUS": "DRAFT",
        "TXN_COUNT": 1
    },
    {
        "STATUS": "VOIDED",
        "TXN_COUNT": 1
    }
]


COUPA_DASHBOARD_METRICS
[
    {
        "REQUISITION_AMOUNT_SUM": "686626.00",
        "INVOICE_AMOUNT_SUM": "7500000.00",
        "TOTAL_POS": 3,
        "TOTAL_REQUISITIONS": 3
    }
]

COUPA_DASHBOARD_MONTHLY_TRENDS
[
    {
        "MONTH": "2023-09-01 00:00:00",
        "TXN_COUNT": 1
    },
    {
        "MONTH": "2024-05-01 00:00:00",
        "TXN_COUNT": 5
    },
    {
        "MONTH": "2024-09-01 00:00:00",
        "TXN_COUNT": 1
    }
]


COUPA_TRANSACTIONS_FILTER_OPTIONS (Right)
[
    {
        "FILTER_TYPE": "Cost Centers",
        "VALUE": "ACCOUNTING"
    },
    {
        "FILTER_TYPE": "Numbers",
        "VALUE": "66118"
    },
    {
        "FILTER_TYPE": "Numbers",
        "VALUE": "83308"
    },
    {
        "FILTER_TYPE": "Numbers",
        "VALUE": "83309"
    },
    {
        "FILTER_TYPE": "Numbers",
        "VALUE": "91541"
    },
    {
        "FILTER_TYPE": "Numbers",
        "VALUE": "91719"
    },
    {
        "FILTER_TYPE": "Numbers",
        "VALUE": "93204"
    },
    {
        "FILTER_TYPE": "Statuses",
        "VALUE": "CLOSED"
    },
    {
        "FILTER_TYPE": "Statuses",
        "VALUE": "DRAFT"
    },
    {
        "FILTER_TYPE": "Statuses",
        "VALUE": "ORDERED"
    },
    {
        "FILTER_TYPE": "Statuses",
        "VALUE": "VOIDED"
    },
    {
        "FILTER_TYPE": "Users",
        "VALUE": "raheel.jessani@doordash.com"
    },
    {
        "FILTER_TYPE": "Users",
        "VALUE": "stanley.cheung@doordash.com"
    }
]


COUPA_TRANSACTIONS_METRICS
[
    {
        "PURCHASE_ORDERS_COUNT": 3,
        "INVOICES_COUNT": 1,
        "REQUISITIONS_COUNT": 3,
        "PENDING_APPROVAL_COUNT": 0
    }
]

COUPA_TRANSACTIONS_QUERY
[
    {
        "Coupa ID": 369374,
        "Number": null,
        "Type": "Invoice",
        "Supplier": "B&R Supermarket, Inc.",
        "DEPARTMENT_NAME": null,
        "Amount": 7500000.0,
        "Status": "voided",
        "Date": "2024-09-24 02:00:08",
        "Due Date": null,
        "HEADER_MEMO": "Milam's Market Incentive Payments (2024 Fiscal)",
        "For_Employee": "Raheel Jessani"
    },
    {
        "Coupa ID": 93204,
        "Number": "93204",
        "Type": "Requisition",
        "Supplier": "DocuPhase LLC",
        "DEPARTMENT_NAME": "Accounting",
        "Amount": 207813.0,
        "Status": "draft",
        "Date": "2024-05-31 19:20:38",
        "Due Date": null,
        "HEADER_MEMO": "OCR Processing tool for AP invoice processing",
        "For_Employee": "Raheel Jessani"
    },
    {
        "Coupa ID": 91719,
        "Number": "91719",
        "Type": "Requisition",
        "Supplier": "Public Company Accounting Oversight Board (PCAOB)",
        "DEPARTMENT_NAME": "Accounting",
        "Amount": 271000.0,
        "Status": "ordered",
        "Date": "2024-05-09 17:46:45",
        "Due Date": null,
        "HEADER_MEMO": "2025 PCAOB Issuer Accounting Support Fee",
        "For_Employee": "Raheel Jessani"
    },
    {
        "Coupa ID": 83309,
        "Number": "83309",
        "Type": "Purchase Order",
        "Supplier": "One Time Virtual Card",
        "DEPARTMENT_NAME": "Accounting",
        "Amount": 0.0,
        "Status": "closed",
        "Date": "2024-05-08 03:51:04",
        "Due Date": null,
        "HEADER_MEMO": "Testing CoupaPay (Smoke test #7)",
        "For_Employee": "Stanley Cheung"
    },
    {
        "Coupa ID": 83308,
        "Number": "83308",
        "Type": "Purchase Order",
        "Supplier": "One Time Virtual Card",
        "DEPARTMENT_NAME": "Accounting",
        "Amount": 0.0,
        "Status": "closed",
        "Date": "2024-05-08 03:48:09",
        "Due Date": null,
        "HEADER_MEMO": "Testing CoupaPay (Smoke test #8)",
        "For_Employee": "Stanley Cheung"
    },
    {
        "Coupa ID": 91541,
        "Number": "91541",
        "Type": "Requisition",
        "Supplier": "DocuPhase LLC",
        "DEPARTMENT_NAME": "Accounting",
        "Amount": 207813.0,
        "Status": "ordered",
        "Date": "2024-05-07 22:28:37",
        "Due Date": null,
        "HEADER_MEMO": "OCR Processing tool for AP invoice processing",
        "For_Employee": "Raheel Jessani"
    },
    {
        "Coupa ID": 66118,
        "Number": "66118",
        "Type": "Purchase Order",
        "Supplier": "Amazon Business",
        "DEPARTMENT_NAME": "Accounting",
        "Amount": 1.0,
        "Status": "closed",
        "Date": "2023-09-08 15:01:47",
        "Due Date": null,
        "HEADER_MEMO": "MICR Check Position Gauge",
        "For_Employee": "Raheel Jessani"
    }
]

'''


'''NETSUITE_TRANSACTIONS_QUERY =
/* ===================== NETSUITE — TRANSACTION-LEVEL (ROLE-BASED) =====================

Roles:
  viewer_role = 0  -> admin (see all active employees)
  viewer_role IN (1,2,3) -> normal user
      - if viewer has reportees -> self + all reportees (all levels)
      - else -> self only (level 0)

Outputs (single unified schema):
  "NetSuite ID","Number","Type","Vendor","Subsidiary","Location","Amount",
  "Status","Date","Due Date","DEPARTMENT_NAME","HEADER_MEMO","For_Employee"
*/

WITH
params AS (
  SELECT
      %s::INT AS days_back,
      %s::STRING AS viewer_email,  -- << set the viewer
      %s::INT AS viewer_role   -- 0=admin, 1/2/3=normal user
),

/* Is viewer a manager? */
mgr AS (
  SELECT IFF(COUNT_IF(h.HIERARCHY_LEVEL >= 1) > 0, 1, 0) AS has_reports
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, params p
  WHERE LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
),

/* Who the viewer may see (Name/Email authority set) */
allowed_people AS (
  /* Admin: everyone active */
  SELECT d.EMAIL AS email, d.FULL_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE d, params p
  WHERE p.viewer_role = 0 AND COALESCE(d.IS_ACTIVE, TRUE)

  UNION
  /* Normal user w/ reports: self + all reportees */
  SELECT DISTINCT h.REPORTEE_EMAIL AS email, h.REPORTEE_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, params p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 1
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL >= 0

  UNION
  /* Normal user w/o reports: self only */
  SELECT DISTINCT h.REPORTEE_EMAIL AS email, h.REPORTEE_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, params p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 0
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL = 0
),

/* ---------- Latest per header ---------- */
po_latest AS (
  SELECT
      t.PO_INTERNAL_ID                    AS internal_id,
      t.PO_NUMBER                         AS number,
      'Purchase Order'                    AS type,
      t.VENDOR_NAME                       AS vendor,
      t.SUBSIDIARY_NAME                   AS subsidiary,
      t.LOCATION_NAME                     AS location,
      t.TOTAL_AMOUNT                      AS amount,
      t.PO_STATUS                         AS status,
      t.TRANSACTION_DATE                  AS date,
      t.RECEIVE_BY_DATE                   AS due_date,
      t.DEPARTMENT_NAME                   AS department_name,
      t.HEADER_MEMO                       AS header_memo,
      t.PO_CREATED_BY_FULL_NAME           AS created_by_name,
      t.NEXT_APPROVER_NAME                AS next_approver_name
  FROM mrt_netsuite2_p2p_po_transaction_details t, params p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY t.PO_INTERNAL_ID
    ORDER BY t.TRANSACTION_CREATED_DATE_UTC DESC, t.LINE_ID DESC
  ) = 1
),
bill_lines AS (
  SELECT t.BILL_INTERNAL_ID, SUM(COALESCE(t.ITEM_LINE_AMOUNT,0)) AS calc_bill_amount
  FROM mrt_netsuite2_p2p_bill_transaction_details t, params p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
  GROUP BY 1
),
bill_latest AS (
  SELECT
      t.BILL_INTERNAL_ID                   AS internal_id,
      t.BILL_NUMBER                        AS number,
      'Vendor Bill'                        AS type,
      t.VENDOR_NAME                        AS vendor,
      t.SUBSIDIARY_NAME                    AS subsidiary,
      t.LOCATION_NAME                      AS location,
      COALESCE(t.BILL_AMOUNT, bl.calc_bill_amount) AS amount,
      t.BILL_STATUS                        AS status,
      t.BILL_DATE                          AS date,
      t.DUE_DATE                           AS due_date,
      t.DEPARTMENT_NAME                    AS department_name,
      t.HEADER_MEMO                        AS header_memo,
      t.BILL_CREATED_BY_FULL_NAME          AS created_by_name,
      t.NEXT_APPROVER_NAME                 AS next_approver_name
  FROM mrt_netsuite2_p2p_bill_transaction_details t
  LEFT JOIN bill_lines bl ON bl.BILL_INTERNAL_ID = t.BILL_INTERNAL_ID, params p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY t.BILL_INTERNAL_ID
    ORDER BY t.TRANSACTION_CREATED_DATE_UTC DESC, t.LINE_ID DESC
  ) = 1
),
pay_latest AS (
  SELECT
      t.PAYMENT_INTERNAL_ID                AS internal_id,
      t.PAYMENT_NUMBER                     AS number,
      'Bill Payment'                       AS type,
      t.VENDOR_NAME                        AS vendor,
      t.SUBSIDIARY_NAME                    AS subsidiary,
      NULL                                 AS location,
      t.TOTAL_AMOUNT                       AS amount,
      t.PAYMENT_STATUS                     AS status,
      t.PAYMENT_DATE                       AS date,
      NULL::TIMESTAMP                      AS due_date,
      NULL::STRING                         AS department_name,
      t.HEADER_MEMO                        AS header_memo,
      t.PAYMENT_CREATED_BY_FULL_NAME       AS created_by_name,
      t.NEXT_APPROVER_NAME                 AS next_approver_name
  FROM mrt_netsuite2_p2p_billpayment_transaction_details t, params p
  WHERE t.PAYMENT_DATE >= DATEADD(day, -p.days_back, CURRENT_DATE)
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY t.PAYMENT_INTERNAL_ID
    ORDER BY t.PAYMENT_DATE DESC, t.PAYMENT_NUMBER DESC
  ) = 1
),

/* ---------- Visibility: Created (by Name) ---------- */
created_visible AS (
  SELECT
      l.internal_id, l.number, l.type, l.vendor, l.subsidiary, l.location,
      l.amount, l.status, l.date, l.due_date, l.department_name, l.header_memo,
      ap.full_name AS for_employee
  FROM (
    SELECT * FROM po_latest
    UNION ALL SELECT * FROM bill_latest
    UNION ALL SELECT * FROM pay_latest
  ) l
  JOIN allowed_people ap
    ON UPPER(TRIM(l.created_by_name)) = UPPER(TRIM(ap.full_name))
),

/* ---------- Visibility: Pending (by Name, status like '%%Pending%%') ---------- */
pending_visible AS (
  SELECT
      l.internal_id, l.number, l.type, l.vendor, l.subsidiary, l.location,
      l.amount, l.status, l.date, l.due_date, l.department_name, l.header_memo,
      ap.full_name AS for_employee
  FROM (
    SELECT * FROM po_latest   WHERE status ILIKE '%%Pending%%'
    UNION ALL SELECT * FROM bill_latest WHERE status ILIKE '%%Pending%%'
    UNION ALL SELECT * FROM pay_latest  WHERE status ILIKE '%%Pending%%'
  ) l
  JOIN allowed_people ap
    ON UPPER(TRIM(l.next_approver_name)) = UPPER(TRIM(ap.full_name))
)

/* ---------- Final (one row per header per person) ---------- */
SELECT
    internal_id          AS "NetSuite ID",
    number               AS "Number",
    type                 AS "Type",
    vendor               AS "Vendor",
    subsidiary           AS "Subsidiary",
    location             AS "Location",
    amount               AS "Amount",
    status               AS "Status",
    date                 AS "Date",
    due_date             AS "Due Date",
    department_name      AS "DEPARTMENT_NAME",
    header_memo          AS "HEADER_MEMO",
    for_employee         AS "For_Employee",
    COUNT(*) OVER()      AS TOTAL_COUNT
FROM (
  SELECT * FROM created_visible
  UNION ALL
  SELECT * FROM pending_visible
)
QUALIFY ROW_NUMBER() OVER (
  PARTITION BY "Type","NetSuite ID","For_Employee"
  ORDER BY "Date" DESC
) = 1
ORDER BY "Date" DESC, "Type", "Number" LIMIT %s OFFSET %s;
'''

CONSOLIDATED_NETSUITE_FINANCIAL_METRICS = '''
/* ===================== NETSUITE ROLL-UP (SINGLE ROW) ===================== */
WITH
params AS (
  SELECT 
      %s::INT AS days_back,
      %s::STRING AS viewer_email,
      %s::INT AS viewer_role   -- 0=admin, 1/2/3=normal user
),
mgr AS (
  SELECT IFF(COUNT_IF(h.HIERARCHY_LEVEL >= 1) > 0, 1, 0) AS has_reports
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, params p
  WHERE LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
),
allowed_people AS (
  SELECT d.EMAIL, d.FULL_NAME
  FROM DIM_WORKDAY_EMPLOYEE d, params p
  WHERE p.viewer_role = 0 AND COALESCE(d.IS_ACTIVE, TRUE)
  UNION
  SELECT DISTINCT h.REPORTEE_EMAIL, h.REPORTEE_NAME
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, params p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 1
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email) AND h.HIERARCHY_LEVEL >= 0
  UNION
  SELECT DISTINCT h.REPORTEE_EMAIL, h.REPORTEE_NAME
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, params p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 0
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email) AND h.HIERARCHY_LEVEL = 0
),
po_latest AS (
  SELECT 'Purchase Order' AS type, t.PO_STATUS AS status, t.TRANSACTION_DATE AS date,
         t.RECEIVE_BY_DATE AS due_date, t.TOTAL_AMOUNT AS amount,
         t.PO_CREATED_BY_FULL_NAME AS created_by_name, t.NEXT_APPROVER_NAME AS next_approver_name
  FROM mrt_netsuite2_p2p_po_transaction_details t, params p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
  QUALIFY ROW_NUMBER() OVER (PARTITION BY t.PO_INTERNAL_ID
                             ORDER BY t.TRANSACTION_CREATED_DATE_UTC DESC, t.LINE_ID DESC)=1
),
bill_lines AS (
  SELECT t.BILL_INTERNAL_ID, SUM(COALESCE(t.ITEM_LINE_AMOUNT,0)) AS calc_bill_amount
  FROM mrt_netsuite2_p2p_bill_transaction_details t, params p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
  GROUP BY 1
),
bill_latest AS (
  SELECT 'Vendor Bill' AS type, t.BILL_STATUS AS status, t.BILL_DATE AS date,
         t.DUE_DATE AS due_date, COALESCE(t.BILL_AMOUNT, bl.calc_bill_amount) AS amount,
         t.BILL_CREATED_BY_FULL_NAME AS created_by_name, t.NEXT_APPROVER_NAME AS next_approver_name
  FROM mrt_netsuite2_p2p_bill_transaction_details t
  LEFT JOIN bill_lines bl ON bl.BILL_INTERNAL_ID=t.BILL_INTERNAL_ID, params p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
  QUALIFY ROW_NUMBER() OVER (PARTITION BY t.BILL_INTERNAL_ID
                             ORDER BY t.TRANSACTION_CREATED_DATE_UTC DESC, t.LINE_ID DESC)=1
),
pay_latest AS (
  SELECT 'Bill Payment' AS type, t.PAYMENT_STATUS AS status, t.PAYMENT_DATE AS date,
         NULL::TIMESTAMP AS due_date, t.TOTAL_AMOUNT AS amount,
         t.PAYMENT_CREATED_BY_FULL_NAME AS created_by_name, t.NEXT_APPROVER_NAME AS next_approver_name
  FROM mrt_netsuite2_p2p_billpayment_transaction_details t, params p
  WHERE t.PAYMENT_DATE >= DATEADD(day, -p.days_back, CURRENT_DATE)
  QUALIFY ROW_NUMBER() OVER (PARTITION BY t.PAYMENT_INTERNAL_ID
                             ORDER BY t.PAYMENT_DATE DESC, t.PAYMENT_NUMBER DESC)=1
),
created_visible AS (
  SELECT type, status, date, due_date, amount
  FROM (SELECT * FROM po_latest UNION ALL SELECT * FROM bill_latest UNION ALL SELECT * FROM pay_latest) l
  JOIN allowed_people ap ON UPPER(TRIM(l.created_by_name)) = UPPER(TRIM(ap.FULL_NAME))
),
pending_visible AS (
  SELECT type, status, date, due_date, amount
  FROM (SELECT * FROM po_latest WHERE status ILIKE '%%Pending%%'
        UNION ALL SELECT * FROM bill_latest WHERE status ILIKE '%%Pending%%'
        UNION ALL SELECT * FROM pay_latest WHERE status ILIKE '%%Pending%%') l
  JOIN allowed_people ap ON UPPER(TRIM(l.next_approver_name)) = UPPER(TRIM(ap.FULL_NAME))
),
results AS (
  SELECT * FROM created_visible
  UNION ALL
  SELECT * FROM pending_visible
)
SELECT
  COUNT_IF(type='Purchase Order' AND NOT (status ILIKE '%%closed%%' OR status ILIKE '%%cancel%%')) AS open_po_count,
  COUNT_IF(status ILIKE '%%pending%%')                                                           AS pending_approvals_count,
  COUNT_IF(type='Vendor Bill'
           AND NOT (status ILIKE '%%paid%%' OR status ILIKE '%%closed%%'
                    OR status ILIKE '%%cancel%%' OR status ILIKE '%%void%%'))                      AS open_bills_count,
  SUM(CASE WHEN type IN ('Purchase Order','Vendor Bill') THEN COALESCE(amount,0) ELSE 0 END)::NUMBER(38,2) AS total_amount
FROM results;
'''

CONSOLIDATED_NETSUITE_TRENDS = '''
/* ===================== NETSUITE — PO TRENDS (MONTHLY SUM) — FIXED ===================== */
/* Reuse the same CTEs as in your METRICS query, up to and including hdr_visible */
WITH
params AS (
  SELECT
      %s::INT                               AS days_back,
      %s::STRING AS viewer_email,  -- << set the viewer
      %s::INT                                AS viewer_role     -- 0=admin, 1/2/3=normal
),
mgr AS (
  SELECT IFF(COUNT_IF(h.HIERARCHY_LEVEL >= 1) > 0, 1, 0) AS has_reports
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, params p
  WHERE LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
),
allowed_people AS (
  SELECT d.EMAIL, d.FULL_NAME
  FROM DIM_WORKDAY_EMPLOYEE d, params p
  WHERE p.viewer_role = 0 AND COALESCE(d.IS_ACTIVE, TRUE)
  UNION
  SELECT DISTINCT h.REPORTEE_EMAIL, h.REPORTEE_NAME
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, params p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 1
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL >= 0
  UNION
  SELECT DISTINCT h.REPORTEE_EMAIL, h.REPORTEE_NAME
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, params p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 0
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL = 0
),

/* ---------- Latest per header ---------- */
po_latest AS (
  SELECT
      t.PO_INTERNAL_ID      AS header_id,
      'PO'                  AS k,
      t.PO_STATUS           AS status,
      t.TRANSACTION_DATE    AS date,
      t.RECEIVE_BY_DATE     AS due_date,
      t.TOTAL_AMOUNT        AS amount,
      t.PO_CREATED_BY_FULL_NAME AS created_by_name,
      t.NEXT_APPROVER_NAME      AS next_approver_name
  FROM mrt_netsuite2_p2p_po_transaction_details t, params p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY t.PO_INTERNAL_ID
    ORDER BY t.TRANSACTION_CREATED_DATE_UTC DESC, t.LINE_ID DESC
  ) = 1
),
bill_lines AS (
  SELECT t.BILL_INTERNAL_ID, SUM(COALESCE(t.ITEM_LINE_AMOUNT,0)) AS calc_bill_amount
  FROM mrt_netsuite2_p2p_bill_transaction_details t, params p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
  GROUP BY 1
),
bill_latest AS (
  SELECT
      t.BILL_INTERNAL_ID    AS header_id,
      'BILL'                AS k,
      t.BILL_STATUS         AS status,
      t.BILL_DATE           AS date,
      t.DUE_DATE            AS due_date,
      COALESCE(t.BILL_AMOUNT, bl.calc_bill_amount) AS amount,
      t.BILL_CREATED_BY_FULL_NAME  AS created_by_name,
      t.NEXT_APPROVER_NAME         AS next_approver_name
  FROM mrt_netsuite2_p2p_bill_transaction_details t
  LEFT JOIN bill_lines bl ON bl.BILL_INTERNAL_ID = t.BILL_INTERNAL_ID, params p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY t.BILL_INTERNAL_ID
    ORDER BY t.TRANSACTION_CREATED_DATE_UTC DESC, t.LINE_ID DESC
  ) = 1
),

/* ---------- Visibility (created + pending) ---------- */
po_created AS (
  SELECT * FROM po_latest  pl
  JOIN   allowed_people ap ON UPPER(TRIM(pl.created_by_name)) = UPPER(TRIM(ap.FULL_NAME))
),
po_pending AS (
  SELECT * FROM po_latest  pl
  JOIN   allowed_people ap ON UPPER(TRIM(pl.next_approver_name)) = UPPER(TRIM(ap.FULL_NAME))
  WHERE  pl.status ILIKE '%%Pending%%'
),
bill_created AS (
  SELECT * FROM bill_latest bl
  JOIN   allowed_people ap ON UPPER(TRIM(bl.created_by_name)) = UPPER(TRIM(ap.FULL_NAME))
),
bill_pending AS (
  SELECT * FROM bill_latest bl
  JOIN   allowed_people ap ON UPPER(TRIM(bl.next_approver_name)) = UPPER(TRIM(ap.FULL_NAME))
  WHERE  bl.status ILIKE '%%Pending%%'
),

/* ---------- Dedup exactly as in metrics ---------- */
po_visible_union   AS (SELECT * FROM po_created   UNION ALL SELECT * FROM po_pending),
po_visible         AS (
  SELECT * FROM po_visible_union
  QUALIFY ROW_NUMBER() OVER (PARTITION BY header_id ORDER BY date DESC) = 1
),
bill_visible_union AS (SELECT * FROM bill_created UNION ALL SELECT * FROM bill_pending),
bill_visible       AS (
  SELECT * FROM bill_visible_union
  QUALIFY ROW_NUMBER() OVER (PARTITION BY header_id ORDER BY date DESC) = 1
),
hdr_visible AS (
  SELECT k, header_id, status, date, due_date, amount FROM po_visible
  UNION ALL
  SELECT k, header_id, status, date, due_date, amount FROM bill_visible
)

/* ---- Monthly PO spend for the line chart (same universe as metrics) ---- */
SELECT
  DATE_TRUNC('month', CAST(date AS DATE))                                    AS month_start,
  TO_VARCHAR(DATE_TRUNC('month', CAST(date AS DATE)), 'Mon YYYY')            AS month_label,
  SUM(CASE WHEN k = 'PO' THEN COALESCE(amount,0) ELSE 0 END)                AS po_total_amount
FROM hdr_visible
GROUP BY 1,2
ORDER BY 1;
'''

CONSOLIDATED_NETSUITE_METRICS = '''
/* ===================== NETSUITE — METRICS (SINGLE ROW) ===================== */
WITH
params AS (
  SELECT
      %s::INT                               AS days_back,
      %s::STRING AS viewer_email,  -- << set the viewer
      %s::INT                                AS viewer_role     -- 0=admin, 1/2/3=normal
),
/* Is viewer a manager? */
mgr AS (
  SELECT IFF(COUNT_IF(h.HIERARCHY_LEVEL >= 1) > 0, 1, 0) AS has_reports
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, params p
  WHERE LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
),
/* Allowed people (RBAC via Workday) */
allowed_people AS (
  /* Admin: everyone active */
  SELECT d.EMAIL, d.FULL_NAME
  FROM DIM_WORKDAY_EMPLOYEE d, params p
  WHERE p.viewer_role = 0 AND COALESCE(d.IS_ACTIVE, TRUE)

  UNION
  /* Normal user w/ reports: self + all reportees */
  SELECT DISTINCT h.REPORTEE_EMAIL, h.REPORTEE_NAME
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, params p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 1
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL >= 0

  UNION
  /* Normal user w/o reports: self only */
  SELECT DISTINCT h.REPORTEE_EMAIL, h.REPORTEE_NAME
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, params p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 0
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL = 0
),

/* ---------- Latest per header ---------- */
po_latest AS (
  SELECT
      t.PO_INTERNAL_ID                    AS header_id,
      'Purchase Order'                    AS type,
      t.PO_STATUS                         AS status,
      t.TRANSACTION_DATE                  AS date,
      t.RECEIVE_BY_DATE                   AS due_date,
      t.TOTAL_AMOUNT                      AS amount,
      t.PO_CREATED_BY_FULL_NAME           AS created_by_name,
      t.NEXT_APPROVER_NAME                AS next_approver_name
  FROM mrt_netsuite2_p2p_po_transaction_details t, params p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY t.PO_INTERNAL_ID
    ORDER BY t.TRANSACTION_CREATED_DATE_UTC DESC, t.LINE_ID DESC
  ) = 1
),
bill_lines AS (
  SELECT t.BILL_INTERNAL_ID, SUM(COALESCE(t.ITEM_LINE_AMOUNT,0)) AS calc_bill_amount
  FROM mrt_netsuite2_p2p_bill_transaction_details t, params p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
  GROUP BY 1
),
bill_latest AS (
  SELECT
      t.BILL_INTERNAL_ID                   AS header_id,
      'Vendor Bill'                        AS type,
      t.BILL_STATUS                        AS status,
      t.BILL_DATE                          AS date,
      t.DUE_DATE                           AS due_date,
      COALESCE(t.BILL_AMOUNT, bl.calc_bill_amount) AS amount,
      t.BILL_CREATED_BY_FULL_NAME          AS created_by_name,
      t.NEXT_APPROVER_NAME                 AS next_approver_name
  FROM mrt_netsuite2_p2p_bill_transaction_details t
  LEFT JOIN bill_lines bl ON bl.BILL_INTERNAL_ID = t.BILL_INTERNAL_ID, params p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY t.BILL_INTERNAL_ID
    ORDER BY t.TRANSACTION_CREATED_DATE_UTC DESC, t.LINE_ID DESC
  ) = 1
),

/* ---------- Visibility: Created (by name) ---------- */
po_created AS (
  SELECT pl.header_id, pl.status, pl.date, pl.due_date, pl.amount
  FROM po_latest pl
  JOIN allowed_people ap
    ON UPPER(TRIM(pl.created_by_name)) = UPPER(TRIM(ap.FULL_NAME))
),
bill_created AS (
  SELECT bl.header_id, bl.status, bl.date, bl.due_date, bl.amount
  FROM bill_latest bl
  JOIN allowed_people ap
    ON UPPER(TRIM(bl.created_by_name)) = UPPER(TRIM(ap.FULL_NAME))
),

/* ---------- Visibility: Pending (by name + status like 'Pending%%') ---------- */
po_pending AS (
  SELECT pl.header_id, pl.status, pl.date, pl.due_date, pl.amount
  FROM po_latest pl
  JOIN allowed_people ap
    ON UPPER(TRIM(pl.next_approver_name)) = UPPER(TRIM(ap.FULL_NAME))
  WHERE pl.status ILIKE '%%Pending%%'
),
bill_pending AS (
  SELECT bl.header_id, bl.status, bl.date, bl.due_date, bl.amount
  FROM bill_latest bl
  JOIN allowed_people ap
    ON UPPER(TRIM(bl.next_approver_name)) = UPPER(TRIM(ap.FULL_NAME))
  WHERE bl.status ILIKE '%%Pending%%'
),

/* ---------- Dedup visible headers ---------- */
po_visible_union AS (SELECT * FROM po_created UNION ALL SELECT * FROM po_pending),
po_visible AS (
  SELECT * FROM po_visible_union
  QUALIFY ROW_NUMBER() OVER (PARTITION BY header_id ORDER BY date DESC) = 1
),
bill_visible_union AS (SELECT * FROM bill_created UNION ALL SELECT * FROM bill_pending),
bill_visible AS (
  SELECT * FROM bill_visible_union
  QUALIFY ROW_NUMBER() OVER (PARTITION BY header_id ORDER BY date DESC) = 1
),

/* For "Pending Approval PO" specifically (dedup only pending POs) */
po_pending_distinct AS (
  SELECT * FROM po_pending
  QUALIFY ROW_NUMBER() OVER (PARTITION BY header_id ORDER BY date DESC) = 1
),

/* For total amount (PO + Bill) */
hdr_visible AS (
  SELECT 'PO' AS k, header_id, status, date, due_date, amount FROM po_visible
  UNION ALL
  SELECT 'BILL', header_id, status, date, due_date, amount FROM bill_visible
)

SELECT
  /* Open PO: visible POs that are not closed/canceled */
  COUNT_IF(k = 'PO' AND NOT (status ILIKE '%%closed%%' OR status ILIKE '%%cancel%%'))               AS open_po_count,

  /* Open Bills: visible Bills that are not paid/closed/canceled/void */
  COUNT_IF(k = 'BILL' AND NOT (status ILIKE '%%paid%%' OR status ILIKE '%%closed%%'
                               OR status ILIKE '%%cancel%%' OR status ILIKE '%%void%%'))            AS open_bills_count,

  /* Pending Approval PO: POs where viewer/team is the next approver (dedup) */
  (SELECT COUNT(*) FROM po_pending_distinct)                                                          AS pending_approval_po_count,

  /* Total Amount: PO + Vendor Bill across visible headers */
  SUM(CASE WHEN k IN ('PO','BILL') THEN COALESCE(amount,0) ELSE 0 END)::NUMBER(38,2)                 AS total_amount
FROM hdr_visible;
'''

NETSUITE_DASHBOARD_METRICS = '''
/* ===================== NETSUITE — METRICS (SINGLE ROW) ===================== */
WITH
params AS (
  SELECT
      %s::INT                               AS days_back,
      %s::STRING AS viewer_email,  -- << set the viewer
      %s::INT                                AS viewer_role     -- 0=admin, 1/2/3=normal
),
/* Is viewer a manager? */
mgr AS (
  SELECT IFF(COUNT_IF(h.HIERARCHY_LEVEL >= 1) > 0, 1, 0) AS has_reports
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, params p
  WHERE LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
),
/* Allowed people (RBAC via Workday) */
allowed_people AS (
  /* Admin: everyone active */
  SELECT d.EMAIL, d.FULL_NAME
  FROM DIM_WORKDAY_EMPLOYEE d, params p
  WHERE p.viewer_role = 0 AND COALESCE(d.IS_ACTIVE, TRUE)

  UNION
  /* Normal user w/ reports: self + all reportees */
  SELECT DISTINCT h.REPORTEE_EMAIL, h.REPORTEE_NAME
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, params p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 1
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL >= 0

  UNION
  /* Normal user w/o reports: self only */
  SELECT DISTINCT h.REPORTEE_EMAIL, h.REPORTEE_NAME
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, params p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 0
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL = 0
),

/* ---------- Latest per header ---------- */
po_latest AS (
  SELECT
      t.PO_INTERNAL_ID                    AS header_id,
      'Purchase Order'                    AS type,
      t.PO_STATUS                         AS status,
      t.TRANSACTION_DATE                  AS date,
      t.RECEIVE_BY_DATE                   AS due_date,
      t.TOTAL_AMOUNT                      AS amount,
      t.PO_CREATED_BY_FULL_NAME           AS created_by_name,
      t.NEXT_APPROVER_NAME                AS next_approver_name
  FROM mrt_netsuite2_p2p_po_transaction_details t, params p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY t.PO_INTERNAL_ID
    ORDER BY t.TRANSACTION_CREATED_DATE_UTC DESC, t.LINE_ID DESC
  ) = 1
),
bill_lines AS (
  SELECT t.BILL_INTERNAL_ID, SUM(COALESCE(t.ITEM_LINE_AMOUNT,0)) AS calc_bill_amount
  FROM mrt_netsuite2_p2p_bill_transaction_details t, params p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
  GROUP BY 1
),
bill_latest AS (
  SELECT
      t.BILL_INTERNAL_ID                   AS header_id,
      'Vendor Bill'                        AS type,
      t.BILL_STATUS                        AS status,
      t.BILL_DATE                          AS date,
      t.DUE_DATE                           AS due_date,
      COALESCE(t.BILL_AMOUNT, bl.calc_bill_amount) AS amount,
      t.BILL_CREATED_BY_FULL_NAME          AS created_by_name,
      t.NEXT_APPROVER_NAME                 AS next_approver_name
  FROM mrt_netsuite2_p2p_bill_transaction_details t
  LEFT JOIN bill_lines bl ON bl.BILL_INTERNAL_ID = t.BILL_INTERNAL_ID, params p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY t.BILL_INTERNAL_ID
    ORDER BY t.TRANSACTION_CREATED_DATE_UTC DESC, t.LINE_ID DESC
  ) = 1
),

/* ---------- Visibility: Created (by name) ---------- */
po_created AS (
  SELECT pl.header_id, pl.status, pl.date, pl.due_date, pl.amount
  FROM po_latest pl
  JOIN allowed_people ap
    ON UPPER(TRIM(pl.created_by_name)) = UPPER(TRIM(ap.FULL_NAME))
),
bill_created AS (
  SELECT bl.header_id, bl.status, bl.date, bl.due_date, bl.amount
  FROM bill_latest bl
  JOIN allowed_people ap
    ON UPPER(TRIM(bl.created_by_name)) = UPPER(TRIM(ap.FULL_NAME))
),

/* ---------- Visibility: Pending (by name + status like 'Pending%%') ---------- */
po_pending AS (
  SELECT pl.header_id, pl.status, pl.date, pl.due_date, pl.amount
  FROM po_latest pl
  JOIN allowed_people ap
    ON UPPER(TRIM(pl.next_approver_name)) = UPPER(TRIM(ap.FULL_NAME))
  WHERE pl.status ILIKE '%%Pending%%'
),
bill_pending AS (
  SELECT bl.header_id, bl.status, bl.date, bl.due_date, bl.amount
  FROM bill_latest bl
  JOIN allowed_people ap
    ON UPPER(TRIM(bl.next_approver_name)) = UPPER(TRIM(ap.FULL_NAME))
  WHERE bl.status ILIKE '%%Pending%%'
),

/* ---------- Dedup visible headers ---------- */
po_visible_union AS (SELECT * FROM po_created UNION ALL SELECT * FROM po_pending),
po_visible AS (
  SELECT * FROM po_visible_union
  QUALIFY ROW_NUMBER() OVER (PARTITION BY header_id ORDER BY date DESC) = 1
),
bill_visible_union AS (SELECT * FROM bill_created UNION ALL SELECT * FROM bill_pending),
bill_visible AS (
  SELECT * FROM bill_visible_union
  QUALIFY ROW_NUMBER() OVER (PARTITION BY header_id ORDER BY date DESC) = 1
),

/* For "Pending Approval PO" specifically (dedup only pending POs) */
po_pending_distinct AS (
  SELECT * FROM po_pending
  QUALIFY ROW_NUMBER() OVER (PARTITION BY header_id ORDER BY date DESC) = 1
),

/* For total amount (PO + Bill) */
hdr_visible AS (
  SELECT 'PO' AS k, header_id, status, date, due_date, amount FROM po_visible
  UNION ALL
  SELECT 'BILL', header_id, status, date, due_date, amount FROM bill_visible
)

SELECT
  /* Open PO: visible POs that are not closed/canceled */
  COUNT_IF(k = 'PO' AND NOT (status ILIKE '%%closed%%' OR status ILIKE '%%cancel%%'))               AS open_po_count,

  /* Open Bills: visible Bills that are not paid/closed/canceled/void */
  COUNT_IF(k = 'BILL' AND NOT (status ILIKE '%%paid%%' OR status ILIKE '%%closed%%'
                               OR status ILIKE '%%cancel%%' OR status ILIKE '%%void%%'))            AS open_bills_count,

  /* Pending Approval PO: POs where viewer/team is the next approver (dedup) */
  (SELECT COUNT(*) FROM po_pending_distinct)                                                          AS pending_approval_po_count,

  /* Total Amount: PO + Vendor Bill across visible headers */
  SUM(CASE WHEN k IN ('PO','BILL') THEN COALESCE(amount,0) ELSE 0 END)::NUMBER(38,2)                 AS total_amount
FROM hdr_visible;
'''

NETSUITE_DASHBOARD_MONTHLY_TRENDS = '''
/* ===================== NETSUITE — STATUS DISTRIBUTION (Pie) ===================== */
WITH
/* ---------- Parameters ---------- */
params AS (
  SELECT
      %s::INT                               AS days_back,
      %s::STRING  AS viewer_email,
      %s::INT                                 AS viewer_role,   -- 0=admin, 1/2/3=normal

      /* NULL or [] => no filter */
      PARSE_JSON('[]')::VARIANT              AS subsidiaries,
      PARSE_JSON('[]')::VARIANT              AS vendors,
      PARSE_JSON('[]')::VARIANT              AS locations,
      PARSE_JSON('[]')::VARIANT              AS statuses,
      PARSE_JSON('[]')::VARIANT              AS users,
      PARSE_JSON('[]')::VARIANT              AS types         -- ["Purchase Orders","Bills","Bill Payments"]
),
/* Treat empty arrays as NULL (disable filter) */
norm AS (
  SELECT
    days_back, viewer_email, viewer_role,
    IFF(subsidiaries IS NULL OR ARRAY_SIZE(subsidiaries)=0, NULL, subsidiaries) AS subsidiaries,
    IFF(vendors      IS NULL OR ARRAY_SIZE(vendors)     =0, NULL, vendors)      AS vendors,
    IFF(locations    IS NULL OR ARRAY_SIZE(locations)   =0, NULL, locations)    AS locations,
    IFF(statuses     IS NULL OR ARRAY_SIZE(statuses)    =0, NULL, statuses)     AS statuses,
    IFF(users        IS NULL OR ARRAY_SIZE(users)       =0, NULL, users)        AS users,
    IFF(types        IS NULL OR ARRAY_SIZE(types)       =0, NULL, types)        AS types
  FROM params
),
/* Manager check (for RBAC) */
mgr AS (
  SELECT IFF(COUNT_IF(h.HIERARCHY_LEVEL >= 1) > 0, 1, 0) AS has_reports
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p
  WHERE LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
),
/* RBAC allowed people (Workday) */
allowed_people AS (
  /* Admin: everyone active */
  SELECT d.EMAIL AS email, d.FULL_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE d, norm p
  WHERE p.viewer_role = 0 AND COALESCE(d.IS_ACTIVE, TRUE)

  UNION
  /* Manager: self + all reportees */
  SELECT DISTINCT h.REPORTEE_EMAIL AS email, h.REPORTEE_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 1
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL >= 0

  UNION
  /* IC: self only */
  SELECT DISTINCT h.REPORTEE_EMAIL AS email, h.REPORTEE_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 0
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL = 0
),
/* Flatten filters */
flt_subsidiary AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.subsidiaries) f),
flt_vendor     AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.vendors)      f),
flt_location   AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.locations)    f),
flt_status     AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.statuses)     f),
raw_user_vals  AS (SELECT DISTINCT u.value::string AS raw_val FROM norm p, LATERAL FLATTEN(input => p.users) u),
flt_user_names AS (
  SELECT DISTINCT UPPER(TRIM(COALESCE(w.FULL_NAME, r.raw_val))) AS name_norm
  FROM raw_user_vals r
  LEFT JOIN DIM_WORKDAY_EMPLOYEE w ON LOWER(w.EMAIL) = LOWER(r.raw_val)
),
raw_type_vals AS (SELECT DISTINCT t.value::string AS raw_val FROM norm p, LATERAL FLATTEN(input => p.types) t),
flt_type AS (
  SELECT type_key
  FROM (
    SELECT DISTINCT
      CASE
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('PURCHASE ORDER','PURCHASE ORDERS','PO','POS','PURCHASEORDER','PURCHASEORDERS') THEN 'Purchase Order'
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('VENDOR BILL','VENDOR BILLS','BILL','BILLS','VENDORBILL','VENDORBILLS')         THEN 'Vendor Bill'
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('BILL PAYMENT','BILL PAYMENTS','PAYMENT','PAYMENTS','BILLPAYMENT','BILLPAYMENTS') THEN 'Bill Payment'
      END AS type_key
    FROM raw_type_vals
  ) s
  WHERE type_key IS NOT NULL
),
/* Latest headers (with filters) */
po_latest AS (
  SELECT
      t.PO_INTERNAL_ID AS internal_id, t.PO_NUMBER AS number,
      'Purchase Order' AS type, t.VENDOR_NAME AS vendor,
      t.SUBSIDIARY_NAME AS subsidiary, t.LOCATION_NAME AS location,
      t.TOTAL_AMOUNT AS amount, t.PO_STATUS AS status, UPPER(TRIM(t.PO_STATUS)) AS status_norm,
      t.TRANSACTION_DATE AS date, t.RECEIVE_BY_DATE AS due_date,
      t.DEPARTMENT_NAME AS department_name, t.HEADER_MEMO AS header_memo,
      UPPER(TRIM(t.PO_CREATED_BY_FULL_NAME)) AS created_by_norm,
      UPPER(TRIM(t.NEXT_APPROVER_NAME)) AS next_approver_norm
  FROM mrt_netsuite2_p2p_po_transaction_details t, norm p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
    AND (p.subsidiaries IS NULL OR EXISTS (SELECT 1 FROM flt_subsidiary fs WHERE UPPER(TRIM(t.SUBSIDIARY_NAME)) = fs.val))
    AND (p.vendors      IS NULL OR EXISTS (SELECT 1 FROM flt_vendor     fv WHERE UPPER(TRIM(t.VENDOR_NAME))      = fv.val))
    AND (p.locations    IS NULL OR EXISTS (SELECT 1 FROM flt_location   fl WHERE UPPER(TRIM(t.LOCATION_NAME))    = fl.val))
    AND (p.statuses     IS NULL OR EXISTS (SELECT 1 FROM flt_status     st WHERE UPPER(TRIM(t.PO_STATUS))        = st.val))
    AND (p.types        IS NULL OR EXISTS (SELECT 1 FROM flt_type       ft WHERE ft.type_key = 'Purchase Order'))
  QUALIFY ROW_NUMBER() OVER (PARTITION BY t.PO_INTERNAL_ID ORDER BY t.TRANSACTION_CREATED_DATE_UTC DESC, t.LINE_ID DESC) = 1
),
bill_lines AS (
  SELECT t.BILL_INTERNAL_ID, SUM(COALESCE(t.ITEM_LINE_AMOUNT,0)) AS calc_bill_amount
  FROM mrt_netsuite2_p2p_bill_transaction_details t, norm p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
  GROUP BY 1
),
bill_latest AS (
  SELECT
      t.BILL_INTERNAL_ID AS internal_id, t.BILL_NUMBER AS number,
      'Vendor Bill' AS type, t.VENDOR_NAME AS vendor, t.SUBSIDIARY_NAME AS subsidiary,
      t.LOCATION_NAME AS location, COALESCE(t.BILL_AMOUNT, bl.calc_bill_amount) AS amount,
      t.BILL_STATUS AS status, UPPER(TRIM(t.BILL_STATUS)) AS status_norm,
      t.BILL_DATE AS date, t.DUE_DATE AS due_date, t.DEPARTMENT_NAME AS department_name,
      t.HEADER_MEMO AS header_memo, UPPER(TRIM(t.BILL_CREATED_BY_FULL_NAME)) AS created_by_norm,
      UPPER(TRIM(t.NEXT_APPROVER_NAME)) AS next_approver_norm
  FROM mrt_netsuite2_p2p_bill_transaction_details t
  LEFT JOIN bill_lines bl ON bl.BILL_INTERNAL_ID = t.BILL_INTERNAL_ID, norm p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
    AND (p.subsidiaries IS NULL OR EXISTS (SELECT 1 FROM flt_subsidiary fs WHERE UPPER(TRIM(t.SUBSIDIARY_NAME)) = fs.val))
    AND (p.vendors      IS NULL OR EXISTS (SELECT 1 FROM flt_vendor     fv WHERE UPPER(TRIM(t.VENDOR_NAME))      = fv.val))
    AND (p.locations    IS NULL OR EXISTS (SELECT 1 FROM flt_location   fl WHERE UPPER(TRIM(t.LOCATION_NAME))    = fl.val))
    AND (p.statuses     IS NULL OR EXISTS (SELECT 1 FROM flt_status     st WHERE UPPER(TRIM(t.BILL_STATUS))      = st.val))
    AND (p.types        IS NULL OR EXISTS (SELECT 1 FROM flt_type       ft WHERE ft.type_key = 'Vendor Bill'))
  QUALIFY ROW_NUMBER() OVER (PARTITION BY t.BILL_INTERNAL_ID ORDER BY t.TRANSACTION_CREATED_DATE_UTC DESC, t.LINE_ID DESC) = 1
),
pay_latest AS (
  SELECT
      t.PAYMENT_INTERNAL_ID AS internal_id, t.PAYMENT_NUMBER AS number,
      'Bill Payment' AS type, t.VENDOR_NAME AS vendor, t.SUBSIDIARY_NAME AS subsidiary,
      NULL AS location, t.TOTAL_AMOUNT AS amount, t.PAYMENT_STATUS AS status, UPPER(TRIM(t.PAYMENT_STATUS)) AS status_norm,
      t.PAYMENT_DATE AS date, NULL::TIMESTAMP AS due_date, NULL::STRING AS department_name,
      t.HEADER_MEMO AS header_memo, UPPER(TRIM(t.PAYMENT_CREATED_BY_FULL_NAME)) AS created_by_norm,
      UPPER(TRIM(t.NEXT_APPROVER_NAME)) AS next_approver_norm
  FROM mrt_netsuite2_p2p_billpayment_transaction_details t, norm p
  WHERE t.PAYMENT_DATE >= DATEADD(day, -p.days_back, CURRENT_DATE)
    AND (p.subsidiaries IS NULL OR EXISTS (SELECT 1 FROM flt_subsidiary fs WHERE UPPER(TRIM(t.SUBSIDIARY_NAME)) = fs.val))
    AND (p.vendors      IS NULL OR EXISTS (SELECT 1 FROM flt_vendor     fv WHERE UPPER(TRIM(t.VENDOR_NAME))      = fv.val))
    AND (p.locations    IS NULL OR EXISTS (SELECT 1 FROM flt_location   fl WHERE UPPER(TRIM(COALESCE(t.SUBSIDIARY_NAME,''))) = fl.val)) -- optional
    AND (p.statuses     IS NULL OR EXISTS (SELECT 1 FROM flt_status     st WHERE UPPER(TRIM(t.PAYMENT_STATUS))   = st.val))
    AND (p.types        IS NULL OR EXISTS (SELECT 1 FROM flt_type       ft WHERE ft.type_key = 'Bill Payment'))
  QUALIFY ROW_NUMBER() OVER (PARTITION BY t.PAYMENT_INTERNAL_ID ORDER BY t.PAYMENT_DATE DESC, t.PAYMENT_NUMBER DESC) = 1
),
/* Visibility */
po_created   AS (SELECT l.*, ap.full_name AS for_employee FROM po_latest   l JOIN allowed_people ap ON l.created_by_norm    = UPPER(TRIM(ap.full_name))),
po_pending   AS (SELECT l.*, ap.full_name AS for_employee FROM po_latest   l JOIN allowed_people ap ON l.next_approver_norm = UPPER(TRIM(ap.full_name)) WHERE l.status_norm LIKE 'PENDING%%'),
bill_created AS (SELECT l.*, ap.full_name AS for_employee FROM bill_latest l JOIN allowed_people ap ON l.created_by_norm    = UPPER(TRIM(ap.full_name))),
bill_pending AS (SELECT l.*, ap.full_name AS for_employee FROM bill_latest l JOIN allowed_people ap ON l.next_approver_norm = UPPER(TRIM(ap.full_name)) WHERE l.status_norm LIKE 'PENDING%%'),
pay_created  AS (SELECT l.*, ap.full_name AS for_employee FROM pay_latest  l JOIN allowed_people ap ON l.created_by_norm    = UPPER(TRIM(ap.full_name))),
pay_pending  AS (SELECT l.*, ap.full_name AS for_employee FROM pay_latest  l JOIN allowed_people ap ON l.next_approver_norm = UPPER(TRIM(ap.full_name)) WHERE l.status_norm LIKE 'PENDING%%'),
/* De-duped results (per header per person) */
results AS (
  SELECT
    internal_id AS "NetSuite ID", number AS "Number", type AS "Type",
    vendor AS "Vendor", subsidiary AS "Subsidiary", location AS "Location",
    amount AS "Amount", status AS "Status", date AS "Date", due_date AS "Due Date",
    department_name AS "DEPARTMENT_NAME", header_memo AS "HEADER_MEMO", for_employee AS "For_Employee"
  FROM (
    SELECT * FROM po_created  UNION ALL SELECT * FROM po_pending
    UNION ALL SELECT * FROM bill_created UNION ALL SELECT * FROM bill_pending
    UNION ALL SELECT * FROM pay_created  UNION ALL SELECT * FROM pay_pending
  )
  QUALIFY ROW_NUMBER() OVER (PARTITION BY "Type","NetSuite ID","For_Employee" ORDER BY "Date" DESC) = 1
),
/* Header-level de-dupe (avoid counting same doc multiple times across people) */
hdrs AS (
  SELECT *
  FROM (
    SELECT r.*,
           ROW_NUMBER() OVER (PARTITION BY "Type","NetSuite ID" ORDER BY "Date" DESC) AS rn
    FROM results r
  )
  WHERE rn = 1
)
SELECT
  DATE_TRUNC('month', "Date") AS month,
  COUNT(*)                    AS txn_count
FROM hdrs
GROUP BY 1
ORDER BY 1;
'''

NETSUITE_DASHBOARD_BY_TYPE = '''
/* ===================== NETSUITE — TYPE DISTRIBUTION (PO / Vendor Bill / Bill Payment) ===================== */

WITH
/* ---------- Parameters ---------- */
params AS (
  SELECT
      %s::INT                               AS days_back,
      %s::STRING  AS viewer_email,
      %s::INT                                 AS viewer_role,   -- 0=admin, 1/2/3=normal

      /* NULL or [] => no filter */
      PARSE_JSON('[]')::VARIANT              AS subsidiaries,
      PARSE_JSON('[]')::VARIANT              AS vendors,
      PARSE_JSON('[]')::VARIANT              AS locations,
      PARSE_JSON('[]')::VARIANT              AS statuses,
      PARSE_JSON('[]')::VARIANT              AS users,
      PARSE_JSON('[]')::VARIANT              AS types         -- ["Purchase Orders","Bills","Bill Payments"]
),
/* Treat empty arrays as NULL (disable filter) */
norm AS (
  SELECT
    days_back, viewer_email, viewer_role,
    IFF(subsidiaries IS NULL OR ARRAY_SIZE(subsidiaries)=0, NULL, subsidiaries) AS subsidiaries,
    IFF(vendors      IS NULL OR ARRAY_SIZE(vendors)     =0, NULL, vendors)      AS vendors,
    IFF(locations    IS NULL OR ARRAY_SIZE(locations)   =0, NULL, locations)    AS locations,
    IFF(statuses     IS NULL OR ARRAY_SIZE(statuses)    =0, NULL, statuses)     AS statuses,
    IFF(users        IS NULL OR ARRAY_SIZE(users)       =0, NULL, users)        AS users,
    IFF(types        IS NULL OR ARRAY_SIZE(types)       =0, NULL, types)        AS types
  FROM params
),
/* Manager check (for RBAC) */
mgr AS (
  SELECT IFF(COUNT_IF(h.HIERARCHY_LEVEL >= 1) > 0, 1, 0) AS has_reports
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p
  WHERE LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
),
/* RBAC allowed people (Workday) */
allowed_people AS (
  /* Admin: everyone active */
  SELECT d.EMAIL AS email, d.FULL_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE d, norm p
  WHERE p.viewer_role = 0 AND COALESCE(d.IS_ACTIVE, TRUE)

  UNION
  /* Manager: self + all reportees */
  SELECT DISTINCT h.REPORTEE_EMAIL AS email, h.REPORTEE_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 1
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL >= 0

  UNION
  /* IC: self only */
  SELECT DISTINCT h.REPORTEE_EMAIL AS email, h.REPORTEE_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 0
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL = 0
),
/* Pre-normalize RBAC names once */
allowed_names AS (
  SELECT DISTINCT UPPER(TRIM(full_name)) AS name_norm
  FROM allowed_people
),
/* Flatten filters once (normalized) */
flt_subsidiary AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.subsidiaries) f),
flt_vendor     AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.vendors)      f),
flt_location   AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.locations)    f),
flt_status     AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.statuses)     f),
/* Users filter: flatten separately, then map emails -> Workday names, normalize */
raw_user_vals  AS (SELECT DISTINCT u.value::string AS raw_val FROM norm p, LATERAL FLATTEN(input => p.users) u),
flt_user_names AS (
  SELECT DISTINCT UPPER(TRIM(COALESCE(w.FULL_NAME, r.raw_val))) AS name_norm
  FROM raw_user_vals r
  LEFT JOIN DIM_WORKDAY_EMPLOYEE w ON LOWER(w.EMAIL) = LOWER(r.raw_val)
),
/* Types filter */
raw_type_vals AS (SELECT DISTINCT t.value::string AS raw_val FROM norm p, LATERAL FLATTEN(input => p.types) t),
flt_type AS (
  SELECT type_key
  FROM (
    SELECT DISTINCT
      CASE
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('PURCHASE ORDER','PURCHASE ORDERS','PO','POS','PURCHASEORDER','PURCHASEORDERS') THEN 'Purchase Order'
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('VENDOR BILL','VENDOR BILLS','BILL','BILLS','VENDORBILL','VENDORBILLS')         THEN 'Vendor Bill'
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('BILL PAYMENT','BILL PAYMENTS','PAYMENT','PAYMENTS','BILLPAYMENT','BILLPAYMENTS') THEN 'Bill Payment'
      END AS type_key
    FROM raw_type_vals
  ) s
  WHERE type_key IS NOT NULL
),

/* ========== Latest headers (apply dates & value filters early; normalize names once) ========== */
po_latest AS (
  SELECT
      t.PO_INTERNAL_ID                    AS internal_id,
      t.PO_NUMBER                         AS number,
      'Purchase Order'                    AS type,
      t.VENDOR_NAME                       AS vendor,
      t.SUBSIDIARY_NAME                   AS subsidiary,
      t.LOCATION_NAME                     AS location,
      t.TOTAL_AMOUNT                      AS amount,
      t.PO_STATUS                         AS status,
      UPPER(TRIM(t.PO_STATUS))            AS status_norm,
      t.TRANSACTION_DATE                  AS date,
      t.RECEIVE_BY_DATE                   AS due_date,
      t.DEPARTMENT_NAME                   AS department_name,
      t.HEADER_MEMO                       AS header_memo,
      UPPER(TRIM(t.PO_CREATED_BY_FULL_NAME)) AS created_by_norm,
      UPPER(TRIM(t.NEXT_APPROVER_NAME))      AS next_approver_norm
  FROM mrt_netsuite2_p2p_po_transaction_details t, norm p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
    AND (p.subsidiaries IS NULL OR EXISTS (SELECT 1 FROM flt_subsidiary fs WHERE UPPER(TRIM(t.SUBSIDIARY_NAME)) = fs.val))
    AND (p.vendors      IS NULL OR EXISTS (SELECT 1 FROM flt_vendor     fv WHERE UPPER(TRIM(t.VENDOR_NAME))      = fv.val))
    AND (p.locations    IS NULL OR EXISTS (SELECT 1 FROM flt_location   fl WHERE UPPER(TRIM(t.LOCATION_NAME))    = fl.val))
    AND (p.statuses     IS NULL OR EXISTS (SELECT 1 FROM flt_status     st WHERE UPPER(TRIM(t.PO_STATUS))        = st.val))
    AND (p.types        IS NULL OR EXISTS (SELECT 1 FROM flt_type       ft WHERE ft.type_key = 'Purchase Order'))
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY t.PO_INTERNAL_ID
    ORDER BY t.TRANSACTION_CREATED_DATE_UTC DESC, t.LINE_ID DESC
  ) = 1
),
bill_lines AS (
  SELECT t.BILL_INTERNAL_ID, SUM(COALESCE(t.ITEM_LINE_AMOUNT,0)) AS calc_bill_amount
  FROM mrt_netsuite2_p2p_bill_transaction_details t, norm p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
  GROUP BY 1
),
bill_latest AS (
  SELECT
      t.BILL_INTERNAL_ID                   AS internal_id,
      t.BILL_NUMBER                        AS number,
      'Vendor Bill'                        AS type,
      t.VENDOR_NAME                        AS vendor,
      t.SUBSIDIARY_NAME                    AS subsidiary,
      t.LOCATION_NAME                      AS location,
      COALESCE(t.BILL_AMOUNT, bl.calc_bill_amount) AS amount,
      t.BILL_STATUS                        AS status,
      UPPER(TRIM(t.BILL_STATUS))           AS status_norm,
      t.BILL_DATE                          AS date,
      t.DUE_DATE                           AS due_date,
      t.DEPARTMENT_NAME                    AS department_name,
      t.HEADER_MEMO                        AS header_memo,
      UPPER(TRIM(t.BILL_CREATED_BY_FULL_NAME)) AS created_by_norm,
      UPPER(TRIM(t.NEXT_APPROVER_NAME))        AS next_approver_norm
  FROM mrt_netsuite2_p2p_bill_transaction_details t
  LEFT JOIN bill_lines bl ON bl.BILL_INTERNAL_ID = t.BILL_INTERNAL_ID, norm p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
    AND (p.subsidiaries IS NULL OR EXISTS (SELECT 1 FROM flt_subsidiary fs WHERE UPPER(TRIM(t.SUBSIDIARY_NAME)) = fs.val))
    AND (p.vendors      IS NULL OR EXISTS (SELECT 1 FROM flt_vendor     fv WHERE UPPER(TRIM(t.VENDOR_NAME))      = fv.val))
    AND (p.locations    IS NULL OR EXISTS (SELECT 1 FROM flt_location   fl WHERE UPPER(TRIM(t.LOCATION_NAME))    = fl.val))
    AND (p.statuses     IS NULL OR EXISTS (SELECT 1 FROM flt_status     st WHERE UPPER(TRIM(t.BILL_STATUS))      = st.val))
    AND (p.types        IS NULL OR EXISTS (SELECT 1 FROM flt_type       ft WHERE ft.type_key = 'Vendor Bill'))
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY t.BILL_INTERNAL_ID
    ORDER BY t.TRANSACTION_CREATED_DATE_UTC DESC, t.LINE_ID DESC
  ) = 1
),
pay_latest AS (
  SELECT
      t.PAYMENT_INTERNAL_ID                AS internal_id,
      t.PAYMENT_NUMBER                     AS number,
      'Bill Payment'                       AS type,
      t.VENDOR_NAME                        AS vendor,
      t.SUBSIDIARY_NAME                    AS subsidiary,
      NULL                                 AS location,
      t.TOTAL_AMOUNT                       AS amount,
      t.PAYMENT_STATUS                     AS status,
      UPPER(TRIM(t.PAYMENT_STATUS))        AS status_norm,
      t.PAYMENT_DATE                       AS date,
      NULL::TIMESTAMP                      AS due_date,
      NULL::STRING                         AS department_name,
      t.HEADER_MEMO                        AS header_memo,
      UPPER(TRIM(t.PAYMENT_CREATED_BY_FULL_NAME)) AS created_by_norm,
      UPPER(TRIM(t.NEXT_APPROVER_NAME))           AS next_approver_norm
  FROM mrt_netsuite2_p2p_billpayment_transaction_details t, norm p
  WHERE t.PAYMENT_DATE >= DATEADD(day, -p.days_back, CURRENT_DATE)
    AND (p.subsidiaries IS NULL OR EXISTS (SELECT 1 FROM flt_subsidiary fs WHERE UPPER(TRIM(t.SUBSIDIARY_NAME)) = fs.val))
    AND (p.vendors      IS NULL OR EXISTS (SELECT 1 FROM flt_vendor     fv WHERE UPPER(TRIM(t.VENDOR_NAME))      = fv.val))
    AND (p.locations    IS NULL OR EXISTS (SELECT 1 FROM flt_location   fl WHERE UPPER(TRIM(COALESCE(t.SUBSIDIARY_NAME,''))) = fl.val)) -- optional
    AND (p.statuses     IS NULL OR EXISTS (SELECT 1 FROM flt_status     st WHERE UPPER(TRIM(t.PAYMENT_STATUS))   = st.val))
    AND (p.types        IS NULL OR EXISTS (SELECT 1 FROM flt_type       ft WHERE ft.type_key = 'Bill Payment'))
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY t.PAYMENT_INTERNAL_ID
    ORDER BY t.PAYMENT_DATE DESC, t.PAYMENT_NUMBER DESC
  ) = 1
),
/* ========== Visibility expansion (no ORs; two small branches) ========== */
po_created   AS (SELECT l.*, ap.full_name AS for_employee FROM po_latest   l JOIN allowed_people ap ON l.created_by_norm    = UPPER(TRIM(ap.full_name))),
po_pending   AS (SELECT l.*, ap.full_name AS for_employee FROM po_latest   l JOIN allowed_people ap ON l.next_approver_norm = UPPER(TRIM(ap.full_name)) WHERE l.status_norm LIKE 'PENDING%%'),
bill_created AS (SELECT l.*, ap.full_name AS for_employee FROM bill_latest l JOIN allowed_people ap ON l.created_by_norm    = UPPER(TRIM(ap.full_name))),
bill_pending AS (SELECT l.*, ap.full_name AS for_employee FROM bill_latest l JOIN allowed_people ap ON l.next_approver_norm = UPPER(TRIM(ap.full_name)) WHERE l.status_norm LIKE 'PENDING%%'),
pay_created  AS (SELECT l.*, ap.full_name AS for_employee FROM pay_latest  l JOIN allowed_people ap ON l.created_by_norm    = UPPER(TRIM(ap.full_name))),
pay_pending  AS (SELECT l.*, ap.full_name AS for_employee FROM pay_latest  l JOIN allowed_people ap ON l.next_approver_norm = UPPER(TRIM(ap.full_name)) WHERE l.status_norm LIKE 'PENDING%%'),
/* De-duped visible results (per header per person) */
results AS (
  SELECT
    internal_id AS "NetSuite ID", number AS "Number", type AS "Type",
    vendor AS "Vendor", subsidiary AS "Subsidiary", location AS "Location",
    amount AS "Amount", status AS "Status", date AS "Date", due_date AS "Due Date",
    department_name AS "DEPARTMENT_NAME", header_memo AS "HEADER_MEMO", for_employee AS "For_Employee"
  FROM (
    SELECT * FROM po_created  UNION ALL SELECT * FROM po_pending
    UNION ALL SELECT * FROM bill_created UNION ALL SELECT * FROM bill_pending
    UNION ALL SELECT * FROM pay_created  UNION ALL SELECT * FROM pay_pending
  )
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY "Type","NetSuite ID","For_Employee"
    ORDER BY "Date" DESC
  ) = 1
),
/* Header-level de-dupe for counting once per document */
hdrs AS (
  SELECT *
  FROM (
    SELECT r.*,
           ROW_NUMBER() OVER (PARTITION BY "Type","NetSuite ID" ORDER BY "Date" DESC) AS rn
    FROM results r
  )
  WHERE rn = 1
)
SELECT
  "Type"           AS doc_type,
  COUNT(*)         AS txn_count
FROM hdrs
GROUP BY 1
ORDER BY txn_count DESC, doc_type;
'''

NETSUITE_DASHBOARD_BY_STATUS = '''
/* ===================== NETSUITE — STATUS DISTRIBUTION (Pie) ===================== */
WITH
/* ---------- Parameters ---------- */
params AS (
  SELECT
      %s::INT                               AS days_back,
      %s::STRING  AS viewer_email,
      %s::INT                                 AS viewer_role,   -- 0=admin, 1/2/3=normal

      /* NULL or [] => no filter */
      PARSE_JSON('[]')::VARIANT              AS subsidiaries,
      PARSE_JSON('[]')::VARIANT              AS vendors,
      PARSE_JSON('[]')::VARIANT              AS locations,
      PARSE_JSON('[]')::VARIANT              AS statuses,
      PARSE_JSON('[]')::VARIANT              AS users,
      PARSE_JSON('[]')::VARIANT              AS types         -- ["Purchase Orders","Bills","Bill Payments"]
),
/* Treat empty arrays as NULL (disable filter) */
norm AS (
  SELECT
    days_back, viewer_email, viewer_role,
    IFF(subsidiaries IS NULL OR ARRAY_SIZE(subsidiaries)=0, NULL, subsidiaries) AS subsidiaries,
    IFF(vendors      IS NULL OR ARRAY_SIZE(vendors)     =0, NULL, vendors)      AS vendors,
    IFF(locations    IS NULL OR ARRAY_SIZE(locations)   =0, NULL, locations)    AS locations,
    IFF(statuses     IS NULL OR ARRAY_SIZE(statuses)    =0, NULL, statuses)     AS statuses,
    IFF(users        IS NULL OR ARRAY_SIZE(users)       =0, NULL, users)        AS users,
    IFF(types        IS NULL OR ARRAY_SIZE(types)       =0, NULL, types)        AS types
  FROM params
),
/* Manager check (for RBAC) */
mgr AS (
  SELECT IFF(COUNT_IF(h.HIERARCHY_LEVEL >= 1) > 0, 1, 0) AS has_reports
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p
  WHERE LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
),
/* RBAC allowed people (Workday) */
allowed_people AS (
  /* Admin: everyone active */
  SELECT d.EMAIL AS email, d.FULL_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE d, norm p
  WHERE p.viewer_role = 0 AND COALESCE(d.IS_ACTIVE, TRUE)

  UNION
  /* Manager: self + all reportees */
  SELECT DISTINCT h.REPORTEE_EMAIL AS email, h.REPORTEE_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 1
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL >= 0

  UNION
  /* IC: self only */
  SELECT DISTINCT h.REPORTEE_EMAIL AS email, h.REPORTEE_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 0
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL = 0
),
/* Flatten filters */
flt_subsidiary AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.subsidiaries) f),
flt_vendor     AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.vendors)      f),
flt_location   AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.locations)    f),
flt_status     AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.statuses)     f),
raw_user_vals  AS (SELECT DISTINCT u.value::string AS raw_val FROM norm p, LATERAL FLATTEN(input => p.users) u),
flt_user_names AS (
  SELECT DISTINCT UPPER(TRIM(COALESCE(w.FULL_NAME, r.raw_val))) AS name_norm
  FROM raw_user_vals r
  LEFT JOIN DIM_WORKDAY_EMPLOYEE w ON LOWER(w.EMAIL) = LOWER(r.raw_val)
),
raw_type_vals AS (SELECT DISTINCT t.value::string AS raw_val FROM norm p, LATERAL FLATTEN(input => p.types) t),
flt_type AS (
  SELECT type_key
  FROM (
    SELECT DISTINCT
      CASE
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('PURCHASE ORDER','PURCHASE ORDERS','PO','POS','PURCHASEORDER','PURCHASEORDERS') THEN 'Purchase Order'
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('VENDOR BILL','VENDOR BILLS','BILL','BILLS','VENDORBILL','VENDORBILLS')         THEN 'Vendor Bill'
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('BILL PAYMENT','BILL PAYMENTS','PAYMENT','PAYMENTS','BILLPAYMENT','BILLPAYMENTS') THEN 'Bill Payment'
      END AS type_key
    FROM raw_type_vals
  ) s
  WHERE type_key IS NOT NULL
),
/* Latest headers (with filters) */
po_latest AS (
  SELECT
      t.PO_INTERNAL_ID AS internal_id, t.PO_NUMBER AS number,
      'Purchase Order' AS type, t.VENDOR_NAME AS vendor,
      t.SUBSIDIARY_NAME AS subsidiary, t.LOCATION_NAME AS location,
      t.TOTAL_AMOUNT AS amount, t.PO_STATUS AS status, UPPER(TRIM(t.PO_STATUS)) AS status_norm,
      t.TRANSACTION_DATE AS date, t.RECEIVE_BY_DATE AS due_date,
      t.DEPARTMENT_NAME AS department_name, t.HEADER_MEMO AS header_memo,
      UPPER(TRIM(t.PO_CREATED_BY_FULL_NAME)) AS created_by_norm,
      UPPER(TRIM(t.NEXT_APPROVER_NAME)) AS next_approver_norm
  FROM mrt_netsuite2_p2p_po_transaction_details t, norm p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
    AND (p.subsidiaries IS NULL OR EXISTS (SELECT 1 FROM flt_subsidiary fs WHERE UPPER(TRIM(t.SUBSIDIARY_NAME)) = fs.val))
    AND (p.vendors      IS NULL OR EXISTS (SELECT 1 FROM flt_vendor     fv WHERE UPPER(TRIM(t.VENDOR_NAME))      = fv.val))
    AND (p.locations    IS NULL OR EXISTS (SELECT 1 FROM flt_location   fl WHERE UPPER(TRIM(t.LOCATION_NAME))    = fl.val))
    AND (p.statuses     IS NULL OR EXISTS (SELECT 1 FROM flt_status     st WHERE UPPER(TRIM(t.PO_STATUS))        = st.val))
    AND (p.types        IS NULL OR EXISTS (SELECT 1 FROM flt_type       ft WHERE ft.type_key = 'Purchase Order'))
  QUALIFY ROW_NUMBER() OVER (PARTITION BY t.PO_INTERNAL_ID ORDER BY t.TRANSACTION_CREATED_DATE_UTC DESC, t.LINE_ID DESC) = 1
),
bill_lines AS (
  SELECT t.BILL_INTERNAL_ID, SUM(COALESCE(t.ITEM_LINE_AMOUNT,0)) AS calc_bill_amount
  FROM mrt_netsuite2_p2p_bill_transaction_details t, norm p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
  GROUP BY 1
),
bill_latest AS (
  SELECT
      t.BILL_INTERNAL_ID AS internal_id, t.BILL_NUMBER AS number,
      'Vendor Bill' AS type, t.VENDOR_NAME AS vendor, t.SUBSIDIARY_NAME AS subsidiary,
      t.LOCATION_NAME AS location, COALESCE(t.BILL_AMOUNT, bl.calc_bill_amount) AS amount,
      t.BILL_STATUS AS status, UPPER(TRIM(t.BILL_STATUS)) AS status_norm,
      t.BILL_DATE AS date, t.DUE_DATE AS due_date, t.DEPARTMENT_NAME AS department_name,
      t.HEADER_MEMO AS header_memo, UPPER(TRIM(t.BILL_CREATED_BY_FULL_NAME)) AS created_by_norm,
      UPPER(TRIM(t.NEXT_APPROVER_NAME)) AS next_approver_norm
  FROM mrt_netsuite2_p2p_bill_transaction_details t
  LEFT JOIN bill_lines bl ON bl.BILL_INTERNAL_ID = t.BILL_INTERNAL_ID, norm p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
    AND (p.subsidiaries IS NULL OR EXISTS (SELECT 1 FROM flt_subsidiary fs WHERE UPPER(TRIM(t.SUBSIDIARY_NAME)) = fs.val))
    AND (p.vendors      IS NULL OR EXISTS (SELECT 1 FROM flt_vendor     fv WHERE UPPER(TRIM(t.VENDOR_NAME))      = fv.val))
    AND (p.locations    IS NULL OR EXISTS (SELECT 1 FROM flt_location   fl WHERE UPPER(TRIM(t.LOCATION_NAME))    = fl.val))
    AND (p.statuses     IS NULL OR EXISTS (SELECT 1 FROM flt_status     st WHERE UPPER(TRIM(t.BILL_STATUS))      = st.val))
    AND (p.types        IS NULL OR EXISTS (SELECT 1 FROM flt_type       ft WHERE ft.type_key = 'Vendor Bill'))
  QUALIFY ROW_NUMBER() OVER (PARTITION BY t.BILL_INTERNAL_ID ORDER BY t.TRANSACTION_CREATED_DATE_UTC DESC, t.LINE_ID DESC) = 1
),
pay_latest AS (
  SELECT
      t.PAYMENT_INTERNAL_ID AS internal_id, t.PAYMENT_NUMBER AS number,
      'Bill Payment' AS type, t.VENDOR_NAME AS vendor, t.SUBSIDIARY_NAME AS subsidiary,
      NULL AS location, t.TOTAL_AMOUNT AS amount, t.PAYMENT_STATUS AS status, UPPER(TRIM(t.PAYMENT_STATUS)) AS status_norm,
      t.PAYMENT_DATE AS date, NULL::TIMESTAMP AS due_date, NULL::STRING AS department_name,
      t.HEADER_MEMO AS header_memo, UPPER(TRIM(t.PAYMENT_CREATED_BY_FULL_NAME)) AS created_by_norm,
      UPPER(TRIM(t.NEXT_APPROVER_NAME)) AS next_approver_norm
  FROM mrt_netsuite2_p2p_billpayment_transaction_details t, norm p
  WHERE t.PAYMENT_DATE >= DATEADD(day, -p.days_back, CURRENT_DATE)
    AND (p.subsidiaries IS NULL OR EXISTS (SELECT 1 FROM flt_subsidiary fs WHERE UPPER(TRIM(t.SUBSIDIARY_NAME)) = fs.val))
    AND (p.vendors      IS NULL OR EXISTS (SELECT 1 FROM flt_vendor     fv WHERE UPPER(TRIM(t.VENDOR_NAME))      = fv.val))
    AND (p.locations    IS NULL OR EXISTS (SELECT 1 FROM flt_location   fl WHERE UPPER(TRIM(COALESCE(t.SUBSIDIARY_NAME,''))) = fl.val)) -- optional
    AND (p.statuses     IS NULL OR EXISTS (SELECT 1 FROM flt_status     st WHERE UPPER(TRIM(t.PAYMENT_STATUS))   = st.val))
    AND (p.types        IS NULL OR EXISTS (SELECT 1 FROM flt_type       ft WHERE ft.type_key = 'Bill Payment'))
  QUALIFY ROW_NUMBER() OVER (PARTITION BY t.PAYMENT_INTERNAL_ID ORDER BY t.PAYMENT_DATE DESC, t.PAYMENT_NUMBER DESC) = 1
),
/* Visibility */
po_created   AS (SELECT l.*, ap.full_name AS for_employee FROM po_latest   l JOIN allowed_people ap ON l.created_by_norm    = UPPER(TRIM(ap.full_name))),
po_pending   AS (SELECT l.*, ap.full_name AS for_employee FROM po_latest   l JOIN allowed_people ap ON l.next_approver_norm = UPPER(TRIM(ap.full_name)) WHERE l.status_norm LIKE 'PENDING%%'),
bill_created AS (SELECT l.*, ap.full_name AS for_employee FROM bill_latest l JOIN allowed_people ap ON l.created_by_norm    = UPPER(TRIM(ap.full_name))),
bill_pending AS (SELECT l.*, ap.full_name AS for_employee FROM bill_latest l JOIN allowed_people ap ON l.next_approver_norm = UPPER(TRIM(ap.full_name)) WHERE l.status_norm LIKE 'PENDING%%'),
pay_created  AS (SELECT l.*, ap.full_name AS for_employee FROM pay_latest  l JOIN allowed_people ap ON l.created_by_norm    = UPPER(TRIM(ap.full_name))),
pay_pending  AS (SELECT l.*, ap.full_name AS for_employee FROM pay_latest  l JOIN allowed_people ap ON l.next_approver_norm = UPPER(TRIM(ap.full_name)) WHERE l.status_norm LIKE 'PENDING%%'),
/* De-duped results (per header per person) */
results AS (
  SELECT
    internal_id AS "NetSuite ID", number AS "Number", type AS "Type",
    vendor AS "Vendor", subsidiary AS "Subsidiary", location AS "Location",
    amount AS "Amount", status AS "Status", date AS "Date", due_date AS "Due Date",
    department_name AS "DEPARTMENT_NAME", header_memo AS "HEADER_MEMO", for_employee AS "For_Employee"
  FROM (
    SELECT * FROM po_created  UNION ALL SELECT * FROM po_pending
    UNION ALL SELECT * FROM bill_created UNION ALL SELECT * FROM bill_pending
    UNION ALL SELECT * FROM pay_created  UNION ALL SELECT * FROM pay_pending
  )
  QUALIFY ROW_NUMBER() OVER (PARTITION BY "Type","NetSuite ID","For_Employee" ORDER BY "Date" DESC) = 1
),
/* Header-level de-dupe (avoid counting same doc multiple times across people) */
hdrs AS (
  SELECT *
  FROM (
    SELECT r.*,
           ROW_NUMBER() OVER (PARTITION BY "Type","NetSuite ID" ORDER BY "Date" DESC) AS rn
    FROM results r
  )
  WHERE rn = 1
)
SELECT
  CASE
    WHEN "Status" ILIKE '%%cancel%%'  THEN 'Canceled'
    WHEN "Status" ILIKE '%%close%%'   THEN 'Closed'
    WHEN "Status" ILIKE 'pending%%'  THEN 'Pending'
    ELSE 'Open'
  END AS status_bucket,
  COUNT(*) AS txn_count
FROM hdrs
GROUP BY 1
ORDER BY txn_count DESC;
'''

NETSUITE_DASHBOARD_DEPARTMENT = '''
/* ===================== NETSUITE — STATUS DISTRIBUTION (Pie) ===================== */
WITH
/* ---------- Parameters ---------- */
params AS (
  SELECT
      %s::INT                               AS days_back,
      %s::STRING  AS viewer_email,
      %s::INT                                 AS viewer_role,   -- 0=admin, 1/2/3=normal

      /* NULL or [] => no filter */
      PARSE_JSON('[]')::VARIANT              AS subsidiaries,
      PARSE_JSON('[]')::VARIANT              AS vendors,
      PARSE_JSON('[]')::VARIANT              AS locations,
      PARSE_JSON('[]')::VARIANT              AS statuses,
      PARSE_JSON('[]')::VARIANT              AS users,
      PARSE_JSON('[]')::VARIANT              AS types         -- ["Purchase Orders","Bills","Bill Payments"]
),
/* Treat empty arrays as NULL (disable filter) */
norm AS (
  SELECT
    days_back, viewer_email, viewer_role,
    IFF(subsidiaries IS NULL OR ARRAY_SIZE(subsidiaries)=0, NULL, subsidiaries) AS subsidiaries,
    IFF(vendors      IS NULL OR ARRAY_SIZE(vendors)     =0, NULL, vendors)      AS vendors,
    IFF(locations    IS NULL OR ARRAY_SIZE(locations)   =0, NULL, locations)    AS locations,
    IFF(statuses     IS NULL OR ARRAY_SIZE(statuses)    =0, NULL, statuses)     AS statuses,
    IFF(users        IS NULL OR ARRAY_SIZE(users)       =0, NULL, users)        AS users,
    IFF(types        IS NULL OR ARRAY_SIZE(types)       =0, NULL, types)        AS types
  FROM params
),
/* Manager check (for RBAC) */
mgr AS (
  SELECT IFF(COUNT_IF(h.HIERARCHY_LEVEL >= 1) > 0, 1, 0) AS has_reports
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p
  WHERE LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
),
/* RBAC allowed people (Workday) */
allowed_people AS (
  /* Admin: everyone active */
  SELECT d.EMAIL AS email, d.FULL_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE d, norm p
  WHERE p.viewer_role = 0 AND COALESCE(d.IS_ACTIVE, TRUE)

  UNION
  /* Manager: self + all reportees */
  SELECT DISTINCT h.REPORTEE_EMAIL AS email, h.REPORTEE_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 1
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL >= 0

  UNION
  /* IC: self only */
  SELECT DISTINCT h.REPORTEE_EMAIL AS email, h.REPORTEE_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 0
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL = 0
),
/* Flatten filters */
flt_subsidiary AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.subsidiaries) f),
flt_vendor     AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.vendors)      f),
flt_location   AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.locations)    f),
flt_status     AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.statuses)     f),
raw_user_vals  AS (SELECT DISTINCT u.value::string AS raw_val FROM norm p, LATERAL FLATTEN(input => p.users) u),
flt_user_names AS (
  SELECT DISTINCT UPPER(TRIM(COALESCE(w.FULL_NAME, r.raw_val))) AS name_norm
  FROM raw_user_vals r
  LEFT JOIN DIM_WORKDAY_EMPLOYEE w ON LOWER(w.EMAIL) = LOWER(r.raw_val)
),
raw_type_vals AS (SELECT DISTINCT t.value::string AS raw_val FROM norm p, LATERAL FLATTEN(input => p.types) t),
flt_type AS (
  SELECT type_key
  FROM (
    SELECT DISTINCT
      CASE
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('PURCHASE ORDER','PURCHASE ORDERS','PO','POS','PURCHASEORDER','PURCHASEORDERS') THEN 'Purchase Order'
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('VENDOR BILL','VENDOR BILLS','BILL','BILLS','VENDORBILL','VENDORBILLS')         THEN 'Vendor Bill'
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('BILL PAYMENT','BILL PAYMENTS','PAYMENT','PAYMENTS','BILLPAYMENT','BILLPAYMENTS') THEN 'Bill Payment'
      END AS type_key
    FROM raw_type_vals
  ) s
  WHERE type_key IS NOT NULL
),
/* Latest headers (with filters) */
po_latest AS (
  SELECT
      t.PO_INTERNAL_ID AS internal_id, t.PO_NUMBER AS number,
      'Purchase Order' AS type, t.VENDOR_NAME AS vendor,
      t.SUBSIDIARY_NAME AS subsidiary, t.LOCATION_NAME AS location,
      t.TOTAL_AMOUNT AS amount, t.PO_STATUS AS status, UPPER(TRIM(t.PO_STATUS)) AS status_norm,
      t.TRANSACTION_DATE AS date, t.RECEIVE_BY_DATE AS due_date,
      t.DEPARTMENT_NAME AS department_name, t.HEADER_MEMO AS header_memo,
      UPPER(TRIM(t.PO_CREATED_BY_FULL_NAME)) AS created_by_norm,
      UPPER(TRIM(t.NEXT_APPROVER_NAME)) AS next_approver_norm
  FROM mrt_netsuite2_p2p_po_transaction_details t, norm p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
    AND (p.subsidiaries IS NULL OR EXISTS (SELECT 1 FROM flt_subsidiary fs WHERE UPPER(TRIM(t.SUBSIDIARY_NAME)) = fs.val))
    AND (p.vendors      IS NULL OR EXISTS (SELECT 1 FROM flt_vendor     fv WHERE UPPER(TRIM(t.VENDOR_NAME))      = fv.val))
    AND (p.locations    IS NULL OR EXISTS (SELECT 1 FROM flt_location   fl WHERE UPPER(TRIM(t.LOCATION_NAME))    = fl.val))
    AND (p.statuses     IS NULL OR EXISTS (SELECT 1 FROM flt_status     st WHERE UPPER(TRIM(t.PO_STATUS))        = st.val))
    AND (p.types        IS NULL OR EXISTS (SELECT 1 FROM flt_type       ft WHERE ft.type_key = 'Purchase Order'))
  QUALIFY ROW_NUMBER() OVER (PARTITION BY t.PO_INTERNAL_ID ORDER BY t.TRANSACTION_CREATED_DATE_UTC DESC, t.LINE_ID DESC) = 1
),
bill_lines AS (
  SELECT t.BILL_INTERNAL_ID, SUM(COALESCE(t.ITEM_LINE_AMOUNT,0)) AS calc_bill_amount
  FROM mrt_netsuite2_p2p_bill_transaction_details t, norm p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
  GROUP BY 1
),
bill_latest AS (
  SELECT
      t.BILL_INTERNAL_ID AS internal_id, t.BILL_NUMBER AS number,
      'Vendor Bill' AS type, t.VENDOR_NAME AS vendor, t.SUBSIDIARY_NAME AS subsidiary,
      t.LOCATION_NAME AS location, COALESCE(t.BILL_AMOUNT, bl.calc_bill_amount) AS amount,
      t.BILL_STATUS AS status, UPPER(TRIM(t.BILL_STATUS)) AS status_norm,
      t.BILL_DATE AS date, t.DUE_DATE AS due_date, t.DEPARTMENT_NAME AS department_name,
      t.HEADER_MEMO AS header_memo, UPPER(TRIM(t.BILL_CREATED_BY_FULL_NAME)) AS created_by_norm,
      UPPER(TRIM(t.NEXT_APPROVER_NAME)) AS next_approver_norm
  FROM mrt_netsuite2_p2p_bill_transaction_details t
  LEFT JOIN bill_lines bl ON bl.BILL_INTERNAL_ID = t.BILL_INTERNAL_ID, norm p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
    AND (p.subsidiaries IS NULL OR EXISTS (SELECT 1 FROM flt_subsidiary fs WHERE UPPER(TRIM(t.SUBSIDIARY_NAME)) = fs.val))
    AND (p.vendors      IS NULL OR EXISTS (SELECT 1 FROM flt_vendor     fv WHERE UPPER(TRIM(t.VENDOR_NAME))      = fv.val))
    AND (p.locations    IS NULL OR EXISTS (SELECT 1 FROM flt_location   fl WHERE UPPER(TRIM(t.LOCATION_NAME))    = fl.val))
    AND (p.statuses     IS NULL OR EXISTS (SELECT 1 FROM flt_status     st WHERE UPPER(TRIM(t.BILL_STATUS))      = st.val))
    AND (p.types        IS NULL OR EXISTS (SELECT 1 FROM flt_type       ft WHERE ft.type_key = 'Vendor Bill'))
  QUALIFY ROW_NUMBER() OVER (PARTITION BY t.BILL_INTERNAL_ID ORDER BY t.TRANSACTION_CREATED_DATE_UTC DESC, t.LINE_ID DESC) = 1
),
pay_latest AS (
  SELECT
      t.PAYMENT_INTERNAL_ID AS internal_id, t.PAYMENT_NUMBER AS number,
      'Bill Payment' AS type, t.VENDOR_NAME AS vendor, t.SUBSIDIARY_NAME AS subsidiary,
      NULL AS location, t.TOTAL_AMOUNT AS amount, t.PAYMENT_STATUS AS status, UPPER(TRIM(t.PAYMENT_STATUS)) AS status_norm,
      t.PAYMENT_DATE AS date, NULL::TIMESTAMP AS due_date, NULL::STRING AS department_name,
      t.HEADER_MEMO AS header_memo, UPPER(TRIM(t.PAYMENT_CREATED_BY_FULL_NAME)) AS created_by_norm,
      UPPER(TRIM(t.NEXT_APPROVER_NAME)) AS next_approver_norm
  FROM mrt_netsuite2_p2p_billpayment_transaction_details t, norm p
  WHERE t.PAYMENT_DATE >= DATEADD(day, -p.days_back, CURRENT_DATE)
    AND (p.subsidiaries IS NULL OR EXISTS (SELECT 1 FROM flt_subsidiary fs WHERE UPPER(TRIM(t.SUBSIDIARY_NAME)) = fs.val))
    AND (p.vendors      IS NULL OR EXISTS (SELECT 1 FROM flt_vendor     fv WHERE UPPER(TRIM(t.VENDOR_NAME))      = fv.val))
    AND (p.locations    IS NULL OR EXISTS (SELECT 1 FROM flt_location   fl WHERE UPPER(TRIM(COALESCE(t.SUBSIDIARY_NAME,''))) = fl.val)) -- optional
    AND (p.statuses     IS NULL OR EXISTS (SELECT 1 FROM flt_status     st WHERE UPPER(TRIM(t.PAYMENT_STATUS))   = st.val))
    AND (p.types        IS NULL OR EXISTS (SELECT 1 FROM flt_type       ft WHERE ft.type_key = 'Bill Payment'))
  QUALIFY ROW_NUMBER() OVER (PARTITION BY t.PAYMENT_INTERNAL_ID ORDER BY t.PAYMENT_DATE DESC, t.PAYMENT_NUMBER DESC) = 1
),
/* Visibility */
po_created   AS (SELECT l.*, ap.full_name AS for_employee FROM po_latest   l JOIN allowed_people ap ON l.created_by_norm    = UPPER(TRIM(ap.full_name))),
po_pending   AS (SELECT l.*, ap.full_name AS for_employee FROM po_latest   l JOIN allowed_people ap ON l.next_approver_norm = UPPER(TRIM(ap.full_name)) WHERE l.status_norm LIKE 'PENDING%%'),
bill_created AS (SELECT l.*, ap.full_name AS for_employee FROM bill_latest l JOIN allowed_people ap ON l.created_by_norm    = UPPER(TRIM(ap.full_name))),
bill_pending AS (SELECT l.*, ap.full_name AS for_employee FROM bill_latest l JOIN allowed_people ap ON l.next_approver_norm = UPPER(TRIM(ap.full_name)) WHERE l.status_norm LIKE 'PENDING%%'),
pay_created  AS (SELECT l.*, ap.full_name AS for_employee FROM pay_latest  l JOIN allowed_people ap ON l.created_by_norm    = UPPER(TRIM(ap.full_name))),
pay_pending  AS (SELECT l.*, ap.full_name AS for_employee FROM pay_latest  l JOIN allowed_people ap ON l.next_approver_norm = UPPER(TRIM(ap.full_name)) WHERE l.status_norm LIKE 'PENDING%%'),
/* De-duped results (per header per person) */
results AS (
  SELECT
    internal_id AS "NetSuite ID", number AS "Number", type AS "Type",
    vendor AS "Vendor", subsidiary AS "Subsidiary", location AS "Location",
    amount AS "Amount", status AS "Status", date AS "Date", due_date AS "Due Date",
    department_name AS "DEPARTMENT_NAME", header_memo AS "HEADER_MEMO", for_employee AS "For_Employee"
  FROM (
    SELECT * FROM po_created  UNION ALL SELECT * FROM po_pending
    UNION ALL SELECT * FROM bill_created UNION ALL SELECT * FROM bill_pending
    UNION ALL SELECT * FROM pay_created  UNION ALL SELECT * FROM pay_pending
  )
  QUALIFY ROW_NUMBER() OVER (PARTITION BY "Type","NetSuite ID","For_Employee" ORDER BY "Date" DESC) = 1
),
/* Header-level de-dupe (avoid counting same doc multiple times across people) */
hdrs AS (
  SELECT *
  FROM (
    SELECT r.*,
           ROW_NUMBER() OVER (PARTITION BY "Type","NetSuite ID" ORDER BY "Date" DESC) AS rn
    FROM results r
  )
  WHERE rn = 1
)

/* ===================== NETSUITE — SPEND BY DEPARTMENT (Admin only) ===================== */
/* Copy the same WITH block from the first query up to the hdrs CTE, then: */
SELECT
  "DEPARTMENT_NAME"                 AS department_name,
  SUM(COALESCE("Amount", 0))::NUMBER(38,2) AS total_amount
FROM hdrs, norm p
WHERE p.viewer_role = 0          -- only admins see spend by department
GROUP BY 1
HAVING department_name IS NOT NULL AND LENGTH(TRIM(department_name)) > 0
ORDER BY total_amount DESC;
'''

NETSUITE_TRANSACTIONS_FILTER_OPTIONS = '''
/* ===================== NETSUITE — ONE TABLE OF UNIQUE FILTER OPTIONS (from working transactions base) ===================== */

WITH
/* ---------- Parameters (match your working transactions query) ---------- */
params AS (
  SELECT
      %s::INT                               AS days_back,
      %s::STRING  AS viewer_email,
      %s::INT                                 AS viewer_role,   -- 0=admin, 1/2/3=normal
      /* Optional: limit by types only; NULL/[] = all */
      PARSE_JSON('[]')::VARIANT              AS types          -- e.g. PARSE_JSON('["Purchase Orders","Bills","Bill Payments"]')
),
norm AS (
  SELECT
    days_back, viewer_email, viewer_role,
    IFF(types IS NULL OR ARRAY_SIZE(types)=0, NULL, types) AS types
  FROM params
),

/* ---------- RBAC ---------- */
mgr AS (
  SELECT IFF(COUNT_IF(h.HIERARCHY_LEVEL >= 1) > 0, 1, 0) AS has_reports
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p
  WHERE LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
),
allowed_people AS (
  /* Admin: everyone active */
  SELECT d.EMAIL AS email, d.FULL_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE d, norm p
  WHERE p.viewer_role = 0 AND COALESCE(d.IS_ACTIVE, TRUE)
  UNION
  /* Manager: self + all reportees */
  SELECT DISTINCT h.REPORTEE_EMAIL AS email, h.REPORTEE_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 1
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL >= 0
  UNION
  /* IC: self only */
  SELECT DISTINCT h.REPORTEE_EMAIL AS email, h.REPORTEE_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 0
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL = 0
),
allowed_people_norm AS (
  SELECT DISTINCT UPPER(TRIM(full_name)) AS name_norm, full_name, email
  FROM allowed_people
),

/* ---------- Optional type filter normalization ---------- */
raw_type_vals AS (SELECT DISTINCT t.value::string AS raw_val FROM norm p, LATERAL FLATTEN(input => p.types) t),
flt_type AS (
  SELECT type_key
  FROM (
    SELECT DISTINCT
      CASE
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('PURCHASE ORDER','PURCHASE ORDERS','PO','POS','PURCHASEORDER','PURCHASEORDERS')
          THEN 'Purchase Order'
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('VENDOR BILL','VENDOR BILLS','BILL','BILLS','VENDORBILL','VENDORBILLS')
          THEN 'Vendor Bill'
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('BILL PAYMENT','BILL PAYMENTS','PAYMENT','PAYMENTS','BILLPAYMENT','BILLPAYMENTS')
          THEN 'Bill Payment'
      END AS type_key
    FROM raw_type_vals
  ) s
  WHERE type_key IS NOT NULL
),

/* ---------- Latest rows by header (only date window here) ---------- */
po_latest AS (
  SELECT
      t.PO_INTERNAL_ID                    AS internal_id,
      t.PO_NUMBER                         AS number,
      'Purchase Order'                    AS type,
      t.VENDOR_NAME                       AS vendor,
      t.SUBSIDIARY_NAME                   AS subsidiary,
      t.LOCATION_NAME                     AS location,
      t.TOTAL_AMOUNT                      AS amount,
      t.PO_STATUS                         AS status,
      UPPER(TRIM(t.PO_STATUS))            AS status_norm,
      t.TRANSACTION_DATE                  AS date,
      t.RECEIVE_BY_DATE                   AS due_date,
      t.DEPARTMENT_NAME                   AS department_name,
      t.HEADER_MEMO                       AS header_memo,
      UPPER(TRIM(t.PO_CREATED_BY_FULL_NAME)) AS created_by_norm,
      UPPER(TRIM(t.NEXT_APPROVER_NAME))      AS next_approver_norm
  FROM mrt_netsuite2_p2p_po_transaction_details t, norm p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY t.PO_INTERNAL_ID
    ORDER BY t.TRANSACTION_CREATED_DATE_UTC DESC, t.LINE_ID DESC
  ) = 1
),
bill_lines AS (
  SELECT t.BILL_INTERNAL_ID, SUM(COALESCE(t.ITEM_LINE_AMOUNT,0)) AS calc_bill_amount
  FROM mrt_netsuite2_p2p_bill_transaction_details t, norm p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
  GROUP BY 1
),
bill_latest AS (
  SELECT
      t.BILL_INTERNAL_ID                   AS internal_id,
      t.BILL_NUMBER                        AS number,
      'Vendor Bill'                        AS type,
      t.VENDOR_NAME                        AS vendor,
      t.SUBSIDIARY_NAME                    AS subsidiary,
      t.LOCATION_NAME                      AS location,
      COALESCE(t.BILL_AMOUNT, bl.calc_bill_amount) AS amount,
      t.BILL_STATUS                        AS status,
      UPPER(TRIM(t.BILL_STATUS))           AS status_norm,
      t.BILL_DATE                          AS date,
      t.DUE_DATE                           AS due_date,
      t.DEPARTMENT_NAME                    AS department_name,
      t.HEADER_MEMO                        AS header_memo,
      UPPER(TRIM(t.BILL_CREATED_BY_FULL_NAME)) AS created_by_norm,
      UPPER(TRIM(t.NEXT_APPROVER_NAME))        AS next_approver_norm
  FROM mrt_netsuite2_p2p_bill_transaction_details t
  LEFT JOIN bill_lines bl ON bl.BILL_INTERNAL_ID = t.BILL_INTERNAL_ID, norm p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY t.BILL_INTERNAL_ID
    ORDER BY t.TRANSACTION_CREATED_DATE_UTC DESC, t.LINE_ID DESC
  ) = 1
),
pay_latest AS (
  SELECT
      t.PAYMENT_INTERNAL_ID                AS internal_id,
      t.PAYMENT_NUMBER                     AS number,
      'Bill Payment'                       AS type,
      t.VENDOR_NAME                        AS vendor,
      t.SUBSIDIARY_NAME                    AS subsidiary,
      NULL                                 AS location,
      t.TOTAL_AMOUNT                       AS amount,
      t.PAYMENT_STATUS                     AS status,
      UPPER(TRIM(t.PAYMENT_STATUS))        AS status_norm,
      t.PAYMENT_DATE                       AS date,
      NULL::TIMESTAMP                      AS due_date,
      NULL::STRING                         AS department_name,
      t.HEADER_MEMO                        AS header_memo,
      UPPER(TRIM(t.PAYMENT_CREATED_BY_FULL_NAME)) AS created_by_norm,
      UPPER(TRIM(t.NEXT_APPROVER_NAME))           AS next_approver_norm
  FROM mrt_netsuite2_p2p_billpayment_transaction_details t, norm p
  WHERE t.PAYMENT_DATE >= DATEADD(day, -p.days_back, CURRENT_DATE)
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY t.PAYMENT_INTERNAL_ID
    ORDER BY t.PAYMENT_DATE DESC, t.PAYMENT_NUMBER DESC
  ) = 1
),

/* ---------- Visibility (created + pending) ---------- */
po_created   AS (SELECT l.*, ap.full_name AS for_employee FROM po_latest   l JOIN allowed_people_norm ap ON l.created_by_norm    = ap.name_norm),
po_pending   AS (SELECT l.*, ap.full_name AS for_employee FROM po_latest   l JOIN allowed_people_norm ap ON l.next_approver_norm = ap.name_norm WHERE l.status_norm LIKE 'PENDING%%'),
bill_created AS (SELECT l.*, ap.full_name AS for_employee FROM bill_latest l JOIN allowed_people_norm ap ON l.created_by_norm    = ap.name_norm),
bill_pending AS (SELECT l.*, ap.full_name AS for_employee FROM bill_latest l JOIN allowed_people_norm ap ON l.next_approver_norm = ap.name_norm WHERE l.status_norm LIKE 'PENDING%%'),
pay_created  AS (SELECT l.*, ap.full_name AS for_employee FROM pay_latest  l JOIN allowed_people_norm ap ON l.created_by_norm    = ap.name_norm),
pay_pending  AS (SELECT l.*, ap.full_name AS for_employee FROM pay_latest  l JOIN allowed_people_norm ap ON l.next_approver_norm = ap.name_norm WHERE l.status_norm LIKE 'PENDING%%'),

/* ---------- Union + optional TYPE filter + de-dupe (this mirrors your working query behavior) ---------- */
unioned AS (
  SELECT * FROM po_created   UNION ALL
  SELECT * FROM po_pending   UNION ALL
  SELECT * FROM bill_created UNION ALL
  SELECT * FROM bill_pending UNION ALL
  SELECT * FROM pay_created  UNION ALL
  SELECT * FROM pay_pending
),
unioned_with_type AS (
  SELECT u.*
  FROM unioned u, norm p
  WHERE p.types IS NULL
     OR EXISTS (
          SELECT 1 FROM flt_type ft
          WHERE ft.type_key = u.type
        )
),
results AS (
  SELECT
    internal_id     AS "NetSuite ID",
    number          AS "Number",
    type            AS "Type",
    vendor          AS "Vendor",
    subsidiary      AS "Subsidiary",
    location        AS "Location",
    amount          AS "Amount",
    status          AS "Status",
    date            AS "Date",
    due_date        AS "Due Date",
    department_name AS "DEPARTMENT_NAME",
    header_memo     AS "HEADER_MEMO",
    for_employee    AS "For_Employee"
  FROM unioned_with_type
  QUALIFY ROW_NUMBER() OVER (PARTITION BY "Type","NetSuite ID","For_Employee"
                             ORDER BY "Date" DESC) = 1
),

/* ---------- Dropdown option sets (ONLY value) ---------- */
user_opts AS (
  /* preferred: map names to Workday emails; fallback to allowed_people emails if needed */
  SELECT DISTINCT d.EMAIL AS value
  FROM results r
  JOIN DIM_WORKDAY_EMPLOYEE d
    ON UPPER(TRIM(d.FULL_NAME)) = UPPER(TRIM(r."For_Employee"))
  WHERE d.EMAIL IS NOT NULL AND LENGTH(TRIM(d.EMAIL)) > 0

  UNION

  SELECT DISTINCT ap.email AS value
  FROM results r
  JOIN allowed_people ap
    ON UPPER(TRIM(ap.full_name)) = UPPER(TRIM(r."For_Employee"))
  WHERE ap.email IS NOT NULL AND LENGTH(TRIM(ap.email)) > 0
),
vendor_opts AS (
  SELECT DISTINCT UPPER(TRIM("Vendor")) AS value
  FROM results
  WHERE "Vendor" IS NOT NULL AND LENGTH(TRIM("Vendor")) > 0
),
location_opts AS (
  SELECT DISTINCT UPPER(TRIM("Location")) AS value
  FROM results
  WHERE "Location" IS NOT NULL AND LENGTH(TRIM("Location")) > 0
),
status_opts AS (
  SELECT DISTINCT UPPER(TRIM("Status")) AS value
  FROM results
  WHERE "Status" IS NOT NULL AND LENGTH(TRIM("Status")) > 0
),
subsidiary_opts AS (
  SELECT DISTINCT UPPER(TRIM("Subsidiary")) AS value
  FROM results
  WHERE "Subsidiary" IS NOT NULL AND LENGTH(TRIM("Subsidiary")) > 0
)

/* ---------- Unified output (filter_type, value) ---------- */
SELECT 'Users'        AS filter_type, value FROM user_opts
UNION ALL
SELECT 'Vendors'      AS filter_type, value FROM vendor_opts
UNION ALL
SELECT 'Locations'    AS filter_type, value FROM location_opts
UNION ALL
SELECT 'Statuses'     AS filter_type, value FROM status_opts
UNION ALL
SELECT 'Subsidiaries' AS filter_type, value FROM subsidiary_opts
ORDER BY filter_type, value;
'''

NETSUITE_TRANSACTIONS_METRICS = '''
/* ===================== NETSUITE — COUNTS (ROLE-BASED + FILTERS) ===================== */

WITH
/* ---------- Parameters ---------- */
params AS (
  SELECT
      %s::INT                               AS days_back,
      %s::STRING  AS viewer_email,
      %s::INT                                 AS viewer_role,   -- 0=admin, 1/2/3=normal

      /* NULL or [] => no filter */
      PARSE_JSON('[]')::VARIANT              AS subsidiaries,
      PARSE_JSON('[]')::VARIANT              AS vendors,
      PARSE_JSON('[]')::VARIANT              AS locations,
      PARSE_JSON('[]')::VARIANT              AS statuses,
      PARSE_JSON('[]')::VARIANT              AS users,
      PARSE_JSON('[]')::VARIANT              AS types         -- ["Purchase Orders","Bills","Bill Payments"]
),

/* Treat empty arrays as NULL (disable filter) */
norm AS (
  SELECT
    days_back, viewer_email, viewer_role,
    IFF(subsidiaries IS NULL OR ARRAY_SIZE(subsidiaries)=0, NULL, subsidiaries) AS subsidiaries,
    IFF(vendors      IS NULL OR ARRAY_SIZE(vendors)     =0, NULL, vendors)      AS vendors,
    IFF(locations    IS NULL OR ARRAY_SIZE(locations)   =0, NULL, locations)    AS locations,
    IFF(statuses     IS NULL OR ARRAY_SIZE(statuses)    =0, NULL, statuses)     AS statuses,
    IFF(users        IS NULL OR ARRAY_SIZE(users)       =0, NULL, users)        AS users,
    IFF(types        IS NULL OR ARRAY_SIZE(types)       =0, NULL, types)        AS types
  FROM params
),

/* RBAC: is viewer a manager? */
mgr AS (
  SELECT IFF(COUNT_IF(h.HIERARCHY_LEVEL >= 1) > 0, 1, 0) AS has_reports
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p
  WHERE LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
),

/* RBAC: who the viewer may see */
allowed_people AS (
  /* Admin: everyone active */
  SELECT d.EMAIL AS email, d.FULL_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE d, norm p
  WHERE p.viewer_role = 0 AND COALESCE(d.IS_ACTIVE, TRUE)

  UNION
  /* Manager: self + all reportees */
  SELECT DISTINCT h.REPORTEE_EMAIL AS email, h.REPORTEE_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 1
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL >= 0

  UNION
  /* IC: self only */
  SELECT DISTINCT h.REPORTEE_EMAIL AS email, h.REPORTEE_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 0
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL = 0
),
allowed_names AS (
  SELECT DISTINCT UPPER(TRIM(full_name)) AS name_norm
  FROM allowed_people
),

/* Flatten filters (normalized) */
flt_subsidiary AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.subsidiaries) f),
flt_vendor     AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.vendors)      f),
flt_location   AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.locations)    f),
flt_status     AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.statuses)     f),

/* Users filter → names */
raw_user_vals  AS (SELECT DISTINCT u.value::string AS raw_val FROM norm p, LATERAL FLATTEN(input => p.users) u),
flt_user_names AS (
  SELECT DISTINCT UPPER(TRIM(COALESCE(w.FULL_NAME, r.raw_val))) AS name_norm
  FROM raw_user_vals r
  LEFT JOIN DIM_WORKDAY_EMPLOYEE w ON LOWER(w.EMAIL) = LOWER(r.raw_val)
),

/* Types filter → canonical */
raw_type_vals AS (SELECT DISTINCT t.value::string AS raw_val FROM norm p, LATERAL FLATTEN(input => p.types) t),
flt_type AS (
  SELECT type_key
  FROM (
    SELECT DISTINCT
      CASE
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('PURCHASE ORDER','PURCHASE ORDERS','PO','POS','PURCHASEORDER','PURCHASEORDERS') THEN 'Purchase Order'
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('VENDOR BILL','VENDOR BILLS','BILL','BILLS','VENDORBILL','VENDORBILLS') THEN 'Vendor Bill'
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('BILL PAYMENT','BILL PAYMENTS','PAYMENT','PAYMENTS','BILLPAYMENT','BILLPAYMENTS') THEN 'Bill Payment'
      END AS type_key
    FROM raw_type_vals
  ) s
  WHERE type_key IS NOT NULL
),

/* ========== Latest per header (apply filters early) ========== */
po_latest AS (
  SELECT
      t.PO_INTERNAL_ID                    AS internal_id,
      t.PO_NUMBER                         AS number,
      'Purchase Order'                    AS type,
      t.VENDOR_NAME                       AS vendor,
      t.SUBSIDIARY_NAME                   AS subsidiary,
      t.LOCATION_NAME                     AS location,
      t.TOTAL_AMOUNT                      AS amount,
      t.PO_STATUS                         AS status,
      UPPER(TRIM(t.PO_STATUS))            AS status_norm,
      t.TRANSACTION_DATE                  AS date,
      t.RECEIVE_BY_DATE                   AS due_date,
      t.DEPARTMENT_NAME                   AS department_name,
      t.HEADER_MEMO                       AS header_memo,
      UPPER(TRIM(t.PO_CREATED_BY_FULL_NAME)) AS created_by_norm,
      UPPER(TRIM(t.NEXT_APPROVER_NAME))      AS next_approver_norm
  FROM mrt_netsuite2_p2p_po_transaction_details t, norm p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
    AND (p.subsidiaries IS NULL OR EXISTS (SELECT 1 FROM flt_subsidiary fs WHERE UPPER(TRIM(t.SUBSIDIARY_NAME)) = fs.val))
    AND (p.vendors      IS NULL OR EXISTS (SELECT 1 FROM flt_vendor     fv WHERE UPPER(TRIM(t.VENDOR_NAME))      = fv.val))
    AND (p.locations    IS NULL OR EXISTS (SELECT 1 FROM flt_location   fl WHERE UPPER(TRIM(t.LOCATION_NAME))    = fl.val))
    AND (p.statuses     IS NULL OR EXISTS (SELECT 1 FROM flt_status     st WHERE UPPER(TRIM(t.PO_STATUS))        = st.val))
    AND (p.types        IS NULL OR EXISTS (SELECT 1 FROM flt_type       ft WHERE ft.type_key = 'Purchase Order'))
  QUALIFY ROW_NUMBER() OVER (PARTITION BY t.PO_INTERNAL_ID ORDER BY t.TRANSACTION_CREATED_DATE_UTC DESC, t.LINE_ID DESC) = 1
),
bill_lines AS (
  SELECT t.BILL_INTERNAL_ID, SUM(COALESCE(t.ITEM_LINE_AMOUNT,0)) AS calc_bill_amount
  FROM mrt_netsuite2_p2p_bill_transaction_details t, norm p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
  GROUP BY 1
),
bill_latest AS (
  SELECT
      t.BILL_INTERNAL_ID                   AS internal_id,
      t.BILL_NUMBER                        AS number,
      'Vendor Bill'                        AS type,
      t.VENDOR_NAME                        AS vendor,
      t.SUBSIDIARY_NAME                    AS subsidiary,
      t.LOCATION_NAME                      AS location,
      COALESCE(t.BILL_AMOUNT, bl.calc_bill_amount) AS amount,
      t.BILL_STATUS                        AS status,
      UPPER(TRIM(t.BILL_STATUS))           AS status_norm,
      t.BILL_DATE                          AS date,
      t.DUE_DATE                           AS due_date,
      t.DEPARTMENT_NAME                    AS department_name,
      t.HEADER_MEMO                        AS header_memo,
      UPPER(TRIM(t.BILL_CREATED_BY_FULL_NAME)) AS created_by_norm,
      UPPER(TRIM(t.NEXT_APPROVER_NAME))        AS next_approver_norm
  FROM mrt_netsuite2_p2p_bill_transaction_details t
  LEFT JOIN bill_lines bl ON bl.BILL_INTERNAL_ID = t.BILL_INTERNAL_ID, norm p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
    AND (p.subsidiaries IS NULL OR EXISTS (SELECT 1 FROM flt_subsidiary fs WHERE UPPER(TRIM(t.SUBSIDIARY_NAME)) = fs.val))
    AND (p.vendors      IS NULL OR EXISTS (SELECT 1 FROM flt_vendor     fv WHERE UPPER(TRIM(t.VENDOR_NAME))      = fv.val))
    AND (p.locations    IS NULL OR EXISTS (SELECT 1 FROM flt_location   fl WHERE UPPER(TRIM(t.LOCATION_NAME))    = fl.val))
    AND (p.statuses     IS NULL OR EXISTS (SELECT 1 FROM flt_status     st WHERE UPPER(TRIM(t.BILL_STATUS))      = st.val))
    AND (p.types        IS NULL OR EXISTS (SELECT 1 FROM flt_type       ft WHERE ft.type_key = 'Vendor Bill'))
  QUALIFY ROW_NUMBER() OVER (PARTITION BY t.BILL_INTERNAL_ID ORDER BY t.TRANSACTION_CREATED_DATE_UTC DESC, t.LINE_ID DESC) = 1
),
pay_latest AS (
  SELECT
      t.PAYMENT_INTERNAL_ID                AS internal_id,
      t.PAYMENT_NUMBER                     AS number,
      'Bill Payment'                       AS type,
      t.VENDOR_NAME                        AS vendor,
      t.SUBSIDIARY_NAME                    AS subsidiary,
      NULL                                 AS location,
      t.TOTAL_AMOUNT                       AS amount,
      t.PAYMENT_STATUS                     AS status,
      UPPER(TRIM(t.PAYMENT_STATUS))        AS status_norm,
      t.PAYMENT_DATE                       AS date,
      NULL::TIMESTAMP                      AS due_date,
      NULL::STRING                         AS department_name,
      t.HEADER_MEMO                        AS header_memo,
      UPPER(TRIM(t.PAYMENT_CREATED_BY_FULL_NAME)) AS created_by_norm,
      UPPER(TRIM(t.NEXT_APPROVER_NAME))           AS next_approver_norm
  FROM mrt_netsuite2_p2p_billpayment_transaction_details t, norm p
  WHERE t.PAYMENT_DATE >= DATEADD(day, -p.days_back, CURRENT_DATE)
    AND (p.subsidiaries IS NULL OR EXISTS (SELECT 1 FROM flt_subsidiary fs WHERE UPPER(TRIM(t.SUBSIDIARY_NAME)) = fs.val))
    AND (p.vendors      IS NULL OR EXISTS (SELECT 1 FROM flt_vendor     fv WHERE UPPER(TRIM(t.VENDOR_NAME))      = fv.val))
    AND (p.locations    IS NULL OR EXISTS (SELECT 1 FROM flt_location   fl WHERE UPPER(TRIM(COALESCE(t.SUBSIDIARY_NAME,''))) = fl.val))  -- optional
    AND (p.statuses     IS NULL OR EXISTS (SELECT 1 FROM flt_status     st WHERE UPPER(TRIM(t.PAYMENT_STATUS))   = st.val))
    AND (p.types        IS NULL OR EXISTS (SELECT 1 FROM flt_type       ft WHERE ft.type_key = 'Bill Payment'))
  QUALIFY ROW_NUMBER() OVER (PARTITION BY t.PAYMENT_INTERNAL_ID ORDER BY t.PAYMENT_DATE DESC, t.PAYMENT_NUMBER DESC) = 1
),

/* Visibility (per employee) */
po_created   AS (SELECT l.*, ap.full_name AS for_employee FROM po_latest   l JOIN allowed_people ap ON l.created_by_norm    = UPPER(TRIM(ap.full_name))),
po_pending   AS (SELECT l.*, ap.full_name AS for_employee FROM po_latest   l JOIN allowed_people ap ON l.next_approver_norm = UPPER(TRIM(ap.full_name)) WHERE l.status_norm LIKE 'PENDING%%'),
bill_created AS (SELECT l.*, ap.full_name AS for_employee FROM bill_latest l JOIN allowed_people ap ON l.created_by_norm    = UPPER(TRIM(ap.full_name))),
bill_pending AS (SELECT l.*, ap.full_name AS for_employee FROM bill_latest l JOIN allowed_people ap ON l.next_approver_norm = UPPER(TRIM(ap.full_name)) WHERE l.status_norm LIKE 'PENDING%%'),
pay_created  AS (SELECT l.*, ap.full_name AS for_employee FROM pay_latest  l JOIN allowed_people ap ON l.created_by_norm    = UPPER(TRIM(ap.full_name))),
pay_pending  AS (SELECT l.*, ap.full_name AS for_employee FROM pay_latest  l JOIN allowed_people ap ON l.next_approver_norm = UPPER(TRIM(ap.full_name)) WHERE l.status_norm LIKE 'PENDING%%'),

/* Final visible rows (dedup per header & employee) */
results AS (
  SELECT
    internal_id AS "NetSuite ID",
    number      AS "Number",
    type        AS "Type",
    vendor      AS "Vendor",
    subsidiary  AS "Subsidiary",
    location    AS "Location",
    amount      AS "Amount",
    status      AS "Status",
    date        AS "Date",
    due_date    AS "Due Date",
    department_name AS "DEPARTMENT_NAME",
    header_memo AS "HEADER_MEMO",
    for_employee    AS "For_Employee"
  FROM (
    SELECT * FROM po_created  UNION ALL SELECT * FROM po_pending
    UNION ALL SELECT * FROM bill_created UNION ALL SELECT * FROM bill_pending
    UNION ALL SELECT * FROM pay_created  UNION ALL SELECT * FROM pay_pending
  )
  QUALIFY ROW_NUMBER() OVER (PARTITION BY "Type","NetSuite ID","For_Employee" ORDER BY "Date" DESC) = 1
)

/* ---------- COUNTS ---------- */
SELECT
  COUNT_IF("Type" = 'Purchase Order')            AS purchase_orders_count,
  COUNT_IF("Type" = 'Vendor Bill')               AS bills_count,
  COUNT_IF("Type" = 'Bill Payment')              AS bill_payments_count,
  COUNT_IF("Status" ILIKE 'Pending%%')           AS pending_approval_count
FROM results;
'''

NETSUITE_TRANSACTIONS_QUERY = '''
/* ===================== NETSUITE — TRANSACTION-LEVEL (ROLE-BASED + FILTERS, LEAN) ===================== */

WITH
/* ---------- Parameters ---------- */
params AS (
  SELECT
      %s::INT                               AS days_back,
      %s::STRING  AS viewer_email,
      %s::INT                                 AS viewer_role,   -- 0=admin, 1/2/3=normal

      /* NULL or [] => no filter */
      PARSE_JSON('[]')::VARIANT              AS subsidiaries,
      PARSE_JSON('[]')::VARIANT              AS vendors,
      PARSE_JSON('[]')::VARIANT              AS locations,
      PARSE_JSON('[]')::VARIANT              AS statuses,
      PARSE_JSON('[]')::VARIANT              AS users,
      PARSE_JSON('[]')::VARIANT              AS types         -- ["Purchase Orders","Bills","Bill Payments"]
),

/* Treat empty arrays as NULL (disable filter) */
norm AS (
  SELECT
    days_back, viewer_email, viewer_role,
    IFF(subsidiaries IS NULL OR ARRAY_SIZE(subsidiaries)=0, NULL, subsidiaries) AS subsidiaries,
    IFF(vendors      IS NULL OR ARRAY_SIZE(vendors)     =0, NULL, vendors)      AS vendors,
    IFF(locations    IS NULL OR ARRAY_SIZE(locations)   =0, NULL, locations)    AS locations,
    IFF(statuses     IS NULL OR ARRAY_SIZE(statuses)    =0, NULL, statuses)     AS statuses,
    IFF(users        IS NULL OR ARRAY_SIZE(users)       =0, NULL, users)        AS users,
    IFF(types        IS NULL OR ARRAY_SIZE(types)       =0, NULL, types)        AS types
  FROM params
),

/* Manager check (for RBAC) */
mgr AS (
  SELECT IFF(COUNT_IF(h.HIERARCHY_LEVEL >= 1) > 0, 1, 0) AS has_reports
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p
  WHERE LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
),

/* RBAC allowed people (Workday) */
allowed_people AS (
  /* Admin: everyone active */
  SELECT d.EMAIL AS email, d.FULL_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE d, norm p
  WHERE p.viewer_role = 0 AND COALESCE(d.IS_ACTIVE, TRUE)

  UNION
  /* Manager: self + all reportees */
  SELECT DISTINCT h.REPORTEE_EMAIL AS email, h.REPORTEE_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 1
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL >= 0

  UNION
  /* IC: self only */
  SELECT DISTINCT h.REPORTEE_EMAIL AS email, h.REPORTEE_NAME AS full_name
  FROM DIM_WORKDAY_EMPLOYEE_HIERARCHY h, norm p, mgr
  WHERE p.viewer_role <> 0 AND mgr.has_reports = 0
    AND LOWER(h.EMPLOYEE_EMAIL) = LOWER(p.viewer_email)
    AND h.HIERARCHY_LEVEL = 0
),

/* Pre-normalize RBAC names once */
allowed_names AS (
  SELECT DISTINCT UPPER(TRIM(full_name)) AS name_norm
  FROM allowed_people
),

/* Flatten filters once (normalized) */
flt_subsidiary AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.subsidiaries) f),
flt_vendor     AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.vendors)      f),
flt_location   AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.locations)    f),
flt_status     AS (SELECT DISTINCT UPPER(TRIM(f.value::string)) AS val FROM norm p, LATERAL FLATTEN(input => p.statuses)     f),

/* Users filter: flatten separately, then map emails -> Workday names, normalize */
raw_user_vals  AS (SELECT DISTINCT u.value::string AS raw_val FROM norm p, LATERAL FLATTEN(input => p.users) u),
flt_user_names AS (
  SELECT DISTINCT UPPER(TRIM(COALESCE(w.FULL_NAME, r.raw_val))) AS name_norm
  FROM raw_user_vals r
  LEFT JOIN DIM_WORKDAY_EMPLOYEE w ON LOWER(w.EMAIL) = LOWER(r.raw_val)
),

/* -------- FIXED: Types filter (no QUALIFY; use outer WHERE on alias) -------- */
raw_type_vals AS (SELECT DISTINCT t.value::string AS raw_val FROM norm p, LATERAL FLATTEN(input => p.types) t),
flt_type AS (
  SELECT type_key
  FROM (
    SELECT DISTINCT
      CASE
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('PURCHASE ORDER','PURCHASE ORDERS','PO','POS','PURCHASEORDER','PURCHASEORDERS')
          THEN 'Purchase Order'
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('VENDOR BILL','VENDOR BILLS','BILL','BILLS','VENDORBILL','VENDORBILLS')
          THEN 'Vendor Bill'
        WHEN UPPER(REPLACE(REGEXP_REPLACE(TRIM(raw_val), '\\s+', ' '), '.', '')) IN
             ('BILL PAYMENT','BILL PAYMENTS','PAYMENT','PAYMENTS','BILLPAYMENT','BILLPAYMENTS')
          THEN 'Bill Payment'
      END AS type_key
    FROM raw_type_vals
  ) s
  WHERE type_key IS NOT NULL
),

/* ========== Latest headers (apply dates & value filters early; normalize names once) ========== */
po_latest AS (
  SELECT
      t.PO_INTERNAL_ID                    AS internal_id,
      t.PO_NUMBER                         AS number,
      'Purchase Order'                    AS type,
      t.VENDOR_NAME                       AS vendor,
      t.SUBSIDIARY_NAME                   AS subsidiary,
      t.LOCATION_NAME                     AS location,
      t.TOTAL_AMOUNT                      AS amount,
      t.PO_STATUS                         AS status,
      UPPER(TRIM(t.PO_STATUS))            AS status_norm,
      t.TRANSACTION_DATE                  AS date,
      t.RECEIVE_BY_DATE                   AS due_date,
      t.DEPARTMENT_NAME                   AS department_name,
      t.HEADER_MEMO                       AS header_memo,
      UPPER(TRIM(t.PO_CREATED_BY_FULL_NAME)) AS created_by_norm,
      UPPER(TRIM(t.NEXT_APPROVER_NAME))      AS next_approver_norm
  FROM mrt_netsuite2_p2p_po_transaction_details t, norm p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
    AND (p.subsidiaries IS NULL OR EXISTS (SELECT 1 FROM flt_subsidiary fs WHERE UPPER(TRIM(t.SUBSIDIARY_NAME)) = fs.val))
    AND (p.vendors      IS NULL OR EXISTS (SELECT 1 FROM flt_vendor     fv WHERE UPPER(TRIM(t.VENDOR_NAME))      = fv.val))
    AND (p.locations    IS NULL OR EXISTS (SELECT 1 FROM flt_location   fl WHERE UPPER(TRIM(t.LOCATION_NAME))    = fl.val))
    AND (p.statuses     IS NULL OR EXISTS (SELECT 1 FROM flt_status     st WHERE UPPER(TRIM(t.PO_STATUS))        = st.val))
    AND (p.types        IS NULL OR EXISTS (SELECT 1 FROM flt_type       ft WHERE ft.type_key = 'Purchase Order'))
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY t.PO_INTERNAL_ID
    ORDER BY t.TRANSACTION_CREATED_DATE_UTC DESC, t.LINE_ID DESC
  ) = 1
),
bill_lines AS (
  SELECT t.BILL_INTERNAL_ID, SUM(COALESCE(t.ITEM_LINE_AMOUNT,0)) AS calc_bill_amount
  FROM mrt_netsuite2_p2p_bill_transaction_details t, norm p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
  GROUP BY 1
),
bill_latest AS (
  SELECT
      t.BILL_INTERNAL_ID                   AS internal_id,
      t.BILL_NUMBER                        AS number,
      'Vendor Bill'                        AS type,
      t.VENDOR_NAME                        AS vendor,
      t.SUBSIDIARY_NAME                    AS subsidiary,
      t.LOCATION_NAME                      AS location,
      COALESCE(t.BILL_AMOUNT, bl.calc_bill_amount) AS amount,
      t.BILL_STATUS                        AS status,
      UPPER(TRIM(t.BILL_STATUS))           AS status_norm,
      t.BILL_DATE                          AS date,
      t.DUE_DATE                           AS due_date,
      t.DEPARTMENT_NAME                    AS department_name,
      t.HEADER_MEMO                        AS header_memo,
      UPPER(TRIM(t.BILL_CREATED_BY_FULL_NAME)) AS created_by_norm,
      UPPER(TRIM(t.NEXT_APPROVER_NAME))        AS next_approver_norm
  FROM mrt_netsuite2_p2p_bill_transaction_details t
  LEFT JOIN bill_lines bl ON bl.BILL_INTERNAL_ID = t.BILL_INTERNAL_ID, norm p
  WHERE t.TRANSACTION_CREATED_DATE_UTC >= DATEADD(day, -p.days_back, CURRENT_TIMESTAMP())
    AND (p.subsidiaries IS NULL OR EXISTS (SELECT 1 FROM flt_subsidiary fs WHERE UPPER(TRIM(t.SUBSIDIARY_NAME)) = fs.val))
    AND (p.vendors      IS NULL OR EXISTS (SELECT 1 FROM flt_vendor     fv WHERE UPPER(TRIM(t.VENDOR_NAME))      = fv.val))
    AND (p.locations    IS NULL OR EXISTS (SELECT 1 FROM flt_location   fl WHERE UPPER(TRIM(t.LOCATION_NAME))    = fl.val))
    AND (p.statuses     IS NULL OR EXISTS (SELECT 1 FROM flt_status     st WHERE UPPER(TRIM(t.BILL_STATUS))      = st.val))
    AND (p.types        IS NULL OR EXISTS (SELECT 1 FROM flt_type       ft WHERE ft.type_key = 'Vendor Bill'))
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY t.BILL_INTERNAL_ID
    ORDER BY t.TRANSACTION_CREATED_DATE_UTC DESC, t.LINE_ID DESC
  ) = 1
),
pay_latest AS (
  SELECT
      t.PAYMENT_INTERNAL_ID                AS internal_id,
      t.PAYMENT_NUMBER                     AS number,
      'Bill Payment'                       AS type,
      t.VENDOR_NAME                        AS vendor,
      t.SUBSIDIARY_NAME                    AS subsidiary,
      NULL                                 AS location,
      t.TOTAL_AMOUNT                       AS amount,
      t.PAYMENT_STATUS                     AS status,
      UPPER(TRIM(t.PAYMENT_STATUS))        AS status_norm,
      t.PAYMENT_DATE                       AS date,
      NULL::TIMESTAMP                      AS due_date,
      NULL::STRING                         AS department_name,
      t.HEADER_MEMO                        AS header_memo,
      UPPER(TRIM(t.PAYMENT_CREATED_BY_FULL_NAME)) AS created_by_norm,
      UPPER(TRIM(t.NEXT_APPROVER_NAME))           AS next_approver_norm
  FROM mrt_netsuite2_p2p_billpayment_transaction_details t, norm p
  WHERE t.PAYMENT_DATE >= DATEADD(day, -p.days_back, CURRENT_DATE)
    AND (p.subsidiaries IS NULL OR EXISTS (SELECT 1 FROM flt_subsidiary fs WHERE UPPER(TRIM(t.SUBSIDIARY_NAME)) = fs.val))
    AND (p.vendors      IS NULL OR EXISTS (SELECT 1 FROM flt_vendor     fv WHERE UPPER(TRIM(t.VENDOR_NAME))      = fv.val))
    AND (p.locations    IS NULL OR EXISTS (SELECT 1 FROM flt_location   fl WHERE UPPER(TRIM(COALESCE(t.SUBSIDIARY_NAME,''))) = fl.val)) -- optional
    AND (p.statuses     IS NULL OR EXISTS (SELECT 1 FROM flt_status     st WHERE UPPER(TRIM(t.PAYMENT_STATUS))   = st.val))
    AND (p.types        IS NULL OR EXISTS (SELECT 1 FROM flt_type       ft WHERE ft.type_key = 'Bill Payment'))
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY t.PAYMENT_INTERNAL_ID
    ORDER BY t.PAYMENT_DATE DESC, t.PAYMENT_NUMBER DESC
  ) = 1
),

/* ========== Visibility expansion (no ORs; two small branches) ========== */
po_created   AS (SELECT l.*, ap.full_name AS for_employee FROM po_latest   l JOIN allowed_people ap ON l.created_by_norm    = UPPER(TRIM(ap.full_name))),
po_pending   AS (SELECT l.*, ap.full_name AS for_employee FROM po_latest   l JOIN allowed_people ap ON l.next_approver_norm = UPPER(TRIM(ap.full_name)) WHERE l.status_norm LIKE 'PENDING%%'),
bill_created AS (SELECT l.*, ap.full_name AS for_employee FROM bill_latest l JOIN allowed_people ap ON l.created_by_norm    = UPPER(TRIM(ap.full_name))),
bill_pending AS (SELECT l.*, ap.full_name AS for_employee FROM bill_latest l JOIN allowed_people ap ON l.next_approver_norm = UPPER(TRIM(ap.full_name)) WHERE l.status_norm LIKE 'PENDING%%'),
pay_created  AS (SELECT l.*, ap.full_name AS for_employee FROM pay_latest  l JOIN allowed_people ap ON l.created_by_norm    = UPPER(TRIM(ap.full_name))),
pay_pending  AS (SELECT l.*, ap.full_name AS for_employee FROM pay_latest  l JOIN allowed_people ap ON l.next_approver_norm = UPPER(TRIM(ap.full_name)) WHERE l.status_norm LIKE 'PENDING%%')

/* ---------- Final (one row per header per person) ---------- */
SELECT
  internal_id          AS "NetSuite ID",
  number               AS "Number",
  type                 AS "Type",
  vendor               AS "Vendor",
  subsidiary           AS "Subsidiary",
  location             AS "Location",
  amount               AS "Amount",
  status               AS "Status",
  date                 AS "Date",
  due_date             AS "Due Date",
  department_name      AS "DEPARTMENT_NAME",
  header_memo          AS "HEADER_MEMO",
  for_employee         AS "For_Employee",
  COUNT(*) OVER()     AS TOTAL_COUNT
FROM (
  SELECT * FROM po_created  UNION ALL SELECT * FROM po_pending
  UNION ALL SELECT * FROM bill_created UNION ALL SELECT * FROM bill_pending
  UNION ALL SELECT * FROM pay_created  UNION ALL SELECT * FROM pay_pending
)
QUALIFY ROW_NUMBER() OVER (
  PARTITION BY "Type","NetSuite ID","For_Employee"
  ORDER BY "Date" DESC
) = 1
ORDER BY "Date" DESC, "Type", "Number" LIMIT %s OFFSET %s;
'''

'''
NETSUITE_TRANSACTIONS_QUERY
[
    {
        "NetSuite ID": 58627770,
        "Number": "RENT-0663A Jan 2025",
        "Type": "Vendor Bill",
        "Vendor": "INSTANT OFFICES HOLDING, INC. (MXN)",
        "Subsidiary": "DoorDash Technologies Mexico",
        "Location": null,
        "Amount": 3187252.8099999996,
        "Status": "Paid In Full",
        "Date": "2024-12-16",
        "Due Date": "2024-12-16 00:00:00",
        "DEPARTMENT_NAME": null,
        "HEADER_MEMO": "RENT-0663A Jan 2025",
        "For_Employee": "Daniel Herrmann",
        "TOTAL_COUNT": 8
    },
    {
        "NetSuite ID": 58628074,
        "Number": "RENT-0663A Jan 2025 - 2",
        "Type": "Vendor Bill",
        "Vendor": "INSTANT OFFICES HOLDING, INC. (MXN)",
        "Subsidiary": "DoorDash Technologies Mexico",
        "Location": null,
        "Amount": 0.0,
        "Status": "Cancelled",
        "Date": "2024-12-16",
        "Due Date": "2024-12-16 00:00:00",
        "DEPARTMENT_NAME": null,
        "HEADER_MEMO": "RENT-0663A Jan 2025 - 2",
        "For_Employee": "Daniel Herrmann",
        "TOTAL_COUNT": 8
    },
    {
        "NetSuite ID": 58094340,
        "Number": "RENT-0663A Capex Deposit #7",
        "Type": "Vendor Bill",
        "Vendor": "INSTANT OFFICES HOLDING, INC. (MXN)",
        "Subsidiary": "DoorDash Technologies Mexico",
        "Location": null,
        "Amount": 25823340.0,
        "Status": "Paid In Full",
        "Date": "2024-12-10",
        "Due Date": "2024-12-10 00:00:00",
        "DEPARTMENT_NAME": null,
        "HEADER_MEMO": "RENT-0663A Capex Deposit #7",
        "For_Employee": "Daniel Herrmann",
        "TOTAL_COUNT": 8
    },
    {
        "NetSuite ID": 54712554,
        "Number": null,
        "Type": "Vendor Bill",
        "Vendor": "INSTANT OFFICES HOLDING, INC. (MXN)",
        "Subsidiary": "DoorDash Technologies Mexico",
        "Location": null,
        "Amount": 109783.88,
        "Status": "Paid In Full",
        "Date": "2024-11-01",
        "Due Date": "2024-11-01 00:00:00",
        "DEPARTMENT_NAME": null,
        "HEADER_MEMO": "RENT-0663A Furniture/AV Deposit #2 FX Variance",
        "For_Employee": "Daniel Herrmann",
        "TOTAL_COUNT": 8
    },
    {
        "NetSuite ID": 52406208,
        "Number": "RENT-0663A Furniture/AV Deposit #1b",
        "Type": "Vendor Bill",
        "Vendor": "INSTANT OFFICES HOLDING, INC. (MXN)",
        "Subsidiary": "DoorDash Technologies Mexico",
        "Location": null,
        "Amount": 17235039.93,
        "Status": "Paid In Full",
        "Date": "2024-10-02",
        "Due Date": "2024-10-02 00:00:00",
        "DEPARTMENT_NAME": null,
        "HEADER_MEMO": "RENT-0663A Furniture/AV Deposit #1b",
        "For_Employee": "Daniel Herrmann",
        "TOTAL_COUNT": 8
    },
    {
        "NetSuite ID": 51870574,
        "Number": "RENT-0663A Furniture/AV Deposit #1",
        "Type": "Vendor Bill",
        "Vendor": "INSTANT OFFICES HOLDING, INC. (MXN)",
        "Subsidiary": "DoorDash Technologies Mexico",
        "Location": null,
        "Amount": 935669.92,
        "Status": "Paid In Full",
        "Date": "2024-09-26",
        "Due Date": "2024-09-26 00:00:00",
        "DEPARTMENT_NAME": null,
        "HEADER_MEMO": "RENT-0663A Furniture/AV Deposit #1",
        "For_Employee": "Daniel Herrmann",
        "TOTAL_COUNT": 8
    },
    {
        "NetSuite ID": 44290725,
        "Number": null,
        "Type": "Vendor Bill",
        "Vendor": "INSTANT OFFICES HOLDING, INC. (MXN)",
        "Subsidiary": "DoorDash Technologies Mexico",
        "Location": null,
        "Amount": 17215560.0,
        "Status": "Paid In Full",
        "Date": "2024-06-28",
        "Due Date": "2024-06-28 00:00:00",
        "DEPARTMENT_NAME": null,
        "HEADER_MEMO": "RENT-0663A Capex Deposit #2",
        "For_Employee": "Daniel Herrmann",
        "TOTAL_COUNT": 8
    },
    {
        "NetSuite ID": 27753924,
        "Number": "RENT-0644 August Prorated Rent",
        "Type": "Vendor Bill",
        "Vendor": "Optzzchain, Inc.",
        "Subsidiary": "DashLink Inc",
        "Location": null,
        "Amount": 3908.46,
        "Status": "Paid In Full",
        "Date": "2023-08-31",
        "Due Date": "2023-08-31 00:00:00",
        "DEPARTMENT_NAME": "243 Workplace Services",
        "HEADER_MEMO": "RENT-0644 August Prorated Rent",
        "For_Employee": "Daniel Herrmann",
        "TOTAL_COUNT": 8
    }
]


NETSUITE_TRANSACTIONS_METRICS
[
    {
        "PURCHASE_ORDERS_COUNT": 0,
        "BILLS_COUNT": 8,
        "BILL_PAYMENTS_COUNT": 0,
        "PENDING_APPROVAL_COUNT": 0
    }
]


NETSUITE_TRANSACTIONS_FILTER_OPTIONS
[
    {
        "FILTER_TYPE": "Statuses",
        "VALUE": "CANCELLED"
    },
    {
        "FILTER_TYPE": "Statuses",
        "VALUE": "PAID IN FULL"
    },
    {
        "FILTER_TYPE": "Subsidiaries",
        "VALUE": "DASHLINK INC"
    },
    {
        "FILTER_TYPE": "Subsidiaries",
        "VALUE": "DOORDASH TECHNOLOGIES MEXICO"
    },
    {
        "FILTER_TYPE": "Users",
        "VALUE": "daniel.herrmann@doordash.com"
    },
    {
        "FILTER_TYPE": "Vendors",
        "VALUE": "INSTANT OFFICES HOLDING, INC. (MXN)"
    },
    {
        "FILTER_TYPE": "Vendors",
        "VALUE": "OPTZZCHAIN, INC."
    }
]

NETSUITE_DASHBOARD_MONTHLY_TRENDS
[
    {
        "MONTH": "2023-08-01",
        "TXN_COUNT": 1
    },
    {
        "MONTH": "2024-06-01",
        "TXN_COUNT": 1
    },
    {
        "MONTH": "2024-09-01",
        "TXN_COUNT": 1
    },
    {
        "MONTH": "2024-10-01",
        "TXN_COUNT": 1
    },
    {
        "MONTH": "2024-11-01",
        "TXN_COUNT": 1
    },
    {
        "MONTH": "2024-12-01",
        "TXN_COUNT": 3
    }
]



NETSUITE_DASHBOARD_BY_STATUS
[
    {
        "STATUS_BUCKET": "Open",
        "TXN_COUNT": 7
    },
    {
        "STATUS_BUCKET": "Canceled",
        "TXN_COUNT": 1
    }
]


NETSUITE_DASHBOARD_BY_TYPE
[
    {
        "DOC_TYPE": "Vendor Bill",
        "TXN_COUNT": 8
    }
]


NETSUITE_DASHBOARD_DEPARTMENT
[
    {
        "DEPARTMENT_NAME": "243 Workplace Services",
        "TOTAL_AMOUNT": "3908.46"
    }
]

NETSUITE_DASHBOARD_METRICS
[
    {
        "OPEN_PO_COUNT": 0,
        "OPEN_BILLS_COUNT": 0,
        "PENDING_APPROVAL_PO_COUNT": 0,
        "TOTAL_AMOUNT": "64510555.00"
    }
]


CONSOLIDATED_NETSUITE_FINANCIAL_METRICS
[
    {
        "OPEN_PO_COUNT": 0,
        "PENDING_APPROVALS_COUNT": 0,
        "OPEN_BILLS_COUNT": 0,
        "TOTAL_AMOUNT": "64510555.00"
    }
]

CONSOLIDATED_NETSUITE_METRICS
[
    {
        "OPEN_PO_COUNT": 0,
        "OPEN_BILLS_COUNT": 0,
        "PENDING_APPROVAL_PO_COUNT": 0,
        "TOTAL_AMOUNT": "64510555.00"
    }
]

CONSOLIDATED_NETSUITE_TRENDS
[
    {
        "MONTH_START": "2023-08-01",
        "MONTH_LABEL": "Aug 2023",
        "PO_TOTAL_AMOUNT": 0.0
    },
    {
        "MONTH_START": "2024-06-01",
        "MONTH_LABEL": "Jun 2024",
        "PO_TOTAL_AMOUNT": 0.0
    },
    {
        "MONTH_START": "2024-09-01",
        "MONTH_LABEL": "Sep 2024",
        "PO_TOTAL_AMOUNT": 0.0
    },
    {
        "MONTH_START": "2024-10-01",
        "MONTH_LABEL": "Oct 2024",
        "PO_TOTAL_AMOUNT": 0.0
    },
    {
        "MONTH_START": "2024-11-01",
        "MONTH_LABEL": "Nov 2024",
        "PO_TOTAL_AMOUNT": 0.0
    },
    {
        "MONTH_START": "2024-12-01",
        "MONTH_LABEL": "Dec 2024",
        "PO_TOTAL_AMOUNT": 0.0
    }
]


'''
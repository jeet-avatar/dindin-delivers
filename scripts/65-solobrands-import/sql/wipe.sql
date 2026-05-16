SET app.tenant_id='45896e95-699f-494d-882b-bd780dfe46f3';
DELETE FROM turion.sales_orders WHERE tenant_id='45896e95-699f-494d-882b-bd780dfe46f3';
DELETE FROM turion.items WHERE tenant_id='45896e95-699f-494d-882b-bd780dfe46f3';
SELECT count(*) AS items_remaining FROM turion.items WHERE tenant_id='45896e95-699f-494d-882b-bd780dfe46f3';
SELECT count(*) AS sales_orders_remaining FROM turion.sales_orders WHERE tenant_id='45896e95-699f-494d-882b-bd780dfe46f3';

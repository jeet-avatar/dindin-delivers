export interface UseCase {
  icon: string
  title: string
  prompt: string
  output: string
}

export interface IndustrySolution {
  slug: string
  name: string
  headline: string
  subheadline: string
  icon: string
  useCases: UseCase[]
  examplePrompts: string[]
  metrics: { label: string; value: string; vs: string }[]
  tags: string[]
}

export const industrySolutions: IndustrySolution[] = [
  {
    slug: 'manufacturing',
    name: 'Manufacturing & Wholesale',
    icon: '🏭',
    headline: 'Automate Your NetSuite Workflows — Without Hiring a Developer',
    subheadline: 'From BOM automation to multi-subsidiary scheduling, ArthaBuild generates production-ready SuiteScript in minutes.',
    useCases: [
      { icon: '📦', title: 'BOM Automation', prompt: 'Create a SuiteScript that auto-updates BOM when a production order is closed', output: 'Scheduled SuiteScript 2.1 that triggers on WO completion, updates all child BOMs' },
      { icon: '🔄', title: 'Inventory Reorder', prompt: 'Generate an inventory reorder script for our 3 warehouses with different min levels', output: 'Map/Reduce script reading custom reorder fields per location, creating POs automatically' },
      { icon: '🏗️', title: 'WO Scheduling', prompt: 'Build a script that auto-schedules work orders based on machine capacity', output: 'Scheduled script with capacity check logic, WO date assignment' },
      { icon: '🌐', title: 'Multi-Subsidiary Consolidation', prompt: 'Automate intercompany elimination entries across our 4 subsidiaries', output: 'Map/Reduce SuiteScript with subsidiary-aware journal entry creation' },
    ],
    examplePrompts: [
      'Create a SuiteScript that auto-updates BOM when a production order is closed',
      'Build a Map/Reduce script to flag inventory items below reorder point across all locations',
      'Automate intercompany elimination journal entries across 4 subsidiaries at month end',
    ],
    metrics: [
      { label: 'Script ready in', value: '6 hrs', vs: 'vs 3 weeks manual' },
      { label: 'Developer fees', value: '$0', vs: 'vs $150-200/hr' },
      { label: 'Deploy time', value: '5 min', vs: 'vs days of QA' },
    ],
    tags: ['BOM Automation', 'Inventory', 'Work Orders', 'Multi-Subsidiary'],
  },
  {
    slug: 'retail',
    name: 'Retail & eCommerce',
    icon: '🛒',
    headline: 'Stop Managing NetSuite Manually — Automate Your Retail Operations',
    subheadline: 'From inventory sync to SuiteCommerce custom fields, ArthaBuild generates SuiteScript that keeps retail ops running.',
    useCases: [
      { icon: '📊', title: 'Inventory Sync', prompt: 'Sync NetSuite inventory with our Shopify store every hour', output: 'RESTlet that Shopify webhooks can call to update NetSuite item quantities' },
      { icon: '🏷️', title: 'Markdown Automation', prompt: 'Auto-apply markdown pricing when items reach 90 days without sale', output: 'Scheduled script scanning slow-moving inventory, updating price levels automatically' },
      { icon: '🛍️', title: 'SuiteCommerce Custom Fields', prompt: 'Add a custom delivery estimate field to all product pages in SuiteCommerce', output: 'SuiteScript that creates custom item fields visible in SuiteCommerce checkout' },
      { icon: '📦', title: 'Returns Processing', prompt: 'Automate RMA creation when a return is logged in our returns portal', output: 'RESTlet that creates NetSuite RMA records from external portal webhooks' },
    ],
    examplePrompts: [
      'Sync NetSuite inventory with Shopify every hour via a scheduled SuiteScript',
      'Auto-apply markdown pricing to items that haven\'t sold in 90 days',
      'Create a SuiteScript to automate RMA generation when a return portal webhook fires',
    ],
    metrics: [
      { label: 'Integration built in', value: '4 hrs', vs: 'vs 2-3 week dev sprint' },
      { label: 'Developer fees', value: '$0', vs: 'vs $5K-15K/integration' },
      { label: 'Deploy time', value: '5 min', vs: 'vs days of testing' },
    ],
    tags: ['Inventory Sync', 'Shopify', 'SuiteCommerce', 'Pricing'],
  },
  {
    slug: 'food-beverage',
    name: 'Food & Beverage',
    icon: '🍽️',
    headline: 'NetSuite Automation Built for Food & Beverage Operations',
    subheadline: 'Expiry tracking, vendor payment workflows, batch traceability — ArthaBuild generates the SuiteScript, you run the operation.',
    useCases: [
      { icon: '⏱️', title: 'Expiry Tracking', prompt: 'Flag inventory items within 30 days of expiry and create a write-off journal', output: 'Scheduled script scanning expiry custom fields, creating write-off JEs for finance' },
      { icon: '💳', title: 'Vendor Payments', prompt: 'Automate vendor payment runs for approved bills on the 15th and 30th', output: 'Scheduled Map/Reduce that batches approved bills and creates payment records' },
      { icon: '🔍', title: 'Batch Traceability', prompt: 'Create a SuiteScript to trace which customer orders used a specific ingredient lot', output: 'RESTlet + Saved Search combo that maps lot numbers to fulfilled orders' },
      { icon: '📋', title: 'Compliance Docs', prompt: 'Auto-attach a CoA PDF to every inventory receipt for FDA traceability', output: 'User Event script on inventory receipt that triggers CoA file attachment' },
    ],
    examplePrompts: [
      'Flag all inventory items within 30 days of expiry and create write-off journal entries',
      'Automate vendor payment runs for approved bills on the 15th and last day of each month',
      'Trace which fulfilled customer orders included a specific ingredient lot number',
    ],
    metrics: [
      { label: 'Compliance script in', value: '3 hrs', vs: 'vs 2 week consultant project' },
      { label: 'Developer fees', value: '$0', vs: 'vs $8K-20K/year retainer' },
      { label: 'Deploy time', value: '5 min', vs: 'vs days of UAT' },
    ],
    tags: ['Expiry Tracking', 'Vendor Payments', 'Batch Traceability', 'FDA Compliance'],
  },
  {
    slug: 'saas',
    name: 'SaaS & Software',
    icon: '💻',
    headline: 'Automate NetSuite for Your SaaS Business — Without a Full-Time Developer',
    subheadline: 'Revenue recognition, subscription billing, usage metering — ArthaBuild generates ASC 606-compliant SuiteScript in hours.',
    useCases: [
      { icon: '📈', title: 'Revenue Recognition', prompt: 'Build a SuiteScript for ASC 606 revenue recognition across multi-year contracts', output: 'Scheduled script that calculates rev-rec schedules and creates journal entries per period' },
      { icon: '💰', title: 'Subscription Billing', prompt: 'Automate monthly invoice creation for all active subscriptions', output: 'Map/Reduce script scanning subscription records and generating invoices on billing date' },
      { icon: '📊', title: 'Usage Metering', prompt: 'Pull usage data from our API and update NetSuite customer records for billing', output: 'RESTlet that accepts usage payloads and updates custom metering fields on customer records' },
      { icon: '🔄', title: 'Renewal Automation', prompt: 'Auto-create renewal opportunities 90 days before contract end date', output: 'Scheduled script that creates Opportunity records with renewal details 90 days prior' },
    ],
    examplePrompts: [
      'Build a SuiteScript for ASC 606 revenue recognition across multi-year SaaS contracts',
      'Automate monthly invoice creation for all active subscription records in NetSuite',
      'Pull usage data from our API daily and update NetSuite metering fields for billing',
    ],
    metrics: [
      { label: 'Rev-rec script in', value: '8 hrs', vs: 'vs 4 week Big 4 project' },
      { label: 'Developer fees', value: '$0', vs: 'vs $200/hr NetSuite dev' },
      { label: 'Deploy time', value: '5 min', vs: 'vs week of UAT' },
    ],
    tags: ['Revenue Recognition', 'ASC 606', 'Subscription Billing', 'Usage Metering'],
  },
  {
    slug: 'professional-services',
    name: 'Professional Services',
    icon: '💼',
    headline: 'Stop Losing Revenue to Manual NetSuite Billing Processes',
    subheadline: 'Project billing, time entry automation, milestone invoicing — ArthaBuild generates the SuiteScript, you focus on clients.',
    useCases: [
      { icon: '🧾', title: 'Project Billing', prompt: 'Auto-generate invoices from approved time entries at month end', output: 'Scheduled Map/Reduce that groups approved time entries by project and creates invoices' },
      { icon: '⏰', title: 'Time Entry Automation', prompt: 'Send reminders to consultants with missing time entries every Friday', output: 'Scheduled script with employee lookup, time gap detection, automated email via NetSuite' },
      { icon: '🏁', title: 'Milestone Invoicing', prompt: 'Create invoice when a project milestone is marked complete in NetSuite', output: 'User Event script on project record that triggers milestone invoice on completion' },
      { icon: '📊', title: 'Utilization Reporting', prompt: 'Build a saved search that shows billable vs non-billable hours by consultant', output: 'SuiteScript-driven Saved Search with ratio calculations, scheduled email delivery' },
    ],
    examplePrompts: [
      'Auto-generate invoices from approved time entries at the end of each month',
      'Send weekly email reminders to consultants who have missing time entries',
      'Trigger a milestone invoice automatically when a project milestone is marked complete',
    ],
    metrics: [
      { label: 'Billing script in', value: '4 hrs', vs: 'vs 3 week dev engagement' },
      { label: 'Developer fees', value: '$0', vs: 'vs $10K-30K/year' },
      { label: 'Deploy time', value: '5 min', vs: 'vs days of UAT' },
    ],
    tags: ['Project Billing', 'Time Entries', 'Milestone Invoicing', 'PSA'],
  },
  {
    slug: 'healthcare',
    name: 'Healthcare & Life Sciences',
    icon: '🏥',
    headline: 'NetSuite Compliance Automation for Healthcare Organizations',
    subheadline: 'Compliance workflows, vendor credentialing, audit trail scripts — ArthaBuild keeps your NetSuite environment audit-ready.',
    useCases: [
      { icon: '📋', title: 'Compliance Workflows', prompt: 'Build a workflow that flags purchase orders over $10K for compliance review', output: 'Workflow SuiteScript that auto-routes high-value POs to compliance queue' },
      { icon: '🆔', title: 'Vendor Credentialing', prompt: 'Auto-flag vendors whose compliance certifications expire within 60 days', output: 'Scheduled script scanning vendor credential expiry fields, creating tasks for procurement' },
      { icon: '🔒', title: 'Audit Trail', prompt: 'Log all changes to patient billing records with user, timestamp, and old/new values', output: 'User Event script on billing records that writes change log to custom audit table' },
      { icon: '💊', title: 'Regulatory Reporting', prompt: 'Generate a monthly DEA compliance report from controlled substance inventory', output: 'Scheduled script aggregating inventory movement data, exporting to compliance format' },
    ],
    examplePrompts: [
      'Flag all purchase orders over $10K for compliance review before approval',
      'Auto-alert procurement when vendor certifications or credentials expire within 60 days',
      'Log all changes to billing records with full audit trail — user, timestamp, old and new values',
    ],
    metrics: [
      { label: 'Compliance script in', value: '6 hrs', vs: 'vs 4 week compliance project' },
      { label: 'Developer fees', value: '$0', vs: 'vs $250/hr specialist' },
      { label: 'Deploy time', value: '5 min', vs: 'vs weeks of validation' },
    ],
    tags: ['Compliance', 'Vendor Credentialing', 'Audit Trail', 'HIPAA'],
  },
];

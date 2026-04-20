import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, getAccountOwnerId } from '../middleware/auth';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { companyEnrichmentService } from '../services/companyEnrichment';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Configure multer for file uploads with security validations
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1 // Only 1 file at a time
  },
  fileFilter: (req, file, cb) => {
    // Allowed MIME types for company imports
    const allowedMimeTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/csv',
      'text/plain'
    ];

    // Check MIME type
    if (!allowedMimeTypes.includes(file.mimetype)) {
      logger.warn(`File upload rejected: invalid MIME type ${file.mimetype}`);
      return cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
    }

    // Check file extension
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const fileExt = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));

    if (!allowedExtensions.includes(fileExt)) {
      logger.warn(`File upload rejected: invalid extension ${fileExt}`);
      return cb(new Error('Invalid file extension. Only .csv, .xlsx, .xls are allowed.'));
    }

    cb(null, true);
  }
});

// Enable authentication for all company routes
router.use(authenticate);

// GET /api/companies - Get all companies
router.get('/', async (req, res, next) => {
  try {
    const {
      search,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      industry,
      minRevenue,
      maxRevenue,
      minEmployees,
      maxEmployees
    } = req.query as {
      search?: string;
      page?: string;
      limit?: string;
      sortBy?: string;
      sortOrder?: string;
      industry?: string;
      minRevenue?: string;
      maxRevenue?: string;
      minEmployees?: string;
      maxEmployees?: string;
    };

    const pageNum = Number.parseInt(page);
    const limitNum = Number.parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause with team collaboration support
    const accountOwnerId = getAccountOwnerId(req);
    const userId = req.user?.id;

    const teamAccessConditions = [
      { userId: userId },
      // Team members see account owner's data
      ...(req.user?.teamRole === 'MEMBER' && req.user?.accountOwnerId ? [{
        userId: req.user.accountOwnerId,
      }] : []),
      // Owners see all team members' data
      ...(req.user?.teamRole === 'OWNER' ? [{
        user: {
          OR: [
            { id: accountOwnerId },
            { accountOwnerId: accountOwnerId }
          ]
        }
      }] : []),
      { shares: { some: { userId: userId } } }
    ];

    const where: any = {
      isActive: true,
      AND: [
        { OR: teamAccessConditions }
      ]
    };

    if (search) {
      where.AND.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { domain: { contains: search, mode: 'insensitive' } },
          { industry: { contains: search, mode: 'insensitive' } },
        ]
      });
    }

    // Industry filter
    if (industry) {
      where.AND.push({
        industry: { contains: industry, mode: 'insensitive' }
      });
    }

    // Revenue filters (intelligent parsing)
    if (minRevenue || maxRevenue) {
      const revenueConditions: any = {};
      if (minRevenue) {
        revenueConditions.gte = minRevenue;
      }
      if (maxRevenue) {
        revenueConditions.lte = maxRevenue;
      }
      where.AND.push({
        revenue: revenueConditions
      });
    }

    // Employee count filters (intelligent parsing)
    if (minEmployees || maxEmployees) {
      const employeeConditions: any = {};
      if (minEmployees) {
        employeeConditions.gte = minEmployees;
      }
      if (maxEmployees) {
        employeeConditions.lte = maxEmployees;
      }
      where.AND.push({
        employeeCount: employeeConditions
      });
    }

    // Build orderBy clause
    let orderBy: any = {};
    const validSortFields = ['name', 'industry', 'revenue', 'employeeCount', 'createdAt', 'foundedYear'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const order = sortOrder === 'asc' ? 'asc' : 'desc';

    orderBy[sortField] = order;

    // Get companies with contact count and contact details
    const companies = await prisma.company.findMany({
      where,
      include: {
        _count: {
          select: {
            contacts: {
              where: {
                isActive: true,
              },
            },
          },
        },
        contacts: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            status: true,
          },
          where: {
            isActive: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy,
      skip,
      take: limitNum,
    });

    // Get total count
    const total = await prisma.company.count({ where });

    res.json({
      companies,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/companies/:id - Get single company
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const company = await prisma.company.findFirst({
      where: {
        id,
        userId: req.user?.id, // Only allow access to user's own companies
      },
      include: {
        contacts: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            role: true,
            title: true,
            status: true,
          },
          where: {
            isActive: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            contacts: {
              where: {
                isActive: true,
              },
            },
            deals: true,
          },
        },
      },
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    return res.json({ company });
  } catch (error) {
    return next(error);
  }
});

// POST /api/companies/:id/enrich - Trigger enrichment for a company
router.post('/:id/enrich', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    // Get company
    const company = await prisma.company.findFirst({
      where: { id, userId }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    if (!company.website) {
      return res.status(400).json({ error: 'Company has no website to enrich from' });
    }

    // Check if already enriching
    if (company.enrichmentStatus === 'enriching') {
      return res.status(409).json({ error: 'Company is already being enriched' });
    }

    // Update status to enriching
    await prisma.company.update({
      where: { id },
      data: { enrichmentStatus: 'enriching' }
    });

    // Start enrichment in background (don't await)
    companyEnrichmentService.enrichCompany(company.name, company.website)
      .then(async (enrichedData) => {
        await prisma.company.update({
          where: { id },
          data: {
            ...enrichedData,
            enrichedAt: new Date(),
            enrichmentStatus: 'enriched'
          }
        });
        console.log(`✅ Company ${company.name} enriched successfully`);
      })
      .catch(async (error) => {
        await prisma.company.update({
          where: { id },
          data: { enrichmentStatus: 'failed' }
        });
        console.error(`❌ Failed to enrich company ${company.name}:`, error);
      });

    res.json({
      message: 'Company enrichment started',
      status: 'enriching'
    });

  } catch (error) {
    console.error('Enrichment endpoint error:', error);
    next(error);
  }
});

// POST /api/companies - Create new company
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      domain,
      industry,
      size,
      description,
      website,
      location,
    } = req.body;

    const company = await prisma.company.create({
      data: {
        name,
        domain,
        industry,
        size,
        description,
        website,
        location,
        userId: req.user!.id,
      },
      include: {
        _count: {
          select: {
            contacts: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json({ company });
  } catch (error) {
    next(error);
  }
});

// PUT /api/companies/:id - Update company
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      domain,
      industry,
      size,
      description,
      website,
      location,
    } = req.body;

    // Verify ownership before update
    const existingCompany = await prisma.company.findFirst({
      where: {
        id,
        userId: req.user?.id,
      },
    });

    if (!existingCompany) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const company = await prisma.company.update({
      where: { id },
      data: {
        name,
        domain,
        industry,
        size,
        description,
        website,
        location,
        updatedAt: new Date(),
      },
      include: {
        _count: {
          select: {
            contacts: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
    });

    res.json({ company });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/companies/:id - Delete company
router.delete('/:id', async (req, res, next) => {
  try {
    const { id} = req.params;

    // Verify ownership before delete
    const existingCompany = await prisma.company.findFirst({
      where: {
        id,
        userId: req.user?.id,
      },
    });

    if (!existingCompany) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Soft delete - mark as inactive
    await prisma.company.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

      res.json({ message: 'Company deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/companies/import - Import companies from CSV
router.post('/import', upload.single('file'), async (req, res, next) => {
  try {
    console.log('[CSV Import] Starting import process...');
    const userId = req.user!.id;
    // Group name: from query param, form field, or auto-generated from filename + date
    const groupName = (req.query.group as string) || (req.body?.group as string) ||
      `Import ${req.file?.originalname?.replace(/\.\w+$/, '') || 'CSV'} — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    console.log('[CSV Import] User ID:', userId, '| Group:', groupName);

    if (!req.file) {
      console.error('[CSV Import] ERROR: No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('[CSV Import] File received:', req.file.originalname, 'Size:', req.file.size, 'bytes');

    // Parse CSV
    let csvContent: string;
    let records: any[];

    try {
      csvContent = req.file.buffer.toString('utf-8');
      console.log('[CSV Import] CSV content length:', csvContent.length, 'characters');
      console.log('[CSV Import] First 200 chars:', csvContent.substring(0, 200));
    } catch (error: any) {
      console.error('[CSV Import] ERROR parsing buffer to string:', error.message);
      throw error;
    }

    try {
      records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
      console.log('[CSV Import] Parsed records count:', records.length);
    } catch (error: any) {
      console.error('[CSV Import] ERROR parsing CSV:', error.message);
      throw error;
    }

    if (records.length === 0) {
      console.error('[CSV Import] ERROR: No valid records found in CSV');
      return res.status(400).json({ error: 'No valid records found in CSV' });
    }

    // AI Field Mapping for Companies
    const headers = Object.keys(records[0]);
    console.log('[CSV Import] CSV Headers:', headers.join(', '));

    const fieldMapping = mapCSVFieldsToCompany(headers);
    console.log('[CSV Import] Field Mapping:', JSON.stringify(fieldMapping, null, 2));

    const importedCompanies = [];
    const errors = [];
    let duplicates = 0;
    let skipped = 0;

    console.log('[CSV Import] Starting row-by-row processing...');

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        console.log(`[CSV Import] Processing row ${i + 1}/${records.length}...`);

        const companyData = parseCompanyData(record, fieldMapping);
        console.log(`[CSV Import] Row ${i + 1} parsed data:`, JSON.stringify(companyData, null, 2));

        // Skip if no name
        if (!companyData.name || !companyData.name.trim()) {
          console.log(`[CSV Import] Row ${i + 1} SKIPPED: No company name`);
          skipped++;
          continue;
        }

        // Check for duplicate
        console.log(`[CSV Import] Row ${i + 1} checking for duplicate: ${companyData.name}`);
        const existing = await prisma.company.findFirst({
          where: {
            name: companyData.name,
            userId,
          },
        });

        if (existing) {
          console.log(`[CSV Import] Row ${i + 1} DUPLICATE: ${companyData.name} (ID: ${existing.id})`);
          duplicates++;
          continue;
        }

        // Create company
        console.log(`[CSV Import] Row ${i + 1} creating company: ${companyData.name}`);
        const company = await prisma.company.create({
          data: {
            ...companyData,
            userId,
            dataSource: 'csv_import',
            tags: [groupName, 'csv_import'],
          },
          include: {
            _count: {
              select: {
                contacts: {
                  where: {
                    isActive: true,
                  },
                },
              },
            },
          },
        });

        console.log(`[CSV Import] Row ${i + 1} SUCCESS: Created company ${company.name} (ID: ${company.id})`);
        importedCompanies.push(company);
      } catch (error: any) {
        console.error(`[CSV Import] Row ${i + 1} ERROR:`, error.message);
        console.error(`[CSV Import] Row ${i + 1} Stack:`, error.stack);
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    console.log('[CSV Import] Import complete!');
    console.log('[CSV Import] Total processed:', records.length);
    console.log('[CSV Import] Imported:', importedCompanies.length);
    console.log('[CSV Import] Duplicates:', duplicates);
    console.log('[CSV Import] Skipped (no name):', skipped);
    console.log('[CSV Import] Errors:', errors.length);

    res.json({
      message: 'Company import completed',
      group: groupName,
      totalProcessed: records.length,
      imported: importedCompanies.length,
      duplicates,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      companies: importedCompanies,
    });
  } catch (error: any) {
    console.error('[CSV Import] CRITICAL ERROR:', error.message);
    console.error('[CSV Import] Stack trace:', error.stack);
    next(error);
  }
});

// POST /api/companies/:id/upload-details - Upload company details via CSV
router.post('/:id/upload-details', upload.single('file'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Verify ownership
    const existingCompany = await prisma.company.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingCompany) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Parse CSV
    const csvContent = req.file.buffer.toString('utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (records.length === 0) {
      return res.status(400).json({ error: 'No valid records found in CSV' });
    }

    // Take the first record (assuming one company per upload)
    const record: any = records[0];

    // Map CSV fields to company fields
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Map common fields
    if (record.website || record.Website || record.WEBSITE) {
      updateData.website = record.website || record.Website || record.WEBSITE;
    }
    if (record.industry || record.Industry || record.INDUSTRY) {
      updateData.industry = record.industry || record.Industry || record.INDUSTRY;
    }
    if (record.size || record.Size || record.SIZE || record.companySize) {
      updateData.size = record.size || record.Size || record.SIZE || record.companySize;
    }
    if (record.location || record.Location || record.LOCATION || record.headquarters) {
      updateData.location = record.location || record.Location || record.LOCATION || record.headquarters;
    }
    if (record.description || record.Description || record.DESCRIPTION) {
      updateData.description = record.description || record.Description || record.DESCRIPTION;
    }
    if (record.linkedin || record.LinkedIn || record.LINKEDIN) {
      updateData.linkedin = record.linkedin || record.LinkedIn || record.LINKEDIN;
    }
    if (record.domain || record.Domain || record.DOMAIN) {
      updateData.domain = record.domain || record.Domain || record.DOMAIN;
    }
    if (record.employeeCount || record['Employee Count'] || record.employees) {
      updateData.employeeCount = record.employeeCount || record['Employee Count'] || record.employees;
    }
    if (record.revenue || record.Revenue || record.REVENUE) {
      updateData.revenue = record.revenue || record.Revenue || record.REVENUE;
    }
    if (record.foundedYear || record['Founded Year'] || record.founded) {
      updateData.foundedYear = parseInt(record.foundedYear || record['Founded Year'] || record.founded);
    }
    if (record.phone || record.Phone || record.PHONE) {
      updateData.phone = record.phone || record.Phone || record.PHONE;
    }

    // Track which fields came from CSV
    const fieldSources = existingCompany.fieldSources as any || {};
    Object.keys(updateData).forEach(key => {
      if (key !== 'updatedAt') {
        fieldSources[key] = 'csv_upload';
      }
    });
    updateData.fieldSources = fieldSources;

    // Mark data source as CSV upload
    updateData.dataSource = 'csv_upload';
    updateData.importedAt = new Date();

    // Update company
    const updatedCompany = await prisma.company.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            contacts: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
    });

    res.json({
      message: 'Company details uploaded successfully from CSV',
      company: updatedCompany,
      fieldsUpdated: Object.keys(updateData).filter(k => k !== 'updatedAt' && k !== 'fieldSources'),
      dataSource: 'csv_upload',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/companies/:id/manual-update - Update company details manually
router.post('/:id/manual-update', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const {
      website,
      industry,
      size,
      location,
      description,
      linkedin,
      domain,
      employeeCount,
      revenue,
      foundedYear,
      phone,
      email,
    } = req.body;

    // Verify ownership
    const existingCompany = await prisma.company.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existingCompany) {
      return res.status(404).json({ error: 'Company not found' });
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    // Add provided fields
    if (website !== undefined) updateData.website = website;
    if (industry !== undefined) updateData.industry = industry;
    if (size !== undefined) updateData.size = size;
    if (location !== undefined) updateData.location = location;
    if (description !== undefined) updateData.description = description;
    if (linkedin !== undefined) updateData.linkedin = linkedin;
    if (domain !== undefined) updateData.domain = domain;
    if (employeeCount !== undefined) updateData.employeeCount = employeeCount;
    if (revenue !== undefined) updateData.revenue = revenue;
    if (foundedYear !== undefined) updateData.foundedYear = foundedYear;
    if (phone !== undefined) updateData.phone = phone;

    // Track which fields came from manual research
    const fieldSources = existingCompany.fieldSources as any || {};
    Object.keys(updateData).forEach(key => {
      if (key !== 'updatedAt') {
        fieldSources[key] = 'manual_research';
      }
    });
    updateData.fieldSources = fieldSources;

    // Mark data source as manual if not already set
    if (!existingCompany.dataSource || existingCompany.dataSource === 'manual') {
      updateData.dataSource = 'manual_research';
    }

    // Update company
    const updatedCompany = await prisma.company.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            contacts: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
    });

    res.json({
      message: 'Company details updated manually',
      company: updatedCompany,
      fieldsUpdated: Object.keys(updateData).filter(k => k !== 'updatedAt' && k !== 'fieldSources'),
      dataSource: 'manual_research',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/companies/enrich - Enrich companies with AI (placeholder)
router.post('/enrich', async (req, res, next) => {
  try {
    const { companies } = req.body;

    if (!companies || !Array.isArray(companies)) {
      return res.status(400).json({ error: 'Companies array is required' });
    }

    // For now, just return the companies as-is
    // In the future, integrate with real enrichment APIs (Clearbit, Hunter.io, etc.)
    const enrichedCompanies = companies.map(company => ({
      ...company,
      enriched: false,
      aiEnhanced: [],
    }));

    res.json({
      message: 'Company enrichment completed',
      companies: enrichedCompanies,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * AI Field Mapping for Companies
 * Automatically detects and maps CSV columns to company fields
 */
function mapCSVFieldsToCompany(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  headers.forEach(header => {
    const normalized = header.toLowerCase().trim().replace(/[_\s-]/g, '');

    if (normalized.match(/^(company.*name|name|business.*name)$/)) mapping[header] = 'name';
    else if (normalized.match(/domain|companywebsite/)) mapping[header] = 'domain';
    else if (normalized.match(/^(website|url|site)$/)) mapping[header] = 'website';
    else if (normalized.match(/linkedin|linkedinurl|linkedinprofile|companylinkedin/)) mapping[header] = 'linkedin';
    else if (normalized.match(/twitter|twitterurl|twitterhandle/)) mapping[header] = 'twitter';
    else if (normalized.match(/facebook|facebookurl|facebookpage/)) mapping[header] = 'facebook';
    else if (normalized.match(/industry|sector|vertical/)) mapping[header] = 'industry';
    else if (normalized.match(/location|city|address|headquarters|hq/)) mapping[header] = 'location';
    else if (normalized.match(/size|companysize|employees/)) mapping[header] = 'size';
    else if (normalized.match(/description|about|overview/)) mapping[header] = 'description';
    else if (normalized.match(/phone|telephone|tel/)) mapping[header] = 'phone';
    else if (normalized.match(/revenue|annualrevenue/)) mapping[header] = 'revenue';
    else if (normalized.match(/employeecount|headcount|numberofemployees/)) mapping[header] = 'employeeCount';
    else mapping[header] = `custom_${header}`;
  });

  return mapping;
}

/**
 * Parse company data from CSV record
 */
function parseCompanyData(record: any, fieldMapping: Record<string, string>): any {
  const companyData: any = {};

  try {
    for (const [csvHeader, dbField] of Object.entries(fieldMapping)) {
      const value = record[csvHeader]?.trim();
      if (!value) continue;

      // Handle custom fields
      if (dbField.startsWith('custom_')) {
        continue; // Skip custom fields for now
      }

      // Map standard fields
      companyData[dbField] = value;
    }

    // Extract domain from website if not provided
    // BUT: Don't extract domain from social media URLs (LinkedIn, Facebook, Twitter, etc.)
    if (companyData.website && !companyData.domain) {
      try {
        const url = companyData.website.startsWith('http')
          ? companyData.website
          : 'https://' + companyData.website;
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;

        // Skip social media domains - they should go into their respective fields
        const socialMediaDomains = ['linkedin.com', 'facebook.com', 'twitter.com', 'x.com', 'instagram.com', 'youtube.com'];
        const isSocialMedia = socialMediaDomains.some(domain => hostname.includes(domain));

        if (!isSocialMedia) {
          companyData.domain = hostname;
        } else {
          console.log('[parseCompanyData] Skipping domain extraction from social media URL:', companyData.website);
          // Move LinkedIn URL to the linkedin field if it's not already set
          if (hostname.includes('linkedin.com') && !companyData.linkedin) {
            companyData.linkedin = companyData.website;
          }
          // Clear website field if it's a social media URL
          delete companyData.website;
        }
      } catch (error: any) {
        console.warn('[parseCompanyData] Failed to extract domain from website:', companyData.website, error.message);
        // Invalid URL, skip domain extraction
      }
    }

    return companyData;
  } catch (error: any) {
    console.error('[parseCompanyData] ERROR:', error.message);
    console.error('[parseCompanyData] Record:', JSON.stringify(record));
    console.error('[parseCompanyData] Field Mapping:', JSON.stringify(fieldMapping));
    throw error;
  }
}

// ==========================================
// ASSIGNMENT ENDPOINTS
// ==========================================

// GET /api/companies/assigned-to-me - Get all companies assigned to current user
// NOTE: This must come BEFORE /:id routes to avoid route conflict
router.get('/assigned-to-me', async (req, res, next) => {
  try {
    const userId = req.user!.id;

    const {
      page = '1',
      limit = '10'
    } = req.query as {
      page?: string;
      limit?: string;
    };

    const pageNum = Number.parseInt(page);
    const limitNum = Number.parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const companies = await prisma.company.findMany({
      where: {
        assignedToId: userId,
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        _count: {
          select: {
            contacts: true,
            deals: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum
    });

    const total = await prisma.company.count({
      where: {
        assignedToId: userId,
        isActive: true
      }
    });

    res.json({
      companies,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/companies/bulk-assign - Bulk assign multiple companies to a team member
router.post('/bulk-assign', async (req, res, next) => {
  try {
    const { companyIds, assignToUserId } = req.body;
    const userId = req.user!.id;
    const accountOwnerId = getAccountOwnerId(req);

    if (!companyIds || !Array.isArray(companyIds) || companyIds.length === 0) {
      return res.status(400).json({ error: 'companyIds array is required' });
    }

    if (!assignToUserId) {
      return res.status(400).json({ error: 'assignToUserId is required' });
    }

    // Verify that assignToUserId is a team member
    const targetUser = await prisma.user.findUnique({
      where: { id: assignToUserId }
    });

    if (!targetUser || (targetUser.accountOwnerId !== accountOwnerId && targetUser.id !== accountOwnerId)) {
      return res.status(400).json({ error: 'Target user is not in your team' });
    }

    // Only update companies that user owns or is account owner
    const whereClause = req.user?.teamRole === 'OWNER'
      ? { id: { in: companyIds } }
      : { id: { in: companyIds }, userId };

    const result = await prisma.company.updateMany({
      where: whereClause,
      data: { assignedToId: assignToUserId }
    });

    res.json({
      message: 'Companies assigned successfully',
      assignedCount: result.count
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/companies/:id/assign - Assign company to a team member
router.post('/:id/assign', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { assignToUserId } = req.body;
    const userId = req.user!.id;
    const accountOwnerId = getAccountOwnerId(req);

    if (!assignToUserId) {
      return res.status(400).json({ error: 'assignToUserId is required' });
    }

    // Check if company exists and user has permission
    const company = await prisma.company.findUnique({
      where: { id }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Only owner or company creator can assign
    if (company.userId !== userId && req.user?.teamRole !== 'OWNER') {
      return res.status(403).json({ error: 'You do not have permission to assign this company' });
    }

    // Verify that assignToUserId is a team member
    const targetUser = await prisma.user.findUnique({
      where: { id: assignToUserId }
    });

    if (!targetUser || targetUser.accountOwnerId !== accountOwnerId) {
      return res.status(400).json({ error: 'Target user is not in your team' });
    }

    // Assign the company
    const updatedCompany = await prisma.company.update({
      where: { id },
      data: { assignedToId: assignToUserId }
    });

    res.json({
      message: 'Company assigned successfully',
      company: updatedCompany
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/companies/:id/unassign - Unassign company from team member
router.post('/:id/unassign', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check if company exists and user has permission
    const company = await prisma.company.findUnique({
      where: { id }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Only owner or company creator can unassign
    if (company.userId !== userId && req.user?.teamRole !== 'OWNER') {
      return res.status(403).json({ error: 'You do not have permission to unassign this company' });
    }

    // Unassign the company
    const updatedCompany = await prisma.company.update({
      where: { id },
      data: { assignedToId: null }
    });

    res.json({
      message: 'Company unassigned successfully',
      company: updatedCompany
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/companies/:id/find-linkedin - Auto-find LinkedIn company URL
router.post('/:id/find-linkedin', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get company details
    const company = await prisma.company.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        website: true,
        linkedin: true,
        userId: true
      }
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Check if LinkedIn URL already exists
    if (company.linkedin && company.linkedin.includes('linkedin.com/company/')) {
      return res.json({
        success: true,
        linkedinUrl: company.linkedin,
        message: 'LinkedIn URL already exists'
      });
    }

    // Import and use the LinkedIn URL finder service
    const { findLinkedInCompanyUrl } = await import('../services/linkedin-url-finder.service');

    const result = await findLinkedInCompanyUrl(
      company.name,
      company.website || undefined
    );

    if (!result || !result.linkedinUrl) {
      return res.status(404).json({
        success: false,
        error: 'LinkedIn URL not found',
        message: 'Could not automatically find LinkedIn company URL. Please add it manually.'
      });
    }

    // Update company with found LinkedIn URL
    await prisma.company.update({
      where: { id },
      data: { linkedin: result.linkedinUrl }
    });

    res.json({
      success: true,
      linkedinUrl: result.linkedinUrl,
      confidence: result.confidence,
      method: result.method
    });
  } catch (error: any) {
    console.error('Error finding LinkedIn URL:', error);
    next(error);
  }
});

// ==========================================
// LINKEDIN EMPLOYEE ENDPOINTS
// ==========================================

// GET /api/companies/:id/employees - Fetch company employees from LinkedIn via RapidAPI
router.get('/:id/employees', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { limit = '20', enrich = 'false' } = req.query as {
      limit?: string;
      enrich?: string;
    };

    const userId = req.user!.id;

    // Get company
    const company = await prisma.company.findFirst({
      where: {
        id,
        userId,
      },
      select: {
        id: true,
        name: true,
        linkedin: true,
        domain: true,
      },
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    let linkedinUrl = company.linkedin;

    // If no LinkedIn URL, use AI to find it
    if (!linkedinUrl) {
      console.log(`[Get Employees] No LinkedIn URL for ${company.name}, using AI to find it...`);

      const { findLinkedInCompanyUrl } = await import('../services/linkedin-url-finder.service');
      const result = await findLinkedInCompanyUrl(company.name, company.domain || undefined);

      if (result && result.linkedinUrl) {
        linkedinUrl = result.linkedinUrl;
        console.log(`[Get Employees] AI found LinkedIn URL: ${linkedinUrl} (${result.confidence} confidence)`);

        // Save the found LinkedIn URL to the database for future use
        await prisma.company.update({
          where: { id: company.id },
          data: { linkedin: linkedinUrl },
        });

        console.log(`[Get Employees] Saved LinkedIn URL to database`);
      } else {
        return res.status(400).json({
          error: 'No LinkedIn URL',
          message: 'Could not automatically find LinkedIn company URL. Please add it manually.',
        });
      }
    }

    // Import RapidAPI service
    const { fetchCompanyEmployees } = await import('../services/rapidapi-linkedin.service');

    // Fetch employees from RapidAPI
    const employees = await fetchCompanyEmployees(linkedinUrl, {
      limit: Number.parseInt(limit),
      enrichProfiles: enrich === 'true',
      useCache: true,
    });

    res.json({
      companyId: company.id,
      companyName: company.name,
      linkedinUrl: linkedinUrl,
      employees,
      count: employees.length,
    });
  } catch (error: any) {
    console.error('[Get Employees] Error:', error);
    next(error);
  }
});

// POST /api/companies/:id/employees/import - Import selected employees as contacts
router.post('/:id/employees/import', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { employeeUrls } = req.body as { employeeUrls: string[] };
    const userId = req.user!.id;

    if (!employeeUrls || !Array.isArray(employeeUrls) || employeeUrls.length === 0) {
      return res.status(400).json({ error: 'employeeUrls array is required' });
    }

    // Get company
    const company = await prisma.company.findFirst({
      where: {
        id,
        userId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Import RapidAPI service
    const { fetchEmployeesByUrls } = await import('../services/rapidapi-linkedin.service');

    // Fetch detailed profiles for selected employees
    const employees = await fetchEmployeesByUrls(employeeUrls);

    // Create contacts from employees
    const createdContacts = [];
    const errors = [];

    for (const emp of employees) {
      try {
        // Check if contact already exists
        const existing = await prisma.contact.findFirst({
          where: {
            userId,
            linkedin: emp.linkedinUrl,
          },
        });

        if (existing) {
          errors.push(`${emp.fullName} already exists as a contact`);
          continue;
        }

        // Create contact
        const contact = await prisma.contact.create({
          data: {
            userId,
            companyId: company.id,
            firstName: emp.firstName || 'Unknown',
            lastName: emp.lastName || '',
            title: emp.title,
            location: emp.location,
            linkedin: emp.linkedinUrl,
            enriched: true,
          },
        });

        createdContacts.push(contact);
      } catch (error: any) {
        errors.push(`${emp.fullName}: ${error.message}`);
      }
    }

    res.json({
      message: 'Employee import completed',
      imported: createdContacts.length,
      total: employeeUrls.length,
      errors: errors.length > 0 ? errors : undefined,
      contacts: createdContacts,
    });
  } catch (error: any) {
    console.error('[Import Employees] Error:', error);
    next(error);
  }
});

export default router;
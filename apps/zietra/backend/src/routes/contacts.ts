import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, getAccountOwnerId } from '../middleware/auth';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { validatePhoneNumber, validateEmail, validateContactData } from '../utils/validation';
import { logger } from '../utils/logger';

const router = Router();
const prisma = new PrismaClient();

// Enable authentication for all contact routes
router.use(authenticate);

// Configure multer for file uploads with security validations
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Max 10 files for batch import
  },
  fileFilter: (req, file, cb) => {
    // Allowed MIME types for contact imports
    const allowedMimeTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/csv',
      'text/plain',
      'text/vcard', // vCard files
      'text/x-vcard'
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      logger.warn(`Contact import rejected: invalid MIME type ${file.mimetype}`);
      return cb(new Error('Invalid file type. Only CSV, Excel, and vCard files are allowed.'));
    }

    const allowedExtensions = ['.csv', '.xlsx', '.xls', '.vcf', '.vcard'];
    const fileExt = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));

    if (!allowedExtensions.includes(fileExt)) {
      logger.warn(`Contact import rejected: invalid extension ${fileExt}`);
      return cb(new Error('Invalid file extension.'));
    }

    cb(null, true);
  }
});

// GET /api/contacts - Get all contacts with pagination and search
router.get('/', async (req, res, next) => {
  try {
    const { 
      search, 
      status, 
      page = '1', 
      limit = '10' 
    } = req.query as {
      search?: string;
      status?: string;
      page?: string;
      limit?: string;
    };

    const pageNum = Number.parseInt(page);
    const limitNum = Number.parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause with team collaboration support
    const accountOwnerId = getAccountOwnerId(req);
    const userId = req.user?.id;

    // Team collaboration: Show contacts that are:
    // 1. Owned by the user
    // 2. Owned by team members (if user is account owner)
    // 3. Shared with the user
    const teamAccessConditions = [
      { userId: userId }, // User's own contacts
      ...(req.user?.teamRole === 'OWNER' ? [{
        user: {
          OR: [
            { id: accountOwnerId },
            { accountOwnerId: accountOwnerId }
          ]
        }
      }] : []),
      { shares: { some: { userId: userId } } } // Shared contacts
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
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ]
      });
    }

    if (status && status !== '') {
      where.status = status;
    }

    // Get contacts with relations
    const contacts = await prisma.contact.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            domain: true,
            industry: true,
            tags: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limitNum,
    });

    // Get total count
    const total = await prisma.contact.count({ where });

    // Transform the data
    const transformedContacts = contacts.map(contact => ({
      ...contact,
      tags: contact.tags.map(ct => ct.tag),
    }));

    res.json({
      contacts: transformedContacts,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/contacts/:id - Get single contact
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const contact = await prisma.contact.findFirst({
      where: {
        id,
        userId: req.user?.id, // Only allow access to user's own contacts
      },
      include: {
        company: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Transform the data
    const transformedContact = {
      ...contact,
      tags: contact.tags.map(ct => ct.tag),
    };

    return res.json({ contact: transformedContact });
  } catch (error) {
    return next(error);
  }
});

// POST /api/contacts - Create new contact
router.post('/', async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      role,
      companyId,
      companyName, // NEW: Allow creating company by name
      status, // No default - must be provided by user/frontend
      tagIds = [],
    } = req.body;

    // Validate contact data
    const validation = validateContactData({ firstName, lastName, email, phone });
    if (!validation.isValid) {
      return res.status(400).json({
        error: validation.errors.join(', '),
        errors: validation.errors
      });
    }

    // Handle company creation/lookup if companyName provided
    let finalCompanyId = companyId || null;

    if (!companyId && companyName && companyName.trim()) {
      const companyNameTrimmed = companyName.trim();

      // Check if company already exists
      const existingCompany = await prisma.company.findFirst({
        where: {
          userId: req.user!.id,
          name: companyNameTrimmed,
        },
      });

      if (existingCompany) {
        console.log('🏢 Using existing company:', existingCompany.name);
        finalCompanyId = existingCompany.id;
      } else {
        // Create new company
        console.log('🏢 Creating new company:', companyNameTrimmed);
        const newCompany = await prisma.company.create({
          data: {
            name: companyNameTrimmed,
            dataSource: 'manual_contact', // Mark as created from contact form
            userId: req.user!.id,
          },
        });
        finalCompanyId = newCompany.id;
        console.log('✅ Company created:', newCompany.id);
      }
    }

    // Create contact
    const contact = await prisma.contact.create({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email && email.trim() ? email.trim() : null,
        phone: phone && phone.trim() ? phone.trim() : null,
        role: role && role.trim() ? role.trim() : null,
        status,
        companyId: finalCompanyId,
        userId: req.user!.id,
      },
      include: {
        company: true,
      },
    });

    // Add tags if provided
    if (tagIds.length > 0) {
      await prisma.contactTag.createMany({
        data: tagIds.map((tagId: string) => ({
          contactId: contact.id,
          tagId,
        })),
      });
    }

    // Fetch the complete contact with tags
    const completeContact = await prisma.contact.findUnique({
      where: { id: contact.id },
      include: {
        company: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    const transformedContact = {
      ...completeContact,
      tags: completeContact?.tags.map(ct => ct.tag) || [],
    };

    res.status(201).json({ contact: transformedContact });
  } catch (error: any) {
    // Handle unique constraint violation for email
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return res.status(409).json({
        error: 'This email address is already in use. Please use a different email or leave it blank.'
      });
    }
    next(error);
  }
});

// PUT /api/contacts/:id - Update contact
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      email,
      phone,
      companyId,
      companyName,
      status,
      tagIds = [],
    } = req.body;

    // Verify ownership before update
    const existingContact = await prisma.contact.findFirst({
      where: {
        id,
        userId: req.user?.id,
      },
    });

    if (!existingContact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Validate contact data
    const validation = validateContactData({ firstName, lastName, email, phone });
    if (!validation.isValid) {
      return res.status(400).json({
        error: validation.errors.join(', '),
        errors: validation.errors
      });
    }

    // Resolve companyId — if companyName provided but no companyId, find or create company
    let resolvedCompanyId = companyId || null;
    if (!resolvedCompanyId && companyName && companyName.trim()) {
      const trimmedName = companyName.trim();
      const existing = await prisma.company.findFirst({
        where: { name: { equals: trimmedName, mode: 'insensitive' }, userId: req.user!.id },
      });
      if (existing) {
        resolvedCompanyId = existing.id;
      } else {
        const created = await prisma.company.create({
          data: { name: trimmedName, userId: req.user!.id },
        });
        resolvedCompanyId = created.id;
      }
    }

    // Update contact
    const contact = await prisma.contact.update({
      where: { id },
      data: {
        firstName,
        lastName,
        email,
        phone,
        status,
        companyId: resolvedCompanyId,
        updatedAt: new Date(),
      },
      include: {
        company: true,
      },
    });

    // Update tags - remove old ones and add new ones
    await prisma.contactTag.deleteMany({
      where: { contactId: id },
    });

    if (tagIds.length > 0) {
      await prisma.contactTag.createMany({
        data: tagIds.map((tagId: string) => ({
          contactId: id,
          tagId,
        })),
      });
    }

    // Fetch the complete contact with tags
    const completeContact = await prisma.contact.findUnique({
      where: { id },
      include: {
        company: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    const transformedContact = {
      ...completeContact,
      tags: completeContact?.tags.map(ct => ct.tag) || [],
    };

    res.json({ contact: transformedContact });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/contacts/:id - Delete contact
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const accountOwnerId = getAccountOwnerId(req);
    const userId = req.user?.id;

    // Build team access conditions for deletion
    const teamAccessConditions = [
      { userId: userId },
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

    // Verify ownership or team access before delete
    const existingContact = await prisma.contact.findFirst({
      where: {
        id,
        isActive: true,
        OR: teamAccessConditions
      },
    });

    if (!existingContact) {
      return res.status(404).json({ error: 'Contact not found or you do not have permission to delete it' });
    }

    // Soft delete - mark as inactive
    await prisma.contact.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// AI Field Mapping Function - Enhanced for better CSV compatibility
function mapCSVFieldsToContact(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  logger.info(`[CSV Mapping] Processing ${headers.length} headers: ${headers.join(', ')}`);

  headers.forEach(header => {
    const normalized = header.toLowerCase().trim().replace(/[_\s-]/g, '');
    const original = header.toLowerCase().trim();

    // Email - most common variations
    if (normalized.match(/^(email|e?mail|emailaddress|contactemail|workemail)$/)) {
      mapping[header] = 'email';
    }
    // First Name - comprehensive patterns
    else if (normalized.match(/^(firstname|fname|first|givenname|forename)$/)) {
      mapping[header] = 'firstName';
    }
    // Last Name - comprehensive patterns
    else if (normalized.match(/^(lastname|lname|last|surname|familyname)$/)) {
      mapping[header] = 'lastName';
    }
    // Full Name - if no separate first/last
    else if (normalized.match(/^(fullname|name|contactname|displayname)$/)) {
      mapping[header] = 'fullName';
    }
    // Phone - many variations
    else if (normalized.match(/^(phone|mobile|cell|telephone|tel|phonenumber|mobilenumber|contactnumber|cellphone)$/)) {
      mapping[header] = 'phone';
    }
    // Title/Position
    else if (normalized.match(/^(title|position|jobtitle|designation|role)$/)) {
      mapping[header] = 'title';
    }
    // Company - main field
    else if (normalized.match(/^(company|organization|org|employer|business|companyname|organization|orgname)$/)) {
      mapping[header] = 'company';
    }
    // Company Industry
    else if (normalized.match(/^(industry|sector|vertical|companyindustry)$/)) {
      mapping[header] = 'companyIndustry';
    }
    // Company Size
    else if (normalized.match(/^(companysize|size|employeecount|employees|headcount|numberofemployees)$/)) {
      mapping[header] = 'companySize';
    }
    // Company Location
    else if (normalized.match(/^(location|companylocation|city|companycity|address|companyaddress|headquarters|hq)$/)) {
      mapping[header] = 'companyLocation';
    }
    // Website/Domain
    else if (normalized.match(/^(website|companywebsite|url|domain|web|site)$/)) {
      mapping[header] = 'companyWebsite';
    }
    // Company Description
    else if (normalized.match(/^(description|companydescription|about|aboutcompany|companyinfo|overview)$/)) {
      mapping[header] = 'companyDescription';
    }
    // Revenue
    else if (normalized.match(/^(revenue|annualrevenue|sales|income|turnover)$/)) {
      mapping[header] = 'companyRevenue';
    }
    // LinkedIn
    else if (normalized.match(/^(linkedin|linkedinurl|profile|companylinkedin|linkedinprofile)$/)) {
      mapping[header] = 'companyLinkedIn';
    }
    // Founded Year
    else if (normalized.match(/^(founded|foundedyear|yearfounded|established|startyear)$/)) {
      mapping[header] = 'companyFoundedYear';
    }
    // Company Phone
    else if (normalized.match(/^(companyphone|mainphone|officenumber|officephone)$/)) {
      mapping[header] = 'companyPhone';
    }
    // Status
    else if (normalized.match(/^(status|stage|leadstatus|contactstatus)$/)) {
      mapping[header] = 'status';
    }
    // Notes
    else if (normalized.match(/^(note|notes|comment|comments|remark|remarks)$/)) {
      mapping[header] = 'notes';
    }
    // Fallback to custom field
    else {
      mapping[header] = `custom_${header}`;
      logger.info(`[CSV Mapping] Unmapped field "${header}" -> custom field`);
    }
  });

  logger.info(`[CSV Mapping] Mapping result: ${JSON.stringify(mapping, null, 2)}`);
  return mapping;
}

// Helper functions for CSV import

/**
 * Parse contact data from CSV record
 */
function parseContactData(record: any, fieldMapping: Record<string, string>) {
  const contactData: any = { customFields: {}, fieldSources: {} };
  const companyData: any = { fieldSources: {} };

  for (const [csvHeader, dbField] of Object.entries(fieldMapping)) {
    const value = record[csvHeader]?.trim();
    if (!value) continue;

    if (dbField === 'fullName') {
      const nameParts = value.split(' ').filter(part => part.trim());
      if (nameParts.length > 0) {
        contactData.firstName = nameParts[0];
        contactData.lastName = nameParts.slice(1).join(' ') || '';
      }
    } else if (dbField.startsWith('company')) {
      parseCompanyField(dbField, value, companyData);
    } else if (dbField.startsWith('custom_')) {
      contactData.customFields[csvHeader] = value;
    } else if (dbField === 'status') {
      const normalizedStatus = value.toUpperCase();
      if (['LEAD', 'PROSPECT', 'CUSTOMER', 'PARTNER'].includes(normalizedStatus)) {
        contactData.status = normalizedStatus;
      }
    } else {
      contactData[dbField] = value;
      contactData.fieldSources[dbField] = 'csv_import';
    }
  }

  return { contactData, companyData };
}

/**
 * Parse company-specific field
 */
function parseCompanyField(dbField: string, value: string, companyData: any) {
  if (dbField === 'company') companyData.name = value;
  else if (dbField === 'companyIndustry') companyData.industry = value;
  else if (dbField === 'companySize') companyData.size = value;
  else if (dbField === 'companyLocation') companyData.location = value;
  else if (dbField === 'companyWebsite') companyData.website = value;
  else if (dbField === 'companyDescription') companyData.description = value;
  else if (dbField === 'companyRevenue') companyData.revenue = value;
  else if (dbField === 'companyLinkedIn') companyData.linkedin = value;
  else if (dbField === 'companyFoundedYear') {
    const year = Number.parseInt(value);
    if (!isNaN(year)) companyData.foundedYear = year;
  }
  else if (dbField === 'companyPhone') companyData.phone = value;
}

/**
 * Check if contact already exists (duplicate detection)
 */
async function checkDuplicateContact(contactData: any, companyData: any, userId: string) {
  const duplicateChecks = [];

  if (contactData.email) {
    duplicateChecks.push({ email: contactData.email, userId });
  }
  if (contactData.firstName && contactData.lastName && companyData.name) {
    duplicateChecks.push({
      firstName: contactData.firstName,
      lastName: contactData.lastName,
      company: { name: companyData.name },
      userId
    });
  }
  if (!contactData.email && contactData.phone) {
    duplicateChecks.push({ phone: contactData.phone, userId });
  }

  if (duplicateChecks.length > 0) {
    return await prisma.contact.findFirst({
      where: { OR: duplicateChecks }
    });
  }

  return null;
}

/**
 * Find or create company for contact
 */
async function findOrCreateCompany(companyData: any, userId: string): Promise<string | null> {
  if (!companyData.name) return null;

  // Generate domain only if we have a valid website
  let domain = null;
  if (companyData.website && companyData.website.trim()) {
    try {
      const url = companyData.website.startsWith('http') ? companyData.website : 'https://' + companyData.website;
      domain = new URL(url).hostname;

      // Skip generic domains like linkedin.com
      if (domain.includes('linkedin.com') || domain.includes('facebook.com') || domain.includes('twitter.com')) {
        domain = null;
      }
    } catch (error) {
      // Invalid URL, don't use domain
      domain = null;
    }
  }

  // Find company ONLY by exact name match to avoid incorrect grouping
  let company = await prisma.company.findFirst({
    where: {
      name: companyData.name,
      userId
    }
  });

  if (!company) {
    const companyCreateData: any = {
      name: companyData.name,
      userId,
      dataSource: 'csv_import',
      fieldSources: companyData.fieldSources,
      domain
    };

    // Add optional fields
    if (companyData.industry) companyCreateData.industry = companyData.industry;
    if (companyData.size) companyCreateData.size = companyData.size;
    if (companyData.location) companyCreateData.location = companyData.location;
    if (companyData.website) companyCreateData.website = companyData.website;
    if (companyData.description) companyCreateData.description = companyData.description;
    if (companyData.revenue) companyCreateData.revenue = companyData.revenue;
    if (companyData.linkedin) companyCreateData.linkedin = companyData.linkedin;
    if (companyData.foundedYear) companyCreateData.foundedYear = companyData.foundedYear;
    if (companyData.phone) companyCreateData.phone = companyData.phone;

    try {
      company = await prisma.company.create({ data: companyCreateData });
    } catch (error: any) {
      // Handle unique constraint violation on domain
      if (error.code === 'P2002') {
        delete companyCreateData.domain;
        company = await prisma.company.create({ data: companyCreateData });
      } else {
        throw error;
      }
    }
  }

  return company.id;
}

/**
 * Process a single CSV record and create contact
 */
async function processCSVRecord(record: any, fieldMapping: Record<string, string>, userId: string, fileName: string) {
  const { contactData, companyData } = parseContactData(record, fieldMapping);

  logger.info(`[CSV Import] Parsed contact: firstName="${contactData.firstName}", lastName="${contactData.lastName}", email="${contactData.email}", company="${companyData.name}"`);

  // Check if this is a company-only record (no contact info)
  const hasContactInfo = !!(contactData.firstName && contactData.firstName.trim());
  const hasCompanyInfo = !!(companyData.name && companyData.name.trim());

  // If no first name AND no company name, skip this record entirely
  if (!hasContactInfo && !hasCompanyInfo) {
    logger.warn(`[CSV Import] Skipping record - no contact or company information`);
    return { skipped: true };
  }

  // If we have company info but no contact info, create company only
  if (!hasContactInfo && hasCompanyInfo) {
    logger.info(`[CSV Import] Company-only record detected: "${companyData.name}"`);

    // Create or update the company (this will capture ALL company data: website, industry, location, description, etc.)
    const companyId = await findOrCreateCompany(companyData, userId);
    logger.info(`[CSV Import] Company created/found: ${companyId}`);

    return {
      companyId,
      companyOnly: true,
    };
  }

  if (!contactData.lastName) contactData.lastName = '';

  // Validate phone number if provided
  if (contactData.phone) {
    const phoneValidation = validatePhoneNumber(contactData.phone);
    if (!phoneValidation.isValid) {
      logger.error(`[CSV Import] Invalid phone for ${contactData.firstName}: ${phoneValidation.error}`);
      return {
        error: true,
        message: `Invalid phone number for ${contactData.firstName} ${contactData.lastName}: ${phoneValidation.error}`
      };
    }
  }

  // Validate email if provided
  if (contactData.email) {
    const emailValidation = validateEmail(contactData.email);
    if (!emailValidation.isValid) {
      logger.error(`[CSV Import] Invalid email for ${contactData.firstName}: ${emailValidation.error}`);
      return {
        error: true,
        message: `Invalid email for ${contactData.firstName} ${contactData.lastName}: ${emailValidation.error}`
      };
    }
  }

  // Check for duplicates
  const existing = await checkDuplicateContact(contactData, companyData, userId);
  if (existing) {
    logger.info(`[CSV Import] Duplicate contact found: ${contactData.email || contactData.firstName + ' ' + contactData.lastName}`);
    return {
      duplicate: true,
      identifier: `${contactData.email || contactData.firstName + ' ' + contactData.lastName} (from ${fileName})`
    };
  }

  // Find or create company
  const companyId = await findOrCreateCompany(companyData, userId);
  logger.info(`[CSV Import] Company ID for ${contactData.firstName}: ${companyId || 'none'}`);

  // Create contact
  const contact = await prisma.contact.create({
    data: {
      firstName: contactData.firstName,
      lastName: contactData.lastName,
      email: contactData.email,
      phone: contactData.phone,
      title: contactData.title,
      role: contactData.role,
      status: contactData.status || 'LEAD',
      notes: contactData.notes,
      companyId,
      userId,
      customFields: contactData.customFields,
      fieldSources: contactData.fieldSources
    }
  });

  return { contact };
}

// POST /api/contacts/csv-import - AI CSV Import with multiple files
router.post('/csv-import', upload.array('files', 10), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No CSV files uploaded' });
    }

    const allImportedContacts: any[] = [];
    const allImportedCompanies: string[] = [];
    const allErrors: string[] = [];
    const allDuplicates: string[] = [];
    let totalProcessed = 0;

    for (const file of files) {
      try {
        const csvContent = file.buffer.toString('utf-8');
        const records = parse(csvContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });

        if (records.length === 0) {
          allErrors.push(`File ${file.originalname}: No valid records found`);
          continue;
        }

        const headers = Object.keys(records[0]);
        const fieldMapping = mapCSVFieldsToContact(headers);

        for (const record of records) {
          totalProcessed++;

          const result = await processCSVRecord(record, fieldMapping, userId, file.originalname);

          if (result.skipped) {
            continue;
          }

          if (result.duplicate) {
            allDuplicates.push(result.identifier!);
            continue;
          }

          if (result.error) {
            allErrors.push(result.message!);
            continue;
          }

          if (result.companyOnly && result.companyId) {
            allImportedCompanies.push(result.companyId);
          }

          if (result.contact) {
            allImportedContacts.push(result.contact);
          }
        }
      } catch (error: any) {
        allErrors.push(`File ${file.originalname}: ${error.message}`);
      }
    }

    res.json({
      message: 'CSV import completed',
      totalProcessed,
      contactsImported: allImportedContacts.length,
      companiesImported: allImportedCompanies.length,
      duplicates: allDuplicates.length,
      duplicatesList: allDuplicates,
      errors: allErrors.length > 0 ? allErrors : undefined,
      contacts: allImportedContacts
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/contacts/detect-duplicates
router.get('/detect-duplicates', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const allContacts = await prisma.contact.findMany({
      where: { userId, isActive: true },
      include: { company: { select: { name: true } } },
      orderBy: { createdAt: 'asc' }
    });

    const duplicateGroups: any[] = [];
    const processedIds = new Set<string>();

    // Email duplicates
    const emailMap = new Map<string, any[]>();
    allContacts.forEach(contact => {
      if (contact.email) {
        const key = contact.email.toLowerCase();
        if (!emailMap.has(key)) emailMap.set(key, []);
        emailMap.get(key)!.push(contact);
      }
    });

    emailMap.forEach((contacts, email) => {
      if (contacts.length > 1) {
        const [keep, ...duplicates] = contacts;
        duplicateGroups.push({
          type: 'email',
          field: email,
          keep: keep.id,
          duplicates: duplicates.map(d => d.id),
          contacts: contacts.map(c => ({
            id: c.id,
            firstName: c.firstName,
            lastName: c.lastName,
            email: c.email,
            phone: c.phone,
            company: c.company?.name,
            createdAt: c.createdAt
          }))
        });
        contacts.forEach(c => processedIds.add(c.id));
      }
    });

    // Phone duplicates
    const phoneMap = new Map<string, any[]>();
    allContacts.forEach(contact => {
      if (contact.phone && !processedIds.has(contact.id)) {
        const key = contact.phone.replace(/\D/g, '');
        if (key.length >= 10) {
          if (!phoneMap.has(key)) phoneMap.set(key, []);
          phoneMap.get(key)!.push(contact);
        }
      }
    });

    phoneMap.forEach((contacts, phone) => {
      if (contacts.length > 1) {
        const [keep, ...duplicates] = contacts;
        duplicateGroups.push({
          type: 'phone',
          field: phone,
          keep: keep.id,
          duplicates: duplicates.map(d => d.id),
          contacts: contacts.map(c => ({
            id: c.id,
            firstName: c.firstName,
            lastName: c.lastName,
            email: c.email,
            phone: c.phone,
            company: c.company?.name,
            createdAt: c.createdAt
          }))
        });
        contacts.forEach(c => processedIds.add(c.id));
      }
    });

    // Name + Company duplicates
    const nameCompanyMap = new Map<string, any[]>();
    allContacts.forEach(contact => {
      if (!processedIds.has(contact.id) && contact.firstName && contact.lastName && contact.company) {
        const key = `${contact.firstName.toLowerCase()}_${contact.lastName.toLowerCase()}_${contact.company.name.toLowerCase()}`;
        if (!nameCompanyMap.has(key)) nameCompanyMap.set(key, []);
        nameCompanyMap.get(key)!.push(contact);
      }
    });

    nameCompanyMap.forEach((contacts, key) => {
      if (contacts.length > 1) {
        const [keep, ...duplicates] = contacts;
        duplicateGroups.push({
          type: 'name_company',
          field: key.replace(/_/g, ' '),
          keep: keep.id,
          duplicates: duplicates.map(d => d.id),
          contacts: contacts.map(c => ({
            id: c.id,
            firstName: c.firstName,
            lastName: c.lastName,
            email: c.email,
            phone: c.phone,
            company: c.company?.name,
            createdAt: c.createdAt
          }))
        });
      }
    });

    res.json({
      totalDuplicateGroups: duplicateGroups.length,
      totalDuplicates: duplicateGroups.reduce((sum, group) => sum + group.duplicates.length, 0),
      groups: duplicateGroups
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/contacts/remove-duplicates
router.post('/remove-duplicates', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { duplicateIds } = req.body;

    if (!duplicateIds || !Array.isArray(duplicateIds)) {
      return res.status(400).json({ error: 'duplicateIds array is required' });
    }

    const result = await prisma.contact.updateMany({
      where: {
        id: { in: duplicateIds },
        userId
      },
      data: { isActive: false }
    });

    res.json({
      message: 'Duplicates removed successfully',
      removedCount: result.count
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// ASSIGNMENT ENDPOINTS
// ==========================================

// GET /api/contacts/assigned-to-me - Get all contacts assigned to current user
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

    const contacts = await prisma.contact.findMany({
      where: {
        assignedToId: userId,
        isActive: true
      },
      include: {
        company: true,
        tags: {
          include: { tag: true }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum
    });

    const total = await prisma.contact.count({
      where: {
        assignedToId: userId,
        isActive: true
      }
    });

    res.json({
      contacts,
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

// POST /api/contacts/bulk-assign - Bulk assign multiple contacts to a team member
router.post('/bulk-assign', async (req, res, next) => {
  try {
    const { contactIds, assignToUserId } = req.body;
    const userId = req.user!.id;
    const accountOwnerId = getAccountOwnerId(req);

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({ error: 'contactIds array is required' });
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

    // Only update contacts that user owns or is account owner
    const whereClause = req.user?.teamRole === 'OWNER'
      ? { id: { in: contactIds } }
      : { id: { in: contactIds }, userId };

    const result = await prisma.contact.updateMany({
      where: whereClause,
      data: { assignedToId: assignToUserId }
    });

    res.json({
      message: 'Contacts assigned successfully',
      assignedCount: result.count
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/contacts/:id/assign - Assign contact to a team member
router.post('/:id/assign', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { assignToUserId } = req.body;
    const userId = req.user!.id;
    const accountOwnerId = getAccountOwnerId(req);

    if (!assignToUserId) {
      return res.status(400).json({ error: 'assignToUserId is required' });
    }

    // Check if contact exists and user has permission
    const contact = await prisma.contact.findUnique({
      where: { id }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Only owner or contact creator can assign
    if (contact.userId !== userId && req.user?.teamRole !== 'OWNER') {
      return res.status(403).json({ error: 'You do not have permission to assign this contact' });
    }

    // Verify that assignToUserId is a team member
    const targetUser = await prisma.user.findUnique({
      where: { id: assignToUserId }
    });

    if (!targetUser || targetUser.accountOwnerId !== accountOwnerId) {
      return res.status(400).json({ error: 'Target user is not in your team' });
    }

    // Assign the contact
    const updatedContact = await prisma.contact.update({
      where: { id },
      data: { assignedToId: assignToUserId }
    });

    res.json({
      message: 'Contact assigned successfully',
      contact: updatedContact
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/contacts/:id/unassign - Unassign contact from team member
router.post('/:id/unassign', async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check if contact exists and user has permission
    const contact = await prisma.contact.findUnique({
      where: { id }
    });

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    // Only owner or contact creator can unassign
    if (contact.userId !== userId && req.user?.teamRole !== 'OWNER') {
      return res.status(403).json({ error: 'You do not have permission to unassign this contact' });
    }

    // Unassign the contact
    const updatedContact = await prisma.contact.update({
      where: { id },
      data: { assignedToId: null }
    });

    res.json({
      message: 'Contact unassigned successfully',
      contact: updatedContact
    });
  } catch (error) {
    next(error);
  }
});

export default router;
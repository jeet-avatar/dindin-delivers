// @ts-nocheck
import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../app';
import { authenticate } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import multer from 'multer';
import * as csv from 'csv-parse/sync';
import * as fs from 'fs';
import * as VCard from 'vcard-parser';
import * as XLSX from 'xlsx';

const router = Router();

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/csv/' });

// All routes require authentication
router.use(authenticate);

// Get all CSV imports
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any).id;

    const imports = await prisma.csvImport.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ imports });
  } catch (error) {
    next(error);
  }
});

// Get import by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req.user as any).id;

    const csvImport = await prisma.csvImport.findFirst({
      where: { id, userId },
    });

    if (!csvImport) {
      throw new AppError('Import not found', 404);
    }

    res.json({ import: csvImport });
  } catch (error) {
    next(error);
  }
});

// Upload and parse CSV/vCard file
router.post('/upload', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any).id;
    const { entityType, mapping } = req.body;

    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    if (!entityType || !['contacts', 'companies', 'deals'].includes(entityType)) {
      throw new AppError('Invalid entity type', 400);
    }

    let records = [];

    // Check file type and parse accordingly
    if (req.file.originalname.endsWith('.vcf') || req.file.originalname.endsWith('.vcard')) {
      // Parse vCard file
      const fileContent = fs.readFileSync(req.file.path, 'utf-8');
      const vCards = VCard.parseVCards(fileContent);

      records = vCards
        .map((vcard: any) => {
          const nameParts = vcard.fn?.value?.split(' ').filter((part: string) => part.trim()) || [];
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          const email = vcard.email?.[0]?.value || '';
          const phone = vcard.tel?.[0]?.value || '';
          const company = vcard.org?.[0]?.value || '';

          return {
            firstName,
            lastName,
            email,
            phone,
            company,
            status: 'LEAD'
          };
        })
        .filter((record: any) => record.firstName && record.firstName.trim());
    } else if (req.file.originalname.endsWith('.xlsx') || req.file.originalname.endsWith('.xls')) {
      // Parse Excel file
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      records = XLSX.utils.sheet_to_json(worksheet);
    } else {
      // Parse CSV file
      const fileContent = fs.readFileSync(req.file.path, 'utf-8');
      records = csv.parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
      });
    }

    // Create import record
    const csvImport = await prisma.csvImport.create({
      data: {
        userId,
        filename: req.file.originalname,
        entityType,
        totalRows: records.length,
        mapping: mapping ? JSON.parse(mapping) : {},
        status: 'PENDING',
      },
    });

    // Delete uploaded file
    fs.unlinkSync(req.file.path);

    logger.info(`File uploaded: ${req.file.originalname}, ${records.length} rows`);

    res.status(201).json({
      message: 'File uploaded successfully',
      import: csvImport,
      preview: records.slice(0, 5), // Return first 5 rows for preview
      headers: Object.keys(records[0] || {}),
    });
  } catch (error) {
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});

// Process CSV import
router.post('/:id/process', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req.user as any).id;
    const { data, mapping } = req.body;

    const csvImport = await prisma.csvImport.findFirst({
      where: { id, userId },
    });

    if (!csvImport) {
      throw new AppError('Import not found', 404);
    }

    if (csvImport.status !== 'PENDING') {
      throw new AppError('Import already processed', 400);
    }

    // Update status to processing
    await prisma.csvImport.update({
      where: { id },
      data: {
        status: 'PROCESSING',
        startedAt: new Date(),
        mapping,
      },
    });

    let successCount = 0;
    let failedCount = 0;
    const errors: any[] = [];

    // Process based on entity type
    for (let i = 0; i < data.length; i++) {
      try {
        const row = data[i];

        if (csvImport.entityType === 'contacts') {
          const firstName = row[mapping.firstName]?.trim();
          const lastName = row[mapping.lastName]?.trim();

          // Skip contacts without a valid first name
          if (!firstName) {
            continue;
          }

          await prisma.contact.create({
            data: {
              userId,
              firstName,
              lastName: lastName || '',
              email: row[mapping.email] || null,
              phone: row[mapping.phone] || null,
              status: row[mapping.status] || 'LEAD',
            },
          });
        } else if (csvImport.entityType === 'companies') {
          const companyName = row[mapping.name]?.trim();

          // Skip companies without a valid name
          if (!companyName) {
            continue;
          }

          await prisma.company.create({
            data: {
              userId,
              name: companyName,
              domain: row[mapping.domain] || null,
              industry: row[mapping.industry] || null,
              website: row[mapping.website] || null,
              location: row[mapping.location] || null,
            },
          });
        }

        successCount++;
      } catch (err: any) {
        failedCount++;
        errors.push({
          row: i + 1,
          error: err.message,
        });
      }
    }

    // Update import status
    const completedImport = await prisma.csvImport.update({
      where: { id },
      data: {
        status: successCount > 0 ? 'COMPLETED' : 'FAILED',
        processedRows: data.length,
        successRows: successCount,
        failedRows: failedCount,
        errors: errors.length > 0 ? errors : null,
        completedAt: new Date(),
      },
    });

    logger.info(`CSV import completed: ${id}, ${successCount} success, ${failedCount} failed`);

    res.json({
      message: 'Import completed',
      import: completedImport,
    });
  } catch (error) {
    // Update status to failed
    await prisma.csvImport.update({
      where: { id: req.params.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
      },
    });

    next(error);
  }
});

// Delete import
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req.user as any).id;

    const csvImport = await prisma.csvImport.findFirst({
      where: { id, userId },
    });

    if (!csvImport) {
      throw new AppError('Import not found', 404);
    }

    await prisma.csvImport.delete({
      where: { id },
    });

    logger.info(`CSV import deleted: ${id}`);

    res.json({ message: 'Import deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;

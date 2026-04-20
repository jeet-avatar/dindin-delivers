import { Router } from 'express';
import { PrismaClient, DealStage } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Enable authentication for all deal routes
router.use(authenticate);

// GET /api/deals - Get all deals
router.get('/', async (req, res, next) => {
  try {
    const { 
      search, 
      stage,
      page = '1', 
      limit = '50' 
    } = req.query as {
      search?: string;
      stage?: string;
      page?: string;
      limit?: string;
    };

    const pageNum = Number.parseInt(page);
    const limitNum = Number.parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {
      userId: req.user?.id,
      isActive: true,
    };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (stage && stage !== '') {
      where.stage = stage;
    }

    // Get deals with relations
    const deals = await prisma.deal.findMany({
      where,
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { stage: 'asc' },
        { createdAt: 'desc' },
      ],
      skip,
      take: limitNum,
    });

    // Get total count
    const total = await prisma.deal.count({ where });

    // Convert Decimal to number for JSON serialization
    const transformedDeals = deals.map(deal => ({
      ...deal,
      value: Number(deal.value),
    }));

    res.json({
      deals: transformedDeals,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/deals/:id - Get single deal
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const deal = await prisma.deal.findFirst({
      where: {
        id,
        userId: req.user?.id, // Only allow access to user's own deals
      },
      include: {
        contact: true,
        company: true,
        activities: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Convert Decimal to Number
    const transformedDeal = {
      ...deal,
      value: Number(deal.value),
    };

    return res.json({ deal: transformedDeal });
  } catch (error) {
    return next(error);
  }
});

// POST /api/deals - Create new deal
router.post('/', async (req, res, next) => {
  try {
    const {
      title,
      value,
      stage = 'PROSPECTING',
      probability = 10,
      expectedCloseDate,
      contactId,
      companyId,
      description,
    } = req.body;

    const deal = await prisma.deal.create({
      data: {
        title,
        value: parseFloat(value),
        stage,
        probability,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
        contactId: contactId || null,
        companyId: companyId || null,
        description,
        userId: req.user!.id,
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Convert Decimal to Number
    const transformedDeal = {
      ...deal,
      value: Number(deal.value),
    };

    res.status(201).json({ deal: transformedDeal });
  } catch (error) {
    next(error);
  }
});

// PUT /api/deals/:id - Update deal
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      value,
      stage,
      probability,
      expectedCloseDate,
      contactId,
      companyId,
      description,
    } = req.body;

    // Verify ownership before update
    const existingDeal = await prisma.deal.findFirst({
      where: {
        id,
        userId: req.user?.id,
      },
    });

    if (!existingDeal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updateData.title = title;
    if (value !== undefined) updateData.value = parseFloat(value);
    if (stage !== undefined) updateData.stage = stage;
    if (probability !== undefined) updateData.probability = probability;
    if (expectedCloseDate !== undefined) updateData.expectedCloseDate = expectedCloseDate ? new Date(expectedCloseDate) : null;
    if (contactId !== undefined) updateData.contactId = contactId || null;
    if (companyId !== undefined) updateData.companyId = companyId || null;
    if (description !== undefined) updateData.description = description;

    const deal = await prisma.deal.update({
      where: { id },
      data: updateData,
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Convert Decimal to Number
    const transformedDeal = {
      ...deal,
      value: Number(deal.value),
    };

    res.json({ deal: transformedDeal });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/deals/:id/stage - Update deal stage
router.patch('/:id/stage', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;

    // ✅ Verify ownership before updating
    const existing = await prisma.deal.findFirst({
      where: {
        id,
        userId: req.user?.id,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const deal = await prisma.deal.update({
      where: { id },
      data: {
        stage,
        actualCloseDate: (stage === 'CLOSED_WON' || stage === 'CLOSED_LOST') ? new Date() : null,
        updatedAt: new Date(),
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Convert Decimal to Number
    const transformedDeal = {
      ...deal,
      value: Number(deal.value),
    };

    res.json({ deal: transformedDeal });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/deals/:id - Delete deal
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify ownership before delete
    const existingDeal = await prisma.deal.findFirst({
      where: {
        id,
        userId: req.user?.id,
      },
    });

    if (!existingDeal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    // Soft delete - mark as inactive
    await prisma.deal.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    res.json({ message: 'Deal deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/deals/bulk-import - Import multiple deals at once
const STAGE_MAP: Record<string, string> = {
  'prospecting': 'PROSPECTING',
  'qualification': 'QUALIFICATION',
  'qualified': 'QUALIFICATION',
  'proposal': 'PROPOSAL',
  'proposal/price quote': 'PROPOSAL',
  'value proposition': 'PROPOSAL',
  'negotiation': 'NEGOTIATION',
  'negotiation/review': 'NEGOTIATION',
  'decision maker bought-in': 'NEGOTIATION',
  'contract sent': 'NEGOTIATION',
  'closed won': 'CLOSED_WON',
  'closedwon': 'CLOSED_WON',
  'closed_won': 'CLOSED_WON',
  'won': 'CLOSED_WON',
  'closed lost': 'CLOSED_LOST',
  'closedlost': 'CLOSED_LOST',
  'closed_lost': 'CLOSED_LOST',
  'lost': 'CLOSED_LOST',
};

router.post('/bulk-import', async (req, res, next) => {
  try {
    const { deals } = req.body as {
      deals: Array<{
        title?: string;
        value?: string | number;
        stage?: string;
        probability?: number;
        expectedCloseDate?: string;
        contactEmail?: string;
        companyName?: string;
        description?: string;
      }>;
    };

    if (!Array.isArray(deals)) {
      return res.status(400).json({ error: 'deals must be an array' });
    }

    let imported = 0;
    let failed = 0;
    const errors: Array<{ row: number; title: string; reason: string }> = [];

    for (let i = 0; i < deals.length; i++) {
      const row = deals[i];
      const rowNum = i + 1;

      // Validate required fields
      if (!row.title || String(row.title).trim() === '') {
        failed++;
        errors.push({ row: rowNum, title: '', reason: 'Missing required field: title' });
        continue;
      }

      const parsedValue = parseFloat(String(row.value));
      if (isNaN(parsedValue)) {
        failed++;
        errors.push({ row: rowNum, title: String(row.title), reason: 'Invalid or missing value (must be a number)' });
        continue;
      }

      // Resolve contactId from contactEmail
      let contactId: string | null = null;
      if (row.contactEmail) {
        const contact = await prisma.contact.findFirst({
          where: { email: row.contactEmail },
        });
        if (contact) contactId = contact.id;
      }

      // Resolve companyId from companyName
      let companyId: string | null = null;
      if (row.companyName) {
        const company = await prisma.company.findFirst({
          where: { name: { contains: row.companyName, mode: 'insensitive' } },
        });
        if (company) companyId = company.id;
      }

      // Normalize stage
      const stageKey = row.stage ? String(row.stage).toLowerCase().trim() : '';
      const normalizedStage = (STAGE_MAP[stageKey] ?? 'PROSPECTING') as DealStage;

      try {
        await prisma.deal.create({
          data: {
            title: String(row.title).trim(),
            value: parsedValue,
            stage: normalizedStage,
            probability: row.probability ?? 10,
            expectedCloseDate: row.expectedCloseDate ? new Date(row.expectedCloseDate) : null,
            contactId,
            companyId,
            description: row.description ?? null,
            userId: req.user!.id,
          },
        });
        imported++;
      } catch (err: any) {
        failed++;
        errors.push({
          row: rowNum,
          title: String(row.title),
          reason: err?.message ?? 'Database error while creating deal',
        });
      }
    }

    return res.json({ imported, failed, errors });
  } catch (error) {
    return next(error);
  }
});

export default router;
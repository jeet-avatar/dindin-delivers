import { Router } from 'express';
import { PrismaClient, QuoteStatus } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Enable authentication for all quote routes
router.use(authenticate);

// Helper to serialize Decimal fields to numbers
function serializeQuote(q: any) {
  return {
    ...q,
    subtotal: Number(q.subtotal),
    tax: q.tax !== null && q.tax !== undefined ? Number(q.tax) : null,
    total: Number(q.total),
  };
}

// GET /api/quotes - List quotes, optionally filtered by ?dealId=
router.get('/', async (req, res, next) => {
  try {
    const { dealId } = req.query as { dealId?: string };

    const where: any = { userId: req.user!.id };
    if (dealId) where.dealId = dealId;

    const quotes = await prisma.quote.findMany({
      where,
      include: {
        deal: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(quotes.map(serializeQuote));
  } catch (error) {
    next(error);
  }
});

// POST /api/quotes - Create a new quote
router.post('/', async (req, res, next) => {
  try {
    const {
      dealId,
      title,
      lineItems,
      subtotal,
      tax,
      total,
      notes,
      validUntil,
    } = req.body;

    if (!dealId || !title || !lineItems || subtotal === undefined || total === undefined) {
      return res.status(400).json({ error: 'dealId, title, lineItems, subtotal, and total are required' });
    }

    // Validate deal exists and belongs to authenticated user
    const deal = await prisma.deal.findFirst({
      where: { id: dealId, userId: req.user!.id },
    });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const quote = await prisma.quote.create({
      data: {
        dealId,
        userId: req.user!.id,
        title,
        lineItems,
        subtotal: parseFloat(subtotal),
        tax: tax !== undefined && tax !== null ? parseFloat(tax) : null,
        total: parseFloat(total),
        notes: notes || null,
        validUntil: validUntil ? new Date(validUntil) : null,
      },
    });

    return res.status(201).json(serializeQuote(quote));
  } catch (error) {
    return next(error);
  }
});

// PUT /api/quotes/:id - Update a quote
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Ownership check
    const existing = await prisma.quote.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const {
      title,
      lineItems,
      subtotal,
      tax,
      total,
      notes,
      validUntil,
    } = req.body;

    const updateData: any = { updatedAt: new Date() };

    if (title !== undefined) updateData.title = title;
    if (lineItems !== undefined) updateData.lineItems = lineItems;
    if (subtotal !== undefined) updateData.subtotal = parseFloat(subtotal);
    if (tax !== undefined) updateData.tax = tax !== null ? parseFloat(tax) : null;
    if (total !== undefined) updateData.total = parseFloat(total);
    if (notes !== undefined) updateData.notes = notes;
    if (validUntil !== undefined) updateData.validUntil = validUntil ? new Date(validUntil) : null;

    const quote = await prisma.quote.update({
      where: { id },
      data: updateData,
    });

    return res.json(serializeQuote(quote));
  } catch (error) {
    return next(error);
  }
});

// PATCH /api/quotes/:id/status - Update only the status field
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: QuoteStatus };

    // Ownership check
    const existing = await prisma.quote.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    const updateData: any = { status, updatedAt: new Date() };

    if (status === QuoteStatus.SENT) {
      updateData.sentAt = new Date();
    } else if (status === QuoteStatus.ACCEPTED) {
      updateData.acceptedAt = new Date();
    }

    const quote = await prisma.quote.update({
      where: { id },
      data: updateData,
    });

    return res.json(serializeQuote(quote));
  } catch (error) {
    return next(error);
  }
});

// DELETE /api/quotes/:id - Hard delete a quote
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Ownership check
    const existing = await prisma.quote.findFirst({
      where: { id, userId: req.user!.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Quote not found' });
    }

    await prisma.quote.delete({ where: { id } });

    res.json({ message: 'Quote deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Enable authentication for all ticket routes
router.use(authenticate);

// GET /api/tickets - Get all support tickets with filtering
router.get('/', async (req, res, next) => {
  try {
    const {
      search,
      status,
      priority,
      category,
      assignedTo,
      customerId,
      page = '1',
      limit = '50'
    } = req.query as {
      search?: string;
      status?: string;
      priority?: string;
      category?: string;
      assignedTo?: string;
      customerId?: string;
      page?: string;
      limit?: string;
    };

    const pageNum = Number.parseInt(page);
    const limitNum = Number.parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status && status !== '') {
      where.status = status;
    }

    if (priority && priority !== '') {
      where.priority = priority;
    }

    if (category && category !== '') {
      where.category = category;
    }

    if (assignedTo && assignedTo !== '') {
      where.assignedTo = assignedTo;
    }

    if (customerId && customerId !== '') {
      where.customerId = customerId;
    }

    // Get tickets with relations
    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
        comments: {
          select: {
            id: true,
            isInternal: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
      skip,
      take: limitNum,
    });

    // Get total count
    const total = await prisma.supportTicket.count({ where });

    // Add computed fields
    const transformedTickets = tickets.map(ticket => ({
      ...ticket,
      commentCount: ticket.comments.length,
      internalCommentCount: ticket.comments.filter(c => c.isInternal).length,
      comments: undefined,
    }));

    res.json({
      tickets: transformedTickets,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/tickets/:id - Get single support ticket
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            domain: true,
            website: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found' });
    }

    res.json(ticket);
  } catch (error) {
    next(error);
  }
});

// POST /api/tickets - Create new support ticket
router.post('/', async (req, res, next) => {
  try {
    const {
      title,
      description,
      status,
      priority,
      category,
      assignedTo,
      customerId,
    } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({ error: 'Ticket title is required' });
    }

    if (!description) {
      return res.status(400).json({ error: 'Ticket description is required' });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        title,
        description,
        status: status || 'OPEN',
        priority: priority || 'MEDIUM',
        category: category || 'GENERAL',
        assignedTo: assignedTo || null,
        customerId: customerId || null,
      },
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json(ticket);
  } catch (error) {
    next(error);
  }
});

// PUT /api/tickets/:id - Update support ticket
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      status,
      priority,
      category,
      assignedTo,
      customerId,
    } = req.body;

    // Check if ticket exists
    const existingTicket = await prisma.supportTicket.findUnique({
      where: { id },
    });

    if (!existingTicket) {
      return res.status(404).json({ error: 'Support ticket not found' });
    }

    // Prepare update data
    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) {
      updateData.status = status;
      // Auto-set resolvedAt when status changes to RESOLVED
      if (status === 'RESOLVED' && existingTicket.status !== 'RESOLVED') {
        updateData.resolvedAt = new Date();
      }
      // Auto-set closedAt when status changes to CLOSED
      if (status === 'CLOSED' && existingTicket.status !== 'CLOSED') {
        updateData.closedAt = new Date();
      }
      // Clear timestamps if status changes away from RESOLVED/CLOSED
      if (status !== 'RESOLVED' && existingTicket.resolvedAt) {
        updateData.resolvedAt = null;
      }
      if (status !== 'CLOSED' && existingTicket.closedAt) {
        updateData.closedAt = null;
      }
    }
    if (priority !== undefined) updateData.priority = priority;
    if (category !== undefined) updateData.category = category;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo || null;
    if (customerId !== undefined) updateData.customerId = customerId || null;

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: updateData,
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json(ticket);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/tickets/:id - Delete support ticket
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if ticket exists
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found' });
    }

    await prisma.supportTicket.delete({
      where: { id },
    });

    res.json({ message: 'Support ticket deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/tickets/:id/comments - Add comment to support ticket
router.post('/:id/comments', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content, isInternal } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Check if ticket exists
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Support ticket not found' });
    }

    const comment = await prisma.ticketComment.create({
      data: {
        content,
        isInternal: isInternal || false,
        ticketId: id,
        authorId: req.user!.id,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
});

// GET /api/tickets/stats/overview - Get ticket statistics
router.get('/stats/overview', async (req, res, next) => {
  try {
    const { assignedTo, customerId } = req.query as {
      assignedTo?: string;
      customerId?: string;
    };

    const where: any = {};
    if (assignedTo) where.assignedTo = assignedTo;
    if (customerId) where.customerId = customerId;

    // Get counts by status
    const [
      openCount,
      inProgressCount,
      waitingCount,
      resolvedCount,
      closedCount,
      totalCount,
    ] = await Promise.all([
      prisma.supportTicket.count({ where: { ...where, status: 'OPEN' } }),
      prisma.supportTicket.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      prisma.supportTicket.count({ where: { ...where, status: 'WAITING_ON_CUSTOMER' } }),
      prisma.supportTicket.count({ where: { ...where, status: 'RESOLVED' } }),
      prisma.supportTicket.count({ where: { ...where, status: 'CLOSED' } }),
      prisma.supportTicket.count({ where }),
    ]);

    // Get counts by priority
    const [criticalCount, highCount, mediumCount, lowCount] = await Promise.all([
      prisma.supportTicket.count({ where: { ...where, priority: 'CRITICAL' } }),
      prisma.supportTicket.count({ where: { ...where, priority: 'HIGH' } }),
      prisma.supportTicket.count({ where: { ...where, priority: 'MEDIUM' } }),
      prisma.supportTicket.count({ where: { ...where, priority: 'LOW' } }),
    ]);

    res.json({
      byStatus: {
        open: openCount,
        inProgress: inProgressCount,
        waiting: waitingCount,
        resolved: resolvedCount,
        closed: closedCount,
      },
      byPriority: {
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
      },
      total: totalCount,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

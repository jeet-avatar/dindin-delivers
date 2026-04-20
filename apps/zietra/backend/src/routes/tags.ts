import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Enable authentication for all tag routes
router.use(authenticate);

// GET /api/tags - Get all tags for current user
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user?.id;

    const tags = await prisma.tag.findMany({
      where: {
        userId, // ✅ Filter by user
      },
      include: {
        _count: {
          select: {
            contacts: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json({ tags });
  } catch (error) {
    next(error);
  }
});

// POST /api/tags - Create new tag for current user
router.post('/', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { name, color = '#3B82F6' } = req.body;

    const tag = await prisma.tag.create({
      data: {
        name,
        color,
        userId: userId!, // ✅ Assign to user
      },
    });

    res.status(201).json({ tag });
  } catch (error) {
    next(error);
  }
});

// PUT /api/tags/:id - Update tag (only if user owns it)
router.put('/:id', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { name, color } = req.body;

    // ✅ Check ownership before updating
    const existing = await prisma.tag.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Tag not found or access denied' });
    }

    const tag = await prisma.tag.update({
      where: { id },
      data: {
        name,
        color,
      },
    });

    res.json({ tag });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/tags/:id - Delete tag (only if user owns it)
router.delete('/:id', async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    // ✅ Check ownership before deleting
    const existing = await prisma.tag.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Tag not found or access denied' });
    }

    // Remove all contact-tag relationships first
    await prisma.contactTag.deleteMany({
      where: { tagId: id },
    });

    // Delete the tag
    await prisma.tag.delete({
      where: { id },
    });

    res.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Enable authentication for all task routes
router.use(authenticate);

// GET /api/tasks - Get all tasks with filtering
router.get('/', async (req, res, next) => {
  try {
    const {
      search,
      status,
      priority,
      type,
      assignedTo,
      projectId,
      page = '1',
      limit = '50'
    } = req.query as {
      search?: string;
      status?: string;
      priority?: string;
      type?: string;
      assignedTo?: string;
      projectId?: string;
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

    if (type && type !== '') {
      where.type = type;
    }

    if (assignedTo && assignedTo !== '') {
      where.assignedTo = assignedTo;
    }

    if (projectId && projectId !== '') {
      where.projectId = projectId;
    }

    // Get tasks with relations
    const tasks = await prisma.task.findMany({
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
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        comments: {
          select: {
            id: true,
          },
        },
        timeLogs: {
          select: {
            id: true,
            duration: true,
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
    const total = await prisma.task.count({ where });

    // Add computed fields
    const transformedTasks = tasks.map(task => ({
      ...task,
      commentCount: task.comments.length,
      totalTimeLogged: task.timeLogs.reduce((sum, log) => sum + log.duration, 0),
      comments: undefined,
      timeLogs: undefined,
    }));

    res.json({
      tasks: transformedTasks,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/tasks/:id - Get single task
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findUnique({
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
        project: {
          select: {
            id: true,
            name: true,
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
            createdAt: 'desc',
          },
        },
        timeLogs: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: {
            loggedAt: 'desc',
          },
        },
      },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    next(error);
  }
});

// POST /api/tasks - Create new task
router.post('/', async (req, res, next) => {
  try {
    const {
      title,
      description,
      status,
      priority,
      type,
      assignedTo,
      projectId,
      dueDate,
    } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        status: status || 'TODO',
        priority: priority || 'MEDIUM',
        type: type || 'FEATURE',
        assignedTo: assignedTo || null,
        projectId: projectId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
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
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      status,
      priority,
      type,
      assignedTo,
      projectId,
      dueDate,
    } = req.body;

    // Check if task exists
    const existingTask = await prisma.task.findUnique({
      where: { id },
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Prepare update data
    const updateData: any = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) {
      updateData.status = status;
      // Auto-set completedAt when status changes to DONE
      if (status === 'DONE' && existingTask.status !== 'DONE') {
        updateData.completedAt = new Date();
      } else if (status !== 'DONE' && existingTask.completedAt) {
        updateData.completedAt = null;
      }
    }
    if (priority !== undefined) updateData.priority = priority;
    if (type !== undefined) updateData.type = type;
    if (assignedTo !== undefined) updateData.assignedTo = assignedTo || null;
    if (projectId !== undefined) updateData.projectId = projectId || null;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

    const task = await prisma.task.update({
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
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json(task);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if task exists
    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await prisma.task.delete({
      where: { id },
    });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/tasks/:id/comments - Add comment to task
router.post('/:id/comments', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Check if task exists
    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const comment = await prisma.taskComment.create({
      data: {
        content,
        taskId: id,
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

// POST /api/tasks/:id/time-logs - Add time log to task
router.post('/:id/time-logs', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { duration, notes, loggedAt } = req.body;

    if (!duration || duration <= 0) {
      return res.status(400).json({ error: 'Valid duration is required (in minutes)' });
    }

    // Check if task exists
    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const timeLog = await prisma.timeLog.create({
      data: {
        duration,
        notes,
        loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
        taskId: id,
        userId: req.user!.id,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json(timeLog);
  } catch (error) {
    next(error);
  }
});

export default router;

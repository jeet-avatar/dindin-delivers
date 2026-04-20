import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Enable authentication for all project routes
router.use(authenticate);

// GET /api/projects - Get all projects with filtering
router.get('/', async (req, res, next) => {
  try {
    const {
      search,
      status,
      ownerId,
      page = '1',
      limit = '50'
    } = req.query as {
      search?: string;
      status?: string;
      ownerId?: string;
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
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status && status !== '') {
      where.status = status;
    }

    if (ownerId && ownerId !== '') {
      where.ownerId = ownerId;
    }

    // Get projects with relations
    const projects = await prisma.project.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        tasks: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' },
      ],
      skip,
      take: limitNum,
    });

    // Get total count
    const total = await prisma.project.count({ where });

    // Add computed fields
    const transformedProjects = projects.map(project => {
      const totalTasks = project.tasks.length;
      const completedTasks = project.tasks.filter(t => t.status === 'DONE').length;
      const actualProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        ...project,
        taskCount: totalTasks,
        completedTaskCount: completedTasks,
        actualProgress,
        tasks: undefined,
      };
    });

    res.json({
      projects: transformedProjects,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/:id - Get single project
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        tasks: {
          include: {
            assignee: {
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
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Add computed fields
    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter(t => t.status === 'DONE').length;
    const actualProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    res.json({
      ...project,
      taskCount: totalTasks,
      completedTaskCount: completedTasks,
      actualProgress,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/projects - Create new project
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      description,
      status,
      ownerId,
      progress,
      startDate,
      dueDate,
    } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const project = await prisma.project.create({
      data: {
        name,
        description,
        status: status || 'PLANNING',
        ownerId: ownerId || req.user!.id,
        progress: progress || 0,
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
});

// PUT /api/projects/:id - Update project
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      status,
      ownerId,
      progress,
      startDate,
      dueDate,
    } = req.body;

    // Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Prepare update data
    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) {
      updateData.status = status;
      // Auto-set completedAt when status changes to COMPLETED
      if (status === 'COMPLETED' && existingProject.status !== 'COMPLETED') {
        updateData.completedAt = new Date();
      } else if (status !== 'COMPLETED' && existingProject.completedAt) {
        updateData.completedAt = null;
      }
    }
    if (ownerId !== undefined) updateData.ownerId = ownerId;
    if (progress !== undefined) updateData.progress = progress;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    res.json(project);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        tasks: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Note: Tasks will be set to null (onDelete: SetNull) when project is deleted
    await prisma.project.delete({
      where: { id },
    });

    res.json({
      message: 'Project deleted successfully',
      tasksAffected: project.tasks.length,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/projects/:id/tasks - Get all tasks for a project
router.get('/:id/tasks', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.query as { status?: string };

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const where: any = { projectId: id };
    if (status && status !== '') {
      where.status = status;
    }

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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ tasks });
  } catch (error) {
    next(error);
  }
});

export default router;

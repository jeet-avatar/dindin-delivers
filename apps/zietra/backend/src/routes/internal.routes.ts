import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Enable authentication for all internal routes
router.use(authenticate);

// GET /api/internal/dashboard - Get dashboard metrics
router.get('/dashboard', async (req, res, next) => {
  try {
    const userId = req.user!.id;

    // Get task statistics
    const [
      myTasks,
      todoTasks,
      inProgressTasks,
      blockedTasks,
      doneTasks,
      highPriorityTasks,
      urgentTasks,
      overdueTasks,
    ] = await Promise.all([
      prisma.task.count({ where: { assignedTo: userId } }),
      prisma.task.count({ where: { assignedTo: userId, status: 'TODO' } }),
      prisma.task.count({ where: { assignedTo: userId, status: 'IN_PROGRESS' } }),
      prisma.task.count({ where: { assignedTo: userId, status: 'BLOCKED' } }),
      prisma.task.count({ where: { assignedTo: userId, status: 'DONE' } }),
      prisma.task.count({ where: { assignedTo: userId, priority: 'HIGH' } }),
      prisma.task.count({ where: { assignedTo: userId, priority: 'URGENT' } }),
      prisma.task.count({
        where: {
          assignedTo: userId,
          dueDate: { lt: new Date() },
          status: { notIn: ['DONE', 'CANCELLED'] },
        },
      }),
    ]);

    // Get project statistics
    const [
      myProjects,
      activeProjects,
      planningProjects,
      completedProjects,
    ] = await Promise.all([
      prisma.project.count({ where: { ownerId: userId } }),
      prisma.project.count({ where: { ownerId: userId, status: 'ACTIVE' } }),
      prisma.project.count({ where: { ownerId: userId, status: 'PLANNING' } }),
      prisma.project.count({ where: { ownerId: userId, status: 'COMPLETED' } }),
    ]);

    // Get support ticket statistics
    const [
      myTickets,
      openTickets,
      inProgressTickets,
      waitingTickets,
      resolvedTickets,
      criticalTickets,
    ] = await Promise.all([
      prisma.supportTicket.count({ where: { assignedTo: userId } }),
      prisma.supportTicket.count({ where: { assignedTo: userId, status: 'OPEN' } }),
      prisma.supportTicket.count({ where: { assignedTo: userId, status: 'IN_PROGRESS' } }),
      prisma.supportTicket.count({ where: { assignedTo: userId, status: 'WAITING_ON_CUSTOMER' } }),
      prisma.supportTicket.count({ where: { assignedTo: userId, status: 'RESOLVED' } }),
      prisma.supportTicket.count({ where: { assignedTo: userId, priority: 'CRITICAL' } }),
    ]);

    // Get recent tasks
    const recentTasks = await prisma.task.findMany({
      where: { assignedTo: userId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    // Get recent tickets
    const recentTickets = await prisma.supportTicket.findMany({
      where: { assignedTo: userId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    // Get time logged this week
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const timeLogs = await prisma.timeLog.findMany({
      where: {
        userId,
        loggedAt: { gte: weekStart },
      },
    });

    const timeLoggedThisWeek = timeLogs.reduce((sum, log) => sum + log.duration, 0);

    res.json({
      tasks: {
        total: myTasks,
        byStatus: {
          todo: todoTasks,
          inProgress: inProgressTasks,
          blocked: blockedTasks,
          done: doneTasks,
        },
        highPriority: highPriorityTasks,
        urgent: urgentTasks,
        overdue: overdueTasks,
        recent: recentTasks,
      },
      projects: {
        total: myProjects,
        byStatus: {
          planning: planningProjects,
          active: activeProjects,
          completed: completedProjects,
        },
      },
      tickets: {
        total: myTickets,
        byStatus: {
          open: openTickets,
          inProgress: inProgressTickets,
          waiting: waitingTickets,
          resolved: resolvedTickets,
        },
        critical: criticalTickets,
        recent: recentTickets,
      },
      timeTracking: {
        thisWeek: timeLoggedThisWeek,
        thisWeekFormatted: `${Math.floor(timeLoggedThisWeek / 60)}h ${timeLoggedThisWeek % 60}m`,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/internal/activity - Get recent activity across all internal operations
router.get('/activity', async (req, res, next) => {
  try {
    const { limit = '20' } = req.query as { limit?: string };
    const limitNum = Number.parseInt(limit);

    // Get recent task updates
    const recentTaskUpdates = await prisma.task.findMany({
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limitNum,
    });

    // Get recent ticket updates
    const recentTicketUpdates = await prisma.supportTicket.findMany({
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limitNum,
    });

    // Get recent comments
    const recentTaskComments = await prisma.taskComment.findMany({
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limitNum,
    });

    const recentTicketComments = await prisma.ticketComment.findMany({
      where: { isInternal: false },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        ticket: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limitNum,
    });

    res.json({
      tasks: recentTaskUpdates,
      tickets: recentTicketUpdates,
      taskComments: recentTaskComments,
      ticketComments: recentTicketComments,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/internal/team-stats - Get team-wide statistics
router.get('/team-stats', async (req, res, next) => {
  try {
    // Get all team members with their task/ticket counts
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    const teamStats = await Promise.all(
      users.map(async (user) => {
        const [taskCount, ticketCount, projectCount] = await Promise.all([
          prisma.task.count({ where: { assignedTo: user.id } }),
          prisma.supportTicket.count({ where: { assignedTo: user.id } }),
          prisma.project.count({ where: { ownerId: user.id } }),
        ]);

        return {
          user,
          taskCount,
          ticketCount,
          projectCount,
        };
      })
    );

    // Get overall statistics
    const [totalTasks, totalProjects, totalTickets] = await Promise.all([
      prisma.task.count(),
      prisma.project.count(),
      prisma.supportTicket.count(),
    ]);

    res.json({
      teamMembers: teamStats,
      overall: {
        totalTasks,
        totalProjects,
        totalTickets,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

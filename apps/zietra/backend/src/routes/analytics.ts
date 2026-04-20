import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Apply authentication to all routes
router.use(authenticate);

// Helper function to calculate date range
const getDateRange = (timeRange: string) => {
  const now = new Date();
  let startDate = new Date();

  switch (timeRange) {
    case '7d':
      startDate.setDate(now.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(now.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(now.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate.setDate(now.getDate() - 30); // Default to 30 days
  }

  return { startDate, endDate: now };
};

// Helper function to get previous period date range
const getPreviousPeriodRange = (timeRange: string) => {
  const { startDate, endDate } = getDateRange(timeRange);
  const diff = endDate.getTime() - startDate.getTime();

  const prevEndDate = new Date(startDate);
  const prevStartDate = new Date(startDate.getTime() - diff);

  return { startDate: prevStartDate, endDate: prevEndDate };
};

// Main analytics endpoint
router.get('/', async (req, res, next) => {
  try {
    const timeRange = (req.query.timeRange as string) || '30d';
    const { startDate, endDate } = getDateRange(timeRange);
    const { startDate: prevStartDate, endDate: prevEndDate } = getPreviousPeriodRange(timeRange);

    // Revenue calculation from deals (only for this user)
    const wonDeals = await prisma.deal.findMany({
      where: {
        userId: req.user?.id, // Only this user's deals
        stage: 'CLOSED_WON',
        actualCloseDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        value: true,
        actualCloseDate: true,
      },
    });

    const prevWonDeals = await prisma.deal.findMany({
      where: {
        userId: req.user?.id, // Only this user's deals
        stage: 'CLOSED_WON',
        actualCloseDate: {
          gte: prevStartDate,
          lte: prevEndDate,
        },
      },
      select: {
        value: true,
      },
    });

    const currentRevenue = wonDeals.reduce((sum, deal) => sum + Number(deal.value), 0);
    const previousRevenue = prevWonDeals.reduce((sum, deal) => sum + Number(deal.value), 0);
    const revenueTrend = previousRevenue > 0
      ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100)
      : 0;

    // Monthly revenue data for chart
    const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() - (11 - i));
      return {
        month: monthDate.toLocaleDateString('en-US', { month: 'short' }),
        value: 0,
      };
    });

    // Populate monthly revenue from deals
    wonDeals.forEach(deal => {
      if (deal.actualCloseDate) {
        const monthIndex = 11 - Math.floor((endDate.getTime() - deal.actualCloseDate.getTime()) / (30 * 24 * 60 * 60 * 1000));
        if (monthIndex >= 0 && monthIndex < 12) {
          monthlyRevenue[monthIndex].value += Number(deal.value);
        }
      }
    });

    // Deals statistics
    const dealsWon = await prisma.deal.count({
      where: {
        userId: req.user?.id,
        stage: 'CLOSED_WON',
        actualCloseDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const dealsLost = await prisma.deal.count({
      where: {
        userId: req.user?.id,
        stage: 'CLOSED_LOST',
        actualCloseDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const dealsPending = await prisma.deal.count({
      where: {
        userId: req.user?.id,
        stage: {
          notIn: ['CLOSED_WON', 'CLOSED_LOST'],
        },
        isActive: true,
      },
    });

    const totalClosedDeals = dealsWon + dealsLost;
    const conversionRate = totalClosedDeals > 0 ? Math.round((dealsWon / totalClosedDeals) * 100) : 0;

    // Pipeline distribution by stage
    const pipelineData = await prisma.deal.groupBy({
      by: ['stage'],
      where: {
        userId: req.user?.id,
        isActive: true,
        stage: {
          notIn: ['CLOSED_WON', 'CLOSED_LOST'],
        },
      },
      _count: {
        id: true,
      },
      _sum: {
        value: true,
      },
    });

    const pipeline = pipelineData.map(stage => ({
      stage: stage.stage,
      count: stage._count.id,
      value: Number(stage._sum.value || 0),
    }));

    // Lead sources
    const contactSources = await prisma.contact.groupBy({
      by: ['source'],
      where: {
        userId: req.user?.id,
        source: {
          not: null,
        },
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        id: true,
      },
    });

    const totalContacts = contactSources.reduce((sum, s) => sum + s._count.id, 0);
    const leadSources = contactSources
      .map(source => ({
        source: source.source || 'Unknown',
        count: source._count.id,
        percentage: totalContacts > 0 ? Math.round((source._count.id / totalContacts) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 sources

    // Return analytics data
    res.json({
      revenue: {
        current: currentRevenue,
        previous: previousRevenue,
        trend: revenueTrend,
        data: monthlyRevenue,
      },
      deals: {
        won: dealsWon,
        lost: dealsLost,
        pending: dealsPending,
        conversionRate,
      },
      pipeline,
      leadSources,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

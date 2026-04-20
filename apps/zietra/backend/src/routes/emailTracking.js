const { Router } = require('express');
const { PrismaClient } = require('@prisma/client');

const router = Router();
const prisma = new PrismaClient();

// 1x1 Transparent tracking pixel
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

// GET /api/tracking/open/:emailLogId
router.get('/open/:emailLogId', async (req, res) => {
  try {
    const { emailLogId } = req.params;
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = (req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket.remoteAddress || '';
    
    const emailLog = await prisma.emailLog.findUnique({
      where: { id: emailLogId },
    });
    
    if (emailLog) {
      const now = new Date();
      const timeToOpen = emailLog.sentAt 
        ? Math.floor((now.getTime() - emailLog.sentAt.getTime()) / 1000)
        : null;
      
      const isFirstOpen = emailLog.totalOpens === 0;
      
      const updateData = {
        totalOpens: { increment: 1 },
        lastOpenedAt: now,
        ipAddress: ipAddress,
      };
      
      if (isFirstOpen) {
        updateData.firstOpenedAt = now;
        updateData.timeToOpen = timeToOpen;
        updateData.uniqueOpens = 1;
        updateData.status = 'OPENED';
        updateData.openedAt = now;
        
        // Simple engagement score: 30 points for opening
        updateData.engagementScore = 30;
      } else {
        updateData.uniqueOpens = { increment: 1 };
      }
      
      await prisma.emailLog.update({
        where: { id: emailLogId },
        data: updateData,
      });
      
      // Create tracking event
      await prisma.emailTrackingEvent.create({
        data: {
          emailLogId,
          eventType: 'OPEN',
          userAgent: userAgent.substring(0, 500),
          ipAddress,
        },
      });
      
      // Update campaign stats if first open
      if (isFirstOpen) {
        await prisma.campaign.update({
          where: { id: emailLog.campaignId },
          data: {
            totalOpened: { increment: 1 },
          },
        });
      }
    }
    
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.send(TRACKING_PIXEL);
    
  } catch (error) {
    console.error('Tracking pixel error:', error);
    res.setHeader('Content-Type', 'image/gif');
    res.send(TRACKING_PIXEL);
  }
});

// GET /api/tracking/analytics/:campaignId
router.get('/analytics/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        emailLogs: {
          include: {
            contact: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                company: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            trackingEvents: {
              orderBy: {
                timestamp: 'desc',
              },
              take: 100,
            },
          },
        },
      },
    });
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    const stats = {
      totalSent: campaign.totalSent,
      totalOpened: campaign.emailLogs.filter(log => log.totalOpens > 0).length,
      totalClicked: campaign.emailLogs.filter(log => log.totalClicks > 0).length,
      totalBounced: campaign.totalBounced,
      openRate: campaign.totalSent > 0 
        ? ((campaign.emailLogs.filter(log => log.totalOpens > 0).length / campaign.totalSent) * 100).toFixed(2) 
        : '0',
      clickRate: campaign.totalSent > 0 
        ? ((campaign.emailLogs.filter(log => log.totalClicks > 0).length / campaign.totalSent) * 100).toFixed(2) 
        : '0',
    };
    
    const topPerformers = campaign.emailLogs
      .sort((a, b) => b.engagementScore - a.engagementScore)
      .slice(0, 10)
      .map(log => ({
        contact: log.contact,
        engagementScore: log.engagementScore,
        opens: log.totalOpens,
        clicks: log.totalClicks,
        firstOpenedAt: log.firstOpenedAt,
        firstClickedAt: log.firstClickedAt,
      }));
    
    return res.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        subject: campaign.subject,
        status: campaign.status,
        sentAt: campaign.sentAt,
      },
      stats,
      topPerformers,
      emailLogs: campaign.emailLogs.map(log => ({
        id: log.id,
        contact: log.contact,
        status: log.status,
        sentAt: log.sentAt,
        totalOpens: log.totalOpens,
        totalClicks: log.totalClicks,
        engagementScore: log.engagementScore,
        firstOpenedAt: log.firstOpenedAt,
        lastOpenedAt: log.lastOpenedAt,
        ipAddress: log.ipAddress,
        recentEvents: log.trackingEvents.slice(0, 5),
      })),
    });
    
  } catch (error) {
    console.error('Analytics error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/tracking/events/:emailLogId
router.get('/events/:emailLogId', async (req, res) => {
  try {
    const { emailLogId } = req.params;

    const events = await prisma.emailTrackingEvent.findMany({
      where: { emailLogId },
      orderBy: { timestamp: 'desc' },
    });

    return res.json(events);

  } catch (error) {
    console.error('Events error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Validate redirect URL to prevent open redirect vulnerability
function validateRedirectUrl(url) {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    const allowedDomains = ['zietra.com', 'sandbox.zietra.com', 'zietra.com', 'www.zietra.com'];

    // Check if the hostname ends with any of our allowed domains
    return allowedDomains.some(domain =>
      parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
    );
  } catch (error) {
    // Invalid URL
    return false;
  }
}

// GET /api/tracking/click/:emailLogId - Link click tracking (WORKAROUND for blocked images)
router.get('/click/:emailLogId', async (req, res) => {
  try {
    const { emailLogId } = req.params;
    const { url } = req.query; // Original URL to redirect to
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = (req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket.remoteAddress || '';

    const emailLog = await prisma.emailLog.findUnique({
      where: { id: emailLogId },
    });

    if (emailLog) {
      const now = new Date();

      // If this is the FIRST click/interaction, also count it as an OPEN
      if (emailLog.totalOpens === 0) {
        const timeToOpen = emailLog.sentAt
          ? Math.floor((now.getTime() - emailLog.sentAt.getTime()) / 1000)
          : null;

        await prisma.emailLog.update({
          where: { id: emailLogId },
          data: {
            totalOpens: 1,
            uniqueOpens: 1,
            firstOpenedAt: now,
            lastOpenedAt: now,
            timeToOpen: timeToOpen,
            status: 'OPENED',
            openedAt: now,
            engagementScore: 30, // 30 points for opening
            ipAddress: ipAddress,
          },
        });

        // Log OPEN event
        await prisma.emailTrackingEvent.create({
          data: {
            emailLogId,
            eventType: 'OPEN',
            userAgent: userAgent.substring(0, 500),
            ipAddress,
          },
        });

        // Update campaign open count
        await prisma.campaign.update({
          where: { id: emailLog.campaignId },
          data: { totalOpened: { increment: 1 } },
        });
      }

      // Now track the CLICK
      const isFirstClick = emailLog.totalClicks === 0;
      const timeToClick = emailLog.sentAt
        ? Math.floor((now.getTime() - emailLog.sentAt.getTime()) / 1000)
        : null;

      const updateData = {
        totalClicks: { increment: 1 },
        lastClickedAt: now,
      };

      if (isFirstClick) {
        updateData.firstClickedAt = now;
        updateData.timeToClick = timeToClick;
        updateData.uniqueClicks = 1;
        updateData.status = 'CLICKED';
        updateData.clickedAt = now;
        updateData.engagementScore = { increment: 40 }; // 40 points for clicking
      }

      await prisma.emailLog.update({ where: { id: emailLogId }, data: updateData });

      // Log CLICK event
      await prisma.emailTrackingEvent.create({
        data: {
          emailLogId,
          eventType: 'CLICK',
          linkUrl: url || 'unknown',
          userAgent: userAgent.substring(0, 500),
          ipAddress,
        },
      });

      if (isFirstClick) {
        await prisma.campaign.update({
          where: { id: emailLog.campaignId },
          data: { totalClicked: { increment: 1 } },
        });
      }
    }

    // Redirect to the original URL or dashboard (with security validation)
    const frontendUrl = process.env.FRONTEND_URL || 'https://sandbox.zietra.com';
    const defaultRedirect = `${frontendUrl}/campaigns`;

    // Only redirect to the provided URL if it's valid and safe
    if (url && validateRedirectUrl(url)) {
      res.redirect(url);
    } else {
      // Use default redirect if URL is missing or fails validation
      res.redirect(defaultRedirect);
    }
  } catch (error) {
    console.error('Click tracking error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'https://sandbox.zietra.com';
    res.redirect(`${frontendUrl}/campaigns`);
  }
});

module.exports = router;

import { Router } from 'express';

const router = Router();

// ===================================
// UI CONFIG ENDPOINTS
// Note: NavigationItem, ThemeConfig, and BrandingConfig models
// don't exist in the Prisma schema yet.
// These return sensible defaults until the models are migrated.
// ===================================

/**
 * GET /api/ui-config/active
 * Public endpoint - Get active UI configuration
 */
router.get('/active', async (_req, res) => {
  res.json({
    navigation: [],
    theme: null,
    branding: null,
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
  });
});

/**
 * GET /api/ui-config/navigation/:role?
 * Public endpoint - Get navigation items filtered by role
 */
router.get('/navigation/:role?', async (_req, res) => {
  res.json([]);
});

/**
 * POST /api/ui-config/theme
 * Create or update theme — stub
 */
router.post('/theme', async (_req, res) => {
  res.status(501).json({ error: 'ThemeConfig model not yet migrated' });
});

/**
 * GET /api/ui-config/themes
 * Get all themes — stub
 */
router.get('/themes', async (_req, res) => {
  res.json([]);
});

/**
 * PUT /api/ui-config/theme/:id/activate
 * Activate a theme — stub
 */
router.put('/theme/:id/activate', async (_req, res) => {
  res.status(501).json({ error: 'ThemeConfig model not yet migrated' });
});

export default router;

/**
 * Admin Employee Routes - Hot-Reload and Deployment API
 *
 * Provides REST API for managing AI employee deployments:
 * - POST /admin/employees/:id/deploy - Deploy and reload single employee
 * - POST /admin/employees/:id/reload - Hot-reload existing employee
 * - GET /admin/employees/:id/health - Health check
 * - GET /admin/employees/:id/versions - List available versions
 * - POST /admin/employees/:id/rollback - Rollback to previous version
 * - GET /admin/employees - List all employees
 * - GET /admin/metrics - Prometheus metrics
 */

const fs = require('fs');
const path = require('path');
const { validateEmployee } = require('../../scripts/validate-employee');
const { testEmployee } = require('../../scripts/test-employee');
const { createBackup, rollback, listBackups } = require('../../scripts/rollback-employee');
const metricsService = require('../services/metricsService');

// Admin token for authentication
const ADMIN_TOKEN = process.env.ADMIN_API_TOKEN || '1901c3a4a058b70c2e43ab4bbd65cf9001f35c7e18088489559da344462573d8';

// Employee module cache
const employeeCache = new Map();

// Base path for employee modules
const EMPLOYEES_PATH = path.resolve(__dirname, '../employees');

/**
 * Authentication middleware
 */
function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;

  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - Invalid or missing admin token'
    });
  }

  next();
}

/**
 * Load employee module from disk
 */
function loadEmployee(employeeId) {
  const modulePath = path.join(EMPLOYEES_PATH, employeeId, 'index.js');

  if (!fs.existsSync(modulePath)) {
    return null;
  }

  // Clear require cache to get fresh module
  delete require.cache[require.resolve(modulePath)];

  try {
    const employee = require(modulePath);
    employeeCache.set(employeeId, {
      module: employee,
      loadedAt: new Date().toISOString(),
      path: modulePath
    });
    metricsService.setHealthStatus(employeeId, true);
    return employee;
  } catch (error) {
    metricsService.setHealthStatus(employeeId, false);
    throw error;
  }
}

/**
 * Get all available employee IDs
 */
function getAllEmployeeIds() {
  if (!fs.existsSync(EMPLOYEES_PATH)) {
    return [];
  }

  return fs.readdirSync(EMPLOYEES_PATH, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .filter(dirent => fs.existsSync(path.join(EMPLOYEES_PATH, dirent.name, 'index.js')))
    .map(dirent => dirent.name);
}

/**
 * Initialize router with Express app
 */
function initializeRoutes(app) {
  // Apply admin auth to all /admin routes
  app.use('/admin', adminAuth);

  /**
   * GET /admin/employees
   * List all employees with their status
   */
  app.get('/admin/employees', async (req, res) => {
    try {
      const employeeIds = getAllEmployeeIds();
      const employees = [];

      for (const id of employeeIds) {
        try {
          const employee = loadEmployee(id);
          employees.push({
            id,
            name: employee?.config?.name || id,
            role: employee?.config?.role || 'unknown',
            department: employee?.config?.department || 'unknown',
            version: employee?.config?.version || 'unknown',
            status: 'active',
            cachedAt: employeeCache.get(id)?.loadedAt
          });
        } catch (error) {
          employees.push({
            id,
            status: 'error',
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        count: employees.length,
        employees
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /admin/employees/:id/deploy
   * Deploy a new or updated employee module
   */
  app.post('/admin/employees/:id/deploy', async (req, res) => {
    const { id } = req.params;
    const endTimer = metricsService.startDeploymentTimer(id);

    try {
      // Get file content from request body or multipart upload
      let fileContent;

      if (req.files && req.files.file) {
        // Multipart file upload
        fileContent = req.files.file.data.toString('utf8');
      } else if (req.body && req.body.content) {
        // JSON body with content
        fileContent = req.body.content;
      } else if (req.body && typeof req.body === 'string') {
        // Raw string body
        fileContent = req.body;
      } else {
        return res.status(400).json({
          success: false,
          error: 'No file content provided. Use multipart upload or JSON body with "content" field.'
        });
      }

      // Ensure employee directory exists
      const employeeDir = path.join(EMPLOYEES_PATH, id);
      if (!fs.existsSync(employeeDir)) {
        fs.mkdirSync(employeeDir, { recursive: true });
      }

      // Create backup before deployment
      const existingPath = path.join(employeeDir, 'index.js');
      if (fs.existsSync(existingPath)) {
        try {
          createBackup(id);
        } catch (backupError) {
          console.warn(`Backup warning: ${backupError.message}`);
        }
      }

      // Write new file
      const deployPath = path.join(employeeDir, 'index.js');
      fs.writeFileSync(deployPath, fileContent, 'utf8');

      // Validate the deployed module
      const validation = await validateEmployee(id);
      if (!validation.isValid) {
        // Rollback if validation fails
        try {
          rollback(id, 'previous');
        } catch {
          // Remove invalid file if no backup
          fs.unlinkSync(deployPath);
        }

        metricsService.recordValidation(id, false);
        const duration = endTimer('failure');

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          validation: validation.toJSON(),
          duration
        });
      }

      metricsService.recordValidation(id, true);

      // Load the new module
      const employee = loadEmployee(id);

      // Trigger hot-reload
      metricsService.recordHotReload(id, 'success');

      const duration = endTimer('success');

      res.json({
        success: true,
        message: `Employee ${id} deployed successfully`,
        employee: {
          id: employee.id,
          name: employee.config?.name,
          role: employee.config?.role,
          department: employee.config?.department,
          version: employee.config?.version
        },
        deployment: {
          timestamp: new Date().toISOString(),
          duration,
          status: 'active'
        },
        validation: validation.toJSON()
      });

    } catch (error) {
      const duration = endTimer('failure');

      // Attempt rollback
      try {
        rollback(id, 'previous');
        metricsService.recordHotReload(id, 'rollback');
      } catch {
        // No previous version to rollback to
      }

      res.status(500).json({
        success: false,
        error: error.message,
        duration
      });
    }
  });

  /**
   * POST /admin/employees/:id/reload
   * Hot-reload an existing employee module
   */
  app.post('/admin/employees/:id/reload', async (req, res) => {
    const { id } = req.params;

    try {
      const employee = loadEmployee(id);

      if (!employee) {
        return res.status(404).json({
          success: false,
          error: `Employee ${id} not found`
        });
      }

      metricsService.recordHotReload(id, 'success');

      res.json({
        success: true,
        message: `Employee ${id} reloaded successfully`,
        employee: {
          id: employee.id,
          name: employee.config?.name,
          version: employee.config?.version
        },
        reloadedAt: new Date().toISOString()
      });

    } catch (error) {
      metricsService.recordHotReload(id, 'failure');
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /admin/employees/:id/health
   * Health check for a specific employee
   */
  app.get('/admin/employees/:id/health', async (req, res) => {
    const { id } = req.params;

    try {
      let employee = employeeCache.get(id)?.module;

      if (!employee) {
        employee = loadEmployee(id);
      }

      if (!employee) {
        metricsService.setHealthStatus(id, false);
        return res.status(404).json({
          success: false,
          healthy: false,
          error: `Employee ${id} not found`
        });
      }

      // Run health check if available
      let healthResult;
      if (typeof employee.healthCheck === 'function') {
        healthResult = await employee.healthCheck();
      } else {
        healthResult = {
          healthy: true,
          message: 'No health check function defined'
        };
      }

      const isHealthy = healthResult.healthy !== false;
      metricsService.setHealthStatus(id, isHealthy);

      res.json({
        success: true,
        healthy: isHealthy,
        employee: {
          id: employee.id,
          name: employee.config?.name,
          version: employee.config?.version
        },
        health: healthResult,
        checkedAt: new Date().toISOString()
      });

    } catch (error) {
      metricsService.setHealthStatus(id, false);
      res.status(500).json({
        success: false,
        healthy: false,
        error: error.message
      });
    }
  });

  /**
   * GET /admin/employees/:id/versions
   * List available versions/backups
   */
  app.get('/admin/employees/:id/versions', (req, res) => {
    const { id } = req.params;

    try {
      const backups = listBackups(id);

      // Get current version
      let currentVersion = 'unknown';
      try {
        const employee = loadEmployee(id);
        currentVersion = employee?.config?.version || 'unknown';
      } catch {
        // Employee might not exist yet
      }

      res.json({
        success: true,
        employeeId: id,
        currentVersion,
        backups: backups.map(b => ({
          version: b.version,
          name: b.name,
          timestamp: b.timestamp,
          hash: b.hash
        }))
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /admin/employees/:id/rollback
   * Rollback to a previous version
   */
  app.post('/admin/employees/:id/rollback', async (req, res) => {
    const { id } = req.params;
    const { version = 'previous' } = req.body;
    const endTimer = metricsService.startDeploymentTimer(id);

    try {
      const success = rollback(id, version);

      if (!success) {
        const duration = endTimer('failure');
        return res.status(400).json({
          success: false,
          error: 'Rollback failed',
          duration
        });
      }

      // Reload the rolled-back module
      const employee = loadEmployee(id);
      metricsService.recordHotReload(id, 'rollback');
      const duration = endTimer('rollback');

      res.json({
        success: true,
        message: `Rolled back ${id} to ${version}`,
        employee: {
          id: employee.id,
          name: employee.config?.name,
          version: employee.config?.version
        },
        duration
      });

    } catch (error) {
      const duration = endTimer('failure');
      res.status(500).json({
        success: false,
        error: error.message,
        duration
      });
    }
  });

  /**
   * POST /admin/employees/:id/test
   * Run tests for an employee
   */
  app.post('/admin/employees/:id/test', async (req, res) => {
    const { id } = req.params;

    try {
      const testResult = await testEmployee(id);

      res.json({
        success: testResult.isSuccess,
        employeeId: id,
        tests: testResult.toJSON()
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /admin/metrics
   * Prometheus metrics endpoint
   */
  app.get('/admin/metrics', (req, res) => {
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metricsService.getMetrics());
  });

  /**
   * GET /admin/metrics/json
   * Metrics as JSON
   */
  app.get('/admin/metrics/json', (req, res) => {
    res.json(metricsService.getMetricsJSON());
  });

  /**
   * GET /admin/status
   * Overall system status
   */
  app.get('/admin/status', (req, res) => {
    const employeeIds = getAllEmployeeIds();
    const metrics = metricsService.getMetricsJSON();

    res.json({
      success: true,
      status: 'operational',
      timestamp: new Date().toISOString(),
      employees: {
        total: employeeIds.length,
        cached: employeeCache.size,
        ids: employeeIds
      },
      metrics: {
        deploymentsTotal: metrics.counters.employee_deployments_total?.values || {},
        healthStatus: metrics.gauges.employee_health_status?.values || {}
      }
    });
  });

  console.log('Admin employee routes initialized');
}

/**
 * Create Express router (for standalone use)
 */
function createRouter() {
  const express = require('express');
  const router = express.Router();

  // This version creates a router that can be mounted
  // All the same routes as above, but using router instead of app

  router.use(adminAuth);

  router.get('/employees', async (req, res) => {
    // Same implementation as above...
    const employeeIds = getAllEmployeeIds();
    res.json({ success: true, count: employeeIds.length, ids: employeeIds });
  });

  // ... other routes would be duplicated here

  return router;
}

module.exports = {
  initializeRoutes,
  createRouter,
  adminAuth,
  loadEmployee,
  getAllEmployeeIds,
  employeeCache,
  EMPLOYEES_PATH
};

/**
 * Tests for Sarah - Customer Support AI Employee
 */

const sarah = require('../index');

describe('Sarah Employee Module', () => {
  describe('Module Exports', () => {
    test('exports required id field', () => {
      expect(sarah.id).toBe('sarah');
    });

    test('exports required config object', () => {
      expect(sarah.config).toBeDefined();
      expect(typeof sarah.config).toBe('object');
    });

    test('exports required getPrompt function', () => {
      expect(typeof sarah.getPrompt).toBe('function');
    });

    test('exports optional healthCheck function', () => {
      expect(typeof sarah.healthCheck).toBe('function');
    });
  });

  describe('Config Validation', () => {
    test('config has required name field', () => {
      expect(sarah.config.name).toBe('Sarah');
    });

    test('config has required role field', () => {
      expect(sarah.config.role).toBe('customer_support');
    });

    test('config has required department field', () => {
      expect(sarah.config.department).toBe('support');
    });

    test('config has version field', () => {
      expect(sarah.config.version).toBeDefined();
      expect(typeof sarah.config.version).toBe('string');
    });

    test('config has capabilities array', () => {
      expect(Array.isArray(sarah.config.capabilities)).toBe(true);
      expect(sarah.config.capabilities.length).toBeGreaterThan(0);
    });

    test('config has SLA configuration', () => {
      expect(sarah.config.sla).toBeDefined();
      expect(sarah.config.sla.firstResponseMinutes).toBeDefined();
      expect(sarah.config.sla.resolutionMinutes).toBeDefined();
    });
  });

  describe('getPrompt Function', () => {
    test('returns non-empty string', () => {
      const prompt = sarah.getPrompt();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(100);
    });

    test('contains role information', () => {
      const prompt = sarah.getPrompt();
      expect(prompt).toContain('Customer Support');
    });

    test('contains Dollor.ai business model', () => {
      const prompt = sarah.getPrompt();
      expect(prompt).toContain('MATCHMAKING SERVICE');
      expect(prompt).toContain('$1 flat');
    });

    test('contains escalation rules', () => {
      const prompt = sarah.getPrompt();
      expect(prompt).toContain('Escalation');
    });

    test('accepts context parameter', () => {
      const promptWithCustomer = sarah.getPrompt({ customerName: 'John Doe' });
      expect(promptWithCustomer).toContain('John Doe');

      const promptWithOrder = sarah.getPrompt({ orderId: 'ORD-123' });
      expect(promptWithOrder).toContain('ORD-123');
    });
  });

  describe('healthCheck Function', () => {
    test('returns healthy status', async () => {
      const health = await sarah.healthCheck();
      expect(health.healthy).toBe(true);
    });

    test('returns employee id', async () => {
      const health = await sarah.healthCheck();
      expect(health.employeeId).toBe('sarah');
    });

    test('returns version', async () => {
      const health = await sarah.healthCheck();
      expect(health.version).toBe(sarah.config.version);
    });

    test('returns timestamp', async () => {
      const health = await sarah.healthCheck();
      expect(health.timestamp).toBeDefined();
      expect(() => new Date(health.timestamp)).not.toThrow();
    });

    test('includes health checks object', async () => {
      const health = await sarah.healthCheck();
      expect(health.checks).toBeDefined();
      expect(health.checks.config).toBe(true);
      expect(health.checks.prompt).toBe(true);
    });
  });

  describe('processRequest Function', () => {
    test('processes order status request', async () => {
      const result = await sarah.processRequest({
        type: 'order_status',
        orderId: 'ORD-123',
        customerId: 'CUST-456',
        message: 'Where is my order?'
      });

      expect(result.employeeId).toBe('sarah');
      expect(result.requestType).toBe('order_status');
      expect(result.orderId).toBe('ORD-123');
    });

    test('processes refund request', async () => {
      const result = await sarah.processRequest({
        type: 'refund_request',
        orderId: 'ORD-789',
        customerId: 'CUST-012',
        message: 'I want a refund'
      });

      expect(result.requestType).toBe('refund_request');
      expect(result.action).toContain('refund');
    });

    test('includes metadata with version', async () => {
      const result = await sarah.processRequest({
        type: 'general_inquiry',
        message: 'Help'
      });

      expect(result.metadata).toBeDefined();
      expect(result.metadata.version).toBe(sarah.config.version);
      expect(result.metadata.department).toBe('support');
    });
  });

  describe('getStats Function', () => {
    test('returns employee statistics', () => {
      const stats = sarah.getStats();
      expect(stats.employeeId).toBe('sarah');
      expect(stats.name).toBe('Sarah');
      expect(stats.status).toBe('active');
    });

    test('includes capabilities', () => {
      const stats = sarah.getStats();
      expect(Array.isArray(stats.capabilities)).toBe(true);
    });

    test('includes SLA information', () => {
      const stats = sarah.getStats();
      expect(stats.sla).toBeDefined();
    });
  });
});

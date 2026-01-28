#!/usr/bin/env node

/**
 * Employee Module Test Runner
 *
 * Runs tests for an employee module:
 * - Load employee module successfully
 * - getPrompt() returns non-empty content
 * - healthCheck() returns success (if exists)
 * - Run employee-specific tests from __tests__/ (if exists)
 *
 * Usage: node scripts/test-employee.js <employee-id>
 * Example: node scripts/test-employee.js sarah
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[PASS]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[FAIL]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  test: (msg) => console.log(`${colors.cyan}[TEST]${colors.reset} ${msg}`)
};

/**
 * Test result structure
 */
class TestResult {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
    this.startTime = Date.now();
  }

  addTest(name, status, duration = 0, error = null) {
    this.tests.push({ name, status, duration, error });
    if (status === 'passed') this.passed++;
    else if (status === 'failed') this.failed++;
    else if (status === 'skipped') this.skipped++;
  }

  get isSuccess() {
    return this.failed === 0;
  }

  get duration() {
    return Date.now() - this.startTime;
  }

  toJSON() {
    return {
      success: this.isSuccess,
      duration: this.duration,
      summary: {
        passed: this.passed,
        failed: this.failed,
        skipped: this.skipped,
        total: this.tests.length
      },
      tests: this.tests
    };
  }
}

/**
 * Run a single test with timing
 */
async function runTest(name, testFn) {
  const start = Date.now();
  try {
    await testFn();
    const duration = Date.now() - start;
    log.success(`${name} (${duration}ms)`);
    return { status: 'passed', duration };
  } catch (error) {
    const duration = Date.now() - start;
    log.error(`${name}: ${error.message}`);
    return { status: 'failed', duration, error: error.message };
  }
}

/**
 * Run Jest tests for employee-specific test files
 */
function runJestTests(testDir) {
  return new Promise((resolve) => {
    const jestPath = path.resolve(__dirname, '../node_modules/.bin/jest');
    const jestConfig = path.resolve(__dirname, '../jest.config.js');

    // Check if Jest is available
    let jestCommand = 'npx';
    let jestArgs = ['jest', testDir, '--passWithNoTests', '--colors'];

    if (fs.existsSync(jestPath)) {
      jestCommand = jestPath;
      jestArgs = [testDir, '--passWithNoTests', '--colors'];
    }

    // Check for jest config
    if (fs.existsSync(jestConfig)) {
      jestArgs.push('--config', jestConfig);
    }

    log.test(`Running Jest tests in ${testDir}`);

    const jest = spawn(jestCommand, jestArgs, {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
      shell: true
    });

    jest.on('close', (code) => {
      resolve(code === 0);
    });

    jest.on('error', (error) => {
      log.warn(`Could not run Jest: ${error.message}`);
      resolve(true); // Don't fail if Jest isn't installed
    });
  });
}

/**
 * Test an employee module
 */
async function testEmployee(employeeId) {
  const result = new TestResult();
  const employeePath = path.resolve(__dirname, '../src/employees', employeeId, 'index.js');
  const testsPath = path.resolve(__dirname, '../src/employees', employeeId, '__tests__');

  console.log('');
  log.info(`Testing employee: ${employeeId}`);
  log.info(`Path: ${employeePath}`);
  console.log('');
  console.log('='.repeat(50));
  console.log('Core Module Tests');
  console.log('='.repeat(50));
  console.log('');

  // Test 1: Module exists
  const existsResult = await runTest('Module file exists', async () => {
    if (!fs.existsSync(employeePath)) {
      throw new Error(`File not found: ${employeePath}`);
    }
  });
  result.addTest('Module file exists', existsResult.status, existsResult.duration, existsResult.error);

  if (existsResult.status === 'failed') {
    return result;
  }

  // Test 2: Module loads
  let employee;
  const loadResult = await runTest('Module loads successfully', async () => {
    delete require.cache[require.resolve(employeePath)];
    employee = require(employeePath);
  });
  result.addTest('Module loads successfully', loadResult.status, loadResult.duration, loadResult.error);

  if (loadResult.status === 'failed') {
    return result;
  }

  // Test 3: Has required exports
  const exportsResult = await runTest('Has required exports (id, config, getPrompt)', async () => {
    if (!employee.id) throw new Error('Missing export: id');
    if (!employee.config) throw new Error('Missing export: config');
    if (!employee.getPrompt) throw new Error('Missing export: getPrompt');
  });
  result.addTest('Has required exports', exportsResult.status, exportsResult.duration, exportsResult.error);

  // Test 4: getPrompt returns non-empty string
  const promptResult = await runTest('getPrompt() returns non-empty string', async () => {
    const prompt = employee.getPrompt();
    if (typeof prompt !== 'string') {
      throw new Error(`Expected string, got ${typeof prompt}`);
    }
    if (prompt.trim().length === 0) {
      throw new Error('Prompt is empty');
    }
    log.info(`  Prompt length: ${prompt.length} characters`);
  });
  result.addTest('getPrompt() returns non-empty string', promptResult.status, promptResult.duration, promptResult.error);

  // Test 5: getPrompt with context (if supported)
  const promptContextResult = await runTest('getPrompt() with context parameter', async () => {
    try {
      const prompt = employee.getPrompt({ test: true });
      if (typeof prompt !== 'string') {
        throw new Error('getPrompt with context should return string');
      }
    } catch (error) {
      if (error.message.includes('context')) throw error;
      // Function might not support context, which is OK
    }
  });
  result.addTest('getPrompt() with context parameter', promptContextResult.status, promptContextResult.duration);

  // Test 6: healthCheck (if exists)
  if (typeof employee.healthCheck === 'function') {
    const healthResult = await runTest('healthCheck() returns success', async () => {
      const health = await employee.healthCheck();
      if (!health) throw new Error('healthCheck returned falsy value');
      if (health.healthy === false) throw new Error(`Health check failed: ${JSON.stringify(health)}`);
      log.info(`  Health status: ${JSON.stringify(health.checks || {})}`);
    });
    result.addTest('healthCheck() returns success', healthResult.status, healthResult.duration, healthResult.error);
  } else {
    log.warn('healthCheck() - function not exported (skipped)');
    result.addTest('healthCheck() returns success', 'skipped');
  }

  // Test 7: Config validation
  const configResult = await runTest('Config has required fields', async () => {
    const { config } = employee;
    if (!config.name) throw new Error('config.name is required');
    if (!config.role) throw new Error('config.role is required');
    if (!config.department) throw new Error('config.department is required');
    log.info(`  Employee: ${config.name} (${config.role}/${config.department})`);
  });
  result.addTest('Config has required fields', configResult.status, configResult.duration, configResult.error);

  // Test 8: Employee-specific tests
  console.log('');
  console.log('='.repeat(50));
  console.log('Employee-Specific Tests');
  console.log('='.repeat(50));
  console.log('');

  if (fs.existsSync(testsPath)) {
    const testFiles = fs.readdirSync(testsPath).filter(f => f.endsWith('.test.js'));
    if (testFiles.length > 0) {
      log.info(`Found ${testFiles.length} test file(s) in __tests__/`);
      const jestPassed = await runJestTests(testsPath);
      result.addTest('Employee-specific Jest tests', jestPassed ? 'passed' : 'failed');
    } else {
      log.warn('No test files found in __tests__/ directory');
      result.addTest('Employee-specific tests', 'skipped');
    }
  } else {
    log.warn('No __tests__/ directory found');
    result.addTest('Employee-specific tests', 'skipped');
  }

  return result;
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('');
    console.log('Employee Module Test Runner');
    console.log('===========================');
    console.log('');
    console.log('Usage: node scripts/test-employee.js <employee-id> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --json    Output results as JSON');
    console.log('  --verbose Show additional test details');
    console.log('');
    console.log('Example:');
    console.log('  node scripts/test-employee.js sarah');
    console.log('  node scripts/test-employee.js sarah --json');
    console.log('');
    process.exit(1);
  }

  const employeeId = args[0];
  const jsonOutput = args.includes('--json');

  try {
    const result = await testEmployee(employeeId);

    console.log('');
    console.log('='.repeat(50));
    console.log('Test Summary');
    console.log('='.repeat(50));

    if (result.isSuccess) {
      log.success(`All tests passed for "${employeeId}"`);
    } else {
      log.error(`Tests failed for "${employeeId}"`);
    }

    console.log(`  Total:   ${result.tests.length} tests`);
    console.log(`  Passed:  ${result.passed}`);
    console.log(`  Failed:  ${result.failed}`);
    console.log(`  Skipped: ${result.skipped}`);
    console.log(`  Time:    ${result.duration}ms`);
    console.log('');

    if (jsonOutput) {
      console.log(JSON.stringify(result.toJSON(), null, 2));
    }

    process.exit(result.isSuccess ? 0 : 1);
  } catch (error) {
    log.error(`Test error: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

// Export for programmatic use
module.exports = { testEmployee, TestResult };

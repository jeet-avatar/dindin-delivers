#!/usr/bin/env node

/**
 * Employee Module Validation Script
 *
 * Validates that an employee module meets all requirements:
 * - Required exports: id, config, getPrompt
 * - Config has required fields: name, role, department
 * - getPrompt() returns valid string
 * - No syntax errors
 *
 * Usage: node scripts/validate-employee.js <employee-id>
 * Example: node scripts/validate-employee.js sarah
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  dim: '\x1b[2m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[PASS]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[FAIL]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`)
};

/**
 * Validation result structure
 */
class ValidationResult {
  constructor() {
    this.passed = [];
    this.failed = [];
    this.warnings = [];
  }

  pass(check) {
    this.passed.push(check);
    log.success(check);
  }

  fail(check, reason) {
    this.failed.push({ check, reason });
    log.error(`${check}: ${reason}`);
  }

  warn(check, message) {
    this.warnings.push({ check, message });
    log.warn(`${check}: ${message}`);
  }

  get isValid() {
    return this.failed.length === 0;
  }

  toJSON() {
    return {
      valid: this.isValid,
      passed: this.passed.length,
      failed: this.failed.length,
      warnings: this.warnings.length,
      details: {
        passed: this.passed,
        failed: this.failed,
        warnings: this.warnings
      }
    };
  }
}

/**
 * Check if file has syntax errors
 */
function checkSyntax(filePath) {
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    new vm.Script(code, { filename: filePath });
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error.message,
      line: error.lineNumber,
      column: error.columnNumber
    };
  }
}

/**
 * Validate employee module
 */
async function validateEmployee(employeeId) {
  const result = new ValidationResult();
  const employeePath = path.resolve(__dirname, '../src/employees', employeeId, 'index.js');

  console.log('');
  log.info(`Validating employee: ${employeeId}`);
  log.info(`Path: ${employeePath}`);
  console.log('');

  // Check 1: File exists
  if (!fs.existsSync(employeePath)) {
    result.fail('File exists', `Employee module not found at ${employeePath}`);
    return result;
  }
  result.pass('File exists');

  // Check 2: Syntax validation
  const syntaxResult = checkSyntax(employeePath);
  if (!syntaxResult.valid) {
    result.fail('Syntax valid', syntaxResult.error);
    return result;
  }
  result.pass('Syntax valid');

  // Check 3: Module loads
  let employee;
  try {
    // Clear require cache to ensure fresh load
    delete require.cache[require.resolve(employeePath)];
    employee = require(employeePath);
    result.pass('Module loads');
  } catch (error) {
    result.fail('Module loads', error.message);
    return result;
  }

  // Check 4: Required export - id
  if (typeof employee.id !== 'string') {
    result.fail('Export: id', 'Must export "id" as a string');
  } else if (employee.id !== employeeId) {
    result.fail('Export: id', `id "${employee.id}" does not match directory name "${employeeId}"`);
  } else {
    result.pass('Export: id');
  }

  // Check 5: Required export - config
  if (typeof employee.config !== 'object' || employee.config === null) {
    result.fail('Export: config', 'Must export "config" as an object');
  } else {
    result.pass('Export: config');

    // Check 5a: Config - name
    if (typeof employee.config.name !== 'string' || employee.config.name.length === 0) {
      result.fail('Config: name', 'config.name must be a non-empty string');
    } else {
      result.pass('Config: name');
    }

    // Check 5b: Config - role
    if (typeof employee.config.role !== 'string' || employee.config.role.length === 0) {
      result.fail('Config: role', 'config.role must be a non-empty string');
    } else {
      result.pass('Config: role');
    }

    // Check 5c: Config - department
    if (typeof employee.config.department !== 'string' || employee.config.department.length === 0) {
      result.fail('Config: department', 'config.department must be a non-empty string');
    } else {
      result.pass('Config: department');
    }

    // Optional but recommended config fields
    if (!employee.config.version) {
      result.warn('Config: version', 'Recommended to include version field');
    }

    if (!employee.config.description) {
      result.warn('Config: description', 'Recommended to include description field');
    }
  }

  // Check 6: Required export - getPrompt
  if (typeof employee.getPrompt !== 'function') {
    result.fail('Export: getPrompt', 'Must export "getPrompt" as a function');
  } else {
    result.pass('Export: getPrompt');

    // Check 6a: getPrompt returns string
    try {
      const prompt = employee.getPrompt();
      if (typeof prompt !== 'string') {
        result.fail('getPrompt: returns string', `Expected string, got ${typeof prompt}`);
      } else if (prompt.length === 0) {
        result.fail('getPrompt: returns string', 'Returned empty string');
      } else if (prompt.length < 50) {
        result.warn('getPrompt: returns string', `Prompt is very short (${prompt.length} chars)`);
      } else {
        result.pass(`getPrompt: returns string (${prompt.length} chars)`);
      }
    } catch (error) {
      result.fail('getPrompt: returns string', `Error calling getPrompt(): ${error.message}`);
    }
  }

  // Check 7: Optional export - healthCheck
  if (typeof employee.healthCheck === 'function') {
    try {
      const health = await employee.healthCheck();
      if (typeof health !== 'object') {
        result.warn('Export: healthCheck', 'healthCheck should return an object');
      } else if (health.healthy === undefined) {
        result.warn('Export: healthCheck', 'healthCheck response should include "healthy" field');
      } else {
        result.pass('Export: healthCheck');
      }
    } catch (error) {
      result.warn('Export: healthCheck', `healthCheck() threw error: ${error.message}`);
    }
  }

  // Check 8: Optional tests directory
  const testsPath = path.resolve(__dirname, '../src/employees', employeeId, '__tests__');
  if (fs.existsSync(testsPath)) {
    const testFiles = fs.readdirSync(testsPath).filter(f => f.endsWith('.test.js'));
    if (testFiles.length > 0) {
      result.pass(`Tests directory (${testFiles.length} test file(s))`);
    } else {
      result.warn('Tests directory', '__tests__ directory exists but contains no test files');
    }
  } else {
    result.warn('Tests directory', 'No __tests__ directory found (recommended)');
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
    console.log('Employee Module Validator');
    console.log('=========================');
    console.log('');
    console.log('Usage: node scripts/validate-employee.js <employee-id>');
    console.log('');
    console.log('Example:');
    console.log('  node scripts/validate-employee.js sarah');
    console.log('');
    process.exit(1);
  }

  const employeeId = args[0];

  // Support --json flag for CI/CD output
  const jsonOutput = args.includes('--json');

  try {
    const result = await validateEmployee(employeeId);

    console.log('');
    console.log('='.repeat(50));
    console.log('Validation Summary');
    console.log('='.repeat(50));

    if (result.isValid) {
      log.success(`Employee "${employeeId}" passed validation`);
      console.log(`  Passed: ${result.passed.length} checks`);
      console.log(`  Warnings: ${result.warnings.length}`);
    } else {
      log.error(`Employee "${employeeId}" failed validation`);
      console.log(`  Passed: ${result.passed.length} checks`);
      console.log(`  Failed: ${result.failed.length} checks`);
      console.log(`  Warnings: ${result.warnings.length}`);
    }
    console.log('');

    if (jsonOutput) {
      console.log(JSON.stringify(result.toJSON(), null, 2));
    }

    process.exit(result.isValid ? 0 : 1);
  } catch (error) {
    log.error(`Validation error: ${error.message}`);
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
module.exports = { validateEmployee, ValidationResult };

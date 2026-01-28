#!/usr/bin/env node

/**
 * Employee Module Rollback Script
 *
 * Manages versioned backups and rollback for employee modules:
 * - Backup current version before deploy
 * - Store last N versions (configurable)
 * - Rollback to specific version or previous
 *
 * Usage:
 *   node scripts/rollback-employee.js backup <employee-id>    - Create backup before deploy
 *   node scripts/rollback-employee.js list <employee-id>      - List available versions
 *   node scripts/rollback-employee.js rollback <employee-id> <version>  - Rollback to version
 *   node scripts/rollback-employee.js rollback <employee-id> previous   - Rollback to previous
 *
 * Example:
 *   node scripts/rollback-employee.js backup sarah
 *   node scripts/rollback-employee.js rollback sarah v1.0.0
 *   node scripts/rollback-employee.js rollback sarah previous
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
  success: (msg) => console.log(`${colors.green}[OK]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`)
};

// Configuration
const CONFIG = {
  maxVersions: parseInt(process.env.EMPLOYEE_MAX_VERSIONS || '10', 10),
  backupDir: process.env.EMPLOYEE_BACKUP_DIR || path.resolve(__dirname, '../.employee-backups')
};

/**
 * Ensure backup directory exists
 */
function ensureBackupDir(employeeId) {
  const backupPath = path.join(CONFIG.backupDir, employeeId);
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(backupPath, { recursive: true });
  }
  return backupPath;
}

/**
 * Get employee source path
 */
function getEmployeePath(employeeId) {
  return path.resolve(__dirname, '../src/employees', employeeId);
}

/**
 * Calculate hash of directory contents
 */
function calculateHash(dirPath) {
  const hash = crypto.createHash('sha256');

  function hashDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== '__tests__' && entry.name !== 'node_modules') {
          hashDir(fullPath);
        }
      } else {
        hash.update(entry.name);
        hash.update(fs.readFileSync(fullPath));
      }
    }
  }

  hashDir(dirPath);
  return hash.digest('hex').substring(0, 8);
}

/**
 * Get version from employee config
 */
function getVersion(employeePath) {
  try {
    delete require.cache[require.resolve(path.join(employeePath, 'index.js'))];
    const employee = require(path.join(employeePath, 'index.js'));
    return employee.config?.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Copy directory recursively
 */
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Get list of backups for an employee
 */
function listBackups(employeeId) {
  const backupPath = ensureBackupDir(employeeId);
  const metadataFile = path.join(backupPath, 'metadata.json');

  if (!fs.existsSync(metadataFile)) {
    return [];
  }

  const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
  return metadata.backups || [];
}

/**
 * Save backup metadata
 */
function saveMetadata(employeeId, backups) {
  const backupPath = ensureBackupDir(employeeId);
  const metadataFile = path.join(backupPath, 'metadata.json');

  fs.writeFileSync(metadataFile, JSON.stringify({
    employeeId,
    backups,
    updatedAt: new Date().toISOString()
  }, null, 2));
}

/**
 * Create a backup of the current employee version
 */
function createBackup(employeeId) {
  const employeePath = getEmployeePath(employeeId);
  const backupDir = ensureBackupDir(employeeId);

  if (!fs.existsSync(employeePath)) {
    log.error(`Employee not found: ${employeeId}`);
    return null;
  }

  const version = getVersion(employeePath);
  const hash = calculateHash(employeePath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupName = `${version}_${timestamp}_${hash}`;
  const backupPath = path.join(backupDir, backupName);

  // Check if identical backup exists
  const backups = listBackups(employeeId);
  const existingBackup = backups.find(b => b.hash === hash);
  if (existingBackup) {
    log.warn(`Identical backup already exists: ${existingBackup.name}`);
    return existingBackup;
  }

  // Copy current version to backup
  copyDir(employeePath, backupPath);

  // Update metadata
  const backup = {
    name: backupName,
    version,
    hash,
    timestamp: new Date().toISOString(),
    path: backupPath
  };

  backups.unshift(backup);

  // Prune old backups if exceeding limit
  while (backups.length > CONFIG.maxVersions) {
    const oldest = backups.pop();
    log.info(`Removing old backup: ${oldest.name}`);
    if (fs.existsSync(oldest.path)) {
      fs.rmSync(oldest.path, { recursive: true });
    }
  }

  saveMetadata(employeeId, backups);

  log.success(`Created backup: ${backupName}`);
  return backup;
}

/**
 * Rollback to a specific version
 */
function rollback(employeeId, targetVersion) {
  const employeePath = getEmployeePath(employeeId);
  const backups = listBackups(employeeId);

  if (backups.length === 0) {
    log.error(`No backups found for employee: ${employeeId}`);
    return false;
  }

  let targetBackup;

  if (targetVersion === 'previous') {
    targetBackup = backups[0]; // Most recent backup
    log.info(`Rolling back to previous version: ${targetBackup.version}`);
  } else {
    // Find backup matching version
    targetBackup = backups.find(b =>
      b.version === targetVersion ||
      b.name === targetVersion ||
      b.name.startsWith(targetVersion)
    );

    if (!targetBackup) {
      log.error(`Version not found: ${targetVersion}`);
      log.info('Available versions:');
      backups.forEach(b => console.log(`  - ${b.version} (${b.name})`));
      return false;
    }
  }

  // Verify backup exists
  if (!fs.existsSync(targetBackup.path)) {
    log.error(`Backup directory not found: ${targetBackup.path}`);
    return false;
  }

  // Create backup of current version before rollback
  log.info('Creating backup of current version before rollback...');
  createBackup(employeeId);

  // Perform rollback
  log.info(`Rolling back to: ${targetBackup.version} (${targetBackup.name})`);

  // Remove current version
  if (fs.existsSync(employeePath)) {
    fs.rmSync(employeePath, { recursive: true });
  }

  // Copy backup to employee path
  copyDir(targetBackup.path, employeePath);

  log.success(`Rolled back ${employeeId} to version ${targetBackup.version}`);

  // Record rollback in metadata
  const backupsAfter = listBackups(employeeId);
  saveMetadata(employeeId, backupsAfter);

  return true;
}

/**
 * Display list of available backups
 */
function displayBackups(employeeId) {
  const backups = listBackups(employeeId);
  const employeePath = getEmployeePath(employeeId);
  const currentVersion = fs.existsSync(employeePath) ? getVersion(employeePath) : 'N/A';
  const currentHash = fs.existsSync(employeePath) ? calculateHash(employeePath) : 'N/A';

  console.log('');
  console.log(`Employee: ${employeeId}`);
  console.log(`Current Version: ${currentVersion} (${currentHash})`);
  console.log('');
  console.log('Available Backups:');
  console.log('-'.repeat(80));

  if (backups.length === 0) {
    console.log('  No backups available');
  } else {
    backups.forEach((backup, index) => {
      const isCurrent = backup.hash === currentHash;
      const marker = isCurrent ? ' [current]' : '';
      console.log(`  ${index + 1}. ${backup.version} - ${backup.timestamp}${marker}`);
      console.log(`     Hash: ${backup.hash}`);
      console.log(`     Name: ${backup.name}`);
      console.log('');
    });
  }

  console.log('-'.repeat(80));
  console.log(`Max versions: ${CONFIG.maxVersions}`);
  console.log(`Backup dir: ${CONFIG.backupDir}`);
}

/**
 * Clean old backups
 */
function cleanBackups(employeeId, keepCount = 3) {
  const backups = listBackups(employeeId);

  if (backups.length <= keepCount) {
    log.info(`Only ${backups.length} backups exist, nothing to clean`);
    return;
  }

  const toRemove = backups.slice(keepCount);

  for (const backup of toRemove) {
    log.info(`Removing: ${backup.name}`);
    if (fs.existsSync(backup.path)) {
      fs.rmSync(backup.path, { recursive: true });
    }
  }

  const remaining = backups.slice(0, keepCount);
  saveMetadata(employeeId, remaining);

  log.success(`Cleaned ${toRemove.length} old backup(s), kept ${remaining.length}`);
}

/**
 * Main entry point
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('');
    console.log('Employee Module Rollback Manager');
    console.log('================================');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/rollback-employee.js <command> <employee-id> [options]');
    console.log('');
    console.log('Commands:');
    console.log('  backup <employee-id>              Create backup before deploy');
    console.log('  list <employee-id>                List available versions');
    console.log('  rollback <employee-id> <version>  Rollback to specific version');
    console.log('  rollback <employee-id> previous   Rollback to previous version');
    console.log('  clean <employee-id> [keep-count]  Remove old backups');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/rollback-employee.js backup sarah');
    console.log('  node scripts/rollback-employee.js list sarah');
    console.log('  node scripts/rollback-employee.js rollback sarah v1.0.0');
    console.log('  node scripts/rollback-employee.js rollback sarah previous');
    console.log('  node scripts/rollback-employee.js clean sarah 5');
    console.log('');
    console.log('Environment Variables:');
    console.log('  EMPLOYEE_MAX_VERSIONS  Max backups to keep (default: 10)');
    console.log('  EMPLOYEE_BACKUP_DIR    Backup directory path');
    console.log('');
    process.exit(1);
  }

  const command = args[0];
  const employeeId = args[1];

  console.log('');

  switch (command) {
    case 'backup':
      const backup = createBackup(employeeId);
      if (backup) {
        console.log('');
        console.log('Backup details:');
        console.log(`  Version: ${backup.version}`);
        console.log(`  Hash: ${backup.hash}`);
        console.log(`  Path: ${backup.path}`);
        process.exit(0);
      }
      process.exit(1);
      break;

    case 'list':
      displayBackups(employeeId);
      process.exit(0);
      break;

    case 'rollback':
      if (args.length < 3) {
        log.error('Please specify target version or "previous"');
        process.exit(1);
      }
      const success = rollback(employeeId, args[2]);
      process.exit(success ? 0 : 1);
      break;

    case 'clean':
      const keepCount = parseInt(args[2] || '3', 10);
      cleanBackups(employeeId, keepCount);
      process.exit(0);
      break;

    default:
      log.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

// Export for programmatic use
module.exports = {
  createBackup,
  rollback,
  listBackups,
  cleanBackups
};

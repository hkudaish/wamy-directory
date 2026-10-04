#!/usr/bin/env node

/**
 * Storage System Verification Script
 * 
 * This script verifies that the storage system is properly installed
 * and functioning correctly.
 * 
 * Run: node verify-storage.js
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.blue}═══ ${msg} ═══${colors.reset}`)
};

async function verify() {
  console.log(`\n${colors.cyan}╔════════════════════════════════════════════╗`);
  console.log(`║     Storage System Verification Script      ║`);
  console.log(`╚════════════════════════════════════════════╝${colors.reset}\n`);

  let passed = 0;
  let failed = 0;

  // Check 1: Required files exist
  log.header('1. Checking Required Files');
  
  const requiredFiles = [
    'server.js',
    'storage-api.js',
    'package.json',
    'index.html',
    'QUICK_START.md',
    'STORAGE_SYSTEM.md',
    'INTEGRATION_GUIDE.js'
  ];

  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      log.success(`Found ${file}`);
      passed++;
    } else {
      log.error(`Missing ${file}`);
      failed++;
    }
  }

  // Check 2: package.json is valid
  log.header('2. Checking package.json');
  
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8')
    );
    
    if (packageJson.name && packageJson.main === 'server.js') {
      log.success('package.json is valid');
      passed++;
    } else {
      log.warning('package.json may need adjustment');
    }

    const deps = packageJson.dependencies || {};
    if (deps.express && deps.cors) {
      log.success('Required dependencies declared (express, cors)');
      passed++;
    } else {
      log.error('Missing dependencies in package.json');
      failed++;
    }
  } catch (error) {
    log.error(`Failed to parse package.json: ${error.message}`);
    failed++;
  }

  // Check 3: Node.js and npm installed
  log.header('3. Checking Node.js and npm');
  
  try {
    const { stdout: nodeVersion } = await execAsync('node --version');
    log.success(`Node.js ${nodeVersion.trim()} installed`);
    passed++;

    const { stdout: npmVersion } = await execAsync('npm --version');
    log.success(`npm ${npmVersion.trim()} installed`);
    passed++;
  } catch (error) {
    log.error('Node.js or npm not found. Please install Node.js from https://nodejs.org');
    failed++;
  }

  // Check 4: node_modules
  log.header('4. Checking Dependencies Installation');
  
  const nodeModulesPath = path.join(__dirname, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    log.success('node_modules directory exists');
    passed++;

    if (fs.existsSync(path.join(nodeModulesPath, 'express'))) {
      log.success('express module installed');
      passed++;
    } else {
      log.warning('express not found in node_modules. Run: npm install');
    }

    if (fs.existsSync(path.join(nodeModulesPath, 'cors'))) {
      log.success('cors module installed');
      passed++;
    } else {
      log.warning('cors not found in node_modules. Run: npm install');
    }
  } else {
    log.warning('node_modules not found. Run: npm install');
  }

  // Check 5: Data directory
  log.header('5. Checking Data Directory');
  
  const dataDir = path.join(__dirname, 'data');
  const dataFile = path.join(dataDir, 'directory-data.json');

  if (fs.existsSync(dataDir)) {
    log.success('data/ directory exists');
    passed++;

    if (fs.existsSync(dataFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
        
        const hasKey = (key) => key in data;
        const requiredKeys = ['employees', 'favorites', 'logs', 'categories', 'users'];
        const missingKeys = requiredKeys.filter(k => !hasKey(k));

        if (missingKeys.length === 0) {
          log.success(`directory-data.json exists and is valid`);
          log.info(`  Employees: ${data.employees?.length || 0}`);
          log.info(`  Users: ${data.users?.length || 0}`);
          log.info(`  Favorites: ${data.favorites?.length || 0}`);
          passed++;
        } else {
          log.error(`directory-data.json missing keys: ${missingKeys.join(', ')}`);
          failed++;
        }
      } catch (error) {
        log.error(`directory-data.json is not valid JSON: ${error.message}`);
        failed++;
      }
    } else {
      log.info('directory-data.json will be created on first server run');
      passed++;
    }
  } else {
    log.info('data/ directory will be created on first server run');
    passed++;
  }

  // Check 6: File permissions (Windows-specific)
  log.header('6. Checking File Permissions');
  
  try {
    const testFile = path.join(__dirname, '.write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    log.success('Directory is writable');
    passed++;
  } catch (error) {
    log.error('Directory is not writable. Check folder permissions.');
    failed++;
  }

  // Check 7: Storage API script content
  log.header('7. Checking storage-api.js');
  
  try {
    const apiScript = fs.readFileSync(path.join(__dirname, 'storage-api.js'), 'utf-8');
    
    if (apiScript.includes('StorageAPI') && apiScript.includes('init') && apiScript.includes('save')) {
      log.success('storage-api.js contains expected functions');
      passed++;
    } else {
      log.error('storage-api.js is missing expected functions');
      failed++;
    }
  } catch (error) {
    log.error(`Failed to read storage-api.js: ${error.message}`);
    failed++;
  }

  // Check 8: Server script content
  log.header('8. Checking server.js');
  
  try {
    const serverScript = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf-8');
    
    const hasExpress = serverScript.includes('express');
    const hasAPI = serverScript.includes('/api');
    const hasFileOps = serverScript.includes('fs.readFileSync') || serverScript.includes('fs.writeFileSync');

    if (hasExpress && hasAPI && hasFileOps) {
      log.success('server.js appears to be complete');
      passed++;
    } else {
      log.warning('server.js may be incomplete');
    }
  } catch (error) {
    log.error(`Failed to read server.js: ${error.message}`);
    failed++;
  }

  // Summary
  log.header('Summary');
  
  const total = passed + failed;
  const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;

  console.log(`\nTests passed: ${colors.green}${passed}${colors.reset}`);
  console.log(`Tests failed: ${colors.red}${failed}${colors.reset}`);
  console.log(`Overall: ${percentage}% complete\n`);

  if (failed === 0) {
    log.success('All checks passed! Ready to start.');
    log.info('Next steps:');
    console.log(`  1. Run: ${colors.cyan}npm install${colors.reset}`);
    console.log(`  2. Run: ${colors.cyan}npm start${colors.reset}`);
    console.log(`  3. Open: ${colors.cyan}http://localhost:3000/index.html${colors.reset}\n`);
  } else if (failed < 3) {
    log.warning('Some checks failed. Please address the errors above.');
    log.info('Common fixes:');
    console.log(`  - Run: ${colors.cyan}npm install${colors.reset}`);
    console.log(`  - Check file permissions`);
    console.log(`  - Verify Node.js is installed\n`);
  } else {
    log.error('Multiple checks failed. Please fix the issues above before proceeding.');
  }

  // Additional information
  log.header('Quick Start Commands');
  
  console.log(`
  Installation:
    ${colors.cyan}npm install${colors.reset}

  Start server:
    ${colors.cyan}npm start${colors.reset}

  Development (auto-reload):
    ${colors.cyan}npm run dev${colors.reset}

  View data:
    ${colors.cyan}type data/directory-data.json${colors.reset}

  Documentation:
    - QUICK_START.md (5-minute setup)
    - STORAGE_SYSTEM.md (complete reference)
    - INTEGRATION_GUIDE.js (code examples)
  `);

  return failed === 0 ? 0 : 1;
}

// Run verification
verify()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    log.error(`Verification script error: ${error.message}`);
    process.exit(1);
  });

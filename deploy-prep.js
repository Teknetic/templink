#!/usr/bin/env node

/**
 * Deployment Preparation Script
 * Helps prepare your TempLink app for production deployment
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

console.log('🚀 TempLink Deployment Preparation\n');

// Check if we should use PostgreSQL
const usePostgres = process.argv.includes('--postgres');

if (usePostgres) {
  console.log('📦 Setting up for PostgreSQL deployment...\n');

  // Install PostgreSQL driver
  console.log('1️⃣  Installing pg package...');
  try {
    execSync('npm install pg', { stdio: 'inherit' });
    console.log('✅ PostgreSQL driver installed\n');
  } catch (err) {
    console.error('❌ Failed to install pg package');
    process.exit(1);
  }

  // Update package.json to use PostgreSQL
  console.log('2️⃣  Updating configuration...');
  const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
  packageJson.dependencies = packageJson.dependencies || {};
  packageJson.dependencies.pg = '^8.11.3';

  // Remove sql.js if present
  if (packageJson.dependencies['sql.js']) {
    delete packageJson.dependencies['sql.js'];
  }

  writeFileSync('./package.json', JSON.stringify(packageJson, null, 2));
  console.log('✅ package.json updated\n');

  console.log('3️⃣  Next steps:');
  console.log('   • Update src/database.js to import from database-postgres.js');
  console.log('   • Set DATABASE_URL environment variable');
  console.log('   • Deploy using: railway up  OR  render deploy\n');

} else {
  console.log('📋 Deployment Checklist:\n');
  console.log('✓ Set environment variables:');
  console.log('  - NODE_ENV=production');
  console.log('  - BASE_URL=https://yourdomain.com');
  console.log('  - DATABASE_URL=postgresql://...\n');

  console.log('✓ Recommended: Use PostgreSQL for production');
  console.log('  Run: node deploy-prep.js --postgres\n');

  console.log('✓ Deploy to Railway (easiest):');
  console.log('  1. railway login');
  console.log('  2. railway init');
  console.log('  3. railway add postgresql');
  console.log('  4. railway up\n');

  console.log('📖 Read DEPLOYMENT.md for full guide');
}

console.log('\n🎉 Ready to deploy!\n');

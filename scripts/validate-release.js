#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Release validation script for @bagaking/proj_facts_mcp
 * Validates that all required files exist and build is ready for publishing
 */

function validateRelease() {
  console.log('🔍 Validating release...');
  
  const projectRoot = path.join(__dirname, '..');
  const errors = [];
  
  // Check required files
  const requiredFiles = [
    'dist/index.js',
    'README.md',
    'package.json',
    'agents/facts-manager.md'
  ];
  
  requiredFiles.forEach(file => {
    const filePath = path.join(projectRoot, file);
    if (!fs.existsSync(filePath)) {
      errors.push(`Missing required file: ${file}`);
    }
  });
  
  // Check package.json
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
    
    if (!packageJson.version) {
      errors.push('Missing version in package.json');
    }
    
    if (!packageJson.main || !fs.existsSync(path.join(projectRoot, packageJson.main))) {
      errors.push(`Main entry point not found: ${packageJson.main}`);
    }
    
    console.log(`📦 Package: ${packageJson.name}@${packageJson.version}`);
    
  } catch (e) {
    errors.push('Invalid package.json: ' + e.message);
  }
  
  // Check dist directory
  const distDir = path.join(projectRoot, 'dist');
  if (!fs.existsSync(distDir)) {
    errors.push('dist/ directory not found - run `pnpm run build` first');
  }
  
  // Report results
  if (errors.length > 0) {
    console.error('❌ Release validation failed:');
    errors.forEach(error => console.error(`  • ${error}`));
    process.exit(1);
  }
  
  console.log('✅ Release validation passed!');
  console.log('🚀 Ready to publish');
}

validateRelease();
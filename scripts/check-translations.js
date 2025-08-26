#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load translation files
const frTranslations = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/features/translation/translations/fr.json'), 'utf8'));
const enTranslations = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/features/translation/translations/en.json'), 'utf8'));

// Function to get all keys from a nested object
function getAllKeys(obj, prefix = '') {
  let keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// Get all keys from both files
const frKeys = getAllKeys(frTranslations);
const enKeys = getAllKeys(enTranslations);

// Find missing keys
const missingInEn = frKeys.filter(key => !enKeys.includes(key));
const missingInFr = enKeys.filter(key => !frKeys.includes(key));

console.log('Translation Key Analysis');
console.log('========================');
console.log(`Total keys in French: ${frKeys.length}`);
console.log(`Total keys in English: ${enKeys.length}`);

if (missingInEn.length > 0) {
  console.log('\n❌ Keys missing in English:');
  missingInEn.forEach(key => console.log(`  - ${key}`));
}

if (missingInFr.length > 0) {
  console.log('\n❌ Keys missing in French:');
  missingInFr.forEach(key => console.log(`  - ${key}`));
}

if (missingInEn.length === 0 && missingInFr.length === 0) {
  console.log('\n✅ All translation keys are synchronized!');
} else {
  console.log('\n⚠️  Translation files have inconsistencies!');
  process.exit(1);
}
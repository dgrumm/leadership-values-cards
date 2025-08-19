// Script to load and validate CSV files
const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '../data/csv/professional.csv');

if (fs.existsSync(csvPath)) {
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.trim().split('\n');
  
  console.log(`CSV loaded: ${lines.length - 1} values found`);
  
  // Basic validation
  if (lines.length !== 41) { // 40 values + header
    console.warn(`Warning: Expected 40 values, found ${lines.length - 1}`);
  }
} else {
  console.error('CSV file not found at:', csvPath);
}
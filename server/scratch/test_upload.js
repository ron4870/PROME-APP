const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testUpload() {
  const form = new FormData();
  form.append('title', 'test-doc.txt');
  form.append('type', 'Report');
  form.append('documentNumber', 'DOC-999');
  
  // Create a dummy text file
  fs.writeFileSync('test-doc.txt', 'Hello World');
  
  form.append('file', fs.createReadStream('test-doc.txt'));

  // Assume project 1 exists
  // We need a valid token though...
  // Actually, we can just look at the DB, or just fix the download logic.
}
testUpload();

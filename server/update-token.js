const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const envPath = path.join(__dirname, '.env');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Please enter your new Google Drive Refresh Token: ', (token) => {
  if (!token || !token.trim()) {
    console.error('Invalid token entered.');
    rl.close();
    process.exit(1);
  }

  const cleanToken = token.trim();
  let envContent = fs.readFileSync(envPath, 'utf8');

  // Replace GOOGLE_REFRESH_TOKEN value
  if (envContent.includes('GOOGLE_REFRESH_TOKEN=')) {
    envContent = envContent.replace(/GOOGLE_REFRESH_TOKEN="[^"]*"/, `GOOGLE_REFRESH_TOKEN="${cleanToken}"`);
    envContent = envContent.replace(/GOOGLE_REFRESH_TOKEN=[^\r\n]*/, `GOOGLE_REFRESH_TOKEN="${cleanToken}"`);
  } else {
    envContent += `\nGOOGLE_REFRESH_TOKEN="${cleanToken}"\n`;
  }

  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('Successfully updated GOOGLE_REFRESH_TOKEN in server/.env!');

  rl.close();
});

require('dotenv').config();
const { google } = require('googleapis');
const { Readable } = require('stream');

async function testDrive() {
  try {
    console.log('Authenticating...');
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground'
    );
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });
    
    const driveService = google.drive({ version: 'v3', auth: oauth2Client });
    const GOOGLE_DRIVE_FOLDER_ID = '1hxR57lA0wbI_LfVFdn-F1avgFeAgVwzz';
    
    console.log('Uploading test file...');
    const fileMetadata = {
      name: 'integration_test_file.txt',
      parents: [GOOGLE_DRIVE_FOLDER_ID]
    };
    
    const media = {
      mimeType: 'text/plain',
      body: Readable.from(['Hello from Antigravity testing!'])
    };
    
    const driveFile = await driveService.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink',
      supportsAllDrives: true
    });
    
    console.log('Upload successful!');
    console.log('File ID:', driveFile.data.id);
    console.log('Web View Link:', driveFile.data.webViewLink);
    
    console.log('Setting permissions to anyone reader...');
    await driveService.permissions.create({
      fileId: driveFile.data.id,
      requestBody: { role: 'reader', type: 'anyone' },
      supportsAllDrives: true
    });
    console.log('Permissions set successfully!');
    
    // Clean up test file
    console.log('Cleaning up test file...');
    await driveService.files.delete({
        fileId: driveFile.data.id,
        supportsAllDrives: true
    });
    console.log('Test complete and cleaned up successfully.');
  } catch (err) {
    console.error('Error during testing:', err.message);
  }
}

testDrive();

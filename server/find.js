const { google } = require("googleapis");
const auth = new google.auth.GoogleAuth({
  keyFile: "./google-credentials.json",
  scopes: ["https://www.googleapis.com/auth/drive"]
});
const drive = google.drive({ version: "v3", auth });
async function findFolder() {
  const res = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.folder' and name='Test Folder'",
    fields: "files(id, name, driveId)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    corpora: "allDrives"
  });
  console.log(res.data.files);
}
findFolder();

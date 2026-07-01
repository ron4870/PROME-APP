import { google } from 'googleapis';
import multer from 'multer';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

// Setup Google Drive Auth
export const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

export const driveService = google.drive({ version: 'v3', auth: oauth2Client });
export const GOOGLE_DRIVE_FOLDER_ID = '1hxR57lA0wbI_LfVFdn-F1avgFeAgVwzz';

// Setup file uploads using memory storage
export const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

export async function getOrCreateProjectFolder(projectId: number, projectName: string, currentFolderId: string | null): Promise<string> {
    if (currentFolderId) return currentFolderId;

    const parentId = projectName === 'Master Database' ? '1NiTtobaBBEgm0MbJz0mdVmJPO5TOKwKO' : GOOGLE_DRIVE_FOLDER_ID;
    const folderName = projectName === 'Master Database' ? 'Master Database' : `Project: ${projectName}`;

    // Create a new folder
    const folderMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId]
    };
    
    const driveFolder = await driveService.files.create({
        requestBody: folderMetadata,
        fields: 'id',
        supportsAllDrives: true
    });
    
    const newFolderId = driveFolder.data.id;
    if (!newFolderId) throw new Error("Failed to create Google Drive folder");
    
    // Set permissions to anyone with link can view
    await driveService.permissions.create({
        fileId: newFolderId,
        requestBody: { role: 'reader', type: 'anyone' },
        supportsAllDrives: true
    });
    
    // Update the database to save this folder ID
    await prisma.project.update({
        where: { id: projectId },
        data: { driveFolderId: newFolderId }
    });
    
    return newFolderId;
}

export async function getOrCreateBidFolder(bidId: number, bidTitle: string, currentFolderId: string | null): Promise<string> {
    if (currentFolderId) return currentFolderId;

    // Create a new folder
    const folderMetadata = {
        name: `Bid Workspace: ${bidTitle}`,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [GOOGLE_DRIVE_FOLDER_ID]
    };
    
    const driveFolder = await driveService.files.create({
        requestBody: folderMetadata,
        fields: 'id, webViewLink',
        supportsAllDrives: true
    });
    
    const newFolderId = driveFolder.data.id;
    if (!newFolderId) throw new Error("Failed to create Google Drive folder");
    
    // Set permissions to anyone with link can view/edit
    await driveService.permissions.create({
        fileId: newFolderId,
        requestBody: { role: 'writer', type: 'anyone' },
        supportsAllDrives: true
    });
    
    // Update the database to save this folder ID
    await prisma.bid.update({
        where: { id: bidId },
        data: { driveFolderId: newFolderId }
    });
    
    return newFolderId;
}

export async function getOrCreateBookOfDrawingsFolder(projectId: number, projectName: string, currentFolderId: string | null): Promise<string> {
    if (currentFolderId) return currentFolderId;

    // Create a new folder
    const folderMetadata = {
        name: `Book of Drawings: ${projectName}`,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [GOOGLE_DRIVE_FOLDER_ID]
    };
    
    const driveFolder = await driveService.files.create({
        requestBody: folderMetadata,
        fields: 'id, webViewLink',
        supportsAllDrives: true
    });
    
    const newFolderId = driveFolder.data.id;
    if (!newFolderId) throw new Error("Failed to create Google Drive folder");
    
    // Set permissions to anyone with link can edit
    await driveService.permissions.create({
        fileId: newFolderId,
        requestBody: { role: 'writer', type: 'anyone' },
        supportsAllDrives: true
    });
    
    // Update the database to save this folder ID
    await prisma.bookOfDrawingsProject.update({
        where: { id: projectId },
        data: { driveFolderId: newFolderId }
    });
    
    return newFolderId;
}

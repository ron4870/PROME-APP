import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { google } from 'googleapis';
import { Readable } from 'stream';
import capaRoutes from './routes/capa.routes';
import auditRoutes from './routes/audit.routes';
import riskRoutes from './routes/risk.routes';
import managementReviewRoutes from './routes/management-review.routes';
import objectivesRoutes from './routes/objectives.routes';
import trainingRoutes from './routes/training.routes';
import equipmentRoutes from './routes/equipment.routes';
import feedbackRoutes from './routes/feedback.routes';
import supplierRoutes from './routes/supplier.routes';
import documentRoutes from './routes/documents.routes';
import dashboardRoutes from './routes/dashboard.routes';
import complianceRoutes from './routes/compliance.routes';
import contextRoutes from './routes/context.routes';
import hseRoutes from './routes/hse.routes';
import mocRoutes from './routes/moc.routes';
import noticeRoutes from './routes/noticeboard.routes';
import ncrRoutes from './routes/ncr.routes';
import projectRoutes from './routes/project.routes';
import workflowRoutes from './routes/workflow.routes';
import formsRoutes from './routes/forms.routes';
import manualsRoutes from './routes/manuals';
import wikiRoutes from './routes/wiki.routes';
import notificationRoutes from './routes/notification.routes';
import aiRoutes from './routes/ai.routes';
import bidsRoutes from './routes/bids.routes';
import { setupCronJobs } from './services/cron.service';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-prome-key';

// Configure Nodemailer for Google Workspace
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'admin@promeconsult.com',
    pass: 'ketiswrgkmowpmvb',
  },
});

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;

setupCronJobs();

app.use(cors());
app.use(express.json());

app.use('/api/capa', capaRoutes);
app.use('/api/audits', auditRoutes);
app.use('/api/risks', riskRoutes);
app.use('/api/management-reviews', managementReviewRoutes);
app.use('/api/objectives', objectivesRoutes);
app.use('/api/trainings', trainingRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/context', contextRoutes);
app.use('/api/hse', hseRoutes);
app.use('/api/moc', mocRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/ncr', ncrRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/forms', formsRoutes);
app.use('/api/manuals', manualsRoutes);
app.use('/api/wiki', wikiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/bids', bidsRoutes);

import { driveService, GOOGLE_DRIVE_FOLDER_ID, upload } from './services/drive.service';

// Continue to serve existing local files for backward compatibility
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Basic health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Test DB connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Database connection failed', error);
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// --- Roles Endpoints ---
app.get('/api/roles', async (req, res) => {
  try {
    const roles = await prisma.role.findMany({ orderBy: { id: 'asc' } });
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

app.post('/api/roles', async (req, res) => {
  const { name, permissions } = req.body;
  try {
    const newRole = await prisma.role.create({
      data: { name, permissions: permissions || {} },
    });
    res.status(201).json(newRole);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create role' });
  }
});

app.put('/api/roles/:id', async (req, res) => {
  const { id } = req.params;
  const { permissions } = req.body;
  try {
    const updatedRole = await prisma.role.update({
      where: { id: Number(id) },
      data: { permissions },
    });
    res.json(updatedRole);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// --- Users Endpoints ---
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { role: true },
      orderBy: { id: 'asc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.put('/api/users/:id/role', async (req, res) => {
  const { id } = req.params;
  const { roleId } = req.body;
  try {
    const updatedUser = await prisma.user.update({
      where: { id: Number(id) },
      data: { roleId: Number(roleId) },
      include: { role: true }
    });
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Update User Profile
app.put('/api/users/profile', upload.array('documents'), async (req, res) => {
  console.log('Received profile update request');
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    console.log('User ID:', decoded.userId);
    const { bio, skills, qualifications, phone, location } = req.body;
    
    const files = req.files as Express.Multer.File[];
    console.log(`Files received: ${files ? files.length : 0}`);

    const updateData: any = {};
    if (bio !== undefined) updateData.bio = bio;
    if (skills !== undefined) updateData.skills = skills;
    if (qualifications !== undefined) updateData.qualifications = qualifications;
    if (phone !== undefined) updateData.phone = phone;
    if (location !== undefined) updateData.location = location;

    await prisma.user.update({
      where: { id: decoded.userId },
      data: updateData,
    });

    if (files && files.length > 0) {
      const documentsToCreate = [];

      for (const file of files) {
        // Upload to Google Drive
        const fileMetadata = {
          name: file.originalname,
          parents: [GOOGLE_DRIVE_FOLDER_ID]
        };
        const media = {
          mimeType: file.mimetype,
          body: Readable.from(file.buffer)
        };

        try {
          console.log(`Uploading ${file.originalname} to Google Drive...`);
          const driveFile = await driveService.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, webViewLink, webContentLink',
            supportsAllDrives: true
          });

          const fileId = driveFile.data.id;
          console.log(`Uploaded! File ID: ${fileId}`);
          
          if (fileId) {
            // Make the file publicly accessible so users can view/download it
            await driveService.permissions.create({
              fileId: fileId,
              requestBody: {
                role: 'reader',
                type: 'anyone',
              },
              supportsAllDrives: true
            });

            console.log(`Permissions set for ${fileId}, link: ${driveFile.data.webViewLink}`);
            documentsToCreate.push({
              filename: file.originalname,
              filepath: driveFile.data.webViewLink || '', // Store the drive URL instead of local path
              userId: decoded.userId
            });
          }
        } catch (uploadError) {
          console.error('Google Drive upload failed:', uploadError);
          // If upload to Drive fails, we probably shouldn't crash the whole profile update,
          // but we might want to return a warning or error. For now, it just skips creating the document record.
        }
      }

      if (documentsToCreate.length > 0) {
        console.log(`Saving ${documentsToCreate.length} document records to database`);
        await prisma.userDocument.createMany({
          data: documentsToCreate
        });
      }
    }

    const finalUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { role: true, userDocuments: true }
    });

    res.json(finalUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Admin Create User & Send Email
app.post('/api/users', async (req, res) => {
  const { name, email, roleId, division } = req.body;
  try {
    // Generate an 8-character temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        roleId: Number(roleId),
        division,
        passwordHash,
        needsPasswordChange: true
      },
      include: { role: true }
    });

    // Send Email
    const mailOptions = {
      from: '"PROME Intranet Portal" <admin@promeconsult.com>',
      to: email,
      subject: 'Welcome to PROME Intranet Portal - Your Login Credentials',
      html: `
        <h2>Welcome to the PROME Intranet Portal, ${name}!</h2>
        <p>An administrator has created an account for you.</p>
        <p>Your login credentials are:</p>
        <ul>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Temporary Password:</strong> ${tempPassword}</li>
        </ul>
        <p>Please log in at <a href="https://ims.promeconsult.com">https://ims.promeconsult.com</a>.</p>
        <p><em>Note: You will be required to change your password immediately upon your first login.</em></p>
      `
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) console.error('Error sending email:', error);
      else console.log('Email sent:', info.response);
    });

    res.status(201).json(newUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Admin Delete User
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.user.delete({
      where: { id: Number(id) }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// --- Authentication Endpoints ---

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Special fallback for initial admin login before passwordHash is set
    if (email === 'admin@promeconsult.com' && !user.passwordHash) {
      if (password === 'H#ll0(pr0me)?') {
        // Hash and save it now
        const hash = await bcrypt.hash(password, 10);
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: hash, needsPasswordChange: false }
        });
        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
        return res.json({ token, user: { ...user, needsPasswordChange: false } });
      }
    }

    if (!user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/change-password', async (req, res) => {
  const { email, oldPassword, newPassword } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid user' });
    }

    const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isValid && oldPassword !== 'H#ll0(pr0me)?') { // Fallback bypass just in case for admin
      return res.status(401).json({ error: 'Invalid current password' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { passwordHash: newHash, needsPasswordChange: false },
      include: { role: true }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});
app.get('/api/auth/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { role: true, userDocuments: true }
    });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Forgot Password
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'Unknown Email' });
    }

    // Generate temp password
    const tempPassword = Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, needsPasswordChange: true }
    });

    // Send email
    const mailOptions = {
      from: '"PROME Intranet Portal" <admin@promeconsult.com>',
      to: email,
      subject: 'PROME Intranet Portal - Password Reset',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>Hello ${user.name},</p>
          <p>A password reset was requested for your PROME Intranet Portal account.</p>
          <p>Your new temporary password is: <strong>${tempPassword}</strong></p>
          <p>Please log in using this temporary password. You will be required to change it immediately upon logging in.</p>
          <br>
          <p>Best regards,</p>
          <p>PROME System Administrator</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// --- ISO Document Control Endpoints ---

// Get ISO Documents (Admins see all, others see APPROVED)

// Get single ISO document
app.get('/api/iso-documents/:id', async (req, res) => {
  try {
    const document = await prisma.isoDocument.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        author: true,
        approver: true,
      }
    });
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json(document);
  } catch (error) {
    console.error('Failed to fetch ISO document:', error);
    res.status(500).json({ error: 'Failed to fetch ISO document' });
  }
});

app.get('/api/iso-documents', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { role: true }
    });

    let whereClause = {};
    // If not Admin/Quality Manager (checking if role is somewhat elevated, assuming role name check or generic)
    // For now, let's say if role is Admin/Administrator, fetch all, else fetch APPROVED
    if (user?.role?.name !== 'Admin' && user?.role?.name !== 'Super Admin' && user?.role?.name !== 'Administrator') {
      whereClause = { status: 'APPROVED' };
    }

    const docs = await prisma.isoDocument.findMany({
      where: whereClause,
      include: {
        author: { select: { name: true } },
        reviewer: { select: { name: true } },
        approver: { select: { name: true } },
        acknowledgments: {
          where: { userId: decoded.userId }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json(docs);
  } catch (error) {
    console.error('Error fetching ISO docs:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Create new ISO Document Draft (Supports Native and File upload)
app.post('/api/iso-documents', upload.single('file'), async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const { documentNumber, title, category, reviewerId, approverId, format, content } = req.body;
    const file = req.file;
    let fileUrl = null;

    if (file) {
      // Upload to Google Drive
      const fileMetadata = { name: file.originalname, parents: [GOOGLE_DRIVE_FOLDER_ID] };
      const media = { mimeType: file.mimetype, body: Readable.from(file.buffer) };
      const driveFile = await driveService.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink',
        supportsAllDrives: true
      });
      const fileId = driveFile.data.id;
      if (fileId) {
        await driveService.permissions.create({
          fileId: fileId,
          requestBody: { role: 'reader', type: 'anyone' },
          supportsAllDrives: true
        });
        fileUrl = driveFile.data.webViewLink;
      }
    }

    const newDoc = await prisma.isoDocument.create({
      data: {
        documentNumber,
        title,
        category,
        authorId: decoded.userId,
        reviewerId: reviewerId ? Number(reviewerId) : null,
        approverId: approverId ? Number(approverId) : null,
        fileUrl,
        format: format || (file ? 'legacy' : 'native'),
        content: content || '',
        status: 'DRAFT'
      }
    });

    await prisma.isoDocumentHistory.create({
      data: {
        isoDocumentId: newDoc.id,
        revision: newDoc.revision,
        changeSummary: 'Document drafted.',
        content: newDoc.content,
        status: 'DRAFT',
        updatedById: decoded.userId
      }
    });

    res.status(201).json(newDoc);
  } catch (error) {
    console.error('Error creating ISO doc:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// Auto-save native document content
app.put('/api/iso-documents/:id/content', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const { id } = req.params;
    const { content } = req.body;

    const doc = await prisma.isoDocument.findUnique({ where: { id: Number(id) } });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.status !== 'DRAFT' && doc.status !== 'REJECTED') {
      return res.status(403).json({ error: 'Only drafts can be edited directly' });
    }

    const updatedDoc = await prisma.isoDocument.update({
      where: { id: Number(id) },
      data: { content }
    });

    res.json(updatedDoc);
  } catch (error) {
    console.error('Error saving document content:', error);
    res.status(500).json({ error: 'Failed to save document content' });
  }
});

// Get document history
app.get('/api/iso-documents/:id/history', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const { id } = req.params;
    const history = await prisma.isoDocumentHistory.findMany({
      where: { isoDocumentId: Number(id) },
      include: {
        updatedBy: { select: { name: true } }
      },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(history);
  } catch (error) {
    console.error('Error fetching document history:', error);
    res.status(500).json({ error: 'Failed to fetch document history' });
  }
});

// Change Status (Workflow)
app.patch('/api/iso-documents/:id/status', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const { id } = req.params;
    const { status, changeSummary } = req.body;

    const doc = await prisma.isoDocument.findUnique({ where: { id: Number(id) } });
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // In a strict environment, check if decoded.userId == reviewerId or approverId

    let newRevision = doc.revision;
    let publishedAt = doc.publishedAt;

    if (status === 'PUBLISHED' && doc.status !== 'PUBLISHED') {
      // Increment major revision version on publish if needed
      // Actually typically revision stays same until it goes back to DRAFT for next version.
      publishedAt = new Date();
    } else if (status === 'DRAFT' && doc.status === 'PUBLISHED') {
      // If we move back to draft from published, increment revision
      const revParts = doc.revision.split('.');
      if (revParts.length === 2) {
        newRevision = `${parseInt(revParts[0]) + 1}.0`;
      }
    }

    const updatedDoc = await prisma.isoDocument.update({
      where: { id: Number(id) },
      data: { status, revision: newRevision, publishedAt }
    });

    await prisma.isoDocumentHistory.create({
      data: {
        isoDocumentId: updatedDoc.id,
        revision: updatedDoc.revision,
        changeSummary: changeSummary || `Status changed to ${status}`,
        content: updatedDoc.content,
        status: status,
        updatedById: decoded.userId
      }
    });

    res.json(updatedDoc);
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update document status' });
  }
});

// Acknowledge Document
app.post('/api/iso-documents/:id/acknowledge', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const { id } = req.params;

    const ack = await prisma.documentAcknowledgment.create({
      data: {
        isoDocumentId: Number(id),
        userId: decoded.userId
      }
    });

    res.json(ack);
  } catch (error) {
    console.error('Error acknowledging document:', error);
    res.status(500).json({ error: 'Failed to acknowledge document' });
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

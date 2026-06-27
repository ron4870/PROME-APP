import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  user?: any;
  projectMembership?: any;
}

// Middleware to check if user has access to a specific project
export const checkProjectAccess = (requiredRole?: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const projectId = parseInt(req.params.id || req.params.projectId);
      
      // If we don't have a user or project ID, we can't check access
      if (!req.user || !projectId) {
        return res.status(401).json({ message: 'Unauthorized or missing project ID' });
      }

      // Allow Global Admins to bypass
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: { roles: true }
      });
      
      if (user?.roles?.some(r => r.name === 'Administrator' || r.name === 'Super Admin')) {
        return next();
      }

      // Check if user is a member of this project
      const membership = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: projectId,
            userId: req.user.userId
          }
        }
      });

      if (!membership) {
        return res.status(403).json({ message: 'Forbidden: You do not have access to this project' });
      }

      // If a specific role is required (e.g. Project Manager), check it
      if (requiredRole && membership.role !== requiredRole) {
        return res.status(403).json({ message: `Forbidden: Requires ${requiredRole} access` });
      }

      // Pass the membership info along in the request for downstream use
      req.projectMembership = membership;
      next();
    } catch (error) {
      console.error('Project Access Error:', error);
      res.status(500).json({ message: 'Server error checking project access' });
    }
  };
};

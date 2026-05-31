import os
import glob

# Create auth middleware
os.makedirs('server/src/middleware', exist_ok=True)
with open('server/src/middleware/auth.ts', 'w') as f:
    f.write("""import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-prome-key';

export const auth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'No token' });
  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    (req as any).user = user;
    next();
  });
};
""")

# Fix files
for filepath in glob.glob('server/src/routes/*.ts'):
    with open(filepath, 'r') as f:
        content = f.read()

    # Apply fixes
    content = content.replace('prisma.capa.', 'prisma.capaReport.')
    content = content.replace('prisma.document.', 'prisma.masterDocument.')
    content = content.replace('prisma.internalAudit.', 'prisma.audit.')
    content = content.replace('classification:', '// classification:')
    content = content.replace('capaReportId:', '// capaReportId:')
    content = content.replace('residualRiskLevel:', '// residualRiskLevel:')
    content = content.replace('capaNumber: true', '/* capaNumber: true */')
    content = content.replace('department: true', '/* department: true */')

    with open(filepath, 'w') as f:
        f.write(content)

print('Done fixing routes!')

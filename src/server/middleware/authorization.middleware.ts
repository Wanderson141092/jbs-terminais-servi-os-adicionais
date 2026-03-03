// authorization.middleware.ts

import { Request, Response, NextFunction } from 'express';

// Define roles
const roles = {
    ADMIN: 'admin',
    USER: 'user',
};

interface RoleAuthorized {
    roles: string[];
}

// Role-based authorization middleware
export const authorize = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const userRole = req.user?.role; // Assume req.user is populated with user info

        if (!userRole || !roles.includes(userRole)) {
            return res.status(403).json({ message: 'Access denied.' });
        }
        next();
    };
};

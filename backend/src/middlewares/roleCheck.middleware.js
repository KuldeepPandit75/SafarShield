import { ApiError } from '../utils/ApiError.js';

// Role-based access control middleware
// Restricts access to specific user roles

export const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            throw new ApiError(401, 'Authentication required');
        }

        if (!allowedRoles.includes(req.user.role)) {
            throw new ApiError(403, `Access denied. Required roles: ${allowedRoles.join(', ')}`);
        }

        next();
    };
};

// Ensure tourist role
export const requireTourist = requireRole(['tourist']);

// Ensure police role
export const requirePolice = requireRole(['police', 'admin']);

// Ensure admin role
export const requireAdmin = requireRole(['admin']);

export default {
    requireRole,
    requireTourist,
    requirePolice,
    requireAdmin
};

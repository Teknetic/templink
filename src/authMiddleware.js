import { verifyToken, getUserById } from './authService.js';

// Middleware to check if user is authenticated
export const requireAuth = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      plan: decoded.plan
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Middleware to check if user is authenticated (optional - doesn't fail if no token)
export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);

      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        plan: decoded.plan
      };
    }
  } catch (error) {
    // Ignore errors, just don't set req.user
  }

  next();
};

// Middleware to check if user has specific plan
export const requirePlan = (minPlan) => {
  const planLevels = { free: 0, pro: 1, business: 2 };

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userPlanLevel = planLevels[req.user.plan] || 0;
    const requiredPlanLevel = planLevels[minPlan] || 0;

    if (userPlanLevel < requiredPlanLevel) {
      return res.status(403).json({
        error: 'Upgrade required',
        message: `This feature requires ${minPlan} plan or higher`,
        currentPlan: req.user.plan,
        requiredPlan: minPlan
      });
    }

    next();
  };
};

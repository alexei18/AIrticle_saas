const jwt = require('jsonwebtoken');
const { User } = require('../models');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['passwordHash'] }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }


    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
};

const checkPlanLimits = (requiredPlan = 'starter') => {
  return (req, res, next) => {
    const planHierarchy = {
      'starter': 1,
      'professional': 2,
      'enterprise': 3
    };

    const userPlanLevel = planHierarchy[req.user.planType];
    const requiredPlanLevel = planHierarchy[requiredPlan];

    if (userPlanLevel < requiredPlanLevel) {
      return res.status(403).json({ 
        error: 'Upgrade required',
        currentPlan: req.user.planType,
        requiredPlan: requiredPlan
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  checkPlanLimits
};
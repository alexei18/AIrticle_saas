const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { User } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

const registerSchema = Joi.object({
email: Joi.string().email().required(),
password: Joi.string().min(8).required(),
firstName: Joi.string().min(2).max(100).required(),
lastName: Joi.string().min(2).max(100).required(),
planType: Joi.string().valid('starter', 'professional', 'enterprise').optional()
});
const loginSchema = Joi.object({
email: Joi.string().email().required(),
password: Joi.string().required()
});

const generateToken = (user) => {
return jwt.sign(
{ userId: user.id, planType: user.planType },
process.env.JWT_SECRET,
{ expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
);
};

router.post('/register', async (req, res) => {
try {
const { error, value } = registerSchema.validate(req.body);
if (error) {
return res.status(400).json({ error: error.details[0].message });
}

const { email, password, firstName, lastName, planType = 'starter' } = value;

const existingUser = await User.findOne({ where: { email } });
if (existingUser) {
  return res.status(409).json({ error: 'User already exists with this email' });
}

const saltRounds = 12;
const passwordHash = await bcrypt.hash(password, saltRounds);

const trialEndsAt = new Date();
trialEndsAt.setDate(trialEndsAt.getDate() + 14);

const user = await User.create({
  email,
  passwordHash,
  firstName,
  lastName,
  planType,
  trialEndsAt
});

const token = generateToken(user);

const userData = {
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  planType: user.planType,
  trialEndsAt: user.trialEndsAt
};

res.status(201).json({
  message: 'User registered successfully',
  user: userData,
  token
});
} catch (error) {
console.error('Registration error:', error);
res.status(500).json({ error: 'Registration failed' });
}
});

router.post('/login', async (req, res) => {
try {
const { error, value } = loginSchema.validate(req.body);
if (error) {
return res.status(400).json({ error: error.details[0].message });
}

const { email, password } = value;

const user = await User.findOne({ where: { email } });
if (!user) {
  return res.status(401).json({ error: 'Invalid credentials' });
}

if (!user.isActive) {
  return res.status(401).json({ error: 'Account is deactivated' });
}

const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
if (!isPasswordValid) {
  return res.status(401).json({ error: 'Invalid credentials' });
}

const token = generateToken(user);

const userData = {
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  planType: user.planType,
  trialEndsAt: user.trialEndsAt,
  subscriptionEndsAt: user.subscriptionEndsAt
};

res.json({
  message: 'Login successful',
  user: userData,
  token
});

} catch (error) {
console.error('Login error:', error);
res.status(500).json({ error: 'Login failed' });
}
});

router.get('/profile', authenticateToken, async (req, res) => {
res.json({ user: req.user });
});

router.put('/profile', authenticateToken, async (req, res) => {
try {
const updateSchema = Joi.object({
firstName: Joi.string().min(2).max(100).optional(),
lastName: Joi.string().min(2).max(100).optional(),
email: Joi.string().email().optional()
});

const { error, value } = updateSchema.validate(req.body);
if (error) return res.status(400).json({ error: error.details[0].message });

if (value.email && value.email !== req.user.email) {
  const existingUser = await User.findOne({ where: { email: value.email } });
  if (existingUser) {
    return res.status(409).json({ error: 'Email already in use' });
  }
  value.emailVerified = false;
}

const [updatedRows] = await User.update(value, { where: { id: req.user.id } });

if (updatedRows > 0) {
    const updatedUser = await User.findByPk(req.user.id, {
        attributes: { exclude: ['passwordHash'] }
    });
    res.json({ message: 'Profile updated successfully', user: updatedUser });
} else {
    res.status(404).json({ error: 'User not found' });
}
} catch (error) {
console.error('Profile update error:', error);
res.status(500).json({ error: 'Failed to update profile' });
}
});

router.get('/verify-token', authenticateToken, (req, res) => {
res.json({ valid: true, user: req.user });
});

module.exports = router;
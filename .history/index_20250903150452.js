// Morphlink Backend Monolith
// Contains Auth, Link Manager, Redirector, and Analytics modules

const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const database = require('./database');

// JWT Secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'morphlink-secret-key-2024';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Internal state for autopilot control
let redirectorStatus = 'active'; // 'active' or 'inactive'

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// =============================================================================
// AUTH MODULE
// =============================================================================

// User signup endpoint
app.post('/api/auth/signup', (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Check if user already exists
    const existingUser = database.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }
    
    // Create new user
    const newUser = database.addUser({ email, password });
    
    // Return user without password
    const { password: _, ...userResponse } = newUser;
    res.status(201).json({ message: 'User created successfully', user: userResponse });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User login endpoint
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find user and validate password
    const user = database.findUserByEmail(email);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Return user without password
    const { password: _, ...userResponse } = user;
    res.json({ message: 'Login successful', user: userResponse });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// LINK MANAGER MODULE
// =============================================================================

// Create short link endpoint
app.post('/api/links', (req, res) => {
  try {
    const { longUrl } = req.body;
    
    if (!longUrl) {
      return res.status(400).json({ error: 'longUrl is required' });
    }
    
    // Validate URL format (basic validation)
    try {
      new URL(longUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    // Generate unique short code
    const shortCode = nanoid(8);
    
    // Store the link
    const newLink = database.addLink({ shortCode, longUrl });
    
    res.status(201).json({
      message: 'Short link created successfully',
      link: newLink,
      shortUrl: `http://localhost:${PORT}/${shortCode}`
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all links endpoint
app.get('/api/links', (req, res) => {
  try {
    const links = database.getAllLinks();
    res.json({ links });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// ANALYTICS MODULE
// =============================================================================

// Asynchronous analytics logging function
function logClick(shortCode) {
  // This runs asynchronously and doesn't block the redirect
  setImmediate(() => {
    try {
      database.logClick(shortCode);
      console.log(`Analytics: Click logged for ${shortCode} at ${new Date().toISOString()}`);
    } catch (error) {
      console.error('Analytics error:', error);
    }
  });
}

// Get analytics endpoint (for debugging/monitoring)
app.get('/api/analytics', (req, res) => {
  try {
    const analytics = database.getAnalytics();
    res.json({ analytics });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// REDIRECTOR MODULE
// =============================================================================

// Short URL redirect endpoint
app.get('/:shortCode', (req, res) => {
  try {
    // Check if redirector is active (autopilot control)
    if (redirectorStatus !== 'active') {
      return res.status(503).json({ 
        error: 'Redirector service temporarily unavailable',
        message: 'Microservice is handling redirects'
      });
    }
    
    const { shortCode } = req.params;
    
    // Increment load counter for autopilot monitoring
    database.incrementLoad();
    
    // Find the link
    const link = database.findLinkByShortCode(shortCode);
    
    if (!link) {
      return res.status(404).json({ error: 'Short URL not found' });
    }
    
    // Log analytics asynchronously (non-blocking)
    logClick(shortCode);
    
    // Perform redirect
    res.redirect(302, link.longUrl);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// OBSERVABILITY ENDPOINTS
// =============================================================================

// Health check endpoint for autopilot monitoring
app.get('/api/health', (req, res) => {
  try {
    const currentLoad = database.getCurrentLoad();
    
    res.json({
      redirector: {
        status: redirectorStatus === 'active' ? 'integrated' : 'separated',
        load: currentLoad
      },
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// CONTROL ENDPOINTS FOR AUTOPILOT
// =============================================================================

// Internal endpoint to control redirector status
app.post('/api/internal/set-redirector-status', (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be "active" or "inactive"' 
      });
    }
    
    const previousStatus = redirectorStatus;
    redirectorStatus = status;
    
    console.log(`Redirector status changed: ${previousStatus} -> ${status}`);
    
    res.json({
      message: 'Redirector status updated successfully',
      previousStatus,
      currentStatus: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Morphlink Monolith running on http://localhost:${PORT}`);
  console.log(`📊 Health endpoint: http://localhost:${PORT}/api/health`);
  console.log(`🔗 Create links: POST http://localhost:${PORT}/api/links`);
  console.log(`📋 View links: GET http://localhost:${PORT}/api/links`);
  console.log(`🔐 Auth endpoints: /api/auth/signup, /api/auth/login`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Morphlink Monolith...');
  database.cleanup();
  process.exit(0);
});

module.exports = app;
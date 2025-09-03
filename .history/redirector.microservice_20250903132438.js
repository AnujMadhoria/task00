// Morphlink Redirector Microservice
// Standalone microservice for handling URL redirects
// Runs on port 3001 and contains only redirector logic

const express = require('express');
const database = require('./database');

const app = express();
const PORT = process.env.REDIRECTOR_PORT || 3001;

// Middleware
app.use(express.json());

// =============================================================================
// REDIRECTOR MICROSERVICE LOGIC
// =============================================================================

// Asynchronous analytics logging function (same as monolith)
function logClick(shortCode) {
  // This runs asynchronously and doesn't block the redirect
  setImmediate(() => {
    try {
      database.logClick(shortCode);
      console.log(`[Microservice] Analytics: Click logged for ${shortCode} at ${new Date().toISOString()}`);
    } catch (error) {
      console.error('[Microservice] Analytics error:', error);
    }
  });
}

// Short URL redirect endpoint (microservice version)
app.get('/:shortCode', (req, res) => {
  try {
    const { shortCode } = req.params;
    
    console.log(`[Microservice] Processing redirect for: ${shortCode}`);
    
    // Increment load counter (shared with monolith)
    database.incrementLoad();
    
    // Find the link in shared database
    const link = database.findLinkByShortCode(shortCode);
    
    if (!link) {
      console.log(`[Microservice] Short URL not found: ${shortCode}`);
      return res.status(404).json({ 
        error: 'Short URL not found',
        service: 'microservice'
      });
    }
    
    // Log analytics asynchronously (non-blocking)
    logClick(shortCode);
    
    console.log(`[Microservice] Redirecting ${shortCode} -> ${link.longUrl}`);
    
    // Perform redirect
    res.redirect(302, link.longUrl);
  } catch (error) {
    console.error('[Microservice] Redirect error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      service: 'microservice'
    });
  }
});

// Health check endpoint for the microservice
app.get('/health', (req, res) => {
  try {
    const currentLoad = database.getCurrentLoad();
    
    res.json({
      service: 'redirector-microservice',
      status: 'active',
      load: currentLoad,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      port: PORT
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Internal server error',
      service: 'microservice'
    });
  }
});

// Root endpoint to identify the service
app.get('/', (req, res) => {
  res.json({
    message: 'Morphlink Redirector Microservice',
    version: '1.0.0',
    status: 'running',
    port: PORT,
    endpoints: {
      redirect: '/:shortCode',
      health: '/health'
    }
  });
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Microservice] Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    service: 'microservice'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    service: 'microservice',
    availableEndpoints: ['/:shortCode', '/health', '/']
  });
});

// =============================================================================
// SERVER STARTUP
// =============================================================================

// Start microservice server
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`🔄 Morphlink Redirector Microservice running on http://localhost:${PORT}`);
    console.log(`💚 Microservice health: http://localhost:${PORT}/health`);
    console.log(`🎯 Ready to handle redirects on port ${PORT}`);
  });
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Redirector Microservice...');
    server.close(() => {
      console.log('✅ Microservice shut down gracefully');
      process.exit(0);
    });
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down Redirector Microservice...');
    server.close(() => {
      console.log('✅ Microservice shut down gracefully');
      process.exit(0);
    });
  });
}

module.exports = app;
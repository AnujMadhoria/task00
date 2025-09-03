// Morphlink Autopilot System
// Monitors load and automatically scales by starting/stopping the redirector microservice

const { spawn } = require('child_process');
const axios = require('axios');
const path = require('path');

// =============================================================================
// AUTOPILOT CONFIGURATION
// =============================================================================

const CONFIG = {
  // Load threshold for triggering microservice scaling
  LOAD_THRESHOLD: 20,
  
  // Polling interval for health checks (10 seconds)
  POLL_INTERVAL: 10000,
  
  // Monolith and microservice endpoints
  MONOLITH_URL: 'http://localhost:3000',
  MICROSERVICE_URL: 'http://localhost:3001',
  
  // Paths
  MICROSERVICE_SCRIPT: path.join(__dirname, 'redirector.microservice.js')
};

// =============================================================================
// AUTOPILOT STATE MANAGEMENT
// =============================================================================

class AutopilotSystem {
  constructor() {
    this.microserviceProcess = null;
    this.isMonitoring = false;
    this.pollInterval = null;
    this.consecutiveErrors = 0;
    this.maxConsecutiveErrors = 3;
    
    console.log('🤖 Morphlink Autopilot System initialized');
    console.log(`📊 Load threshold: ${CONFIG.LOAD_THRESHOLD}`);
    console.log(`⏱️  Poll interval: ${CONFIG.POLL_INTERVAL}ms`);
  }

  // Start the autopilot monitoring system
  start() {
    if (this.isMonitoring) {
      console.log('⚠️  Autopilot is already running');
      return;
    }

    console.log('🚀 Starting Autopilot monitoring...');
    this.isMonitoring = true;
    this.consecutiveErrors = 0;
    
    // Start polling the monolith health endpoint
    this.pollInterval = setInterval(() => {
      this.checkLoadAndScale();
    }, CONFIG.POLL_INTERVAL);
    
    // Initial check
    this.checkLoadAndScale();
  }

  // Stop the autopilot monitoring system
  stop() {
    console.log('🛑 Stopping Autopilot monitoring...');
    this.isMonitoring = false;
    
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    
    // Stop microservice if running
    if (this.microserviceProcess) {
      this.stopMicroservice();
    }
  }

  // Main autopilot logic: check load and scale accordingly
  async checkLoadAndScale() {
    try {
      // Get current load from monolith health endpoint
      const healthResponse = await axios.get(`${CONFIG.MONOLITH_URL}/api/health`, {
        timeout: 5000
      });
      
      const { redirector } = healthResponse.data;
      const currentLoad = redirector.load;
      const currentStatus = redirector.status;
      
      console.log(`📊 Current load: ${currentLoad}, Redirector status: ${currentStatus}`);
      
      // Reset consecutive errors on successful health check
      this.consecutiveErrors = 0;
      
      // Decision logic for scaling
      await this.makeScalingDecision(currentLoad, currentStatus);
      
    } catch (error) {
      this.consecutiveErrors++;
      console.error(`❌ Health check failed (${this.consecutiveErrors}/${this.maxConsecutiveErrors}):`, error.message);
      
      // Stop autopilot if too many consecutive errors
      if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
        console.error('🚨 Too many consecutive errors. Stopping autopilot.');
        this.stop();
      }
    }
  }

  // Make scaling decisions based on load and current status
  async makeScalingDecision(currentLoad, currentStatus) {
    const isMicroserviceRunning = this.microserviceProcess !== null;
    
    // SCALE UP: Load is high and microservice is not running
    if (currentLoad > CONFIG.LOAD_THRESHOLD && !isMicroserviceRunning) {
      console.log(`🔥 High load detected (${currentLoad} > ${CONFIG.LOAD_THRESHOLD})`);
      console.log('🚀 Scaling UP: Starting redirector microservice...');
      
      try {
        // Start the microservice
        await this.startMicroservice();
        
        // Wait a moment for microservice to start
        await this.sleep(2000);
        
        // Deactivate monolith redirector
        await this.setMonolithRedirectorStatus('inactive');
        
        console.log('✅ Scale UP completed successfully');
      } catch (error) {
        console.error('❌ Scale UP failed:', error.message);
      }
    }
    
    // SCALE DOWN: Load is low and microservice is running
    else if (currentLoad <= CONFIG.LOAD_THRESHOLD && isMicroserviceRunning) {
      console.log(`📉 Low load detected (${currentLoad} <= ${CONFIG.LOAD_THRESHOLD})`);
      console.log('📉 Scaling DOWN: Stopping redirector microservice...');
      
      try {
        // Reactivate monolith redirector first
        await this.setMonolithRedirectorStatus('active');
        
        // Wait a moment for monolith to take over
        await this.sleep(1000);
        
        // Stop the microservice
        this.stopMicroservice();
        
        console.log('✅ Scale DOWN completed successfully');
      } catch (error) {
        console.error('❌ Scale DOWN failed:', error.message);
      }
    }
    
    // NO ACTION NEEDED
    else {
      const action = isMicroserviceRunning ? 'microservice active' : 'monolith active';
      console.log(`✨ Load within acceptable range (${currentLoad}). ${action}`);
    }
  }

  // Start the redirector microservice
  async startMicroservice() {
    return new Promise((resolve, reject) => {
      console.log('🔄 Spawning redirector microservice process...');
      
      // Spawn the microservice process
      this.microserviceProcess = spawn('node', [CONFIG.MICROSERVICE_SCRIPT], {
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false
      });
      
      // Handle microservice output
      this.microserviceProcess.stdout.on('data', (data) => {
        console.log(`[Microservice] ${data.toString().trim()}`);
      });
      
      this.microserviceProcess.stderr.on('data', (data) => {
        console.error(`[Microservice Error] ${data.toString().trim()}`);
      });
      
      // Handle microservice exit
      this.microserviceProcess.on('exit', (code, signal) => {
        console.log(`🔄 Microservice exited with code ${code}, signal ${signal}`);
        this.microserviceProcess = null;
      });
      
      this.microserviceProcess.on('error', (error) => {
        console.error('❌ Failed to start microservice:', error.message);
        this.microserviceProcess = null;
        reject(error);
      });
      
      // Give the process a moment to start
      setTimeout(() => {
        if (this.microserviceProcess) {
          console.log('✅ Microservice process started successfully');
          resolve();
        } else {
          reject(new Error('Microservice failed to start'));
        }
      }, 1000);
    });
  }

  // Stop the redirector microservice
  stopMicroservice() {
    if (!this.microserviceProcess) {
      console.log('⚠️  No microservice process to stop');
      return;
    }
    
    console.log('🛑 Terminating microservice process...');
    
    try {
      // Send SIGTERM for graceful shutdown
      this.microserviceProcess.kill('SIGTERM');
      
      // Force kill after timeout if needed
      setTimeout(() => {
        if (this.microserviceProcess) {
          console.log('⚡ Force killing microservice process...');
          this.microserviceProcess.kill('SIGKILL');
        }
      }, 5000);
      
    } catch (error) {
      console.error('❌ Error stopping microservice:', error.message);
    }
    
    this.microserviceProcess = null;
    console.log('✅ Microservice stopped');
  }

  // Set the monolith redirector status (active/inactive)
  async setMonolithRedirectorStatus(status) {
    try {
      console.log(`🔧 Setting monolith redirector status to: ${status}`);
      
      const response = await axios.post(
        `${CONFIG.MONOLITH_URL}/api/internal/set-redirector-status`,
        { status },
        { timeout: 5000 }
      );
      
      console.log(`✅ Monolith redirector status updated: ${response.data.currentStatus}`);
    } catch (error) {
      console.error(`❌ Failed to set monolith redirector status:`, error.message);
      throw error;
    }
  }

  // Utility function for delays
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get current system status
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      microserviceRunning: this.microserviceProcess !== null,
      consecutiveErrors: this.consecutiveErrors,
      config: CONFIG
    };
  }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

// Create autopilot instance
const autopilot = new AutopilotSystem();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT. Shutting down autopilot...');
  autopilot.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM. Shutting down autopilot...');
  autopilot.stop();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught exception:', error);
  autopilot.stop();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled rejection at:', promise, 'reason:', reason);
  autopilot.stop();
  process.exit(1);
});

// Start the autopilot system
if (require.main === module) {
  console.log('🤖 Starting Morphlink Autopilot System...');
  console.log('📋 Waiting for monolith to be available...');
  
  // Wait a moment before starting to ensure monolith is ready
  setTimeout(() => {
    autopilot.start();
  }, 3000);
}

module.exports = AutopilotSystem;
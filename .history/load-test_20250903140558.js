const axios = require('axios');

// Configuration
const BACKEND_URL = 'http://localhost:3000';
const TEST_URLS = [
  'https://www.google.com',
  'https://www.github.com',
  'https://www.stackoverflow.com',
  'https://www.npmjs.com',
  'https://www.mozilla.org',
  'https://www.w3schools.com',
  'https://www.freecodecamp.org',
  'https://www.codecademy.com',
  'https://www.udemy.com',
  'https://www.coursera.org'
];

class LoadTester {
  constructor() {
    this.createdLinks = [];
    this.stats = {
      linksCreated: 0,
      redirectsPerformed: 0,
      errors: 0,
      startTime: null,
      endTime: null
    };
  }

  // Create multiple short links
  async createLinks(count = 10) {
    console.log(`\n🔗 Creating ${count} short links...`);
    
    for (let i = 0; i < count; i++) {
      try {
        const longUrl = TEST_URLS[i % TEST_URLS.length] + `?test=${Date.now()}-${i}`;
        const response = await axios.post(`${BACKEND_URL}/api/links`, {
          longUrl: longUrl
        });
        
        if (response.data.shortCode) {
          this.createdLinks.push({
            shortCode: response.data.shortCode,
            longUrl: longUrl,
            shortUrl: response.data.shortUrl
          });
          this.stats.linksCreated++;
          console.log(`✅ Created: ${response.data.shortUrl}`);
        }
      } catch (error) {
        this.stats.errors++;
        console.error(`❌ Error creating link ${i + 1}:`, error.message);
      }
      
      // Small delay between creations
      await this.delay(100);
    }
  }

  // Generate high load by accessing redirects rapidly
  async generateHighLoad(requestsPerMinute = 30, durationMinutes = 2) {
    if (this.createdLinks.length === 0) {
      console.log('❌ No links available for load testing. Creating some first...');
      await this.createLinks(5);
    }

    const totalRequests = requestsPerMinute * durationMinutes;
    const intervalMs = (60 * 1000) / requestsPerMinute; // Convert to milliseconds between requests
    
    console.log(`\n🚀 Starting load test:`);
    console.log(`   • Target: ${requestsPerMinute} requests/minute`);
    console.log(`   • Duration: ${durationMinutes} minutes`);
    console.log(`   • Total requests: ${totalRequests}`);
    console.log(`   • Interval: ${intervalMs}ms between requests`);
    console.log(`   • Threshold: 20 requests/minute (microservice should activate)\n`);

    this.stats.startTime = Date.now();
    
    for (let i = 0; i < totalRequests; i++) {
      const link = this.createdLinks[i % this.createdLinks.length];
      
      try {
        // Make request to redirect endpoint (this is what triggers load monitoring)
        const response = await axios.get(`${BACKEND_URL}/${link.shortCode}`, {
          maxRedirects: 0, // Don't follow redirects, just count the request
          validateStatus: (status) => status === 302 || status === 200
        });
        
        this.stats.redirectsPerformed++;
        
        // Log progress every 10 requests
        if ((i + 1) % 10 === 0) {
          const elapsed = (Date.now() - this.stats.startTime) / 1000;
          const currentRate = (this.stats.redirectsPerformed / elapsed) * 60;
          console.log(`📊 Progress: ${i + 1}/${totalRequests} requests | Rate: ${currentRate.toFixed(1)} req/min`);
        }
        
      } catch (error) {
        this.stats.errors++;
        if (error.response && error.response.status === 302) {
          // 302 is expected for redirects, count as success
          this.stats.redirectsPerformed++;
        } else {
          console.error(`❌ Request ${i + 1} failed:`, error.message);
        }
      }
      
      // Wait before next request
      if (i < totalRequests - 1) {
        await this.delay(intervalMs);
      }
    }
    
    this.stats.endTime = Date.now();
  }

  // Check system status
  async checkSystemStatus() {
    console.log('\n🔍 Checking system status...');
    
    try {
      // Check monolith health
      const monolithHealth = await axios.get(`${BACKEND_URL}/api/health`);
      console.log('📊 Monolith Status:', {
        status: monolithHealth.data.status,
        load: monolithHealth.data.load,
        redirectorActive: monolithHealth.data.redirectorActive,
        uptime: monolithHealth.data.uptime
      });
      
      // Try to check microservice (might not be running)
      try {
        const microserviceHealth = await axios.get('http://localhost:3001/health');
        console.log('🚀 Microservice Status:', {
          status: microserviceHealth.data.status,
          uptime: microserviceHealth.data.uptime
        });
      } catch (error) {
        console.log('🚀 Microservice Status: Not running (load below threshold)');
      }
      
    } catch (error) {
      console.error('❌ Error checking system status:', error.message);
    }
  }

  // Print final statistics
  printStats() {
    const duration = (this.stats.endTime - this.stats.startTime) / 1000;
    const avgRate = (this.stats.redirectsPerformed / duration) * 60;
    
    console.log('\n📈 Load Test Results:');
    console.log('=' .repeat(50));
    console.log(`Links Created: ${this.stats.linksCreated}`);
    console.log(`Redirects Performed: ${this.stats.redirectsPerformed}`);
    console.log(`Errors: ${this.stats.errors}`);
    console.log(`Duration: ${duration.toFixed(1)} seconds`);
    console.log(`Average Rate: ${avgRate.toFixed(1)} requests/minute`);
    console.log(`Threshold: 20 requests/minute`);
    console.log(`Microservice Expected: ${avgRate > 20 ? '✅ YES' : '❌ NO'}`);
  }

  // Utility function for delays
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Run complete test suite
  async runTest() {
    console.log('🧪 Morphlink Load Testing Suite');
    console.log('=' .repeat(50));
    
    try {
      // Step 1: Check initial system status
      await this.checkSystemStatus();
      
      // Step 2: Create test links
      await this.createLinks(8);
      
      // Step 3: Generate load that should trigger microservice
      console.log('\n⏳ Waiting 5 seconds before starting load test...');
      await this.delay(5000);
      
      await this.generateHighLoad(25, 1.5); // 25 req/min for 1.5 minutes
      
      // Step 4: Check system status after load
      console.log('\n⏳ Waiting 10 seconds for autopilot to react...');
      await this.delay(10000);
      
      await this.checkSystemStatus();
      
      // Step 5: Print results
      this.printStats();
      
      console.log('\n🎯 Test Instructions:');
      console.log('1. Watch the autopilot terminal for scaling messages');
      console.log('2. Check if microservice starts at http://localhost:3001');
      console.log('3. Monitor the monolith health endpoint for load changes');
      console.log('4. Observe redirector status changes in the system');
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  const tester = new LoadTester();
  tester.runTest().then(() => {
    console.log('\n✅ Load test completed!');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Load test failed:', error);
    process.exit(1);
  });
}

module.exports = LoadTester;
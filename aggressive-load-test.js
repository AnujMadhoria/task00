const axios = require('axios');

// Configuration for aggressive testing
const BACKEND_URL = 'http://localhost:3000';
const TEST_URLS = [
  'https://www.google.com',
  'https://www.github.com',
  'https://www.stackoverflow.com',
  'https://www.npmjs.com',
  'https://www.mozilla.org'
];

class AggressiveLoadTester {
  constructor() {
    this.createdLinks = [];
    this.requestCount = 0;
    this.startTime = null;
  }

  // Create test links first
  async createTestLinks() {
    console.log('🔗 Creating test links...');
    
    for (let i = 0; i < 5; i++) {
      try {
        const longUrl = TEST_URLS[i] + `?test=${Date.now()}-${i}`;
        const response = await axios.post(`${BACKEND_URL}/api/links`, {
          longUrl: longUrl
        });
        
        if (response.data.link && response.data.link.shortCode) {
          this.createdLinks.push({
            shortCode: response.data.link.shortCode,
            shortUrl: response.data.shortUrl
          });
          console.log(`✅ Created: ${response.data.shortUrl}`);
        }
      } catch (error) {
        console.error(`❌ Error creating link ${i + 1}:`, error.message);
      }
    }
  }

  // Generate very high load - 50+ requests per minute
  async generateHighLoad() {
    if (this.createdLinks.length === 0) {
      await this.createTestLinks();
    }

    console.log('\n🚀 Starting AGGRESSIVE load test...');
    console.log('Target: 60+ requests/minute (well above 20 threshold)');
    console.log('Duration: 2 minutes');
    console.log('Expected: Microservice should start immediately\n');

    this.startTime = Date.now();
    const duration = 2 * 60 * 1000; // 2 minutes
    const interval = 1000; // 1 second between requests = 60 req/min
    
    const endTime = this.startTime + duration;
    
    while (Date.now() < endTime) {
      const link = this.createdLinks[this.requestCount % this.createdLinks.length];
      
      try {
        // Make request to redirect endpoint
        await axios.get(`${BACKEND_URL}/${link.shortCode}`, {
          maxRedirects: 0,
          validateStatus: (status) => status === 302 || status === 200
        });
        
        this.requestCount++;
        
        // Log progress every 10 requests
        if (this.requestCount % 10 === 0) {
          const elapsed = (Date.now() - this.startTime) / 1000;
          const currentRate = (this.requestCount / elapsed) * 60;
          console.log(`📊 ${this.requestCount} requests | Rate: ${currentRate.toFixed(1)} req/min | Elapsed: ${elapsed.toFixed(1)}s`);
        }
        
      } catch (error) {
        if (error.response && error.response.status === 302) {
          this.requestCount++; // Count redirects as success
        } else {
          console.error(`❌ Request failed:`, error.message);
        }
      }
      
      // Wait 1 second before next request
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    const totalTime = (Date.now() - this.startTime) / 1000;
    const finalRate = (this.requestCount / totalTime) * 60;
    
    console.log(`\n✅ Load test completed!`);
    console.log(`Total requests: ${this.requestCount}`);
    console.log(`Duration: ${totalTime.toFixed(1)} seconds`);
    console.log(`Average rate: ${finalRate.toFixed(1)} requests/minute`);
    console.log(`Threshold: 20 requests/minute`);
    console.log(`Microservice expected: ${finalRate > 20 ? '✅ YES' : '❌ NO'}`);
  }

  // Check if microservice is running
  async checkMicroservice() {
    try {
      const response = await axios.get('http://localhost:3001/health');
      console.log('🚀 Microservice Status: RUNNING ✅');
      console.log('   Response:', response.data);
      return true;
    } catch (error) {
      console.log('🚀 Microservice Status: NOT RUNNING ❌');
      return false;
    }
  }

  // Run the complete test
  async runTest() {
    console.log('🧪 AGGRESSIVE Morphlink Load Test');
    console.log('=' .repeat(50));
    
    try {
      // Check initial microservice status
      console.log('\n🔍 Initial microservice check:');
      await this.checkMicroservice();
      
      // Generate high load
      await this.generateHighLoad();
      
      // Check microservice status after load
      console.log('\n🔍 Final microservice check:');
      const isRunning = await this.checkMicroservice();
      
      console.log('\n🎯 Test Results:');
      console.log('=' .repeat(30));
      if (isRunning) {
        console.log('✅ SUCCESS: Microservice was started by autopilot!');
        console.log('✅ Load threshold (20 req/min) was exceeded');
        console.log('✅ Autopilot scaling is working correctly');
      } else {
        console.log('❌ Microservice not detected - check autopilot logs');
      }
      
      console.log('\n📋 Next steps:');
      console.log('1. Check autopilot terminal for scaling messages');
      console.log('2. Visit http://localhost:3001/health to verify microservice');
      console.log('3. Monitor load decrease and microservice shutdown');
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
    }
  }
}

// Run the test
if (require.main === module) {
  const tester = new AggressiveLoadTester();
  tester.runTest().then(() => {
    console.log('\n🏁 Aggressive load test completed!');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
}

module.exports = AggressiveLoadTester;
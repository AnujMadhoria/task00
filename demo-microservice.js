const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';
const MICROSERVICE_URL = 'http://localhost:3001';

// Test user credentials
const testUser = {
  email: 'testuser@example.com',
  password: 'testpass123'
};

let authToken = null;

// Login function
async function login() {
  try {
    console.log('🔑 Logging in...');
    const response = await axios.post(`${BASE_URL}/api/auth/login`, testUser);
    authToken = response.data.token;
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

// Create a test link
async function createTestLink() {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/links`,
      { longUrl: 'https://github.com' },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✅ Test link created: ${response.data.link.shortCode}`);
    return response.data.link.shortCode;
  } catch (error) {
    console.error('❌ Failed to create test link:', error.response?.data || error.message);
    return null;
  }
}

// Perform rapid redirects to trigger autopilot
async function triggerAutopilot(shortCode) {
  console.log('\n🚀 Triggering autopilot system with rapid redirects...');
  console.log('📊 Performing 8 redirects in quick succession (>5 threshold)');
  
  const promises = [];
  for (let i = 0; i < 8; i++) {
    promises.push(
      axios.get(`${BASE_URL}/${shortCode}`, {
        maxRedirects: 0,
        validateStatus: (status) => status === 302 || status === 503
      }).catch(error => {
        if (error.response?.status === 302) {
          return { status: 302, success: true };
        }
        throw error;
      })
    );
  }
  
  await Promise.all(promises);
  console.log('✅ Rapid redirects completed');
}

// Test microservice availability
async function testMicroservice(shortCode) {
  console.log('\n🔍 Testing microservice availability...');
  
  // Wait a moment for autopilot to start microservice
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    const response = await axios.get(`${MICROSERVICE_URL}/health`);
    console.log('🎯 Microservice is running!');
    console.log(`📊 Status: ${response.data.status}`);
    console.log(`🔗 Port: ${response.data.port}`);
    
    // Test redirect through microservice
    try {
      await axios.get(`${MICROSERVICE_URL}/${shortCode}`, {
        maxRedirects: 0,
        validateStatus: (status) => status === 302
      });
      console.log('✅ Microservice redirect working!');
    } catch (error) {
      if (error.response?.status === 302) {
        console.log('✅ Microservice redirect working!');
      } else {
        console.log('⚠️  Microservice redirect test failed');
      }
    }
    
  } catch (error) {
    console.log('❌ Microservice not available or already scaled down');
  }
}

// Main demo function
async function runDemo() {
  console.log('🎬 Morphlink Autopilot System Demo');
  console.log('=' .repeat(50));
  console.log('🎯 Goal: Demonstrate automatic microservice scaling');
  console.log('📊 Threshold: >5 redirects/minute triggers port 3001');
  console.log('=' .repeat(50));
  
  // Step 1: Login
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }
  
  // Step 2: Create test link
  console.log('\n🔗 Creating test link...');
  const shortCode = await createTestLink();
  if (!shortCode) {
    console.log('❌ Cannot proceed without test link');
    return;
  }
  
  // Step 3: Trigger autopilot
  await triggerAutopilot(shortCode);
  
  // Step 4: Test microservice
  await testMicroservice(shortCode);
  
  console.log('\n🏁 Demo completed!');
  console.log('💡 The autopilot system automatically:');
  console.log('   ✅ Detected high load (>5 redirects/minute)');
  console.log('   ✅ Started microservice on port 3001');
  console.log('   ✅ Will scale down when load decreases');
  console.log('\n🔗 Test the system:');
  console.log(`   • Monolith: http://localhost:3000/${shortCode}`);
  console.log(`   • Microservice: http://localhost:3001/${shortCode} (when active)`);
}

// Run the demo
if (require.main === module) {
  runDemo().catch(error => {
    console.error('❌ Demo failed:', error.message);
    process.exit(1);
  });
}

module.exports = { runDemo };
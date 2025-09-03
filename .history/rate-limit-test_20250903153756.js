const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TARGET_LINKS = 15;
const TIME_WINDOW = 10000; // 10 seconds

// Test user credentials
const testUser = {
  email: 'testuser@example.com',
  password: 'testpass123'
};

// Sample URLs to shorten
const testUrls = [
  'https://www.google.com',
  'https://www.github.com',
  'https://www.stackoverflow.com',
  'https://www.youtube.com',
  'https://www.wikipedia.org',
  'https://www.reddit.com',
  'https://www.twitter.com',
  'https://www.facebook.com',
  'https://www.linkedin.com',
  'https://www.instagram.com',
  'https://www.amazon.com',
  'https://www.netflix.com',
  'https://www.spotify.com',
  'https://www.discord.com',
  'https://www.twitch.tv'
];

let authToken = null;

async function registerAndLogin() {
  try {
    console.log('🔐 Registering test user...');
    // Try to register (might fail if user exists)
    try {
      await axios.post(`${BASE_URL}/api/auth/signup`, testUser);
      console.log('✅ User registered successfully');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('ℹ️  User already exists, proceeding to login');
      } else {
        throw error;
      }
    }

    console.log('🔑 Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, testUser);
    authToken = loginResponse.data.token;
    console.log('✅ Login successful, token obtained');
    
    return true;
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data || error.message);
    return false;
  }
}

async function createLink(url, index) {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/links`,
      { url },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✅ Link ${index + 1}/15 created: ${response.data.shortCode}`);
    return { success: true, data: response.data };
  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.error || error.message;
    
    if (status === 429) {
      console.log(`⚠️  Rate limit hit on link ${index + 1}: ${message}`);
      console.log('🚀 Redirector microservice should be starting on port 3001...');
    } else {
      console.error(`❌ Failed to create link ${index + 1}: ${message}`);
    }
    
    return { success: false, error: message, status };
  }
}

async function runLoadTest() {
  console.log('🧪 Starting Rate Limit Load Test');
  console.log('=' .repeat(50));
  console.log(`📊 Target: ${TARGET_LINKS} links in ${TIME_WINDOW/1000} seconds`);
  console.log('=' .repeat(50));

  // Authenticate first
  const authSuccess = await registerAndLogin();
  if (!authSuccess) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }

  console.log('\n🚀 Starting link creation burst...');
  const startTime = Date.now();
  const results = [];
  
  // Create all links as fast as possible
  const promises = testUrls.slice(0, TARGET_LINKS).map((url, index) => {
    return createLink(url, index);
  });

  // Wait for all requests to complete
  const linkResults = await Promise.all(promises);
  const endTime = Date.now();
  const totalTime = endTime - startTime;

  // Analyze results
  const successful = linkResults.filter(r => r.success).length;
  const rateLimited = linkResults.filter(r => r.status === 429).length;
  const failed = linkResults.filter(r => !r.success && r.status !== 429).length;

  console.log('\n📈 Test Results:');
  console.log('=' .repeat(30));
  console.log(`⏱️  Total time: ${totalTime}ms`);
  console.log(`✅ Successful: ${successful}/${TARGET_LINKS}`);
  console.log(`⚠️  Rate limited: ${rateLimited}/${TARGET_LINKS}`);
  console.log(`❌ Other failures: ${failed}/${TARGET_LINKS}`);
  
  if (rateLimited > 0) {
    console.log('\n🎯 Rate limit triggered successfully!');
    console.log('🔄 Check if redirector microservice is running on port 3001');
    console.log('💡 You can test redirects at: http://localhost:3001/<shortCode>');
  } else {
    console.log('\n⚠️  Rate limit not reached. Consider:');
    console.log('   - Reducing rate limit threshold in index.js');
    console.log('   - Increasing number of test links');
  }

  console.log('\n🏁 Load test completed!');
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  process.exit(0);
});

// Run the test
if (require.main === module) {
  runLoadTest().catch(error => {
    console.error('💥 Test failed:', error.message);
    process.exit(1);
  });
}

module.exports = { runLoadTest };
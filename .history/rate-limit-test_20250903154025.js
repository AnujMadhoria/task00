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
    console.log('🔐 Attempting to register test user...');
    // Try to register (might fail if user exists)
    try {
      await axios.post(`${BASE_URL}/api/auth/signup`, testUser);
      console.log('✅ User registered successfully');
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.error?.includes('already exists')) {
        console.log('ℹ️  User already exists, proceeding to login');
      } else {
        console.log('ℹ️  Registration failed, trying login anyway...');
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
      { longUrl: url },
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✅ Link ${index + 1}/15 created: ${response.data.link.shortCode}`);
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

async function performRedirect(shortCode, index) {
  try {
    const response = await axios.get(`${BASE_URL}/${shortCode}`, {
      maxRedirects: 0,
      validateStatus: (status) => status === 302 || status === 503
    });
    
    if (response.status === 302) {
      console.log(`✅ Redirect ${index + 1}/15 successful: ${shortCode}`);
      return { success: true, redirected: true };
    } else if (response.status === 503) {
      console.log(`🚀 Microservice activated! Redirect ${index + 1} handled by port 3001`);
      return { success: true, microservice: true };
    }
    
    return { success: true };
  } catch (error) {
    if (error.response?.status === 302) {
      console.log(`✅ Redirect ${index + 1}/15 successful: ${shortCode}`);
      return { success: true, redirected: true };
    } else if (error.response?.status === 503) {
      console.log(`🚀 Microservice activated! Redirect ${index + 1} handled by port 3001`);
      return { success: true, microservice: true };
    }
    
    console.error(`❌ Redirect ${index + 1} failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runLoadTest() {
  console.log('🧪 Starting Autopilot Load Test');
  console.log('=' .repeat(50));
  console.log(`📊 Target: Create ${TARGET_LINKS} links, then perform rapid redirects`);
  console.log(`🎯 Goal: Trigger autopilot system (threshold: 5 redirects/minute)`);
  console.log('=' .repeat(50));

  // Authenticate first
  const authSuccess = await registerAndLogin();
  if (!authSuccess) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }

  console.log('\n🔗 Step 1: Creating links...');
  const startTime = Date.now();
  
  // Create all links first
  const promises = testUrls.slice(0, TARGET_LINKS).map((url, index) => {
    return createLink(url, index);
  });

  const linkResults = await Promise.all(promises);
  const successful = linkResults.filter(r => r.success);
  
  if (successful.length === 0) {
    console.log('❌ No links created successfully. Cannot proceed with redirect test.');
    return;
  }

  console.log(`✅ Created ${successful.length} links successfully`);
  
  // Wait a moment for autopilot to be ready
  console.log('\n⏳ Waiting 2 seconds for autopilot system...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('\n🚀 Step 2: Performing rapid redirects to trigger autopilot...');
  console.log('📊 Performing 10 redirects in quick succession (>5/min threshold)');
  
  // Perform rapid redirects to trigger the autopilot system
   const redirectPromises = [];
   for (let i = 0; i < 10; i++) {
     const linkData = successful[i % successful.length].data;
     if (linkData && linkData.link && linkData.link.shortCode) {
       redirectPromises.push(performRedirect(linkData.link.shortCode, i));
     }
   }

  const redirectResults = await Promise.all(redirectPromises);
  const endTime = Date.now();
  const totalTime = endTime - startTime;

  // Analyze results
  const successfulRedirects = redirectResults.filter(r => r.success).length;
  const microserviceActivated = redirectResults.some(r => r.microservice);

  console.log('\n📈 Test Results:');
  console.log('=' .repeat(30));
  console.log(`⏱️  Total time: ${totalTime}ms`);
  console.log(`🔗 Links created: ${successful.length}/${TARGET_LINKS}`);
  console.log(`🔄 Successful redirects: ${successfulRedirects}/10`);
  console.log(`🚀 Microservice activated: ${microserviceActivated ? '✅ YES' : '❌ NO'}`);
  
  if (microserviceActivated) {
    console.log('\n🎯 Autopilot system triggered successfully!');
    console.log('🔄 Redirector microservice is now running on port 3001');
    console.log('💡 You can test redirects at: http://localhost:3001/<shortCode>');
  } else {
    console.log('\n⚠️  Autopilot not triggered. This could mean:');
    console.log('   - Autopilot system is not running');
    console.log('   - Load threshold not reached (need >5 redirects/minute)');
    console.log('   - System is still processing the load');
    console.log('\n💡 Try checking http://localhost:3000/api/health for system status');
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
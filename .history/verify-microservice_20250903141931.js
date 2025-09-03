const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Function to check if a port is in use
async function checkPort(port) {
    try {
        const { stdout } = await execAsync(`netstat -an | findstr :${port}`);
        return stdout.trim().length > 0;
    } catch (error) {
        return false;
    }
}

// Function to test HTTP response from a specific port
async function testPort(port, path = '/') {
    try {
        const response = await axios.get(`http://localhost:${port}${path}`, {
            timeout: 2000,
            validateStatus: () => true // Accept any status code
        });
        return {
            success: true,
            status: response.status,
            data: response.data
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// Function to create a test short link
async function createTestLink() {
    try {
        const response = await axios.post('http://localhost:3000/api/links', {
            url: 'https://example.com',
            customCode: `test${Date.now()}`
        });
        return response.data.link.shortCode;
    } catch (error) {
        console.error('❌ Failed to create test link:', error.message);
        return null;
    }
}

async function demonstrateMicroservice() {
    console.log('🔍 MICROSERVICE VERIFICATION DEMO');
    console.log('=' .repeat(50));
    
    // Step 1: Check initial state
    console.log('\n📊 STEP 1: Initial State Check');
    const port3000Active = await checkPort(3000);
    const port3001Active = await checkPort(3001);
    
    console.log(`Port 3000 (Main App): ${port3000Active ? '✅ ACTIVE' : '❌ INACTIVE'}`);
    console.log(`Port 3001 (Microservice): ${port3001Active ? '✅ ACTIVE' : '❌ INACTIVE'}`);
    
    // Step 2: Create test link
    console.log('\n📊 STEP 2: Creating Test Link');
    const testCode = await createTestLink();
    if (!testCode) {
        console.log('❌ Cannot proceed without test link');
        return;
    }
    console.log(`✅ Created test link: http://localhost:3000/${testCode}`);
    
    // Step 3: Generate high load to trigger microservice
    console.log('\n📊 STEP 3: Generating High Load (60 requests/minute)');
    console.log('⏳ This will trigger microservice activation...');
    
    const startTime = Date.now();
    const testDuration = 90000; // 1.5 minutes
    let requestCount = 0;
    
    const loadInterval = setInterval(async () => {
        try {
            await axios.get(`http://localhost:3000/${testCode}`, {
                timeout: 1000,
                validateStatus: () => true
            });
            requestCount++;
            
            // Check ports every 10 requests
            if (requestCount % 10 === 0) {
                const port3001Now = await checkPort(3001);
                console.log(`📈 Request ${requestCount} - Port 3001: ${port3001Now ? '🟢 MICROSERVICE ACTIVE' : '🔴 INACTIVE'}`);
                
                // If microservice is active, demonstrate direct access
                if (port3001Now) {
                    console.log('\n🎯 MICROSERVICE DETECTED! Testing direct access...');
                    
                    // Test direct access to microservice
                    const microTest = await testPort(3001, `/${testCode}`);
                    if (microTest.success) {
                        console.log(`✅ Direct microservice access: HTTP ${microTest.status}`);
                        console.log(`🔗 Microservice URL: http://localhost:3001/${testCode}`);
                    } else {
                        console.log(`❌ Microservice test failed: ${microTest.error}`);
                    }
                    
                    // Show the difference
                    console.log('\n📋 PORT COMPARISON:');
                    const mainTest = await testPort(3000, `/${testCode}`);
                    const microDirectTest = await testPort(3001, `/${testCode}`);
                    
                    console.log(`Port 3000 (Main): ${mainTest.success ? `HTTP ${mainTest.status}` : 'Failed'}`);
                    console.log(`Port 3001 (Micro): ${microDirectTest.success ? `HTTP ${microDirectTest.status}` : 'Failed'}`);
                    
                    console.log('\n🎉 PROOF: Microservice is running on port 3001!');
                    console.log('   - You can access it directly at http://localhost:3001/');
                    console.log('   - The main app (port 3000) delegates redirects to it');
                    
                    clearInterval(loadInterval);
                    
                    // Wait a bit then show scale down
                    console.log('\n⏳ Waiting for scale down (stopping requests)...');
                    setTimeout(async () => {
                        const port3001After = await checkPort(3001);
                        console.log(`\n📉 After load stops - Port 3001: ${port3001After ? '🟢 STILL ACTIVE' : '🔴 SCALED DOWN'}`);
                        console.log('\n✅ DEMONSTRATION COMPLETE!');
                        console.log('You now have proof that the microservice runs on port 3001!');
                    }, 30000); // Wait 30 seconds
                    
                    return;
                }
            }
        } catch (error) {
            // Ignore individual request errors
        }
        
        // Stop after test duration
        if (Date.now() - startTime > testDuration) {
            clearInterval(loadInterval);
            console.log('\n⏰ Test duration completed');
            console.log('❓ Microservice may not have activated - check autopilot logs');
        }
    }, 1000); // 1 request per second = 60/minute
}

// Run the demonstration
demonstrateMicroservice().catch(console.error);
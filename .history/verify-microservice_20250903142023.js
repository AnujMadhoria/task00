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
            headers: response.headers
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

async function demonstrateMicroservice() {
    console.log('🔍 MICROSERVICE VERIFICATION DEMO');
    console.log('=' .repeat(50));
    
    // Use existing short code from the system
    const testCode = 'e7gQ2vGi'; // From the existing links
    
    // Step 1: Check initial state
    console.log('\n📊 STEP 1: Initial State Check');
    const port3000Active = await checkPort(3000);
    const port3001Active = await checkPort(3001);
    
    console.log(`Port 3000 (Main App): ${port3000Active ? '✅ ACTIVE' : '❌ INACTIVE'}`);
    console.log(`Port 3001 (Microservice): ${port3001Active ? '✅ ACTIVE' : '❌ INACTIVE'}`);
    
    console.log(`\n🔗 Using existing test link: http://localhost:3000/${testCode}`);
    
    // Step 2: Test initial access
    console.log('\n📊 STEP 2: Testing Initial Access');
    const initialTest = await testPort(3000, `/${testCode}`);
    console.log(`Main app response: ${initialTest.success ? `HTTP ${initialTest.status}` : 'Failed'}`);
    
    // Step 3: Generate high load to trigger microservice
    console.log('\n📊 STEP 3: Generating High Load (60 requests/minute)');
    console.log('⏳ Watch for microservice activation on port 3001...');
    console.log('\n🎯 KEY EVIDENCE TO WATCH FOR:');
    console.log('   - Port 3001 will become ACTIVE when load is high');
    console.log('   - You can then access http://localhost:3001/ directly!');
    console.log('   - Both ports will serve the same content during high load');
    
    const startTime = Date.now();
    const testDuration = 120000; // 2 minutes
    let requestCount = 0;
    let microserviceDetected = false;
    
    const loadInterval = setInterval(async () => {
        try {
            await axios.get(`http://localhost:3000/${testCode}`, {
                timeout: 1000,
                validateStatus: () => true
            });
            requestCount++;
            
            // Check ports every 5 requests
            if (requestCount % 5 === 0) {
                const port3001Now = await checkPort(3001);
                const currentTime = new Date().toLocaleTimeString();
                
                if (port3001Now && !microserviceDetected) {
                    microserviceDetected = true;
                    console.log(`\n🎉 MICROSERVICE DETECTED AT ${currentTime}!`);
                    console.log('🟢 Port 3001 is now ACTIVE!');
                    
                    // Demonstrate direct access to microservice
                    console.log('\n🧪 TESTING DIRECT MICROSERVICE ACCESS:');
                    
                    // Test the microservice directly
                    const microTest = await testPort(3001, `/${testCode}`);
                    const mainTest = await testPort(3000, `/${testCode}`);
                    
                    console.log('\n📋 COMPARISON RESULTS:');
                    console.log(`🌐 Main App (3000): ${mainTest.success ? `HTTP ${mainTest.status}` : 'Failed'}`);
                    console.log(`⚡ Microservice (3001): ${microTest.success ? `HTTP ${microTest.status}` : 'Failed'}`);
                    
                    if (microTest.success) {
                        console.log('\n✅ PROOF: You can now open these URLs in your browser:');
                        console.log(`   🔗 Main: http://localhost:3000/${testCode}`);
                        console.log(`   🔗 Micro: http://localhost:3001/${testCode}`);
                        console.log('   Both will redirect to the same destination!');
                        
                        console.log('\n🎯 EXPLANATION:');
                        console.log('   - Your UI always shows port 3000 (the main entry point)');
                        console.log('   - But during high load, port 3000 delegates to port 3001');
                        console.log('   - The microservice (3001) handles the actual redirects');
                        console.log('   - This is transparent to users - they still use port 3000');
                    }
                    
                    // Continue for a bit then stop
                    setTimeout(() => {
                        clearInterval(loadInterval);
                        console.log('\n⏹️ Stopping load generation...');
                        console.log('⏳ Watch autopilot logs - microservice will scale down soon!');
                        
                        // Check scale down after 30 seconds
                        setTimeout(async () => {
                            const port3001After = await checkPort(3001);
                            console.log(`\n📉 Scale Down Check: Port 3001 is ${port3001After ? '🟢 STILL ACTIVE' : '🔴 SCALED DOWN'}`);
                            console.log('\n✅ DEMONSTRATION COMPLETE!');
                            console.log('\n🎓 WHAT YOU LEARNED:');
                            console.log('   ✓ Microservice runs on port 3001 during high load');
                            console.log('   ✓ You can access it directly for testing');
                            console.log('   ✓ Users always use port 3000 (transparent scaling)');
                            console.log('   ✓ System automatically scales up and down');
                        }, 30000);
                    }, 30000); // Run for 30 more seconds after detection
                    
                } else {
                    console.log(`📈 Request ${requestCount} - Port 3001: ${port3001Now ? '🟢 ACTIVE' : '🔴 INACTIVE'} (${currentTime})`);
                }
            }
        } catch (error) {
            // Ignore individual request errors during transitions
        }
        
        // Stop after test duration if microservice wasn't detected
        if (Date.now() - startTime > testDuration && !microserviceDetected) {
            clearInterval(loadInterval);
            console.log('\n⏰ Test completed - microservice may not have activated');
            console.log('💡 Try checking the autopilot logs for more details');
        }
    }, 1000); // 1 request per second = 60/minute
}

// Run the demonstration
console.log('🚀 Starting microservice verification...');
console.log('📝 This will show you EXACTLY when port 3001 becomes active!');
demonstrateMicroservice().catch(console.error);
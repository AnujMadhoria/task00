# 🔗 Morphlink - Smart URL Shortener with Autopilot Scaling

Morphlink is an intelligent URL shortener that demonstrates microservice architecture with automatic scaling based on load. The system features an "autopilot" that monitors traffic and dynamically splits the redirector module from a monolith into a separate microservice when load exceeds a threshold.

## 🏗️ Architecture

### Backend Monolith (`index.js`)
Contains four distinct modules:
- **Auth Module**: User signup and login
- **Link Manager Module**: Create and retrieve short URLs
- **Redirector Module**: Handle URL redirects (can be disabled by autopilot)
- **Analytics Module**: Asynchronous click tracking

### Redirector Microservice (`redirector.microservice.js`)
Standalone service that handles only URL redirects when activated by the autopilot system.

### Autopilot System (`autopilot.js`)
Monitors load and automatically:
- Starts the microservice when load > 20 requests/minute
- Stops the microservice when load ≤ 20 requests/minute
- Manages the transition between monolith and microservice

### Frontend (`frontend/`)
React application built with Vite for creating and managing short URLs.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm

### Installation

1. **Clone and setup the project:**
   ```bash
   cd task001
   npm install
   ```

2. **Setup the frontend:**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

### Running the System

#### Option 1: Manual Setup (Recommended for Testing)

1. **Start the Backend Monolith:**
   ```bash
   npm start
   # or
   node index.js
   ```
   The monolith will run on `http://localhost:3000`

2. **Start the Frontend (in a new terminal):**
   ```bash
   cd frontend
   npm run dev
   ```
   The frontend will run on `http://localhost:5173`

3. **Start the Autopilot System (in a new terminal):**
   ```bash
   node autopilot.js
   ```

#### Option 2: Using npm Scripts

```bash
# Terminal 1: Backend
npm run dev

# Terminal 2: Frontend
npm run frontend

# Terminal 3: Autopilot
npm run autopilot
```

## 🎯 Testing the Autopilot System

### 1. Create Some Short URLs
- Open `http://localhost:5173` in your browser
- Create several short URLs using the form

### 2. Generate Load to Trigger Scaling
To test the autopilot scaling, you need to generate more than 20 requests per minute:

```bash
# Use curl to generate load (run this multiple times quickly)
for i in {1..25}; do curl -L http://localhost:3000/[your-short-code]; done
```

Replace `[your-short-code]` with an actual short code from your created URLs.

### 3. Monitor the Autopilot
Watch the autopilot terminal output. You should see:
- Load monitoring every 10 seconds
- "Scaling UP" message when load > 20
- Microservice starting on port 3001
- "Scaling DOWN" message when load drops

### 4. Verify Microservice Operation
When the microservice is active:
- Check `http://localhost:3001/health` for microservice status
- Your redirects will be handled by the microservice
- The monolith's redirector will be inactive

## 📊 API Endpoints

### Monolith (Port 3000)

#### Authentication
- `POST /api/auth/signup` - Create user account
- `POST /api/auth/login` - User login

#### Link Management
- `POST /api/links` - Create short URL
- `GET /api/links` - Get all links

#### Redirector
- `GET /:shortCode` - Redirect to original URL

#### Analytics & Monitoring
- `GET /api/analytics` - Get click analytics
- `GET /api/health` - System health and load info

#### Internal (Autopilot Control)
- `POST /api/internal/set-redirector-status` - Control redirector status

### Microservice (Port 3001)
- `GET /:shortCode` - Redirect to original URL
- `GET /health` - Microservice health check
- `GET /` - Service information

## 🔧 Configuration

### Autopilot Settings (in `autopilot.js`):
```javascript
const CONFIG = {
  LOAD_THRESHOLD: 20,        // Requests per minute to trigger scaling
  POLL_INTERVAL: 10000,      // Health check interval (10 seconds)
  MONOLITH_URL: 'http://localhost:3000',
  MICROSERVICE_URL: 'http://localhost:3001'
};
```

### Port Configuration:
- Monolith: `3000` (configurable via `PORT` env var)
- Microservice: `3001` (configurable via `REDIRECTOR_PORT` env var)
- Frontend: `5173` (Vite default)

## 🧪 Example Usage

### 1. Create a Short URL
```bash
curl -X POST http://localhost:3000/api/links \
  -H "Content-Type: application/json" \
  -d '{"longUrl": "https://github.com"}'
```

### 2. Use the Short URL
```bash
curl -L http://localhost:3000/abc12345
# Redirects to https://github.com
```

### 3. Check System Health
```bash
curl http://localhost:3000/api/health
# Returns: {"redirector": {"status": "integrated", "load": 5}}
```

### 4. Monitor Analytics
```bash
curl http://localhost:3000/api/analytics
# Returns click tracking data
```

## 🎨 Features

### ✅ Implemented Features
- ✅ Complete monolith with 4 modules (Auth, Link Manager, Redirector, Analytics)
- ✅ Standalone redirector microservice
- ✅ Intelligent autopilot system with load monitoring
- ✅ Automatic scaling up/down based on traffic
- ✅ Asynchronous analytics (non-blocking redirects)
- ✅ Modern React frontend with real-time updates
- ✅ Responsive design with clean UI
- ✅ In-memory database with shared state
- ✅ Health monitoring and observability
- ✅ Graceful shutdown handling

### 🔄 Autopilot Behavior
- **Low Load (≤20 req/min)**: Monolith handles all requests
- **High Load (>20 req/min)**: Microservice takes over redirects
- **Transition**: Seamless handoff between monolith and microservice
- **Monitoring**: Real-time load tracking with 1-minute windows

## 🛠️ Development

### Project Structure
```
task001/
├── index.js                 # Backend monolith
├── redirector.microservice.js # Redirector microservice
├── autopilot.js            # Autopilot scaling system
├── database.js             # Shared in-memory database
├── package.json            # Backend dependencies
├── README.md               # This file
└── frontend/               # React frontend
    ├── src/
    │   ├── App.jsx         # Main React component
    │   └── App.css         # Styling
    └── package.json        # Frontend dependencies
```

### Key Dependencies
- **Backend**: Express.js, nanoid, axios, cors
- **Frontend**: React, Vite

## 🚨 Troubleshooting

### Common Issues

1. **"Network error" in frontend**
   - Ensure the backend monolith is running on port 3000
   - Check CORS configuration

2. **Autopilot not scaling**
   - Verify load threshold is exceeded (>20 requests/minute)
   - Check autopilot terminal for error messages
   - Ensure monolith health endpoint is accessible

3. **Microservice won't start**
   - Check if port 3001 is available
   - Verify Node.js permissions
   - Look for error messages in autopilot output

4. **Redirects not working**
   - Verify short codes exist in the database
   - Check which service is handling redirects (monolith vs microservice)
   - Monitor autopilot status

### Debug Commands
```bash
# Check if services are running
curl http://localhost:3000/api/health
curl http://localhost:3001/health

# View all created links
curl http://localhost:3000/api/links

# Check analytics
curl http://localhost:3000/api/analytics
```

## 📈 Performance Notes

- **Load Tracking**: Resets every minute for accurate scaling decisions
- **Analytics**: Asynchronous to avoid blocking redirects
- **Scaling**: ~2-3 second transition time between monolith and microservice
- **Memory**: All data stored in-memory (resets on restart)

## 🎯 Next Steps

Potential enhancements:
- Persistent database (PostgreSQL, MongoDB)
- Authentication with JWT tokens
- Rate limiting and abuse protection
- Custom short code generation
- Advanced analytics dashboard
- Docker containerization
- Load balancer integration
- Horizontal scaling support

---

**Morphlink** - Demonstrating intelligent microservice architecture with automatic scaling! 🚀
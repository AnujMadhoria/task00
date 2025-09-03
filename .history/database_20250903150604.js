// Shared in-memory database for the Morphlink application
// This module provides centralized data storage for users, links, and analytics

class Database {
  constructor() {
    // In-memory storage arrays
    this.users = [];
    this.links = [];
    this.analytics = [];
    
    // Load tracking for autopilot system
    this.loadCounter = 0;
    this.loadResetInterval = null;
    
    // Initialize load counter reset (every minute)
    this.initLoadTracking();
  }

  // Initialize load tracking with 1-minute reset interval
  initLoadTracking() {
    this.loadResetInterval = setInterval(() => {
      this.loadCounter = 0;
    }, 60000); // Reset every 60 seconds
  }

  // User management methods
  addUser(user) {
    const newUser = {
      id: this.users.length + 1,
      email: user.email,
      password: user.password, // In production, this should be hashed
      createdAt: new Date().toISOString()
    };
    this.users.push(newUser);
    return newUser;
  }

  findUserByEmail(email) {
    return this.users.find(user => user.email === email);
  }

  // Link management methods
  addLink(link) {
    const newLink = {
      id: this.links.length + 1,
      shortCode: link.shortCode,
      longUrl: link.longUrl,
      userId: link.userId || null, // Associate with user
      createdAt: new Date().toISOString(),
      clicks: 0
    };
    this.links.push(newLink);
    return newLink;
  }

  findLinkByShortCode(shortCode) {
    return this.links.find(link => link.shortCode === shortCode);
  }

  getLinkByShortCode(shortCode) {
    return this.links.find(link => link.shortCode === shortCode);
  }

  getAllLinks() {
    return this.links;
  }

  getLinksByUserId(userId) {
    return this.links.filter(link => link.userId === userId);
  }

  deleteLink(shortCode) {
    const index = this.links.findIndex(link => link.shortCode === shortCode);
    if (index !== -1) {
      return this.links.splice(index, 1)[0];
    }
    return null;
  }

  // Analytics methods
  logClick(shortCode) {
    const clickEvent = {
      id: this.analytics.length + 1,
      shortCode,
      timestamp: new Date().toISOString(),
      userAgent: 'Unknown' // Could be enhanced with actual user agent
    };
    this.analytics.push(clickEvent);
    
    // Update click count for the link
    const link = this.findLinkByShortCode(shortCode);
    if (link) {
      link.clicks++;
    }
    
    return clickEvent;
  }

  getAnalytics() {
    return this.analytics;
  }

  // Load tracking methods for autopilot
  incrementLoad() {
    this.loadCounter++;
  }

  getCurrentLoad() {
    return this.loadCounter;
  }

  // Cleanup method
  cleanup() {
    if (this.loadResetInterval) {
      clearInterval(this.loadResetInterval);
    }
  }
}

// Create and export a singleton instance
const database = new Database();

module.exports = database;
import { useState, useEffect } from 'react'
import './App.css'
import Login from './components/Login'
import Register from './components/Register'

function App() {
  // Authentication state
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [authView, setAuthView] = useState('login') // 'login' or 'register'
  
  // App state
  const [longUrl, setLongUrl] = useState('')
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const API_BASE = 'http://localhost:3000'

  // Check for existing authentication on component mount
  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
    }
  }, [])
  
  // Fetch links when user is authenticated
  useEffect(() => {
    if (user && token) {
      fetchLinks()
    }
  }, [user, token])

  // Authentication functions
  const handleLogin = (userData, userToken) => {
    setUser(userData)
    setToken(userToken)
  }
  
  const handleRegister = (userData, userToken) => {
    setUser(userData)
    setToken(userToken)
  }
  
  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setToken(null)
    setLinks([])
  }

  // Fetch user's links (requires authentication)
  const fetchLinks = async () => {
    if (!token) return
    
    try {
      const response = await fetch(`${API_BASE}/api/links`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setLinks(data.links || [])
      } else if (response.status === 401) {
        // Token expired or invalid
        handleLogout()
      } else {
        console.error('Failed to fetch links')
      }
    } catch (error) {
      console.error('Error fetching links:', error)
    }
  }

  // Create a new short link (requires authentication)
  const createShortLink = async (e) => {
    e.preventDefault()
    
    if (!longUrl.trim()) {
      setError('Please enter a valid URL')
      return
    }

    if (!token) {
      setError('Please log in to create short links')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch(`${API_BASE}/api/links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ longUrl: longUrl.trim() })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`Short URL created: ${data.shortUrl}`)
        setLongUrl('')
        // Refresh the links list
        fetchLinks()
      } else if (response.status === 401) {
        // Token expired or invalid
        handleLogout()
        setError('Session expired. Please log in again.')
      } else {
        setError(data.error || 'Failed to create short URL')
      }
    } catch (error) {
      setError('Network error. Please check if the backend is running.')
      console.error('Error creating short link:', error)
    } finally {
      setLoading(false)
    }
  }

  // Delete a link
  const deleteLink = async (shortCode) => {
    if (!token) return
    
    try {
      const response = await fetch(`${API_BASE}/api/links/${shortCode}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        setMessage('Link deleted successfully')
        fetchLinks() // Refresh the list
        setTimeout(() => setMessage(''), 3000)
      } else if (response.status === 401) {
        handleLogout()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to delete link')
      }
    } catch (error) {
      setError('Network error. Please try again.')
      console.error('Error deleting link:', error)
    }
  }

  // Copy short URL to clipboard
  const copyToClipboard = async (shortUrl) => {
    try {
      await navigator.clipboard.writeText(shortUrl)
      setMessage('Short URL copied to clipboard!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🔗 Morphlink</h1>
        <p>Smart URL Shortener with Autopilot Scaling</p>
      </header>

      <main className="app-main">
        {/* URL Creation Form */}
        <section className="create-section">
          <h2>Create Short URL</h2>
          <form onSubmit={createShortLink} className="url-form">
            <div className="form-group">
              <input
                type="url"
                value={longUrl}
                onChange={(e) => setLongUrl(e.target.value)}
                placeholder="Enter your long URL here (e.g., https://example.com)"
                className="url-input"
                required
              />
              <button 
                type="submit" 
                disabled={loading}
                className="submit-btn"
              >
                {loading ? 'Creating...' : 'Shorten URL'}
              </button>
            </div>
          </form>

          {/* Messages */}
          {message && <div className="message success">{message}</div>}
          {error && <div className="message error">{error}</div>}
        </section>

        {/* Links List */}
        <section className="links-section">
          <h2>Your Short Links ({links.length})</h2>
          
          {links.length === 0 ? (
            <div className="empty-state">
              <p>No short links created yet. Create your first one above!</p>
            </div>
          ) : (
            <div className="links-grid">
              {links.map((link) => {
                const shortUrl = `${API_BASE}/${link.shortCode}`
                return (
                  <div key={link.id} className="link-card">
                    <div className="link-info">
                      <div className="short-url">
                        <strong>Short URL:</strong>
                        <a 
                          href={shortUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="short-link"
                        >
                          {shortUrl}
                        </a>
                        <button 
                          onClick={() => copyToClipboard(shortUrl)}
                          className="copy-btn"
                          title="Copy to clipboard"
                        >
                          📋
                        </button>
                      </div>
                      
                      <div className="long-url">
                        <strong>Original URL:</strong>
                        <a 
                          href={link.longUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="long-link"
                        >
                          {link.longUrl}
                        </a>
                      </div>
                      
                      <div className="link-meta">
                        <span className="clicks">👆 {link.clicks} clicks</span>
                        <span className="created">📅 {formatDate(link.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* System Status */}
        <section className="status-section">
          <h3>💡 System Info</h3>
          <div className="status-info">
            <p><strong>Backend:</strong> http://localhost:3000</p>
            <p><strong>Autopilot:</strong> Monitors load and scales automatically</p>
            <p><strong>Microservice:</strong> Starts at http://localhost:3001 when load &gt; 20</p>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App

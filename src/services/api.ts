import axios from 'axios';

// Create an Axios instance with a base URL
// In production, this should point to your deployed backend
const api = axios.create({
  baseURL: '/api', // This will be proxied to http://localhost:8000 by Vite
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor
api.interceptors.request.use(
  (config) => {
    // You could add authorization tokens here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor with mock data fallback
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.warn('API Error, using mock data:', error.message);
    
    // If backend is not running, we'll provide mock data
    const { config } = error;
    
    // Mock response for specific endpoints
    if (config?.url?.includes('/game-sessions/')) {
      return { 
        data: getMockGameSession(config.url)
      };
    }
    
    // Default error handling
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// Mock data function for game sessions
function getMockGameSession(url: string) {
  // Example mock game session data
  return {
    id: "sample_game_1",
    name: "Advanced Electricity Market Simulation 2025-2035",
    operator_id: "operator_1",
    current_year: 2025,
    start_year: 2025,
    end_year: 2035,
    state: "setup",
    carbon_price_per_ton: 50.0,
    created_at: new Date().toISOString()
  };
}

export default api;
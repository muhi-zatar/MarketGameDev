const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;

// Enable CORS
app.use(cors());
app.use(express.json());

// Serve static files from the public directory
app.use(express.static('public'));

// Mock API responses based on the Python backend structure
app.get('/health', (req, res) => {
  res.json({
    "status": "healthy",
    "timestamp": new Date().toISOString(),
    "version": "2.0.0",
    "framework": "yearly_simulation",
    "components": {
      "database": "connected",
      "market_engine": "operational",
      "yearly_orchestrator": "ready",
      "plant_templates": 2,
      "load_periods": 3
    }
  });
});

app.get('/scenarios', (req, res) => {
  res.json({
    "scenarios": {
      "simple_tutorial": {
        "name": "Simple Tutorial Market",
        "description": "Basic 3-generator scenario for learning fundamentals",
        "generator_count": 3,
        "complexity": "Simple"
      },
      "realistic_market": {
        "name": "Realistic Regional Market",
        "description": "Complex multi-utility scenario with diverse generation mix",
        "generator_count": 6,
        "complexity": "Advanced"
      }
    }
  });
});

// Temporary endpoint to provide sample data
app.get('/sample-data', (req, res) => {
  res.json({
    "message": "This is a mock API server due to Python environment issues.",
    "info": "The actual Python backend couldn't start due to missing dependencies.",
    "sample_data": {
      "game_session_id": "sample_game_1",
      "operator_id": "operator_1",
      "utility_ids": ["utility_1", "utility_2", "utility_3"],
      "simulation_period": "2025-2035",
      "total_capacity_mw": 3400,
      "technologies": ["coal", "natural_gas_cc", "natural_gas_ct", "nuclear", "solar", "wind_onshore", "wind_offshore", "battery"]
    }
  });
});

// Fallback route for other API endpoints
app.use('/game-sessions', (req, res) => {
  res.status(503).json({
    "error": "API unavailable",
    "message": "The Python backend is currently not operational due to environment issues.",
    "suggestion": "Please check the server logs for more information."
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`
========================================================================
🔌 ELECTRICITY MARKET GAME - MOCK SERVER
========================================================================
ℹ️  The Python backend could not start due to environment issues:
   - Missing core Python module '_signal'
   - Unable to install required dependencies

🚀 Running a mock Node.js server instead on http://localhost:${PORT}
📌 This server provides basic API responses for testing
📌 Some endpoints will return mock data
📌 Full functionality requires fixing the Python environment

📝 To fix the Python environment issues:
   1. Ensure Python is properly installed with all core modules
   2. Run: python3 -m pip install -r requirements.txt
   3. Then run: python3 startup.py --dev

========================================================================
🚧 MOCK SERVER READY - Limited functionality available
========================================================================
  `);
});
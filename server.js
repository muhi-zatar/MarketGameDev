const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 8000; // Using port 8000 to match the Python backend port

// Enable CORS
app.use(cors());
app.use(express.json());

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

// Users API endpoints
app.get('/users/:userId', (req, res) => {
  const userId = req.params.userId;
  const mockUsers = {
    'operator_1': {
      id: 'operator_1',
      username: 'instructor',
      user_type: 'operator',
      budget: 10000000000,
      debt: 0,
      equity: 10000000000,
      created_at: new Date().toISOString()
    },
    'utility_1': {
      id: 'utility_1',
      username: 'utility_1',
      user_type: 'utility',
      budget: 2000000000,
      debt: 0,
      equity: 2000000000,
      created_at: new Date().toISOString()
    },
    'utility_2': {
      id: 'utility_2',
      username: 'utility_2',
      user_type: 'utility',
      budget: 1500000000,
      debt: 0,
      equity: 1500000000,
      created_at: new Date().toISOString()
    },
    'utility_3': {
      id: 'utility_3',
      username: 'utility_3',
      user_type: 'utility',
      budget: 1800000000,
      debt: 0,
      equity: 1800000000,
      created_at: new Date().toISOString()
    }
  };

  const user = mockUsers[userId];
  if (user) {
    res.json(user);
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

app.post('/users', (req, res) => {
  const { username, user_type } = req.body;
  res.json({
    id: `${user_type}_${Date.now()}`,
    username,
    user_type,
    budget: user_type === 'operator' ? 10000000000 : 2000000000,
    debt: 0,
    equity: user_type === 'operator' ? 10000000000 : 2000000000,
    created_at: new Date().toISOString()
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

// Game sessions API
app.get('/game-sessions/:sessionId', (req, res) => {
  const sessionId = req.params.sessionId;
  if (sessionId === 'sample_game_1') {
    res.json({
      id: "sample_game_1",
      name: "Advanced Electricity Market Simulation 2025-2035",
      operator_id: "operator_1",
      current_year: 2025,
      start_year: 2025,
      end_year: 2035,
      state: "year_planning",
      carbon_price_per_ton: 50.0,
      created_at: new Date().toISOString()
    });
  } else {
    res.status(404).json({ error: 'Game session not found' });
  }
});

app.get('/game-sessions/:sessionId/dashboard', (req, res) => {
  res.json({
    "game_session": {
      "id": "sample_game_1",
      "name": "Advanced Electricity Market Simulation 2025-2035",
      "current_year": 2025,
      "start_year": 2025,
      "end_year": 2035,
      "state": "year_planning",
      "years_remaining": 10
    },
    "current_demand_mw": {
      "off_peak": 1200,
      "shoulder": 1800,
      "peak": 2400
    },
    "market_stats": {
      "total_plants": 9,
      "operating_plants": 6,
      "total_capacity_mw": 3400,
      "capacity_margin": 30
    },
    "participants": {
      "total_utilities": 3
    },
    "carbon_price": 50,
    "recent_results": []
  });
});

// Plants API
app.get('/game-sessions/:sessionId/plants', (req, res) => {
  const utilityId = req.query.utility_id;
  
  const allPlants = [
    {
      id: "plant_riverside_coal_plant",
      utility_id: "utility_1",
      name: "Riverside Coal Plant",
      plant_type: "coal",
      capacity_mw: 600,
      construction_start_year: 2020,
      commissioning_year: 2023,
      retirement_year: 2050,
      status: "operating",
      capital_cost_total: 2700000000,
      fixed_om_annual: 27000000,
      variable_om_per_mwh: 4.5,
      capacity_factor: 0.85,
      heat_rate: 8800,
      fuel_type: "coal"
    },
    {
      id: "plant_westside_gas_cc",
      utility_id: "utility_1",
      name: "Westside Gas CC",
      plant_type: "natural_gas_cc",
      capacity_mw: 400,
      construction_start_year: 2021,
      commissioning_year: 2024,
      retirement_year: 2049,
      status: "operating",
      capital_cost_total: 480000000,
      fixed_om_annual: 6000000,
      variable_om_per_mwh: 3.0,
      capacity_factor: 0.87,
      heat_rate: 6400,
      fuel_type: "natural_gas"
    },
    {
      id: "plant_coastal_nuclear",
      utility_id: "utility_2",
      name: "Coastal Nuclear",
      plant_type: "nuclear",
      capacity_mw: 1000,
      construction_start_year: 2018,
      commissioning_year: 2025,
      retirement_year: 2075,
      status: "operating",
      capital_cost_total: 8500000000,
      fixed_om_annual: 95000000,
      variable_om_per_mwh: 2.0,
      capacity_factor: 0.92,
      heat_rate: 10400,
      fuel_type: "uranium"
    },
    {
      id: "plant_solar_farm_alpha",
      utility_id: "utility_2",
      name: "Solar Farm Alpha",
      plant_type: "solar",
      capacity_mw: 250,
      construction_start_year: 2023,
      commissioning_year: 2025,
      retirement_year: 2045,
      status: "operating",
      capital_cost_total: 350000000,
      fixed_om_annual: 4500000,
      variable_om_per_mwh: 0.0,
      capacity_factor: 0.27,
      heat_rate: null,
      fuel_type: null
    }
  ];
  
  // Filter plants by utility if utility_id is provided
  const filteredPlants = utilityId 
    ? allPlants.filter(plant => plant.utility_id === utilityId) 
    : allPlants;
  
  res.json(filteredPlants);
});

// Mock API for plant templates
app.get('/plant-templates', (req, res) => {
  res.json([
    {
      "plant_type": "coal",
      "name": "Supercritical Coal",
      "overnight_cost_per_kw": 4500,
      "construction_time_years": 4,
      "economic_life_years": 40,
      "capacity_factor_base": 0.85,
      "heat_rate": 8800,
      "fuel_type": "coal",
      "fixed_om_per_kw_year": 45,
      "variable_om_per_mwh": 4.5,
      "co2_emissions_tons_per_mwh": 0.95
    },
    {
      "plant_type": "natural_gas_cc",
      "name": "Natural Gas Combined Cycle",
      "overnight_cost_per_kw": 1200,
      "construction_time_years": 3,
      "economic_life_years": 30,
      "capacity_factor_base": 0.87,
      "heat_rate": 6400,
      "fuel_type": "natural_gas",
      "fixed_om_per_kw_year": 15,
      "variable_om_per_mwh": 3.0,
      "co2_emissions_tons_per_mwh": 0.35
    },
    {
      "plant_type": "solar",
      "name": "Utility Scale Solar PV",
      "overnight_cost_per_kw": 1400,
      "construction_time_years": 2,
      "economic_life_years": 25,
      "capacity_factor_base": 0.27,
      "heat_rate": null,
      "fuel_type": null,
      "fixed_om_per_kw_year": 18,
      "variable_om_per_mwh": 0.0,
      "co2_emissions_tons_per_mwh": 0.0
    },
    {
      "plant_type": "wind_onshore",
      "name": "Onshore Wind",
      "overnight_cost_per_kw": 1650,
      "construction_time_years": 2,
      "economic_life_years": 25,
      "capacity_factor_base": 0.35,
      "heat_rate": null,
      "fuel_type": null,
      "fixed_om_per_kw_year": 28,
      "variable_om_per_mwh": 0.0,
      "co2_emissions_tons_per_mwh": 0.0
    }
  ]);
});

// Mocked Investment Analysis
app.get('/game-sessions/:sessionId/investment-analysis', (req, res) => {
  res.json({
    "utility_id": req.query.utility_id,
    "financial_position": {
      "available_budget": 1500000000,
      "current_debt": 500000000,
      "current_equity": 2000000000,
      "debt_to_equity_ratio": 0.25,
      "available_investment_capacity": 3500000000
    },
    "current_portfolio": {
      "total_capacity_mw": 1000,
      "total_capital_invested": 3000000000,
      "annual_fixed_costs": 33000000,
      "plant_count": 3,
      "technology_mix": {
        "coal": 600,
        "natural_gas_cc": 400
      }
    },
    "investment_opportunities": [
      {
        "plant_type": "solar",
        "name": "Utility Scale Solar PV",
        "overnight_cost_per_kw": 1400,
        "construction_time": 2,
        "economic_life": 25,
        "capacity_factor": 0.27,
        "emissions": 0,
        "example_100mw_analysis": {
          "total_capex": 140000000,
          "annual_revenue_estimate": 14189400,
          "annual_profit_estimate": 12389400,
          "simple_payback_years": 11.3
        }
      }
    ],
    "recommendations": [
      "Diversify technology portfolio to manage risk",
      "Consider renewable investments for long-term competitiveness",
      "Monitor debt levels to maintain financial flexibility",
      "Plan investments 3-5 years ahead due to construction lead times"
    ]
  });
});

// Mocked fuel prices
app.get('/game-sessions/:sessionId/fuel-prices/:year', (req, res) => {
  res.json({
    "year": parseInt(req.params.year),
    "fuel_prices": {
      "coal": 2.50,
      "natural_gas": 4.20,
      "uranium": 0.75
    },
    "units": "$/MMBtu"
  });
});

// Yearly bids
app.get('/game-sessions/:sessionId/bids', (req, res) => {
  res.json([]);
});

app.post('/game-sessions/:sessionId/bids', (req, res) => {
  const bidData = req.body;
  res.json({
    "id": `bid_${Date.now()}`,
    "utility_id": req.query.utility_id,
    "plant_id": bidData.plant_id,
    "year": bidData.year,
    "off_peak_quantity": bidData.off_peak_quantity,
    "shoulder_quantity": bidData.shoulder_quantity,
    "peak_quantity": bidData.peak_quantity,
    "off_peak_price": bidData.off_peak_price,
    "shoulder_price": bidData.shoulder_price,
    "peak_price": bidData.peak_price,
    "timestamp": new Date().toISOString()
  });
});

// Market results
app.get('/game-sessions/:sessionId/market-results', (req, res) => {
  res.json([]);
});

// Game flow endpoints
app.post('/game-sessions/:sessionId/start-year-planning/:year', (req, res) => {
  res.json({
    "status": "year_planning_started",
    "year": parseInt(req.params.year),
    "message": `Year ${req.params.year} planning phase is open`,
    "planning_period_ends": "Utilities can build new plants and plan operations",
    "demand_forecast": {
      "off_peak": 1200,
      "shoulder": 1800,
      "peak": 2400,
      "growth_rate": 0.02
    },
    "fuel_prices": {
      "coal": 2.50,
      "natural_gas": 4.20,
      "uranium": 0.75
    }
  });
});

app.post('/game-sessions/:sessionId/open-annual-bidding/:year', (req, res) => {
  res.json({
    "status": "annual_bidding_open",
    "year": parseInt(req.params.year),
    "message": `Submit bids for all load periods in ${req.params.year}`,
    "load_periods": {
      "off_peak": {"hours": 5000, "description": "Night and weekend hours"},
      "shoulder": {"hours": 2500, "description": "Daytime non-peak hours"},
      "peak": {"hours": 1260, "description": "Evening and high-demand hours"}
    },
    "available_plants": [],
    "bid_guidance": {}
  });
});

app.post('/game-sessions/:sessionId/clear-annual-markets/:year', (req, res) => {
  res.json({
    "status": "annual_markets_cleared",
    "year": parseInt(req.params.year),
    "results": {
      "off_peak": {
        "clearing_price": 45.80,
        "cleared_quantity": 1200,
        "total_energy": 6000000,
        "accepted_bids": 3
      },
      "shoulder": {
        "clearing_price": 55.20,
        "cleared_quantity": 1800,
        "total_energy": 4500000,
        "accepted_bids": 4
      },
      "peak": {
        "clearing_price": 89.50,
        "cleared_quantity": 2400,
        "total_energy": 3024000,
        "accepted_bids": 5
      }
    },
    "summary": {
      "total_market_revenue": 274640000,
      "average_price_weighted": 60.25,
      "capacity_utilization": 0.45,
      "renewable_penetration": 0.15
    }
  });
});

app.post('/game-sessions/:sessionId/complete-year/:year', (req, res) => {
  res.json({
    "status": "year_completed",
    "year": parseInt(req.params.year),
    "message": `Year ${req.params.year} completed. Preparing for ${parseInt(req.params.year) + 1}`,
    "next_year_preview": {
      "year": parseInt(req.params.year) + 1,
      "expected_demand_growth": "2% annual growth continues",
      "fuel_price_outlook": "Stable with some volatility"
    }
  });
});

// Multi-year analysis
app.get('/game-sessions/:sessionId/multi-year-analysis', (req, res) => {
  res.json({
    "yearly_data": {},
    "trends": {},
    "market_events": [],
    "analysis_period": "N/A - No historical data yet"
  });
});

// Create power plant
app.post('/game-sessions/:sessionId/plants', (req, res) => {
  const plant = req.body;
  res.json({
    "id": `plant_${Date.now()}`,
    "utility_id": req.query.utility_id,
    "game_session_id": req.params.sessionId,
    "name": plant.name,
    "plant_type": plant.plant_type,
    "capacity_mw": plant.capacity_mw,
    "construction_start_year": plant.construction_start_year,
    "commissioning_year": plant.commissioning_year,
    "retirement_year": plant.retirement_year,
    "status": "planned",
    "capital_cost_total": plant.capacity_mw * 1000 * (plant.plant_type === "coal" ? 4500 : 1400),
    "fixed_om_annual": plant.capacity_mw * 1000 * (plant.plant_type === "coal" ? 45 : 18),
    "variable_om_per_mwh": plant.plant_type === "coal" ? 4.5 : 0.0,
    "capacity_factor": plant.plant_type === "coal" ? 0.85 : 0.27,
    "heat_rate": plant.plant_type === "coal" ? 8800 : null,
    "fuel_type": plant.plant_type === "coal" ? "coal" : null
  });
});

// Plant economics
app.get('/game-sessions/:sessionId/plants/:plantId/economics', (req, res) => {
  res.json({
    "plant_id": req.params.plantId,
    "year": req.query.year || 2025,
    "marginal_cost_per_mwh": 45.8,
    "annual_fixed_costs": 27000000,
    "annual_variable_costs": 13500000,
    "annual_total_costs": 40500000,
    "annual_generation_mwh": 3000000,
    "capacity_factor": 0.85,
    "fuel_costs": 2.5
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`
========================================================================
🔌 ELECTRICITY MARKET GAME - MOCK SERVER
========================================================================
ℹ️  The Python backend could not start due to environment issues, so
   we're running a mock Node.js server instead.

🚀 Mock API server running at http://localhost:${PORT}

📌 This server provides basic API responses for testing
📌 Some endpoints will return mock data
📌 To run the frontend with this mock server:
   - In another terminal, run: npm run dev

📝 To fix the Python environment issues later:
   1. Ensure Python is properly installed with all core modules
   2. Run: python3 -m pip install -r requirements.txt
   3. Then run: python3 startup.py --dev

========================================================================
🚧 MOCK SERVER READY - Limited functionality available
========================================================================
  `);
});
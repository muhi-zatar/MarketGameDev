# Electricity Market Game Simulation

This project is a simulation of electricity markets, designed to provide an educational tool for understanding market dynamics, bidding strategies, and power plant economics.

## 🚨 Current Status: Mock Server Mode

Due to Python environment issues in the current container, the application is running in a limited mock server mode using Node.js.

### Environment Issues:

- Missing core Python module `_signal`
- Unable to install required Python dependencies (uvicorn, fastapi, etc.)

### Current Functionality:

- Basic API endpoints available through a Node.js Express server
- Mock data for some endpoints
- Limited functionality compared to the full Python backend

## 🔧 Running the Application

```bash
# Install Node.js dependencies
npm install

# Start the mock server
npm start
```

## 📝 Fixing the Python Backend

To run the full Python backend with all features:

1. Ensure you have a complete Python environment with all core modules
2. Install the required dependencies:
   ```bash
   python3 -m pip install -r requirements.txt
   ```
3. Start the Python backend:
   ```bash
   python3 startup.py --dev
   ```

## 🌟 Features (When Python Backend is Running)

- Multi-year electricity market simulation (2025-2035)
- Power plant investment and economics
- Market bidding by load periods
- Long-term capacity planning
- Fuel price volatility and carbon pricing
- Realistic financial modeling
- Technology mix optimization
- Weather events and market shocks

## 📊 API Endpoints

The mock server provides limited endpoints. For full functionality, the Python backend is required.

Available in mock mode:
- `/health` - System health check
- `/scenarios` - Available game scenarios
- `/sample-data` - Sample mock data

## 📚 Documentation

For more detailed documentation on the full Python backend functionality, please refer to the API documentation available at `/docs` when running the Python server.
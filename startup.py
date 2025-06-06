#!/usr/bin/env python3
"""
Electricity Market Game Backend - Main Startup Script
Run this to start the complete backend server with all components
"""

import uvicorn
import sys
import os
import json
from pathlib import Path
from datetime import datetime

# Add the current directory to Python path
sys.path.append(str(Path(__file__).parent))

# Configuration for different game scenarios
GAME_SCENARIOS = {
    "simple_tutorial": {
        "name": "Simple Tutorial Market",
        "description": "Basic 3-generator scenario for learning fundamentals",
        "generators": [
            {
                "name": "Base Coal Plant",
                "max_capacity": 400,
                "min_capacity": 200,
                "marginal_cost": 45.0,
                "startup_cost": 8000
            },
            {
                "name": "Natural Gas Peaker",
                "max_capacity": 200,
                "min_capacity": 0,
                "marginal_cost": 85.0,
                "startup_cost": 2000
            },
            {
                "name": "Wind Farm",
                "max_capacity": 150,
                "min_capacity": 0,
                "marginal_cost": 0.0,
                "startup_cost": 0
            }
        ],
        "demand_multiplier": 0.6
    },
    
    "realistic_market": {
        "name": "Realistic Regional Market",
        "description": "Complex multi-utility scenario with diverse generation mix",
        "generators": [
            {
                "name": "Nuclear Base Load",
                "max_capacity": 800,
                "min_capacity": 600,
                "marginal_cost": 25.0,
                "startup_cost": 50000
            },
            {
                "name": "Coal Plant",
                "max_capacity": 500,
                "min_capacity": 250,
                "marginal_cost": 45.0,
                "startup_cost": 15000
            },
            {
                "name": "Combined Cycle Gas",
                "max_capacity": 400,
                "min_capacity": 200,
                "marginal_cost": 65.0,
                "startup_cost": 8000
            },
            {
                "name": "Gas Peaker",
                "max_capacity": 200,
                "min_capacity": 0,
                "marginal_cost": 95.0,
                "startup_cost": 1000
            },
            {
                "name": "Solar Farm",
                "max_capacity": 300,
                "min_capacity": 0,
                "marginal_cost": 0.0,
                "startup_cost": 0
            },
            {
                "name": "Wind Farm",
                "max_capacity": 250,
                "min_capacity": 0,
                "marginal_cost": 0.0,
                "startup_cost": 0
            }
        ],
        "demand_multiplier": 1.0
    }
}

def create_scenario_game(scenario_name: str, operator_id: str):
    """Helper function to create a game with a predefined scenario"""
    if scenario_name not in GAME_SCENARIOS:
        raise ValueError(f"Unknown scenario: {scenario_name}")
    
    scenario = GAME_SCENARIOS[scenario_name]
    
    game_data = {
        "name": scenario["name"],
        "operator_id": operator_id,
        "description": scenario["description"],
        "scenario_type": scenario_name,
        "suggested_generators": scenario["generators"],
        "demand_multiplier": scenario.get("demand_multiplier", 1.0)
    }
    
    return game_data

def create_sample_data():
    """Create sample users and game session for testing"""
    from market_game_api import DBUser, DBGameSession, DBPowerPlant, SessionLocal, PlantTypeEnum, PlantStatusEnum
    import uuid
    
    db = SessionLocal()
    
    try:
        # Check if sample data already exists
        existing_operator = db.query(DBUser).filter(DBUser.id == "operator_1").first()
        if existing_operator:
            print("ℹ️  Sample data already exists")
            return {
                "game_session_id": "sample_game_1",
                "operator_id": "operator_1",
                "utility_ids": ["utility_1", "utility_2", "utility_3"]
            }
        
        # Create sample operator
        operator = DBUser(
            id="operator_1",
            username="instructor",
            user_type="operator",
            budget=10000000000,  # $10B for operator
            equity=10000000000
        )
        db.add(operator)
        
        # Create sample utilities with realistic budgets
        utility_budgets = [2000000000, 1500000000, 1800000000]  # $2B, $1.5B, $1.8B
        for i in range(1, 4):
            utility = DBUser(
                id=f"utility_{i}",
                username=f"utility_{i}",
                user_type="utility",
                budget=utility_budgets[i-1],
                equity=utility_budgets[i-1]
            )
            db.add(utility)
        
        db.commit()
        print("✅ Sample users created with realistic budgets")
        
        # Create sample game session for 10-year simulation
        from electricity_market_backend import AnnualDemandProfile, DEFAULT_FUEL_PRICES
        
        demand_profile = AnnualDemandProfile(year=2025)
        
        game_session = DBGameSession(
            id="sample_game_1",
            name="Advanced Electricity Market Simulation 2025-2035",
            operator_id="operator_1",
            start_year=2025,
            end_year=2035,
            current_year=2025,
            carbon_price_per_ton=50.0,
            demand_profile=json.dumps({
                "off_peak_hours": demand_profile.off_peak_hours,
                "shoulder_hours": demand_profile.shoulder_hours,
                "peak_hours": demand_profile.peak_hours,
                "off_peak_demand": demand_profile.off_peak_demand,
                "shoulder_demand": demand_profile.shoulder_demand,
                "peak_demand": demand_profile.peak_demand,
                "demand_growth_rate": demand_profile.demand_growth_rate
            }),
            fuel_prices=json.dumps(DEFAULT_FUEL_PRICES)
        )
        db.add(game_session)
        db.commit()
        print("✅ Sample game session created (2025-2035)")
        
        # Create diverse sample power plants
        from electricity_market_backend import PLANT_TEMPLATES, PlantType
        
        sample_plants = [
            # Utility 1: Traditional utility with coal and gas
            ("utility_1", "Riverside Coal Plant", PlantType.COAL, 600, 2020, 2023, 2050),
            ("utility_1", "Westside Gas CC", PlantType.NATURAL_GAS_CC, 400, 2021, 2024, 2049),
            ("utility_1", "Peak Gas CT", PlantType.NATURAL_GAS_CT, 150, 2022, 2025, 2045),
            
            # Utility 2: Mixed portfolio with nuclear and renewables
            ("utility_2", "Coastal Nuclear", PlantType.NUCLEAR, 1000, 2018, 2025, 2075),
            ("utility_2", "Solar Farm Alpha", PlantType.SOLAR, 250, 2023, 2025, 2045),
            ("utility_2", "Wind Farm Beta", PlantType.WIND_ONSHORE, 200, 2023, 2025, 2045),
            
            # Utility 3: Renewable-focused with storage
            ("utility_3", "Mega Solar Project", PlantType.SOLAR, 400, 2024, 2026, 2046),
            ("utility_3", "Offshore Wind", PlantType.WIND_OFFSHORE, 300, 2024, 2027, 2047),
            ("utility_3", "Grid Battery Storage", PlantType.BATTERY, 100, 2025, 2026, 2036),
        ]
        
        for utility_id, name, plant_type, capacity, start_year, commission_year, retire_year in sample_plants:
            template = PLANT_TEMPLATES[plant_type]
            capacity_kw = capacity * 1000
            
            # Determine status based on commissioning year
            if commission_year <= 2025:
                status = PlantStatusEnum.operating
            else:
                status = PlantStatusEnum.under_construction
            
            plant = DBPowerPlant(
                id=f"plant_{name.replace(' ', '_').lower()}",
                utility_id=utility_id,
                game_session_id="sample_game_1",
                name=name,
                plant_type=PlantTypeEnum(plant_type.value),
                capacity_mw=capacity,
                construction_start_year=start_year,
                commissioning_year=commission_year,
                retirement_year=retire_year,
                status=status,
                capital_cost_total=capacity_kw * template.overnight_cost_per_kw,
                fixed_om_annual=capacity_kw * template.fixed_om_per_kw_year,
                variable_om_per_mwh=template.variable_om_per_mwh,
                capacity_factor=template.capacity_factor_base,
                heat_rate=template.heat_rate,
                fuel_type=template.fuel_type,
                min_generation_mw=capacity * template.min_generation_pct,
                maintenance_years=json.dumps([])
            )
            db.add(plant)
        
        db.commit()
        print("✅ Sample power plants created with diverse technology mix")
        
        # Update utility budgets to reflect existing investments
        utilities = db.query(DBUser).filter(DBUser.user_type == "utility").all()
        for utility in utilities:
            # Calculate total existing investments
            plants = db.query(DBPowerPlant).filter(
                DBPowerPlant.utility_id == utility.id,
                DBPowerPlant.game_session_id == "sample_game_1"
            ).all()
            
            total_invested = sum(plant.capital_cost_total for plant in plants)
            
            # Update financial position (70% debt, 30% equity financing)
            utility.debt = total_invested * 0.7
            utility.budget = utility.budget - (total_invested * 0.3)
            utility.equity = utility.equity - (total_invested * 0.3)
        
        db.commit()
        print("✅ Utility finances updated to reflect existing investments")
        
        return {
            "game_session_id": "sample_game_1",
            "operator_id": "operator_1",
            "utility_ids": ["utility_1", "utility_2", "utility_3"],
            "simulation_period": "2025-2035",
            "total_capacity_mw": sum(plant[3] for plant in sample_plants),
            "technologies": list(set(plant[2].value for plant in sample_plants))
        }
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating sample data: {e}")
        import traceback
        traceback.print_exc()
        return None
    finally:
        db.close()

def create_app():
    """Create and configure the FastAPI application"""
    from market_game_api import app, SessionLocal, Base, engine
    from game_orchestrator import YearlyGameOrchestrator, add_orchestration_endpoints
    from fastapi import HTTPException
    
    # Setup database
    print("Setting up database...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully")
    
    # Initialize yearly game orchestrator
    print("Initializing yearly game orchestrator...")
    orchestrator = YearlyGameOrchestrator(SessionLocal())
    add_orchestration_endpoints(app, orchestrator)
    print("✅ Yearly game orchestrator initialized and endpoints added")
    
    # Add utility endpoints
    @app.post("/scenarios/{scenario_name}/create-game")
    def create_scenario_game_endpoint(scenario_name: str, operator_id: str):
        """Create a new game with a predefined scenario"""
        try:
            game_data = create_scenario_game(scenario_name, operator_id)
            return {
                "status": "success",
                "message": f"Game template created for scenario: {scenario_name}",
                "game_data": game_data
            }
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    
    @app.get("/scenarios")
    def list_scenarios():
        """List all available game scenarios"""
        return {
            "scenarios": {
                name: {
                    "name": scenario["name"],
                    "description": scenario["description"],
                    "generator_count": len(scenario["generators"]),
                    "complexity": "Simple" if scenario.get("demand_multiplier", 1.0) < 0.8 else "Advanced"
                }
                for name, scenario in GAME_SCENARIOS.items()
            }
        }
    
    @app.post("/sample-data/create")
    def create_sample_data_endpoint():
        """Create sample data for testing and demonstration"""
        result = create_sample_data()
        if result:
            return {
                "status": "success",
                "message": "Sample data created successfully",
                "data": result
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create sample data")
    
    @app.get("/health")
    def health_check():
        """Health check endpoint"""
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "version": "2.0.0",
            "framework": "yearly_simulation",
            "components": {
                "database": "connected",
                "market_engine": "operational",
                "yearly_orchestrator": "ready",
                "plant_templates": len(GAME_SCENARIOS),
                "load_periods": 3
            }
        }
    
    print("✅ Utility endpoints added")
    return app

# Create the app at module level for uvicorn
app = create_app()

def print_startup_info():
    """Print helpful startup information"""
    print("\n" + "="*70)
    print("🔌 ADVANCED ELECTRICITY MARKET GAME BACKEND v2.0")
    print("   Multi-Year Capacity Planning & Investment Simulation")
    print("="*70)
    print("🚀 Server starting on: http://localhost:8000")
    print("📚 API Documentation: http://localhost:8000/docs")
    print("🔄 Alternative docs: http://localhost:8000/redoc")
    print("\n📋 KEY FEATURES:")
    print("="*70)
    print("🎯 YEARLY SIMULATION FRAMEWORK:")
    print("   • 10-year market simulation (2025-2035)")
    print("   • 3 load periods: Off-Peak (5000h), Shoulder (2500h), Peak (1260h)")
    print("   • Annual bidding by load period (not hourly!)")
    print("   • Long-term capacity planning and investment decisions")
    
    print("\n🏭 POWER PLANT ECONOMICS:")
    print("   • 10 realistic plant types with authentic costs")
    print("   • Capital costs, O&M costs, fuel costs, carbon costs")
    print("   • Construction lead times (1-7 years)")
    print("   • Plant maintenance schedules and retirements")
    print("   • Technology-specific capacity factors")
    
    print("\n💰 FINANCIAL MODELING:")
    print("   • Utility budgets and debt/equity financing")
    print("   • Multi-billion dollar investment decisions")
    print("   • ROI analysis and payback calculations")
    print("   • Credit ratings and financial constraints")
    
    print("\n⚡ MARKET DYNAMICS:")
    print("   • Fuel price volatility (coal, natural gas, uranium)")
    print("   • Carbon pricing ($50/ton CO2)")
    print("   • Weather events affecting renewables")
    print("   • Plant outages and market shocks")
    print("   • Merit order dispatch and marginal pricing")
    
    print("\n📊 AVAILABLE ENDPOINTS:")
    print("="*70)
    
    endpoints = [
        ("User & Session Management", [
            "POST /users - Create operator/utility users",
            "GET /users/{id}/financial-summary - Get utility finances",
            "POST /game-sessions - Create 10-year simulation",
            "GET /game-sessions/{id}/dashboard - Market overview"
        ]),
        ("Plant Templates & Investment", [
            "GET /plant-templates - View all plant types & costs",
            "GET /plant-templates/{type} - Detailed plant economics",
            "POST /game-sessions/{id}/plants - Invest in new capacity",
            "GET /game-sessions/{id}/plants/{id}/economics - Plant analysis"
        ]),
        ("Yearly Game Flow", [
            "POST /game-sessions/{id}/start-year-planning/{year} - Begin year",
            "POST /game-sessions/{id}/open-annual-bidding/{year} - Open bidding",
            "POST /game-sessions/{id}/bids - Submit yearly bids",
            "POST /game-sessions/{id}/clear-annual-markets/{year} - Clear markets",
            "POST /game-sessions/{id}/complete-year/{year} - Finish year"
        ]),
        ("Analysis & Intelligence", [
            "GET /game-sessions/{id}/yearly-summary/{year} - Year results",
            "GET /game-sessions/{id}/multi-year-analysis - Trend analysis",
            "GET /game-sessions/{id}/investment-analysis - Investment opportunities",
            "POST /game-sessions/{id}/simulate-investment - ROI calculator",
            "GET /game-sessions/{id}/fuel-prices/{year} - Fuel market data"
        ]),
        ("Utilities", [
            "GET /health - System health check",
            "GET /scenarios - Available game scenarios",
            "POST /sample-data/create - Create demo data"
        ])
    ]
    
    for category, endpoint_list in endpoints:
        print(f"\n📂 {category}:")
        for endpoint in endpoint_list:
            print(f"   • {endpoint}")
    
    print("\n" + "="*70)
    print("🎮 YEARLY GAME FLOW:")
    print("="*70)
    print("1️⃣  SETUP: Create users and 10-year game session")
    print("2️⃣  PLANNING: Each year, utilities can build new plants")
    print("3️⃣  BIDDING: Submit bids for 3 load periods (not 8760 hours!)")
    print("4️⃣  CLEARING: Markets clear, prices set by merit order")
    print("5️⃣  OPERATIONS: Calculate revenues, costs, profits")
    print("6️⃣  ANALYSIS: Review performance, plan next year")
    print("7️⃣  INVESTMENT: Build plants for future years")
    print("8️⃣  REPEAT: Continue for 10-year simulation")
    print("9️⃣  FINALE: Compare utility performance and strategies")
    
    print("\n💡 EDUCATIONAL FOCUS:")
    print("="*70)
    print("✅ Long-term capacity planning (not day-to-day operations)")
    print("✅ Investment decisions under uncertainty") 
    print("✅ Technology portfolio optimization")
    print("✅ Financial risk management")
    print("✅ Market fundamentals and price formation")
    print("✅ Renewable energy integration strategies")
    print("✅ Carbon pricing and environmental policy")
    print("✅ Realistic utility business model")
    
    print("\n🌟 WHAT'S NEW IN v2.0:")
    print("="*70)
    print("🔄 Yearly simulation instead of hourly")
    print("🏗️  Multi-year plant construction timelines")
    print("💸 Realistic capital costs and financing")
    print("⛽ Dynamic fuel pricing and volatility") 
    print("🌡️  Weather events and market shocks")
    print("📈 Investment analysis and ROI calculations")
    print("🔋 Battery storage and renewable integration")
    print("💰 Multi-billion dollar utility budgets")
    
    print("\n✨ Ready for advanced electricity market education!")
    print("="*70)

def main():
    """Enhanced main function with development options"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Advanced Electricity Market Game Backend v2.0')
    parser.add_argument('--dev', action='store_true', help='Run in development mode with sample data')
    parser.add_argument('--port', type=int, default=8000, help='Port to run the server on')
    parser.add_argument('--host', default='127.0.0.1', help='Host to bind the server to')
    
    args = parser.parse_args()
    
    try:
        # Development mode setup
        if args.dev:
            print("🔧 DEVELOPMENT MODE - YEARLY SIMULATION")
            print("Creating comprehensive sample data...")
            result = create_sample_data()
            if result:
                print(f"✅ Sample 10-year simulation created:")
                print(f"   📅 Period: {result['simulation_period']}")
                print(f"   🏭 Total Capacity: {result['total_capacity_mw']} MW")
                print(f"   🔋 Technologies: {', '.join(result['technologies'])}")
                print(f"   🎯 Game ID: {result['game_session_id']}")
        
        # Print startup information
        print_startup_info()
        
        if args.dev:
            print("\n🔧 DEVELOPMENT MODE ACTIVE")
            print("   📊 Sample 10-year simulation ready for testing")
            print("   🔄 Auto-reload enabled for development")
            print("   💡 Try the investment analysis endpoints!")
        
        # Start the server
        print(f"\n🚀 Starting advanced market server on {args.host}:{args.port}...")
        
        if args.dev:
            # Development mode with reload
            uvicorn.run(
                "startup:app",
                host=args.host, 
                port=args.port,
                log_level="info",
                reload=True,
                reload_dirs=["."]
            )
        else:
            # Production mode
            uvicorn.run(
                app, 
                host=args.host, 
                port=args.port,
                log_level="info",
                reload=False
            )
        
    except KeyboardInterrupt:
        print("\n👋 Advanced market server stopped by user")
    except Exception as e:
        print(f"\n❌ Error starting server: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
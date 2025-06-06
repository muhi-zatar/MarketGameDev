from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, String, Float, Integer, Boolean, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel
from typing import List, Optional, Dict
import json
from datetime import datetime
import uuid
import enum

# Database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./electricity_market_yearly.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Enums for database
class UserTypeEnum(enum.Enum):
    operator = "operator"
    utility = "utility"

class PlantTypeEnum(enum.Enum):
    coal = "coal"
    natural_gas_cc = "natural_gas_cc"
    natural_gas_ct = "natural_gas_ct"
    nuclear = "nuclear"
    solar = "solar"
    wind_onshore = "wind_onshore"
    wind_offshore = "wind_offshore"
    battery = "battery"
    hydro = "hydro"
    biomass = "biomass"

class PlantStatusEnum(enum.Enum):
    operating = "operating"
    under_construction = "under_construction"
    maintenance = "maintenance"
    retired = "retired"
    planned = "planned"

class LoadPeriodEnum(enum.Enum):
    off_peak = "off_peak"
    shoulder = "shoulder"
    peak = "peak"

class GameStateEnum(enum.Enum):
    setup = "setup"
    year_planning = "year_planning"
    bidding_open = "bidding_open"
    market_clearing = "market_clearing"
    year_complete = "year_complete"
    game_complete = "game_complete"

# Database Models
class DBUser(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True)
    username = Column(String, unique=True, index=True)
    user_type = Column(SQLEnum(UserTypeEnum))
    budget = Column(Float, default=1000000000.0)  # $1B starting budget
    debt = Column(Float, default=0.0)
    equity = Column(Float, default=1000000000.0)
    created_at = Column(DateTime, default=datetime.now)
    
    # Relationships
    plants = relationship("DBPowerPlant", back_populates="utility")
    bids = relationship("DBYearlyBid", back_populates="utility")

class DBGameSession(Base):
    __tablename__ = "game_sessions"
    
    id = Column(String, primary_key=True)
    name = Column(String)
    operator_id = Column(String, ForeignKey("users.id"))
    
    # Game timing
    current_year = Column(Integer, default=2025)
    start_year = Column(Integer, default=2025)
    end_year = Column(Integer, default=2035)
    
    state = Column(SQLEnum(GameStateEnum), default=GameStateEnum.setup)
    
    # Market parameters
    demand_profile = Column(Text)  # JSON
    carbon_price_per_ton = Column(Float, default=50.0)
    discount_rate = Column(Float, default=0.08)
    inflation_rate = Column(Float, default=0.025)
    
    # Fuel prices by year (JSON)
    fuel_prices = Column(Text)
    
    created_at = Column(DateTime, default=datetime.now)
    
    # Relationships
    plants = relationship("DBPowerPlant", back_populates="game_session")
    bids = relationship("DBYearlyBid", back_populates="game_session") 
    results = relationship("DBMarketResult", back_populates="game_session")

class DBPowerPlant(Base):
    __tablename__ = "power_plants"
    
    id = Column(String, primary_key=True)
    utility_id = Column(String, ForeignKey("users.id"))
    game_session_id = Column(String, ForeignKey("game_sessions.id"))
    
    # Basic info
    name = Column(String)
    plant_type = Column(SQLEnum(PlantTypeEnum))
    capacity_mw = Column(Float)
    
    # Construction timeline
    construction_start_year = Column(Integer)
    commissioning_year = Column(Integer)
    retirement_year = Column(Integer)
    status = Column(SQLEnum(PlantStatusEnum), default=PlantStatusEnum.planned)
    
    # Costs
    capital_cost_total = Column(Float)
    fixed_om_annual = Column(Float)
    variable_om_per_mwh = Column(Float)
    
    # Operating characteristics
    capacity_factor = Column(Float)
    heat_rate = Column(Float, nullable=True)
    fuel_type = Column(String, nullable=True)
    min_generation_mw = Column(Float)
    
    # Maintenance (JSON list of years)
    maintenance_years = Column(Text, default="[]")
    
    # Relationships
    utility = relationship("DBUser", back_populates="plants")
    game_session = relationship("DBGameSession", back_populates="plants")
    bids = relationship("DBYearlyBid", back_populates="plant")

class DBYearlyBid(Base):
    __tablename__ = "yearly_bids"
    
    id = Column(String, primary_key=True)
    utility_id = Column(String, ForeignKey("users.id"))
    game_session_id = Column(String, ForeignKey("game_sessions.id"))
    plant_id = Column(String, ForeignKey("power_plants.id"))
    year = Column(Integer)
    
    # Bids by period (MW capacity offered)
    off_peak_quantity = Column(Float)
    shoulder_quantity = Column(Float)
    peak_quantity = Column(Float)
    
    # Prices by period ($/MWh)
    off_peak_price = Column(Float)
    shoulder_price = Column(Float)
    peak_price = Column(Float)
    
    timestamp = Column(DateTime, default=datetime.now)
    
    # Relationships
    utility = relationship("DBUser", back_populates="bids")
    game_session = relationship("DBGameSession", back_populates="bids")
    plant = relationship("DBPowerPlant", back_populates="bids")

class DBMarketResult(Base):
    __tablename__ = "market_results"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    game_session_id = Column(String, ForeignKey("game_sessions.id"))
    year = Column(Integer)
    period = Column(SQLEnum(LoadPeriodEnum))
    
    clearing_price = Column(Float)
    cleared_quantity = Column(Float)
    total_energy = Column(Float)  # MWh
    accepted_supply_bids = Column(Text)  # JSON list of bid IDs
    marginal_plant = Column(String, nullable=True)
    
    timestamp = Column(DateTime, default=datetime.now)
    
    # Relationships
    game_session = relationship("DBGameSession", back_populates="results")

class DBFuelPrice(Base):
    __tablename__ = "fuel_prices"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    game_session_id = Column(String, ForeignKey("game_sessions.id"))
    year = Column(Integer)
    fuel_type = Column(String)  # coal, natural_gas, uranium
    price_per_mmbtu = Column(Float)
    volatility = Column(Float, default=0.15)

# Create tables
Base.metadata.create_all(bind=engine)

# Pydantic models for API requests/responses
class UserCreate(BaseModel):
    username: str
    user_type: str

class UserResponse(BaseModel):
    id: str
    username: str
    user_type: str
    budget: float
    debt: float
    equity: float
    created_at: datetime

class GameSessionCreate(BaseModel):
    name: str
    operator_id: str
    start_year: int = 2025
    end_year: int = 2035
    carbon_price_per_ton: float = 50.0

class GameSessionResponse(BaseModel):
    id: str
    name: str
    operator_id: str
    current_year: int
    start_year: int
    end_year: int
    state: str
    carbon_price_per_ton: float
    created_at: datetime

class PowerPlantCreate(BaseModel):
    name: str
    plant_type: str
    capacity_mw: float
    construction_start_year: int
    commissioning_year: int
    retirement_year: int

class PowerPlantResponse(BaseModel):
    id: str
    utility_id: str
    name: str
    plant_type: str
    capacity_mw: float
    construction_start_year: int
    commissioning_year: int
    retirement_year: int
    status: str
    capital_cost_total: float
    fixed_om_annual: float
    variable_om_per_mwh: float
    capacity_factor: float
    heat_rate: Optional[float]
    fuel_type: Optional[str]

class YearlyBidCreate(BaseModel):
    plant_id: str
    year: int
    off_peak_quantity: float
    shoulder_quantity: float
    peak_quantity: float
    off_peak_price: float
    shoulder_price: float
    peak_price: float

class YearlyBidResponse(BaseModel):
    id: str
    utility_id: str
    plant_id: str
    year: int
    off_peak_quantity: float
    shoulder_quantity: float
    peak_quantity: float
    off_peak_price: float
    shoulder_price: float
    peak_price: float
    timestamp: datetime

class MarketResultResponse(BaseModel):
    id: str
    year: int
    period: str
    clearing_price: float
    cleared_quantity: float
    total_energy: float
    accepted_supply_bids: List[str]
    marginal_plant: Optional[str]
    timestamp: datetime

class PlantTemplateResponse(BaseModel):
    plant_type: str
    name: str
    overnight_cost_per_kw: float
    construction_time_years: int
    economic_life_years: int
    capacity_factor_base: float
    heat_rate: Optional[float]
    fuel_type: Optional[str]
    fixed_om_per_kw_year: float
    variable_om_per_mwh: float
    co2_emissions_tons_per_mwh: float

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# FastAPI app
app = FastAPI(title="Advanced Electricity Market Game API", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# User Management
@app.post("/users", response_model=UserResponse)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = DBUser(
        id=str(uuid.uuid4()),
        username=user.username,
        user_type=UserTypeEnum(user.user_type)
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.get("/users/{user_id}/financial-summary")
def get_user_financials(user_id: str, game_session_id: str, db: Session = Depends(get_db)):
    """Get financial summary for a utility"""
    user = db.query(DBUser).filter(DBUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all plants for this utility in this game
    plants = db.query(DBPowerPlant).filter(
        DBPowerPlant.utility_id == user_id,
        DBPowerPlant.game_session_id == game_session_id
    ).all()
    
    # Calculate total capital invested
    total_capital = sum(plant.capital_cost_total for plant in plants)
    annual_fixed_costs = sum(plant.fixed_om_annual for plant in plants)
    
    return {
        "utility_id": user_id,
        "budget": user.budget,
        "debt": user.debt,
        "equity": user.equity,
        "total_capital_invested": total_capital,
        "annual_fixed_costs": annual_fixed_costs,
        "plant_count": len(plants),
        "total_capacity_mw": sum(plant.capacity_mw for plant in plants)
    }

# Game Session Management
@app.post("/game-sessions", response_model=GameSessionResponse)
def create_game_session(session: GameSessionCreate, db: Session = Depends(get_db)):
    from electricity_market_backend import AnnualDemandProfile, DEFAULT_FUEL_PRICES
    
    # Create default demand profile
    demand_profile = AnnualDemandProfile(year=session.start_year)
    
    db_session = DBGameSession(
        id=str(uuid.uuid4()),
        name=session.name,
        operator_id=session.operator_id,
        start_year=session.start_year,
        end_year=session.end_year,
        current_year=session.start_year,
        carbon_price_per_ton=session.carbon_price_per_ton,
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
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

@app.get("/game-sessions/{session_id}", response_model=GameSessionResponse)
def get_game_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    return session

@app.put("/game-sessions/{session_id}/state")
def update_game_state(session_id: str, new_state: str, db: Session = Depends(get_db)):
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    try:
        session.state = GameStateEnum(new_state)
        db.commit()
        return {"message": "Game state updated", "new_state": new_state}
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid game state: {new_state}")

@app.put("/game-sessions/{session_id}/advance-year")
def advance_year(session_id: str, db: Session = Depends(get_db)):
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    if session.current_year >= session.end_year:
        session.state = GameStateEnum.game_complete
    else:
        session.current_year += 1
        session.state = GameStateEnum.year_planning
    
    db.commit()
    return {
        "message": "Year advanced",
        "current_year": session.current_year,
        "state": session.state.value
    }

# Plant Templates and Information
@app.get("/plant-templates", response_model=List[PlantTemplateResponse])
def get_plant_templates():
    """Get all available plant templates"""
    from electricity_market_backend import PLANT_TEMPLATES
    
    templates = []
    for plant_type, template in PLANT_TEMPLATES.items():
        templates.append(PlantTemplateResponse(
            plant_type=plant_type.value,
            name=template.name,
            overnight_cost_per_kw=template.overnight_cost_per_kw,
            construction_time_years=template.construction_time_years,
            economic_life_years=template.economic_life_years,
            capacity_factor_base=template.capacity_factor_base,
            heat_rate=template.heat_rate,
            fuel_type=template.fuel_type,
            fixed_om_per_kw_year=template.fixed_om_per_kw_year,
            variable_om_per_mwh=template.variable_om_per_mwh,
            co2_emissions_tons_per_mwh=template.co2_emissions_tons_per_mwh
        ))
    
    return templates

@app.get("/plant-templates/{plant_type}")
def get_plant_template(plant_type: str):
    """Get specific plant template with cost calculations"""
    from electricity_market_backend import PLANT_TEMPLATES, PlantType
    
    try:
        plant_enum = PlantType(plant_type)
        template = PLANT_TEMPLATES[plant_enum]
        
        # Example cost calculation for 100 MW plant
        example_capacity = 100
        total_capital_cost = example_capacity * 1000 * template.overnight_cost_per_kw  # Convert MW to kW
        annual_fixed_om = example_capacity * 1000 * template.fixed_om_per_kw_year
        
        return {
            "template": PlantTemplateResponse(
                plant_type=plant_type,
                name=template.name,
                overnight_cost_per_kw=template.overnight_cost_per_kw,
                construction_time_years=template.construction_time_years,
                economic_life_years=template.economic_life_years,
                capacity_factor_base=template.capacity_factor_base,
                heat_rate=template.heat_rate,
                fuel_type=template.fuel_type,
                fixed_om_per_kw_year=template.fixed_om_per_kw_year,
                variable_om_per_mwh=template.variable_om_per_mwh,
                co2_emissions_tons_per_mwh=template.co2_emissions_tons_per_mwh
            ),
            "example_100mw_costs": {
                "total_capital_cost": total_capital_cost,
                "annual_fixed_om": annual_fixed_om,
                "construction_time_years": template.construction_time_years
            }
        }
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid plant type: {plant_type}")

# Power Plant Management
@app.post("/game-sessions/{session_id}/plants", response_model=PowerPlantResponse)
def create_power_plant(
    session_id: str,
    plant: PowerPlantCreate,
    utility_id: str,
    db: Session = Depends(get_db)
):
    from electricity_market_backend import PLANT_TEMPLATES, PlantType, PlantStatus
    
    try:
        plant_type_enum = PlantType(plant.plant_type)
        template = PLANT_TEMPLATES[plant_type_enum]
        
        # Calculate costs
        capacity_kw = plant.capacity_mw * 1000
        total_capital_cost = capacity_kw * template.overnight_cost_per_kw
        annual_fixed_om = capacity_kw * template.fixed_om_per_kw_year
        
        # Determine initial status
        current_year = 2025  # TODO: Get from game session
        if plant.commissioning_year <= current_year:
            status = PlantStatusEnum.operating
        else:
            status = PlantStatusEnum.under_construction
        
        db_plant = DBPowerPlant(
            id=str(uuid.uuid4()),
            utility_id=utility_id,
            game_session_id=session_id,
            name=plant.name,
            plant_type=PlantTypeEnum(plant.plant_type),
            capacity_mw=plant.capacity_mw,
            construction_start_year=plant.construction_start_year,
            commissioning_year=plant.commissioning_year,
            retirement_year=plant.retirement_year,
            status=status,
            capital_cost_total=total_capital_cost,
            fixed_om_annual=annual_fixed_om,
            variable_om_per_mwh=template.variable_om_per_mwh,
            capacity_factor=template.capacity_factor_base,
            heat_rate=template.heat_rate,
            fuel_type=template.fuel_type,
            min_generation_mw=plant.capacity_mw * template.min_generation_pct,
            maintenance_years=json.dumps([])  # Will be populated later
        )
        
        # Update utility budget (subtract capital cost)
        utility = db.query(DBUser).filter(DBUser.id == utility_id).first()
        if utility:
            utility.budget -= total_capital_cost
            utility.debt += total_capital_cost * 0.7  # 70% debt financing
            utility.equity -= total_capital_cost * 0.3  # 30% equity
        
        db.add(db_plant)
        db.commit()
        db.refresh(db_plant)
        return db_plant
        
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid plant type: {plant.plant_type}")

@app.get("/game-sessions/{session_id}/plants", response_model=List[PowerPlantResponse])
def get_power_plants(
    session_id: str, 
    utility_id: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    query = db.query(DBPowerPlant).filter(DBPowerPlant.game_session_id == session_id)
    if utility_id:
        query = query.filter(DBPowerPlant.utility_id == utility_id)
    return query.all()

@app.get("/game-sessions/{session_id}/plants/{plant_id}/economics")
def get_plant_economics(session_id: str, plant_id: str, year: int, db: Session = Depends(get_db)):
    """Get detailed economic analysis for a plant"""
    plant = db.query(DBPowerPlant).filter(
        DBPowerPlant.id == plant_id,
        DBPowerPlant.game_session_id == session_id
    ).first()
    
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found")
    
    # Get fuel prices for the year
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    fuel_prices_data = json.loads(session.fuel_prices)
    year_fuel_prices = fuel_prices_data.get(str(year), fuel_prices_data.get("2025", {}))
    
    # Calculate marginal cost
    from electricity_market_backend import PowerPlant, PlantType
    
    # Convert DB plant to domain object for calculations
    domain_plant = PowerPlant(
        id=plant.id,
        utility_id=plant.utility_id,
        name=plant.name,
        plant_type=PlantType(plant.plant_type.value),
        capacity_mw=plant.capacity_mw,
        construction_start_year=plant.construction_start_year,
        commissioning_year=plant.commissioning_year,
        retirement_year=plant.retirement_year,
        capital_cost_total=plant.capital_cost_total,
        fixed_om_annual=plant.fixed_om_annual,
        variable_om_per_mwh=plant.variable_om_per_mwh,
        capacity_factor=plant.capacity_factor,
        heat_rate=plant.heat_rate,
        fuel_type=plant.fuel_type,
        min_generation_mw=plant.min_generation_mw
    )
    
    marginal_cost = domain_plant.calculate_marginal_cost(year_fuel_prices, session.carbon_price_per_ton)
    
    # Calculate annual economics
    annual_generation_mwh = plant.capacity_mw * plant.capacity_factor * 8760
    annual_variable_costs = annual_generation_mwh * marginal_cost
    annual_total_costs = plant.fixed_om_annual + annual_variable_costs
    
    return {
        "plant_id": plant_id,
        "year": year,
        "marginal_cost_per_mwh": marginal_cost,
        "annual_fixed_costs": plant.fixed_om_annual,
        "annual_variable_costs": annual_variable_costs,
        "annual_total_costs": annual_total_costs,
        "annual_generation_mwh": annual_generation_mwh,
        "capacity_factor": plant.capacity_factor,
        "fuel_costs": year_fuel_prices.get(plant.fuel_type, 0) if plant.fuel_type else 0
    }

# Bidding System
@app.post("/game-sessions/{session_id}/bids", response_model=YearlyBidResponse)
def submit_yearly_bid(
    session_id: str,
    bid: YearlyBidCreate,
    utility_id: str,
    db: Session = Depends(get_db)
):
    # Validate plant belongs to utility
    plant = db.query(DBPowerPlant).filter(
        DBPowerPlant.id == bid.plant_id,
        DBPowerPlant.utility_id == utility_id,
        DBPowerPlant.game_session_id == session_id
    ).first()
    
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found or not owned by utility")
    
    # Check if bid already exists for this plant and year
    existing_bid = db.query(DBYearlyBid).filter(
        DBYearlyBid.plant_id == bid.plant_id,
        DBYearlyBid.year == bid.year,
        DBYearlyBid.game_session_id == session_id
    ).first()
    
    if existing_bid:
        # Update existing bid
        existing_bid.off_peak_quantity = bid.off_peak_quantity
        existing_bid.shoulder_quantity = bid.shoulder_quantity
        existing_bid.peak_quantity = bid.peak_quantity
        existing_bid.off_peak_price = bid.off_peak_price
        existing_bid.shoulder_price = bid.shoulder_price
        existing_bid.peak_price = bid.peak_price
        existing_bid.timestamp = datetime.now()
        db.commit()
        db.refresh(existing_bid)
        return existing_bid
    else:
        # Create new bid
        db_bid = DBYearlyBid(
            id=str(uuid.uuid4()),
            utility_id=utility_id,
            game_session_id=session_id,
            plant_id=bid.plant_id,
            year=bid.year,
            off_peak_quantity=bid.off_peak_quantity,
            shoulder_quantity=bid.shoulder_quantity,
            peak_quantity=bid.peak_quantity,
            off_peak_price=bid.off_peak_price,
            shoulder_price=bid.shoulder_price,
            peak_price=bid.peak_price
        )
        db.add(db_bid)
        db.commit()
        db.refresh(db_bid)
        return db_bid

@app.get("/game-sessions/{session_id}/bids", response_model=List[YearlyBidResponse])
def get_yearly_bids(
    session_id: str,
    year: Optional[int] = None,
    utility_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(DBYearlyBid).filter(DBYearlyBid.game_session_id == session_id)
    if year:
        query = query.filter(DBYearlyBid.year == year)
    if utility_id:
        query = query.filter(DBYearlyBid.utility_id == utility_id)
    return query.all()

@app.get("/game-sessions/{session_id}/fuel-prices/{year}")
def get_fuel_prices(session_id: str, year: int, db: Session = Depends(get_db)):
    """Get fuel prices for a specific year"""
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    fuel_prices_data = json.loads(session.fuel_prices)
    year_prices = fuel_prices_data.get(str(year))
    
    if not year_prices:
        # Extrapolate prices if year not found
        latest_year = max(int(y) for y in fuel_prices_data.keys())
        latest_prices = fuel_prices_data[str(latest_year)]
        
        # Simple extrapolation with 2% annual growth
        years_diff = year - latest_year
        growth_factor = 1.02 ** years_diff
        
        year_prices = {
            fuel: price * growth_factor 
            for fuel, price in latest_prices.items()
        }
    
    return {
        "year": year,
        "fuel_prices": year_prices,
        "units": "$/MMBtu"
    }

# Market Operations (will be completed in game_orchestrator)
@app.get("/game-sessions/{session_id}/market-results", response_model=List[MarketResultResponse])
def get_market_results(
    session_id: str,
    year: Optional[int] = None,
    period: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(DBMarketResult).filter(DBMarketResult.game_session_id == session_id)
    if year:
        query = query.filter(DBMarketResult.year == year)
    if period:
        try:
            period_enum = LoadPeriodEnum(period)
            query = query.filter(DBMarketResult.period == period_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid period: {period}")
    
    results = query.all()
    
    return [
        MarketResultResponse(
            id=result.id,
            year=result.year,
            period=result.period.value,
            clearing_price=result.clearing_price,
            cleared_quantity=result.cleared_quantity,
            total_energy=result.total_energy,
            accepted_supply_bids=json.loads(result.accepted_supply_bids),
            marginal_plant=result.marginal_plant,
            timestamp=result.timestamp
        ) for result in results
    ]

# Dashboard and Analytics
@app.get("/game-sessions/{session_id}/dashboard")
def get_game_dashboard(session_id: str, db: Session = Depends(get_db)):
    session = db.query(DBGameSession).filter(DBGameSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Game session not found")
    
    # Get demand profile
    demand_data = json.loads(session.demand_profile)
    current_year_offset = session.current_year - session.start_year
    
    # Calculate current demand with growth
    growth_factor = (1 + demand_data["demand_growth_rate"]) ** current_year_offset
    current_demands = {
        "off_peak": demand_data["off_peak_demand"] * growth_factor,
        "shoulder": demand_data["shoulder_demand"] * growth_factor,
        "peak": demand_data["peak_demand"] * growth_factor
    }
    
    # Get plant statistics
    total_plants = db.query(DBPowerPlant).filter(
        DBPowerPlant.game_session_id == session_id
    ).count()
    
    operating_plants = db.query(DBPowerPlant).filter(
        DBPowerPlant.game_session_id == session_id,
        DBPowerPlant.status == PlantStatusEnum.operating
    ).count()
    
    total_capacity = db.query(DBPowerPlant).filter(
        DBPowerPlant.game_session_id == session_id,
        DBPowerPlant.status == PlantStatusEnum.operating
    ).with_entities(DBPowerPlant.capacity_mw).all()
    
    total_capacity_mw = sum(plant[0] for plant in total_capacity) if total_capacity else 0
    
    # Get utility count
    unique_utilities = db.query(DBPowerPlant.utility_id).filter(
        DBPowerPlant.game_session_id == session_id
    ).distinct().count()
    
    # Get latest market results
    latest_results = db.query(DBMarketResult).filter(
        DBMarketResult.game_session_id == session_id
    ).order_by(DBMarketResult.timestamp.desc()).limit(3).all()
    
    return {
        "game_session": {
            "id": session.id,
            "name": session.name,
            "current_year": session.current_year,
            "start_year": session.start_year,
            "end_year": session.end_year,
            "state": session.state.value,
            "years_remaining": session.end_year - session.current_year
        },
        "current_demand_mw": current_demands,
        "market_stats": {
            "total_plants": total_plants,
            "operating_plants": operating_plants,
            "total_capacity_mw": total_capacity_mw,
            "capacity_margin": (total_capacity_mw - current_demands["peak"]) / current_demands["peak"] * 100 if current_demands["peak"] > 0 else 0
        },
        "participants": {
            "total_utilities": unique_utilities
        },
        "carbon_price": session.carbon_price_per_ton,
        "recent_results": [
            {
                "year": r.year,
                "period": r.period.value,
                "clearing_price": r.clearing_price,
                "cleared_quantity": r.cleared_quantity,
                "timestamp": r.timestamp
            } for r in latest_results
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
// User Types
export type UserType = 'operator' | 'utility';

export interface User {
  id: string;
  username: string;
  user_type: UserType;
  budget?: number;
  debt?: number;
  equity?: number;
  created_at: string;
}

// Game Session Types
export interface GameSession {
  id: string;
  name: string;
  operator_id: string;
  current_year: number;
  start_year: number;
  end_year: number;
  state: GameState;
  carbon_price_per_ton: number;
  created_at: string;
}

export enum GameState {
  SETUP = "setup",
  YEAR_PLANNING = "year_planning",
  BIDDING_OPEN = "bidding_open",
  MARKET_CLEARING = "market_clearing",
  YEAR_COMPLETE = "year_complete",
  GAME_COMPLETE = "game_complete"
}

// Plant Types
export enum PlantType {
  COAL = "coal",
  NATURAL_GAS_CC = "natural_gas_cc",
  NATURAL_GAS_CT = "natural_gas_ct",
  NUCLEAR = "nuclear",
  SOLAR = "solar",
  WIND_ONSHORE = "wind_onshore",
  WIND_OFFSHORE = "wind_offshore",
  BATTERY = "battery",
  HYDRO = "hydro",
  BIOMASS = "biomass"
}

export enum PlantStatus {
  OPERATING = "operating",
  UNDER_CONSTRUCTION = "under_construction",
  MAINTENANCE = "maintenance",
  RETIRED = "retired",
  PLANNED = "planned"
}

export interface PowerPlant {
  id: string;
  utility_id: string;
  name: string;
  plant_type: PlantType;
  capacity_mw: number;
  construction_start_year: number;
  commissioning_year: number;
  retirement_year: number;
  status: PlantStatus;
  capital_cost_total: number;
  fixed_om_annual: number;
  variable_om_per_mwh: number;
  capacity_factor: number;
  heat_rate?: number;
  fuel_type?: string;
}

export interface PlantTemplate {
  plant_type: string;
  name: string;
  overnight_cost_per_kw: number;
  construction_time_years: number;
  economic_life_years: number;
  capacity_factor_base: number;
  heat_rate?: number;
  fuel_type?: string;
  fixed_om_per_kw_year: number;
  variable_om_per_mwh: number;
  co2_emissions_tons_per_mwh: number;
}

// Bidding Types
export enum LoadPeriod {
  OFF_PEAK = "off_peak",
  SHOULDER = "shoulder",
  PEAK = "peak"
}

export interface YearlyBid {
  id: string;
  utility_id: string;
  plant_id: string;
  year: number;
  off_peak_quantity: number;
  shoulder_quantity: number;
  peak_quantity: number;
  off_peak_price: number;
  shoulder_price: number;
  peak_price: number;
  timestamp: string;
}

// Market Result Types
export interface MarketResult {
  id: string;
  year: number;
  period: string;
  clearing_price: number;
  cleared_quantity: number;
  total_energy: number;
  accepted_supply_bids: string[];
  marginal_plant?: string;
  timestamp: string;
}

// Plant Economics and Investment
export interface PlantEconomics {
  plant_id: string;
  year: number;
  marginal_cost_per_mwh: number;
  annual_fixed_costs: number;
  annual_variable_costs: number;
  annual_total_costs: number;
  annual_generation_mwh: number;
  capacity_factor: number;
  fuel_costs?: number;
}

export interface InvestmentAnalysis {
  utility_id: string;
  financial_position: {
    available_budget: number;
    current_debt: number;
    current_equity: number;
    debt_to_equity_ratio: number;
    available_investment_capacity: number;
  };
  current_portfolio: {
    total_capacity_mw: number;
    total_capital_invested: number;
    annual_fixed_costs: number;
    plant_count: number;
    technology_mix: Record<string, number>;
  };
  investment_opportunities: PlantTemplate[];
  recommendations: string[];
}

// Dashboard and Game Flow Types
export interface GameDashboard {
  game_session: {
    id: string;
    name: string;
    current_year: number;
    start_year: number;
    end_year: number;
    state: string;
    years_remaining: number;
  };
  current_demand_mw: {
    off_peak: number;
    shoulder: number;
    peak: number;
  };
  market_stats: {
    total_plants: number;
    operating_plants: number;
    total_capacity_mw: number;
    capacity_margin: number;
  };
  participants: {
    total_utilities: number;
  };
  carbon_price: number;
  recent_results: {
    year: number;
    period: string;
    clearing_price: number;
    cleared_quantity: number;
    timestamp: string;
  }[];
}

export interface YearlyGameFlowResponse {
  status: string;
  year: number;
  message: string;
  [key: string]: any; // For phase-specific data
}

// Fuel Price and Market Events
export interface FuelPriceData {
  year: number;
  fuel_prices: {
    coal: number;
    natural_gas: number;
    uranium: number;
  };
  units: string;
}

export interface MarketEvent {
  type: string;
  description: string;
  impact: string;
  severity?: string;
  fuel_affected?: string;
  magnitude?: number;
}
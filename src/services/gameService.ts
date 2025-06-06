import api from './api';
import { GameSession, GameState, PowerPlant, PlantTemplate, YearlyBid, MarketResult, PlantEconomics, InvestmentAnalysis, GameDashboard, YearlyGameFlowResponse } from '../types';

// Game Session Management
export const createGameSession = async (name: string, operatorId: string, startYear: number = 2025, endYear: number = 2035) => {
  const response = await api.post('/game-sessions', { 
    name, 
    operator_id: operatorId,
    start_year: startYear,
    end_year: endYear
  });
  return response.data;
};

export const getGameSession = async (gameId: string) => {
  const response = await api.get(`/game-sessions/${gameId}`);
  return response.data;
};

export const getGameDashboard = async (gameId: string) => {
  const response = await api.get(`/game-sessions/${gameId}/dashboard`);
  return response.data as GameDashboard;
};

export const updateGameState = async (gameId: string, newState: GameState) => {
  const response = await api.put(`/game-sessions/${gameId}/state`, { newState });
  return response.data;
};

export const advanceYear = async (gameId: string) => {
  const response = await api.put(`/game-sessions/${gameId}/advance-year`);
  return response.data;
};

// Game Orchestration - Yearly Flow
export const startYearPlanning = async (gameId: string, year: number) => {
  const response = await api.post(`/game-sessions/${gameId}/start-year-planning/${year}`);
  return response.data as YearlyGameFlowResponse;
};

export const openAnnualBidding = async (gameId: string, year: number) => {
  const response = await api.post(`/game-sessions/${gameId}/open-annual-bidding/${year}`);
  return response.data as YearlyGameFlowResponse;
};

export const clearAnnualMarkets = async (gameId: string, year: number) => {
  const response = await api.post(`/game-sessions/${gameId}/clear-annual-markets/${year}`);
  return response.data as YearlyGameFlowResponse;
};

export const completeYear = async (gameId: string, year: number) => {
  const response = await api.post(`/game-sessions/${gameId}/complete-year/${year}`);
  return response.data as YearlyGameFlowResponse;
};

// Plant Management
export const getPlantTemplates = async () => {
  const response = await api.get('/plant-templates');
  return response.data as PlantTemplate[];
};

export const getPlantTemplate = async (plantType: string) => {
  const response = await api.get(`/plant-templates/${plantType}`);
  return response.data;
};

export const createPowerPlant = async (
  gameId: string, 
  utilityId: string, 
  plant: {
    name: string;
    plant_type: string;
    capacity_mw: number;
    construction_start_year: number;
    commissioning_year: number;
    retirement_year: number;
  }
) => {
  console.log('createPowerPlant called with:', { gameId, utilityId, plant });
  
  try {
    const response = await api.post(`/game-sessions/${gameId}/plants`, plant, {
      params: { utility_id: utilityId }
    });
    console.log('createPowerPlant response:', response.data);
    return response.data as PowerPlant;
  } catch (error) {
    console.error('Error in createPowerPlant:', error);
    throw error;
  }
};

export const getPowerPlants = async (gameId: string, utilityId?: string) => {
  const response = await api.get(`/game-sessions/${gameId}/plants`, {
    params: { utility_id: utilityId }
  });
  return response.data as PowerPlant[];
};

export const getPlantEconomics = async (gameId: string, plantId: string, year: number) => {
  const response = await api.get(`/game-sessions/${gameId}/plants/${plantId}/economics`, {
    params: { year }
  });
  return response.data as PlantEconomics;
};

// Bidding
export const submitYearlyBid = async (
  gameId: string,
  utilityId: string,
  bid: {
    plant_id: string;
    year: number;
    off_peak_quantity: number;
    shoulder_quantity: number;
    peak_quantity: number;
    off_peak_price: number;
    shoulder_price: number;
    peak_price: number;
  }
) => {
  const response = await api.post(`/game-sessions/${gameId}/bids`, bid, {
    params: { utility_id: utilityId }
  });
  return response.data as YearlyBid;
};

export const getYearlyBids = async (gameId: string, year?: number, utilityId?: string) => {
  const response = await api.get(`/game-sessions/${gameId}/bids`, {
    params: { year, utility_id: utilityId }
  });
  return response.data as YearlyBid[];
};

// Market Results
export const getMarketResults = async (gameId: string, year?: number, period?: string) => {
  const response = await api.get(`/game-sessions/${gameId}/market-results`, {
    params: { year, period }
  });
  return response.data as MarketResult[];
};

export const getYearlySummary = async (gameId: string, year: number) => {
  const response = await api.get(`/game-sessions/${gameId}/yearly-summary/${year}`);
  return response.data;
};

// Analysis
export const getMultiYearAnalysis = async (gameId: string) => {
  const response = await api.get(`/game-sessions/${gameId}/multi-year-analysis`);
  return response.data;
};

export const getInvestmentAnalysis = async (gameId: string, utilityId: string) => {
  const response = await api.get(`/game-sessions/${gameId}/investment-analysis`, {
    params: { utility_id: utilityId }
  });
  return response.data as InvestmentAnalysis;
};

export const simulateInvestment = async (
  gameId: string,
  utilityId: string,
  plantType: string,
  capacityMw: number,
  constructionStartYear: number
) => {
  const response = await api.post(`/game-sessions/${gameId}/simulate-investment`, null, {
    params: {
      utility_id: utilityId,
      plant_type: plantType,
      capacity_mw: capacityMw,
      construction_start_year: constructionStartYear
    }
  });
  return response.data;
};

// Fuel Prices
export const getFuelPrices = async (gameId: string, year: number) => {
  const response = await api.get(`/game-sessions/${gameId}/fuel-prices/${year}`);
  return response.data;
};

// Scenarios
export const getScenarios = async () => {
  const response = await api.get('/scenarios');
  return response.data;
};

export const createScenarioGame = async (scenarioName: string, operatorId: string) => {
  const response = await api.post(`/scenarios/${scenarioName}/create-game`, null, {
    params: { operator_id: operatorId }
  });
  return response.data;
};
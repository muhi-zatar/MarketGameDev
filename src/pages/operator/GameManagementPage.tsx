import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatCard from '../../components/ui/StatCard';
import { useAuth } from '../../contexts/AuthContext';
import { getGameSession, getGameDashboard, startYearPlanning, openAnnualBidding, clearAnnualMarkets, completeYear } from '../../services/gameService';
import { GameSession, GameDashboard, GameState } from '../../types';
import toast from 'react-hot-toast';
import { ClockIcon, BoltIcon, UsersIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

export default function GameManagementPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  
  const [game, setGame] = useState<GameSession | null>(null);
  const [dashboard, setDashboard] = useState<GameDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionInProgress, setIsActionInProgress] = useState(false);
  const [phaseResult, setPhaseResult] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!gameId) return;
      
      try {
        const gameData = await getGameSession(gameId);
        setGame(gameData);
        
        const dashboardData = await getGameDashboard(gameId);
        setDashboard(dashboardData);
      } catch (error) {
        console.error('Error fetching game data:', error);
        toast.error('Failed to load game data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [gameId]);

  const refreshData = async () => {
    if (!gameId) return;
    
    try {
      const gameData = await getGameSession(gameId);
      setGame(gameData);
      
      const dashboardData = await getGameDashboard(gameId);
      setDashboard(dashboardData);
    } catch (error) {
      console.error('Error refreshing game data:', error);
    }
  };

  const handlePhaseAction = async (phase: string) => {
    if (!gameId || !game) return;
    
    setIsActionInProgress(true);
    setPhaseResult(null);
    
    try {
      let result;
      
      switch (phase) {
        case 'planning':
          result = await startYearPlanning(gameId, game.current_year);
          toast.success(`Year ${game.current_year} planning phase started`);
          break;
        case 'bidding':
          result = await openAnnualBidding(gameId, game.current_year);
          toast.success(`Bidding opened for year ${game.current_year}`);
          break;
        case 'clearing':
          result = await clearAnnualMarkets(gameId, game.current_year);
          toast.success(`Markets cleared for year ${game.current_year}`);
          break;
        case 'complete':
          result = await completeYear(gameId, game.current_year);
          toast.success(`Year ${game.current_year} completed`);
          break;
      }
      
      setPhaseResult(result);
      await refreshData(); // Refresh game data after action
    } catch (error) {
      console.error(`Error executing ${phase} phase:`, error);
      toast.error(`Failed to execute ${phase} phase`);
    } finally {
      setIsActionInProgress(false);
    }
  };

  const getNextPhaseAction = () => {
    if (!game) return { phase: '', label: '', disabled: true };
    
    switch (game.state) {
      case GameState.SETUP:
        return {
          phase: 'planning',
          label: `Start Year ${game.current_year} Planning`,
          disabled: false
        };
      case GameState.YEAR_PLANNING:
        return {
          phase: 'bidding',
          label: 'Open Annual Bidding',
          disabled: false
        };
      case GameState.BIDDING_OPEN:
        return {
          phase: 'clearing',
          label: 'Clear Markets',
          disabled: false
        };
      case GameState.MARKET_CLEARING:
        return {
          phase: 'complete',
          label: 'Complete Year',
          disabled: false
        };
      case GameState.YEAR_COMPLETE:
        return {
          phase: 'planning',
          label: `Start Year ${game.current_year} Planning`,
          disabled: false
        };
      case GameState.GAME_COMPLETE:
        return {
          phase: '',
          label: 'Game Completed',
          disabled: true
        };
      default:
        return { phase: '', label: '', disabled: true };
    }
  };

  const getPhaseDescription = () => {
    if (!game) return '';
    
    switch (game.state) {
      case GameState.SETUP:
        return 'Initial game setup phase. Set parameters and prepare for the simulation.';
      case GameState.YEAR_PLANNING:
        return 'Utilities are planning investments and generation strategies for the year.';
      case GameState.BIDDING_OPEN:
        return 'Utilities submit their bids for all load periods (off-peak, shoulder, peak).';
      case GameState.MARKET_CLEARING:
        return 'Markets are being cleared and prices determined based on supply and demand.';
      case GameState.YEAR_COMPLETE:
        return 'Year is completed. Review results before moving to the next year.';
      case GameState.GAME_COMPLETE:
        return 'The simulation has ended. Final results and analysis are available.';
      default:
        return '';
    }
  };

  const nextAction = getNextPhaseAction();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-64">
          <svg className="animate-spin h-8 w-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{game?.name}</h1>
        <p className="mt-1 text-gray-500">
          Game ID: {gameId} | Years: {game?.start_year}-{game?.end_year}
        </p>
      </div>

      {dashboard && (
        <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Current Year"
            value={dashboard.game_session.current_year}
            description={`${dashboard.game_session.state.replace('_', ' ')}`}
            icon={<ClockIcon className="h-6 w-6 text-primary-600" />}
          />
          <StatCard
            title="Total Capacity"
            value={`${Math.round(dashboard.market_stats.total_capacity_mw)} MW`}
            description={`From ${dashboard.market_stats.operating_plants} operating plants`}
            icon={<BoltIcon className="h-6 w-6 text-green-600" />}
          />
          <StatCard
            title="Carbon Price"
            value={`$${dashboard.carbon_price}/ton`}
            icon={<CurrencyDollarIcon className="h-6 w-6 text-emerald-600" />}
          />
          <StatCard
            title="Participant Utilities"
            value={dashboard.participants.total_utilities}
            icon={<UsersIcon className="h-6 w-6 text-secondary-600" />}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Game Flow Control">
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center mb-2">
                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: game?.state ? getGameStateColor(game.state) : '#9CA3AF' }}></div>
                <h3 className="font-medium">Current Phase: {game?.state.replace('_', ' ')}</h3>
              </div>
              <p className="text-sm text-gray-600">{getPhaseDescription()}</p>
            </div>
            
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">
                Progress: Year {game?.current_year} of {game?.end_year}
              </p>
              
              <Button 
                onClick={() => handlePhaseAction(nextAction.phase)}
                disabled={nextAction.disabled || isActionInProgress}
                isLoading={isActionInProgress}
              >
                {nextAction.label}
              </Button>
            </div>

            {phaseResult && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-medium text-blue-900 mb-2">Phase Result</h3>
                <div className="text-sm text-blue-700">
                  <p><strong>Status:</strong> {phaseResult.status}</p>
                  <p><strong>Message:</strong> {phaseResult.message}</p>
                  
                  {phaseResult.planning_period_ends && (
                    <p><strong>Action:</strong> {phaseResult.planning_period_ends}</p>
                  )}
                  
                  {phaseResult.results && (
                    <div className="mt-2">
                      <p className="font-medium">Market Results:</p>
                      <ul className="list-disc list-inside pl-2 space-y-1">
                        {Object.entries(phaseResult.results).map(([period, data]: [string, any]) => (
                          <li key={period}>
                            {period.replace('_', ' ')}: ${data.clearing_price.toFixed(2)}/MWh, 
                            {Math.round(data.cleared_quantity)} MW
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {phaseResult.summary && (
                    <div className="mt-2">
                      <p className="font-medium">Summary:</p>
                      <p>Total Market Value: ${Math.round(phaseResult.summary.total_market_revenue).toLocaleString()}</p>
                      <p>Renewable Penetration: {(phaseResult.summary.renewable_penetration * 100).toFixed(1)}%</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card title="Demand Overview">
            {dashboard && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Current Demand by Period</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Off-Peak (5000h)</span>
                      <span className="font-medium">{Math.round(dashboard.current_demand_mw.off_peak)} MW</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-blue-300 h-2.5 rounded-full" 
                        style={{ width: `${(dashboard.current_demand_mw.off_peak / dashboard.current_demand_mw.peak) * 100}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Shoulder (2500h)</span>
                      <span className="font-medium">{Math.round(dashboard.current_demand_mw.shoulder)} MW</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-yellow-300 h-2.5 rounded-full" 
                        style={{ width: `${(dashboard.current_demand_mw.shoulder / dashboard.current_demand_mw.peak) * 100}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Peak (1260h)</span>
                      <span className="font-medium">{Math.round(dashboard.current_demand_mw.peak)} MW</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-red-400 h-2.5 rounded-full" 
                        style={{ width: '100%' }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Annual Growth Rate</h3>
                  <div className="flex items-center">
                    <BoltIcon className="h-5 w-5 text-yellow-500 mr-2" />
                    <span className="text-lg font-medium">2.0% per year</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Based on current settings, peak demand will grow to approximately {Math.round(dashboard.current_demand_mw.peak * Math.pow(1.02, game?.end_year! - game?.current_year!))} MW by {game?.end_year}.
                  </p>
                </div>
              </div>
            )}
          </Card>
          
          <div className="mt-6">
            <Card title="Recent Market Activity">
              {dashboard?.recent_results && dashboard.recent_results.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.recent_results.map((result, index) => (
                    <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                      <div>
                        <div className="text-sm font-medium">
                          Year {result.year} - {result.period.replace('_', ' ').toUpperCase()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(result.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">${result.clearing_price.toFixed(2)}/MWh</div>
                        <div className="text-xs text-gray-500">{Math.round(result.cleared_quantity)} MW</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No market results available yet</p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function getGameStateColor(state: string): string {
  switch (state) {
    case GameState.SETUP:
      return '#9CA3AF'; // gray
    case GameState.YEAR_PLANNING:
      return '#3B82F6'; // blue
    case GameState.BIDDING_OPEN:
      return '#10B981'; // green
    case GameState.MARKET_CLEARING:
      return '#F59E0B'; // amber
    case GameState.YEAR_COMPLETE:
      return '#8B5CF6'; // purple
    case GameState.GAME_COMPLETE:
      return '#EF4444'; // red
    default:
      return '#9CA3AF';
  }
}
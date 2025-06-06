import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatCard from '../../components/ui/StatCard';
import { useAuth } from '../../contexts/AuthContext';
import { getGameSession, getGameDashboard } from '../../services/gameService';
import { ClockIcon, BoltIcon, UsersIcon } from '@heroicons/react/24/outline';
import { GameSession, GameDashboard, GameState } from '../../types';

export default function OperatorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeGames, setActiveGames] = useState<GameSession[]>([]);
  const [dashboard, setDashboard] = useState<GameDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // For demo purposes, we'll use the sample game created during backend startup
        const gameData = await getGameSession('sample_game_1');
        setActiveGames([gameData]);

        // Get dashboard data for the sample game
        const dashboardData = await getGameDashboard('sample_game_1');
        setDashboard(dashboardData);
      } catch (error) {
        console.error('Error fetching operator dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const getGameStateLabel = (state: string) => {
    switch (state) {
      case GameState.SETUP:
        return { label: 'Setup', color: 'bg-gray-100 text-gray-800' };
      case GameState.YEAR_PLANNING:
        return { label: 'Year Planning', color: 'bg-blue-100 text-blue-800' };
      case GameState.BIDDING_OPEN:
        return { label: 'Bidding Open', color: 'bg-green-100 text-green-800' };
      case GameState.MARKET_CLEARING:
        return { label: 'Market Clearing', color: 'bg-yellow-100 text-yellow-800' };
      case GameState.YEAR_COMPLETE:
        return { label: 'Year Complete', color: 'bg-purple-100 text-purple-800' };
      case GameState.GAME_COMPLETE:
        return { label: 'Game Complete', color: 'bg-red-100 text-red-800' };
      default:
        return { label: 'Unknown', color: 'bg-gray-100 text-gray-800' };
    }
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Operator Dashboard</h1>
        <p className="mt-1 text-gray-500">Manage your electricity market simulations</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <svg className="animate-spin h-8 w-8 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {dashboard && (
              <>
                <StatCard
                  title="Current Simulation Year"
                  value={dashboard.game_session.current_year}
                  description={`Years remaining: ${dashboard.game_session.years_remaining}`}
                  icon={<ClockIcon className="h-6 w-6 text-primary-600" />}
                />
                <StatCard
                  title="Peak Demand"
                  value={`${Math.round(dashboard.current_demand_mw.peak)} MW`}
                  description="Highest demand period"
                  icon={<BoltIcon className="h-6 w-6 text-amber-500" />}
                />
                <StatCard
                  title="Total Capacity"
                  value={`${Math.round(dashboard.market_stats.total_capacity_mw)} MW`}
                  description={`Capacity margin: ${Math.round(dashboard.market_stats.capacity_margin)}%`}
                  icon={<BoltIcon className="h-6 w-6 text-green-600" />}
                />
                <StatCard
                  title="Active Utilities"
                  value={dashboard.participants.total_utilities}
                  description="Student groups participating"
                  icon={<UsersIcon className="h-6 w-6 text-secondary-600" />}
                />
              </>
            )}
          </div>

          <div className="mb-6">
            <Card title="Active Game Sessions">
              {activeGames.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-gray-500 mb-4">No active game sessions found.</p>
                  <Button onClick={() => navigate('/operator/game-setup')}>
                    Create New Game Session
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Current Year
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Period
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          State
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {activeGames.map((game) => {
                        const stateInfo = getGameStateLabel(game.state);
                        
                        return (
                          <tr key={game.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{game.name}</div>
                              <div className="text-sm text-gray-500">{game.start_year} - {game.end_year}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {game.current_year}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              Year {game.current_year - game.start_year + 1} of {game.end_year - game.start_year + 1}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${stateInfo.color}`}>
                                {stateInfo.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <Button 
                                variant="primary" 
                                size="sm" 
                                onClick={() => navigate(`/operator/game/${game.id}`)}
                              >
                                Manage
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title="Recent Market Activity">
              {dashboard && dashboard.recent_results.length > 0 ? (
                <div className="flow-root">
                  <ul className="-my-5 divide-y divide-gray-200">
                    {dashboard.recent_results.map((result, index) => (
                      <li key={index} className="py-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-md bg-primary-100 flex items-center justify-center">
                              <BoltIcon className="h-6 w-6 text-primary-600" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              Year {result.year} - {result.period.replace('_', ' ').toUpperCase()}
                            </p>
                            <p className="text-sm text-gray-500 truncate">
                              Clearing price: ${result.clearing_price.toFixed(2)}/MWh
                            </p>
                          </div>
                          <div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {Math.round(result.cleared_quantity)} MW
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-gray-500">No market results available yet.</p>
                </div>
              )}
            </Card>

            <Card title="Instructor Controls">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Game Management</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button onClick={() => navigate('/operator/game-setup')}>
                      New Game Session
                    </Button>
                    {dashboard && (
                      <Button 
                        variant="secondary"
                        onClick={() => navigate(`/operator/analytics/${dashboard.game_session.id}`)}
                      >
                        View Market Analytics
                      </Button>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Educational Resources</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="ghost" className="border border-gray-300">
                      Market Tutorial
                    </Button>
                    <Button variant="ghost" className="border border-gray-300">
                      Bidding Strategies
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </AppLayout>
  );
}
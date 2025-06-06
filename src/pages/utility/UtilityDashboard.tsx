import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatCard from '../../components/ui/StatCard';
import { useAuth } from '../../contexts/AuthContext';
import { getGameDashboard, getMarketResults, getPowerPlants } from '../../services/gameService';
import { ClockIcon, BoltIcon, BanknotesIcon, BuildingLibraryIcon } from '@heroicons/react/24/outline';
import { GameDashboard, PowerPlant, MarketResult } from '../../types';
import toast from 'react-hot-toast';

// For demo, we're using the sample game
const DEMO_GAME_ID = 'sample_game_1';

export default function UtilityDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [dashboard, setDashboard] = useState<GameDashboard | null>(null);
  const [myPlants, setMyPlants] = useState<PowerPlant[]>([]);
  const [recentMarkets, setRecentMarkets] = useState<MarketResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        // Get game dashboard
        const dashboardData = await getGameDashboard(DEMO_GAME_ID);
        setDashboard(dashboardData);
        
        // Get utility's plants
        const plants = await getPowerPlants(DEMO_GAME_ID, user.id);
        setMyPlants(plants);
        
        // Get recent market results
        const results = await getMarketResults(DEMO_GAME_ID);
        setRecentMarkets(results.slice(0, 5)); // Show only the 5 most recent
      } catch (error) {
        console.error('Error fetching utility dashboard data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Calculate utility portfolio capacity
  const totalCapacity = myPlants.reduce((sum, plant) => sum + plant.capacity_mw, 0);
  const operatingCapacity = myPlants
    .filter(plant => plant.status === 'operating')
    .reduce((sum, plant) => sum + plant.capacity_mw, 0);

  // Calculate technology mix percentages
  const techMix: Record<string, number> = {};
  myPlants.forEach(plant => {
    const type = plant.plant_type;
    techMix[type] = (techMix[type] || 0) + plant.capacity_mw;
  });

  const getTechColor = (techType: string): string => {
    const colors: Record<string, string> = {
      'coal': '#374151',
      'natural_gas_cc': '#1e40af',
      'natural_gas_ct': '#3b82f6',
      'nuclear': '#047857',
      'solar': '#fbbf24',
      'wind_onshore': '#60a5fa',
      'wind_offshore': '#3b82f6',
      'battery': '#c026d3',
      'hydro': '#06b6d4',
    };
    return colors[techType] || '#9ca3af';
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-64">
          <svg className="animate-spin h-8 w-8 text-primary-600\" xmlns="http://www.w3.org/2000/svg\" fill="none\" viewBox="0 0 24 24">
            <circle className="opacity-25\" cx="12\" cy="12\" r="10\" stroke="currentColor\" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Utility Dashboard</h1>
        <p className="mt-1 text-gray-500">
          Welcome, {user?.username} | Current Game: {dashboard?.game_session.name}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Current Year"
          value={dashboard?.game_session.current_year || '-'}
          description={dashboard?.game_session.state.replace('_', ' ') || ''}
          icon={<ClockIcon className="h-6 w-6 text-primary-600" />}
        />
        <StatCard
          title="Your Generation Capacity"
          value={`${Math.round(operatingCapacity)} MW`}
          description={`${myPlants.filter(p => p.status === 'operating').length} operating plants`}
          icon={<BoltIcon className="h-6 w-6 text-amber-500" />}
        />
        <StatCard
          title="Financial Position"
          value={`$${Math.round((user?.budget || 0) / 1000000)}M`}
          description="Available investment budget"
          icon={<BanknotesIcon className="h-6 w-6 text-green-600" />}
        />
        <StatCard
          title="Market Share"
          value={dashboard && dashboard.market_stats.total_capacity_mw > 0 
            ? `${((operatingCapacity / dashboard.market_stats.total_capacity_mw) * 100).toFixed(1)}%` 
            : '0%'
          }
          description="% of total market capacity"
          icon={<BuildingLibraryIcon className="h-6 w-6 text-secondary-600" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Market Status">
            {dashboard && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center mb-2">
                  <h3 className="font-medium">Current Game Phase: <span className="text-primary-700">{dashboard.game_session.state.replace('_', ' ')}</span></h3>
                </div>
                <p className="text-sm text-gray-600">
                  {getPhaseDescription(dashboard.game_session.state)}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800">Off-Peak Demand</h4>
                <p className="text-xl font-semibold text-blue-900">{Math.round(dashboard?.current_demand_mw.off_peak || 0)} MW</p>
                <p className="text-xs text-blue-600">5000 hours per year</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <h4 className="text-sm font-medium text-yellow-800">Shoulder Demand</h4>
                <p className="text-xl font-semibold text-yellow-900">{Math.round(dashboard?.current_demand_mw.shoulder || 0)} MW</p>
                <p className="text-xs text-yellow-600">2500 hours per year</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <h4 className="text-sm font-medium text-red-800">Peak Demand</h4>
                <p className="text-xl font-semibold text-red-900">{Math.round(dashboard?.current_demand_mw.peak || 0)} MW</p>
                <p className="text-xs text-red-600">1260 hours per year</p>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Market Clearing Prices</h3>
              {recentMarkets.length > 0 ? (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Year</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Period</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Price ($/MWh)</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Volume (MW)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {recentMarkets.map((result, index) => (
                        <tr key={index}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">{result.year}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{result.period.replace('_', ' ')}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 font-medium">${result.clearing_price.toFixed(2)}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{Math.round(result.cleared_quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-4 text-gray-500">No market results available yet</p>
              )}
            </div>
          </Card>
        </div>

        <div>
          <Card title="Your Portfolio">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">Total Capacity:</span>
                <span className="font-semibold">{Math.round(totalCapacity)} MW</span>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Generation Mix</h3>
                <div className="space-y-3">
                  {Object.entries(techMix).map(([tech, capacity]) => (
                    <div key={tech}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{formatTechType(tech)}</span>
                        <span>{Math.round(capacity)} MW ({((capacity / totalCapacity) * 100).toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full" 
                          style={{ 
                            width: `${(capacity / totalCapacity) * 100}%`,
                            backgroundColor: getTechColor(tech)
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                  
                  {Object.keys(techMix).length === 0 && (
                    <p className="text-gray-500 text-center py-2">No generation assets</p>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Button size="sm" onClick={() => navigate(`/utility/plants/${DEMO_GAME_ID}`)}>
                    Manage Plants
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/utility/bidding/${DEMO_GAME_ID}`)}>
                    Submit Bids
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <div className="mt-6">
            <Card title="Market Intelligence">
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-800">Carbon Price</h3>
                  <p className="text-xl font-semibold text-gray-900">${dashboard?.carbon_price}/ton CO₂</p>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-800">Capacity Margin</h3>
                  <p className="text-xl font-semibold text-gray-900">{Math.round(dashboard?.market_stats.capacity_margin || 0)}%</p>
                  <p className="text-xs text-gray-600">
                    {dashboard?.market_stats.capacity_margin && dashboard.market_stats.capacity_margin < 15 
                      ? '⚠️ Low margin - investment opportunity' 
                      : 'Sufficient reserve margin'}
                  </p>
                </div>
                
                <div className="pt-3 border-t border-gray-200">
                  <Button 
                    fullWidth 
                    variant="ghost" 
                    className="border border-gray-300"
                    onClick={() => navigate(`/utility/analytics/${DEMO_GAME_ID}`)}
                  >
                    View Full Market Analytics
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function formatTechType(techType: string): string {
  return techType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getPhaseDescription(gameState: string): string {
  switch (gameState) {
    case 'setup':
      return 'The game is being set up. Wait for the operator to start the simulation.';
    case 'year_planning':
      return 'Plan your investments and prepare for the upcoming year. Consider building new plants.';
    case 'bidding_open':
      return 'Submit bids for all load periods (off-peak, shoulder, peak) for your generating plants.';
    case 'market_clearing':
      return 'Markets are being cleared based on merit order. Results will be available soon.';
    case 'year_complete':
      return 'Year operations have concluded. Review your performance and prepare for the next year.';
    case 'game_complete':
      return 'The simulation has ended. Final rankings and performance analysis are available.';
    default:
      return 'Unknown game state';
  }
}
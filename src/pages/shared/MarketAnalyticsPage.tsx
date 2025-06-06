import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import Card from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import { getMarketResults, getGameSession, getGameDashboard, getMultiYearAnalysis, getPowerPlants } from '../../services/gameService';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement
} from 'chart.js';
import toast from 'react-hot-toast';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface MarketAnalyticsPageProps {
  isOperator: boolean;
}

export default function MarketAnalyticsPage({ isOperator }: MarketAnalyticsPageProps) {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  
  const [marketResults, setMarketResults] = useState<any[]>([]);
  const [game, setGame] = useState<any>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [multiYearData, setMultiYearData] = useState<any>(null);
  const [plants, setPlants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!gameId) return;
      
      try {
        // Get game session data
        const gameData = await getGameSession(gameId);
        setGame(gameData);
        
        // Get dashboard
        const dashboardData = await getGameDashboard(gameId);
        setDashboard(dashboardData);
        
        // Get all market results
        const resultsData = await getMarketResults(gameId);
        setMarketResults(resultsData);
        
        // Get multi-year analysis
        try {
          const multiYearAnalysis = await getMultiYearAnalysis(gameId);
          setMultiYearData(multiYearAnalysis);
        } catch (error) {
          console.log('Multi-year analysis not available yet');
        }
        
        // Get all plants for capacity mix analysis
        const plantsData = await getPowerPlants(gameId);
        setPlants(plantsData);
      } catch (error) {
        console.error('Error fetching market analytics data:', error);
        toast.error('Failed to load market analytics');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [gameId]);

  // Prepare chart data for price trends
  const preparePriceChartData = () => {
    if (!marketResults.length) return null;
    
    // Group results by period
    const periodResults: Record<string, any[]> = {
      off_peak: [],
      shoulder: [],
      peak: []
    };
    
    marketResults.forEach(result => {
      if (periodResults[result.period]) {
        periodResults[result.period].push(result);
      }
    });
    
    // Sort each group by year
    Object.keys(periodResults).forEach(period => {
      periodResults[period].sort((a, b) => a.year - b.year);
    });
    
    // Extract years for labels (unique and sorted)
    const years = [...new Set(marketResults.map(r => r.year))].sort();
    
    // Prepare datasets
    const datasets = [
      {
        label: 'Off-Peak',
        data: years.map(year => {
          const result = periodResults.off_peak.find(r => r.year === year);
          return result ? result.clearing_price : null;
        }),
        borderColor: 'rgb(59, 130, 246)', // blue
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.1
      },
      {
        label: 'Shoulder',
        data: years.map(year => {
          const result = periodResults.shoulder.find(r => r.year === year);
          return result ? result.clearing_price : null;
        }),
        borderColor: 'rgb(245, 158, 11)', // amber
        backgroundColor: 'rgba(245, 158, 11, 0.5)',
        tension: 0.1
      },
      {
        label: 'Peak',
        data: years.map(year => {
          const result = periodResults.peak.find(r => r.year === year);
          return result ? result.clearing_price : null;
        }),
        borderColor: 'rgb(239, 68, 68)', // red
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
        tension: 0.1
      }
    ];
    
    return {
      labels: years.map(y => `Year ${y}`),
      datasets
    };
  };

  // Prepare chart data for capacity mix
  const prepareCapacityMixData = () => {
    if (!plants.length) return null;
    
    // Count plants by type
    const capacityByType: Record<string, number> = {};
    
    plants.forEach(plant => {
      if (plant.status === 'operating' || plant.status === 'maintenance') {
        const type = plant.plant_type;
        capacityByType[type] = (capacityByType[type] || 0) + plant.capacity_mw;
      }
    });
    
    // Colors for different plant types
    const backgroundColors = {
      coal: 'rgba(55, 65, 81, 0.8)', // gray-700
      natural_gas_cc: 'rgba(30, 64, 175, 0.8)', // blue-800
      natural_gas_ct: 'rgba(59, 130, 246, 0.8)', // blue-500
      nuclear: 'rgba(4, 120, 87, 0.8)', // green-700
      solar: 'rgba(251, 191, 36, 0.8)', // amber-400
      wind_onshore: 'rgba(96, 165, 250, 0.8)', // blue-400
      wind_offshore: 'rgba(37, 99, 235, 0.8)', // blue-600
      battery: 'rgba(192, 38, 211, 0.8)', // fuchsia-600
      hydro: 'rgba(6, 182, 212, 0.8)', // cyan-500
      biomass: 'rgba(217, 119, 6, 0.8)', // amber-600
    };
    
    return {
      labels: Object.keys(capacityByType).map(formatTechType),
      datasets: [
        {
          label: 'Capacity (MW)',
          data: Object.values(capacityByType),
          backgroundColor: Object.keys(capacityByType).map(type => 
            backgroundColors[type as keyof typeof backgroundColors] || 'rgba(156, 163, 175, 0.8)'
          ),
          borderWidth: 1
        }
      ]
    };
  };

  const priceChartData = preparePriceChartData();
  const capacityMixData = prepareCapacityMixData();

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
        <h1 className="text-2xl font-bold text-gray-900">Market Analytics</h1>
        <p className="mt-1 text-gray-500">
          {isOperator ? 'Comprehensive market analysis and trends' : 'Analysis of market performance and opportunities'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Price Trends Chart */}
        <Card title="Price Trends by Load Period">
          {priceChartData ? (
            <div className="h-80">
              <Line
                data={priceChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    title: {
                      display: true,
                      text: 'Clearing Prices ($/MWh)'
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          return `${context.dataset.label}: $${context.parsed.y.toFixed(2)}/MWh`;
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      title: {
                        display: true,
                        text: '$/MWh'
                      },
                      beginAtZero: true
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div className="flex justify-center items-center h-64">
              <p className="text-gray-500">No price data available yet</p>
            </div>
          )}
        </Card>

        {/* Capacity Mix Chart */}
        <Card title="Market Generation Mix">
          {capacityMixData ? (
            <div className="h-80">
              <Line
                data={capacityMixData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    title: {
                      display: true,
                      text: 'Generation Capacity by Technology (MW)'
                    },
                    legend: {
                      display: true,
                      position: 'bottom'
                    }
                  },
                  scales: {
                    y: {
                      title: {
                        display: true,
                        text: 'Capacity (MW)'
                      },
                      beginAtZero: true
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div className="flex justify-center items-center h-64">
              <p className="text-gray-500">No capacity data available yet</p>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Market Insights */}
        <div className="lg:col-span-2">
          <Card title="Market Insights">
            {multiYearData ? (
              <div className="space-y-6">
                {/* Trends Section */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Market Trends</h3>
                  {multiYearData.trends && Object.keys(multiYearData.trends).length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-800">Price Trend</h4>
                        <p className="text-xl font-semibold text-blue-900">
                          {multiYearData.trends.price_trend_per_year > 0 ? '+' : ''}
                          ${multiYearData.trends.price_trend_per_year.toFixed(2)}/MWh
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          Average annual change in price
                        </p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-medium text-green-800">Renewable Growth</h4>
                        <p className="text-xl font-semibold text-green-900">
                          {(multiYearData.trends.renewable_growth_per_year * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-green-700 mt-1">
                          Annual increase in renewable penetration
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-2">
                      Trend analysis requires data from multiple years
                    </p>
                  )}
                </div>
                
                {/* Market Events */}
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Market Events</h3>
                  {multiYearData.market_events && multiYearData.market_events.length > 0 ? (
                    <div className="space-y-3">
                      {multiYearData.market_events.map((event: any, index: number) => (
                        <div key={index} className="border-l-4 border-yellow-400 bg-yellow-50 p-4">
                          <div className="flex">
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-yellow-800">{event.type.replace('_', ' ')}</h3>
                              <div className="mt-2 text-sm text-yellow-700">
                                <p>{event.description}</p>
                              </div>
                              <div className="mt-1 text-xs text-yellow-600">
                                <p><strong>Impact:</strong> {event.impact}</p>
                                {event.severity && <p><strong>Severity:</strong> {event.severity}</p>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-2">
                      No market events recorded yet
                    </p>
                  )}
                </div>
                
                {/* Yearly Data */}
                {multiYearData.yearly_data && Object.keys(multiYearData.yearly_data).length > 0 && (
                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Yearly Summary</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Year</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Avg. Price</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Total Energy</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Capacity Util.</th>
                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Renewable %</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {Object.entries(multiYearData.yearly_data).map(([year, data]: [string, any]) => (
                            <tr key={year}>
                              <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">{year}</td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                ${data.average_price.toFixed(2)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                {formatLargeNumber(data.total_energy)} MWh
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                {(data.capacity_utilization * 100).toFixed(1)}%
                              </td>
                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                {(data.renewable_penetration * 100).toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-500">Market analysis will be available once the simulation has progressed.</p>
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card title="Current Market Status">
            {dashboard && (
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700">Current State</h3>
                  <p className="text-lg font-semibold text-gray-900">
                    {dashboard.game_session.state.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Year {dashboard.game_session.current_year} of {dashboard.game_session.end_year}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Market Parameters</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Carbon Price:</span>
                      <span className="font-medium">${dashboard.carbon_price}/ton CO₂</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Capacity Margin:</span>
                      <span className="font-medium">{Math.round(dashboard.market_stats.capacity_margin)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Total Capacity:</span>
                      <span className="font-medium">{Math.round(dashboard.market_stats.total_capacity_mw)} MW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Operating Plants:</span>
                      <span className="font-medium">{dashboard.market_stats.operating_plants}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Peak Demand Forecast</h3>
                  <div className="flex items-center">
                    <svg className="mr-2 h-5 w-5 text-red-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">{Math.round(dashboard.current_demand_mw.peak)} MW</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Growing at 2.0% per year
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {isOperator 
                      ? 'Ensure sufficient capacity is built to meet future demand'
                      : 'Consider investment in new capacity to meet growing demand'}
                  </p>
                </div>
              </div>
            )}
          </Card>

          <div className="mt-6">
            <Card title="Market Concentration">
              <div className="space-y-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Top Plant Types</h3>
                  
                  {/* Calculate capacity by type */}
                  {plants.length > 0 && (
                    (() => {
                      // Count plants by type
                      const capacityByType: Record<string, number> = {};
                      
                      plants.forEach((plant: any) => {
                        if (plant.status === 'operating' || plant.status === 'maintenance') {
                          const type = plant.plant_type;
                          capacityByType[type] = (capacityByType[type] || 0) + plant.capacity_mw;
                        }
                      });
                      
                      // Sort by capacity
                      const sortedTypes = Object.entries(capacityByType)
                        .sort(([, a], [, b]) => b as number - (a as number))
                        .slice(0, 3); // Top 3
                      
                      const totalCapacity = Object.values(capacityByType).reduce((a, b) => a + b, 0);
                      
                      return (
                        <div className="space-y-2">
                          {sortedTypes.map(([type, capacity], index) => (
                            <div key={index}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="font-medium">{formatTechType(type)}</span>
                                <span>{Math.round(capacity as number)} MW ({((capacity as number / totalCapacity) * 100).toFixed(1)}%)</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="h-2 rounded-full" 
                                  style={{ 
                                    width: `${((capacity as number) / totalCapacity) * 100}%`,
                                    backgroundColor: getTechColor(type)
                                  }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  )}
                </div>
                
                <div className="pt-3">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Market Trend Insights</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    <li>Growing demand creates opportunities for new capacity</li>
                    <li>Carbon price supports cleaner generation technologies</li>
                    <li>Peak period prices exhibit highest volatility</li>
                    <li>Renewable generation increasing market share annually</li>
                    <li>Long lead times for nuclear and coal affect planning</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function formatLargeNumber(num: number): string {
  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(1)}B`;
  } else if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

function formatTechType(techType: string): string {
  return techType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getTechColor(techType: string): string {
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
    'biomass': '#d97706'
  };
  return colors[techType] || '#9ca3af';
}
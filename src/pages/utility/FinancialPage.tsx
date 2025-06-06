import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import { useAuth } from '../../contexts/AuthContext';
import { getInvestmentAnalysis, getPowerPlants, getYearlySummary, getMarketResults } from '../../services/gameService';
import { InvestmentAnalysis, PowerPlant, MarketResult } from '../../types';
import { BanknotesIcon, ScaleIcon, BuildingLibraryIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function FinancialPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  
  const [investment, setInvestment] = useState<InvestmentAnalysis | null>(null);
  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const [results, setResults] = useState<MarketResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  
  // Estimated annual financials
  const [annualRevenue, setAnnualRevenue] = useState(0);
  const [annualCosts, setAnnualCosts] = useState(0);
  const [annualProfit, setAnnualProfit] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!gameId || !user) return;
      
      try {
        // Get investment analysis
        const investmentData = await getInvestmentAnalysis(gameId, user.id);
        setInvestment(investmentData);
        
        // Get power plants
        const plantsData = await getPowerPlants(gameId, user.id);
        setPlants(plantsData);
        
        // Get yearly results for estimating revenue
        try {
          const yearlyData = await getYearlySummary(gameId, currentYear);
          // Process yearly data if available
        } catch (error) {
          console.log('No yearly summary available yet');
        }
        
        // Get market results
        const resultsData = await getMarketResults(gameId);
        setResults(resultsData);
        
        // Calculate estimated annual financials
        calculateFinancials(plantsData, resultsData, investmentData);
      } catch (error) {
        console.error('Error fetching financial data:', error);
        toast.error('Failed to load financial data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [gameId, user, currentYear]);

  const calculateFinancials = (plants: PowerPlant[], results: MarketResult[], investment: InvestmentAnalysis | null) => {
    if (!plants.length || !results.length || !investment) return;
    
    // Group results by period
    const resultsByPeriod: Record<string, MarketResult[]> = {
      off_peak: [],
      shoulder: [],
      peak: []
    };
    
    results.forEach(result => {
      if (resultsByPeriod[result.period]) {
        resultsByPeriod[result.period].push(result);
      }
    });
    
    // Get most recent result for each period
    const latestResults: Record<string, MarketResult | undefined> = {
      off_peak: resultsByPeriod.off_peak.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0],
      shoulder: resultsByPeriod.shoulder.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0],
      peak: resultsByPeriod.peak.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
    };
    
    // Calculate revenue based on clearing prices and plant capacities
    let totalRevenue = 0;
    let totalGeneration = 0;
    
    // Operating plants only
    const operatingPlants = plants.filter(p => p.status === 'operating');
    
    // Average capacity factor for rough estimate
    const avgCapacityFactor = operatingPlants.reduce((sum, p) => sum + p.capacity_factor, 0) / operatingPlants.length || 0.5;
    
    // Period hours
    const periodHours = {
      off_peak: 5000,
      shoulder: 2500,
      peak: 1260
    };
    
    // Estimate revenue from each period
    Object.entries(latestResults).forEach(([period, result]) => {
      if (result) {
        // Simplified calculation assuming all capacity clears at market price
        const hours = periodHours[period as keyof typeof periodHours];
        const totalCapacity = operatingPlants.reduce((sum, p) => sum + p.capacity_mw, 0);
        
        // Assume we capture market share proportional to our capacity
        const marketShare = totalCapacity / (result.cleared_quantity || 1);
        const estimatedGeneration = Math.min(totalCapacity * avgCapacityFactor * hours, result.cleared_quantity * marketShare * hours);
        
        totalGeneration += estimatedGeneration;
        totalRevenue += estimatedGeneration * result.clearing_price;
      }
    });
    
    // Annual costs from investment data
    const annualFixedCosts = investment.current_portfolio.annual_fixed_costs;
    
    // Variable costs (rough estimate)
    const avgVariableCost = operatingPlants.reduce((sum, p) => sum + p.variable_om_per_mwh, 0) / operatingPlants.length || 20;
    const variableCosts = totalGeneration * avgVariableCost;
    
    // Total costs
    const totalCosts = annualFixedCosts + variableCosts;
    
    // Profit
    const profit = totalRevenue - totalCosts;
    
    setAnnualRevenue(totalRevenue);
    setAnnualCosts(totalCosts);
    setAnnualProfit(profit);
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
        <h1 className="text-2xl font-bold text-gray-900">Financial Management</h1>
        <p className="mt-1 text-gray-500">Track your utility's financial performance and investment capacity</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard
          title="Annual Revenue (Est.)"
          value={`$${formatLargeNumber(annualRevenue)}`}
          icon={<BanknotesIcon className="h-6 w-6 text-green-600" />}
          className="bg-green-50"
        />
        <StatCard
          title="Annual Costs (Est.)"
          value={`$${formatLargeNumber(annualCosts)}`}
          icon={<ScaleIcon className="h-6 w-6 text-red-600" />}
          className="bg-red-50"
        />
        <StatCard
          title="Annual Profit (Est.)"
          value={`$${formatLargeNumber(annualProfit)}`}
          trend={annualProfit > 0 ? { value: 100, isPositive: true } : { value: 100, isPositive: false }}
          icon={<BuildingLibraryIcon className="h-6 w-6 text-blue-600" />}
          className="bg-blue-50"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Financial Position">
            {investment ? (
              <div>
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Balance Sheet Overview</h3>
                  <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Category</th>
                          <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        <tr>
                          <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900">Assets</td>
                          <td className="px-3 py-4 text-sm text-gray-900 text-right">
                            ${formatLargeNumber(investment.current_portfolio.total_capital_invested)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-4 pl-4 pr-3 text-sm text-gray-500">Power Plants ({investment.current_portfolio.plant_count})</td>
                          <td className="px-3 py-4 text-sm text-gray-500 text-right">
                            ${formatLargeNumber(investment.current_portfolio.total_capital_invested)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900">Liabilities</td>
                          <td className="px-3 py-4 text-sm text-gray-900 text-right">
                            ${formatLargeNumber(investment.financial_position.current_debt)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-4 pl-4 pr-3 text-sm text-gray-500">Long-term Debt</td>
                          <td className="px-3 py-4 text-sm text-gray-500 text-right">
                            ${formatLargeNumber(investment.financial_position.current_debt)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900">Equity</td>
                          <td className="px-3 py-4 text-sm text-gray-900 text-right">
                            ${formatLargeNumber(investment.financial_position.current_equity)}
                          </td>
                        </tr>
                        <tr className="bg-gray-50">
                          <td className="py-4 pl-4 pr-3 text-sm font-semibold text-gray-900">Available Budget</td>
                          <td className="px-3 py-4 text-sm font-semibold text-gray-900 text-right">
                            ${formatLargeNumber(investment.financial_position.available_budget)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Key Financial Metrics</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700">Debt-to-Equity Ratio</h4>
                      <p className="mt-1 text-2xl font-semibold text-gray-900">
                        {investment.financial_position.debt_to_equity_ratio.toFixed(2)}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {investment.financial_position.debt_to_equity_ratio > 2 ? 
                          '⚠️ High ratio - consider reducing debt' : 
                          'Healthy debt level'}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-700">Investment Capacity</h4>
                      <p className="mt-1 text-2xl font-semibold text-gray-900">
                        ${formatLargeNumber(investment.financial_position.available_investment_capacity)}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Maximum capacity including potential debt
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-500">Unable to load financial data</p>
              </div>
            )}
          </Card>
          
          <div className="mt-6">
            <Card title="Annual Fixed Costs">
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium text-gray-700">Total Annual Fixed O&M</h3>
                    <span className="font-medium text-lg">
                      ${formatLargeNumber(investment?.current_portfolio.annual_fixed_costs || 0)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    These costs must be paid regardless of how much you generate
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Fixed Costs by Plant</h3>
                  
                  {plants.length > 0 ? (
                    <div className="space-y-2">
                      {plants.map(plant => (
                        <div key={plant.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                          <div>
                            <span className="font-medium text-gray-900">{plant.name}</span>
                            <span className="ml-2 text-xs text-gray-500">
                              ({plant.capacity_mw} MW {formatTechType(plant.plant_type)})
                            </span>
                          </div>
                          <span className="font-medium">${formatLargeNumber(plant.fixed_om_annual)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-4 text-gray-500">No plants in portfolio</p>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div>
          <Card title="Financial Insights">
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-800 mb-2">Financial Health</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Debt-to-Equity Ratio</p>
                    <div className="mt-1 w-full bg-blue-200 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${getRatioColor(investment?.financial_position.debt_to_equity_ratio || 0)}`} 
                        style={{ 
                          width: `${Math.min(100, ((investment?.financial_position.debt_to_equity_ratio || 0) / 3) * 100)}%`
                        }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span>0.0</span>
                      <span>1.0</span>
                      <span>2.0</span>
                      <span>3.0+</span>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-sm text-blue-600">
                  {getFinancialHealthMessage(investment?.financial_position.debt_to_equity_ratio || 0)}
                </p>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg">
                <h3 className="font-medium text-yellow-800 mb-2">Profit Outlook</h3>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm text-yellow-700">Fixed Costs Coverage:</span>
                    <span className="font-medium">
                      {annualRevenue > 0 && investment?.current_portfolio.annual_fixed_costs
                        ? ((annualRevenue / investment.current_portfolio.annual_fixed_costs) * 100).toFixed(0) + '%'
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-yellow-700">Operating Margin:</span>
                    <span className="font-medium">
                      {annualRevenue > 0
                        ? ((annualProfit / annualRevenue) * 100).toFixed(1) + '%'
                        : 'N/A'}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-sm text-yellow-600">
                  {getProfitOutlookMessage(annualRevenue, annualProfit)}
                </p>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h3 className="font-medium text-gray-700 mb-2">Strategic Recommendations</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  {investment?.recommendations.map((rec, index) => (
                    <li key={index} className="flex">
                      <span className="text-primary-600 mr-2">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          <div className="mt-6">
            <Card title="Technology ROI Analysis">
              <div className="space-y-3">
                {investment?.investment_opportunities.map((opportunity, index) => (
                  opportunity.example_100mw_analysis && (
                    <div key={index} className="border border-gray-200 p-3 rounded hover:bg-gray-50">
                      <h3 className="font-medium text-gray-900">{opportunity.name}</h3>
                      <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
                        <div>
                          <span className="text-gray-500">ROI Estimate: </span>
                          <span className="font-medium">
                            {opportunity.example_100mw_analysis.annual_profit_estimate > 0 
                              ? ((opportunity.example_100mw_analysis.annual_profit_estimate / opportunity.example_100mw_analysis.total_capex) * 100).toFixed(1) + '%'
                              : 'Negative'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Payback: </span>
                          <span className="font-medium">
                            {opportunity.example_100mw_analysis.simple_payback_years < 99
                              ? `${opportunity.example_100mw_analysis.simple_payback_years.toFixed(1)} years`
                              : 'Never'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                ))}
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
  return num.toFixed(0);
}

function formatTechType(techType: string): string {
  return techType
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getRatioColor(ratio: number): string {
  if (ratio < 1.0) return 'bg-green-500';
  if (ratio < 1.5) return 'bg-lime-500';
  if (ratio < 2.0) return 'bg-yellow-500';
  if (ratio < 2.5) return 'bg-orange-500';
  return 'bg-red-500';
}

function getFinancialHealthMessage(ratio: number): string {
  if (ratio < 1.0) return 'Excellent financial position with low debt.';
  if (ratio < 1.5) return 'Good financial health with manageable debt.';
  if (ratio < 2.0) return 'Moderate debt level, but still acceptable.';
  if (ratio < 2.5) return 'High debt level, consider limiting new investments.';
  return 'Very high debt ratio. Focus on reducing debt before new investments.';
}

function getProfitOutlookMessage(revenue: number, profit: number): string {
  if (revenue === 0) return 'No market operations yet. Submit bids to start generating revenue.';
  
  if (profit <= 0) return 'Currently operating at a loss. Consider optimizing your bidding strategy or plant mix.';
  
  const margin = (profit / revenue) * 100;
  if (margin < 5) return 'Thin profit margins. Consider increasing bid prices or reducing costs.';
  if (margin < 15) return 'Moderate profit margins, in line with industry standards.';
  return 'Excellent profit margins, your strategy is working well!';
}
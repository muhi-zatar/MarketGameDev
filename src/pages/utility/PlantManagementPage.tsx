import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { getPowerPlants, getPlantTemplates, getInvestmentAnalysis, createPowerPlant, getPlantEconomics, getFuelPrices } from '../../services/gameService';
import { PowerPlant, PlantTemplate, InvestmentAnalysis, PlantEconomics } from '../../types';
import toast from 'react-hot-toast';
import { Dialog } from '@headlessui/react';

export default function PlantManagementPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  
  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const [plantTemplates, setPlantTemplates] = useState<PlantTemplate[]>([]);
  const [investment, setInvestment] = useState<InvestmentAnalysis | null>(null);
  const [selectedPlant, setSelectedPlant] = useState<PowerPlant | null>(null);
  const [plantEconomics, setPlantEconomics] = useState<PlantEconomics | null>(null);
  const [fuelPrices, setFuelPrices] = useState<any | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isNewPlantModalOpen, setIsNewPlantModalOpen] = useState(false);
  const [isPlantDetailsModalOpen, setIsPlantDetailsModalOpen] = useState(false);
  
  // Form state for new plant
  const [newPlant, setNewPlant] = useState({
    name: '',
    plantType: '',
    capacityMw: 100,
    constructionStartYear: new Date().getFullYear(),
    commissioning: 0,
    retirement: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!gameId || !user) return;
      
      try {
        // Get user's plants
        const plantsData = await getPowerPlants(gameId, user.id);
        setPlants(plantsData);
        
        // Get plant templates for investment
        const templatesData = await getPlantTemplates();
        setPlantTemplates(templatesData);
        
        // Get investment analysis
        const investmentData = await getInvestmentAnalysis(gameId, user.id);
        setInvestment(investmentData);
        
        // Get current fuel prices
        const fuelPricesData = await getFuelPrices(gameId, new Date().getFullYear());
        setFuelPrices(fuelPricesData);
      } catch (error) {
        console.error('Error fetching plant data:', error);
        toast.error('Failed to load plant data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [gameId, user]);

  const handleOpenNewPlantModal = () => {
    setIsNewPlantModalOpen(true);
    // Reset form when opening modal
    setNewPlant({
      name: '',
      plantType: '',
      capacityMw: 100,
      constructionStartYear: new Date().getFullYear(),
      commissioning: 0,
      retirement: 0,
    });
  };

  const handlePlantTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedType = e.target.value;
    setNewPlant({
      ...newPlant,
      plantType: selectedType,
    });
    
    // Find the template for this plant type to set defaults
    const template = plantTemplates.find(t => t.plant_type === selectedType);
    if (template) {
      const constructionStart = new Date().getFullYear();
      const commissioning = constructionStart + template.construction_time_years;
      const retirement = commissioning + template.economic_life_years;
      
      setNewPlant(prev => ({
        ...prev,
        plantType: selectedType,
        constructionStartYear: constructionStart,
        commissioning: commissioning,
        retirement: retirement,
      }));
    }
  };

  const handleCreatePlant = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!gameId || !user || !newPlant.plantType) {
      toast.error('Missing required information');
      return;
    }
    
    // Validate form
    if (!newPlant.name.trim()) {
      toast.error('Plant name is required');
      return;
    }
    
    if (newPlant.capacityMw <= 0) {
      toast.error('Capacity must be greater than zero');
      return;
    }
    
    try {
      console.log("Creating plant with data:", {
        name: newPlant.name,
        plant_type: newPlant.plantType,
        capacity_mw: newPlant.capacityMw,
        construction_start_year: newPlant.constructionStartYear,
        commissioning_year: newPlant.commissioning,
        retirement_year: newPlant.retirement
      });
      
      const plantData = {
        name: newPlant.name,
        plant_type: newPlant.plantType,
        capacity_mw: newPlant.capacityMw,
        construction_start_year: newPlant.constructionStartYear,
        commissioning_year: newPlant.commissioning,
        retirement_year: newPlant.retirement
      };
      
      const response = await createPowerPlant(gameId, user.id, plantData);
      console.log("Plant creation response:", response);
      
      toast.success(`Successfully created ${newPlant.name}`);
      setIsNewPlantModalOpen(false);
      
      // Refresh plants list
      const updatedPlants = await getPowerPlants(gameId, user.id);
      setPlants(updatedPlants);
      
      // Refresh investment analysis
      const investmentData = await getInvestmentAnalysis(gameId, user.id);
      setInvestment(investmentData);
    } catch (error) {
      console.error('Error creating plant:', error);
      toast.error('Failed to create new plant');
    }
  };

  const handlePlantDetails = async (plant: PowerPlant) => {
    setSelectedPlant(plant);
    
    try {
      const economics = await getPlantEconomics(gameId!, plant.id, new Date().getFullYear());
      setPlantEconomics(economics);
    } catch (error) {
      console.error('Error fetching plant economics:', error);
      toast.error('Failed to load plant economic details');
    }
    
    setIsPlantDetailsModalOpen(true);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'operating':
        return 'bg-green-100 text-green-800';
      case 'under_construction':
        return 'bg-yellow-100 text-yellow-800';
      case 'maintenance':
        return 'bg-orange-100 text-orange-800';
      case 'retired':
        return 'bg-red-100 text-red-800';
      case 'planned':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-64">
          <svg className="animate-spin h-8 w-8 text-primary-600\" xmlns=\"http://www.w3.org/2000/svg\" fill=\"none\" viewBox=\"0 0 24 24">
            <circle className="opacity-25\" cx=\"12\" cy=\"12\" r=\"10\" stroke=\"currentColor\" strokeWidth=\"4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Power Plant Management</h1>
            <p className="mt-1 text-gray-500">Manage your generation portfolio and investments</p>
          </div>
          <Button onClick={handleOpenNewPlantModal}>Build New Plant</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Your Power Plants">
            {plants.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500 mb-4">No power plants in your portfolio.</p>
                <Button onClick={handleOpenNewPlantModal}>
                  Build Your First Plant
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Plant
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Capacity
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Timeline
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {plants.map((plant) => (
                      <tr key={plant.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handlePlantDetails(plant)}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{plant.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{formatTechType(plant.plant_type)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{plant.capacity_mw} MW</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(plant.status)}`}>
                            {formatStatus(plant.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {plant.commissioning_year} - {plant.retirement_year}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button 
                            className="text-primary-600 hover:text-primary-900"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlantDetails(plant);
                            }}
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card title="Financial Overview">
            {investment ? (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Investment Capacity</h3>
                  <div className="text-2xl font-semibold text-gray-900">
                    ${formatLargeNumber(investment.financial_position.available_budget)}
                  </div>
                  <div className="text-sm text-gray-500">
                    Available investment budget
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Financial Position</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Current Equity:</span>
                      <span className="text-sm font-medium">${formatLargeNumber(investment.financial_position.current_equity)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Current Debt:</span>
                      <span className="text-sm font-medium">${formatLargeNumber(investment.financial_position.current_debt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Debt-to-Equity Ratio:</span>
                      <span className="text-sm font-medium">{investment.financial_position.debt_to_equity_ratio.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Current Portfolio</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Total Capacity:</span>
                      <span className="text-sm font-medium">{Math.round(investment.current_portfolio.total_capacity_mw)} MW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Plants:</span>
                      <span className="text-sm font-medium">{investment.current_portfolio.plant_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Annual Fixed Costs:</span>
                      <span className="text-sm font-medium">${formatLargeNumber(investment.current_portfolio.annual_fixed_costs)}/year</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex justify-center items-center h-48">
                <p className="text-gray-500">Loading financial data...</p>
              </div>
            )}
          </Card>

          {fuelPrices && (
            <div className="mt-6">
              <Card title="Current Fuel Prices">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Coal:</span>
                    <span className="font-medium">${fuelPrices.fuel_prices.coal.toFixed(2)}/{fuelPrices.units}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Natural Gas:</span>
                    <span className="font-medium">${fuelPrices.fuel_prices.natural_gas.toFixed(2)}/{fuelPrices.units}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Uranium:</span>
                    <span className="font-medium">${fuelPrices.fuel_prices.uranium.toFixed(2)}/{fuelPrices.units}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Year: {fuelPrices.year}
                    <br />
                    Note: Prices vary with market conditions and may change in future years.
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* New Plant Modal */}
      {isNewPlantModalOpen && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleCreatePlant}>
                <div className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <Dialog.Title as="h3" className="text-lg leading-6 font-medium text-gray-900">
                        Build New Power Plant
                      </Dialog.Title>
                      <div className="mt-4">
                        <div className="space-y-4">
                          <div>
                            <label htmlFor="plantName" className="block text-sm font-medium text-gray-700">
                              Plant Name
                            </label>
                            <input
                              type="text"
                              id="plantName"
                              value={newPlant.name}
                              onChange={(e) => setNewPlant({...newPlant, name: e.target.value})}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                              placeholder="e.g., Coastal Wind Farm"
                              required
                            />
                          </div>

                          <div>
                            <label htmlFor="plantType" className="block text-sm font-medium text-gray-700">
                              Plant Type
                            </label>
                            <select
                              id="plantType"
                              value={newPlant.plantType}
                              onChange={handlePlantTypeChange}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                              required
                            >
                              <option value="">Select plant type...</option>
                              {plantTemplates.map(template => (
                                <option key={template.plant_type} value={template.plant_type}>
                                  {template.name} ({formatConstructionTime(template.construction_time_years)})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label htmlFor="capacity" className="block text-sm font-medium text-gray-700">
                              Capacity (MW)
                            </label>
                            <input
                              type="number"
                              id="capacity"
                              value={newPlant.capacityMw}
                              onChange={(e) => setNewPlant({...newPlant, capacityMw: parseInt(e.target.value) || 0})}
                              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                              min="1"
                              max="2000"
                              required
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <label htmlFor="constructionStart" className="block text-sm font-medium text-gray-700">
                                Construction
                              </label>
                              <input
                                type="number"
                                id="constructionStart"
                                value={newPlant.constructionStartYear}
                                onChange={(e) => setNewPlant({...newPlant, constructionStartYear: parseInt(e.target.value) || new Date().getFullYear()})}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                min="2020"
                                required
                              />
                            </div>
                            <div>
                              <label htmlFor="commissioning" className="block text-sm font-medium text-gray-700">
                                Commission
                              </label>
                              <input
                                type="number"
                                id="commissioning"
                                value={newPlant.commissioning}
                                onChange={(e) => setNewPlant({...newPlant, commissioning: parseInt(e.target.value) || 0})}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                required
                              />
                            </div>
                            <div>
                              <label htmlFor="retirement" className="block text-sm font-medium text-gray-700">
                                Retirement
                              </label>
                              <input
                                type="number"
                                id="retirement"
                                value={newPlant.retirement}
                                onChange={(e) => setNewPlant({...newPlant, retirement: parseInt(e.target.value) || 0})}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                required
                              />
                            </div>
                          </div>

                          {newPlant.plantType && plantTemplates.find(t => t.plant_type === newPlant.plantType) && (
                            <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
                              <h4 className="font-medium text-gray-900 mb-1">Plant Economics:</h4>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Capital Cost:</span>
                                  <span className="font-medium">
                                    ${formatLargeNumber(newPlant.capacityMw * 1000 * (plantTemplates.find(t => t.plant_type === newPlant.plantType)?.overnight_cost_per_kw || 0))}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Construction:</span>
                                  <span className="font-medium">
                                    {plantTemplates.find(t => t.plant_type === newPlant.plantType)?.construction_time_years} years
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Fixed O&M:</span>
                                  <span className="font-medium">
                                    ${formatLargeNumber(newPlant.capacityMw * 1000 * (plantTemplates.find(t => t.plant_type === newPlant.plantType)?.fixed_om_per_kw_year || 0))}/yr
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Capacity Factor:</span>
                                  <span className="font-medium">
                                    {((plantTemplates.find(t => t.plant_type === newPlant.plantType)?.capacity_factor_base || 0) * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <Button
                    type="submit"
                    className="w-full sm:w-auto sm:ml-3"
                  >
                    Build Plant
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="mt-3 w-full sm:mt-0 sm:w-auto"
                    onClick={() => setIsNewPlantModalOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Plant Details Modal */}
      {isPlantDetailsModalOpen && selectedPlant && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">{selectedPlant.name}</h3>
                  <div className="mt-2">
                    <div className="bg-gray-50 p-3 rounded-lg mb-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Type</p>
                          <p className="font-medium">{formatTechType(selectedPlant.plant_type)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Capacity</p>
                          <p className="font-medium">{selectedPlant.capacity_mw} MW</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Status</p>
                          <p>
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(selectedPlant.status)}`}>
                              {formatStatus(selectedPlant.status)}
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Capacity Factor</p>
                          <p className="font-medium">{(selectedPlant.capacity_factor * 100).toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Timeline</h4>
                      <div className="flex justify-between space-x-4">
                        <div className="flex-1">
                          <p className="text-xs text-gray-500">Construction</p>
                          <p className="font-medium">{selectedPlant.construction_start_year}</p>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500">Commissioning</p>
                          <p className="font-medium">{selectedPlant.commissioning_year}</p>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500">Retirement</p>
                          <p className="font-medium">{selectedPlant.retirement_year}</p>
                        </div>
                      </div>
                    </div>
                    
                    {plantEconomics && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Economics</h4>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-gray-500">Marginal Cost</p>
                              <p className="font-medium">${plantEconomics.marginal_cost_per_mwh.toFixed(2)}/MWh</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Annual Generation</p>
                              <p className="font-medium">{Math.round(plantEconomics.annual_generation_mwh).toLocaleString()} MWh</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Annual Fixed Costs</p>
                              <p className="font-medium">${formatLargeNumber(plantEconomics.annual_fixed_costs)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Annual Variable Costs</p>
                              <p className="font-medium">${formatLargeNumber(plantEconomics.annual_variable_costs)}</p>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <div className="flex justify-between">
                              <p className="text-xs font-medium text-gray-600">Total Annual Cost</p>
                              <p className="font-medium">${formatLargeNumber(plantEconomics.annual_total_costs)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsPlantDetailsModalOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
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

function formatStatus(status: string): string {
  return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function formatConstructionTime(years: number): string {
  return years === 1 ? '1 year' : `${years} years`;
}
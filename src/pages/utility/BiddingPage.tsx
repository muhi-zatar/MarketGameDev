import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { getPowerPlants, getGameSession, getYearlyBids, submitYearlyBid, getFuelPrices } from '../../services/gameService';
import { PowerPlant, GameSession, YearlyBid } from '../../types';
import toast from 'react-hot-toast';

export default function BiddingPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();
  
  const [plants, setPlants] = useState<PowerPlant[]>([]);
  const [game, setGame] = useState<GameSession | null>(null);
  const [existingBids, setExistingBids] = useState<YearlyBid[]>([]);
  const [fuelPrices, setFuelPrices] = useState<any | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Bidding form state
  const [currentPlant, setCurrentPlant] = useState<PowerPlant | null>(null);
  const [bidForm, setBidForm] = useState({
    off_peak_quantity: 0,
    shoulder_quantity: 0,
    peak_quantity: 0,
    off_peak_price: 0,
    shoulder_price: 0,
    peak_price: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!gameId || !user) return;
      
      try {
        // Get game data
        const gameData = await getGameSession(gameId);
        setGame(gameData);
        
        // Get operating plants
        const plantsData = await getPowerPlants(gameId, user.id);
        const operatingPlants = plantsData.filter(p => p.status === 'operating');
        setPlants(operatingPlants);
        
        // Get existing bids
        const bidsData = await getYearlyBids(gameId, gameData.current_year, user.id);
        setExistingBids(bidsData);
        
        // Get fuel prices for the current year
        const fuelPricesData = await getFuelPrices(gameId, gameData.current_year);
        setFuelPrices(fuelPricesData);
        
        // Select the first plant by default if available
        if (operatingPlants.length > 0) {
          setCurrentPlant(operatingPlants[0]);
          
          // Check if there's an existing bid for this plant
          const existingBid = bidsData.find(b => b.plant_id === operatingPlants[0].id);
          if (existingBid) {
            setBidForm({
              off_peak_quantity: existingBid.off_peak_quantity,
              shoulder_quantity: existingBid.shoulder_quantity,
              peak_quantity: existingBid.peak_quantity,
              off_peak_price: existingBid.off_peak_price,
              shoulder_price: existingBid.shoulder_price,
              peak_price: existingBid.peak_price
            });
          } else {
            // Set default values based on plant capacity
            const capacity = operatingPlants[0].capacity_mw;
            setBidForm({
              off_peak_quantity: capacity,
              shoulder_quantity: capacity,
              peak_quantity: capacity,
              off_peak_price: estimateMarginalCost(operatingPlants[0]),
              shoulder_price: estimateMarginalCost(operatingPlants[0]) * 1.2, // 20% markup for shoulder
              peak_price: estimateMarginalCost(operatingPlants[0]) * 1.5  // 50% markup for peak
            });
          }
        }
      } catch (error) {
        console.error('Error fetching bidding data:', error);
        toast.error('Failed to load bidding data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [gameId, user]);

  const handlePlantChange = (plantId: string) => {
    const plant = plants.find(p => p.id === plantId);
    if (!plant) return;
    
    setCurrentPlant(plant);
    
    // Check if there's an existing bid for this plant
    const existingBid = existingBids.find(b => b.plant_id === plantId);
    if (existingBid) {
      setBidForm({
        off_peak_quantity: existingBid.off_peak_quantity,
        shoulder_quantity: existingBid.shoulder_quantity,
        peak_quantity: existingBid.peak_quantity,
        off_peak_price: existingBid.off_peak_price,
        shoulder_price: existingBid.shoulder_price,
        peak_price: existingBid.peak_price
      });
    } else {
      // Set default values based on plant capacity
      const capacity = plant.capacity_mw;
      setBidForm({
        off_peak_quantity: capacity,
        shoulder_quantity: capacity,
        peak_quantity: capacity,
        off_peak_price: estimateMarginalCost(plant),
        shoulder_price: estimateMarginalCost(plant) * 1.2,
        peak_price: estimateMarginalCost(plant) * 1.5
      });
    }
  };

  const handleSubmitBid = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!gameId || !user || !currentPlant || !game) return;
    
    setIsSubmitting(true);
    
    try {
      const bidData = {
        plant_id: currentPlant.id,
        year: game.current_year,
        ...bidForm
      };
      
      await submitYearlyBid(gameId, user.id, bidData);
      
      toast.success(`Bid submitted successfully for ${currentPlant.name}`);
      
      // Refresh bids
      const bidsData = await getYearlyBids(gameId, game.current_year, user.id);
      setExistingBids(bidsData);
    } catch (error) {
      console.error('Error submitting bid:', error);
      toast.error('Failed to submit bid');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to estimate marginal cost
  const estimateMarginalCost = (plant: PowerPlant): number => {
    // Base variable O&M
    let marginalCost = plant.variable_om_per_mwh;
    
    // Add fuel cost if plant has heat rate and fuel type
    if (plant.heat_rate && plant.fuel_type && fuelPrices) {
      const fuelPrice = fuelPrices.fuel_prices[plant.fuel_type];
      if (fuelPrice) {
        const fuelCost = (plant.heat_rate * fuelPrice) / 1000; // Convert BTU to MMBTU
        marginalCost += fuelCost;
      }
    }
    
    // Add carbon cost (simplified calculation)
    const carbonPrice = game?.carbon_price_per_ton || 50; // Default $50/ton
    let carbonEmissions = 0;
    
    switch(plant.plant_type) {
      case 'coal':
        carbonEmissions = 0.95;
        break;
      case 'natural_gas_cc':
        carbonEmissions = 0.35;
        break;
      case 'natural_gas_ct':
        carbonEmissions = 0.55;
        break;
      default:
        carbonEmissions = 0;
    }
    
    marginalCost += carbonEmissions * carbonPrice;
    
    return Math.round(marginalCost);
  };

  // Check if bidding is allowed
  const canSubmitBids = game?.state === 'bidding_open';

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
        <h1 className="text-2xl font-bold text-gray-900">Bidding Management</h1>
        <p className="mt-1 text-gray-500">Submit bids for your power plants in the electricity market</p>
      </div>

      {!canSubmitBids && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Bidding is currently closed.</strong> Bids can only be submitted when the market is in the bidding phase. Current phase: {game?.state.replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Submit Bids">
            {plants.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500">You don't have any operating plants that can submit bids.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitBid}>
                <div className="mb-4">
                  <label htmlFor="plantSelect" className="block text-sm font-medium text-gray-700 mb-1">
                    Select Power Plant
                  </label>
                  <select
                    id="plantSelect"
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                    value={currentPlant?.id || ''}
                    onChange={(e) => handlePlantChange(e.target.value)}
                    disabled={!canSubmitBids}
                  >
                    {plants.map(plant => (
                      <option key={plant.id} value={plant.id}>
                        {plant.name} - {plant.capacity_mw} MW {formatTechType(plant.plant_type)}
                      </option>
                    ))}
                  </select>
                </div>

                {currentPlant && (
                  <div className="bg-gray-50 p-4 rounded-md mb-6">
                    <h3 className="font-medium text-gray-900">Plant Details</h3>
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Capacity: </span>
                        <span className="font-medium">{currentPlant.capacity_mw} MW</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Type: </span>
                        <span className="font-medium">{formatTechType(currentPlant.plant_type)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Capacity Factor: </span>
                        <span className="font-medium">{(currentPlant.capacity_factor * 100).toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Est. Marginal Cost: </span>
                        <span className="font-medium">${estimateMarginalCost(currentPlant)}/MWh</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Off-Peak Period (5000 hours/year)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="offPeakQuantity" className="block text-sm font-medium text-gray-700">
                        Quantity (MW)
                      </label>
                      <input
                        type="number"
                        id="offPeakQuantity"
                        value={bidForm.off_peak_quantity}
                        onChange={(e) => setBidForm({...bidForm, off_peak_quantity: parseFloat(e.target.value)})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        min="0"
                        max={currentPlant?.capacity_mw || 0}
                        step="0.1"
                        disabled={!canSubmitBids}
                      />
                    </div>
                    <div>
                      <label htmlFor="offPeakPrice" className="block text-sm font-medium text-gray-700">
                        Price ($/MWh)
                      </label>
                      <input
                        type="number"
                        id="offPeakPrice"
                        value={bidForm.off_peak_price}
                        onChange={(e) => setBidForm({...bidForm, off_peak_price: parseFloat(e.target.value)})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        min="0"
                        step="0.1"
                        disabled={!canSubmitBids}
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Shoulder Period (2500 hours/year)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="shoulderQuantity" className="block text-sm font-medium text-gray-700">
                        Quantity (MW)
                      </label>
                      <input
                        type="number"
                        id="shoulderQuantity"
                        value={bidForm.shoulder_quantity}
                        onChange={(e) => setBidForm({...bidForm, shoulder_quantity: parseFloat(e.target.value)})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        min="0"
                        max={currentPlant?.capacity_mw || 0}
                        step="0.1"
                        disabled={!canSubmitBids}
                      />
                    </div>
                    <div>
                      <label htmlFor="shoulderPrice" className="block text-sm font-medium text-gray-700">
                        Price ($/MWh)
                      </label>
                      <input
                        type="number"
                        id="shoulderPrice"
                        value={bidForm.shoulder_price}
                        onChange={(e) => setBidForm({...bidForm, shoulder_price: parseFloat(e.target.value)})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        min="0"
                        step="0.1"
                        disabled={!canSubmitBids}
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Peak Period (1260 hours/year)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="peakQuantity" className="block text-sm font-medium text-gray-700">
                        Quantity (MW)
                      </label>
                      <input
                        type="number"
                        id="peakQuantity"
                        value={bidForm.peak_quantity}
                        onChange={(e) => setBidForm({...bidForm, peak_quantity: parseFloat(e.target.value)})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        min="0"
                        max={currentPlant?.capacity_mw || 0}
                        step="0.1"
                        disabled={!canSubmitBids}
                      />
                    </div>
                    <div>
                      <label htmlFor="peakPrice" className="block text-sm font-medium text-gray-700">
                        Price ($/MWh)
                      </label>
                      <input
                        type="number"
                        id="peakPrice"
                        value={bidForm.peak_price}
                        onChange={(e) => setBidForm({...bidForm, peak_price: parseFloat(e.target.value)})}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        min="0"
                        step="0.1"
                        disabled={!canSubmitBids}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    isLoading={isSubmitting}
                    disabled={!canSubmitBids || isSubmitting}
                  >
                    Submit Bid
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>

        <div>
          <Card title="Bidding Strategy Guide">
            <div className="space-y-4 text-sm">
              <div className="p-3 bg-primary-50 rounded-lg">
                <h3 className="font-medium text-primary-700 mb-1">Optimal Bidding Practices</h3>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>Price at or above your marginal cost</li>
                  <li>Consider peak hours for higher pricing</li>
                  <li>Account for startup and shutdown costs</li>
                  <li>Analyze competitors' likely strategies</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-700 mb-1">Cost Components</h3>
                <p className="text-gray-600 mb-2">Your marginal cost includes:</p>
                <ul className="space-y-1 text-gray-600">
                  <li>• Fuel costs (for thermal plants)</li>
                  <li>• Variable O&M costs</li>
                  <li>• Carbon costs ($50/ton CO₂)</li>
                </ul>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <h3 className="font-medium text-gray-700 mb-1">Load Periods</h3>
                <div className="space-y-2">
                  <div>
                    <p className="font-medium">Off-Peak (5000 hours)</p>
                    <p className="text-gray-600">Night and weekend hours, typically lower prices</p>
                  </div>
                  <div>
                    <p className="font-medium">Shoulder (2500 hours)</p>
                    <p className="text-gray-600">Transition hours, moderate prices</p>
                  </div>
                  <div>
                    <p className="font-medium">Peak (1260 hours)</p>
                    <p className="text-gray-600">Highest demand hours, premium prices</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="mt-6">
            <Card title="Submitted Bids">
              {existingBids.length > 0 ? (
                <div className="space-y-3">
                  {existingBids.map(bid => {
                    const bidPlant = plants.find(p => p.id === bid.plant_id);
                    return (
                      <div key={bid.id} className="border border-gray-200 p-3 rounded-lg hover:bg-gray-50">
                        <div className="font-medium text-gray-900">{bidPlant?.name || 'Unknown Plant'}</div>
                        <div className="mt-1 grid grid-cols-3 gap-1 text-sm">
                          <div>
                            <span className="text-gray-500">Off-Peak: </span>
                            <span>${bid.off_peak_price.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Shoulder: </span>
                            <span>${bid.shoulder_price.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Peak: </span>
                            <span>${bid.peak_price.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          Submitted: {new Date(bid.timestamp).toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center py-4 text-gray-500">No bids submitted for the current year</p>
              )}
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
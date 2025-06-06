import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { createGameSession, getScenarios, createScenarioGame } from '../../services/gameService';
import toast from 'react-hot-toast';

export default function GameSetupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [gameName, setGameName] = useState('');
  const [startYear, setStartYear] = useState(2025);
  const [endYear, setEndYear] = useState(2035);
  const [carbonPrice, setCarbonPrice] = useState(50);
  const [isLoading, setIsLoading] = useState(false);
  const [scenarios, setScenarios] = useState<any>({});
  const [isLoadingScenarios, setIsLoadingScenarios] = useState(true);

  // Fetch available scenarios
  useState(() => {
    const fetchScenarios = async () => {
      try {
        const result = await getScenarios();
        setScenarios(result.scenarios);
      } catch (error) {
        console.error('Error fetching scenarios:', error);
        toast.error('Failed to load game scenarios');
      } finally {
        setIsLoadingScenarios(false);
      }
    };

    fetchScenarios();
  });

  const handleCreateCustomGame = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const gameData = await createGameSession(
        gameName,
        user.id,
        startYear,
        endYear
      );
      
      toast.success('Game session created successfully!');
      navigate(`/operator/game/${gameData.id}`);
    } catch (error) {
      console.error('Error creating game session:', error);
      toast.error('Failed to create game session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateScenarioGame = async (scenarioName: string) => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const result = await createScenarioGame(scenarioName, user.id);
      toast.success('Game scenario created successfully!');
      
      // In a real app, you would create a session with this template
      // For now, navigate to the sample game
      navigate(`/operator/game/sample_game_1`);
    } catch (error) {
      console.error('Error creating scenario game:', error);
      toast.error('Failed to create scenario game');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Game Setup</h1>
        <p className="mt-1 text-gray-500">Configure a new electricity market simulation</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Create Custom Game">
          <form onSubmit={handleCreateCustomGame} className="space-y-4">
            <div>
              <label htmlFor="gameName" className="block text-sm font-medium text-gray-700">
                Game Name
              </label>
              <input
                type="text"
                name="gameName"
                id="gameName"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                placeholder="e.g., Advanced Market Simulation Spring 2025"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startYear" className="block text-sm font-medium text-gray-700">
                  Start Year
                </label>
                <input
                  type="number"
                  name="startYear"
                  id="startYear"
                  value={startYear}
                  onChange={(e) => setStartYear(parseInt(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  min="2020"
                  max="2050"
                  required
                />
              </div>
              <div>
                <label htmlFor="endYear" className="block text-sm font-medium text-gray-700">
                  End Year
                </label>
                <input
                  type="number"
                  name="endYear"
                  id="endYear"
                  value={endYear}
                  onChange={(e) => setEndYear(parseInt(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  min={startYear + 1}
                  max="2100"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="carbonPrice" className="block text-sm font-medium text-gray-700">
                Carbon Price ($/ton CO₂)
              </label>
              <input
                type="number"
                name="carbonPrice"
                id="carbonPrice"
                value={carbonPrice}
                onChange={(e) => setCarbonPrice(parseInt(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                min="0"
                max="500"
              />
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                fullWidth
                isLoading={isLoading}
              >
                Create Game Session
              </Button>
            </div>
          </form>
        </Card>

        <Card title="Predefined Scenarios">
          {isLoadingScenarios ? (
            <div className="flex justify-center items-center h-64">
              <svg className="animate-spin h-8 w-8 text-primary-600\" xmlns="http://www.w3.org/2000/svg\" fill="none\" viewBox="0 0 24 24">
                <circle className="opacity-25\" cx="12\" cy="12\" r="10\" stroke="currentColor\" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(scenarios).map(([id, scenario]: [string, any]) => (
                <div key={id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <h3 className="font-medium text-gray-900">{scenario.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{scenario.description}</p>
                  <div className="mt-2 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {scenario.generator_count} Generators
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {scenario.complexity}
                      </span>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => handleCreateScenarioGame(id)}
                      isLoading={isLoading}
                    >
                      Use Template
                    </Button>
                  </div>
                </div>
              ))}

              {Object.keys(scenarios).length === 0 && (
                <div className="text-center py-6">
                  <p className="text-gray-500">No predefined scenarios available.</p>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Quick Setup">
          <div className="text-center py-4">
            <p className="text-gray-500 mb-4">
              Already created a game? You can start the demo session that was automatically created during server startup.
            </p>
            <Button
              onClick={() => navigate('/operator/game/sample_game_1')}
            >
              Open Demo Session (2025-2035)
            </Button>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
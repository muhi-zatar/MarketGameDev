import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OperatorDashboard from './pages/operator/OperatorDashboard';
import GameSetupPage from './pages/operator/GameSetupPage';
import GameManagementPage from './pages/operator/GameManagementPage';
import UtilityDashboard from './pages/utility/UtilityDashboard';
import PlantManagementPage from './pages/utility/PlantManagementPage';
import BiddingPage from './pages/utility/BiddingPage';
import FinancialPage from './pages/utility/FinancialPage';
import MarketAnalyticsPage from './pages/shared/MarketAnalyticsPage';

function AuthenticatedRoutes() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" />;

  return (
    <Routes>
      {/* Operator Routes */}
      {user.userType === 'operator' && (
        <>
          <Route path="/operator" element={<OperatorDashboard />} />
          <Route path="/operator/game-setup" element={<GameSetupPage />} />
          <Route path="/operator/game/:gameId" element={<GameManagementPage />} />
          <Route path="/operator/analytics/:gameId" element={<MarketAnalyticsPage isOperator={true} />} />
        </>
      )}

      {/* Utility Routes */}
      {user.userType === 'utility' && (
        <>
          <Route path="/utility" element={<UtilityDashboard />} />
          <Route path="/utility/game/:gameId" element={<Navigate to={`/utility/game/${user.id}`} />} />
          <Route path="/utility/plants/:gameId" element={<PlantManagementPage />} />
          <Route path="/utility/bidding/:gameId" element={<BiddingPage />} />
          <Route path="/utility/finances/:gameId" element={<FinancialPage />} />
          <Route path="/utility/analytics/:gameId" element={<MarketAnalyticsPage isOperator={false} />} />
        </>
      )}

      {/* Shared Routes */}
      <Route path="*" element={<Navigate to={user.userType === 'operator' ? '/operator' : '/utility'} />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/*" element={<AuthenticatedRoutes />} />
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
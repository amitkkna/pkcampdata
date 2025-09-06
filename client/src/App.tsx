import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import CampaignDetail from './components/CampaignDetail';
import CreateCampaign from './components/CreateCampaign';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
        {/* Header with glass effect */}
        <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-white/20 sticky top-0 z-50">
          <div className="container py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Campaign Reporting Generator
                </h1>
                <p className="text-gray-600 text-sm mt-2 font-medium">
                  Professional campaign management and reporting solution
                </p>
              </div>
              <div className="hidden md:flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>System Online</span>
                </div>
                {/* Auth removed */}
              </div>
            </div>
          </div>
        </header>

        {/* Main content with improved spacing */}
        <main className="container py-8">
          <div className="max-w-6xl mx-auto">
            <ErrorBoundary>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/campaign/:id" element={<CampaignDetail />} />
                <Route path="/create-campaign" element={<CreateCampaign />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ErrorBoundary>
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-16 bg-white/50 backdrop-blur-md border-t border-white/20">
          <div className="container py-6 text-center text-gray-600 text-sm">
            <p>&copy; 2025 Your Agency. Campaign Reporting Generator v1.0</p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;

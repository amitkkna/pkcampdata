import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { campaignApi, visitApi } from '../services/api';
import type { Campaign, Visit } from '../../../shared/types';
import VisitForm from './VisitForm';
import VisitList from './VisitList';
import ReportGenerator from './ReportGenerator';

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVisitForm, setShowVisitForm] = useState(false);

  useEffect(() => {
    if (id) {
      loadCampaignData();
    }
  }, [id]);

  const loadCampaignData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const [campaignData, visitsData] = await Promise.all([
        campaignApi.getById(id),
        visitApi.getByCampaign(id)
      ]);
      setCampaign(campaignData);
      setVisits(visitsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaign data');
    } finally {
      setLoading(false);
    }
  };

  const handleVisitCreated = (newVisit: Visit) => {
    setVisits(prev => [newVisit, ...prev]);
    setShowVisitForm(false);
  };

  const handleVisitUpdated = (updatedVisit: Visit) => {
    setVisits(prev => prev.map(v => v.id === updatedVisit.id ? updatedVisit : v));
  };

  const handleVisitDeleted = (visitId: string) => {
    setVisits(prev => prev.filter(v => v.id !== visitId));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600 text-lg font-medium">Loading campaign details...</div>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <div className="bg-red-50 border-l-4 border-red-400 rounded-lg p-6 shadow-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <div className="text-red-800 font-medium">{error || 'Campaign not found'}</div>
              <Link 
                to="/" 
                className="mt-3 inline-block text-red-600 hover:text-red-700 underline font-medium"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const campaignStatus = new Date(campaign.endDate) >= new Date() ? 'Active' : 'Completed';
  const campaignDuration = Math.ceil((new Date(campaign.endDate).getTime() - new Date(campaign.startDate).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-8">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-2 text-sm">
        <Link to="/" className="text-blue-600 hover:text-blue-700 font-medium">Dashboard</Link>
        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-500">{campaign.name}</span>
      </nav>

      {/* Campaign Header */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6">
          <div className="flex justify-between items-start">
            <div className="text-white">
              <h1 className="text-3xl font-bold mb-2">{campaign.name}</h1>
              <div className="flex items-center space-x-4 text-blue-100">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>{campaign.clientName}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{campaignDuration} days</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                campaignStatus === 'Active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {campaignStatus}
              </span>
              <Link 
                to="/" 
                className="bg-white/20 hover:bg-white/30 text-white font-medium py-2 px-4 rounded-xl transition-colors duration-200"
              >
                ← Back
              </Link>
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{visits.length}</div>
              <div className="text-gray-500 font-medium">Total Visits</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {new Date(campaign.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              <div className="text-gray-500 font-medium">Start Date</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {new Date(campaign.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              <div className="text-gray-500 font-medium">End Date</div>
            </div>
          </div>

          {campaign.description && (
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Campaign Description</h4>
              <p className="text-gray-700">{campaign.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Report Generation Section */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-6">
          <div className="text-white">
            <h3 className="text-xl font-bold mb-2">📊 Generate Reports</h3>
            <p className="text-emerald-100">Create professional PDF reports and PowerPoint presentations</p>
          </div>
        </div>
        <div className="p-8">
          <ReportGenerator campaign={campaign} visits={visits} />
        </div>
      </div>

      {/* Visits Management Section */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gray-50 px-8 py-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Campaign Visits</h3>
              <p className="text-gray-600 mt-1">Track and manage all visits for this campaign</p>
            </div>
            <button
              onClick={() => setShowVisitForm(!showVisitForm)}
              className={`font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center space-x-2 ${
                showVisitForm 
                  ? 'bg-gray-500 hover:bg-gray-600 text-white' 
                  : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
              }`}
            >
              {showVisitForm ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Cancel</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add New Visit</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="p-8">
          {showVisitForm && (
            <div className="mb-8 bg-blue-50 rounded-xl p-6 border border-blue-200">
              <h4 className="text-lg font-semibold text-blue-900 mb-4">Add New Visit</h4>
              <VisitForm
                campaignId={campaign.id}
                onVisitCreated={handleVisitCreated}
                onCancel={() => setShowVisitForm(false)}
              />
            </div>
          )}

          {visits.length === 0 && !showVisitForm ? (
            <div className="text-center py-12">
              <div className="mx-auto h-24 w-24 text-gray-400 mb-6">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-2">No visits recorded yet</h3>
              <p className="text-gray-600 mb-6">Start tracking campaign visits to generate comprehensive reports</p>
              <button
                onClick={() => setShowVisitForm(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 inline-flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Record First Visit</span>
              </button>
            </div>
          ) : (
            <VisitList
              visits={visits}
              onVisitUpdated={handleVisitUpdated}
              onVisitDeleted={handleVisitDeleted}
            />
          )}
        </div>
      </div>
    </div>
  );
}

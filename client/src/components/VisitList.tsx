import { useState } from 'react';
import { visitApi } from '../services/api';
import type { Visit } from '../../../shared/types';
import VisitForm from './VisitForm';

interface VisitListProps {
  visits: Visit[];
  onVisitUpdated: (visit: Visit) => void;
  onVisitDeleted: (visitId: string) => void;
}

export default function VisitList({ visits, onVisitUpdated, onVisitDeleted }: VisitListProps) {
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteVisit = async (visitId: string) => {
    if (!window.confirm('Are you sure you want to delete this visit?')) {
      return;
    }

    try {
      setDeletingId(visitId);
      await visitApi.delete(visitId);
      onVisitDeleted(visitId);
    } catch (error) {
      console.error('Failed to delete visit:', error);
      alert('Failed to delete visit. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (visits.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No visits recorded yet. Add your first visit above.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {editingVisit && (
        <VisitForm
          campaignId={editingVisit.campaignId}
          visit={editingVisit}
          onVisitUpdated={(updatedVisit) => {
            onVisitUpdated(updatedVisit);
            setEditingVisit(null);
          }}
          onCancel={() => setEditingVisit(null)}
        />
      )}

      <div className="grid gap-4">
        {visits.map((visit) => (
          <div key={visit.id} className="card p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-lg font-medium text-gray-900">
                    {formatDate(visit.date)}
                  </span>
                  <span className="text-sm text-gray-500">
                    {formatTime(visit.date)}
                  </span>
                </div>
                <p className="text-gray-700 mb-1">
                  <strong>Location:</strong> {visit.location}
                </p>
                {visit.notes && (
                  <p className="text-gray-600 text-sm">
                    <strong>Notes:</strong> {visit.notes}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setEditingVisit(visit)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteVisit(visit.id)}
                  disabled={deletingId === visit.id}
                  className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                >
                  {deletingId === visit.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>

            {/* Display photos if any exist */}
            {(visit.photoUrl1 || visit.photoUrl2 || visit.photoUrl3 || visit.photoUrl4) && (
              <div className="mt-3">
                <div className="text-sm text-gray-500 mb-2">
                  Photos:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {[visit.photoUrl1, visit.photoUrl2, visit.photoUrl3, visit.photoUrl4]
                    .filter(Boolean)
                    .map((photoUrl, index) => (
                      <div key={index} className="relative">
                        <img
                          src={photoUrl!}
                          alt={`Visit to ${visit.location} - Photo ${index + 1}`}
                          className="w-full h-32 object-cover rounded-md border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => {
                            // Open photo in new tab for larger view
                            window.open(photoUrl!, '_blank');
                          }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const errorDiv = target.nextElementSibling as HTMLElement;
                            if (errorDiv) {
                              errorDiv.classList.remove('hidden');
                            }
                          }}
                        />
                        <div className="hidden text-xs text-gray-500 italic text-center p-2 border border-gray-200 rounded-md bg-gray-50">
                          Photo {index + 1} could not be loaded
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

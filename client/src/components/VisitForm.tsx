import { useState } from 'react';
import { visitApi } from '../services/api';
import type { CreateVisitRequest, Visit } from '../../../shared/types';

interface VisitFormProps {
  campaignId: string;
  visit?: Visit;
  onVisitCreated?: (visit: Visit) => void;
  onVisitUpdated?: (visit: Visit) => void;
  onCancel: () => void;
}

export default function VisitForm({
  campaignId,
  visit,
  onVisitCreated,
  onVisitUpdated,
  onCancel,
}: VisitFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [formData, setFormData] = useState<CreateVisitRequest>({
    date: visit ? visit.date.split('T')[0] : new Date().toISOString().split('T')[0],
    location: visit?.location || '',
    notes: visit?.notes || '',
    campaignId,
  });

  const isEditing = !!visit;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.date || !formData.location) {
      setError('Date and location are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      if (isEditing && visit) {
        // For updates, pass the photos array
        const updatedVisit = await visitApi.update(visit.id, formData, photos.length > 0 ? photos : undefined);
        onVisitUpdated?.(updatedVisit);
      } else {
        // For new visits, pass the photos array
        const newVisit = await visitApi.create(formData, photos.length > 0 ? photos : undefined);
        onVisitCreated?.(newVisit);
      }
      
      onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save visit');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length > 4) {
      setError('You can only upload up to 4 photos');
      return;
    }
    
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Each photo must be smaller than 10MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select only image files');
        return;
      }
    }
    
    setPhotos(files);
    setError(null);
  };

  return (
    <div className="card p-4">
      <h4 className="text-lg font-medium text-gray-900 mb-4">
        {isEditing ? 'Edit Visit' : 'Add New Visit'}
      </h4>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <div className="text-red-800 text-sm">{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
              Visit Date *
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              className="input-field"
              required
            />
          </div>

          <div>
            <label htmlFor="photo" className="block text-sm font-medium text-gray-700 mb-1">
              Photos {!isEditing && '(Optional, up to 4 photos)'}
            </label>
            <input
              type="file"
              id="photo"
              accept="image/*"
              multiple
              onChange={handlePhotoChange}
              className="input-field"
            />
            {photos.length > 0 && (
              <div className="text-sm text-gray-500 mt-1">
                Selected {photos.length} photo{photos.length > 1 ? 's' : ''}:
                <ul className="list-disc list-inside mt-1">
                  {photos.map((file, index) => (
                    <li key={index} className="truncate">{file.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            Location Details *
          </label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            className="input-field"
            placeholder="Enter address or site description"
            required
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            className="input-field"
            rows={3}
            placeholder="Any additional comments or observations"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Saving...' : (isEditing ? 'Update Visit' : 'Add Visit')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

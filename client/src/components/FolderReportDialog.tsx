import React, { useState } from 'react';
import { X, FileText, Presentation } from 'lucide-react';
import type { Folder } from '../../../shared/types';

interface FolderReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  folder: Folder;
  onGenerateReport: (
    reportType: 'pdf' | 'ppt',
    selectedPhotoIds: string[],
    photosPerPage: number
  ) => Promise<void>;
}

const FolderReportDialog: React.FC<FolderReportDialogProps> = ({
  isOpen,
  onClose,
  folder,
  onGenerateReport,
}) => {
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>(
    folder.photos.map(photo => photo.id)
  );
  const [photosPerPage, setPhotosPerPage] = useState<number>(8); // Default to 8 for maximum photos per page
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const togglePhotoSelection = (photoId: string) => {
    setSelectedPhotoIds(prev =>
      prev.includes(photoId)
        ? prev.filter(id => id !== photoId)
        : [...prev, photoId]
    );
  };

  const selectAllPhotos = () => {
    setSelectedPhotoIds(folder.photos.map(photo => photo.id));
  };

  const clearAllPhotos = () => {
    setSelectedPhotoIds([]);
  };

  const handleGenerateReport = async (reportType: 'pdf' | 'ppt') => {
    if (selectedPhotoIds.length === 0) {
      alert('Please select at least one photo for the report.');
      return;
    }

    setIsGenerating(true);
    try {
      await onGenerateReport(reportType, selectedPhotoIds, photosPerPage);
      onClose();
    } catch (error) {
      console.error('Error generating report:', error);
      alert(`Error generating report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const photosPerPageOptions = [1, 2, 3, 4, 6, 8];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Generate Report - {folder.name}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
            disabled={isGenerating}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Photos Per Page Configuration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photos Per Page
            </label>
            <div className="flex flex-wrap gap-2">
              {photosPerPageOptions.map(option => (
                <button
                  key={option}
                  onClick={() => setPhotosPerPage(option)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium ${
                    photosPerPage === option
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                  disabled={isGenerating}
                >
                  {option} photo{option > 1 ? 's' : ''}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Selected: {photosPerPage} photo{photosPerPage > 1 ? 's' : ''} per page
              {selectedPhotoIds.length > 0 && (
                <span> • Total pages: {Math.ceil(selectedPhotoIds.length / photosPerPage)}</span>
              )}
            </p>
          </div>

          {/* Photo Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Select Photos ({selectedPhotoIds.length} of {folder.photos.length} selected)
              </label>
              <div className="flex gap-2">
                <button
                  onClick={selectAllPhotos}
                  className="text-sm text-blue-600 hover:text-blue-800"
                  disabled={isGenerating}
                >
                  Select All
                </button>
                <button
                  onClick={clearAllPhotos}
                  className="text-sm text-gray-600 hover:text-gray-800"
                  disabled={isGenerating}
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto border rounded-lg p-4">
              {folder.photos.map((photo) => (
                <div key={photo.id} className="relative">
                  <div
                    className={`border rounded-lg overflow-hidden cursor-pointer transition-all ${
                      selectedPhotoIds.includes(photo.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => togglePhotoSelection(photo.id)}
                  >
                    <img
                      src={photo.photoUrl}
                      alt={photo.filename}
                      className="w-full h-24 object-cover"
                    />
                    <div className="p-2">
                      <p className="text-xs text-gray-600 truncate" title={photo.filename}>
                        {photo.filename}
                      </p>
                    </div>
                    
                    {/* Selection indicator */}
                    <div className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center ${
                      selectedPhotoIds.includes(photo.id)
                        ? 'bg-blue-500 text-white'
                        : 'bg-white border-2 border-gray-300'
                    }`}>
                      {selectedPhotoIds.includes(photo.id) && (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Generate Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={isGenerating}
            >
              Cancel
            </button>
            
            <button
              onClick={() => handleGenerateReport('pdf')}
              disabled={isGenerating || selectedPhotoIds.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <FileText className="w-4 h-4" />
              {isGenerating ? 'Generating...' : 'Generate PDF'}
            </button>
            
            <button
              onClick={() => handleGenerateReport('ppt')}
              disabled={isGenerating || selectedPhotoIds.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Presentation className="w-4 h-4" />
              {isGenerating ? 'Generating...' : 'Generate PowerPoint'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FolderReportDialog;
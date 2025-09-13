import React, { useState, useEffect } from 'react';
import { Camera, Upload, FolderPlus, FileImage, Trash2 } from 'lucide-react';
import type { Folder, FolderPhoto, Campaign } from '../../../shared/types';
import { folderApi } from '../services/api';
import FolderReportDialog from './FolderReportDialog';

interface FolderManagementProps {
  campaign: Campaign;
  onGenerateReport?: (
    folderId: string, 
    reportType: 'pdf' | 'ppt', 
    selectedPhotoIds: string[], 
    photosPerPage: number
  ) => void;
}

const FolderManagement: React.FC<FolderManagementProps> = ({ campaign, onGenerateReport }) => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderLocation, setNewFolderLocation] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);

  useEffect(() => {
    fetchFolders();
  }, [campaign.id]);

  const fetchFolders = async () => {
    try {
      const fetchedFolders = await folderApi.getByCampaign(campaign.id);
      setFolders(fetchedFolders);
      if (fetchedFolders.length > 0 && !activeFolder) {
        setActiveFolder(fetchedFolders[0].id);
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !newFolderLocation.trim()) {
      return;
    }

    try {
      console.log('Creating folder:', { name: newFolderName, location: newFolderLocation, campaignId: campaign.id });
      const newFolder = await folderApi.create({
        name: newFolderName,
        location: newFolderLocation,
        campaignId: campaign.id,
      });
      console.log('Folder created:', newFolder);

      setFolders(prev => [...prev, newFolder]);
      setActiveFolder(newFolder.id);
      setShowCreateFolder(false);
      setNewFolderName('');
      setNewFolderLocation('');
    } catch (error) {
      console.error('Error creating folder:', error);
      alert(`Error creating folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handlePhotoUpload = async (folderId: string, files: FileList) => {
    if (!files.length) return;

    setUploading(true);
    try {
      const folder = folders.find(f => f.id === folderId);
      if (!folder) return;

      const filesArray = Array.from(files);
      const uploadedPhotos = await folderApi.uploadPhotos(
        folderId,
        filesArray
      );

      // Update folder with new photos
      setFolders(prev => prev.map(f => 
        f.id === folderId 
          ? { ...f, photos: [...f.photos, ...uploadedPhotos] }
          : f
      ));
    } catch (error) {
      console.error('Error uploading photos:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!window.confirm('Are you sure you want to delete this photo? This action cannot be undone.')) {
      return;
    }

    try {
      await folderApi.deletePhoto(photoId);

      // Update folders state to remove the deleted photo
      setFolders(prev => prev.map(folder => ({
        ...folder,
        photos: folder.photos.filter(photo => photo.id !== photoId)
      })));
    } catch (error) {
      console.error('Error deleting photo:', error);
      alert('Failed to delete photo. Please try again.');
    }
  };

  const getPhotoCount = (folder: Folder) => folder.photos.length;

  const handleGenerateReport = async (
    reportType: 'pdf' | 'ppt',
    selectedPhotoIds: string[],
    photosPerPage: number
  ) => {
    if (!activeFolder || !onGenerateReport) return;
    
    try {
      await onGenerateReport(activeFolder, reportType, selectedPhotoIds, photosPerPage);
    } catch (error) {
      console.error('Error generating report:', error);
      throw error; // Re-throw to let dialog handle the error
    }
  };

  const activeFolder_data = folders.find(f => f.id === activeFolder);

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Location-Based Photo Management
          </h3>
          <button
            onClick={() => setShowCreateFolder(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <FolderPlus className="h-4 w-4" />
            New Folder
          </button>
        </div>
      </div>

      {/* Folder Tabs */}
      <div className="border-b">
        <div className="flex overflow-x-auto">
          {folders.map(folder => (
            <button
              key={folder.id}
              onClick={() => setActiveFolder(folder.id)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeFolder === folder.id
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {folder.name} ({getPhotoCount(folder)})
            </button>
          ))}
        </div>
      </div>

      {/* Create Folder Modal */}
      {showCreateFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h4 className="text-lg font-semibold mb-4">Create New Folder</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Folder Name
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g., Bemetara"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={newFolderLocation}
                  onChange={(e) => setNewFolderLocation(e.target.value)}
                  placeholder="e.g., Bemetara"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || !newFolderLocation.trim()}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300"
              >
                Create Folder
              </button>
              <button
                onClick={() => setShowCreateFolder(false)}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Folder Content */}
      {activeFolder_data && (
        <div className="p-4">
          {/* Photo Upload Area */}
          <div className="mb-6">
            <label className="block">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 cursor-pointer transition-colors">
                <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 mb-1">
                  Drop photos here or click to upload
                </p>
                <p className="text-xs text-gray-500">
                  Photos will be named: {activeFolder_data.location}-{campaign.name}-{new Date().toISOString().split('T')[0]}
                </p>
              </div>
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files && activeFolder && handlePhotoUpload(activeFolder, e.target.files)}
                disabled={uploading}
              />
            </label>
          </div>

          {/* Photos Grid */}
          {activeFolder_data.photos.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Uploaded Photos ({activeFolder_data.photos.length})
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {activeFolder_data.photos.map((photo: FolderPhoto) => (
                  <div key={photo.id} className="relative group">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={photo.photoUrl}
                        alt={photo.filename}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity rounded-lg flex items-center justify-center">
                      <button 
                        onClick={() => handleDeletePhoto(photo.id)}
                        className="opacity-0 group-hover:opacity-100 text-white hover:text-red-300 transition-opacity"
                        title="Delete photo"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 truncate" title={photo.filename}>
                      {photo.filename}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generate Reports */}
          {activeFolder_data.photos.length > 0 && onGenerateReport && (
            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={() => setShowReportDialog(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <FileImage className="h-4 w-4" />
                Generate Report
              </button>
            </div>
          )}

          {/* Empty State */}
          {activeFolder_data.photos.length === 0 && (
            <div className="text-center py-8">
              <Camera className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <h4 className="text-sm font-medium text-gray-900 mb-2">No photos yet</h4>
              <p className="text-sm text-gray-500">
                Upload photos to this folder to get started
              </p>
            </div>
          )}
        </div>
      )}

      {/* Loading state */}
      {uploading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Uploading photos...</p>
          </div>
        </div>
      )}

      {/* Report Generation Dialog */}
      {activeFolder_data && (
        <FolderReportDialog
          isOpen={showReportDialog}
          onClose={() => setShowReportDialog(false)}
          folder={activeFolder_data}
          onGenerateReport={handleGenerateReport}
        />
      )}
    </div>
  );
};

export default FolderManagement;
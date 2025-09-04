import { useState } from 'react';
import type { Campaign, Visit } from '../../../shared/types';

interface ReportPreviewProps {
  campaign: Campaign;
  visits: Visit[];
  selectedDate?: string;
  reportType: 'pdf' | 'powerpoint';
  onClose: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
}

export default function ReportPreview({ 
  visits, 
  selectedDate, 
  reportType, 
  onClose, 
  onGenerate, 
  isGenerating 
}: ReportPreviewProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const onImgError = (url: string) => setImgErrors((m) => ({ ...m, [url]: true }));
  const PreviewImg = ({ src, alt, className }: { src: string; alt: string; className?: string }) => {
    const failed = imgErrors[src];
    if (!src || failed) {
      return (
        <div className={`bg-gray-100 border border-gray-200 rounded flex items-center justify-center text-gray-500 ${className || ''}`}>
          Image unavailable
        </div>
      );
    }
    return (
      <div className={`w-full h-full rounded border border-gray-300 bg-white overflow-hidden ${className || ''}`}>
        <img src={src} alt={alt} className="w-full h-full object-cover" onError={() => onImgError(src)} />
      </div>
    );
  };
  
  // Use the visits that are passed in (already filtered by the parent component)
  const relevantVisits = visits;

  // For PDF: single page, for PowerPoint: multiple slides  
  const totalSlides = reportType === 'pdf' ? 1 : relevantVisits.length;

  const nextSlide = () => {
    setCurrentSlide(prev => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide(prev => (prev - 1 + totalSlides) % totalSlides);
  };

  const renderPdfPreview = () => {
    if (relevantVisits.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-yellow-800">No Visits Recorded</h3>
            <p className="text-yellow-700 mt-2">No visits were recorded for the selected date.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 bg-white">
        {/* Only visit containers - no headers */}
        {relevantVisits.map((visit, index) => {
          const visitTime = new Date(visit.date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });

          return (
            <div key={visit.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              {/* Visit badge - top right */}
              <div className="flex justify-between items-start mb-4">
                <div></div>
                <span className="bg-green-100 text-green-800 text-sm px-3 py-1 rounded">
                  Visit {index + 1} - {visitTime}
                </span>
              </div>

              {/* Location details - prominent heading */}
              <h2 className="text-2xl font-semibold text-blue-700 mb-6">
                {visit.location || 'Location not specified'}
              </h2>

              {/* Photo section - dynamic layout based on number of photos */}
              <div className="mb-4">
                {(() => {
                  const photos = [visit.photoUrl1, visit.photoUrl2, visit.photoUrl3, visit.photoUrl4].filter(Boolean) as string[];
                  
                  if (photos.length === 0) {
                    return (
                      <div className="w-full h-80 bg-gray-50 border border-gray-200 rounded flex items-center justify-center">
                        <span className="text-gray-400 text-lg">No Photos Captured</span>
                      </div>
                    );
                  }
                  
                  if (photos.length === 1) {
                    return <div className="w-full h-80"><PreviewImg src={photos[0]} alt="Photo 1" /></div>;
                  }
                  
                  if (photos.length === 2) {
                    return (
                      <div className="grid grid-cols-2 gap-3 h-80">
                        {photos.map((url, index) => (
                          <div key={index} className="w-full h-full">
                            <PreviewImg src={url} alt={`Photo ${index + 1}`} />
                          </div>
                        ))}
                      </div>
                    );
                  }
                  
                  if (photos.length === 3) {
                    // Asymmetric: one tall on left, two stacked on right
                    return (
                      <div className="grid grid-cols-2 gap-3 h-80">
                        <div className="h-full"><PreviewImg src={photos[0]} alt="Photo 1" /></div>
                        <div className="grid grid-rows-2 gap-3">
                          <div className="h-full"><PreviewImg src={photos[1]} alt="Photo 2" /></div>
                          <div className="h-full"><PreviewImg src={photos[2]} alt="Photo 3" /></div>
                        </div>
                      </div>
                    );
                  }
                  
                  // 4 photos
                  return (
                    <div className="grid grid-cols-2 gap-3 h-80">
                      {photos.map((url, index) => (
                        <div key={index} className="h-full"><PreviewImg src={url} alt={`Photo ${index + 1}`} /></div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Notes if available - small text at bottom */}
              {visit.notes && (
                <div className="text-sm text-gray-700 mt-4 pt-4 border-t border-gray-100">
                  <span className="font-medium">Notes: </span>
                  {visit.notes.substring(0, 300)}{visit.notes.length > 300 ? '...' : ''}
                </div>
              )}
            </div>
          );
        })}

        {/* Simple footer */}
        <div className="text-center pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">Generated: {new Date().toLocaleString()}</p>
        </div>
      </div>
    );
  };

  const renderPowerPointPreview = () => {
    if (relevantVisits.length === 0) {
      return (
        <div className="bg-white p-8 rounded-lg shadow-sm border">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-red-600">No Visits Recorded</h3>
            <p className="text-gray-600 mt-2">No visits were recorded for this campaign.</p>
          </div>
        </div>
      );
    }

    // Show specific slide based on currentSlide
    const visitIndex = currentSlide;
    const visit = relevantVisits[visitIndex];
    
    if (!visit) {
      return (
        <div className="bg-white p-8 rounded-lg shadow-sm border">
          <div className="text-center">
            <h3 className="text-xl text-gray-600">End of Presentation</h3>
          </div>
        </div>
      );
    }

    const visitTime = new Date(visit.date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border aspect-video">
        {/* Slide header */}
        <div className="flex justify-between items-start mb-4">
          <span className="text-sm text-gray-500">Slide {visitIndex + 1}</span>
          <span className="bg-green-100 text-green-800 text-sm px-2 py-1 rounded">
            Visit {visitIndex + 1} - {visitTime}
          </span>
        </div>

        {/* Location heading - prominent */}
        <h2 className="text-2xl font-bold text-blue-700 mb-6">
          {visit.location || 'Location not specified'}
        </h2>

        {/* Photo section */}
        <div className="mb-4 h-[70%]">
          {(() => {
            const photos = [visit.photoUrl1, visit.photoUrl2, visit.photoUrl3, visit.photoUrl4].filter(Boolean) as string[];
            
            if (photos.length === 0) {
              return (
                <div className="w-full h-full bg-gray-50 border border-gray-200 rounded flex items-center justify-center">
                  <span className="text-gray-400">No Photos Captured</span>
                </div>
              );
            }
            
            if (photos.length === 1) {
              return <div className="w-full h-full"><PreviewImg src={photos[0]} alt="Photo 1" /></div>;
            }
            
            // For multiple photos in PowerPoint preview, show a grid layout
            if (photos.length === 2) {
              return (
                <div className="grid grid-cols-2 gap-3 h-full">
                  {photos.map((url, idx) => (
                    <div key={idx} className="h-full"><PreviewImg src={url} alt={`Photo ${idx + 1}`} /></div>
                  ))}
                </div>
              );
            }

            if (photos.length === 3) {
              return (
                <div className="grid grid-cols-2 gap-3 h-full">
                  <div className="h-full"><PreviewImg src={photos[0]} alt="Photo 1" /></div>
                  <div className="grid grid-rows-2 gap-3">
                    <div className="h-full"><PreviewImg src={photos[1]} alt="Photo 2" /></div>
                    <div className="h-full"><PreviewImg src={photos[2]} alt="Photo 3" /></div>
                  </div>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-2 gap-3 h-full">
                {photos.slice(0,4).map((url, idx) => (
                  <div key={idx} className="h-full"><PreviewImg src={url} alt={`Photo ${idx + 1}`} /></div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Notes if available */}
        {visit.notes && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">Notes: </span>
            {visit.notes.substring(0, 150)}{visit.notes.length > 150 ? '...' : ''}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">
                {reportType === 'pdf' ? 'PDF Report Preview' : 'PowerPoint Preview'}
              </h2>
              <p className="text-emerald-100">
                {reportType === 'pdf' 
                  ? `Daily report for ${selectedDate ? new Date(selectedDate).toLocaleDateString() : 'selected date'}`
                  : 'Campaign presentation preview'
                }
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-emerald-100 hover:text-white text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {reportType === 'pdf' ? renderPdfPreview() : renderPowerPointPreview()}
        </div>

        {/* PowerPoint Navigation */}
        {reportType === 'powerpoint' && relevantVisits.length > 0 && (
          <div className="border-t p-4 bg-gray-50">
            <div className="flex justify-between items-center">
              <button
                onClick={prevSlide}
                disabled={currentSlide === 0}
                className="px-4 py-2 bg-emerald-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>
              
              <span className="text-gray-600">
                Slide {currentSlide + 1} of {relevantVisits.length}
              </span>
              
              <button
                onClick={nextSlide}
                disabled={currentSlide >= relevantVisits.length - 1}
                className="px-4 py-2 bg-emerald-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
          >
            Close
          </button>
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="px-6 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
          >
            {isGenerating ? 'Generating...' : `Generate ${reportType.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}

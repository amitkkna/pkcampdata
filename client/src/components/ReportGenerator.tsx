import { useState } from 'react';
import { reportApi } from '../services/api';
import ReportPreview from './ReportPreview';
import type { Campaign, Visit } from '../../../shared/types';

interface ReportGeneratorProps {
  campaign: Campaign;
  visits: Visit[];
}

// Helper: format a Date as local YYYY-MM-DD (no timezone shift)
const toLocalYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function ReportGenerator({ campaign, visits }: ReportGeneratorProps) {
  const [pdfReportType, setPdfReportType] = useState<'single' | 'range'>('single');
  const [selectedDate, setSelectedDate] = useState(toLocalYMD(new Date()));
  const [startDate, setStartDate] = useState(toLocalYMD(new Date()));
  const [endDate, setEndDate] = useState(toLocalYMD(new Date()));
  const [pdfAspect, setPdfAspect] = useState<'16:9' | '4:3' | 'A4'>('16:9');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatingPpt, setGeneratingPpt] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewType, setPreviewType] = useState<'pdf' | 'powerpoint'>('pdf');

  const handlePreviewPdf = () => {
    setPreviewType('pdf');
    setShowPreview(true);
  };

  const handlePreviewPowerPoint = () => {
    setPreviewType('powerpoint');
    setShowPreview(true);
  };

  const getReportOptions = () => {
    return {
      reportType: pdfReportType,
      selectedDate: pdfReportType === 'single' ? selectedDate : undefined,
      startDate: pdfReportType === 'range' ? startDate : undefined,
  endDate: pdfReportType === 'range' ? endDate : undefined,
  aspectRatio: pdfAspect,
    };
  };

  const handleGeneratePdf = async () => {
    try {
      setGeneratingPdf(true);
      const blob = await reportApi.generatePdf(campaign.id, getReportOptions());
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      let filename = 'report.pdf';
      if (pdfReportType === 'single') {
        filename = `daily-report-${campaign.name}-${selectedDate}-${pdfAspect.replace(':','x')}.pdf`;
      } else if (pdfReportType === 'range') {
        filename = `range-report-${campaign.name}-${startDate}-to-${endDate}-${pdfAspect.replace(':','x')}.pdf`;
      } else {
        filename = `complete-report-${campaign.name}-${pdfAspect.replace(':','x')}.pdf`;
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
  console.error('Failed to generate PDF:', error);
  const msg = error instanceof Error ? error.message : String(error);
  alert(`Failed to generate PDF report: ${msg}`);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleGeneratePowerPoint = async () => {
    try {
      setGeneratingPpt(true);
      // PowerPoint always uses all visits for complete campaign presentation
      const blob = await reportApi.generatePowerpoint(campaign.id, { reportType: 'all' });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const filename = `complete-presentation-${campaign.name}.pptx`;
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to generate PowerPoint:', error);
      alert('Failed to generate PowerPoint presentation. Please try again.');
    } finally {
      setGeneratingPpt(false);
    }
  };

  const getFilteredVisits = () => {
    if (pdfReportType === 'single') {
      return visits.filter(visit => {
        const visitDate = toLocalYMD(new Date(visit.date));
        return visitDate === selectedDate;
      });
    } else if (pdfReportType === 'range') {
      return visits.filter(visit => {
        const visitDate = toLocalYMD(new Date(visit.date));
        return visitDate >= startDate && visitDate <= endDate;
      });
    }
    return visits; // fallback
  };

  const filteredVisits = getFilteredVisits();

  // Get available dates for reference
  const availableDates = [...new Set(visits.map(visit => toLocalYMD(new Date(visit.date))))].sort();

  const getDateRange = () => {
    if (availableDates.length === 0) return { min: '', max: '' };
    return {
      min: availableDates[0],
      max: availableDates[availableDates.length - 1]
    };
  };

  const dateRange = getDateRange();

  return (
    <>
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate Reports</h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* PDF Report with Date Selection */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-800">PDF Report</h4>
            <p className="text-sm text-gray-600">
              Generate a professional PDF report for visits on specific date(s).
            </p>
            {/* Aspect Ratio */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Aspect Ratio</label>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="pdfAspect" value="16:9" checked={pdfAspect==='16:9'} onChange={() => setPdfAspect('16:9')} />
                  16:9 (Widescreen)
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="pdfAspect" value="4:3" checked={pdfAspect==='4:3'} onChange={() => setPdfAspect('4:3')} />
                  4:3 (Classic)
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="pdfAspect" value="A4" checked={pdfAspect==='A4'} onChange={() => setPdfAspect('A4')} />
                  A4 (Landscape)
                </label>
              </div>
              <p className="text-xs text-gray-500">PDF will be generated in {pdfAspect} layout.</p>
            </div>
            
            {/* PDF Report Type Selection */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Date Selection</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="pdfReportType"
                    value="single"
                    checked={pdfReportType === 'single'}
                    onChange={(e) => setPdfReportType(e.target.value as 'single' | 'range')}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Single Date</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="pdfReportType"
                    value="range"
                    checked={pdfReportType === 'range'}
                    onChange={(e) => setPdfReportType(e.target.value as 'single' | 'range')}
                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Date Range (From Date to Date)</span>
                </label>
              </div>
            </div>

            {/* Date Input Based on Selection */}
            {pdfReportType === 'single' ? (
              <div>
                <label htmlFor="reportDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Date
                </label>
                <input
                  type="date"
                  id="reportDate"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input-field max-w-xs"
                  min={dateRange.min}
                  max={dateRange.max}
                />
                <div className="mt-2 text-sm text-gray-600">
                  <strong>Visits for {new Date(selectedDate).toLocaleDateString()}:</strong> {filteredVisits.length}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pdfStartDate" className="block text-sm font-medium text-gray-700 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    id="pdfStartDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input-field w-full"
                    min={dateRange.min}
                    max={endDate}
                  />
                </div>
                <div>
                  <label htmlFor="pdfEndDate" className="block text-sm font-medium text-gray-700 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    id="pdfEndDate"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="input-field w-full"
                    min={startDate}
                    max={dateRange.max}
                  />
                </div>
                <div className="md:col-span-2 text-sm text-gray-600">
                  <strong>Visits from {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}:</strong> {filteredVisits.length}
                </div>
              </div>
            )}

            {availableDates.length > 0 && (
              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                <strong>Available dates:</strong> {availableDates.join(', ')}
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handlePreviewPdf}
                disabled={filteredVisits.length === 0}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex-1"
              >
                Preview PDF Report
              </button>
              <button
                onClick={handleGeneratePdf}
                disabled={generatingPdf || filteredVisits.length === 0}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex-1"
              >
                {generatingPdf ? 'Generating PDF...' : 'Generate PDF Report'}
              </button>
            </div>
            
            {filteredVisits.length === 0 && (
              <p className="text-sm text-amber-600">
                No visits recorded for the selected date.
              </p>
            )}
          </div>

          {/* PowerPoint Presentation */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-800">Campaign PowerPoint</h4>
            <p className="text-sm text-gray-600">
              Generate a complete PowerPoint presentation with all visits for this campaign.
            </p>
            
            <div className="text-sm text-gray-600">
              <strong>Total visits in campaign:</strong> {visits.length}
            </div>
            
            <div className="text-sm text-gray-600">
              <strong>Campaign duration:</strong> {new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handlePreviewPowerPoint}
                disabled={visits.length === 0}
                className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex-1"
              >
                Preview PowerPoint
              </button>
              <button
                onClick={handleGeneratePowerPoint}
                disabled={generatingPpt || visits.length === 0}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex-1"
              >
                {generatingPpt ? 'Generating PowerPoint...' : 'Generate PowerPoint'}
              </button>
            </div>
            
            {visits.length === 0 && (
              <p className="text-sm text-amber-600">
                No visits recorded for this campaign yet.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Report Preview Modal */}
      {showPreview && (
        <ReportPreview
          campaign={campaign}
          visits={previewType === 'pdf' ? filteredVisits : visits}
          selectedDate={pdfReportType === 'single' ? selectedDate : undefined}
          reportType={previewType}
          onClose={() => setShowPreview(false)}
          onGenerate={previewType === 'pdf' ? handleGeneratePdf : handleGeneratePowerPoint}
          isGenerating={previewType === 'pdf' ? generatingPdf : generatingPpt}
        />
      )}
    </>
  );
}

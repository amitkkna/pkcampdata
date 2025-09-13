export interface Campaign {
  id: string;
  name: string;
  clientName: string;
  startDate: string;
  endDate: string;
  description?: string | null;
  targetAudience?: string | null;
  budget?: number | null;
  objectives?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  visits?: Visit[];
}

export interface Visit {
  id: string;
  date: string;
  location: string;
  notes?: string | null;
  photoUrl1?: string | null;
  photoUrl2?: string | null;
  photoUrl3?: string | null;
  photoUrl4?: string | null;
  originalFilename1?: string | null;
  originalFilename2?: string | null;
  originalFilename3?: string | null;
  originalFilename4?: string | null;
  createdAt: string;
  updatedAt: string;
  campaignId: string;
  campaign?: Campaign;
}

export interface CreateCampaignRequest {
  name: string;
  clientName: string;
  startDate: string;
  endDate: string;
  description?: string;
  targetAudience?: string;
  budget?: number;
  objectives?: string;
  notes?: string;
}

export interface CreateVisitRequest {
  date: string;
  location: string;
  notes?: string;
  campaignId: string;
}

export interface Folder {
  id: string;
  name: string;
  location: string;
  campaignId: string;
  photos: FolderPhoto[];
  createdAt: string;
  updatedAt: string;
}

export interface FolderPhoto {
  id: string;
  filename: string;
  originalName: string;
  photoUrl: string;
  uploadDate: string;
  folderId: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateReportRequest {
  campaignId: string;
  date: string;
}

export interface GenerateFolderReportRequest {
  folderId: string;
  reportType: 'pdf' | 'ppt';
  selectedPhotoIds?: string[]; // Optional: specific photos to include
  photosPerPage?: number; // Optional: 1, 2, 3, 4, 6, 8 (default 8, maximum 8)
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

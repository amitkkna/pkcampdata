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

export interface GenerateReportRequest {
  campaignId: string;
  date: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface VideoTemplate {
  id: string;
  name: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  width?: number;
  height?: number;
  fileSize?: number;
  category: string;
  tags: string[];
  isSystem: boolean;
  userId?: string;
  isFavorite: boolean;
  isPublic: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface VideoCampaign {
  id: string;
  name: string;
  status: 'DRAFT' | 'GENERATING' | 'READY' | 'FAILED' | 'PROCESSING';
  videoSource: 'TEMPLATE' | 'CUSTOM_UPLOAD' | 'URL';
  templateId?: string;
  customVideoUrl?: string;
  narrationScript: string;
  tone: string;
  clientLogoUrl?: string;
  userLogoUrl?: string;
  bgmUrl?: string;
  bgmVolume: number;
  textOverlays?: TextOverlay[];
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  generatedAt?: string;
  generationError?: string;
  generationTime?: number;
  views: number;
  clicks: number;
  shares: number;
  downloads: number;
  createdAt: string;
  updatedAt: string;
  userId: string;
  template?: VideoTemplate;
  companies?: any[];
  jobs?: any[];
  _count?: {
    companies: number;
  };
}

export interface TextOverlay {
  text: string;
  startTime: number;
  duration: number;
  fontSize?: number;
  color?: string;
  position?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

export interface CreateVideoCampaignData {
  name: string;
  narrationScript: string;
  tone?: string;
  videoSource?: 'TEMPLATE' | 'CUSTOM_UPLOAD' | 'URL';
  templateId?: string;
  customVideoUrl?: string;
  voiceId?: string;
  customVoiceUrl?: string;
  clientLogoUrl?: string;
  userLogoUrl?: string;
  bgmUrl?: string;
  bgmVolume?: number;
  textOverlays?: TextOverlay[];
  companyIds?: string[];
}

export interface UpdateVideoCampaignData {
  name?: string;
  narrationScript?: string;
  tone?: string;
  clientLogoUrl?: string;
  userLogoUrl?: string;
  bgmUrl?: string;
  bgmVolume?: number;
  textOverlays?: TextOverlay[];
}

export interface VideoGenerationStatus {
  status: string;
  progress: number;
  currentStep?: string;
  videoUrl?: string;
  error?: string;
}

class VideoService {
  private getAuthHeaders() {
    const token = localStorage.getItem('crmToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  // ===================================
  // TEMPLATES
  // ===================================

  async getTemplates(params?: {
    category?: string;
    search?: string;
    system?: boolean;
  }): Promise<{ templates: VideoTemplate[] }> {
    const response = await axios.get(`${API_URL}/api/video-campaigns/templates`, {
      headers: this.getAuthHeaders(),
      params,
    });
    return response.data;
  }

  async getTemplate(id: string): Promise<{ template: VideoTemplate }> {
    const response = await axios.get(`${API_URL}/api/video-campaigns/templates/${id}`, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async createTemplate(data: {
    name: string;
    description?: string;
    videoUrl: string;
    category?: string;
    tags?: string[];
  }): Promise<{ template: VideoTemplate }> {
    const response = await axios.post(`${API_URL}/api/video-campaigns/templates`, data, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async uploadTemplate(
    formData: FormData,
    onUploadProgress?: (progressEvent: any) => void
  ): Promise<{ template: VideoTemplate; videoUrl: string }> {
    const token = localStorage.getItem('crmToken');
    const response = await axios.post(`${API_URL}/api/video-campaigns/templates/upload`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
      timeout: 300000, // 5 minutes timeout for large uploads
    });
    return response.data;
  }

  async uploadLogo(formData: FormData): Promise<{ logoUrl: string }> {
    const token = localStorage.getItem('crmToken');
    const response = await axios.post(`${API_URL}/api/video-campaigns/upload-logo`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 1 minute timeout
    });
    return response.data;
  }

  async updateTemplate(id: string, data: {
    name?: string;
    description?: string;
    category?: string;
    tags?: string[];
    isFavorite?: boolean;
  }): Promise<{ template: VideoTemplate }> {
    const response = await axios.put(`${API_URL}/api/video-campaigns/templates/${id}`, data, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async toggleTemplateFavorite(id: string): Promise<{ template: VideoTemplate }> {
    const response = await axios.post(`${API_URL}/api/video-campaigns/templates/${id}/favorite`, {}, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async deleteTemplate(id: string): Promise<{ message: string }> {
    const response = await axios.delete(`${API_URL}/api/video-campaigns/templates/${id}`, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  // ===================================
  // CAMPAIGNS
  // ===================================

  async getCampaigns(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ campaigns: VideoCampaign[]; total: number }> {
    const response = await axios.get(`${API_URL}/api/video-campaigns`, {
      headers: this.getAuthHeaders(),
      params,
    });
    return response.data;
  }

  async getCampaign(id: string): Promise<{ campaign: VideoCampaign }> {
    const response = await axios.get(`${API_URL}/api/video-campaigns/${id}`, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async createCampaign(data: CreateVideoCampaignData): Promise<{ campaign: VideoCampaign }> {
    const response = await axios.post(`${API_URL}/api/video-campaigns`, data, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async updateCampaign(id: string, data: UpdateVideoCampaignData): Promise<{ campaign: VideoCampaign }> {
    const response = await axios.put(`${API_URL}/api/video-campaigns/${id}`, data, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async deleteCampaign(id: string): Promise<{ message: string }> {
    const response = await axios.delete(`${API_URL}/api/video-campaigns/${id}`, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async addCompanyToCampaign(campaignId: string, companyId: string): Promise<any> {
    const response = await axios.post(
      `${API_URL}/api/video-campaigns/${campaignId}/companies/${companyId}`,
      {},
      {
        headers: this.getAuthHeaders(),
      }
    );
    return response.data;
  }

  async removeCompanyFromCampaign(campaignId: string, companyId: string): Promise<{ message: string }> {
    const response = await axios.delete(
      `${API_URL}/api/video-campaigns/${campaignId}/companies/${companyId}`,
      {
        headers: this.getAuthHeaders(),
      }
    );
    return response.data;
  }

  // ===================================
  // AI ASSISTANCE
  // ===================================

  async generateScript(data: {
    companyName: string;
    companyIndustry?: string;
    tone?: string;
    goal?: string;
    userCompanyName?: string;
  }): Promise<{ script: string }> {
    const response = await axios.post(`${API_URL}/api/video-campaigns/ai/generate-script`, data, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async suggestOverlays(data: {
    narrationScript: string;
    duration?: number;
  }): Promise<{ overlays: TextOverlay[] }> {
    const response = await axios.post(`${API_URL}/api/video-campaigns/ai/suggest-overlays`, data, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  // ===================================
  // VIDEO GENERATION
  // ===================================

  async generateVideo(campaignId: string): Promise<{ message: string; jobId: string; campaign: VideoCampaign }> {
    const response = await axios.post(`${API_URL}/api/video-campaigns/${campaignId}/generate`, {}, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  async getGenerationStatus(campaignId: string): Promise<VideoGenerationStatus> {
    const response = await axios.get(`${API_URL}/api/video-campaigns/${campaignId}/status`, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  // Alias for backward compatibility
  async getCampaignStatus(campaignId: string): Promise<VideoGenerationStatus> {
    return this.getGenerationStatus(campaignId);
  }

  // ===================================
  // VOICE CLONING
  // ===================================

  async synthesizeVoice(data: {
    text: string;
    voice_id: string;
    language?: string;
  }): Promise<{
    success: boolean;
    audio_url: string;
    text_length: number;
    voice_id: string;
  }> {
    const response = await axios.post(`${API_URL}/api/video-campaigns/synthesize-voice`, data, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  // ===================================
  // AI VIDEO GENERATION FROM PROMPT
  // ===================================

  async generateFromPrompt(prompt: string): Promise<{
    template: VideoTemplate;
    videoData: {
      script: string;
      keywords: string[];
      clips: any[];
      message: string;
    };
  }> {
    const response = await axios.post(`${API_URL}/api/video-campaigns/templates/generate-from-prompt`,
      { prompt },
      {
        headers: this.getAuthHeaders(),
      }
    );
    return response.data;
  }

  async generateCampaignFromPrompt(prompt: string): Promise<{ campaign: VideoCampaign }> {
    const response = await axios.post(`${API_URL}/api/video-campaigns/ai/generate-from-prompt`,
      { prompt },
      {
        headers: this.getAuthHeaders(),
      }
    );
    return response.data;
  }

  // ===================================
  // PEXELS VIDEO SEARCH
  // ===================================

  async searchPexelsVideos(query: string, page: number = 1, per_page: number = 12): Promise<{
    videos: any[];
    page: number;
    per_page: number;
    total_results: number;
    next_page?: string;
  }> {
    const response = await axios.get(`${API_URL}/api/video-campaigns/pexels/search`, {
      params: { query, page, per_page },
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }

  // ===================================
  // ELEVENLABS VOICES
  // ===================================

  async getElevenLabsVoices(): Promise<{ voices: any[] }> {
    const response = await axios.get(`${API_URL}/api/video-campaigns/elevenlabs/voices`, {
      headers: this.getAuthHeaders(),
    });
    return response.data;
  }
}

export const videoService = new VideoService();
export default videoService;

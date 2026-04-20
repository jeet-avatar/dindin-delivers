import { useState, useEffect, useCallback } from 'react';
import { videoService } from '../services/videoService';

interface DraftData {
  name: string;
  targetCompanyName: string;
  userCompanyName: string;
  script: string;
  tone: string;
  voiceId: string;
  customVoiceUrl: string;
  isCustomVoice: boolean;
  videoSource: 'template' | 'upload';
  selectedTemplateId: string | null;
  customVideoUrl: string;
  clientLogo: string;
  userLogo: string;
  bgmUrl: string;
  overlays: any[];
}

interface UseDraftCampaignOptions {
  onSaveSuccess?: (campaignId: string) => void;
  onSaveError?: (error: Error) => void;
}

export function useDraftCampaign(options: UseDraftCampaignOptions = {}) {
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load draft ID from localStorage on mount
  useEffect(() => {
    const savedDraftId = localStorage.getItem('currentDraftCampaignId');
    if (savedDraftId) {
      setDraftId(savedDraftId);
    }
  }, []);

  // Save draft to backend
  const saveDraft = useCallback(async (data: Partial<DraftData>) => {
    try {
      setIsSaving(true);

      // Filter out empty values
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => {
          if (typeof value === 'string') return value.trim() !== '';
          if (Array.isArray(value)) return value.length > 0;
          return value !== null && value !== undefined;
        })
      );

      // If no meaningful data, don't save
      if (Object.keys(cleanData).length === 0) {
        setIsSaving(false);
        return null;
      }

      let campaignId = draftId;

      if (draftId) {
        // Update existing draft
        await videoService.updateCampaign(draftId, {
          ...cleanData,
          status: 'DRAFT',
        } as any);
      } else {
        // Create new draft
        const response = await videoService.createCampaign({
          name: data.name || 'Untitled Campaign',
          narrationScript: data.script || '',
          tone: data.tone || 'professional',
          voiceId: data.voiceId || '',
          videoSource: data.videoSource === 'upload' ? 'CUSTOM_UPLOAD' : 'TEMPLATE',
          templateId: data.selectedTemplateId || undefined,
          customVideoUrl: data.customVideoUrl || undefined,
          clientLogoUrl: data.clientLogo || undefined,
          userLogoUrl: data.userLogo || undefined,
          bgmUrl: data.bgmUrl || undefined,
          textOverlays: data.overlays || [],
          status: 'DRAFT',
        } as any);

        campaignId = response.campaign.id;
        setDraftId(campaignId);
        localStorage.setItem('currentDraftCampaignId', campaignId);
      }

      setLastSaved(new Date());
      options.onSaveSuccess?.(campaignId);

      return campaignId;
    } catch (error) {
      console.error('Failed to save draft:', error);
      options.onSaveError?.(error as Error);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [draftId, options]);

  // Clear draft
  const clearDraft = useCallback(() => {
    setDraftId(null);
    setLastSaved(null);
    localStorage.removeItem('currentDraftCampaignId');
    localStorage.removeItem('currentDraftData');
  }, []);

  // Load draft data from localStorage
  const loadLocalDraft = useCallback((): Partial<DraftData> | null => {
    try {
      const savedData = localStorage.getItem('currentDraftData');
      if (savedData) {
        return JSON.parse(savedData);
      }
    } catch (error) {
      console.error('Failed to load local draft:', error);
    }
    return null;
  }, []);

  // Save draft data to localStorage (backup)
  const saveLocalDraft = useCallback((data: Partial<DraftData>) => {
    try {
      localStorage.setItem('currentDraftData', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save local draft:', error);
    }
  }, []);

  return {
    draftId,
    isSaving,
    lastSaved,
    saveDraft,
    clearDraft,
    loadLocalDraft,
    saveLocalDraft,
  };
}

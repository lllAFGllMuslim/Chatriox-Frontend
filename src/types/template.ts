export interface EmailTemplate {
  _id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  category: 'marketing' | 'transactional' | 'newsletter' | 'promotional';
  tags: string[];
  isPublic: boolean;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  usage: number;
  aiGenerated: boolean;
  aiPrompt?: string;
  industry?: string;
  tone: 'professional' | 'friendly' | 'urgent' | 'casual';
  length: 'short' | 'medium' | 'long';
  version: number;
  parentTemplate?: {
    _id: string;
    name: string;
  };
  preview: {
    thumbnail?: string;
    previewText: string;
  };
  analytics: {
    views: number;
    uses: number;
    lastUsed?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateFilters {
  category?: string;
  search?: string;
  tags?: string;
  isPublic?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface GenerateTemplateRequest {
  prompt: string;
  category: string;
  tone?: string;
  length?: string;
  industry?: string;
  requirements?: string;
  name?: string;
}

export interface TemplatePreview {
  htmlContent: string;
  subject: string;
  testData: Record<string, any>;
}

export interface CategoryData {
  _id: string;
  count: number;
  lastUsed: Date;
}
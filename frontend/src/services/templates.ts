/**
 * Service for interacting with content templates via API.
 *
 * @remarks
 * Provides methods to fetch, create, update, delete, and generate content from templates.
 * Also supports searching and retrieving popular templates.
 *
 * @example
 * ```typescript
 * const { templates } = await templatesAPI.getTemplates();
 * const { template } = await templatesAPI.getTemplate(1);
 * ```
 *
 * @public
 */
import api from "./api";

export interface ContentTemplate {
  id: number;
  name: string;
  description: string;
  contentType: string;
  platformTarget: string;
  template: string;
  variables: string[]; // Array of variable names like ['company', 'product', 'target_audience']
  isPublic: boolean;
  useCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateVariable {
  name: string;
  value: string;
}

export interface CreateTemplateRequest {
  name: string;
  description: string;
  contentType: string;
  platformTarget: string;
  template: string;
  variables: string[];
}

export interface GenerateFromTemplateRequest {
  templateId: number;
  variables: TemplateVariable[];
  topic?: string;
  keyword?: string;
}

export const templatesAPI = {
  // Get all templates (user's + public)
  getTemplates: async (): Promise<{ templates: ContentTemplate[] }> => {
    const response = await api.get("/templates");
    return response.data;
  },

  // Get template by ID
  getTemplate: async (id: number): Promise<{ template: ContentTemplate }> => {
    const response = await api.get(`/templates/${id}`);
    return response.data;
  },

  // Create new template
  createTemplate: async (
    data: CreateTemplateRequest
  ): Promise<{
    message: string;
    template: ContentTemplate;
  }> => {
    const response = await api.post("/templates", data);
    return response.data;
  },

  // Update template
  updateTemplate: async (
    id: number,
    data: Partial<CreateTemplateRequest>
  ): Promise<{
    message: string;
    template: ContentTemplate;
  }> => {
    const response = await api.put(`/templates/${id}`, data);
    return response.data;
  },

  // Delete template
  deleteTemplate: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete(`/templates/${id}`);
    return response.data;
  },

  // Generate content from template
  generateFromTemplate: async (
    data: GenerateFromTemplateRequest
  ): Promise<{
    message: string;
    content: any; // ContentItem from content service
    remainingGenerations: number;
  }> => {
    const response = await api.post("/templates/generate", data);
    return response.data;
  },

  // Get popular templates
  getPopularTemplates: async (
    limit: number = 10
  ): Promise<{ templates: ContentTemplate[] }> => {
    const response = await api.get(`/templates/popular?limit=${limit}`);
    return response.data;
  },

  // Search templates
  searchTemplates: async (
    query: string,
    filters?: {
      contentType?: string;
      platformTarget?: string;
    }
  ): Promise<{ templates: ContentTemplate[] }> => {
    const params = new URLSearchParams();
    params.append("q", query);
    if (filters?.contentType) params.append("contentType", filters.contentType);
    if (filters?.platformTarget)
      params.append("platformTarget", filters.platformTarget);

    const response = await api.get(`/templates/search?${params.toString()}`);
    return response.data;
  },
};

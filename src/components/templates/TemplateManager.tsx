import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Mail,
  Plus,
  Search,
  Filter,
  Grid,
  List,
  Eye,
  Copy,
  Trash2,
  Sparkles,
  Tag,
  Calendar,
  User,
  ChevronDown,
  X,
  ExternalLink
} from 'lucide-react';
import TemplateCard from './TemplateCard';
import TemplateEditor from './TemplateEditor';
import AIGenerationModal from './AIGenerationModal';
import TemplatePreview from './TemplatePreview';
import { EmailTemplate, TemplateFilters } from '../../types/template';

const TemplateManager: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState<TemplateFilters>({
    category: '',
    search: '',
    tags: '',
    isPublic: undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const queryClient = useQueryClient();

  // Fetch templates
  const { data: templatesData, isLoading } = useQuery({
    queryKey: ['email-templates', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/email-templates?${params}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    }
  });

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['template-categories'],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/email-templates/categories`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    }
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/email-templates/${id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      if (!response.ok) throw new Error('Failed to delete template');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      queryClient.invalidateQueries({ queryKey: ['template-categories'] });
    }
  });

  // Clone template mutation
  const cloneTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/email-templates/${id}/clone`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}` 
          },
          body: JSON.stringify({})
        }
      );
      
      if (!response.ok) throw new Error('Failed to clone template');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
    }
  });

  const handleEditTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setShowEditor(true);
  };

  const handlePreviewTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      deleteTemplateMutation.mutate(id);
    }
  };

  const handleCloneTemplate = (id: string) => {
    cloneTemplateMutation.mutate(id);
  };

  const updateFilters = (newFilters: Partial<TemplateFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      search: '',
      tags: '',
      isPublic: undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  };

  const templates = templatesData?.data || [];
  const categories = categoriesData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Mail size={32} />
            <div>
              <h1 className="text-3xl font-bold font-display">Email Templates</h1>
              <p className="text-purple-100 mt-1">
                Create, manage, and organize your email templates
              </p>
            </div>
            <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
              {templates.length} templates
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAIModal(true)}
              className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl transition-colors flex items-center space-x-2 font-medium"
            >
              <Sparkles size={18} />
              <span>AI Generate</span>
            </button>
            <button
              onClick={() => setShowEditor(true)}
              className="bg-white text-purple-600 hover:bg-purple-50 px-6 py-3 rounded-xl transition-colors flex items-center space-x-2 font-medium shadow-lg"
            >
              <Plus size={18} />
              <span>Create Template</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        {/* Toolbar */}
        <div className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => updateFilters({ search: e.target.value })}
                  className="pl-10 pr-4 py-2 w-64 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Search templates..."
                />
              </div>

              {/* Category Filter */}
              <select
                value={filters.category}
                onChange={(e) => updateFilters({ category: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                <option value="marketing">Marketing</option>
                <option value="transactional">Transactional</option>
                <option value="newsletter">Newsletter</option>
                <option value="promotional">Promotional</option>
              </select>

              {/* Filters Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-xl transition-colors ${
                  showFilters 
                    ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' 
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-500'
                }`}
              >
                <Filter size={16} />
                <span>Filters</span>
                <ChevronDown size={14} className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>

            <div className="flex items-center space-x-2">
              {/* View Mode Toggle */}
              <div className="flex bg-gray-200 dark:bg-gray-600 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-white dark:bg-gray-700 text-purple-600 dark:text-purple-400 shadow-sm' 
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <List size={16} />
                </button>
              </div>

              {/* Sort */}
              <select
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('-');
                  updateFilters({ sortBy, sortOrder: sortOrder as 'asc' | 'desc' });
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="usage-desc">Most Used</option>
                <option value="analytics.views-desc">Most Viewed</option>
              </select>
            </div>
          </div>

          {/* Extended Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tags
                    </label>
                    <input
                      type="text"
                      value={filters.tags}
                      onChange={(e) => updateFilters({ tags: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Enter tags (comma separated)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Visibility
                    </label>
                    <select
                      value={filters.isPublic?.toString() || ''}
                      onChange={(e) => updateFilters({ 
                        isPublic: e.target.value === '' ? undefined : e.target.value === 'true' 
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">All Templates</option>
                      <option value="false">My Templates</option>
                      <option value="true">Public Templates</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={clearFilters}
                      className="w-full px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-4">Loading templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="text-gray-400 mx-auto mb-4" size={48} />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No templates found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                {filters.search || filters.category || filters.tags 
                  ? 'Try adjusting your filters or search terms to find more templates'
                  : 'Get started by creating your first email template with our AI generator or custom editor'
                }
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setShowAIModal(true)}
                  className="bg-purple-600 text-white px-6 py-3 rounded-xl hover:bg-purple-700 transition-colors flex items-center space-x-2 shadow-lg"
                >
                  <Sparkles size={16} />
                  <span>Generate with AI</span>
                </button>
                <button
                  onClick={() => setShowEditor(true)}
                  className="bg-gray-600 text-white px-6 py-3 rounded-xl hover:bg-gray-700 transition-colors flex items-center space-x-2 shadow-lg"
                >
                  <Plus size={16} />
                  <span>Create Template</span>
                </button>
              </div>
            </div>
          ) : (
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
              : 'space-y-4'
            }>
              {templates.map((template: EmailTemplate) => (
                <TemplateCard
                  key={template._id}
                  template={template}
                  viewMode={viewMode}
                  onEdit={() => handleEditTemplate(template)}
                  onPreview={() => handlePreviewTemplate(template)}
                  onClone={() => handleCloneTemplate(template._id)}
                  onDelete={() => handleDeleteTemplate(template._id)}
                  isDeleting={deleteTemplateMutation.isPending}
                  isCloning={cloneTemplateMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {templatesData?.pagination && templatesData.pagination.pages > 1 && (
          <div className="border-t border-gray-200 dark:border-gray-600 px-6 py-4 bg-gray-50 dark:bg-gray-700">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {((templatesData.pagination.current - 1) * templatesData.pagination.limit) + 1} to{' '}
                {Math.min(templatesData.pagination.current * templatesData.pagination.limit, templatesData.pagination.total)} of{' '}
                {templatesData.pagination.total} templates
              </p>
              <div className="flex items-center space-x-2">
                <button 
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={templatesData.pagination.current === 1}
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Page {templatesData.pagination.current} of {templatesData.pagination.pages}
                </span>
                <button 
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={templatesData.pagination.current === templatesData.pagination.pages}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showEditor && (
          <TemplateEditor
            template={selectedTemplate}
            isOpen={showEditor}
            onClose={() => {
              setShowEditor(false);
              setSelectedTemplate(null);
            }}
            onSave={() => {
              queryClient.invalidateQueries({ queryKey: ['email-templates'] });
            }}
          />
        )}

        {showAIModal && (
          <AIGenerationModal
            isOpen={showAIModal}
            onClose={() => setShowAIModal(false)}
            onGenerate={() => {
              queryClient.invalidateQueries({ queryKey: ['email-templates'] });
              queryClient.invalidateQueries({ queryKey: ['template-categories'] });
            }}
          />
        )}

        {showPreview && selectedTemplate && (
          <TemplatePreview
            template={selectedTemplate}
            isOpen={showPreview}
            onClose={() => {
              setShowPreview(false);
              setSelectedTemplate(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TemplateManager;
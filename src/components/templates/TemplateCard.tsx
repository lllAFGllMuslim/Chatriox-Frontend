import React from 'react';
import { motion } from 'framer-motion';
import { 
  Eye, 
  Edit, 
  Copy, 
  Trash2, 
  Sparkles, 
  Calendar,
  User,
  BarChart3,
  Tag,
  ExternalLink,
  Globe,
  Play
} from 'lucide-react';
import { EmailTemplate } from '../../types/template';

interface TemplateCardProps {
  template: EmailTemplate;
  viewMode: 'grid' | 'list';
  onEdit: () => void;
  onPreview: () => void;
  onClone: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
  isCloning?: boolean;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  viewMode,
  onEdit,
  onPreview,
  onClone,
  onDelete,
  isDeleting = false,
  isCloning = false
}) => {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'marketing':
        return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white';
      case 'transactional':
        return 'bg-gradient-to-r from-green-500 to-green-600 text-white';
      case 'newsletter':
        return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white';
      case 'promotional':
        return 'bg-gradient-to-r from-orange-500 to-orange-600 text-white';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
    }
  };

  const getToneIcon = (tone: string) => {
    switch (tone) {
      case 'professional': return '🎯';
      case 'friendly': return '😊';
      case 'urgent': return '⚡';
      case 'casual': return '👋';
      default: return '📧';
    }
  };

  if (viewMode === 'list') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01 }}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-2xl transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-600"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6 flex-1">
            {/* Live Preview Thumbnail */}
            <div className="w-20 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 relative group cursor-pointer" onClick={onPreview}>
              <iframe
                srcDoc={template.htmlContent}
                className="w-full h-full border-0 pointer-events-none transform scale-[0.25] origin-top-left"
                style={{ width: '320px', height: '256px' }}
                title={`Preview of ${template.name}`}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                <Play className="text-white opacity-0 group-hover:opacity-100 transition-all duration-200" size={16} />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="font-bold text-gray-900 dark:text-white text-lg truncate">
                  {template.name}
                </h3>
                {template.aiGenerated && (
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-1 rounded-full">
                    <Sparkles size={14} />
                  </div>
                )}
                {template.isPublic && (
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-1 rounded-full">
                    <Globe size={14} />
                  </div>
                )}
                <span className="text-2xl">{getToneIcon(template.tone)}</span>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 font-medium">
                {template.subject}
              </p>

              <div className="flex items-center space-x-4 text-sm">
                <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-lg ${getCategoryColor(template.category)}`}>
                  {template.category.toUpperCase()}
                </span>
                <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
                  <User size={14} />
                  <span className="font-medium">{template.user.name}</span>
                </div>
                <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
                  <Calendar size={14} />
                  <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
                  <BarChart3 size={14} />
                  <span className="font-medium">{template.analytics.views} views</span>
                </div>
              </div>

              {template.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {template.tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-600 dark:to-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-lg font-medium border"
                    >
                      #{tag}
                    </span>
                  ))}
                  {template.tags.length > 3 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">+{template.tags.length - 3} more</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onPreview}
              className="p-3 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all duration-200 hover:scale-110"
              title="Preview"
            >
              <Eye size={18} />
            </button>
            <button
              onClick={onEdit}
              className="p-3 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl transition-all duration-200 hover:scale-110"
              title="Edit"
            >
              <Edit size={18} />
            </button>
            <button
              onClick={onClone}
              disabled={isCloning}
              className="p-3 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl transition-all duration-200 hover:scale-110 disabled:opacity-50"
              title="Clone"
            >
              <Copy size={18} />
            </button>
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="p-3 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200 hover:scale-110 disabled:opacity-50"
              title="Delete"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 group"
    >
      {/* Live Preview */}
      <div className="h-48 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 relative overflow-hidden cursor-pointer" onClick={onPreview}>
        <iframe
          srcDoc={template.htmlContent}
          className="w-full h-full border-0 pointer-events-none transform scale-[0.5] origin-top-left"
          style={{ width: '200%', height: '200%' }}
          title={`Preview of ${template.name}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300" />
        
        {/* Status Badges */}
        <div className="absolute top-3 right-3 flex space-x-2">
          {template.aiGenerated && (
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-2 rounded-full shadow-lg">
              <Sparkles size={14} />
            </div>
          )}
          {template.isPublic && (
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-2 rounded-full shadow-lg">
              <Globe size={14} />
            </div>
          )}
        </div>

        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="bg-black/70 text-white p-4 rounded-full backdrop-blur-sm">
            <Play size={24} />
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-tight truncate mb-1">
              {template.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
              {template.subject}
            </p>
          </div>
          <span className="text-2xl ml-3">{getToneIcon(template.tone)}</span>
        </div>

        <div className="flex items-center justify-between mb-4">
          <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-md ${getCategoryColor(template.category)}`}>
            {template.category.toUpperCase()}
          </span>
          <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-1">
              <Eye size={12} />
              <span className="font-medium">{template.analytics.views}</span>
            </div>
            <div className="flex items-center space-x-1">
              <BarChart3 size={12} />
              <span className="font-medium">{template.usage}</span>
            </div>
          </div>
        </div>

        {template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {template.tags.slice(0, 2).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-600 dark:to-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-lg font-medium"
              >
                #{tag}
              </span>
            ))}
            {template.tags.length > 2 && (
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">+{template.tags.length - 2}</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
          <div className="flex items-center space-x-1">
            <User size={12} />
            <span className="font-medium">{template.user.name}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Calendar size={12} />
            <span>{new Date(template.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-1">
            <button
              onClick={onPreview}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all duration-200 hover:scale-110"
              title="Preview"
            >
              <Eye size={16} />
            </button>
            <button
              onClick={onEdit}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl transition-all duration-200 hover:scale-110"
              title="Edit"
            >
              <Edit size={16} />
            </button>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={onClone}
              disabled={isCloning}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl transition-all duration-200 hover:scale-110 disabled:opacity-50"
              title="Clone"
            >
              <Copy size={16} />
            </button>
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200 hover:scale-110 disabled:opacity-50"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TemplateCard;
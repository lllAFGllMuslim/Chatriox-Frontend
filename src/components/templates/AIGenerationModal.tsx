import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { 
  Sparkles, 
  Wand2, 
  Target, 
  Users, 
  Zap,
  Coffee,
  Briefcase,
  Heart,
  X,
  RefreshCw,
  CheckCircle
} from 'lucide-react';
import { GenerateTemplateRequest } from '../../types/template';

interface AIGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: () => void;
}

const AIGenerationModal: React.FC<AIGenerationModalProps> = ({ 
  isOpen, 
  onClose, 
  onGenerate 
}) => {
  const [formData, setFormData] = useState<GenerateTemplateRequest>({
    prompt: '',
    category: 'marketing',
    tone: 'professional',
    length: 'medium',
    industry: '',
    requirements: '',
    name: ''
  });

  const [step, setStep] = useState(1);
  const [generatedTemplate, setGeneratedTemplate] = useState(null);

  const generateMutation = useMutation({
    mutationFn: async (data: GenerateTemplateRequest) => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/email-templates/generate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(data)
        }
      );

      if (!response.ok) throw new Error('Failed to generate template');
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedTemplate(data.data);
      setStep(3);
      onGenerate();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generateMutation.mutate(formData);
    setStep(2);
  };

  const handleReset = () => {
    setFormData({
      prompt: '',
      category: 'marketing',
      tone: 'professional',
      length: 'medium',
      industry: '',
      requirements: '',
      name: ''
    });
    setStep(1);
    setGeneratedTemplate(null);
  };

  const getStepIcon = (stepNum: number) => {
    if (stepNum < step) return <CheckCircle className="text-green-500" size={20} />;
    if (stepNum === step) return <div className="w-5 h-5 bg-purple-500 rounded-full" />;
    return <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded-full" />;
  };

  const toneOptions = [
    { value: 'professional', label: 'Professional', icon: <Briefcase size={16} />, desc: 'Formal and business-focused' },
    { value: 'friendly', label: 'Friendly', icon: <Heart size={16} />, desc: 'Warm and approachable' },
    { value: 'urgent', label: 'Urgent', icon: <Zap size={16} />, desc: 'Time-sensitive and compelling' },
    { value: 'casual', label: 'Casual', icon: <Coffee size={16} />, desc: 'Relaxed and conversational' }
  ];

  const industryExamples = [
    'Technology & Software',
    'E-commerce & Retail',
    'Healthcare & Medical',
    'Finance & Banking',
    'Education & Training',
    'Real Estate',
    'Travel & Hospitality',
    'Food & Beverage',
    'Fitness & Wellness',
    'Consulting & Services'
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Sparkles size={24} />
              <div>
                <h2 className="text-2xl font-bold font-display">AI Template Generator</h2>
                <p className="text-purple-100">Create professional email templates with AI</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-purple-200 transition-colors text-2xl"
            >
              ×
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center space-x-4 mt-6">
            <div className="flex items-center space-x-2">
              {getStepIcon(1)}
              <span className={`text-sm ${step >= 1 ? 'text-white' : 'text-purple-200'}`}>
                Configure
              </span>
            </div>
            <div className="flex-1 h-0.5 bg-purple-400" />
            <div className="flex items-center space-x-2">
              {getStepIcon(2)}
              <span className={`text-sm ${step >= 2 ? 'text-white' : 'text-purple-200'}`}>
                Generate
              </span>
            </div>
            <div className="flex-1 h-0.5 bg-purple-400" />
            <div className="flex items-center space-x-2">
              {getStepIcon(3)}
              <span className={`text-sm ${step >= 3 ? 'text-white' : 'text-purple-200'}`}>
                Complete
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Template Purpose */}
                <div>
                  <label className="block text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    What's the purpose of this email template?
                  </label>
                  <textarea
                    value={formData.prompt}
                    onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    rows={3}
                    placeholder="e.g., Welcome new subscribers to our newsletter, announce a product launch, follow up with potential customers..."
                    required
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Be specific about your goals and target audience
                  </p>
                </div>

                {/* Quick Settings Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Category */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      Email Category
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'marketing', label: 'Marketing', icon: <Target size={16} /> },
                        { value: 'newsletter', label: 'Newsletter', icon: <Users size={16} /> },
                        { value: 'transactional', label: 'Transactional', icon: <CheckCircle size={16} /> },
                        { value: 'promotional', label: 'Promotional', icon: <Zap size={16} /> }
                      ].map((category) => (
                        <button
                          key={category.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, category: category.value }))}
                          className={`p-3 rounded-xl border-2 transition-all text-left ${
                            formData.category === category.value
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                              : 'border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-400'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            {category.icon}
                            <span className="font-medium text-sm">{category.label}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Template Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      Template Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="e.g., Welcome Email Template"
                    />
                  </div>
                </div>

                {/* Tone Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Select Tone & Style
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {toneOptions.map((tone) => (
                      <button
                        key={tone.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, tone: tone.value }))}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          formData.tone === tone.value
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-400'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-lg ${
                            formData.tone === tone.value
                              ? 'bg-purple-500 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}>
                            {tone.icon}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">{tone.label}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{tone.desc}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Length & Industry */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      Email Length
                    </label>
                    <select
                      value={formData.length}
                      onChange={(e) => setFormData(prev => ({ ...prev, length: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="short">Short (1-2 paragraphs)</option>
                      <option value="medium">Medium (3-4 paragraphs)</option>
                      <option value="long">Long (5+ paragraphs)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      Industry/Niche
                    </label>
                    <input
                      type="text"
                      value={formData.industry}
                      onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="e.g., SaaS, E-commerce, Healthcare"
                      list="industry-suggestions"
                    />
                    <datalist id="industry-suggestions">
                      {industryExamples.map((industry) => (
                        <option key={industry} value={industry} />
                      ))}
                    </datalist>
                  </div>
                </div>

                {/* Special Requirements */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Special Requirements (Optional)
                  </label>
                  <textarea
                    value={formData.requirements}
                    onChange={(e) => setFormData(prev => ({ ...prev, requirements: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    rows={3}
                    placeholder="e.g., Include a pricing table, add social media links, mention a specific offer or deadline..."
                  />
                </div>

                {/* Submit Button */}
                <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!formData.prompt.trim()}
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2 font-semibold"
                  >
                    <Wand2 size={16} />
                    <span>Generate Template</span>
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <div className="space-y-6">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto"></div>
                  <Sparkles className="absolute inset-0 m-auto text-purple-600" size={20} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    AI is crafting your template...
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                    Our AI is analyzing your requirements and creating a professional email template 
                    tailored to your needs.
                  </p>
                </div>
                {generateMutation.error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 max-w-md mx-auto">
                    <p className="text-red-800 dark:text-red-400 text-sm">
                      {generateMutation.error.message}
                    </p>
                    <button
                      onClick={() => setStep(1)}
                      className="mt-2 text-sm text-red-600 dark:text-red-400 underline hover:no-underline"
                    >
                      Go back and try again
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {step === 3 && generatedTemplate && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="text-center">
                <CheckCircle className="text-green-500 mx-auto mb-4" size={48} />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Template Generated Successfully!
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Your AI-generated email template is ready. You can now edit it or use it in your campaigns.
                </p>
              </div>

              {/* Template Preview Card */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {generatedTemplate.name}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <strong>Subject:</strong> {generatedTemplate.subject}
                </p>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 max-h-40 overflow-hidden relative">
                  <div 
                    className="text-sm text-gray-600 dark:text-gray-400"
                    dangerouslySetInnerHTML={{ 
                      __html: generatedTemplate.htmlContent.substring(0, 300) + '...' 
                    }}
                  />
                  <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white dark:from-gray-800 to-transparent" />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center space-x-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <button
                  onClick={handleReset}
                  className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors flex items-center space-x-2"
                >
                  <RefreshCw size={16} />
                  <span>Generate Another</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all font-semibold"
                >
                  Done
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AIGenerationModal;
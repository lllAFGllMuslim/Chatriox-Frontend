import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  X,
  Monitor,
  Tablet,
  Smartphone,
  Send,
  Download,
  Code,
  Eye,
  Mail,
  Edit,
  Settings,
  Maximize2,
  Minimize2,
  RotateCcw,
  TestTube,
  Copy,
  ExternalLink,
  Zap,
  RefreshCw,
  Loader
} from 'lucide-react';
import { EmailTemplate, TemplatePreview as PreviewData } from '../../types/template';

interface TemplatePreviewProps {
  template: EmailTemplate;
  isOpen: boolean;
  onClose: () => void;
}

const TemplatePreview: React.FC<TemplatePreviewProps> = ({ 
  template, 
  isOpen, 
  onClose 
}) => {
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [testData, setTestData] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    companyName: 'Acme Corp',
    productName: 'Amazing Product',
    currentDate: new Date().toLocaleDateString(),
    unsubscribeLink: '#unsubscribe'
  });
  const [testEmail, setTestEmail] = useState('');
  const [showTestData, setShowTestData] = useState(false);
  const [viewMode, setViewMode] = useState<'rendered' | 'code'>('rendered');

  // Fetch preview with test data
  const { data: previewData, refetch, isLoading } = useQuery({
    queryKey: ['template-preview', template._id, testData],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/email-templates/${template._id}/preview`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ testData })
        }
      );

      if (!response.ok) throw new Error('Failed to generate preview');
      return response.json();
    },
    enabled: isOpen
  });

  // Send test email mutation
  const sendTestMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/templates/${template._id}/send-test`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ email, testData })
        }
      );

      if (!response.ok) throw new Error('Failed to send test email');
      return response.json();
    }
  });

  const handleSendTest = () => {
    if (testEmail) {
      sendTestMutation.mutate(testEmail);
    }
  };

  const handleDownload = (format: 'html' | 'text') => {
    const content = format === 'html' 
      ? previewData?.data?.htmlContent || template.htmlContent
      : previewData?.data?.textContent || template.textContent;
    
    const blob = new Blob([content], { 
      type: format === 'html' ? 'text/html' : 'text/plain' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.replace(/\s+/g, '_')}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getPreviewWidth = () => {
    switch (previewMode) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      case 'desktop': return '100%';
      default: return '100%';
    }
  };

  const getPreviewHeight = () => {
    switch (previewMode) {
      case 'mobile': return '667px';
      case 'tablet': return '1024px';
      case 'desktop': return '100%';
      default: return '100%';
    }
  };

  const updateTestData = (key: string, value: string) => {
    setTestData(prev => ({ ...prev, [key]: value }));
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const renderWithTestData = (htmlContent: string) => {
    if (!htmlContent) return '';
    return htmlContent.replace(/{{(\w+)}}/g, (match, key) => {
      return testData[key as keyof typeof testData] || match;
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 50 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={`bg-white dark:bg-gray-900 rounded-3xl shadow-2xl ${
            isFullscreen ? 'w-screen h-screen' : 'w-full max-w-7xl max-h-[95vh]'
          } overflow-hidden border border-gray-200 dark:border-gray-700`}
        >
          {/* Enhanced Header */}
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                    <Eye className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{template.name}</h2>
                    <p className="text-white/80 text-sm">Email Template Preview</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowTestData(!showTestData)}
                    className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 ${
                      showTestData 
                        ? 'bg-white text-indigo-600 shadow-lg' 
                        : 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm'
                    }`}
                  >
                    <TestTube className="w-4 h-4" />
                    <span>Test Data</span>
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl transition-all duration-200 flex items-center space-x-2 backdrop-blur-sm"
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    <span>{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
                  </motion.button>
                  
                  <div className="flex items-center space-x-1 bg-white/20 rounded-xl p-1 backdrop-blur-sm">
                    <button
                      onClick={() => handleDownload('html')}
                      className="text-white hover:bg-white/20 px-3 py-2 rounded-lg transition-all duration-200 flex items-center space-x-1 text-sm"
                      title="Download HTML"
                    >
                      <Download className="w-4 h-4" />
                      <span>HTML</span>
                    </button>
                    <button
                      onClick={() => handleDownload('text')}
                      className="text-white hover:bg-white/20 px-3 py-2 rounded-lg transition-all duration-200 flex items-center space-x-1 text-sm"
                      title="Download Text"
                    >
                      <Download className="w-4 h-4" />
                      <span>TXT</span>
                    </button>
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="text-white hover:bg-white/20 p-2 rounded-xl transition-all duration-200"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex h-[calc(95vh-140px)]">
            {/* Enhanced Sidebar - Test Data */}
            <AnimatePresence>
              {showTestData && (
                <motion.div
                  initial={{ x: -320, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -320, opacity: 0 }}
                  className="w-80 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-r border-gray-200 dark:border-gray-700 p-6 overflow-y-auto"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">Test Data</h3>
                    <button
                      onClick={() => refetch()}
                      className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all duration-200"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {Object.entries(testData).map(([key, value]) => (
                      <div key={key} className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </label>
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => updateTestData(key, e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                          placeholder={`Enter ${key}`}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-indigo-500" />
                      <span>Send Test Email</span>
                    </h4>
                    <div className="space-y-4">
                      <input
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                        placeholder="Enter test email address"
                      />
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleSendTest}
                        disabled={!testEmail || sendTestMutation.isPending}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2 font-semibold"
                      >
                        {sendTestMutation.isPending ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        <span>
                          {sendTestMutation.isPending ? 'Sending...' : 'Send Test Email'}
                        </span>
                      </motion.button>
                    </div>
                    
                    <AnimatePresence>
                      {sendTestMutation.isSuccess && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-800 dark:text-green-400 text-sm"
                        >
                          Test email sent successfully!
                        </motion.div>
                      )}
                      
                      {sendTestMutation.error && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-800 dark:text-red-400 text-sm"
                        >
                          {sendTestMutation.error.message}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Main Preview Area */}
            <div className="flex-1 flex flex-col">
              {/* Enhanced Toolbar */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-semibold text-gray-900 dark:text-white">Subject: </span>
                      <span className="italic">{previewData?.data?.subject || template.subject}</span>
                    </div>
                    
                    {/* View Mode Toggle */}
                    <div className="flex bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm border border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => setViewMode('rendered')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          viewMode === 'rendered'
                            ? 'bg-indigo-500 text-white shadow-md'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                      >
                        <Eye className="inline w-4 h-4 mr-2" />
                        Preview
                      </button>
                      <button
                        onClick={() => setViewMode('code')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          viewMode === 'code'
                            ? 'bg-indigo-500 text-white shadow-md'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                      >
                        <Code className="inline w-4 h-4 mr-2" />
                        Source
                      </button>
                    </div>
                  </div>

                  {/* Device Preview Toggle */}
                  <div className="flex bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm border border-gray-200 dark:border-gray-700">
                    {[
                      { mode: 'mobile', icon: Smartphone, label: 'Mobile' },
                      { mode: 'tablet', icon: Tablet, label: 'Tablet' },
                      { mode: 'desktop', icon: Monitor, label: 'Desktop' }
                    ].map(({ mode, icon: Icon, label }) => (
                      <motion.button
                        key={mode}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setPreviewMode(mode as any)}
                        className={`p-3 rounded-lg transition-all duration-200 ${
                          previewMode === mode
                            ? 'bg-indigo-500 text-white shadow-md'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        title={label}
                      >
                        <Icon className="w-5 h-5" />
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview Content */}
              <div className="flex-1 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center p-6 overflow-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="text-center">
                      <Loader className="w-12 h-12 text-indigo-500 animate-spin mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">Loading preview...</p>
                    </div>
                  </div>
                ) : viewMode === 'code' ? (
                  <div className="w-full max-w-4xl bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="bg-gray-800 px-6 py-4 flex items-center justify-between border-b border-gray-700">
                      <h3 className="text-white font-semibold">HTML Source</h3>
                      <button
                        onClick={() => copyToClipboard(previewData?.data?.htmlContent || template.htmlContent || '')}
                        className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="p-6 overflow-auto max-h-96">
                      <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
                        {renderWithTestData(previewData?.data?.htmlContent || template.htmlContent || '')}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <motion.div 
                    layout
                    className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-300"
                    style={{ 
                      width: getPreviewWidth(),
                      maxWidth: '100%',
                      height: getPreviewHeight(),
                      maxHeight: '100%'
                    }}
                  >
                    <iframe
                      srcDoc={renderWithTestData(previewData?.data?.htmlContent || template.htmlContent || '')}
                      className="w-full h-full border-0"
                      title="Email Preview"
                    />
                  </motion.div>
                )}
              </div>

              {/* Enhanced Footer Stats */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-t border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-6 text-gray-600 dark:text-gray-400">
                    <span>
                      <strong className="text-gray-900 dark:text-white">Category:</strong> 
                      <span className="ml-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded-full text-xs font-medium">
                        {template.category}
                      </span>
                    </span>
                    <span>
                      <strong className="text-gray-900 dark:text-white">Tone:</strong> 
                      <span className="ml-1 capitalize">{template.tone}</span>
                    </span>
                    <span>
                      <strong className="text-gray-900 dark:text-white">Version:</strong> 
                      <span className="ml-1">{template.version}</span>
                    </span>
                  </div>
                  <div className="flex items-center space-x-6 text-gray-600 dark:text-gray-400">
                    <span>
                      <strong className="text-gray-900 dark:text-white">Views:</strong> 
                      <span className="ml-1">{template.analytics.views}</span>
                    </span>
                    <span>
                      <strong className="text-gray-900 dark:text-white">Uses:</strong> 
                      <span className="ml-1">{template.usage}</span>
                    </span>
                    <span>
                      <strong className="text-gray-900 dark:text-white">Created:</strong> 
                      <span className="ml-1">{new Date(template.createdAt).toLocaleDateString()}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TemplatePreview;
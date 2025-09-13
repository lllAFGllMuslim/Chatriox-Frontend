import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, Eye, Code, Smartphone, Monitor, Tablet, Undo, Redo, Bold, Italic, Link, Image as ImageIcon, Type, Palette, Layout, X, Sparkles, RefreshCw, Download, Upload, Settings, TestTube, Plus, Grip, MousePointer, Box, AlignLeft, AlignCenter, Heading, List, Quote, SeparatorVertical as Separator, Star, Zap } from 'lucide-react';
import { EmailTemplate } from '../../types/template';

interface TemplateEditorProps {
  template?: EmailTemplate;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

interface DraggableComponent {
  id: string;
  type: string;
  name: string;
  icon: React.ReactNode;
  defaultContent: string;
  category: string;
}

const TemplateEditor: React.FC<TemplateEditorProps> = ({ 
  template, 
  isOpen, 
  onClose, 
  onSave 
}) => {
  const [editorMode, setEditorMode] = useState<'visual' | 'code'>('visual');
  const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [activeTab, setActiveTab] = useState<'components' | 'content' | 'settings' | 'variables'>('components');
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [draggedComponent, setDraggedComponent] = useState<DraggableComponent | null>(null);
  const [canvasComponents, setCanvasComponents] = useState<any[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    htmlContent: '',
    textContent: '',
    category: 'marketing' as const,
    tags: [] as string[],
    isPublic: false,
    tone: 'professional' as const,
    length: 'medium' as const,
    industry: ''
  });

  // Test data for preview
  const [testData, setTestData] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    companyName: 'Your Company',
    productName: 'Amazing Product',
    currentDate: new Date().toLocaleDateString(),
    unsubscribeLink: '#unsubscribe'
  });

  const [variables, setVariables] = useState([
    { key: 'firstName', label: 'First Name', example: 'John' },
    { key: 'lastName', label: 'Last Name', example: 'Doe' },
    { key: 'email', label: 'Email', example: 'john@example.com' },
    { key: 'companyName', label: 'Company', example: 'Acme Corp' }
  ]);

  const queryClient = useQueryClient();
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Function to render content with test data
  const renderWithTestData = useCallback((htmlContent: string) => {
    if (!htmlContent) return '';
    return htmlContent.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return testData[key as keyof typeof testData] || match;
    });
  }, [testData]);

  // Draggable Components Library
  const componentLibrary: DraggableComponent[] = [
    {
      id: 'header',
      type: 'header',
      name: 'Header',
      icon: <Heading size={18} />,
      category: 'Structure',
      defaultContent: `
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 32px; font-weight: bold;">{{companyName}}</h1>
          <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Welcome to our community</p>
        </div>
      `
    },
    {
      id: 'text',
      type: 'text',
      name: 'Text Block',
      icon: <Type size={18} />,
      category: 'Content',
      defaultContent: `
        <div style="padding: 20px;">
          <p style="margin: 0; line-height: 1.6; color: #333; font-size: 16px;">
            Hello {{firstName}}, this is a customizable text block. You can edit this content to match your needs.
          </p>
        </div>
      `
    },
    {
      id: 'button',
      type: 'button',
      name: 'Button',
      icon: <MousePointer size={18} />,
      category: 'Interactive',
      defaultContent: `
        <div style="text-align: center; padding: 30px;">
          <a href="#" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
            Call to Action
          </a>
        </div>
      `
    },
    {
      id: 'image',
      type: 'image',
      name: 'Image',
      icon: <ImageIcon size={18} />,
      category: 'Media',
      defaultContent: `
        <div style="text-align: center; padding: 20px;">
          <img src="https://images.pexels.com/photos/1779487/pexels-photo-1779487.jpeg?auto=compress&cs=tinysrgb&w=600" alt="Image" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);" />
        </div>
      `
    },
    {
      id: 'divider',
      type: 'divider',
      name: 'Divider',
      icon: <Separator size={18} />,
      category: 'Structure',
      defaultContent: `
        <div style="padding: 20px 40px;">
          <hr style="border: none; height: 2px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 2px;" />
        </div>
      `
    },
    {
      id: 'list',
      type: 'list',
      name: 'List',
      icon: <List size={18} />,
      category: 'Content',
      defaultContent: `
        <div style="padding: 20px;">
          <ul style="list-style: none; padding: 0; margin: 0;">
            <li style="padding: 10px 0; border-bottom: 1px solid #eee; display: flex; align-items: center;">
              <span style="color: #667eea; margin-right: 10px;">✓</span>
              Feature or benefit #1
            </li>
            <li style="padding: 10px 0; border-bottom: 1px solid #eee; display: flex; align-items: center;">
              <span style="color: #667eea; margin-right: 10px;">✓</span>
              Feature or benefit #2
            </li>
            <li style="padding: 10px 0; display: flex; align-items: center;">
              <span style="color: #667eea; margin-right: 10px;">✓</span>
              Feature or benefit #3
            </li>
          </ul>
        </div>
      `
    },
    {
      id: 'quote',
      type: 'quote',
      name: 'Quote',
      icon: <Quote size={18} />,
      category: 'Content',
      defaultContent: `
        <div style="padding: 30px 20px; background: #f8f9fa; border-left: 4px solid #667eea; margin: 20px;">
          <blockquote style="margin: 0; font-style: italic; font-size: 18px; color: #555; line-height: 1.5;">
            "This is an inspiring quote or testimonial that adds credibility to your message."
          </blockquote>
          <cite style="display: block; margin-top: 10px; font-size: 14px; color: #888;">— Customer Name</cite>
        </div>
      `
    },
    {
      id: 'footer',
      type: 'footer',
      name: 'Footer',
      icon: <Box size={18} />,
      category: 'Structure',
      defaultContent: `
        <div style="background: #f8f9fa; padding: 40px 20px; text-align: center; border-top: 1px solid #eee;">
          <p style="margin: 0 0 10px; font-size: 14px; color: #666;">© 2024 {{companyName}}. All rights reserved.</p>
          <p style="margin: 0; font-size: 12px; color: #999;">
            <a href="#unsubscribe" style="color: #667eea; text-decoration: none;">Unsubscribe</a> | 
            <a href="#preferences" style="color: #667eea; text-decoration: none; margin-left: 8px;">Update Preferences</a>
          </p>
        </div>
      `
    }
  ];

  // Initialize form data when template changes
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        subject: template.subject,
        htmlContent: template.htmlContent,
        textContent: template.textContent || '',
        category: template.category,
        tags: template.tags,
        isPublic: template.isPublic,
        tone: template.tone,
        length: template.length,
        industry: template.industry || ''
      });
    } else {
      // New template defaults
      setFormData({
        name: '',
        subject: '',
        htmlContent: generateDefaultTemplate(),
        textContent: '',
        category: 'marketing',
        tags: [],
        isPublic: false,
        tone: 'professional',
        length: 'medium',
        industry: ''
      });
    }
    setUnsavedChanges(false);
  }, [template]);

  // Force iframe refresh when content changes
  useEffect(() => {
    if (formData.htmlContent) {
      setIframeKey(prev => prev + 1);
    }
  }, [formData.htmlContent, testData]);

  const generateDefaultTemplate = () => `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{subject}}</title>
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0;
            background-color: #f5f5f5;
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        @media (max-width: 600px) {
            .container { margin: 10px; border-radius: 8px; }
        }
    </style>
</head>
<body style="margin: 0; padding: 20px; background-color: #f5f5f5;">
    <div class="container" id="email-canvas">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 32px; font-weight: bold;">Welcome to {{companyName}}</h1>
            <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Your journey starts here</p>
        </div>
        <div style="padding: 40px 30px;">
            <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6;">Hi {{firstName}},</p>
            <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6;">We're excited to welcome you to our community! This email template is fully customizable using our drag-and-drop editor.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="#" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                    Get Started
                </a>
            </div>
        </div>
        <div style="background: #f8f9fa; padding: 30px 20px; text-align: center; border-top: 1px solid #eee;">
            <p style="margin: 0 0 10px; font-size: 14px; color: #666;">© 2024 {{companyName}}. All rights reserved.</p>
            <p style="margin: 0; font-size: 12px; color: #999;">
                <a href="#unsubscribe" style="color: #667eea; text-decoration: none;">Unsubscribe</a> | 
                <a href="#preferences" style="color: #667eea; text-decoration: none; margin-left: 8px;">Update Preferences</a>
            </p>
        </div>
    </div>
</body>
</html>`;

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const url = template 
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/email-templates/${template._id}`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/email-templates`;
      
      const method = template ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Failed to save template');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      setUnsavedChanges(false);
      onSave();
      if (!template) {
        onClose();
      }
    }
  });

  // Improve template with AI
  const improveMutation = useMutation({
    mutationFn: async (improvements: string) => {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/email-templates/${template?._id}/improve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ improvements })
        }
      );

      if (!response.ok) throw new Error('Failed to improve template');
      return response.json();
    },
    onSuccess: (data) => {
      setFormData(prev => ({
        ...prev,
        htmlContent: data.data.htmlContent,
        textContent: data.data.textContent,
        subject: data.data.subject
      }));
      setUnsavedChanges(true);
    }
  });

  const handleSave = () => {
    saveTemplateMutation.mutate(formData);
  };

  const handleImprove = () => {
    const improvements = prompt('What improvements would you like to make to this template?');
    if (improvements && template) {
      improveMutation.mutate(improvements);
    }
  };

  const handleDragStart = (component: DraggableComponent) => {
    setDraggedComponent(component);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedComponent) {
      insertComponentAtPosition(draggedComponent, 0);
      setDraggedComponent(null);
    }
  };

  const insertComponentAtPosition = (component: DraggableComponent, position: number) => {
    const currentHtml = formData.htmlContent;
    const canvasMatch = currentHtml.match(/<div[^>]*id="email-canvas"[^>]*>(.*)<\/div>/s);
    
    if (canvasMatch) {
      const canvasContent = canvasMatch[1];
      const newComponent = component.defaultContent;
      
      // Insert at the end for now - could be enhanced for specific positioning
      const updatedContent = canvasContent + newComponent;
      const updatedHtml = currentHtml.replace(
        /<div[^>]*id="email-canvas"[^>]*>.*<\/div>/s,
        `<div class="container" id="email-canvas">${updatedContent}</div>`
      );
      
      setFormData(prev => ({ ...prev, htmlContent: updatedHtml }));
      setUnsavedChanges(true);
    }
  };

  const insertVariable = (variable: string) => {
    const textarea = editorRef.current;
    if (textarea && editorMode === 'code') {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formData.htmlContent;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      
      setFormData(prev => ({
        ...prev,
        htmlContent: before + `{{${variable}}}` + after
      }));
      setUnsavedChanges(true);
    }
  };

  const addCustomVariable = () => {
    const key = prompt('Variable key (e.g., productName):');
    const label = prompt('Display label:');
    const example = prompt('Example value:');
    
    if (key && label) {
      setVariables(prev => [...prev, { key, label, example: example || key }]);
      setTestData(prev => ({ ...prev, [key]: example || key }));
    }
  };

  const getPreviewDimensions = () => {
    switch (previewMode) {
      case 'mobile': return { width: '375px', height: '100%', maxHeight: '667px' };
      case 'tablet': return { width: '768px', height: '100%', maxHeight: '1024px' };
      case 'desktop': return { width: '100%', height: '100%', maxHeight: '800px' };
      default: return { width: '100%', height: '100%', maxHeight: '800px' };
    }
  };

  const updateFormData = (key: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setUnsavedChanges(true);
  };

  const updateTestData = (key: string, value: string) => {
    setTestData(prev => ({ ...prev, [key]: value }));
  };

  if (!isOpen) return null;

  const dimensions = getPreviewDimensions();
  const componentCategories = Array.from(new Set(componentLibrary.map(c => c.category)));

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-[98vw] max-h-[98vh] overflow-hidden"
        >
          {/* Enhanced Header */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Layout size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {template ? 'Edit Template' : 'Create Template'}
                  </h2>
                  <p className="text-white/80 text-sm font-medium">
                    Drag & Drop Email Builder
                    {unsavedChanges && <span className="ml-2 bg-yellow-500 text-yellow-900 px-2 py-1 rounded-full text-xs">Unsaved</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {template && (
                  <button
                    onClick={handleImprove}
                    disabled={improveMutation.isPending}
                    className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl transition-all duration-200 flex items-center space-x-2 text-sm font-medium backdrop-blur-sm"
                  >
                    <Sparkles size={16} />
                    <span>{improveMutation.isPending ? 'Improving...' : 'AI Improve'}</span>
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={saveTemplateMutation.isPending}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-2 rounded-xl transition-all duration-200 flex items-center space-x-2 font-semibold shadow-lg"
                >
                  <Save size={18} />
                  <span>{saveTemplateMutation.isPending ? 'Saving...' : 'Save Template'}</span>
                </button>
                <button
                  onClick={onClose}
                  className="text-white/80 hover:text-white transition-colors p-2"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex h-[calc(98vh-96px)]">
            {/* Enhanced Sidebar */}
            <div className="w-80 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
              {/* Tabs */}
              <div className="flex border-b border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800">
                {[
                  { id: 'components', label: 'Components', icon: <Box size={16} /> },
                  { id: 'content', label: 'Content', icon: <Type size={16} /> },
                  { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
                  { id: 'variables', label: 'Variables', icon: <Zap size={16} /> }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center space-x-2 px-3 py-4 text-sm font-semibold border-b-2 transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {tab.icon}
                    <span className="hidden sm:block">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                  {activeTab === 'components' && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="p-4 space-y-6"
                    >
                      {componentCategories.map(category => (
                        <div key={category}>
                          <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-3 uppercase tracking-wider">
                            {category}
                          </h4>
                          <div className="grid grid-cols-2 gap-3">
                            {componentLibrary
                              .filter(comp => comp.category === category)
                              .map((component) => (
                                <motion.div
                                  key={component.id}
                                  draggable
                                  onDragStart={() => handleDragStart(component)}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 cursor-grab active:cursor-grabbing hover:shadow-lg transition-all duration-200 group"
                                >
                                  <div className="flex flex-col items-center space-y-2">
                                    <div className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg text-blue-600 dark:text-blue-400 group-hover:from-blue-200 group-hover:to-indigo-200 transition-all">
                                      {component.icon}
                                    </div>
                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-center">
                                      {component.name}
                                    </span>
                                  </div>
                                </motion.div>
                              ))
                            }
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}

                  {activeTab === 'content' && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="p-4 space-y-6"
                    >
                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                          Template Name
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => updateFormData('name', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium"
                          placeholder="Enter template name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                          Subject Line
                        </label>
                        <input
                          type="text"
                          value={formData.subject}
                          onChange={(e) => updateFormData('subject', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium"
                          placeholder="Enter subject line"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                          Category
                        </label>
                        <select
                          value={formData.category}
                          onChange={(e) => updateFormData('category', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium"
                        >
                          <option value="marketing">Marketing</option>
                          <option value="transactional">Transactional</option>
                          <option value="newsletter">Newsletter</option>
                          <option value="promotional">Promotional</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                          Tags
                        </label>
                        <input
                          type="text"
                          value={formData.tags.join(', ')}
                          onChange={(e) => updateFormData('tags', e.target.value.split(',').map(tag => tag.trim()).filter(Boolean))}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium"
                          placeholder="Enter tags (comma separated)"
                        />
                      </div>

                      {/* Test Data Section */}
                      <div className="pt-6 border-t border-gray-200 dark:border-gray-600">
                        <h4 className="font-bold text-gray-900 dark:text-white mb-4">Preview Data</h4>
                        <div className="space-y-4">
                          {Object.entries(testData).map(([key, value]) => (
                            <div key={key}>
                              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 capitalize">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </label>
                              <input
                                type="text"
                                value={value}
                                onChange={(e) => updateTestData(key, e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'settings' && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="p-4 space-y-6"
                    >
                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                          Tone
                        </label>
                        <select
                          value={formData.tone}
                          onChange={(e) => updateFormData('tone', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium"
                        >
                          <option value="professional">Professional</option>
                          <option value="friendly">Friendly</option>
                          <option value="urgent">Urgent</option>
                          <option value="casual">Casual</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                          Industry
                        </label>
                        <input
                          type="text"
                          value={formData.industry}
                          onChange={(e) => updateFormData('industry', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium"
                          placeholder="e.g., Technology, Healthcare"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                        <div>
                          <label className="text-sm font-bold text-gray-700 dark:text-gray-300">
                            Make Public
                          </label>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Allow others to use this template
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.isPublic}
                            onChange={(e) => updateFormData('isPublic', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'variables' && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="p-4 space-y-6"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-gray-900 dark:text-white">Available Variables</h4>
                        <button
                          onClick={addCustomVariable}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-semibold flex items-center space-x-1"
                        >
                          <Plus size={16} />
                          <span>Add Custom</span>
                        </button>
                      </div>

                      <div className="space-y-3">
                        {variables.map((variable, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 group hover:shadow-md transition-all duration-200"
                          >
                            <div>
                              <div className="font-semibold text-sm text-gray-900 dark:text-white">
                                {variable.label}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded mt-1">
                                {`{{${variable.key}}}`}
                              </div>
                              <div className="text-xs text-gray-400 mt-1">
                                e.g., {variable.example}
                              </div>
                            </div>
                            <button
                              onClick={() => insertVariable(variable.key)}
                              className="opacity-0 group-hover:opacity-100 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
                            >
                              Insert
                            </button>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Main Editor Area */}
            <div className="flex-1 flex flex-col">
              {/* Enhanced Toolbar */}
              <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Editor Mode Toggle */}
                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1.5 shadow-inner">
                      <button
                        onClick={() => setEditorMode('visual')}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 font-medium text-sm ${
                          editorMode === 'visual'
                            ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                      >
                        <Eye size={16} />
                        <span>Visual</span>
                      </button>
                      <button
                        onClick={() => setEditorMode('code')}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 font-medium text-sm ${
                          editorMode === 'code'
                            ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                      >
                        <Code size={16} />
                        <span>Code</span>
                      </button>
                    </div>
                  </div>

                  {/* Preview Mode Toggle */}
                  <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1.5 shadow-inner">
                    {[
                      { mode: 'mobile', icon: <Smartphone size={18} />, label: 'Mobile' },
                      { mode: 'tablet', icon: <Tablet size={18} />, label: 'Tablet' },
                      { mode: 'desktop', icon: <Monitor size={18} />, label: 'Desktop' }
                    ].map((device) => (
                      <button
                        key={device.mode}
                        onClick={() => setPreviewMode(device.mode as any)}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 font-medium text-sm ${
                          previewMode === device.mode
                            ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                        }`}
                        title={device.label}
                      >
                        {device.icon}
                        <span className="hidden sm:block">{device.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Editor Content */}
              <div className="flex-1 flex bg-gray-50 dark:bg-gray-900">
                {/* Code Editor */}
                {editorMode === 'code' && (
                  <div className="w-1/2 border-r border-gray-200 dark:border-gray-700">
                    <textarea
                      ref={editorRef}
                      value={formData.htmlContent}
                      onChange={(e) => updateFormData('htmlContent', e.target.value)}
                      className="w-full h-full p-6 font-mono text-sm bg-gray-900 text-green-400 resize-none focus:outline-none"
                      style={{ fontFamily: 'JetBrains Mono, Monaco, Consolas, monospace' }}
                      spellCheck={false}
                    />
                  </div>
                )}

                {/* Canvas/Preview Area */}
                <div 
                  className={`${editorMode === 'code' ? 'w-1/2' : 'w-full'} flex items-center justify-center p-8 relative`}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  ref={canvasRef}
                >
                  {/* Drop Zone Indicator */}
                  {draggedComponent && (
                    <div className="absolute inset-4 border-4 border-dashed border-blue-400 bg-blue-50/50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center z-10">
                      <div className="text-blue-600 dark:text-blue-400 text-center">
                        <Box size={48} className="mx-auto mb-2" />
                        <p className="font-semibold">Drop {draggedComponent.name} here</p>
                      </div>
                    </div>
                  )}

                  <motion.div 
                    key={`${previewMode}-${iframeKey}`}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className={`relative bg-white rounded-2xl shadow-2xl overflow-hidden ${
                      previewMode === 'mobile' ? 'border-8 border-gray-800' : ''
                    }`}
                    style={dimensions}
                  >
                    <div className="relative h-full">
                      <iframe
                        ref={iframeRef}
                        key={iframeKey}
                        srcDoc={renderWithTestData(formData.htmlContent)}
                        className="w-full h-full border-0"
                        style={{ 
                          height: dimensions.maxHeight,
                          minHeight: '400px'
                        }}
                        title="Email Preview"
                        sandbox="allow-same-origin"
                      />
                      {!formData.htmlContent && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                          <div className="text-center text-gray-500">
                            <Layout size={48} className="mx-auto mb-4 text-gray-300" />
                            <p className="text-lg font-medium">Start building your email</p>
                            <p className="text-sm">Drag components from the sidebar to get started</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TemplateEditor;
// EmailTrackingDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Mail,
  Eye,
  MousePointer,
  TrendingUp,
  Download,
  Search,
  Brain,
  Target,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  XCircle,
  Clock,
  Zap
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface AIRecommendation {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  action: string;
}

interface AIInsights {
  recommendations: AIRecommendation[];
  riskAssessment?: Record<string, number>;
  generatedAt: string;
  rawResponse?: string;
}

const EmailTrackingDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [selectedCampaignForAI, setSelectedCampaignForAI] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiRawResponse, setAiRawResponse] = useState<string | null>(null);

  // API helper
  const apiCall = async (endpoint: string, options: any = {}) => {
    const token = localStorage.getItem('token');

    const response = await fetch(`http://localhost:5000/api${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      let errorText;
      try {
        errorText = await response.text();
      } catch {
        errorText = 'Could not read error response';
      }
      throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  };

  // Queries
  const {
    data: analyticsData,
    isLoading: analyticsLoading,
    refetch: refetchAnalytics,
    error: analyticsError
  } = useQuery({
    queryKey: ['email-analytics', timeRange, showAIInsights],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('timeRange', timeRange);
      if (showAIInsights) params.append('includeAI', 'true');
      return apiCall(`/email-tracking/analytics?${params.toString()}`);
    },
    retry: 2
  });

  const { 
    data: activitiesData, 
    isLoading: activitiesLoading,
    error: activitiesError 
  } = useQuery({
    queryKey: ['email-activities', statusFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchTerm) params.append('recipient', searchTerm);
      return apiCall(`/email-tracking/activities?${params.toString()}`);
    },
    retry: 2
  });

  // Mutations
  const campaignAIMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      return apiCall(`/analysis/campaign/${campaignId}`, { method: 'POST' });
    },
    onSuccess: (data) => {
      setAiError(null);
      console.log('Campaign AI analysis result:', data);
    },
    onError: (error: any) => {
      setAiError(error.message || 'Campaign analysis failed');
      console.error('Campaign AI analysis error:', error);
    }
  });

  const overallAIMutation = useMutation({
    mutationFn: async (range: string) => {
      return apiCall('/analysis/overview', {
        method: 'POST',
        body: JSON.stringify({ timeRange: range })
      });
    },
    onSuccess: (data) => {
      setShowAIInsights(true);
      setAiError(null);
      setAiRawResponse(data.data.rawResponse); // Add this line
      console.log('Overall AI analysis result:', data.data.rawResponse);
      setTimeout(() => {
        refetchAnalytics();
      }, 500);
    },
    onError: (error: any) => {
      setAiError(error.message || 'AI analysis failed');
      console.error('Overall AI analysis error:', error);
    }
  });

  const analytics = analyticsData?.data?.overview || {};
  const rawDailyStats = analyticsData?.data?.dailyStats || [];
  const dailyStats = rawDailyStats.map((stat: any) => ({
    ...stat,
    day:
      typeof stat._id?.day === 'object'
        ? Object.keys(stat._id.day)
        : stat._id?.day || stat.day || 'Unknown',
    sent: Number(stat.sent) || 0,
    delivered: Number(stat.delivered) || 0,
    opened: Number(stat.opened) || 0,
    clicked: Number(stat.clicked) || 0
  }));

  const topTemplates = analyticsData?.data?.topTemplates || [];
  const activities = activitiesData?.data || [];
  const aiInsights: AIInsights | null = analyticsData?.data?.aiInsights;
  const hasAIAnalysis = analyticsData?.data?.hasAIAnalysis;

  useEffect(() => {
    if (analyticsError || activitiesError) {
      console.error('Dashboard errors:', { analyticsError, activitiesError });
    }
  }, [analyticsError, activitiesError]);

  const statsCards = [
    {
      title: 'Total Emails Sent',
      value: analytics.totalEmails?.toLocaleString() || '0',
      change: '+12%',
      changeType: 'positive' as const,
      icon: <Mail className="text-blue-500" size={24} />
    },
    {
      title: 'Delivery Rate',
      value: `${analytics.deliveryRate || 0}%`,
      change: '+2.1%',
      changeType: 'positive' as const,
      icon: <TrendingUp className="text-green-500" size={24} />
    },
    {
      title: 'Open Rate',
      value: `${analytics.openRate || 0}%`,
      change: '+5.3%',
      changeType: 'positive' as const,
      icon: <Eye className="text-purple-500" size={24} />
    },
    {
      title: 'Click Rate',
      value: `${analytics.clickRate || 0}%`,
      change: '+1.8%',
      changeType: 'positive' as const,
      icon: <MousePointer className="text-orange-500" size={24} />
    }
  ];

  // Helper function to safely render recipient
  const renderRecipient = (recipient: any) => {
    if (typeof recipient === 'string') {
      return recipient;
    }
    if (typeof recipient === 'object' && recipient !== null) {
      if (recipient.name && recipient.email) {
        return `${recipient.name} (${recipient.email})`;
      }
      if (recipient.email) {
        return recipient.email;
      }
      if (recipient.name) {
        return recipient.name;
      }
      return JSON.stringify(recipient);
    }
    return 'Unknown recipient';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'opened':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'clicked':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'bounced':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'failed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'LOW':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return <AlertTriangle className="text-red-500" size={16} />;
      case 'MEDIUM':
        return <Clock className="text-yellow-500" size={16} />;
      case 'LOW':
        return <Target className="text-blue-500" size={16} />;
      default:
        return <Target className="text-gray-500" size={16} />;
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append('format', 'csv');
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchTerm) params.append('recipient', searchTerm);

      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5000/api/email-tracking/export?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `email_activities_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const handleGenerateAIInsights = () => {
    setShowAIInsights(true);
    setAiError(null);
    overallAIMutation.mutate(timeRange);
  };

  const handleCampaignAIAnalysis = (campaignId: string) => {
    setSelectedCampaignForAI(campaignId);
    setAiError(null);
    campaignAIMutation.mutate(campaignId);
  };

  const dismissAiError = () => {
    setAiError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold font-display text-gray-900 dark:text-white">
            Email Tracking
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor email performance and engagement metrics
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>

          {hasAIAnalysis && (
            <button
              onClick={handleGenerateAIInsights}
              disabled={overallAIMutation.isPending}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {overallAIMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <Brain size={16} />
              )}
              <span>{overallAIMutation.isPending ? 'Analyzing...' : 'AI Insights'}</span>
            </button>
          )}

          <button
            onClick={handleExport}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Download size={16} />
            <span>Export</span>
          </button>
        </div>
      </motion.div>

      {/* Error Display */}
      {aiError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center justify-between"
        >
          <div className="flex items-center space-x-3">
            <XCircle className="text-red-500" size={20} />
            <span className="text-red-700 dark:text-red-400">{aiError}</span>
          </div>
          <button
            onClick={dismissAiError}
            className="text-red-500 hover:text-red-700 transition-colors"
          >
            <XCircle size={16} />
          </button>
        </motion.div>
      )}

      {/* AI Recommendations */}
      {(aiInsights || (showAIInsights && overallAIMutation.isPending)) && !aiError && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-2xl p-6 border border-red-200 dark:border-red-800"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg">
                <AlertTriangle className="text-white" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Critical Issues Requiring Immediate Action
                </h3>
                {aiInsights ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Analysis generated {new Date(aiInsights.generatedAt).toLocaleString()}
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Analyzing campaign performance for critical issues...
                    </p>
                    {aiRawResponse && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border">
                        <strong>AI Analysis:</strong> {aiRawResponse}
                      </p>
                    )}
                  </>
                )}
                {aiRawResponse && (
                  <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center space-x-2 mb-3">
                      <Brain className="text-blue-600" size={16} />
                      <strong className="text-sm font-semibold text-blue-800 dark:text-blue-300">AI Analysis Details:</strong>
                    </div>
                    <div className="rounded-lg p-3">
                      <ul className="space-y-2 text-md text-gray-700 dark:text-gray-300">
                        {aiRawResponse.split('\n').filter(line => line.trim()).map((line, index) => {
                          const trimmedLine = line.trim();
                          let bulletColor = 'bg-blue-500'; // default
                          
                          if (trimmedLine.startsWith('HIGH:')) {
                            bulletColor = 'bg-red-500';
                          } else if (trimmedLine.startsWith('MEDIUM:')) {
                            bulletColor = 'bg-orange-500';
                          } else if (trimmedLine.startsWith('LOW:')) {
                            bulletColor = 'bg-yellow-500';
                          }
                          
                          return (
                            <li key={index} className="flex items-start space-x-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${bulletColor} mt-2 flex-shrink-0`}></div>
                              <span className="leading-relaxed">{trimmedLine}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {aiInsights?.riskAssessment && (
              <div className="flex items-center space-x-2">
                {Object.entries(aiInsights.riskAssessment).map(([risk, count]) => (
                  <div key={risk} className="text-center">
                    <div className={`text-xs font-medium ${getPriorityColor(risk.toUpperCase())} px-2 py-1 rounded-full`}>
                      {risk.toUpperCase()}: {count}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {overallAIMutation.isPending ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
              <span className="ml-3 text-gray-600 dark:text-gray-400">
                Analyzing email program for critical issues that need fixing...
              </span>
            </div>
          ) : aiInsights?.recommendations ? (
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                <Zap className="mr-2 text-red-500" size={18} />
                Actions Required ({aiInsights.recommendations.length} issues found)
              </h4>

              <div className="space-y-3">
                {aiInsights.recommendations.map((rec, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-xl border bg-white dark:bg-gray-800 border-red-200 dark:border-red-800 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start space-x-3">
                      {getPriorityIcon(rec.priority)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getPriorityColor(rec.priority)}`}>
                            {rec.priority} PRIORITY
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          <span className="font-medium text-red-600 dark:text-red-400">Action Required:</span> {rec.action}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {aiInsights.recommendations.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="mx-auto text-green-500 mb-3" size={48} />
                  <p className="text-gray-600 dark:text-gray-400">
                    Great! No critical issues found in your email campaigns.
                  </p>
                </div>
              )}
            </div>
          ) : null}
        </motion.div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</p>
                <p className="text-2xl font-bold font-display text-gray-900 dark:text-white mt-1">
                  {stat.value}
                </p>
              </div>
              <div className="flex-shrink-0">{stat.icon}</div>
            </div>
            <div className="flex items-center">
              <ArrowUpRight className="text-green-500 mr-1" size={16} />
              <span className="text-sm font-medium text-green-600">{stat.change}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">vs last period</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Email Performance Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <h3 className="text-lg font-semibold font-display text-gray-900 dark:text-white mb-6">
            Email Performance
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis
                  dataKey="day"
                  stroke="#6B7280"
                  tickFormatter={(value) => (typeof value === 'string' ? value : String(value))}
                />
                <YAxis stroke="#6B7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#F9FAFB'
                  }}
                />
                <Line type="monotone" dataKey="sent" stroke="#3B82F6" strokeWidth={3} name="Sent" />
                <Line
                  type="monotone"
                  dataKey="delivered"
                  stroke="#10B981"
                  strokeWidth={3}
                  name="Delivered"
                />
                <Line
                  type="monotone"
                  dataKey="opened"
                  stroke="#8B5CF6"
                  strokeWidth={3}
                  name="Opened"
                />
                <Line
                  type="monotone"
                  dataKey="clicked"
                  stroke="#F59E0B"
                  strokeWidth={3}
                  name="Clicked"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Top Templates */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <h3 className="text-lg font-semibold font-display text-gray-900 dark:text-white mb-6">
            Top Performing Templates
          </h3>
          <div className="space-y-4">
            {topTemplates.map((template: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {template._id || 'Unknown Template'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {template.sent} emails sent
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">
                    {template.openRate?.toFixed(1) || 0}%
                  </p>
                  <p className="text-sm text-gray-500">open rate</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Campaigns */}
      {analyticsData?.data?.recentCampaigns && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <h3 className="text-lg font-semibold font-display text-gray-900 dark:text-white mb-6">
            Recent Campaigns
          </h3>
          <div className="space-y-4">
            {analyticsData.data.recentCampaigns.map((campaign: any) => (
              <div
                key={campaign._id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">{campaign.name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{campaign.subject}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-xs text-gray-500">Sent: {campaign.stats?.sent || 0}</span>
                    <span className="text-xs text-gray-500">
                      Opens: {campaign.openRate?.toFixed(1) || 0}%
                    </span>
                    <span className="text-xs text-gray-500">
                      Clicks: {campaign.clickRate?.toFixed(1) || 0}%
                    </span>
                  </div>
                </div>

                {hasAIAnalysis && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleCampaignAIAnalysis(campaign._id)}
                      disabled={
                        campaignAIMutation.isPending && selectedCampaignForAI === campaign._id
                      }
                      className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-3 py-2 rounded-lg hover:from-red-700 hover:to-orange-700 transition-all duration-200 flex items-center space-x-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {campaignAIMutation.isPending &&
                      selectedCampaignForAI === campaign._id ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                      ) : (
                        <AlertTriangle size={14} />
                      )}
                      <span>Check Issues</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recent Email Activities */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold font-display text-gray-900 dark:text-white">
            Recent Email Activities
          </h3>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Search recipients..."
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
              <option value="opened">Opened</option>
              <option value="clicked">Clicked</option>
              <option value="bounced">Bounced</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        {activitiesLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading activities...</span>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8">
            <Mail className="mx-auto text-gray-400 mb-3" size={48} />
            <p className="text-gray-600 dark:text-gray-400">No email activities found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((act: any, idx: number) => (
              <div
                key={act._id || idx}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:shadow-md transition-shadow"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {renderRecipient(act.recipient)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(act.createdAt).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusColor(
                    act.status
                  )}`}
                >
                  {act.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default EmailTrackingDashboard;
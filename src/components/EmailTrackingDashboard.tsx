import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Mail,
  Eye,
  MousePointer,
  TrendingUp,
  Download,
  Filter,
  Search,
  Calendar,
  BarChart3,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Brain,
  Lightbulb,
  Target,
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

const EmailTrackingDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [selectedCampaignForAI, setSelectedCampaignForAI] = useState(null);

  // API helper function with better error handling
  const apiCall = async (endpoint: string, options = {}) => {
    const token = localStorage.getItem('token');
    
    console.log('Making API call to:', `http://localhost:5000/api${endpoint}`);
    console.log('Options:', options);
    
    const response = await fetch(`http://localhost:5000/api${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      let errorText;
      try {
        errorText = await response.text();
        console.error('Error response body:', errorText);
      } catch (e) {
        errorText = 'Could not read error response';
      }
      throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    return response.json();
  };

  // Fetch email analytics with optional AI insights
  const { data: analyticsData, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: ['email-analytics', timeRange, showAIInsights],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('timeRange', timeRange);
      if (showAIInsights) {
        params.append('includeAI', 'true');
      }
      return apiCall(`/email-tracking/analytics?${params}`);
    }
  });

  // Fetch email activities
  const { data: activitiesData, isLoading: activitiesLoading } = useQuery({
    queryKey: ['email-activities', statusFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchTerm) params.append('recipient', searchTerm);
      return apiCall(`/email-tracking/activities?${params}`);
    }
  });

  // AI Analysis mutations - FIXED ENDPOINTS
  const campaignAIMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      console.log('Calling campaign AI analysis for:', campaignId);
      return apiCall(`/analysis/campaign/${campaignId}`, {
        method: 'POST'
      });
    },
    onSuccess: (data) => {
      console.log('Campaign AI analysis completed:', data);
    },
    onError: (error) => {
      console.error('Campaign AI analysis failed:', error);
    }
  });

  const overallAIMutation = useMutation({
    mutationFn: async (timeRange: string) => {
      console.log('Calling AI analysis with timeRange:', timeRange);
      return apiCall('/analysis/overview', {
        method: 'POST',
        body: JSON.stringify({ timeRange })
      });
    },
    onSuccess: (data) => {
      console.log('Overall AI analysis completed:', data);
      // Force show AI insights and refetch with AI parameter
      setShowAIInsights(true);
      setTimeout(() => {
        refetchAnalytics();
      }, 500);
    },
    onError: (error) => {
      console.error('Overall AI analysis failed:', error);
    }
  });

  const analytics = analyticsData?.data?.overview || {};
  // FIX: Process dailyStats to ensure proper data format
  const rawDailyStats = analyticsData?.data?.dailyStats || [];
  const dailyStats = rawDailyStats.map((stat: any) => ({
    ...stat,
    // Convert date object or string to proper format
    day: typeof stat._id?.day === 'object' 
      ? Object.keys(stat._id.day)[0] // If it's an object, take the first key
      : stat._id?.day || stat.day || 'Unknown', // Otherwise use as is
    // Ensure all numeric values are proper numbers
    sent: Number(stat.sent) || 0,
    delivered: Number(stat.delivered) || 0,
    opened: Number(stat.opened) || 0,
    clicked: Number(stat.clicked) || 0
  }));
  
  const topTemplates = analyticsData?.data?.topTemplates || [];
  const activities = activitiesData?.data || [];
  const aiInsights = analyticsData?.data?.aiInsights;
  const hasAIAnalysis = analyticsData?.data?.hasAIAnalysis;

  // Add debugging
  React.useEffect(() => {
    console.log('Analytics data changed:', analyticsData);
    console.log('Raw daily stats:', rawDailyStats);
    console.log('Processed daily stats:', dailyStats);
    console.log('AI Insights:', aiInsights);
    console.log('Show AI Insights:', showAIInsights);
    console.log('Has AI Analysis:', hasAIAnalysis);
  }, [analyticsData, aiInsights, showAIInsights, hasAIAnalysis, dailyStats]);

  const statsCards = [
    {
      title: 'Total Emails Sent',
      value: analytics.totalEmails?.toLocaleString() || '0',
      change: '+12%',
      changeType: 'positive' as const,
      icon: <Mail className="text-blue-500" size={24} />,
      color: 'blue'
    },
    {
      title: 'Delivery Rate',
      value: `${analytics.deliveryRate || 0}%`,
      change: '+2.1%',
      changeType: 'positive' as const,
      icon: <TrendingUp className="text-green-500" size={24} />,
      color: 'green'
    },
    {
      title: 'Open Rate',
      value: `${analytics.openRate || 0}%`,
      change: '+5.3%',
      changeType: 'positive' as const,
      icon: <Eye className="text-purple-500" size={24} />,
      color: 'purple'
    },
    {
      title: 'Click Rate',
      value: `${analytics.clickRate || 0}%`,
      change: '+1.8%',
      changeType: 'positive' as const,
      icon: <MousePointer className="text-orange-500" size={24} />,
      color: 'orange'
    }
  ];

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

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append('format', 'csv');
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchTerm) params.append('recipient', searchTerm);

      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/email-tracking/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

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
    console.log('Generate AI Insights clicked, timeRange:', timeRange);
    setShowAIInsights(true); // Set this first
    overallAIMutation.mutate(timeRange);
  };

  const handleCampaignAIAnalysis = (campaignId: string) => {
    setSelectedCampaignForAI(campaignId);
    campaignAIMutation.mutate(campaignId);
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
          <h1 className="text-3xl font-bold font-display text-gray-900 dark:text-white">Email Tracking</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Monitor email performance and engagement metrics</p>
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
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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

      {/* AI Insights Section */}
      {(aiInsights || (showAIInsights && overallAIMutation.isPending)) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
                <Sparkles className="text-white" size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI-Powered Insights</h3>
                {aiInsights ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Generated {new Date(aiInsights.generatedAt).toLocaleString()}
                  </p>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Analyzing your campaign performance...
                  </p>
                )}
              </div>
            </div>
          </div>

          {overallAIMutation.isPending ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Generating AI insights...</span>
            </div>
          ) : aiInsights ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                    <Lightbulb className="mr-2 text-yellow-500" size={18} />
                    Key Insights
                  </h4>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {aiInsights.summary}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                    <Target className="mr-2 text-green-500" size={18} />
                    Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {aiInsights.recommendations?.slice(0, 3).map((rec: string, index: number) => (
                      <li key={index} className="flex items-start space-x-2">
                        <CheckCircle className="text-green-500 mt-0.5 flex-shrink-0" size={16} />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

            </>
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
                <p className="text-2xl font-bold font-display text-gray-900 dark:text-white mt-1">{stat.value}</p>
              </div>
              <div className="flex-shrink-0">
                {stat.icon}
              </div>
            </div>
            <div className="flex items-center">
              {stat.changeType === 'positive' ? (
                <ArrowUpRight className="text-green-500 mr-1" size={16} />
              ) : (
                <ArrowDownRight className="text-red-500 mr-1" size={16} />
              )}
              <span className={`text-sm font-medium ${
                stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
              }`}>
                {stat.change}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">vs last period</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email Performance Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <h3 className="text-lg font-semibold font-display text-gray-900 dark:text-white mb-6">Email Performance</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis 
                  dataKey="day" 
                  stroke="#6B7280"
                  tickFormatter={(value) => {
                    // Ensure we're always displaying a string
                    return typeof value === 'string' ? value : String(value);
                  }}
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
                <Line type="monotone" dataKey="delivered" stroke="#10B981" strokeWidth={3} name="Delivered" />
                <Line type="monotone" dataKey="opened" stroke="#8B5CF6" strokeWidth={3} name="Opened" />
                <Line type="monotone" dataKey="clicked" stroke="#F59E0B" strokeWidth={3} name="Clicked" />
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
          <h3 className="text-lg font-semibold font-display text-gray-900 dark:text-white mb-6">Top Performing Templates</h3>
          <div className="space-y-4">
            {topTemplates.map((template: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{template._id || 'Unknown Template'}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{template.sent} emails sent</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">{template.openRate?.toFixed(1) || 0}%</p>
                  <p className="text-sm text-gray-500">open rate</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Campaigns with AI Analysis */}
      {analyticsData?.data?.recentCampaigns && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <h3 className="text-lg font-semibold font-display text-gray-900 dark:text-white mb-6">Recent Campaigns</h3>
          <div className="space-y-4">
            {analyticsData.data.recentCampaigns.map((campaign: any) => (
              <div key={campaign._id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">{campaign.name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{campaign.subject}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <span className="text-xs text-gray-500">
                      Sent: {campaign.stats?.sent || 0}
                    </span>
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
                      disabled={campaignAIMutation.isPending && selectedCampaignForAI === campaign._id}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-2 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 flex items-center space-x-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {campaignAIMutation.isPending && selectedCampaignForAI === campaign._id ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                      ) : (
                        <Zap size={14} />
                      )}
                      <span>Analyze</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Email Activities */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold font-display text-gray-900 dark:text-white">Recent Email Activities</h3>
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
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Recipient</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Subject</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Template</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Sent At</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Opens</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Clicks</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity: any) => (
                  <tr key={activity._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-4 px-4">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{activity.recipient.email}</div>
                        {activity.recipient.name && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">{activity.recipient.name}</div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="max-w-xs truncate text-gray-900 dark:text-white">
                        {activity.emailDetails.subject}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                      {activity.template.name || 'Custom'}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(activity.status)}`}>
                        {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                      {new Date(activity.tracking.sentAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-purple-600 font-medium">{activity.tracking.opens}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-orange-600 font-medium">{activity.tracking.clicks}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* AI Usage Info */}
      {hasAIAnalysis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-2xl p-4 border border-blue-200 dark:border-blue-800"
        >
          <div className="flex items-center space-x-3">
            <AlertCircle className="text-blue-600" size={20} />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">AI Analysis Available</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Get personalized insights and recommendations powered by AI to optimize your email campaigns.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default EmailTrackingDashboard;
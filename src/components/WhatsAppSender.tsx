import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MessageSquare, Plus, QrCode, Send, Users, Image, FileText, Video,
  CheckCircle, XCircle, AlertTriangle, RefreshCw, BarChart3, Clock,
  Upload, Eye, Play, Pause, TrendingUp, Activity, Wifi, WifiOff, Power, RotateCcw
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import io from 'socket.io-client';

const API_BASE = 'http://localhost:5000';

const WhatsAppSender = () => {
  const { user } = useAuth();
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeData, setQrCodeData] = useState('');
  const [messageType, setMessageType] = useState('text');
  const [messageContent, setMessageContent] = useState('');
  const [recipients, setRecipients] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState({});
  const [sendingProgress, setSendingProgress] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const queryClient = useQueryClient();
  const socketRef = useRef(null);

  // Notification helper
  const addNotification = (type, message) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  // Socket.IO setup
// In your React WhatsAppSender component - Replace the Socket.IO setup useEffect
useEffect(() => {
  const timeouts = {};
  
  // Set timeout for any accounts in "connecting" status
  Object.keys(connectionStatus).forEach(accountId => {
    if (connectionStatus[accountId] === 'connecting') {
      timeouts[accountId] = setTimeout(() => {
        setConnectionStatus(prev => ({
          ...prev,
          [accountId]: 'disconnected'
        }));
        addNotification('error', 'Connection timeout - please try again');
      }, 30000); // 30 second timeout
    }
  });
  
  return () => {
    Object.values(timeouts).forEach(timeout => clearTimeout(timeout));
  };
}, [connectionStatus]);

useEffect(() => {
  if (!user?.id) return;

  const newSocket = io(API_BASE, {
    auth: { token: localStorage.getItem('token') },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000
  });

  socketRef.current = newSocket;
  setSocket(newSocket);

  // Connection events
  newSocket.on('connect', () => {
    console.log('✅ Socket connected');
    newSocket.emit('join_user_room', user.id);
    addNotification('success', 'Real-time connection established');
  });

  newSocket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
    addNotification('error', 'Real-time connection lost');
  });

  // WhatsApp events
  newSocket.on('qr_code', (data) => {
    console.log('📱 QR Code received:', data.accountId);
    setQrCodeData(data.qrCode);
    setShowQRCode(true);
    setConnectionStatus(prev => ({ ...prev, [data.accountId]: 'connecting' }));
    addNotification('info', 'QR Code ready - please scan with WhatsApp');
  });

  newSocket.on('whatsapp_authenticated', (data) => {
    console.log('🔐 WhatsApp authenticated:', data.accountId);
    setConnectionStatus(prev => ({ ...prev, [data.accountId]: 'authenticated' }));
    addNotification('info', 'WhatsApp authenticated - finalizing connection...');
  });

  newSocket.on('whatsapp_ready', (data) => {
    console.log('🚀 WhatsApp ready:', data);
    
    // CRITICAL: Update connection status to ready
    setConnectionStatus(prev => ({ ...prev, [data.accountId]: 'ready' }));
    
    // Close QR modal
    setShowQRCode(false);
    setQrCodeData('');
    
    // Invalidate and refetch accounts
    queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
    
    // Show success notification with phone number if available
    const phoneDisplay = data.phoneNumber ? ` (${data.phoneNumber})` : '';
    addNotification('success', `WhatsApp account is now ready${phoneDisplay}`);
  });

  newSocket.on('whatsapp_disconnected', (data) => {
    console.log('🔌 WhatsApp disconnected:', data);
    setConnectionStatus(prev => ({ ...prev, [data.accountId]: 'disconnected' }));
    queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
    
    const reason = data.reason ? ` (${data.reason})` : '';
    addNotification('error', `WhatsApp account disconnected${reason}`);
  });

  newSocket.on('whatsapp_auth_failed', (data) => {
    console.log('❌ WhatsApp auth failed:', data);
    setConnectionStatus(prev => ({ ...prev, [data.accountId]: 'failed' }));
    queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
    
    // Close QR modal on auth failure
    setShowQRCode(false);
    setQrCodeData('');
    
    addNotification('error', `Authentication failed: ${data.error}`);
  });

  // New event for connection errors
  newSocket.on('whatsapp_error', (data) => {
    console.log('🚫 WhatsApp error:', data);
    setConnectionStatus(prev => ({ ...prev, [data.accountId]: 'failed' }));
    queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
    addNotification('error', `Connection error: ${data.error}`);
  });

  // Additional status verification events
  newSocket.on('connection_status_update', (data) => {
    console.log('🔄 Status update:', data);
    if (data.verified) {
      setConnectionStatus(prev => ({ ...prev, [data.accountId]: data.status }));
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
    }
  });

  newSocket.on('whatsapp_state_change', (data) => {
    console.log('🔄 State change:', data.accountId, data.state);
    // Optional: You can show state changes to user for debugging
    if (data.state === 'CONNECTED') {
      // Double-check that we mark as ready when state is CONNECTED
      setTimeout(() => {
        setConnectionStatus(prev => {
          if (prev[data.accountId] === 'authenticated') {
            return { ...prev, [data.accountId]: 'ready' };
          }
          return prev;
        });
      }, 2000);
    }
  });

  // Campaign events
  newSocket.on('campaign_progress', (data) => {
    setSendingProgress(data);
    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
  });

  newSocket.on('campaign_completed', (data) => {
    setSendingProgress(null);
    queryClient.invalidateQueries({ queryKey: ['campaigns', 'analytics'] });
    addNotification('success', `Campaign completed! Sent: ${data.stats?.sent || data.progress?.sent}`);
  });

  newSocket.on('message_status_update', (data) => {
    // Handle individual message status updates
    queryClient.invalidateQueries({ queryKey: ['campaigns'] });
  });

  // Error handling
  newSocket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
    addNotification('error', 'Failed to establish real-time connection');
  });

  // Cleanup
  return () => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.close();
    }
  };
}, [user?.id, queryClient]);

  // Fetch WhatsApp accounts
  const { data: accounts, isLoading: accountsLoading, error: accountsError } = useQuery({
    queryKey: ['whatsapp-accounts'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/whatsapp-web/accounts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch accounts');
      return response.json();
    },
    refetchInterval: 30000
  });

  // Fetch campaigns
  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/whatsapp-web/campaigns`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch campaigns');
      return response.json();
    },
    refetchInterval: 5000
  });

  // Fetch analytics
  // In your WhatsApp component, replace the analytics query with this:

const { data: analytics, isLoading: analyticsLoading } = useQuery({
  queryKey: ['analytics'],
  queryFn: async () => {
    const token = localStorage.getItem('token');
    // FIXED: Default to 7 days
    const response = await fetch(`${API_BASE}/api/whatsapp-web/analytics?timeRange=7d`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch analytics');
    return response.json();
  },
  refetchInterval: 10000
});

  // Connect account mutation
const connectAccountMutation = useMutation({
  mutationFn: async (accountName) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/api/whatsapp-web/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ accountName })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to connect account');
    }
    
    return response.json();
  },
  onMutate: () => {
    // Clear any existing connection status before starting new connection
    setConnectionStatus(prev => {
      const cleaned = {};
      Object.keys(prev).forEach(key => {
        if (prev[key] !== 'connecting') {
          cleaned[key] = prev[key];
        }
      });
      return cleaned;
    });
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
    addNotification('info', 'Connecting WhatsApp account...');
  },
  onError: (error) => {
    addNotification('error', error.message);
  }
});


const resetAllStuckConnections = () => {
  setConnectionStatus({});
  queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
  addNotification('info', 'All connection statuses reset');
};

  // Disconnect account mutation
  const disconnectAccountMutation = useMutation({
    mutationFn: async (accountId) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/whatsapp-web/disconnect/${accountId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to disconnect account');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
      addNotification('success', 'Account disconnected successfully');
    },
    onError: (error) => {
      addNotification('error', error.message);
    }
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async (accountId) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/whatsapp-web/accounts/${accountId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete account');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
      addNotification('success', 'Account deleted successfully');
    },
    onError: (error) => {
      addNotification('error', error.message);
    }
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (formData) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/whatsapp-web/send`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send message');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setMessageContent('');
      setRecipients('');
      setMediaFile(null);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      addNotification('success', 'Message campaign started successfully');
    },
    onError: (error) => {
      addNotification('error', error.message);
    }
  });

  // Event handlers
  const handleConnectAccount = () => {
    const accountName = `WhatsApp Account ${(accounts?.data?.length || 0) + 1}`;
    connectAccountMutation.mutate(accountName);
  };

  const handleDisconnectAccount = (accountId) => {
    if (window.confirm('Are you sure you want to disconnect this account?')) {
      setConnectionStatus(prev => ({ ...prev, [accountId]: 'disconnected' }));
      disconnectAccountMutation.mutate(accountId);
    }
  };

  const handleDeleteAccount = (accountId) => {
    if (window.confirm('Are you sure you want to permanently delete this account? This will also delete all related campaigns and messages.')) {
      setConnectionStatus(prev => {
        const updated = { ...prev };
        delete updated[accountId];
        return updated;
      });
      deleteAccountMutation.mutate(accountId);
    }
  };

  const handleSendMessage = () => {
    if (!selectedAccount || !recipients.trim()) return;
    if (messageType === 'text' && !messageContent.trim()) return;
    if (messageType !== 'text' && !mediaFile) return;

    const recipientList = recipients
      .split(/[\n,]/)
      .map(p => p.trim())
      .filter(p => p);

    const formData = new FormData();
    formData.append('accountId', selectedAccount._id);
    formData.append('recipients', JSON.stringify(recipientList));
    formData.append('content', JSON.stringify({
      type: messageType,
      text: messageContent.trim() || ''
    }));

    if (mediaFile) {
      formData.append('media', mediaFile);
    }

    sendMessageMutation.mutate(formData);
  };

  const closeQRModal = () => {
    setShowQRCode(false);
    setQrCodeData('');
    
    setConnectionStatus(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(accountId => {
        if (updated[accountId] === 'connecting') {
          updated[accountId] = 'disconnected';
        }
      });
      return updated;
    });
    
    queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
  };

  // Status helpers
  const getStatusIcon = (account) => {
    const currentStatus = connectionStatus[account._id] || account.status;
    
    switch (currentStatus) {
      case 'ready':
        return <CheckCircle className="text-green-500" size={16} />;
      case 'connecting':
      case 'authenticated':
        return <RefreshCw className="text-blue-500 animate-spin" size={16} />;
      case 'disconnected':
      case 'failed':
        return <XCircle className="text-red-500" size={16} />;
      default:
        return <AlertTriangle className="text-yellow-500" size={16} />;
    }
  };

  const getStatusColor = (account) => {
    const currentStatus = connectionStatus[account._id] || account.status;
    
    switch (currentStatus) {
      case 'ready':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'connecting':
      case 'authenticated':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'disconnected':
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    }
  };

  const getStatusText = (account) => {
    const currentStatus = connectionStatus[account._id] || account.status;
    
    switch (currentStatus) {
      case 'ready': return 'Ready';
      case 'connecting': return 'Connecting...';
      case 'authenticated': return 'Authenticating...';
      case 'disconnected': return 'Disconnected';
      case 'failed': return 'Failed';
      default: return 'Unknown';
    }
  };

  const recipientList = recipients
    .split(/[\n,]/)
    .map(p => p.trim())
    .filter(p => p);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="space-y-6">
      {/* Notifications */}
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: -50, x: '100%' }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg border max-w-sm ${
              notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
              notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <div className="flex items-center space-x-2">
              {notification.type === 'success' && <CheckCircle size={16} />}
              {notification.type === 'error' && <XCircle size={16} />}
              {notification.type === 'info' && <AlertTriangle size={16} />}
              <span className="text-sm font-medium">{notification.message}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">WhatsApp Bulk Sender</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Send bulk WhatsApp messages with analytics.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 transition-colors"
          >
            <BarChart3 className="inline mr-2" size={16} />
            Analytics
          </button>
          <button 
  onClick={resetAllStuckConnections}
  className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded-lg hover:bg-red-200 transition-colors"
>
  Reset Stuck Connections
</button>

          <button 
            onClick={handleConnectAccount}
            disabled={connectAccountMutation.isPending}
            className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-2 rounded-xl hover:from-green-700 hover:to-green-800 transition-all shadow-lg disabled:opacity-50"
          >
            <Plus className="inline mr-2" size={16} />
            {connectAccountMutation.isPending ? 'Connecting...' : 'Connect Account'}
          </button>
        </div>
      </motion.div>

      {/* Analytics Dashboard */}
      <AnimatePresence>
        {showAnalytics && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6"
          >
            {/* Analytics Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: 'Total Messages',
                  value: analytics?.data?.overview?.totalMessages?.toLocaleString() || '0',
                  change: analytics?.data?.overview?.messageGrowth || '+0%',
                  icon: <MessageSquare className="text-blue-500" size={24} />,
                  color: 'blue'
                },
                {
                  title: 'Delivery Rate',
                  value: `${analytics?.data?.overview?.deliveryRate?.toFixed(1) || '0.0'}%`,
                  change: analytics?.data?.overview?.deliveryGrowth || '+0%',
                  icon: <TrendingUp className="text-green-500" size={24} />,
                  color: 'green'
                },
                {
                  title: 'Read Rate',
                  value: `${analytics?.data?.overview?.readRate?.toFixed(1) || '0.0'}%`,
                  change: analytics?.data?.overview?.readGrowth || '+0%',
                  icon: <Eye className="text-purple-500" size={24} />,
                  color: 'purple'
                },
                {
                  title: 'Active Accounts',
                  value: accounts?.data?.filter(acc => acc.status === 'ready').length || 0,
                  change: '+0%',
                  icon: <Users className="text-orange-500" size={24} />,
                  color: 'orange'
                }
              ].map((stat, index) => (
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
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {stat.icon}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className={`text-sm font-medium ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.change}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">vs last period</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Message Performance Chart */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Message Performance</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics?.data?.dailyStats || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                      <XAxis dataKey="date" stroke="#6B7280" />
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
                      <Line type="monotone" dataKey="read" stroke="#8B5CF6" strokeWidth={3} name="Read" />
                      <Line type="monotone" dataKey="failed" stroke="#EF4444" strokeWidth={3} name="Failed" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Message Types Distribution */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Message Types</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics?.data?.messageTypes || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="count"
                      >
                        {(analytics?.data?.messageTypes || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WhatsApp Accounts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Connected WhatsApp Accounts</h3>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              {socket?.connected ? (
                <>
                  <Wifi className="text-green-500" size={14} />
                  <span>Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="text-red-500" size={14} />
                  <span>Disconnected</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        {accountsLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading accounts...</p>
          </div>
        ) : accountsError ? (
          <div className="text-center py-8">
            <XCircle className="text-red-500 mx-auto mb-4" size={48} />
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Failed to Load Accounts</h4>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{accountsError.message}</p>
            <button 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] })}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="inline mr-2" size={16} />
              Retry
            </button>
          </div>
        ) : accounts?.data?.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="text-gray-400 mx-auto mb-4" size={48} />
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No WhatsApp Accounts Connected</h4>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Connect your first WhatsApp account to start sending bulk messages.</p>
            <button 
              onClick={handleConnectAccount}
              disabled={connectAccountMutation.isPending}
              className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <QrCode className="inline mr-2" size={16} />
              {connectAccountMutation.isPending ? 'Connecting...' : 'Connect WhatsApp Account'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts?.data?.map((account) => (
              <div
                key={account._id}
                className={`p-4 border-2 rounded-xl transition-all cursor-pointer ${
                  selectedAccount?._id === account._id
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                }`}
                onClick={() => account.status === 'ready' && setSelectedAccount(account)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white">{account.accountName}</h4>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(account)}
                    <div className="flex space-x-1">
                      {/* Reconnect button for disconnected/failed accounts */}
                      {['disconnected', 'failed'].includes(connectionStatus[account._id] || account.status) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            connectAccountMutation.mutate(account.accountName);
                          }}
                          disabled={connectAccountMutation.isPending}
                          className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors disabled:opacity-50"
                          title="Reconnect"
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
                      
                      {/* Disconnect button for ready/authenticated accounts */}
                      {['ready', 'authenticated'].includes(connectionStatus[account._id] || account.status) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDisconnectAccount(account._id);
                          }}
                          disabled={disconnectAccountMutation.isPending}
                          className="p-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded transition-colors disabled:opacity-50"
                          title="Disconnect"
                        >
                          <Power size={14} />
                        </button>
                      )}
                      
                      {/* Delete button */}
                      {!['connecting', 'authenticated'].includes(connectionStatus[account._id] || account.status) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAccount(account._id);
                          }}
                          className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                          title="Delete Account"
                        >
                          <XCircle size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                    <span className="text-gray-900 dark:text-white">
                      {account.phoneNumber || 'Not connected'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(account)}`}>
                      {getStatusText(account)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Last Activity:</span>
                    <span className="text-gray-900 dark:text-white">
                      {account.lastActivity ? new Date(account.lastActivity).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                </div>

                {selectedAccount?._id === account._id && (
                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        ✓ Selected for messaging
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAccount(null);
                        }}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        Deselect
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Message Composer */}
      {selectedAccount && selectedAccount.status === 'ready' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Compose Message</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Using account: {selectedAccount.accountName} ({selectedAccount.phoneNumber})
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Message Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Message Type</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { type: 'text', icon: MessageSquare, label: 'Text' },
                  { type: 'image', icon: Image, label: 'Image' },
                  { type: 'video', icon: Video, label: 'Video' }
                ].map(({ type, icon: Icon, label }) => (
                  <button
                    key={type}
                    onClick={() => setMessageType(type)}
                    className={`p-3 border-2 rounded-xl transition-all ${
                      messageType === type
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`mx-auto mb-2 ${messageType === type ? 'text-green-600' : 'text-gray-400'}`} size={20} />
                    <p className={`text-sm font-medium ${messageType === type ? 'text-green-800 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                      {label}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Recipients */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Recipients</label>
              <div className="space-y-3">
                <textarea
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  placeholder="Enter phone numbers (one per line or comma separated)&#10;+1234567890&#10;+0987654321"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  rows={4}
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {recipientList.length} recipient{recipientList.length !== 1 ? 's' : ''} selected
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Media Upload */}
          {messageType !== 'text' && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Upload Media</label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center">
                <input
                  type="file"
                  onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                  accept={
                    messageType === 'image' ? 'image/*' :
                    messageType === 'video' ? 'video/*' : '*'
                  }
                  className="hidden"
                  id="media-upload"
                />
                <div className="cursor-pointer" onClick={() => document.getElementById('media-upload')?.click()}>
                  <Upload className="mx-auto text-gray-400 mb-3" size={32} />
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    {mediaFile ? (
                      <>
                        <span className="font-medium">{mediaFile.name}</span>
                        <br />
                        <span className="text-sm">({(mediaFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </>
                    ) : (
                      `Upload ${messageType} file`
                    )}
                  </p>
                  <div className="bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition-colors inline-block">
                    {mediaFile ? 'Change File' : 'Choose File'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Message Content */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {messageType === 'text' ? 'Message Content *' : 'Caption (Optional)'}
            </label>
            <textarea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder={
                messageType === 'text' 
                  ? "Type your message here..." 
                  : "Add a caption to your media (optional)..."
              }
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Character count: {messageContent.length}
              </p>
            </div>
          </div>

          {/* Send Button */}
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <div>
                {recipientList.length} contact{recipientList.length !== 1 ? 's' : ''} selected
              </div>
              {recipientList.length > 0 && (
                <div className="text-xs mt-1">
                  Estimated time: ~{Math.ceil(recipientList.length * 3)} seconds
                </div>
              )}
            </div>
            <button
              onClick={handleSendMessage}
              disabled={
                !recipientList.length || 
                (messageType === 'text' && !messageContent.trim()) ||
                (messageType !== 'text' && !mediaFile) ||
                sendMessageMutation.isPending
              }
              className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sendMessageMutation.isPending ? (
                <>
                  <RefreshCw className="animate-spin" size={16} />
                  <span>Starting Campaign...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Send Messages</span>
                </>
              )}
            </button>
          </div>
          
          {/* Sending Progress */}
          {sendingProgress && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-blue-800 dark:text-blue-400">Sending Progress</h4>
                <span className="text-sm text-blue-600 dark:text-blue-400">
                  {sendingProgress.progress?.sent || 0}/{sendingProgress.progress?.total || 0}
                </span>
              </div>
              
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-3 mb-4">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${sendingProgress.progress?.total > 0 ? 
                      ((sendingProgress.progress.sent || 0) / sendingProgress.progress.total) * 100 : 0}%` 
                  }}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm text-center">
                <div>
                  <div className="text-lg font-bold text-green-600">{sendingProgress.progress?.sent || 0}</div>
                  <div className="text-gray-600 dark:text-gray-400">Sent</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-red-600">{sendingProgress.progress?.failed || 0}</div>
                  <div className="text-gray-600 dark:text-gray-400">Failed</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-600">{sendingProgress.progress?.pending || 0}</div>
                  <div className="text-gray-600 dark:text-gray-400">Pending</div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Recent Campaigns */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Campaigns</h3>
          <button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['campaigns'] })}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
        
        {campaignsLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading campaigns...</p>
          </div>
        ) : campaigns?.data?.length === 0 ? (
          <div className="text-center py-8">
            <BarChart3 className="text-gray-400 mx-auto mb-4" size={48} />
            <p className="text-gray-600 dark:text-gray-400">No campaigns yet. Send your first message to get started!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Campaign</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Recipients</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Progress</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Created</th>
                </tr>
              </thead>
              <tbody>
                {campaigns?.data?.map((campaign) => (
                  <tr key={campaign._id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-900 dark:text-white">{campaign.name}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs">
                        {campaign.messageContent?.content?.substring(0, 50)}
                        {campaign.messageContent?.content?.length > 50 ? '...' : ''}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-1">
                        {campaign.messageContent?.type === 'text' && <MessageSquare className="text-gray-500" size={16} />}
                        {campaign.messageContent?.type === 'image' && <Image className="text-blue-500" size={16} />}
                        {campaign.messageContent?.type === 'video' && <Video className="text-purple-500" size={16} />}
                        <span className="text-sm capitalize text-gray-600 dark:text-gray-400">
                          {campaign.messageContent?.type || 'text'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                      {campaign.progress?.total || 0}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        campaign.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                        campaign.status === 'running' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                        campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                        campaign.status === 'failed' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                      }`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              campaign.status === 'completed' ? 'bg-green-500' :
                              campaign.status === 'running' ? 'bg-blue-500' :
                              campaign.status === 'failed' ? 'bg-red-500' :
                              'bg-gray-400'
                            }`}
                            style={{ 
                              width: `${campaign.progress?.total > 0 ? 
                                ((campaign.progress.sent + campaign.progress.failed) / campaign.progress.total) * 100 : 0}%` 
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-12">
                          {campaign.progress?.total > 0 ? 
                            Math.round(((campaign.progress.sent + campaign.progress.failed) / campaign.progress.total) * 100) : 0}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-600 dark:text-gray-400">
                      <div className="text-sm">
                        {new Date(campaign.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(campaign.createdAt).toLocaleTimeString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQRCode && qrCodeData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full"
            >
              <div className="text-center">
                <QrCode className="text-green-600 mx-auto mb-4" size={48} />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Scan QR Code</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Open WhatsApp on your phone, go to Settings → Linked Devices → Link a Device, and scan this QR code.
                </p>
                
                {/* QR Code Display */}
                <div className="w-64 h-64 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center mx-auto mb-6">
                  {qrCodeData ? (
                    <img 
                      src={qrCodeData.startsWith('data:') ? qrCodeData : `data:image/png;base64,${qrCodeData}`}
                      alt="WhatsApp QR Code"
                      className="w-full h-full object-contain rounded-xl"
                    />
                  ) : (
                    <div className="text-center">
                      <RefreshCw className="text-gray-400 animate-spin mx-auto mb-2" size={32} />
                      <p className="text-gray-500">Generating QR code...</p>
                    </div>
                  )}
                </div>                
                
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 mb-6">
                  <div className="flex items-center space-x-2 text-blue-800 dark:text-blue-400">
                    <AlertTriangle size={16} />
                    <p className="text-sm">
                      QR code expires in 20 seconds. If it expires, please try connecting again.
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={closeQRModal}
                    className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={closeQRModal}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default WhatsAppSender;
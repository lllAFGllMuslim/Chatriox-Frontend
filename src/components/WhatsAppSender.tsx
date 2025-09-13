import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MessageSquare, Plus, QrCode, Send, Users, Image, Video,
  CheckCircle, XCircle, RefreshCw, BarChart3, Upload, Eye, 
  TrendingUp, Wifi, WifiOff, Power, RotateCcw
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
  const [sendingProgress, setSendingProgress] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const queryClient = useQueryClient();
  const socketRef = useRef(null);

  // Simplified notification system
  const addNotification = (type, message) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  // Socket.IO setup - simplified
useEffect(() => {
  if (!user?.id) return;

  console.log('🚀 Setting up socket connection for user:', user.id);

  const newSocket = io(API_BASE, {
    auth: { token: localStorage.getItem('token') },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    forceNew: true
  });

  socketRef.current = newSocket;
  setSocket(newSocket);

  newSocket.on('connect', () => {
    console.log('✅ Socket connected with ID:', newSocket.id);
    
    // Join user room with confirmation
    newSocket.emit('join_user_room', user.id, (response) => {
      console.log('🏠 Joined user room response:', response);
    });
    
    addNotification('success', 'Connected to server');
  });

  newSocket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error);
    addNotification('error', 'Connection failed');
  });

  newSocket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
    addNotification('error', 'Lost connection to server');
    
    // Reset QR code states on disconnect
    setShowQRCode(false);
    setQrCodeData('');
  });

  // ENHANCED QR CODE HANDLING - Multiple event listeners for reliability
  const handleQRCode = (data, eventName = 'unknown') => {
    console.log(`📱 ========== QR CODE RECEIVED ==========`);
    console.log(`Event: ${eventName}`);
    console.log(`Account ID: ${data.accountId}`);
    console.log(`QR Data Length: ${data.qrCode ? data.qrCode.length : 0}`);
    console.log(`QR Data Preview: ${data.qrCode ? data.qrCode.substring(0, 50) + '...' : 'NO DATA'}`);
    console.log(`Timestamp: ${data.timestamp}`);
    console.log(`========================================`);
    
    // Enhanced validation
    if (!data || !data.qrCode) {
      console.error('❌ QR data is missing or invalid');
      addNotification('error', 'QR code data is missing');
      return;
    }
    
    if (typeof data.qrCode !== 'string' || data.qrCode.length < 50) {
      console.error('❌ QR data is too short or invalid format');
      addNotification('error', 'Invalid QR code format');
      return;
    }
    
    // Ensure proper data URL format
    let qrToShow = data.qrCode;
    if (!qrToShow.startsWith('data:image/')) {
      if (qrToShow.startsWith('iVBOR') || qrToShow.match(/^[A-Za-z0-9+/=]+$/)) {
        // Looks like base64 without prefix
        qrToShow = `data:image/png;base64,${qrToShow}`;
        console.log('🔧 Added data URL prefix to base64 data');
      } else {
        console.error('❌ QR data format not recognized');
        addNotification('error', 'QR code format not supported');
        return;
      }
    }
    
    // Test image validity
    const testImage = new Image();
    testImage.onload = () => {
      console.log('✅ QR image is valid and loadable');
      setQrCodeData(qrToShow);
      setShowQRCode(true);
      addNotification('success', 'QR Code ready! Scan with WhatsApp');
    };
    
    testImage.onerror = () => {
      console.error('❌ QR image failed to load');
      addNotification('error', 'QR code image is corrupted');
    };
    
    testImage.src = qrToShow;
  };

  // Register ALL possible QR events
  const qrEvents = [
    'qr_code',
    'whatsapp_qr', 
    'qr_generated',
    'qr_ready',
    'qr_code_direct',
    'whatsapp_qr_direct'
  ];
  
  qrEvents.forEach(eventName => {
    newSocket.on(eventName, (data) => handleQRCode(data, eventName));
  });

  // Status events
  newSocket.on('whatsapp_ready', (data) => {
    console.log('✅ WhatsApp ready for account:', data.accountId);
    
    // Hide QR code immediately when ready
    setShowQRCode(false);
    setQrCodeData('');
    
    queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
    
    const phoneDisplay = data.phoneNumber ? ` (${data.phoneNumber})` : '';
    const profileDisplay = data.profileName ? ` - ${data.profileName}` : '';
    addNotification('success', `WhatsApp connected${phoneDisplay}${profileDisplay}`);
  });

  newSocket.on('whatsapp_authenticated', (data) => {
    console.log('✅ WhatsApp authenticated for account:', data.accountId);
    addNotification('info', 'Authenticated - finalizing connection...');
    // Keep QR visible during authentication process
  });

  newSocket.on('whatsapp_initializing', (data) => {
    console.log('🔄 WhatsApp initializing for account:', data.accountId);
    addNotification('info', data.message || 'Initializing WhatsApp client...');
  });

  newSocket.on('whatsapp_loading', (data) => {
    console.log(`⏳ WhatsApp loading ${data.percent}%: ${data.message}`);
    if (data.percent) {
      addNotification('info', `Loading: ${data.percent}% - ${data.message}`);
    }
  });

  newSocket.on('whatsapp_disconnected', (data) => {
    console.log('❌ WhatsApp disconnected:', data.accountId, data.reason);
    
    setShowQRCode(false);
    setQrCodeData('');
    queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
    
    const reason = data.reason || 'Unknown reason';
    addNotification('error', `Account disconnected: ${reason}`);
  });

  newSocket.on('whatsapp_auth_failed', (data) => {
    console.log('❌ WhatsApp auth failed:', data.accountId);
    
    setShowQRCode(false);
    setQrCodeData('');
    queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
    addNotification('error', 'Authentication failed - please try connecting again');
  });

  newSocket.on('whatsapp_error', (data) => {
    console.log('❌ WhatsApp error:', data.accountId, data.error);
    
    setShowQRCode(false);
    setQrCodeData('');
    queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
    
    const errorMsg = data.error || 'Unknown error occurred';
    addNotification('error', `WhatsApp Error: ${errorMsg}`);
  });

  newSocket.on('qr_error', (data) => {
    console.log('❌ QR generation error:', data);
    
    setShowQRCode(false);
    setQrCodeData('');
    addNotification('error', 'QR code generation failed - please try again');
  });

  // Debug: Log all socket events
  newSocket.onAny((eventName, ...args) => {
    if (eventName.includes('qr') || eventName.includes('whatsapp')) {
      console.log(`🔍 Socket event: ${eventName}`, args[0]);
    }
  });

  return () => {
    console.log('🧹 Cleaning up socket connection');
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.close();
    }
  };
}, [user?.id, queryClient]);


  // Fetch data - simplified queries
  const { data: accounts, isLoading: accountsLoading, error: accountsError } = useQuery({
    queryKey: ['whatsapp-accounts'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/whatsapp-web/accounts`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch accounts');
      return response.json();
    },
    refetchInterval: 10000
  });

  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/whatsapp-web/campaigns`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch campaigns');
      return response.json();
    },
    refetchInterval: 15000
  });

  const { data: analytics } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/api/whatsapp-web/analytics?timeRange=7d`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    },
    refetchInterval: 30000
  });

  // Mutations - simplified
  const connectAccountMutation = useMutation({
    mutationFn: async (accountName) => {
      const response = await fetch(`${API_BASE}/api/whatsapp-web/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ accountName })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Connection failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
      addNotification('info', 'Connecting account...');
    },
    onError: (error) => {
      addNotification('error', error.message);
    }
  });

  const disconnectAccountMutation = useMutation({
    mutationFn: async (accountId) => {
      const response = await fetch(`${API_BASE}/api/whatsapp-web/disconnect/${accountId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Disconnect failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
      addNotification('success', 'Account disconnected');
    },
    onError: (error) => {
      addNotification('error', error.message);
    }
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (accountId) => {
      const response = await fetch(`${API_BASE}/api/whatsapp-web/accounts/${accountId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Delete failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] });
      addNotification('success', 'Account deleted');
    },
    onError: (error) => {
      addNotification('error', error.message);
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (formData) => {
      const response = await fetch(`${API_BASE}/api/whatsapp-web/send`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Send failed');
      }
      return response.json();
    },
    onSuccess: () => {
      setMessageContent('');
      setRecipients('');
      setMediaFile(null);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      addNotification('success', 'Campaign started');
    },
    onError: (error) => {
      addNotification('error', error.message);
    }
  });

  // Event handlers
const handleConnectAccount = async () => {
  const accountName = `Account ${(accounts?.data?.length || 0) + 1}`;
  
  console.log('🔌 Starting account connection:', accountName);
  
  // Reset QR states
  setShowQRCode(false);
  setQrCodeData('');
  
  try {
    const response = await connectAccountMutation.mutateAsync(accountName);
    console.log('✅ Connection response:', response);
    
    // Add a timeout to show QR modal if QR doesn't appear within 10 seconds
    setTimeout(() => {
      if (!showQRCode && !qrCodeData) {
        console.log('⏰ QR timeout - showing modal anyway');
        setShowQRCode(true);
        addNotification('info', 'Waiting for QR code...');
      }
    }, 10000);
    
  } catch (error) {
    console.error('❌ Connection failed:', error);
    addNotification('error', error.message || 'Connection failed');
  }
};


  const handleDisconnectAccount = (accountId) => {
    if (window.confirm('Disconnect this account?')) {
      disconnectAccountMutation.mutate(accountId);
    }
  };

  const handleDeleteAccount = (accountId) => {
    if (window.confirm('Permanently delete this account and all its data?')) {
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

  // Helper functions
  const getStatusIcon = (account) => {
    switch (account.status) {
      case 'ready':
        return <CheckCircle className="text-green-500" size={16} />;
      case 'connecting':
      case 'authenticated':
        return <RefreshCw className="text-blue-500 animate-spin" size={16} />;
      default:
        return <XCircle className="text-red-500" size={16} />;
    }
  };

  const getStatusColor = (account) => {
    switch (account.status) {
      case 'ready':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'connecting':
      case 'authenticated':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    }
  };

  const getStatusText = (account) => {
    switch (account.status) {
      case 'ready': return 'Ready';
      case 'connecting': return 'Connecting...';
      case 'authenticated': return 'Authenticating...';
      case 'disconnected': return 'Disconnected';
      default: return 'Failed';
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
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className={`fixed top-4 right-4 z-50 p-3 rounded-lg shadow-lg max-w-sm ${
              notification.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
              notification.type === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
              'bg-blue-50 border border-blue-200 text-blue-800'
            }`}
          >
            <div className="flex items-center space-x-2">
              {notification.type === 'success' && <CheckCircle size={16} />}
              {notification.type === 'error' && <XCircle size={16} />}
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
          <p className="text-gray-600 dark:text-gray-400">Send bulk WhatsApp messages with analytics</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            <BarChart3 className="inline mr-2" size={16} />
            Analytics
          </button>
          <button 
            onClick={handleConnectAccount}
            disabled={connectAccountMutation.isPending}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
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
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                {
                  title: 'Total Messages',
                  value: analytics?.data?.overview?.totalMessages?.toLocaleString() || '0',
                  icon: <MessageSquare className="text-blue-500" size={20} />
                },
                {
                  title: 'Delivery Rate',
                  value: `${analytics?.data?.overview?.deliveryRate?.toFixed(1) || '0.0'}%`,
                  icon: <TrendingUp className="text-green-500" size={20} />
                },
                {
                  title: 'Read Rate',
                  value: `${analytics?.data?.overview?.readRate?.toFixed(1) || '0.0'}%`,
                  icon: <Eye className="text-purple-500" size={20} />
                },
                {
                  title: 'Active Accounts',
                  value: accounts?.data?.filter(acc => acc.status === 'ready').length || 0,
                  icon: <Users className="text-orange-500" size={20} />
                }
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">{stat.title}</p>
                    {stat.icon}
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                </motion.div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold mb-4">Message Performance</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={analytics?.data?.dailyStats || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line dataKey="sent" stroke="#3B82F6" name="Sent" />
                      <Line dataKey="delivered" stroke="#10B981" name="Delivered" />
                      <Line dataKey="read" stroke="#8B5CF6" name="Read" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold mb-4">Message Types</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics?.data?.messageTypes || []}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
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

      {/* Accounts Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">WhatsApp Accounts</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
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
        
        {accountsLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="animate-spin mx-auto mb-2" size={32} />
            <p className="text-gray-500">Loading accounts...</p>
          </div>
        ) : accountsError ? (
          <div className="text-center py-8">
            <XCircle className="text-red-500 mx-auto mb-4" size={48} />
            <p className="text-red-600 mb-4">{accountsError.message}</p>
            <button 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['whatsapp-accounts'] })}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : accounts?.data?.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="text-gray-400 mx-auto mb-4" size={48} />
            <p className="text-gray-600 mb-4">No accounts connected</p>
            <button 
              onClick={handleConnectAccount}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Connect First Account
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts?.data?.map((account) => (
              <div
                key={account._id}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedAccount?._id === account._id
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => account.status === 'ready' && setSelectedAccount(account)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold">{account.accountName}</h4>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(account)}
                    <div className="flex space-x-1">
                      {account.status === 'disconnected' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            connectAccountMutation.mutate(account.accountName);
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Reconnect"
                        >
                          <RotateCcw size={14} />
                        </button>
                      )}
                      {account.status === 'ready' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDisconnectAccount(account._id);
                          }}
                          className="p-1 text-orange-600 hover:bg-orange-50 rounded"
                          title="Disconnect"
                        >
                          <Power size={14} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAccount(account._id);
                        }}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <XCircle size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span>{account.phoneNumber || 'Not connected'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(account)}`}>
                      {getStatusText(account)}
                    </span>
                  </div>
                </div>
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
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6"
        >
          <h3 className="text-lg font-semibold mb-4">Compose Message</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Message Type */}
            <div>
              <label className="block text-sm font-medium mb-3">Message Type</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { type: 'text', icon: MessageSquare, label: 'Text' },
                  { type: 'image', icon: Image, label: 'Image' },
                  { type: 'video', icon: Video, label: 'Video' }
                ].map(({ type, icon: Icon, label }) => (
                  <button
                    key={type}
                    onClick={() => setMessageType(type)}
                    className={`p-3 border-2 rounded-lg transition-all ${
                      messageType === type
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`mx-auto mb-2 ${messageType === type ? 'text-green-600' : 'text-gray-400'}`} size={20} />
                    <p className={`text-sm ${messageType === type ? 'text-green-800' : 'text-gray-600'}`}>
                      {label}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Recipients */}
            <div>
              <label className="block text-sm font-medium mb-3">Recipients</label>
              <textarea
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder="Enter phone numbers (one per line)..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                rows={4}
              />
              <p className="text-sm text-gray-500 mt-2">
                {recipientList.length} recipient{recipientList.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Media Upload */}
          {messageType !== 'text' && (
            <div className="mt-6">
              <label className="block text-sm font-medium mb-2">Upload Media</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                  accept={messageType === 'image' ? 'image/*' : 'video/*'}
                  className="hidden"
                  id="media-upload"
                />
                <div className="cursor-pointer" onClick={() => document.getElementById('media-upload')?.click()}>
                  <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                  <p className="text-gray-600">
                    {mediaFile ? mediaFile.name : `Upload ${messageType} file`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Message Content */}
          <div className="mt-6">
            <label className="block text-sm font-medium mb-2">
              {messageType === 'text' ? 'Message Content *' : 'Caption (Optional)'}
            </label>
            <textarea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder={messageType === 'text' ? "Type your message..." : "Add caption..."}
            />
          </div>

          {/* Send Button */}
          <div className="mt-6 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {recipientList.length} contact{recipientList.length !== 1 ? 's' : ''} selected
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
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {sendMessageMutation.isPending ? (
                <>
                  <RefreshCw className="animate-spin" size={16} />
                  <span>Starting...</span>
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
              className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-blue-800">Sending Progress</h4>
                <span className="text-sm text-blue-600">
                  {sendingProgress.progress?.sent || 0}/{sendingProgress.progress?.total || 0}
                </span>
              </div>
              
              <div className="w-full bg-blue-200 rounded-full h-2 mb-4">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ 
                    width: `${sendingProgress.progress?.total > 0 ? 
                      ((sendingProgress.progress.sent || 0) / sendingProgress.progress.total) * 100 : 0}%` 
                  }}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm text-center">
                <div>
                  <div className="text-lg font-bold text-green-600">{sendingProgress.progress?.sent || 0}</div>
                  <div className="text-gray-600">Sent</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-red-600">{sendingProgress.progress?.failed || 0}</div>
                  <div className="text-gray-600">Failed</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-600">{sendingProgress.progress?.pending || 0}</div>
                  <div className="text-gray-600">Pending</div>
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
        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Campaigns</h3>
          <button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['campaigns'] })}
            className="flex items-center space-x-2 px-3 py-2 text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100"
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
        
        {campaignsLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="animate-spin mx-auto mb-2" size={32} />
            <p className="text-gray-500">Loading campaigns...</p>
          </div>
        ) : campaigns?.data?.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="text-gray-400 mx-auto mb-4" size={48} />
            <p className="text-gray-600">No campaigns yet. Send your first message to get started!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Campaign</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Recipients</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Progress</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Created</th>
                </tr>
              </thead>
              <tbody>
                {campaigns?.data?.map((campaign) => (
                  <tr key={campaign._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium">{campaign.name}</div>
                      <div className="text-sm text-gray-600 truncate max-w-xs">
                        {campaign.messageContent?.content?.substring(0, 50)}
                        {campaign.messageContent?.content?.length > 50 ? '...' : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1">
                        {campaign.messageContent?.type === 'text' && <MessageSquare size={16} />}
                        {campaign.messageContent?.type === 'image' && <Image size={16} />}
                        {campaign.messageContent?.type === 'video' && <Video size={16} />}
                        <span className="text-sm capitalize">
                          {campaign.messageContent?.type || 'text'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">{campaign.progress?.total || 0}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        campaign.status === 'completed' ? 'bg-green-100 text-green-800' :
                        campaign.status === 'running' ? 'bg-blue-100 text-blue-800' :
                        campaign.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
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
                        <span className="text-xs text-gray-500 w-12">
                          {campaign.progress?.total > 0 ? 
                            Math.round(((campaign.progress.sent + campaign.progress.failed) / campaign.progress.total) * 100) : 0}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
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
        {showQRCode && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
    >
      <div className="text-center">
        <QrCode className="text-green-600 mx-auto mb-4" size={48} />
        <h3 className="text-xl font-bold mb-4">Scan QR Code</h3>
        <p className="text-gray-600 mb-6">
          Open WhatsApp → Settings → Linked Devices → Link a Device → Scan this code
        </p>
        
        <div className="w-80 h-80 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mx-auto mb-6">
          {qrCodeData ? (
            <div className="relative w-full h-full">
              <img 
                src={qrCodeData}
                alt="WhatsApp QR Code"
                className="w-full h-full object-contain rounded-lg"
                onLoad={() => {
                  console.log('✅ QR image loaded successfully');
                }}
                onError={(e) => {
                  console.error('❌ QR image failed to load');
                  console.error('❌ Image src length:', e.target.src?.length);
                  console.error('❌ Image src preview:', e.target.src?.substring(0, 100));
                  addNotification('error', 'QR code image failed to load');
                }}
              />
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                {new Date().toLocaleTimeString()}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <RefreshCw className="text-gray-400 animate-spin mx-auto mb-2" size={32} />
              <p className="text-gray-500 mb-2">Generating QR Code...</p>
              <p className="text-xs text-gray-400">This may take up to 30 seconds</p>
            </div>
          )}
        </div>
        
        <div className="text-xs text-gray-500 mb-4">
          QR Code will refresh automatically every 60 seconds
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={async () => {
              console.log('🔄 Manual QR refresh requested');
              
              try {
                // Try to get fresh QR from backend
                const accounts = await queryClient.getQueryData(['whatsapp-accounts']);
                const targetAccount = accounts?.data?.find(acc => 
                  acc.status === 'connecting' || acc.status === 'qr_ready'
                );
                
                if (targetAccount) {
                  const response = await fetch(`${API_BASE}/api/whatsapp-web/qr/${targetAccount._id}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                  });
                  
                  if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data?.qrCode) {
                      console.log('✅ Fresh QR received from backend');
                      setQrCodeData(result.data.qrCode);
                      addNotification('success', 'QR code refreshed');
                    } else {
                      addNotification('error', 'No QR code available');
                    }
                  } else {
                    addNotification('error', 'Failed to get fresh QR code');
                  }
                } else {
                  addNotification('error', 'No active connection found');
                }
                
              } catch (error) {
                console.error('❌ QR refresh failed:', error);
                addNotification('error', 'QR refresh failed');
              }
            }}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            disabled={!socket?.connected}
          >
            {socket?.connected ? 'Refresh QR' : 'Connecting...'}
          </button>
          <button
            onClick={() => {
              console.log('❌ QR modal closed by user');
              setShowQRCode(false);
              setQrCodeData('');
            }}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
        
        {/* Debug info (remove in production) */}
        <div className="mt-4 text-xs text-gray-400 border-t pt-4">
          <div>Socket: {socket?.connected ? '✅ Connected' : '❌ Disconnected'}</div>
          <div>QR Data: {qrCodeData ? '✅ Present' : '❌ Missing'}</div>
          <div>QR Size: {qrCodeData ? `${qrCodeData.length} chars` : 'N/A'}</div>
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
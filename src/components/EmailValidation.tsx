import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Upload, CheckCircle, XCircle, AlertTriangle, Download, Eye, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

const EmailValidation = () => {
  const [singleEmail, setSingleEmail] = useState('');
  const [validationResults, setValidationResults] = useState([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isBulkValidating, setIsBulkValidating] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [validationStats, setValidationStats] = useState({
    total: 0,
    valid: 0,
    invalid: 0,
    risky: 0,
    unknown: 0
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const resultsPerPage = 10;

  // API base URL - adjust this to match your backend
  const API_BASE_URL = 'https://chatriox.com/api';

  // Fetch stats from backend
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/validation/stats`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setValidationStats({
            total: result.data.totalValidations,
            valid: result.data.validEmails,
            invalid: result.data.invalidEmails,
            risky: result.data.riskyEmails,
            unknown: result.data.unknownEmails || 0
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // Fetch recent validation results with pagination
  const fetchRecentResults = async (page = 1) => {
    setIsLoadingResults(true);
    try {
      const response = await fetch(`${API_BASE_URL}/validation/recent?limit=${resultsPerPage}&page=${page}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const transformedResults = result.data.results.map(item => ({
            email: item.email,
            status: item.status,
            reason: item.reason,
            score: item.score,
            executionTime: item.executionTime,
            timestamp: item.createdAt
          }));
          setValidationResults(transformedResults);
          setTotalResults(result.data.pagination.total);
          setCurrentPage(page);
        }
      }
    } catch (error) {
      console.error('Failed to fetch recent results:', error);
    } finally {
      setIsLoadingResults(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchStats(), fetchRecentResults(1)]);
      setIsLoading(false);
    };
    loadData();
  }, []);

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= Math.ceil(totalResults / resultsPerPage)) {
      fetchRecentResults(newPage);
    }
  };

  // Single email validation
  const handleSingleValidation = async () => {
    if (!singleEmail.trim()) {
      setError('Please enter an email address');
      return;
    }
    
    setIsValidating(true);
    setError('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/validation/single`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: singleEmail.trim() }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Transform backend result to frontend format
        const transformedResult = {
          email: result.data.email,
          status: result.data.status,
          reason: result.data.reason,
          score: result.data.score,
          checks: result.data.checks,
          executionTime: result.data.executionTime,
          timestamp: new Date().toISOString(),
          cached: result.data.cached || false
        };

        // Add the new result to the top of the current results if we're on page 1
        if (currentPage === 1) {
          setValidationResults(prev => [transformedResult, ...prev.slice(0, resultsPerPage - 1)]);
          setTotalResults(prev => prev + 1);
        } else {
          // If not on page 1, go to page 1 to show the new result
          setCurrentPage(1);
          await fetchRecentResults(1);
        }
        
        setSingleEmail('');
        
        // Refresh stats
        await fetchStats();
      } else {
        throw new Error(result.error || 'Validation failed');
      }
      
    } catch (error) {
      console.error('Validation error:', error);
      setError(`Validation failed: ${error.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  // Bulk email validation
  const handleBulkValidation = async () => {
    if (!bulkFile) {
      setError('Please select a CSV file');
      return;
    }

    setIsBulkValidating(true);
    setError('');
    setBulkProgress(0);

    const formData = new FormData();
    formData.append('file', bulkFile);

    try {
      const response = await fetch(`${API_BASE_URL}/validation/bulk`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle streaming response for progress updates
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const newResults = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.type === 'progress') {
                setBulkProgress(data.progress);
              } else if (data.type === 'result') {
                const transformedResult = {
                  email: data.result.email,
                  status: data.result.status,
                  reason: data.result.reason,
                  score: data.result.score,
                  checks: data.result.checks,
                  executionTime: data.result.executionTime,
                  timestamp: new Date().toISOString(),
                  cached: data.result.cached || false
                };
                newResults.push(transformedResult);
              }
            } catch (e) {
              console.warn('Failed to parse line:', line);
            }
          }
        }
      }

      setBulkFile(null);
      
      // Go to page 1 and refresh to show new results at the top
      setCurrentPage(1);
      await Promise.all([fetchStats(), fetchRecentResults(1)]);
      
    } catch (error) {
      console.error('Bulk validation error:', error);
      setError(`Bulk validation failed: ${error.message}`);
    } finally {
      setIsBulkValidating(false);
      setBulkProgress(0);
    }
  };

  // File upload handler
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('File size must be less than 10MB');
        return;
      }
      setBulkFile(file);
      setError('');
    }
  };

  // Export all results to CSV (not just current page)
  const handleExportResults = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/validation/recent?limit=${totalResults}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data.results.length > 0) {
          const csvHeaders = 'Email,Status,Reason,Score,Execution Time,Timestamp\n';
          const csvData = result.data.results.map(item => 
            `"${item.email}","${item.status}","${item.reason}",${item.score},${item.executionTime},"${item.createdAt}"`
          ).join('\n');

          const blob = new Blob([csvHeaders + csvData], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `email-validation-results-${new Date().toISOString().split('T')[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        } else {
          setError('No results to export');
        }
      }
    } catch (error) {
      setError('Failed to export results');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="text-green-500" size={16} />;
      case 'invalid':
        return <XCircle className="text-red-500" size={16} />;
      case 'risky':
        return <AlertTriangle className="text-yellow-500" size={16} />;
      default:
        return <AlertTriangle className="text-gray-500" size={16} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'valid':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'invalid':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'risky':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <RefreshCw className="animate-spin" size={20} />
          <span className="text-gray-600 dark:text-gray-400">Loading validation data...</span>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(totalResults / resultsPerPage);

  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold font-display text-gray-900 dark:text-white">Email Validation</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Validate email addresses to improve deliverability.</p>
        </div>
      </motion.div>

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4"
        >
          <div className="flex items-center">
            <XCircle className="text-red-500 mr-2" size={16} />
            <span className="text-red-700 dark:text-red-400">{error}</span>
          </div>
        </motion.div>
      )}

      {/* Validation Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-5 gap-4"
      >
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{validationStats.total.toLocaleString()}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {validationStats.total > 0 ? Math.round((validationStats.valid / validationStats.total) * 100) : 0}%
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Valid ({validationStats.valid})</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
          <p className="text-2xl font-bold text-red-600">
            {validationStats.total > 0 ? Math.round((validationStats.invalid / validationStats.total) * 100) : 0}%
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Invalid ({validationStats.invalid})</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">
            {validationStats.total > 0 ? Math.round((validationStats.risky / validationStats.total) * 100) : 0}%
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Risky ({validationStats.risky})</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
          <p className="text-2xl font-bold text-gray-600">
            {validationStats.total > 0 ? Math.round((validationStats.unknown / validationStats.total) * 100) : 0}%
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Unknown ({validationStats.unknown})</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Single Email Validation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <h3 className="text-lg font-semibold font-display text-gray-900 dark:text-white mb-6">Single Email Validation</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
              <input 
                type="email" 
                value={singleEmail}
                onChange={(e) => setSingleEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                placeholder="test@example.com"
                onKeyPress={(e) => e.key === 'Enter' && !isValidating && handleSingleValidation()}
                disabled={isValidating}
              />
            </div>
            <button 
              onClick={handleSingleValidation}
              disabled={!singleEmail.trim() || isValidating}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-3 rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isValidating && <RefreshCw className="animate-spin mr-2" size={16} />}
              {isValidating ? 'Validating...' : 'Validate Email'}
            </button>
          </div>
        </motion.div>

        {/* Bulk Validation */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <h3 className="text-lg font-semibold font-display text-gray-900 dark:text-white mb-6">Bulk Validation</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Upload CSV File</label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-purple-400 transition-colors">
                <Upload className="mx-auto text-gray-400 mb-3" size={32} />
                {bulkFile ? (
                  <div>
                    <p className="text-gray-900 dark:text-white font-medium mb-1">{bulkFile.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      {(bulkFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">Drag and drop your CSV file here</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">or click to browse (Max 10MB)</p>
                  </>
                )}
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                  disabled={isBulkValidating}
                />
                <label
                  htmlFor="csv-upload"
                  className="bg-purple-600 text-white px-6 py-2 rounded-xl hover:bg-purple-700 transition-colors cursor-pointer inline-block"
                >
                  Choose File
                </label>
              </div>
            </div>
            
            {isBulkValidating && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Progress</span>
                  <span className="text-gray-900 dark:text-white">{bulkProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${bulkProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            <button
              onClick={handleBulkValidation}
              disabled={!bulkFile || isBulkValidating}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isBulkValidating && <RefreshCw className="animate-spin mr-2" size={16} />}
              {isBulkValidating ? 'Processing...' : 'Validate Bulk Emails'}
            </button>
            
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p className="mb-1">• CSV format: email,name (optional)</p>
              <p className="mb-1">• Maximum 10,000 emails per file</p>
              <p>• Processing time: ~2-4 seconds per email</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Validation Results with Pagination */}
      {totalResults > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold font-display text-gray-900 dark:text-white">
              Validation Results ({totalResults.toLocaleString()})
            </h3>
            <div className="flex space-x-3">
              <button 
                onClick={handleExportResults}
                className="flex items-center space-x-2 px-4 py-2 text-green-600 bg-green-50 dark:bg-green-900/20 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/30 transition-all duration-200"
              >
                <Download size={16} />
                <span>Export All</span>
              </button>
            </div>
          </div>

          {isLoadingResults ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center space-x-2">
                <RefreshCw className="animate-spin" size={20} />
                <span className="text-gray-600 dark:text-gray-400">Loading results...</span>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Email</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Reason</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Score</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Time (ms)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationResults.map((result, index) => (
                      <tr key={`${result.email}-${result.timestamp}-${index}`} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(result.status)}
                            <span className="font-medium text-gray-900 dark:text-white break-all">{result.email}</span>
                            {result.cached && (
                              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 rounded-full">
                                Cached
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(result.status)}`}>
                            {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-600 dark:text-gray-400">{result.reason}</td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  result.score >= 80 ? 'bg-green-500' : 
                                  result.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${result.score}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{result.score}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-gray-600 dark:text-gray-400 text-sm">
                          {result.executionTime || 'N/A'}
                          {result.cached && <span className="text-blue-600 ml-1">(instant)</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <span>
                      Showing {((currentPage - 1) * resultsPerPage) + 1} to {Math.min(currentPage * resultsPerPage, totalResults)} of {totalResults.toLocaleString()} results
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || isLoadingResults}
                      className="flex items-center space-x-1 px-3 py-2 text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={16} />
                      <span>Previous</span>
                    </button>
                    
                    <div className="flex items-center space-x-1">
                      {[...Array(Math.min(5, totalPages))].map((_, i) => {
                        const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                        if (page > totalPages) return null;
                        
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            disabled={isLoadingResults}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              page === currentPage
                                ? 'bg-purple-600 text-white'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            } disabled:cursor-not-allowed`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages || isLoadingResults}
                      className="flex items-center space-x-1 px-3 py-2 text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>Next</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default EmailValidation;
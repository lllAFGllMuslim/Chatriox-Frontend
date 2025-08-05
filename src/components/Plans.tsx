import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, Star, Zap, Shield, Users, Headphones, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Plan {
  id: string;
  name: string;
  price: {
    monthly: number;
    yearly: number;
  };
  features: {
    emailsPerMonth: number;
    emailAccounts: number;
    whatsappAccounts: number;
    templates: string;
    validation: boolean | string;
    analytics: string;
    support: string;
    whatsapp: boolean;
    scraper: boolean | string;
    customBranding: boolean;
    apiAccess: boolean;
  };
  trialLimits: {
    emailsPerMonth: number;
    emailAccounts: number;
    whatsappAccounts: number;
    templates: string;
    validation: number | string;
    analytics: string;
  };
  isCurrentPlan?: boolean;
  trialDaysRemaining?: number;
}

interface PlansResponse {
  success: boolean;
  data: {
    plans: Plan[];
    currentUser: {
      plan: string;
      planStatus: string;
      isInTrial: boolean;
      trialDaysRemaining: number;
      planExpiry: string;
    };
  };
}

interface TrialStatusResponse {
  success: boolean;
  data: {
    isInTrial: boolean;
    isTrialExpired: boolean;
    trialDaysRemaining: number;
    trialStartDate: string;
    trialEndDate: string;
    planStatus: string;
    currentPlan: string;
  };
}

const Plans: React.FC = () => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch plans from the correct backend API
  const { data: plansResponse, isLoading, error } = useQuery<PlansResponse>({
    queryKey: ['plans'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://papakha.in'}/api/subscription/plans`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch plans');
      }
      return response.json();
    },
    enabled: !!user
  });

  // Fetch trial status
  const { data: trialStatusResponse } = useQuery<TrialStatusResponse>({
    queryKey: ['trial-status'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://papakha.in'}/api/subscription/trial-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch trial status');
      }
      return response.json();
    },
    enabled: !!user
  });

  // Transform backend plans data to match frontend expectations
  const transformedPlans = plansResponse?.data?.plans?.map((plan) => {
    let popular = false;
    let description = '';
    
    // Set popularity and descriptions based on plan type
    switch (plan.id) {
      case 'starter':
        description = 'Perfect for trying out our platform';
        break;
      case 'professional':
        description = 'Great for individuals and small teams';
        popular = true;
        break;
      case 'enterprise':
        description = 'For large organizations with advanced needs';
        break;
    }

    // Convert features to display format
    const displayFeatures = [
      plan.features.emailsPerMonth === -1 ? 'Unlimited emails per month' : `${plan.features.emailsPerMonth.toLocaleString()} emails per month`,
      plan.features.emailAccounts === -1 ? 'Unlimited email accounts' : `${plan.features.emailAccounts} email account${plan.features.emailAccounts > 1 ? 's' : ''}`,
      `${plan.features.whatsappAccounts} WhatsApp account${plan.features.whatsappAccounts > 1 ? 's' : ''}`,
      `${plan.features.templates} templates`,
      `${plan.features.analytics} analytics`,
      `${plan.features.support} support`,
      ...(plan.features.whatsapp ? ['WhatsApp integration'] : []),
      ...(plan.features.scraper ? [`${typeof plan.features.scraper === 'string' ? plan.features.scraper : 'Basic'} scraper`] : []),
      ...(plan.features.customBranding ? ['Custom branding'] : []),
      ...(plan.features.apiAccess ? ['API access'] : []),
      ...(plan.features.validation ? ['Email validation'] : [])
    ];

    return {
      ...plan,
      popular,
      description,
      displayFeatures
    };
  }) || [];

  const formatPrice = (price: { monthly: number; yearly: number }) => {
    return billingCycle === 'yearly' ? price.yearly : price.monthly;
  };

  const handleSelectPlan = async (planId: string) => {
    if (isProcessing) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // If it's the current active plan, do nothing
    if (plansResponse?.data?.currentUser?.plan === planId && plansResponse?.data?.currentUser?.planStatus === 'active') {
      return;
    }

    setIsProcessing(planId);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://papakha.in'}/api/subscription/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          planId: planId,
          billingCycle: billingCycle
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create order');
      }

      if (result.success && result.data?.paymentSessionId) {
        // Initialize Cashfree payment
        const cashfree = new (window as any).Cashfree({
          mode: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
        });

        const checkoutOptions = {
          paymentSessionId: result.data.paymentSessionId,
          redirectTarget: '_self'
        };

        cashfree.checkout(checkoutOptions).then((result: any) => {
          if (result.error) {
            console.error('Payment error:', result.error);
            alert('Payment failed. Please try again.');
          }
          if (result.redirect) {
            console.log('Payment completed');
          }
        });
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert(error instanceof Error ? error.message : 'Failed to process plan selection');
    } finally {
      setIsProcessing(null);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Failed to Load Plans
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Please try refreshing the page
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Unlock the full potential of AI-powered content creation
          </p>
          
          {/* Current Subscription Status */}
          {plansResponse?.data?.currentUser && (
            <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-8 max-w-md mx-auto">
              <p className="text-blue-800 dark:text-blue-200">
                Current Plan: <span className="font-semibold capitalize">{plansResponse.data.currentUser.plan}</span>
                {plansResponse.data.currentUser.planStatus === 'active' && plansResponse.data.currentUser.planExpiry && (
                  <span className="block text-sm mt-1">
                    Expires: {new Date(plansResponse.data.currentUser.planExpiry).toLocaleDateString()}
                  </span>
                )}
                {plansResponse.data.currentUser.isInTrial && (
                  <span className="block text-sm mt-1 text-orange-600 dark:text-orange-400">
                    Trial: {plansResponse.data.currentUser.trialDaysRemaining} days remaining
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Trial Status */}
          {trialStatusResponse?.data?.isInTrial && (
            <div className="bg-orange-50 dark:bg-orange-900 border border-orange-200 dark:border-orange-700 rounded-lg p-4 mb-8 max-w-md mx-auto">
              <p className="text-orange-800 dark:text-orange-200">
                <span className="font-semibold">Trial Active</span>
                <span className="block text-sm mt-1">
                  {trialStatusResponse.data.trialDaysRemaining} days remaining
                </span>
                <span className="block text-xs mt-1">
                  Trial ends: {new Date(trialStatusResponse.data.trialEndDate).toLocaleDateString()}
                </span>
              </p>
            </div>
          )}
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center mb-8">
            <span className={`mr-3 ${billingCycle === 'monthly' ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 dark:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`ml-3 ${billingCycle === 'yearly' ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-500'}`}>
              Yearly
            </span>
            {billingCycle === 'yearly' && (
              <span className="ml-2 bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                Better Value
              </span>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {transformedPlans.map((plan: any) => {
              const isCurrentPlan = plansResponse?.data?.currentUser?.plan === plan.id && plansResponse?.data?.currentUser?.planStatus === 'active';
              const isProcessingThisPlan = isProcessing === plan.id;
              
              return (
                <div
                  key={plan.id}
                  className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl ${
                    plan.popular ? 'ring-2 ring-blue-500 scale-105' : ''
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center py-2 text-sm font-semibold">
                      <Star className="inline-block w-4 h-4 mr-1" />
                      Most Popular
                    </div>
                  )}
                  
                  <div className={`p-8 ${plan.popular ? 'pt-16' : ''}`}>
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {plan.name}
                      </h3>
                      <div className="mb-4">
                        <span className="text-4xl font-bold text-gray-900 dark:text-white">
                          ₹{formatPrice(plan.price).toLocaleString()}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          /{billingCycle}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300">
                        {plan.description}
                      </p>
                    </div>

                    <div className="space-y-3 mb-8 max-h-60 overflow-y-auto">
                      {plan.displayFeatures?.map((feature: string, index: number) => (
                        <div key={index} className="flex items-start">
                          <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="text-center">
                      <button 
                        onClick={() => handleSelectPlan(plan.id)}
                        disabled={isCurrentPlan || isProcessingThisPlan}
                        className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                          plan.popular
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {isProcessingThisPlan ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Processing...
                          </div>
                        ) : isCurrentPlan ? (
                          'Current Plan'
                        ) : (
                          'Select Plan'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Features Section */}
        <div className="mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Why Choose Our Platform?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Everything you need for powerful email and WhatsApp marketing
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 dark:bg-blue-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                High Volume Sending
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Send thousands of emails and WhatsApp messages with enterprise-grade delivery
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 dark:bg-green-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Email Validation
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Ensure high deliverability with built-in email validation and verification
              </p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 dark:bg-purple-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Multi-Channel Marketing
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Reach your audience through email, WhatsApp, and other channels
              </p>
            </div>

            <div className="text-center">
              <div className="bg-orange-100 dark:bg-orange-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Headphones className="w-8 h-8 text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Advanced Analytics
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Track performance with detailed analytics and reporting tools
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Plans;
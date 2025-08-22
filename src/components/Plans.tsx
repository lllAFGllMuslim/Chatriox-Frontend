import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, Star, Zap, Shield, Users, Headphones, AlertCircle, ArrowDown, Lock } from 'lucide-react';
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
      currentBillingCycle: string;
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

interface UpgradeCalculation {
  success: boolean;
  data: {
    currentPlan: string;
    newPlan: string;
    billingCycle: string;
    daysUsed: number;
    originalPrice: number;
    creditAmount: number;
    discountedPrice: number;
    remainingDays: number;
    dailyRate: number;
  };
}

const Plans: React.FC = () => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [upgradeCalculations, setUpgradeCalculations] = useState<Record<string, UpgradeCalculation['data'] | null>>({});
  const { user } = useAuth();

  // Fetch plans from the correct backend API
  const { data: plansResponse, isLoading, error } = useQuery<PlansResponse>({
    queryKey: ['plans'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://chatriox.com'}/api/subscription/plans`, {
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
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://chatriox.com'}/api/subscription/trial-status`, {
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
  const transformedPlans = useMemo(() => {
    return plansResponse?.data?.plans?.map((plan) => {
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
  }, [plansResponse?.data?.plans]);

  const formatPrice = (price: { monthly: number; yearly: number }) => {
    return billingCycle === 'yearly' ? price.yearly : price.monthly;
  };

  // Function to calculate upgrade pricing
  const calculateUpgrade = async (planId: string, billingCycle: 'monthly' | 'yearly') => {
    const token = localStorage.getItem('token');
    if (!token) return null;

    // Allow calculation for billing cycle changes on same plan
    const currentPlan = plansResponse?.data?.currentUser?.plan;
    const currentBillingCycle = plansResponse?.data?.currentUser?.currentBillingCycle;
    const planHierarchy = { starter: 1, professional: 2, enterprise: 3 };
    
    // Skip calculation if it's not an upgrade or billing cycle change
    if (!currentPlan) return null;
    
    const isHigherTier = planHierarchy[planId as keyof typeof planHierarchy] > planHierarchy[currentPlan as keyof typeof planHierarchy];
    const isBillingCycleChange = planId === currentPlan && currentBillingCycle !== billingCycle;
    
    if (!isHigherTier && !isBillingCycleChange) {
      return null;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://chatriox.com'}/api/subscription/calculate-upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ planId, billingCycle })
      });

      if (response.ok) {
        const result: UpgradeCalculation = await response.json();
        return result.data;
      }
    } catch (error) {
      console.error('Error calculating upgrade:', error);
    }
    return null;
  };

  // Calculate upgrades when plans load or billing cycle changes
  useEffect(() => {
    const calculateAllUpgrades = async () => {
      if (!transformedPlans.length || plansResponse?.data?.currentUser?.planStatus !== 'active') return;

      const calculations: Record<string, UpgradeCalculation['data'] | null> = {};
      
      for (const plan of transformedPlans) {
        const upgradeData = await calculateUpgrade(plan.id, billingCycle);
        calculations[`${plan.id}-${billingCycle}`] = upgradeData;
      }
      
      setUpgradeCalculations(calculations);
    };

    calculateAllUpgrades();
  }, [transformedPlans, billingCycle, plansResponse?.data?.currentUser]);

  const handleSelectPlan = async (planId: string) => {
    if (isProcessing) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // If it's the current active plan with same billing cycle, do nothing
    if (plansResponse?.data?.currentUser?.plan === planId && 
        plansResponse?.data?.currentUser?.planStatus === 'active' &&
        plansResponse?.data?.currentUser?.currentBillingCycle === billingCycle) {
      return;
    }

    // Check if this is an upgrade or billing cycle change
    const currentPlan = plansResponse?.data?.currentUser?.plan;
    const currentBillingCycle = plansResponse?.data?.currentUser?.currentBillingCycle;
    const planHierarchy = { starter: 1, professional: 2, enterprise: 3 };
    
    const isUpgrade = currentPlan && 
      plansResponse?.data?.currentUser?.planStatus === 'active' &&
      (
        // Higher tier plan
        planHierarchy[planId as keyof typeof planHierarchy] > planHierarchy[currentPlan as keyof typeof planHierarchy] ||
        // Same plan but switching billing cycles
        (planId === currentPlan && currentBillingCycle !== billingCycle)
      );

    // Debug: Check if Cashfree SDK is loaded
    console.log('window.Cashfree:', (window as any).Cashfree);
    if (!(window as any).Cashfree) {
      alert('Payment system is not ready. Please refresh the page and try again.');
      return;
    }

    setIsProcessing(planId);

    try {
      // Store plan selection for success page
      localStorage.setItem('selectedPlanId', planId);
      localStorage.setItem('selectedBillingCycle', billingCycle);

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://chatriox.com'}/api/subscription/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          planId: planId,
          billingCycle: billingCycle,
          isUpgrade: isUpgrade || false
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create order');
      }

      if (result.success && result.data?.paymentSessionId) {
        try {
          const cashfree = (window as any).Cashfree({
            mode: 'production'
          });

          const checkoutOptions = {
            paymentSessionId: result.data.paymentSessionId,
            redirectTarget: '_self'
          };

          cashfree.checkout(checkoutOptions).then((checkoutResult: any) => {
            if (checkoutResult.error) {
              console.error('Payment error:', checkoutResult.error);
              alert('Payment failed: ' + checkoutResult.error.message);
              localStorage.removeItem('selectedPlanId');
              localStorage.removeItem('selectedBillingCycle');
            }
          }).catch((error: any) => {
            console.error('Cashfree SDK error:', error);
            alert('Payment initialization failed. Please try again.');
            localStorage.removeItem('selectedPlanId');
            localStorage.removeItem('selectedBillingCycle');
          });
        } catch (error) {
          console.error('Error initializing Cashfree:', error);
          alert('Payment system initialization failed. Please refresh and try again.');
          localStorage.removeItem('selectedPlanId');
          localStorage.removeItem('selectedBillingCycle');
        }
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert(error instanceof Error ? error.message : 'Failed to process plan selection');
      localStorage.removeItem('selectedPlanId');
      localStorage.removeItem('selectedBillingCycle');
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
                <span className="ml-2 text-sm">({plansResponse.data.currentUser.currentBillingCycle})</span>
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
              const currentPlan = plansResponse?.data?.currentUser?.plan;
              const currentBillingCycle = plansResponse?.data?.currentUser?.currentBillingCycle;
              const planHierarchy = { starter: 1, professional: 2, enterprise: 3 };
              
              // Determine plan relationship
              const isCurrentPlanSameTier = currentPlan === plan.id;
              const isCurrentPlanAndBilling = isCurrentPlanSameTier && 
                                            plansResponse?.data?.currentUser?.planStatus === 'active' &&
                                            currentBillingCycle === billingCycle;
              const isProcessingThisPlan = isProcessing === plan.id;
              
              // Check if this is an upgrade, downgrade, or billing change
              const isUpgrade = currentPlan && 
                plansResponse?.data?.currentUser?.planStatus === 'active' &&
                (
                  planHierarchy[plan.id as keyof typeof planHierarchy] > planHierarchy[currentPlan as keyof typeof planHierarchy] ||
                  (isCurrentPlanSameTier && currentBillingCycle === 'monthly' && billingCycle === 'yearly')
                );
              
              const isDowngrade = currentPlan && 
                plansResponse?.data?.currentUser?.planStatus === 'active' &&
                planHierarchy[plan.id as keyof typeof planHierarchy] < planHierarchy[currentPlan as keyof typeof planHierarchy];
              
              const isBillingDowngrade = isCurrentPlanSameTier && 
                currentBillingCycle === 'yearly' && 
                billingCycle === 'monthly';
              
              const upgradeData = upgradeCalculations[`${plan.id}-${billingCycle}`];
              const displayPrice = isUpgrade && upgradeData ? upgradeData.discountedPrice : formatPrice(plan.price);
              const originalPrice = formatPrice(plan.price);
              const hasDiscount = isUpgrade && upgradeData && upgradeData.discountedPrice < originalPrice;
              
              // Determine button text and state
              let buttonText = 'Select Plan';
              let buttonDisabled = false;
              let buttonStyle = 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600';
              
              if (isProcessingThisPlan) {
                buttonText = 'Processing...';
                buttonDisabled = true;
              } else if (isCurrentPlanAndBilling) {
                buttonText = 'Current Plan';
                buttonDisabled = true;
              } else if (isUpgrade) {
                if (isCurrentPlanSameTier) {
                  buttonText = 'Switch to Yearly';
                } else {
                  buttonText = 'Upgrade Plan';
                }
                buttonStyle = plan.popular
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg'
                  : 'bg-blue-600 text-white hover:bg-blue-700';
              } else if (isDowngrade) {
                buttonText = 'Downgrade';
                buttonStyle = 'bg-orange-600 text-white hover:bg-orange-700';
              } else if (isBillingDowngrade) {
                buttonText = 'Switch to Monthly';
                buttonStyle = 'bg-orange-600 text-white hover:bg-orange-700';
              }
              
              return (
                <div
                  key={plan.id}
                  className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl ${
                    plan.popular ? 'ring-2 ring-blue-500 scale-105' : ''
                  } ${isDowngrade || isBillingDowngrade ? 'opacity-75' : ''}`}
                >
                  {plan.popular && !isDowngrade && !isBillingDowngrade && (
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center py-2 text-sm font-semibold">
                      <Star className="inline-block w-4 h-4 mr-1" />
                      Popular
                    </div>
                  )}
                  
                  {/* Upgrade Badge */}
                  {isUpgrade && hasDiscount && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold z-10">
                      {isCurrentPlanSameTier ? 'Billing Discount' : 'Upgrade Discount'}
                    </div>
                  )}
                  
                  {/* Downgrade Badge */}
                  {(isDowngrade || isBillingDowngrade) && (
                    <div className="absolute top-2 right-2 bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-semibold z-10 flex items-center">
                      <ArrowDown className="w-3 h-3 mr-1" />
                      {isBillingDowngrade ? 'Billing Change' : 'Downgrade'}
                    </div>
                  )}
                  
                  <div className={`p-8 ${plan.popular && !isDowngrade && !isBillingDowngrade ? 'pt-16' : ''}`}>
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {plan.name}
                      </h3>
                      <div className="mb-4">
                        {/* Show original price crossed out if there's a discount */}
                        {hasDiscount && (
                          <div className="text-lg text-gray-500 dark:text-gray-400 line-through">
                            ₹{originalPrice.toLocaleString()}
                          </div>
                        )}
                        <span className={`text-4xl font-bold ${
                          hasDiscount 
                            ? 'text-green-600 dark:text-green-400' 
                            : (isDowngrade || isBillingDowngrade)
                            ? 'text-orange-600 dark:text-orange-400'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                          ₹{Math.round(displayPrice).toLocaleString()}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          /{billingCycle}
                        </span>
                        {/* Show savings amount */}
                        {hasDiscount && upgradeData && (
                          <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                            Save ₹{Math.round(originalPrice - upgradeData.discountedPrice).toLocaleString()} 
                            <br />({upgradeData.remainingDays} days credit)
                          </div>
                        )}
                      </div>
                      <p className="text-gray-600 dark:text-gray-300">
                        {plan.description}
                      </p>
                      
                      {/* Upgrade details */}
                      {isUpgrade && upgradeData && (
                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg text-sm">
                          <div className="text-blue-800 dark:text-blue-200">
                            <div>Credit from current plan: ₹{Math.round(upgradeData.creditAmount)}</div>
                            <div>Days remaining: {upgradeData.remainingDays}</div>
                          </div>
                        </div>
                      )}
                      
                      {/* Downgrade warning */}
                      {(isDowngrade || isBillingDowngrade) && (
                        <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900 rounded-lg text-sm">
                          <div className="text-orange-800 dark:text-orange-200 flex items-center justify-center">
                            <Lock className="w-4 h-4 mr-2" />
                            {isBillingDowngrade 
                              ? 'Changes apply at next billing cycle'
                              : 'Feature access will be limited'
                            }
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 mb-8 max-h-60 overflow-y-auto">
                      {plan.displayFeatures?.map((feature: string, index: number) => (
                        <div key={index} className="flex items-start">
                          <Check className={`w-5 h-5 mr-3 flex-shrink-0 mt-0.5 ${
                            (isDowngrade || isBillingDowngrade) ? 'text-orange-500' : 'text-green-500'
                          }`} />
                          <span className={`text-sm ${
                            (isDowngrade || isBillingDowngrade) 
                              ? 'text-gray-500 dark:text-gray-400' 
                              : 'text-gray-700 dark:text-gray-300'
                          }`}>
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="text-center">
                      <button 
                        onClick={() => handleSelectPlan(plan.id)}
                        disabled={buttonDisabled}
                        className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${buttonStyle}`}
                      >
                        {isProcessingThisPlan ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Processing...
                          </div>
                        ) : (
                          buttonText
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
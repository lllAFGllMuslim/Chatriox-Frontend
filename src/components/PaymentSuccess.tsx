import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [message, setMessage] = useState('Verifying your payment...');

  useEffect(() => {
    const orderId = searchParams.get('order_id');
    const planId = localStorage.getItem('selectedPlanId');
    const billingCycle = localStorage.getItem('selectedBillingCycle');

    console.log('Payment success page loaded:', { orderId, planId, billingCycle });

    if (orderId && planId && billingCycle) {
      verifyPayment(orderId, planId, billingCycle);
    } else {
      setStatus('failed');
      setMessage('Missing payment information. Redirecting to plans...');
      setTimeout(() => navigate('/plans'), 3000);
    }

    // Clean up localStorage
    localStorage.removeItem('selectedPlanId');
    localStorage.removeItem('selectedBillingCycle');
  }, [searchParams, navigate]);

  const verifyPayment = async (orderId: string, planId: string, billingCycle: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://chatriox.com'}/api/subscription/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          orderId,
          planId,
          billingCycle
        })
      });

      const result = await response.json();
      console.log('Payment verification result:', result);
      
      if (result.success) {
        setStatus('success');
        setMessage(`Payment successful! Your ${planId} plan has been activated.`);
        setTimeout(() => navigate('/dashboard'), 3000);
      } else {
        setStatus('failed');
        setMessage(result.message || 'Payment verification failed. Please contact support.');
        setTimeout(() => navigate('/plans'), 5000);
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      setStatus('failed');
      setMessage('Payment verification failed. Please contact support.');
      setTimeout(() => navigate('/plans'), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
        {status === 'verifying' && (
          <>
            <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Verifying Payment
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Please wait while we confirm your payment...
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-600 mb-2">
              Payment Successful!
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {message}
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to dashboard in a few seconds...
            </p>
          </>
        )}

        {status === 'failed' && (
          <>
            <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-600 mb-2">
              Payment Failed
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {message}
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to plans page...
            </p>
          </>
        )}

        <div className="mt-6">
          <button
            onClick={() => navigate('/plans')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Plans
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;

import { useState, useCallback } from 'react';
import { paymentApi } from '../services/payment.api.js';
import { useToast } from '../../../shared/context/ToastContext.jsx';

/**
 * Helper to dynamically load the Razorpay checkout.js script
 */
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.getElementById('razorpay-checkout-script');
    if (existingScript) {
      existingScript.onload = () => resolve(true);
      existingScript.onerror = () => resolve(false);
      return;
    }

    const script = document.createElement('script');
    script.id = 'razorpay-checkout-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

/**
 * Custom React Hook for executing Razorpay checkout flows
 */
export const useRazorpay = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const { toast } = useToast();

  const initiatePayment = useCallback(
    async ({ quotationId, onSuccess, onError, onDismiss }) => {
      setIsProcessing(true);
      setPaymentError(null);

      try {
        // 1. Ensure Razorpay SDK script is loaded
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error('Failed to load Razorpay payment SDK. Please check your internet connection.');
        }

        // 2. Request Backend to create a secure Razorpay Order
        const orderData = await paymentApi.createQuotationOrder(quotationId);
        if (!orderData || !orderData.order_id) {
          throw new Error('Could not initiate payment order with the gateway.');
        }

        // 3. Configure Razorpay modal options
        const options = {
          key: orderData.key_id,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'DealFlow360',
          description: `Payment for Quotation #${orderData.quotation_number || quotationId}`,
          order_id: orderData.order_id,
          prefill: {
            name: orderData.customer?.name || '',
            email: orderData.customer?.email || '',
            contact: orderData.customer?.contact || '',
          },
          theme: {
            color: '#2563eb', // DealFlow360 Brand Blue
          },
          handler: async (response) => {
            try {
              setIsProcessing(true);
              // 4. Verify cryptographic signature on the backend and settle order
              const verificationResult = await paymentApi.verifyPayment({
                quotation_id: quotationId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });

              toast.success('🎉 Payment successful! Your order has been placed and settled.');
              if (onSuccess) onSuccess(verificationResult);
            } catch (verErr) {
              console.error('Payment verification failed:', verErr);
              const errMsg = verErr.customMessage || 'Payment verification failed. Please contact support.';
              setPaymentError(errMsg);
              toast.error(errMsg);
              if (onError) onError(verErr);
            } finally {
              setIsProcessing(false);
            }
          },
          modal: {
            ondismiss: () => {
              setIsProcessing(false);
              if (onDismiss) onDismiss();
            },
          },
        };

        // 5. Open Razorpay Checkout Window
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (response) => {
          console.error('Razorpay payment failed:', response.error);
          const errorDesc = response.error?.description || 'Payment was declined or cancelled.';
          setPaymentError(errorDesc);
          toast.error(`Payment failed: ${errorDesc}`);
          setIsProcessing(false);
          if (onError) onError(response.error);
        });

        rzp.open();
      } catch (err) {
        console.error('Failed to initiate Razorpay payment:', err);
        const errorMsg = err.customMessage || err.message || 'Failed to start payment process.';
        setPaymentError(errorMsg);
        toast.error(errorMsg);
        setIsProcessing(false);
        if (onError) onError(err);
      }
    },
    [toast]
  );

  return {
    initiatePayment,
    isProcessing,
    paymentError,
  };
};

export default useRazorpay;

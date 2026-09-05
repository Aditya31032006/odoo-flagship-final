import Razorpay from 'razorpay';
import config from './config.js';

export const getRazorpayKeyId = () => {
  return (process.env.RAZORPAY_KEY_ID || config.RAZORPAY_KEY_ID || '').trim();
};

export const getRazorpayKeySecret = () => {
  return (process.env.RAZORPAY_KEY_SECRET || config.RAZORPAY_KEY_SECRET || '').trim();
};

export const getRazorpayInstance = () => {
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpayKeySecret();

  if (!keyId || !keySecret) {
    console.warn('⚠️ Razorpay credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) are missing or empty.');
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

export default getRazorpayInstance;

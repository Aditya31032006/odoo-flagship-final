import { Queue, Worker } from 'bullmq';
import { redisConnection } from '../config/redis.js';
import {
  sendMail,
  generateWelcomeEmail,
  generateOtpEmail,
  generateStaffInvitationEmail,
  generateQuotationIssuedEmail,
  generateCounterOfferEmail,
  generateQuotationApprovedEmail,
} from '../services/mail.service.js';

/**
 * BullMQ Email Queue for offloading email dispatching.
 */
export const emailQueue = new Queue('email-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
    removeOnComplete: {
      count: 100,
      age: 24 * 3600, // keep for 24 hours
    },
    removeOnFail: {
      count: 500,
    },
  },
});

let emailWorker = null;

/**
 * Explicitly initializes and starts the BullMQ Email Worker.
 */
export function initEmailWorker() {
  if (emailWorker) {
    return emailWorker;
  }

  emailWorker = new Worker(
    'email-queue',
    async (job) => {
      const { name, data } = job;

      switch (name) {
        case 'send-welcome-email': {
          const { name: userName, email } = data;
          const html = generateWelcomeEmail({ name: userName, email });
          await sendMail({
            toEmail: email,
            subject: 'Welcome to DealFlow360! 🌐',
            html,
          });
          break;
        }

        case 'send-otp-email': {
          const { email, otp } = data;
          const html = generateOtpEmail({ otp });
          await sendMail({
            toEmail: email,
            subject: 'Your DealFlow360 Password Reset OTP 🔒',
            html,
          });
          break;
        }

        case 'send-staff-invitation': {
          const { name: staffName, email, role, tempPassword } = data;
          const html = generateStaffInvitationEmail({ name: staffName, email, role, tempPassword });
          await sendMail({
            toEmail: email,
            subject: `🎉 You've Been Invited to DealFlow360 (${role})`,
            html,
          });
          break;
        }

        case 'send-quotation-issued': {
          const { toEmail, customerName, quotationNumber, quotationId, grandTotal, validUntil, items } = data;
          const html = generateQuotationIssuedEmail({
            customerName,
            quotationNumber,
            quotationId,
            grandTotal,
            validUntil,
            items,
          });
          await sendMail({
            toEmail,
            subject: `📄 New Quotation Issued: ${quotationNumber}`,
            html,
          });
          break;
        }

        case 'send-counter-offer': {
          const { toEmail, customerName, quotationNumber, quotationId, counterDiscount, requestedDeliveryDate, message } = data;
          const html = generateCounterOfferEmail({
            customerName,
            quotationNumber,
            quotationId,
            counterDiscount,
            requestedDeliveryDate,
            message,
          });
          await sendMail({
            toEmail,
            subject: `💬 New Counter-Offer for Quotation: ${quotationNumber}`,
            html,
          });
          break;
        }

        case 'send-quotation-approved': {
          const { toEmail, customerName, quotationNumber, quotationId, grandTotal, validUntil } = data;
          const html = generateQuotationApprovedEmail({
            customerName,
            quotationNumber,
            quotationId,
            grandTotal,
            validUntil,
          });
          await sendMail({
            toEmail,
            subject: `✅ Quotation Approved: ${quotationNumber}`,
            html,
          });
          break;
        }

        case 'send-generic-mail': {
          const { toEmail, subject, html, text } = data;
          await sendMail({ toEmail, subject, html, text });
          break;
        }

        default:
          throw new Error(`Unknown job type: ${name}`);
      }
    },
    {
      connection: redisConnection,
      concurrency: 5,
    }
  );

  // ==================== EVENT LISTENERS ====================

  emailWorker.on('completed', (job) => {
    console.log(`📧 [BullMQ] Email sent successfully (${job.name}) to: ${job.data.email || job.data.toEmail}`);
  });

  emailWorker.on('failed', (job, err) => {
    console.error(`❌ [BullMQ] Email job FAILED (${job?.name}) to: ${job?.data?.email || job?.data?.toEmail} — Reason: ${err.message}`);
  });

  emailWorker.on('error', (err) => {
    console.error(`⚠️ [BullMQ] Email worker connection error: ${err.message}`);
  });

  console.log('⚡ BullMQ Email Worker initialized and listening for jobs.');
  return emailWorker;
}

// ==================== HELPER DISPATCHERS ====================

/**
 * Enqueues a welcome email job upon user registration.
 */
export const addWelcomeEmailJob = async ({ name, email }) => {
  return await emailQueue.add('send-welcome-email', { name, email });
};

/**
 * Enqueues a password reset OTP email job.
 */
export const addOtpEmailJob = async ({ email, otp }) => {
  return await emailQueue.add('send-otp-email', { email, otp });
};

/**
 * Enqueues a staff invitation email job.
 */
export const addStaffInvitationJob = async ({ name, email, role, tempPassword }) => {
  return await emailQueue.add('send-staff-invitation', { name, email, role, tempPassword });
};

/**
 * Enqueues an email job when a pending quotation is issued to customer
 */
export const addQuotationIssuedEmailJob = async (data) => {
  try {
    const html = generateQuotationIssuedEmail(data);
    const result = await sendMail({
      toEmail: data.toEmail,
      subject: `📄 New Quotation Issued: ${data.quotationNumber}`,
      html,
    });
    console.log(`📧 Direct quotation issued email dispatched to: ${data.toEmail}`);
    return result;
  } catch (err) {
    console.error('⚠️ Failed to dispatch quotation issued email:', err.message);
  }
};

/**
 * Enqueues an email job when sales rep submits a counter-offer
 */
export const addCounterOfferEmailJob = async (data) => {
  try {
    const html = generateCounterOfferEmail(data);
    const result = await sendMail({
      toEmail: data.toEmail,
      subject: `💬 New Counter-Offer for Quotation: ${data.quotationNumber}`,
      html,
    });
    console.log(`📧 Direct counter-offer email dispatched to: ${data.toEmail}`);
    return result;
  } catch (err) {
    console.error('⚠️ Failed to dispatch counter offer email:', err.message);
  }
};

/**
 * Enqueues an email job when a quotation is approved/confirmed
 */
export const addQuotationApprovedEmailJob = async (data) => {
  try {
    const html = generateQuotationApprovedEmail(data);
    const result = await sendMail({
      toEmail: data.toEmail,
      subject: `✅ Quotation Approved: ${data.quotationNumber}`,
      html,
    });
    console.log(`📧 Direct quotation approved email dispatched to: ${data.toEmail}`);
    return result;
  } catch (err) {
    console.error('⚠️ Failed to dispatch quotation approved email:', err.message);
  }
};

/**
 * Enqueues a custom generic email job.
 */
export const addGenericEmailJob = async ({ toEmail, subject, html, text }) => {
  return await emailQueue.add('send-generic-mail', { toEmail, subject, html, text });
};

/**
 * Retrieves current job counts for monitoring/health check.
 */
export const getQueueStatus = async () => {
  try {
    const counts = await emailQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
    return {
      status: 'up',
      ...counts,
    };
  } catch (error) {
    return {
      status: 'down',
      error: error.message,
    };
  }
};

import React, { useState, useEffect, useRef, memo } from 'react';
import { useForm } from 'react-hook-form';
import useAuth from '../../auth/hook/useAuth.js';
import useRazorpay from '../../payments/hook/useRazorpay.js';
import negotiationApi from '../services/negotiation.api.js';
import quotationApi from '../services/quotation.api.js';
import { useToast } from '../../../shared/context/ToastContext.jsx';
import '../styles/negotiation.scss';

export const NegotiationPanel = memo(({
  quotationId,
  quotation,
  quotationItems = [],
  onQuotationUpdated,
}) => {
  const { user } = useAuth();
  const { toast, confirm } = useToast();
  const { initiatePayment: initiateRazorpayPayment, isProcessing: isPayingWithRazorpay } = useRazorpay();
  const isCustomer = user?.role === 'customer';

  const [negotiation, setNegotiation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCounterForm, setShowCounterForm] = useState(false);

  const messagesEndRef = useRef(null);

  // 1. React Hook Form for Counter-Offer
  const {
    register: registerCounter,
    handleSubmit: handleSubmitCounter,
    setValue: setCounterValue,
    reset: resetCounter,
    formState: { errors: counterErrors },
  } = useForm({
    defaultValues: {
      counter_discount_percentage: '',
      requested_delivery_date: '',
      message: '',
    },
  });

  // 2. React Hook Form for Chat Messaging
  const {
    register: registerChat,
    handleSubmit: handleSubmitChat,
    reset: resetChat,
  } = useForm({
    defaultValues: {
      message: '',
      quotation_item_id: '',
    },
  });

  // Load active negotiation on mount or quotationId change
  const loadNegotiation = async () => {
    if (!quotationId) return;
    setLoading(true);
    try {
      const res = await negotiationApi.getNegotiation(quotationId);
      if (res?.data) {
        setNegotiation(res.data);
        if (res.data.counter_discount_percentage != null) {
          setCounterValue('counter_discount_percentage', res.data.counter_discount_percentage);
        }
        if (res.data.requested_delivery_date) {
          setCounterValue('requested_delivery_date', res.data.requested_delivery_date.split('T')[0]);
        }
      } else {
        setNegotiation(null);
      }
    } catch (err) {
      console.warn('Could not load negotiation record:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNegotiation();
  }, [quotationId]);

  // Scroll messages to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [negotiation?.messages]);

  // Submit counter-offer handler
  const onCounterSubmit = async (formData) => {
    setSubmitting(true);
    try {
      const payload = {
        counter_discount_percentage: formData.counter_discount_percentage ? Number(formData.counter_discount_percentage) : null,
        requested_delivery_date: formData.requested_delivery_date || null,
        message: formData.message || 'Customer submitted revised commercial terms for review.',
      };

      const res = await negotiationApi.submitCounterOffer(quotationId, payload);
      setNegotiation(res.data);
      setShowCounterForm(false);
      resetCounter();
      if (onQuotationUpdated) onQuotationUpdated();
      toast.success('Counter-offer submitted successfully to your sales representative!');
    } catch (err) {
      toast.error(err.customMessage || 'Failed to submit counter-offer');
    } finally {
      setSubmitting(false);
    }
  };

  // Send message handler
  const onChatSubmit = async (formData) => {
    const text = formData.message?.trim();
    if (!text) return;

    setSubmitting(true);
    try {
      const res = await negotiationApi.sendMessage(quotationId, {
        message: text,
        quotation_item_id: formData.quotation_item_id ? Number(formData.quotation_item_id) : null,
      });
      setNegotiation(res.data);
      resetChat({ message: '', quotation_item_id: '' });
      if (onQuotationUpdated) onQuotationUpdated();
    } catch (err) {
      toast.error(err.customMessage || 'Failed to send message');
    } finally {
      setSubmitting(false);
    }
  };

  // Accept quotation & convert to order
  const handleAcceptDeal = async () => {
    const ok = await confirm({
      title: 'Accept Quotation & Confirm Deal',
      message: 'Are you sure you want to accept this quotation and confirm the order?',
      confirmText: 'Accept Quotation',
      type: 'info',
    });
    if (!ok) return;

    setSubmitting(true);
    try {
      await negotiationApi.acceptQuotation(quotationId);
      await loadNegotiation();
      if (onQuotationUpdated) onQuotationUpdated();
      toast.success('Quotation successfully accepted and converted into a confirmed order!');
    } catch (err) {
      toast.error(err.customMessage || 'Failed to accept quotation');
    } finally {
      setSubmitting(false);
    }
  };

  // Pay quotation when in shipment stage via Razorpay Gateway
  const handlePayQuotation = async () => {
    initiateRazorpayPayment({
      quotationId,
      onSuccess: () => {
        if (onQuotationUpdated) onQuotationUpdated();
      },
    });
  };

  const isConfirmed = quotation?.status === 'confirmed' || negotiation?.status === 'accepted';
  const hasActiveCounter = negotiation?.counter_discount_percentage != null || negotiation?.requested_delivery_date != null;
  const messages = negotiation?.messages || [];
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const lastSenderType = lastMessage?.sender_type || (negotiation?.created_by_role === 'customer' ? 'customer' : null);

  // Turn-based negotiation rules
  const isAwaitingSalesResponse = isCustomer && lastSenderType === 'customer' && hasActiveCounter;
  const isAwaitingCustomerResponse = !isCustomer && lastSenderType === 'sales_rep' && hasActiveCounter;
  const isMyTurn = isCustomer ? (lastSenderType !== 'customer') : (lastSenderType === 'customer' || !hasActiveCounter);

  return (
    <div className="df-negotiation-panel">
      {/* Header Banner */}
      <div className="df-negotiation-panel__header">
        <div className="title-group">
          <h3>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="panel-icon"
              style={{ width: '20px', height: '20px', minWidth: '20px', flexShrink: 0 }}
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Deal Negotiation &amp; Messaging Hub
          </h3>
          <span className="subtitle">
            Directly communicate counter-discounts and delivery requirements with your sales team.
          </span>
        </div>

        {/* Global Action Status */}
        <div className="header-actions">
          {quotation?.status === 'payment' ? (
            <span
              className="status-badge"
              style={{
                background: 'rgba(99, 102, 241, 0.15)',
                color: '#818cf8',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                fontWeight: 600,
              }}
            >
              🎉 Payment Completed &amp; Settled
            </span>
          ) : quotation?.status === 'shipment' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span
                className="status-badge"
                style={{
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                }}
              >
                🚚 In Shipment
              </span>
              {isCustomer && (
                <button
                  type="button"
                  style={{
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.5rem 1.1rem',
                    borderRadius: '8px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
                    transition: 'all 0.2s ease',
                  }}
                  onClick={handlePayQuotation}
                  disabled={submitting || isPayingWithRazorpay}
                >
                  {isPayingWithRazorpay ? '⌛ Processing Payment...' : `💳 Pay Now (₹${Number(quotation?.grand_total || 0).toLocaleString('en-IN')})`}
                </button>
              )}
            </div>
          ) : isConfirmed ? (
            <span className="status-badge status-badge--confirmed">
              ✅ Quotation Accepted &amp; Confirmed
            </span>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {isAwaitingSalesResponse && (
                <span
                  style={{
                    fontSize: '0.8125rem',
                    color: '#fbbf24',
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                  }}
                >
                  ⏳ Waiting for Sales Team Reply
                </span>
              )}

              {isAwaitingCustomerResponse && (
                <span
                  style={{
                    fontSize: '0.8125rem',
                    color: '#38bdf8',
                    background: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    fontWeight: 600,
                  }}
                >
                  ⏳ Waiting for Customer Response
                </span>
              )}

              {isCustomer && (
                <button
                  type="button"
                  className="btn-accept-deal"
                  onClick={handleAcceptDeal}
                  disabled={submitting}
                >
                  Confirm &amp; Accept Deal
                </button>
              )}

              <button
                type="button"
                className="btn-counter-toggle"
                onClick={() => setShowCounterForm((prev) => !prev)}
              >
                {showCounterForm
                  ? 'Close Form'
                  : isAwaitingSalesResponse
                  ? '✏️ Edit My Counter Offer'
                  : isAwaitingCustomerResponse
                  ? '✏️ Edit Sent Counter Offer'
                  : isCustomer
                  ? '+ Propose Counter Offer'
                  : '+ Respond with Counter Offer'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Active Counter Offer Summary */}
      {hasActiveCounter && !showCounterForm && (
        <div className="df-negotiation-panel__counter-summary">
          <div className="counter-details">
            <span className="badge-active">
              {lastSenderType === 'customer' ? 'Customer Counter Proposal' : 'Sales Counter Proposal'}
            </span>
            {negotiation.counter_discount_percentage != null && (
              <span className="counter-val">
                Proposed Discount: <strong>{negotiation.counter_discount_percentage}%</strong>
              </span>
            )}
            {negotiation.requested_delivery_date && (
              <span className="counter-val">
                Target Delivery: <strong>{new Date(negotiation.requested_delivery_date).toLocaleDateString()}</strong>
              </span>
            )}
          </div>
          {!isConfirmed && (
            <button
              type="button"
              className="btn-edit-counter"
              onClick={() => setShowCounterForm(true)}
            >
              {isAwaitingSalesResponse || isAwaitingCustomerResponse ? 'Edit Proposal' : 'Revise / Respond'}
            </button>
          )}
        </div>
      )}

      {/* Counter Offer Form (React Hook Form) */}
      {showCounterForm && !isConfirmed && (
        <div className="df-negotiation-panel__counter-form">
          <h4>
            {isAwaitingSalesResponse || isAwaitingCustomerResponse
              ? 'Edit Current Proposal Terms'
              : 'Propose Revised Commercial Terms'}
          </h4>
          <form onSubmit={handleSubmitCounter(onCounterSubmit)}>
            <div className="inputs-grid">
              <div className="input-block">
                <label>Requested / Counter Discount Percentage (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  placeholder="e.g. 15%"
                  {...registerCounter('counter_discount_percentage', {
                    min: { value: 0, message: 'Discount cannot be negative' },
                    max: { value: 100, message: 'Discount cannot exceed 100%' },
                  })}
                />
                {counterErrors.counter_discount_percentage && (
                  <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>
                    {counterErrors.counter_discount_percentage.message}
                  </span>
                )}
              </div>

              <div className="input-block">
                <label>Preferred Delivery Date</label>
                <input
                  type="date"
                  {...registerCounter('requested_delivery_date')}
                />
              </div>

              <div className="input-block" style={{ gridColumn: '1 / -1' }}>
                <label>Reason / Note for Sales Representative</label>
                <input
                  type="text"
                  placeholder="e.g. Bulk order commitment across Q3 and Q4"
                  {...registerCounter('message')}
                />
              </div>
            </div>

            <div className="form-footer">
              <button
                type="submit"
                className="btn-submit"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Counter Offer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Messages Feed */}
      <div className="df-negotiation-panel__feed">
        {loading ? (
          <div className="empty-chat">Loading conversation...</div>
        ) : !negotiation?.messages || negotiation.messages.length === 0 ? (
          <div className="empty-chat">
            No negotiation messages yet. Start the conversation with your sales team below.
          </div>
        ) : (
          negotiation.messages.map((msg) => {
            const isClientMsg = msg.sender_type === 'customer';
            const isMe = (isCustomer && isClientMsg) || (!isCustomer && !isClientMsg);
            const isCounterOffer = msg.message_type === 'counter_offer' || msg.counter_discount_percentage != null || msg.requested_delivery_date != null;

            return (
              <div
                key={msg.id}
                className={`message-item ${isMe ? 'message-item--me' : 'message-item--other'} ${isClientMsg ? 'message-item--customer-sender' : 'message-item--sales-sender'} ${isCounterOffer ? 'message-item--counter' : ''}`}
              >
                <div className="message-meta">
                  <span className="sender-name">
                    {isMe ? 'You' : msg.sender_name || (isClientMsg ? 'Customer' : 'Sales Team')} ({isClientMsg ? 'Client' : 'Sales Team'})
                  </span>
                  <span className="timestamp">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {isCounterOffer ? (
                  <div className={`message-bubble message-bubble--counter ${isClientMsg ? 'counter-bubble--customer' : 'counter-bubble--sales'}`}>
                    <div className="counter-bubble-header">
                      <span className={`counter-type-badge ${isClientMsg ? 'counter-type-badge--customer' : 'counter-type-badge--sales'}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '13px', height: '13px' }}>
                          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                        {isClientMsg ? 'Customer Counter Proposal' : 'Sales Team Revised Offer'}
                      </span>
                    </div>

                    <div className="counter-bubble-pills">
                      {msg.counter_discount_percentage != null && (
                        <div className="counter-pill pill-discount">
                          <span className="pill-label">Proposed Discount</span>
                          <span className="pill-val">-{msg.counter_discount_percentage}%</span>
                        </div>
                      )}
                      {msg.requested_delivery_date && (
                        <div className="counter-pill pill-date">
                          <span className="pill-label">Target Delivery</span>
                          <span className="pill-val">
                            📅 {new Date(msg.requested_delivery_date).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    {msg.product_name_snapshot && (
                      <div className="item-tag">
                        🏷️ Line: {msg.product_name_snapshot}
                      </div>
                    )}

                    {msg.message && (
                      <div className="counter-bubble-note">
                        <span className="note-tag">Note:</span>
                        <span>{msg.message}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="message-bubble">
                    {msg.product_name_snapshot && (
                      <div className="item-tag">
                        🏷️ Line: {msg.product_name_snapshot}
                      </div>
                    )}
                    <div>{msg.message}</div>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Composer (React Hook Form) */}
      {!isConfirmed && (
        <form className="df-negotiation-panel__composer" onSubmit={handleSubmitChat(onChatSubmit)}>
          {quotationItems.length > 0 && (
            <div className="tag-row">
              <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Tag specific item (optional):</label>
              <select {...registerChat('quotation_item_id')}>
                <option value="">General Deal Discussion</option>
                {quotationItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    Line {item.line_number}: {item.product_name_snapshot}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="input-row">
            <textarea
              placeholder={
                isCustomer
                  ? 'Ask a question or discuss terms with your assigned sales representative...'
                  : 'Reply to client regarding quotation terms...'
              }
              {...registerChat('message', { required: true })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmitChat(onChatSubmit)();
                }
              }}
            />
            <button
              type="submit"
              className="btn-send"
              disabled={submitting}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </form>
      )}
    </div>
  );
});

export default NegotiationPanel;

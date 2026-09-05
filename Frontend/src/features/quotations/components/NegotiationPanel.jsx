import React, { useState, useEffect, useRef, memo } from 'react';
import { useForm } from 'react-hook-form';
import useAuth from '../../auth/hook/useAuth.js';
import negotiationApi from '../services/negotiation.api.js';
import '../styles/negotiation.scss';

export const NegotiationPanel = memo(({
  quotationId,
  quotation,
  quotationItems = [],
  onQuotationUpdated,
}) => {
  const { user } = useAuth();
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

  // 2. React Hook Form for Chat Composer
  const {
    register: registerChat,
    handleSubmit: handleSubmitChat,
    reset: resetChat,
    watch: watchChat,
  } = useForm({
    defaultValues: {
      message: '',
      quotation_item_id: '',
    },
  });

  const chatMessageVal = watchChat('message');

  // Fetch negotiation thread
  const loadNegotiation = async () => {
    if (!quotationId) return;
    try {
      const data = await negotiationApi.getNegotiation(quotationId);
      setNegotiation(data);
      if (data?.counter_discount_percentage != null) {
        setCounterValue('counter_discount_percentage', data.counter_discount_percentage);
      }
      if (data?.requested_delivery_date) {
        setCounterValue('requested_delivery_date', data.requested_delivery_date.split('T')[0]);
      }
    } catch (err) {
      console.warn('Failed to load negotiation thread:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNegotiation();
  }, [quotationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [negotiation?.messages]);

  // Submit counter-offer handler
  const onCounterSubmit = async (formData) => {
    if (!formData.counter_discount_percentage && !formData.requested_delivery_date) return;

    setSubmitting(true);
    try {
      const res = await negotiationApi.submitCounterOffer(quotationId, {
        counter_discount_percentage: formData.counter_discount_percentage ? Number(formData.counter_discount_percentage) : undefined,
        requested_delivery_date: formData.requested_delivery_date || undefined,
        message: formData.message || '',
      });
      setNegotiation(res.data);
      setShowCounterForm(false);
      resetCounter();
      if (onQuotationUpdated) onQuotationUpdated();
    } catch (err) {
      alert(err.customMessage || 'Failed to submit counter-offer');
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
      alert(err.customMessage || 'Failed to send message');
    } finally {
      setSubmitting(false);
    }
  };

  // Accept quotation & convert to order
  const handleAcceptDeal = async () => {
    if (!window.confirm('Are you sure you want to accept this quotation and confirm the order?')) {
      return;
    }

    setSubmitting(true);
    try {
      await negotiationApi.acceptQuotation(quotationId);
      await loadNegotiation();
      if (onQuotationUpdated) onQuotationUpdated();
      alert('Quotation successfully accepted and converted into a confirmed order!');
    } catch (err) {
      alert(err.customMessage || 'Failed to accept quotation');
    } finally {
      setSubmitting(false);
    }
  };

  const isConfirmed = quotation?.status === 'confirmed' || negotiation?.status === 'accepted';
  const hasActiveCounter = negotiation?.counter_discount_percentage != null;

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
          {isConfirmed ? (
            <span className="status-badge status-badge--confirmed">
              ✅ Quotation Accepted &amp; Confirmed
            </span>
          ) : (
            <>
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
                {showCounterForm ? 'Hide Counter Form' : hasActiveCounter ? 'Revise Counter Offer' : '+ Propose Counter Offer'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Active Counter Offer Summary */}
      {hasActiveCounter && !showCounterForm && (
        <div className="df-negotiation-panel__counter-summary">
          <div className="counter-details">
            <span className="badge-active">Active Counter Proposal</span>
            {negotiation.counter_discount_percentage != null && (
              <span className="counter-val">
                Requested Discount: <strong>{negotiation.counter_discount_percentage}%</strong>
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
              Modify Proposal
            </button>
          )}
        </div>
      )}

      {/* Counter Offer Form (React Hook Form) */}
      {showCounterForm && !isConfirmed && (
        <div className="df-negotiation-panel__counter-form">
          <h4>Propose Revised Commercial Terms</h4>
          <form onSubmit={handleSubmitCounter(onCounterSubmit)}>
            <div className="inputs-grid">
              <div className="input-block">
                <label>Requested Discount Percentage (%)</label>
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
            return (
              <div
                key={msg.id}
                className={`message-item ${isClientMsg ? 'message-item--customer' : 'message-item--sales_rep'}`}
              >
                <div className="message-meta">
                  <span className="sender-name">
                    {msg.sender_name} ({isClientMsg ? 'Client' : 'Sales Team'})
                  </span>
                  <span className="timestamp">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="message-bubble">
                  {msg.product_name_snapshot && (
                    <div className="item-tag">
                      🏷️ Line: {msg.product_name_snapshot}
                    </div>
                  )}
                  <div>{msg.message}</div>
                </div>
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
              disabled={submitting || !chatMessageVal?.trim()}
              title="Send Message"
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

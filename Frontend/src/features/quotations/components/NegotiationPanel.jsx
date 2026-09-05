import React, { useState, useEffect, useRef, memo } from 'react';
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

  // Counter offer form state
  const [showCounterForm, setShowCounterForm] = useState(false);
  const [counterDiscount, setCounterDiscount] = useState('');
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState('');
  const [counterNote, setCounterNote] = useState('');

  // Chat Composer state
  const [chatMessage, setChatMessage] = useState('');
  const [taggedItemId, setTaggedItemId] = useState('');

  const messagesEndRef = useRef(null);

  // Fetch negotiation thread
  const loadNegotiation = async () => {
    if (!quotationId) return;
    try {
      const data = await negotiationApi.getNegotiation(quotationId);
      setNegotiation(data);
      if (data?.counter_discount_percentage != null) {
        setCounterDiscount(data.counter_discount_percentage);
      }
      if (data?.requested_delivery_date) {
        setRequestedDeliveryDate(data.requested_delivery_date.split('T')[0]);
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

  // Submit counter-offer
  const handleSubmitCounter = async (e) => {
    e.preventDefault();
    if (!counterDiscount && !requestedDeliveryDate) return;

    setSubmitting(true);
    try {
      const res = await negotiationApi.submitCounterOffer(quotationId, {
        counter_discount_percentage: counterDiscount ? Number(counterDiscount) : undefined,
        requested_delivery_date: requestedDeliveryDate || undefined,
        message: counterNote,
      });
      setNegotiation(res.data);
      setShowCounterForm(false);
      setCounterNote('');
      if (onQuotationUpdated) onQuotationUpdated();
    } catch (err) {
      alert(err.customMessage || 'Failed to submit counter-offer');
    } finally {
      setSubmitting(false);
    }
  };

  // Send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    setSubmitting(true);
    try {
      const res = await negotiationApi.sendMessage(quotationId, {
        message: chatMessage.trim(),
        quotation_item_id: taggedItemId ? Number(taggedItemId) : null,
      });
      setNegotiation(res.data);
      setChatMessage('');
      setTaggedItemId('');
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

  const isConfirmed = quotation?.status === 'confirmed';
  const hasActiveCounter = negotiation?.counter_discount_percentage != null;

  return (
    <div className="df-negotiation-panel">
      {/* Header */}
      <div className="df-negotiation-panel__header">
        <div className="title-group">
          <h3>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Live Deal Negotiation Hub
          </h3>
          <span className={`status-pill status-pill--${negotiation?.status || 'open'}`}>
            {negotiation?.status || 'Open'}
          </span>
        </div>

        {/* Accept Deal Button */}
        {!isConfirmed && (
          <button
            type="button"
            className="accept-deal-btn"
            onClick={handleAcceptDeal}
            disabled={submitting}
            title="Accept current quotation terms and confirm order"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Accept & Confirm Order
          </button>
        )}
      </div>

      {/* Active Counter Banner */}
      {hasActiveCounter && (
        <div className="df-negotiation-panel__counter-banner">
          <div className="counter-details">
            <span>
              🎯 Requested Counter Discount: <strong>{negotiation.counter_discount_percentage}%</strong>
            </span>
            {negotiation.requested_delivery_date && (
              <span className="detail-badge">
                📅 Target Date: {new Date(negotiation.requested_delivery_date).toLocaleDateString()}
              </span>
            )}
          </div>

          {!isConfirmed && (
            <div className="counter-actions">
              <button
                type="button"
                className="btn-revise"
                onClick={() => setShowCounterForm((prev) => !prev)}
              >
                {showCounterForm ? 'Hide Form' : isCustomer ? 'Update Counter Offer' : 'Revise Terms'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Counter Offer Form */}
      {(!hasActiveCounter || showCounterForm) && !isConfirmed && (
        <div className="df-negotiation-panel__counter-form">
          <div className="form-title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            {isCustomer ? 'Propose Counter Terms to Sales Team' : 'Adjust Proposed Counter Terms'}
          </div>

          <form onSubmit={handleSubmitCounter}>
            <div className="inputs-grid">
              <div className="input-block">
                <label>Requested Discount Percentage (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  placeholder="e.g. 15%"
                  value={counterDiscount}
                  onChange={(e) => setCounterDiscount(e.target.value)}
                  required
                />
              </div>

              <div className="input-block">
                <label>Preferred Delivery Date</label>
                <input
                  type="date"
                  value={requestedDeliveryDate}
                  onChange={(e) => setRequestedDeliveryDate(e.target.value)}
                />
              </div>

              <div className="input-block" style={{ gridColumn: '1 / -1' }}>
                <label>Reason / Note for Sales Representative</label>
                <input
                  type="text"
                  placeholder="e.g. Bulk order commitment across Q3 and Q4"
                  value={counterNote}
                  onChange={(e) => setCounterNote(e.target.value)}
                />
              </div>
            </div>

            <div className="form-footer">
              {hasActiveCounter && (
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowCounterForm(false)}
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="btn-submit"
                disabled={submitting || !counterDiscount}
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

      {/* Chat Composer */}
      {!isConfirmed && (
        <form className="df-negotiation-panel__composer" onSubmit={handleSendMessage}>
          {quotationItems.length > 0 && (
            <div className="tag-row">
              <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Tag specific item (optional):</label>
              <select
                value={taggedItemId}
                onChange={(e) => setTaggedItemId(e.target.value)}
              >
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
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
            <button
              type="submit"
              className="btn-send"
              disabled={submitting || !chatMessage.trim()}
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

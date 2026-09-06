import React from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import useDiscountRules from '../hooks/useDiscountRules.js';
import '../styles/discountRules.scss';

export const DiscountRulesSetup = () => {
  const {
    customerTiers,
    categoryCeilings,
    approvalRules,
    isLoading,
    isSaving,
    error,
    successMsg,
    updateTierDiscount,
    updateCategoryDiscount,
    updateApprovalRule,
    saveConfiguration,
  } = useDiscountRules();

  const { handleSubmit } = useForm();

  const onSubmit = async () => {
    await saveConfiguration();
  };

  // Helper to format approval level label matching Wireframe #18
  const getApprovalChainDisplay = (rule) => {
    if (rule.requires_finance && rule.requires_sales_manager) {
      return {
        label: 'Sales manager then finance',
        modifier: 'df-discount-rules__chain-badge--finance',
      };
    }
    if (rule.requires_sales_manager) {
      return {
        label: 'Sales manager',
        modifier: 'df-discount-rules__chain-badge--manager',
      };
    }
    return {
      label: 'No approval needed',
      modifier: 'df-discount-rules__chain-badge--none',
    };
  };

  // Helper for discount / risk condition title matching Wireframe #18
  const getConditionTitle = (rule) => {
    if (!rule.requires_sales_manager && !rule.requires_finance) {
      return {
        title: 'Within tier/Category limit',
        desc: 'Risk score 0.00 — standard tier limits',
      };
    }
    if (rule.requires_sales_manager && !rule.requires_finance) {
      return {
        title: 'Over Limit, blended risk medium',
        desc: `Risk score ${rule.min_risk_score}% - ${rule.max_risk_score}%`,
      };
    }
    return {
      title: 'Over limit, blended high risk',
      desc: `Risk score > ${rule.min_risk_score}% or high risk categories`,
    };
  };

  if (isLoading) {
    return (
      <div className="df-discount-rules">
        <div className="df-discount-rules__container">
          <div className="df-discount-rules__loading">
            Loading discount tiers and approval configuration...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="df-discount-rules">
      <div className="df-discount-rules__container">
        {/* Header with Top-Right Actions */}
        <header className="df-discount-rules__header" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Discount tiers and approval chains</h1>
            <p>Configure customer tier discount limits, category ceilings, and governance approval rules.</p>
          </div>

          <div className="df-discount-rules__header-right">
            <Link
              to="/products"
              className="df-btn-secondary"
            >
              ← Back to Products
            </Link>

            <button
              type="button"
              className="df-btn-primary"
              onClick={handleSubmit(onSubmit)}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </header>

        {/* Alerts */}
        <div className="df-discount-rules__alerts">
          {error && <div className="df-discount-rules__alert-error">{error}</div>}
          {successMsg && <div className="df-discount-rules__alert-success">{successMsg}</div>}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Top 2-Column Grid: Customer Tiers & Category Ceilings */}
          <div className="df-discount-rules__top-grid">
            {/* 1. Customer Tiers Ceilings Card matching Wireframe #18 */}
            <div className="df-discount-rules__panel">
              <span className="df-discount-rules__panel-label">Tier Discount Ceilings</span>
              <div className="df-discount-rules__table-container">
                <table className="df-discount-rules__table">
                  <thead>
                    <tr>
                      <th>Tier</th>
                      <th>Max Discount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerTiers.length === 0 ? (
                      <tr>
                        <td colSpan="2">No customer tiers found.</td>
                      </tr>
                    ) : (
                      customerTiers.map((tier, idx) => (
                        <tr key={tier.id}>
                          <td>
                            <span className="df-discount-rules__item-title">{tier.name}</span>
                          </td>
                          <td>
                            <div className="df-discount-rules__input-group">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={tier.max_discount_percentage}
                                onChange={(e) => updateTierDiscount(idx, e.target.value)}
                                aria-label={`${tier.name} max discount`}
                              />
                              <span>%</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Category Discount Ceilings Card matching Wireframe #18 */}
            <div className="df-discount-rules__panel">
              <span className="df-discount-rules__panel-label">Category Discount Ceilings</span>
              <div className="df-discount-rules__table-container">
                <table className="df-discount-rules__table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Max Discount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryCeilings.length === 0 ? (
                      <tr>
                        <td colSpan="2">No product categories found.</td>
                      </tr>
                    ) : (
                      categoryCeilings.map((cat, idx) => (
                        <tr key={cat.category_id}>
                          <td>
                            <span className="df-discount-rules__item-title">{cat.category_name}</span>
                          </td>
                          <td>
                            <div className="df-discount-rules__input-group">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={cat.max_discount_percentage}
                                onChange={(e) => updateCategoryDiscount(idx, e.target.value)}
                                aria-label={`${cat.category_name} max discount`}
                              />
                              <span>%</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Save Configuration Button matching Wireframe #18 */}
          <div className="df-discount-rules__actions">
            <button
              type="submit"
              className="df-save-btn"
              disabled={isSaving}
            >
              {isSaving ? 'Saving configuration...' : 'Save configuration'}
            </button>
          </div>

          {/* Footer Notice Banner matching Wireframe #18 */}
          
        </form>
      </div>
    </div>
  );
};

export default DiscountRulesSetup;

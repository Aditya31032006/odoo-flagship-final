import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchDiscountConfig,
  saveDiscountConfig,
  setCustomerTiers,
  setCategoryCeilings,
  setApprovalRules,
  clearMessages,
} from '../discountRules.slice.js';

export const useDiscountRules = (autoFetch = true) => {
  const dispatch = useDispatch();
  const {
    customerTiers,
    categoryCeilings,
    approvalRules,
    isLoading,
    isInitialized,
    isSaving,
    error,
    successMsg,
  } = useSelector((state) => state.discountRules);

  const loadConfig = useCallback((force = false) => {
    if (force || !isInitialized) {
      dispatch(fetchDiscountConfig());
    }
  }, [dispatch, isInitialized]);

  useEffect(() => {
    if (autoFetch && !isInitialized) {
      loadConfig();
    }
  }, [autoFetch, isInitialized, loadConfig]);

  const updateTierDiscount = (index, value) => {
    const updated = [...customerTiers];
    updated[index] = {
      ...updated[index],
      max_discount_percentage: value,
    };
    dispatch(setCustomerTiers(updated));
  };

  const updateCategoryDiscount = (index, value) => {
    const updated = [...categoryCeilings];
    updated[index] = {
      ...updated[index],
      max_discount_percentage: value,
    };
    dispatch(setCategoryCeilings(updated));
  };

  const updateApprovalRule = (index, field, value) => {
    const updated = [...approvalRules];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    dispatch(setApprovalRules(updated));
  };

  const saveConfiguration = async () => {
    const payload = {
      customer_tiers: customerTiers,
      category_ceilings: categoryCeilings,
      approval_rules: approvalRules,
    };
    const result = await dispatch(saveDiscountConfig(payload));
    return result;
  };

  return {
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
    reloadConfig: loadConfig,
    clearMessages: () => dispatch(clearMessages()),
  };
};

export default useDiscountRules;

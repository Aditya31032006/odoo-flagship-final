import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchFulfillmentList,
  fetchFulfillmentMeta,
  fetchFulfillmentDetail,
  acceptSuggestedSplit,
  saveManualOverride,
  createWarehouseStock,
  updateWarehouseStock,
  deleteWarehouseStock,
  createFulfillmentOrder,
  updateFulfillmentOrder,
  deleteFulfillmentOrder,
  clearFulfillmentMessages,
  clearFulfillmentDetail,
} from '../fulfillment.slice.js';

export const useFulfillment = (orderId = null) => {
  const dispatch = useDispatch();
  const {
    stock,
    orders,
    meta,
    currentDetail,
    isLoadingList,
    isLoadingDetail,
    isMutating,
    isSavingSplit,
    error,
    successMsg,
  } = useSelector((state) => state.fulfillment);

  useEffect(() => {
    if (orderId) {
      dispatch(fetchFulfillmentDetail(orderId));
    } else {
      dispatch(fetchFulfillmentList());
      dispatch(fetchFulfillmentMeta());
    }

    return () => {
      dispatch(clearFulfillmentMessages());
    };
  }, [dispatch, orderId]);

  const refreshList = useCallback(() => {
    dispatch(fetchFulfillmentList());
    dispatch(fetchFulfillmentMeta());
  }, [dispatch]);

  const refreshDetail = useCallback(() => {
    if (orderId) {
      dispatch(fetchFulfillmentDetail(orderId));
    }
  }, [dispatch, orderId]);

  const handleAcceptSplit = useCallback(async () => {
    if (!orderId) return;
    return await dispatch(acceptSuggestedSplit(orderId)).unwrap();
  }, [dispatch, orderId]);

  const handleSaveManualOverride = useCallback(
    async (splits, backorderQty = 0) => {
      if (!orderId) return;
      return await dispatch(
        saveManualOverride({ orderId, splits, backorderQty })
      ).unwrap();
    },
    [dispatch, orderId]
  );

  // Stock CRUD
  const handleCreateStock = useCallback(
    async (payload) => {
      return await dispatch(createWarehouseStock(payload)).unwrap();
    },
    [dispatch]
  );

  const handleUpdateStock = useCallback(
    async (stockId, payload) => {
      return await dispatch(updateWarehouseStock({ stockId, payload })).unwrap();
    },
    [dispatch]
  );

  const handleDeleteStock = useCallback(
    async (stockId) => {
      return await dispatch(deleteWarehouseStock(stockId)).unwrap();
    },
    [dispatch]
  );

  // Orders CRUD
  const handleCreateOrder = useCallback(
    async (payload) => {
      return await dispatch(createFulfillmentOrder(payload)).unwrap();
    },
    [dispatch]
  );

  const handleUpdateOrder = useCallback(
    async (orderIdToUpdate, payload) => {
      return await dispatch(
        updateFulfillmentOrder({ orderId: orderIdToUpdate, payload })
      ).unwrap();
    },
    [dispatch]
  );

  const handleDeleteOrder = useCallback(
    async (orderIdToDelete) => {
      return await dispatch(deleteFulfillmentOrder(orderIdToDelete)).unwrap();
    },
    [dispatch]
  );

  return {
    stock,
    orders,
    meta,
    currentDetail,
    isLoadingList,
    isLoadingDetail,
    isMutating,
    isSavingSplit,
    error,
    successMsg,
    refreshList,
    refreshDetail,
    handleAcceptSplit,
    handleSaveManualOverride,
    handleCreateStock,
    handleUpdateStock,
    handleDeleteStock,
    handleCreateOrder,
    handleUpdateOrder,
    handleDeleteOrder,
    clearMessages: () => dispatch(clearFulfillmentMessages()),
    clearDetail: () => dispatch(clearFulfillmentDetail()),
  };
};

export default useFulfillment;

import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProductSummary, fetchAllProducts } from '../products.slice.js';

export const useProducts = (autoFetch = true) => {
  const dispatch = useDispatch();
  const { summary, productsList, isLoading, error } = useSelector((state) => state.products);

  const loadProducts = useCallback(() => {
    dispatch(fetchProductSummary());
    dispatch(fetchAllProducts());
  }, [dispatch]);

  useEffect(() => {
    if (autoFetch) {
      loadProducts();
    }
  }, [autoFetch, loadProducts]);

  return {
    summary,
    productsList,
    isLoading,
    error,
    refresh: loadProducts,
  };
};

export default useProducts;

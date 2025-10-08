'use client';

import { useState, useCallback } from 'react';

interface LoadingState {
  isLoading: boolean;
  isRefreshing: boolean;
  progress: number;
  error: string | null;
}

interface UseLoadingStateReturn {
  // State
  loadingState: LoadingState;
  
  // Actions
  setLoading: (loading: boolean) => void;
  setRefreshing: (refreshing: boolean) => void;
  setProgress: (progress: number) => void;
  setError: (error: string | null) => void;
  resetLoading: () => void;
  
  // Derived states
  isAnyLoading: boolean;
  hasError: boolean;
}

export function useLoadingState(): UseLoadingStateReturn {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    isRefreshing: false,
    progress: 0,
    error: null
  });

  const setLoading = useCallback((loading: boolean) => {
    setLoadingState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setRefreshing = useCallback((refreshing: boolean) => {
    setLoadingState(prev => ({ ...prev, isRefreshing: refreshing }));
  }, []);

  const setProgress = useCallback((progress: number) => {
    setLoadingState(prev => ({ ...prev, progress }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setLoadingState(prev => ({ ...prev, error }));
  }, []);

  const resetLoading = useCallback(() => {
    setLoadingState({
      isLoading: false,
      isRefreshing: false,
      progress: 0,
      error: null
    });
  }, []);

  const isAnyLoading = loadingState.isLoading || loadingState.isRefreshing;
  const hasError = loadingState.error !== null;

  return {
    loadingState,
    setLoading,
    setRefreshing,
    setProgress,
    setError,
    resetLoading,
    isAnyLoading,
    hasError
  };
}
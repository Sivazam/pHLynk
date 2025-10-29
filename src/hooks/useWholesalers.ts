'use client'

import { useState, useEffect, useCallback } from 'react'

interface Wholesaler {
  id: string
  name: string
  email: string
}

interface UseWholesalersOptions {
  retailerId: string
  retailerPhone?: string
  autoFetch?: boolean
}

export function useWholesalers({ 
  retailerId, 
  retailerPhone, 
  autoFetch = true
}: UseWholesalersOptions) {
  const [wholesalers, setWholesalers] = useState<Wholesaler[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetched, setLastFetched] = useState<Date | null>(null)

  const fetchWholesalers = useCallback(async (showLoading = true) => {
    if (!retailerId && !retailerPhone) {
      console.log('❌ No retailer ID or phone provided for fetching wholesalers')
      return
    }

    if (showLoading) {
      setLoading(true)
    }
    setError(null)

    try {
      console.log('🔄 Fetching wholesalers for retailer:', { retailerId, retailerPhone })
      
      // Add phone parameter to the API call
      const phoneParam = retailerPhone ? `?phone=${retailerPhone}` : ''
      const response = await fetch(`/api/reports/wholesalers${phoneParam}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.data && data.data.wholesalers) {
        const wholesalersList = data.data.wholesalers || []
        setWholesalers(wholesalersList)
        setLastFetched(new Date())
        
        console.log('✅ Wholesalers fetched successfully:', {
          count: wholesalersList.length,
          names: wholesalersList.map(w => w.name)
        })
        
        if (wholesalersList.length === 0) {
          console.log('⚠️ No wholesalers found for this retailer')
        }
      } else {
        throw new Error('Invalid response format from server')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch wholesalers'
      setError(errorMessage)
      console.error('❌ Error fetching wholesalers:', error)
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }, [retailerId, retailerPhone])

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch && (retailerId || retailerPhone)) {
      fetchWholesalers()
    }
  }, [autoFetch, retailerId, retailerPhone, fetchWholesalers])

  // Refresh function
  const refresh = useCallback(() => {
    return fetchWholesalers()
  }, [fetchWholesalers])

  // Background refresh (doesn't show loading) - for manual refresh only
  const backgroundRefresh = useCallback(() => {
    return fetchWholesalers(false)
  }, [fetchWholesalers])

  return {
    wholesalers,
    loading,
    error,
    lastFetched,
    refresh,
    backgroundRefresh,
    isEmpty: wholesalers.length === 0
  }
}
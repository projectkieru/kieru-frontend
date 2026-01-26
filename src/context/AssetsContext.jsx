import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../utils/apiClient';

// Default fallback values (used while loading or on error)
const DEFAULT_CHAR_LIMITS = {
   ANONYMOUS: 500,
   EXPLORER: 750,
   CHALLENGER: 1000,
   DOMINATOR: 1500,
   UNDEFINED: 500
};

const DEFAULT_FILE_SIZE_LIMITS = {
   ANONYMOUS: 1 * 1024 * 1024,
   EXPLORER: 1.5 * 1024 * 1024,
   CHALLENGER: 2 * 1024 * 1024,
   DOMINATOR: 5 * 1024 * 1024,
   UNDEFINED: 1 * 1024 * 1024
};

const AssetsContext = createContext(null);

export function AssetsProvider({ children }) {
   const [subscriptionPlans, setSubscriptionPlans] = useState([]);
   const [charLimits, setCharLimits] = useState(DEFAULT_CHAR_LIMITS);
   const [fileSizeLimits, setFileSizeLimits] = useState(DEFAULT_FILE_SIZE_LIMITS);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);

   useEffect(() => {
      fetchAssets();
   }, []);

   const fetchAssets = async () => {
      setLoading(true);
      setError(null);

      try {
         // Fetch all three in parallel
         const [subsResponse, charResponse, fileResponse] = await Promise.all([
            apiRequest({
               url: '/api/assets/subscriptions',
               method: 'GET',
               requestId: 'FETCH_SUBSCRIPTIONS'
            }),
            apiRequest({
               url: '/api/assets/charLimits',
               method: 'GET',
               requestId: 'FETCH_CHAR_LIMITS'
            }),
            apiRequest({
               url: '/api/assets/fileSizeLimits',
               method: 'GET',
               requestId: 'FETCH_FILE_SIZE_LIMITS'
            })
         ]);

         // Set subscription plans
         if (subsResponse?.subscriptionPlans) {
            setSubscriptionPlans(subsResponse.subscriptionPlans);
         }

         // Set character limits
         if (charResponse?.charLimits) {
            setCharLimits(prev => ({ ...prev, ...charResponse.charLimits }));
         }

         // Set file size limits
         if (fileResponse?.fileLimit) {
            setFileSizeLimits(prev => ({ ...prev, ...fileResponse.fileLimit }));
         }
      } catch (err) {
         console.error('Failed to fetch assets:', err);
         setError('Failed to load subscription limits');
         // Keep default values on error
      } finally {
         setLoading(false);
      }
   };

   const value = {
      subscriptionPlans,
      charLimits,
      fileSizeLimits,
      loading,
      error,
      refetch: fetchAssets
   };

   return <AssetsContext.Provider value={value}>{children}</AssetsContext.Provider>;
}

export function useAssets() {
   const context = useContext(AssetsContext);
   if (!context) {
      throw new Error('useAssets must be used within an AssetsProvider');
   }
   return context;
}

// Helper function to get char limit for a plan
export function getCharLimit(charLimits, plan) {
   return charLimits[plan] || charLimits.UNDEFINED || 500;
}

// Helper function to get file size limit for a plan
export function getFileSizeLimit(fileSizeLimits, plan) {
   return fileSizeLimits[plan] || fileSizeLimits.UNDEFINED || 1 * 1024 * 1024;
}

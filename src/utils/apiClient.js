// Tracks all in-flight requests by logical key
const inFlightRequests = [];

/**
 * Builds a unique identifier for a logical API request
 */
function buildRequestKey(url, params, requestId) {
   return `${requestId}::${url}::${params}`;
}

/**
 * Safely serializes query parameters
 */
export function serializeQueryParams(params) {
   const searchParams = new URLSearchParams();

   Object.entries(params || {}).forEach(([key, value]) => {
      if (value === null || value === undefined) return;

      if (typeof value === 'string') {
         const trimmed = value.trim();
         if (trimmed) searchParams.append(key, trimmed);
         return;
      }

      if (typeof value === 'number' && Number.isFinite(value)) {
         searchParams.append(key, String(value));
         return;
      }

      if (typeof value === 'boolean') {
         searchParams.append(key, String(value));
         return;
      }

      try {
         const serialized = JSON.stringify(value);
         if (serialized !== '{}' && serialized !== '[]') {
            searchParams.append(key, serialized);
         }
      } catch {
         console.warn('Failed to serialize param:', key);
      }
   });

   return searchParams.toString();
}

/**
 * Standard API request handler
 * @param {Object} options
 * @param {boolean} [options.silentOnDuplicate=false] - If true, silently abort and replace duplicate requests without confirmation
 */
export async function apiRequest({ url, method = 'GET', params = null, headers = {}, requestId, onSuccess, returnResponse = true, silentOnDuplicate = false }) {
   const serializedParams = serializeQueryParams(params);
   const requestKey = buildRequestKey(url, serializedParams, requestId);

   const existing = inFlightRequests.find(r => r.key === requestKey);

   if (existing) {
      // If silentOnDuplicate is true, just abort the existing request without asking
      // This is useful for React StrictMode double-renders and page refreshes
      if (silentOnDuplicate) {
         existing.controller.abort();
         inFlightRequests.splice(inFlightRequests.indexOf(existing), 1);
      } else {
         // Use toast confirmation instead of window.confirm
         // Wrapped in try-catch to prevent toast errors from breaking API functionality
         let proceed = true;
         try {
            const { toast } = await import('./toast.js');
            proceed = await toast.confirm('A similar request is already running. Start a new one instead?', {
               confirmOkText: 'Start New',
               confirmRejectText: 'Cancel',
               color: 'warning'
            });
         } catch (toastError) {
            console.warn('Toast confirmation failed, proceeding with request:', toastError);
            proceed = true; // Fallback: proceed if toast fails
         }

         if (!proceed) return;

         existing.controller.abort();
         inFlightRequests.splice(inFlightRequests.indexOf(existing), 1);
      }
   }

   const controller = new AbortController();
   inFlightRequests.push({ key: requestKey, controller });

   try {
      let finalURL = url;
      const options = {
         method,
         signal: controller.signal,
         headers: {
            'Content-Type': 'application/json',
            ...headers
         }
      };

      // Auto-attach Auth Token if present
      const token = localStorage.getItem('auth_token');
      if (token) {
         options.headers['Authorization'] = `Bearer ${token}`;
      }

      if (method === 'POST') {
         options.body = JSON.stringify(params);
      } else if (serializedParams) {
         finalURL += `?${serializedParams}`;
      }

      const response = await fetch(finalURL, options);

      // Check for 403/401 specifically if needed, but generic handling is okay here
      if (!response.ok) {
         const errorBody = await response.text();
         throw new Error(`API Error ${response.status}: ${errorBody}`);
      }

      const data = await response.json();

      if (returnResponse) return data;
      if (onSuccess) onSuccess(data);
   } catch (err) {
      if (err.name !== 'AbortError') {
         console.error('API error:', err);
         throw err; // Re-throw to let caller handle it (e.g. show UI error)
      }
   } finally {
      const index = inFlightRequests.findIndex(r => r.key === requestKey);
      if (index > -1) inFlightRequests.splice(index, 1);
   }
}

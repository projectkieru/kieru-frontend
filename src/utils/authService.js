import { apiRequest } from './apiClient';

export const AuthService = {
   backendLogin: async firebaseToken => {
      return await apiRequest({
         url: '/api/auth/login',
         method: 'POST',
         params: {
            firebaseToken
         },
         requestId: 'BACKEND_LOGIN'
      });
   },

   logout: async () => {
      return await apiRequest({
         url: '/api/auth/logout',
         method: 'POST',
         requestId: 'BACKEND_LOGOUT',
         auth: true
      });
   }
};

import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoadingFallback from './components/ui/LoadingFallback';

//Modules
const LoginPage = lazy(() => import('./pages/auth/LoginPage.jsx'));

// Lazy load the protected app layout (dashboard)
// Use a named export handling if necessary, or just default
const ProtectedAppLayout = lazy(() => import('./pages/auth/ProtectedAppLayout.jsx'));
const ViewSecretPage = lazy(() => import('./pages/view/ViewSecretPage.jsx'));

function PublicRoute({ children }) {
   const { user } = useAuth();
   if (user) return <Navigate to="/" replace />;
   return children;
}

function ProtectedRoute({ children }) {
   const { user } = useAuth();
   if (!user) return <Navigate to="/login" replace />;
   return children;
}

function AppRoutes() {
   const { user, loading } = useAuth();

   if (loading) {
      return (
         <div className="h-screen w-full bg-black flex items-center justify-center">
            <LoadingFallback />
         </div>
      );
   }

   return (
      <Routes>
         <Route
            path="/login"
            element={
               <PublicRoute>
                  <Suspense
                     fallback={
                        <div className="h-screen w-full bg-black flex items-center justify-center">
                           <LoadingFallback />
                        </div>
                     }>
                     <LoginPage />
                  </Suspense>
               </PublicRoute>
            }
         />

         {/* Public View Secret Route (Standalone) - Only if NOT logged in */}
         {/* If logged in, this route is skipped, falling through to matching /* (ProtectedAppLayout) */}
         {!user && (
            <Route
               path="/view/:id"
               element={
                  <Suspense
                     fallback={
                        <div className="h-screen w-full bg-black flex items-center justify-center">
                           <LoadingFallback />
                        </div>
                     }>
                     <ViewSecretPage />
                  </Suspense>
               }
            />
         )}

         <Route
            path="/*"
            element={
               <ProtectedRoute>
                  <Suspense
                     fallback={
                        <div className="h-screen w-full bg-black flex items-center justify-center">
                           <LoadingFallback />
                        </div>
                     }>
                     <ProtectedAppLayout />
                  </Suspense>
               </ProtectedRoute>
            }
         />
      </Routes>
   );
}

export default function App() {
   return (
      <AuthProvider>
         <BrowserRouter>
            <AppRoutes />
         </BrowserRouter>
      </AuthProvider>
   );
}

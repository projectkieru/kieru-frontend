import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';

import Sidebar from '../../components/layout/Sidebar';
import MobileNav from '../../components/layout/MobileNav';
import LoadingFallback from '../../components/ui/LoadingFallback';
import { AssetsProvider } from '../../context/AssetsContext';

// Lazy loading pages
const HomePage = lazy(() => import('../dashboard/HomePage'));
const CreateSecretPage = lazy(() => import('../creation/CreateSecretPage'));
const MySecretsPage = lazy(() => import('../dashboard/MySecretsPage'));
const ViewSecretPage = lazy(() => import('../view/ViewSecretPage'));
const AnalyticsPage = lazy(() => import('../dashboard/AnalyticsPage'));
const ProfilePage = lazy(() => import('../dashboard/ProfilePage'));

export default function ProtectedAppLayout() {
   const location = useLocation();
   const navigate = useNavigate();

   const getActiveTab = path => {
      if (path.includes('create')) return 'create';
      if (path.includes('secrets')) return 'secrets';
      if (path.includes('analytics')) return 'analytics';
      if (path.includes('profile')) return 'profile';
      if (path.includes('view')) return 'view';
      return 'home';
   };

   const activeTab = getActiveTab(location.pathname);

   const handleTabChange = tabName => {
      if (tabName === 'home') navigate('/');
      else navigate(`/${tabName}`);
   };

   return (
      <AssetsProvider>
         <div className="h-screen bg-black text-slate-900 font-sans selection:bg-blue-100 flex overflow-hidden p-4 md:p-8 gap-8">
            {/* Sidebar Navigation 
                  We pass handleTabChange so clicking a button changes the URL */}
            <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} />

            {/* MAIN SCREEN: Pure White Floating Card */}
            <main className="flex-1 bg-white md:rounded-[1rem] relative overflow-hidden flex flex-col">
               {/* Screen Content: Renders different pages based on URL */}
               <div className="flex-1 h-full overflow-y-auto flex flex-col relative z-10 custom-scroll pt-20 pb-24 md:pt-0 md:pb-0">
                  <Suspense fallback={<LoadingFallback />}>
                     <Routes>
                        <Route path="/" element={<HomePage setActiveTab={handleTabChange} />} />
                        <Route path="create" element={<CreateSecretPage />} />
                        <Route path="secrets" element={<MySecretsPage />} />
                        <Route path="analytics" element={<AnalyticsPage />} />
                        <Route path="profile" element={<ProfilePage />} />
                        <Route path="view" element={<ViewSecretPage />} />
                        <Route path="view/:id" element={<ViewSecretPage />} />
                        {/* Fallback for unknown routes inside the app */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                     </Routes>
                  </Suspense>
               </div>
            </main>

            {/* Mobile Navigation - Now sits OUTSIDE the white card on the black background */}
            <MobileNav activeTab={activeTab} setActiveTab={handleTabChange} />
         </div>
      </AssetsProvider>
   );
}

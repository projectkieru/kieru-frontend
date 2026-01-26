import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { APP_LOGO_IMAGE, NAV_TABS } from '../../config/navigationConfig';

export default function Sidebar({ activeTab, setActiveTab }) {
   const { userProfile } = useAuth();

   // Derived State
   const displayName = userProfile?.displayName || userProfile?.email?.split('@')[0] || 'User';
   const plan = userProfile?.subscription || 'Free Plan';
   const photoUrl = userProfile?.photoUrl;

   return (
      <aside className="hidden md:flex flex-col w-20 xl:w-64 flex-shrink-0 text-white pt-2">
         {/* Brand */}
         <div className="xl:px-4 mb-10 flex items-center">
            <img src={APP_LOGO_IMAGE} alt="Kieru" className="h-12 xl:h-14 w-auto object-contain rounded-xl" />
         </div>

         {/* Navigation */}
         <nav className="flex-1 space-y-3">
            {NAV_TABS.map(tab => (
               <NavItem key={tab.id} icon={<tab.icon size={26} strokeWidth={2} />} label={tab.label} isActive={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
            ))}
         </nav>

         {/* User Profile Bubble */}
         <div className="mt-auto">
            <button
               onClick={() => setActiveTab('profile')}
               className={`flex items-center gap-3 w-full p-2 rounded-full hover:bg-white/10 transition-colors group ${activeTab === 'profile' ? 'bg-white/10' : ''}`}>
               {photoUrl ? (
                  <img src={photoUrl} alt="User" className="w-10 h-10 rounded-full border-2 border-black group-hover:border-white/20 transition-all object-cover" />
               ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 border-2 border-black group-hover:border-white/20 transition-all flex items-center justify-center font-bold text-sm">
                     {displayName[0]?.toUpperCase()}
                  </div>
               )}
               <div className="hidden xl:block text-left overflow-hidden">
                  <p className="font-bold text-sm text-white truncate">{displayName}</p>
                  <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">{plan}</p>
               </div>
            </button>
         </div>
      </aside>
   );
}

// Helper Component (Internal to this file)
function NavItem({ icon, label, isActive, onClick }) {
   return (
      <button
         onClick={onClick}
         className={`group flex items-center justify-center xl:justify-start gap-5 w-full p-4 rounded-2xl transition-all duration-300 ${
            isActive ? 'bg-white text-black font-bold shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'text-slate-400 hover:text-white hover:bg-white/5'
         }`}>
         <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>{icon}</div>
         <span className="hidden xl:block text-lg tracking-tight">{label}</span>
      </button>
   );
}

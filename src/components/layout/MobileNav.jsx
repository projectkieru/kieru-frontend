import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { APP_LOGO_IMAGE, NAV_TABS } from '../../config/navigationConfig';

export default function MobileNav({ activeTab, setActiveTab }) {
   const { userProfile } = useAuth();
   const photoUrl = userProfile?.photoUrl;
   const displayName = userProfile?.displayName || 'User';

   return (
      <>
         {/* Mobile Header - Logo and App Name */}
         <div className="md:hidden absolute top-0 left-0 right-0 bg-black p-4 flex items-center justify-between z-50">
            <div className="flex items-center">
               <img src={APP_LOGO_IMAGE} alt="Kieru" className="h-10 w-auto object-contain rounded-lg" />
            </div>

            {/* User Profile - Top Right */}
            <button
               onClick={() => setActiveTab('profile')}
               className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center overflow-hidden hover:bg-white/20 transition-all">
               {photoUrl ? (
                  <img src={photoUrl} alt="User" className="w-full h-full object-cover" />
               ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center font-bold text-white text-xs">{displayName[0]?.toUpperCase()}</div>
               )}
            </button>
         </div>

         {/* Bottom Navigation Bar */}
         <div className="md:hidden absolute bottom-0 left-0 right-0 bg-black text-white p-3 flex justify-around items-center z-50">
            {NAV_TABS.map(tab => (
               <NavButton key={tab.id} icon={<tab.icon size={24} strokeWidth={2} />} label={tab.label} isActive={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />
            ))}
         </div>
      </>
   );
}

// Helper Button - Styled to match Sidebar
function NavButton({ icon, label, isActive, onClick }) {
   return (
      <button
         onClick={onClick}
         className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-300 ${
            isActive ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'text-slate-400 hover:text-white hover:bg-white/5'
         }`}>
         <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}>{icon}</div>
         <span className="text-xs font-bold">{label}</span>
      </button>
   );
}

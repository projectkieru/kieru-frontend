import React from 'react';
import { User, Mail, Shield, LogOut, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { signOut } from 'firebase/auth';
import { auth } from '../../utils/firebase';
import { useAuth } from '../../context/AuthContext';
import { AuthService } from '../../utils/authService';

export default function ProfilePage() {
   const { userProfile } = useAuth();

   const displayName = userProfile?.displayName || 'User';
   const plan = userProfile?.subscription || 'Free Plan';
   const photoUrl = userProfile?.photoUrl;
   // e.g. "AD" or "U"
   const initials = displayName
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

   const [isLoggingOut, setIsLoggingOut] = React.useState(false);

   const navigate = useNavigate(); // Add this hook at the top level

   const handleLogout = async () => {
      try {
         setIsLoggingOut(true);
         // Attempt backend logout but don't block frontend logout if it fails
         try {
            await AuthService.logout();
         } catch (e) {
            console.warn('Backend logout failed', e);
         }

         await signOut(auth);
         // Explicit redirect to ensure consistent UX
         navigate('/login');
      } catch (error) {
         console.error('Logout failed', error);
         setIsLoggingOut(false);
      }
   };

   return (
      <div className="h-full p-8 md:p-12 animate-in fade-in zoom-in-95 duration-500">
         <h1 className="text-4xl font-black mb-8 tracking-tight">Settings</h1>

         <div className="max-w-xl space-y-8">
            {/* Profile Card */}
            <div className="p-8 rounded-[2rem] border border-slate-200 bg-white flex items-center gap-6 shadow-sm">
               {photoUrl ? (
                  <img src={photoUrl} alt="User" className="w-20 h-20 rounded-full object-cover border-2 border-slate-100" />
               ) : (
                  <div className="w-20 h-20 rounded-full bg-slate-900 text-white flex items-center justify-center text-2xl font-bold">{initials}</div>
               )}

               <div>
                  <h2 className="text-xl font-black">{displayName}</h2>
                  <p className="text-slate-500 font-medium">{plan}</p>
               </div>
            </div>

            {/* Menu Items */}
            <div className="space-y-4">
               <SettingItem icon={<User />} label="Account Details" />
               <SettingItem icon={<Mail />} label="Email Preferences" />
               <SettingItem icon={<Shield />} label="Security & 2FA" />

               <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full p-6 rounded-[1.5rem] border border-red-100 bg-red-50 text-red-600 flex items-center gap-4 font-bold hover:bg-red-100 transition-colors mt-8 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isLoggingOut ? <Loader2 className="animate-spin" size={24} /> : <LogOut size={24} />}
                  {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
               </button>
            </div>
         </div>
      </div>
   );
}

function SettingItem({ icon, label }) {
   return (
      <button className="w-full p-6 rounded-[1.5rem] border border-slate-100 bg-white hover:border-slate-300 flex items-center gap-4 transition-all group">
         <div className="text-slate-400 group-hover:text-black transition-colors">{icon}</div>
         <span className="font-bold text-slate-700 group-hover:text-black">{label}</span>
      </button>
   );
}

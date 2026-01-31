import { useState, useEffect } from 'react';
import { sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, signInAnonymously, signInWithPopup, GoogleAuthProvider, GithubAuthProvider } from 'firebase/auth';
import { User, Lock, Mail, Chrome, UserCircle, ArrowRight, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

import { auth } from '../../utils/firebase';
import { AuthService } from '../../utils/authService';
import { APP_LOGO_IMAGE } from '../../config/navigationConfig';
import { toast } from '../../utils/toast';

const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button', icon: Icon, loading = false }) => {
   const baseStyle =
      'w-full flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]';

   const variants = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 shadow-lg shadow-blue-500/30',
      secondary: 'bg-white/70 hover:bg-white/90 text-gray-700 border border-gray-200/50 focus:ring-gray-200 shadow-sm backdrop-blur-sm',
      google: 'bg-white/70 hover:bg-white/90 text-gray-700 border border-gray-200/50 focus:ring-gray-200 relative backdrop-blur-sm'
   };

   return (
      <button type={type} className={`${baseStyle} ${variants[variant]} ${className}`} onClick={onClick} disabled={loading}>
         {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : Icon ? <Icon className="w-5 h-5 mr-2" /> : null}
         {children}
      </button>
   );
};

const Input = ({ type, placeholder, value, onChange, icon: Icon, required, rightIcon }) => (
   <div className="relative group">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
         <Icon className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
      </div>
      <input
         type={type}
         className="block w-full pl-10 pr-10 py-3 border border-gray-200/50 rounded-lg leading-5 bg-white/50 backdrop-blur-md placeholder-gray-500 focus:outline-none focus:bg-white/80 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
         placeholder={placeholder}
         value={value}
         onChange={onChange}
         required={required}
      />
      {rightIcon && <div className="absolute inset-y-0 right-0 pr-3 flex items-center">{rightIcon}</div>}
   </div>
);

// Full-screen sync overlay component
const SyncOverlay = () => (
   <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl animate-in fade-in zoom-in-95 duration-300">
         <div className="relative">
            <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
            <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-xl" />
         </div>
         <div className="text-center">
            <p className="text-white font-bold text-lg">Syncing your account...</p>
            <p className="text-white/60 text-sm mt-1">Please wait while we set things up</p>
         </div>
      </div>
   </div>
);

export default function LoginPage() {
   // Initialize with the background image from public folder (Vite serves public folder at root)
   const [bgImage, setBgImage] = useState('/login_bg.png');

   // Form Data
   const [email, setEmail] = useState('');

   // UI State
   const [loading, setLoading] = useState(false);
   const [syncing, setSyncing] = useState(false); // Separate state for backend sync
   const [error, setError] = useState('');
   const [successMsg, setSuccessMsg] = useState('');
   const [infoMsg, setInfoMsg] = useState('');
   // We keep isLogin to allow toggling between Sign In / Sign Up texts if desired,
   // but for Magic Link it's mostly the same flow. We'll default to true.
   const [isLogin, setIsLogin] = useState(true);

   useEffect(() => {
      // Check if this is a Magic Link redirect
      if (isSignInWithEmailLink(auth, window.location.href)) {
         handleMagicLinkSignIn();
      }
   }, []);

   const syncWithBackend = async firebaseUser => {
      setSyncing(true);
      try {
         const token = await firebaseUser.getIdToken();
         const result = await AuthService.backendLogin(token);
         setSyncing(false);
         return result;
      } catch (error) {
         setSyncing(false);
         console.error('Backend Sync Failed:', error);
         // Show error toast
         try {
            toast.error('Login successful, but server connection failed. Please try again.');
         } catch (toastErr) {
            console.warn('Toast error:', toastErr);
         }
         setError('Login successful, but server connection failed.');
         throw error;
      }
   };

   // Step 2: Complete Sign-in logic
   const handleMagicLinkSignIn = async () => {
      setLoading(true);
      let emailForSignIn = window.localStorage.getItem('emailForSignIn');

      // If email is missing, we must prompt the user
      if (!emailForSignIn) {
         emailForSignIn = window.prompt('Please provide your email for confirmation');
      }

      if (!emailForSignIn) {
         setLoading(false);
         setError('Email is required to verify the login link.');
         return;
      }

      try {
         const result = await signInWithEmailLink(auth, emailForSignIn, window.location.href);
         window.localStorage.removeItem('emailForSignIn');

         // Backend Sync
         await syncWithBackend(result.user);
      } catch (err) {
         console.error(err);
         setError('Invalid or expired login link. Please try again.');
      } finally {
         setLoading(false);
      }
   };

   // Step 1: Send Link Logic
   const handleSendLink = async e => {
      e.preventDefault();
      setLoading(true);
      setError('');
      setSuccessMsg('');
      setInfoMsg('');

      const actionCodeSettings = {
         url: window.location.href, // Redirect back to this page
         handleCodeInApp: true
      };

      try {
         await sendSignInLinkToEmail(auth, email, actionCodeSettings);

         // Save email to local storage
         window.localStorage.setItem('emailForSignIn', email);

         setSuccessMsg('Magic link sent! Check your inbox to sign in.');
         setInfoMsg('You can close this tab now.');
      } catch (err) {
         console.error(err);
         if (err.code === 'auth/invalid-email') setError('Invalid email address.');
         else setError('Failed to send login link. Try again.');
      } finally {
         setLoading(false);
      }
   };

   const handleGuestLogin = async () => {
      setLoading(true);
      setError('');
      try {
         const result = await signInAnonymously(auth);
         await syncWithBackend(result.user);
      } catch (err) {
         setError('Unable to continue as guest.');
         console.error(err);
      } finally {
         setLoading(false);
      }
   };

   const handleGoogleLogin = async () => {
      setLoading(true);
      setError('');
      try {
         const provider = new GoogleAuthProvider();
         const result = await signInWithPopup(auth, provider);
         await syncWithBackend(result.user);
      } catch (err) {
         if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
            console.log('Google login cancelled by user');
         } else {
            setError('Google Sign-In failed. Please try again.');
            console.error(err);
         }
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="min-h-screen w-full relative flex items-center justify-center overflow-hidden bg-gray-900">
         {/* Sync Overlay - Shows during backend sync */}
         {syncing && <SyncOverlay />}
         {/* Background */}
         <div className="absolute inset-0 z-0">
            {bgImage ? (
               <img src={bgImage} alt="Background" className="w-full h-full object-cover animate-fade-in" />
            ) : (
               <div className="w-full h-full bg-gradient-to-br from-gray-800 to-black animate-pulse" />
            )}
         </div>

         {/* Logo - Top Right */}
         <div className="absolute top-6 left-6 z-20">
            <img src={APP_LOGO_IMAGE} alt="Kieru" className="h-10 w-auto object-contain rounded-lg" />
         </div>

         {/* Login Card */}
         <div className="relative z-10 w-full max-w-md p-4 animate-fade-in-up">
            <div className="bg-white/[0.05] backdrop-blur-sm border border-white/20 shadow-[0_0_40px_rgba(0,0,0,0.5)] rounded-3xl overflow-hidden">
               {/* Header */}
               <div className="px-8 pt-8 pb-6 text-center">
                  <div className="mx-auto h-16 w-16 bg-white/90 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20 rotate-3 transition-transform hover:rotate-6">
                     <Mail className="h-8 w-8 text-blue-600" />
                  </div>
                  <h2 className="text-3xl font-black text-white tracking-tighter drop-shadow-sm">Sign In</h2>
                  <p className="mt-2 text-sm text-blue-100/80 font-medium">Enter your email to receive a magic login link</p>
               </div>

               {/* Form */}
               <div className="px-8 pb-8 space-y-6">
                  <form onSubmit={handleSendLink} className="space-y-5">
                     {/* Alerts */}
                     {error && (
                        <div className="bg-red-500/90 backdrop-blur-sm text-white text-sm p-4 rounded-xl flex items-start shadow-lg animate-in fade-in slide-in-from-top-2">
                           <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0" />
                           <span className="font-medium">{error}</span>
                        </div>
                     )}
                     {successMsg && (
                        <div className="bg-emerald-500/90 backdrop-blur-sm text-white text-sm p-4 rounded-xl flex items-start shadow-lg animate-in fade-in slide-in-from-top-2">
                           <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                           <div className="flex flex-col text-left">
                              <span className="font-bold text-base">Check your inbox</span>
                              <span className="font-medium opacity-90">{successMsg}</span>
                              {infoMsg && <span className="mt-1 text-xs opacity-75">{infoMsg}</span>}
                           </div>
                        </div>
                     )}

                     {!successMsg && <Input type="email" placeholder="Email address" icon={Mail} value={email} onChange={e => setEmail(e.target.value)} required />}

                     <Button type="submit" variant="primary" loading={loading} icon={Mail} disabled={!!successMsg || loading}>
                        {successMsg ? 'Link Sent' : loading ? 'Sending...' : 'Send Login Link'}
                     </Button>
                  </form>

                  {/* Social / Guest Options */}
                  <div className="flex items-center gap-4 my-6">
                     <div className="h-px bg-white/10 flex-1"></div>
                     <span className="text-xs text-white/50 font-bold uppercase tracking-wider">Or continue with</span>
                     <div className="h-px bg-white/10 flex-1"></div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                     <Button variant="google" onClick={handleGoogleLogin} icon={Chrome} className="text-xs font-bold py-2.5">
                        Google
                     </Button>
                     <Button variant="secondary" onClick={handleGuestLogin} icon={UserCircle} className="text-xs font-bold py-2.5">
                        Guest
                     </Button>
                  </div>
               </div>
            </div>
            <div className="mt-8 text-white/40 text-[10px] text-center font-medium tracking-widest">&copy; 2026 Kieru Secure</div>
         </div>
      </div>
   );
}

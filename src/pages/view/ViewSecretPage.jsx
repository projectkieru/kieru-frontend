import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Shield, Lock, AlertTriangle, Copy, Check, Flame, ArrowRight, Loader2, KeyRound } from 'lucide-react';
import { apiRequest } from '../../utils/apiClient';
import { encryptData, fileToBase64 } from '../../utils/crypto';
import { APP_LOGO_IMAGE } from '../../config/navigationConfig';
import { useAuth } from '../../context/AuthContext';

export default function ViewSecretPage() {
   const { id: routeId } = useParams(); // If present, we are in Direct Mode
   const location = useLocation();
   const navigate = useNavigate();
   const { user } = useAuth(); // Check if user is logged in
   const isLoggedIn = !!user;

   // --- State Machine ---
   // Steps: 'INPUT_LINK' | 'VALIDATING' | 'PASSWORD_REQUIRED' | 'DECRYPTING' | 'VIEW_CONTENT' | 'ERROR' | 'BURNED'
   const [step, setStep] = useState('LOADING');

   // Data
   const [secretId, setSecretId] = useState('');
   const [decryptionKey, setDecryptionKey] = useState('');
   const [password, setPassword] = useState('');
   const [encryptedData, setEncryptedData] = useState(null);
   const [decryptedContent, setDecryptedContent] = useState(null);
   const [metaData, setMetaData] = useState(null); // { type, showTimeBomb, viewTimeSeconds, ... }
   const [validationInfo, setValidationInfo] = useState(null); // Store info from validation step

   // UI State
   const [error, setError] = useState('');
   const [isBlurred, setIsBlurred] = useState(false);
   const [timeLeft, setTimeLeft] = useState(null);
   const [rawInput, setRawInput] = useState(''); // Store the full pasted link
   const [wasManualBurn, setWasManualBurn] = useState(false); // Track if user manually burned

   // --- 1. Initialization & Route Parsing ---
   useEffect(() => {
      // Check if ID is in URL (Direct Link)
      if (routeId) {
         setSecretId(routeId);
         // Get Key from Hash
         const hash = location.hash.replace('#', '');
         if (hash) {
            setDecryptionKey(hash);
            validateSecret(routeId); // Start validation immediately
         } else {
            // ID present but Key missing -> Invalid Link
            setStep('ERROR');
            setError('Invalid Link: Decryption key missing from URL.');
         }
      } else {
         // No ID -> Manual Input Mode
         setStep('INPUT_LINK');
      }
   }, [routeId, location.hash]);

   // --- 2. Logic Handlers ---

   // Step 1: Validation
   const validateSecret = async id => {
      setStep('VALIDATING');
      setError('');

      try {
         const response = await apiRequest({
            url: '/api/secrets/validation',
            method: 'GET',
            params: { id: id }
         });

         // Logic based on Validation Response
         // { isSuccess, isActive, isPasswordProtected, secretName, viewsLeft, httpStatus... }
         if (!response.isSuccess) {
            setStep('ERROR');
            setError('Secret Invalid or Deleted');
            return;
         }

         setValidationInfo(response); // Store for display (e.g. Secret Name)

         if (!response.isActive) {
            setStep('ERROR');
            setError('This secret is no longer active.');
            return;
         }

         if (response.viewsLeft <= 0) {
            setStep('ERROR');
            setError('Max views exhausted. Unable to view.');
            return;
         }

         if (response.isPasswordProtected) {
            setStep('PASSWORD_REQUIRED');
         } else {
            // Not protected, Proceed to Access
            accessSecret(id, null);
         }
      } catch (err) {
         console.error('Validation Error:', err);
         setStep('ERROR');
         setError(err.message || 'Failed to validate secret.');
      }
   };

   // Step 2: Access (Fetch Encrypted Content)
   const accessSecret = async (id, pwd) => {
      setStep('FETCHING');

      try {
         // The user requirement specified: POST /api/secrets/{id}/access?password=...
         // Our apiClient sends 'params' as JSON body for POST requests.
         // So we manually construct the URL with query params for this specific case.
         let requestUrl = `/api/secrets/${id}/access`;
         if (pwd) {
            requestUrl += `?password=${encodeURIComponent(pwd)}`;
         }

         const response = await apiRequest({
            url: requestUrl,
            method: 'POST',
            params: {} // Empty body
         });

         if (response.isSuccess && response.content) {
            setEncryptedData(response.content);
            setMetaData({
               type: response.type,
               showTimeBomb: response.showTimeBomb,
               viewTimeSeconds: response.viewTimeSeconds,
               expiresAt: response.expiresAt
            });
            setStep('DECRYPTING');
         } else {
            // Access denied (wrong password?)
            if (pwd) {
               setStep('PASSWORD_REQUIRED');
               setError('Incorrect Password');
            } else {
               setStep('ERROR');
               setError('Access Denied');
            }
         }
      } catch (err) {
         console.error('Access Error:', err);
         if (err.message.includes('403') || err.message.includes('Password')) {
            setStep('PASSWORD_REQUIRED');
            setError('Incorrect Password');
         } else {
            setStep('ERROR');
            setError(err.message || 'Failed to access secret content.');
         }
      }
   };

   // Decryption Effect
   useEffect(() => {
      if (step === 'DECRYPTING' && encryptedData && decryptionKey) {
         performDecryption();
      }
   }, [step, encryptedData, decryptionKey]);

   const performDecryption = async () => {
      try {
         const payload = await decryptData(encryptedData, decryptionKey);
         // Store the full payload for proper type handling
         setDecryptedContent(payload);
         setStep('VIEW_CONTENT');

         // Start Timer if applicable
         if (metaData?.viewTimeSeconds) {
            setTimeLeft(metaData.viewTimeSeconds);
         }
      } catch (err) {
         console.error('Decryption failed', err);
         setStep('ERROR');
         setError('Failed to decrypt secret. The key might be invalid.');
      }
   };

   // --- 3. Manual Input Handler ---
   const handleManualSubmit = e => {
      e.preventDefault();
      try {
         const trimmedInput = rawInput.trim();
         if (!trimmedInput) return;

         const url = new URL(trimmedInput);
         const pathParts = url.pathname.split('/');
         const id = pathParts[pathParts.length - 1];
         const key = url.hash.replace('#', '');

         if (!id || !key) throw new Error('Invalid Link Format');

         setSecretId(id);
         setDecryptionKey(key);
         validateSecret(id);
      } catch (e) {
         setError('Please enter a valid full URL (e.g., https://kieru.com/view/...#...)');
      }
   };

   // --- 4. Security & Activity Handler ---
   useEffect(() => {
      const handleFocusLost = () => setIsBlurred(true);
      const handleFocusGained = () => setIsBlurred(false);
      const handleActivity = () => {
         if (step === 'VIEW_CONTENT') {
            setIsBlurred(true);
         }
      };

      window.addEventListener('blur', handleFocusLost);
      window.addEventListener('focus', handleFocusGained);
      window.addEventListener('mousemove', handleActivity);
      window.addEventListener('keydown', handleActivity);
      document.addEventListener('contextmenu', event => event.preventDefault());

      let timer;
      if (step === 'VIEW_CONTENT' && timeLeft !== null && timeLeft > 0) {
         timer = setInterval(() => {
            setTimeLeft(prev => {
               if (prev <= 1) {
                  setStep('BURNED');
                  return 0;
               }
               return prev - 1;
            });
         }, 1000);
      }

      return () => {
         window.removeEventListener('blur', handleFocusLost);
         window.removeEventListener('focus', handleFocusGained);
         window.removeEventListener('mousemove', handleActivity);
         window.removeEventListener('keydown', handleActivity);
         document.removeEventListener('contextmenu', event => event.preventDefault());
         if (timer) clearInterval(timer);
      };
   }, [step, timeLeft]);

   // --- RENDER HELPERS ---

   // 1. INPUT LINK (Consistent Light UI)
   if (step === 'INPUT_LINK') {
      return (
         <div className="min-h-screen bg-slate-50 flex flex-col select-none">
            {/* Top Branding - Only for anonymous users */}
            {!isLoggedIn && (
               <div className="w-full p-4 md:p-8 flex items-start">
                  <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
                     <img src={APP_LOGO_IMAGE} alt="Kieru" className="h-10 w-auto object-contain" />
                  </div>
               </div>
            )}

            <div className="flex-1 flex flex-col items-center justify-center p-6 pt-0">
               <div className="max-w-md w-full bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 text-center animate-in zoom-in-95">
                  <div className="w-16 h-16 bg-slate-100 text-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                     <Lock size={32} />
                  </div>
                  <h1 className="text-2xl font-black text-slate-900 mb-2">Access Secret</h1>
                  <p className="text-slate-500 mb-8">Paste the full secure link to access the encrypted content.</p>

                  <form onSubmit={handleManualSubmit} className="space-y-4">
                     <input
                        type="text"
                        placeholder="https://..."
                        className="w-full p-4 rounded-xl border border-slate-200 font-medium focus:border-slate-900 outline-none transition-colors bg-slate-50 text-slate-900"
                        value={rawInput}
                        onChange={e => setRawInput(e.target.value)}
                     />
                     {error && <p className="text-red-500 text-sm font-bold">{error}</p>}
                     <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all shadow-lg active:scale-95">
                        Reveal
                     </button>
                  </form>
               </div>
            </div>
         </div>
      );
   }

   // 2. PASSWORD REQUIRED (White card, slate accents - Cleaner Look)
   if (step === 'PASSWORD_REQUIRED') {
      return (
         <div className="min-h-screen bg-slate-100 flex flex-col select-none">
            {/* Top Branding - Only for anonymous users */}
            {!isLoggedIn && (
               <div className="w-full p-4 md:p-8 flex items-start">
                  <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
                     <img src={APP_LOGO_IMAGE} alt="Kieru" className="h-10 w-auto object-contain" />
                  </div>
               </div>
            )}

            <div className="flex-1 flex flex-col items-center justify-center p-6 pt-0">
               <div className="max-w-md w-full bg-white p-8 rounded-[2rem] shadow-xl border border-slate-200 text-center animate-in zoom-in-95">
                  <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                     <KeyRound size={40} />
                  </div>
                  <h1 className="text-3xl font-black mb-2 tracking-tight text-slate-900">Protected Secret</h1>
                  <p className="text-slate-500 mb-2 text-lg">This secret is password protected.</p>
                  {validationInfo?.secretName && (
                     <div className="mb-8 inline-block bg-slate-100 px-3 py-1 rounded-lg text-sm font-bold text-slate-600 uppercase tracking-wide">{validationInfo.secretName}</div>
                  )}

                  <form
                     onSubmit={e => {
                        e.preventDefault();
                        accessSecret(secretId, password);
                     }}
                     className="space-y-6">
                     <input
                        type="password"
                        placeholder="Enter Password"
                        autoFocus
                        className="w-full p-4 rounded-2xl border-2 border-slate-200 bg-slate-50 text-slate-900 font-bold text-center text-xl focus:border-slate-900 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                     />
                     {error && <p className="text-red-500 font-bold bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}
                     <button type="submit" className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-black transition-all text-xl shadow-lg active:scale-95">
                        Unlock
                     </button>
                  </form>
               </div>
            </div>
         </div>
      );
   }

   // 3. BURNED (Consistent Light/Red UI)
   if (step === 'BURNED') {
      return (
         <div className="min-h-screen bg-slate-50 flex flex-col select-none">
            {/* Top Branding - Only for anonymous users */}
            {!isLoggedIn && (
               <div className="w-full p-4 md:p-8 flex items-start">
                  <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
                     <img src={APP_LOGO_IMAGE} alt="Kieru" className="h-10 w-auto object-contain" />
                  </div>
               </div>
            )}

            <div className="flex-1 flex flex-col items-center justify-center p-6 pt-0 text-center">
               <div className="bg-red-50 p-6 rounded-full mb-6">
                  <Flame size={64} className="text-red-600 animate-bounce" />
               </div>
               <h1 className="text-4xl font-black text-slate-900 mb-4">Secret Burned</h1>
               <p className="text-slate-500 text-lg max-w-md font-medium">
                  {wasManualBurn ? 'This message has been burned and is no longer accessible.' : 'This message has self-destructed and is no longer accessible.'}
               </p>
               <button onClick={() => navigate('/create')} className="mt-8 text-blue-600 underline decoration-blue-200 underline-offset-4 hover:text-blue-800 transition-colors font-bold">
                  Create your own secret
               </button>
            </div>
         </div>
      );
   }

   // 4. ERROR (Consistent Light UI)
   if (step === 'ERROR') {
      return (
         <div className="min-h-screen bg-slate-50 flex flex-col select-none">
            {/* Top Branding - Only for anonymous users */}
            {!isLoggedIn && (
               <div className="w-full p-4 md:p-8 flex items-start">
                  <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
                     <img src={APP_LOGO_IMAGE} alt="Kieru" className="h-10 w-auto object-contain" />
                  </div>
               </div>
            )}

            <div className="flex-1 flex flex-col items-center justify-center p-6 pt-0 text-center">
               <div className="bg-red-50 p-6 rounded-full mb-6">
                  <AlertTriangle size={48} className="text-red-600" />
               </div>
               <h1 className="text-2xl font-black text-slate-900 mb-2">Access Denied</h1>
               <p className="text-slate-600 max-w-md mb-8 font-medium">{error}</p>
               <button
                  onClick={() => {
                     setStep('INPUT_LINK');
                     setError('');
                  }}
                  className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg active:scale-95">
                  Try Again
               </button>
            </div>
         </div>
      );
   }

   // 5. LOADING
   if (step === 'LOADING' || step === 'VALIDATING' || step === 'DECRYPTING' || step === 'FETCHING') {
      const getLoadingText = () => {
         switch (step) {
            case 'VALIDATING':
               return 'Validating Link...';
            case 'FETCHING':
               return 'Fetching Secret...';
            case 'DECRYPTING':
               return 'Revealing Content...';
            default:
               return 'Verifying...';
         }
      };

      return (
         <div className="min-h-screen bg-slate-50 flex flex-col select-none">
            {/* Top Branding - Only for anonymous users */}
            {!isLoggedIn && (
               <div className="w-full p-4 md:p-8 flex items-start">
                  <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
                     <img src={APP_LOGO_IMAGE} alt="Kieru" className="h-10 w-auto object-contain" />
                  </div>
               </div>
            )}

            <div className="flex-1 flex flex-col items-center justify-center p-6 pt-0">
               <div className="flex flex-col items-center gap-4">
                  <Loader2 size={40} className="animate-spin text-slate-900" />
                  <p className="text-slate-500 font-bold tracking-wider text-sm uppercase">{getLoadingText()}</p>
               </div>
            </div>
         </div>
      );
   }

   return (
      // VIEW_CONTENT State
      <div className="min-h-screen w-full bg-slate-50 select-none flex flex-col">
         {/* Top Branding (Anonymous View) */}
         {!isLoggedIn && (
            <div className="w-full p-4 md:p-8 flex items-start">
               <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
                  <img src={APP_LOGO_IMAGE} alt="Kieru" className="h-10 w-auto object-contain" />
               </div>
            </div>
         )}

         {/* Security Overlay */}
         {isBlurred && (
            <div className="fixed inset-0 z-50 bg-white/60 backdrop-blur-3xl flex items-center justify-center">
               <div className="flex flex-col items-center gap-6">
                  <div className="bg-black text-white px-8 py-4 rounded-full font-bold shadow-2xl flex items-center gap-3 animate-pulse">
                     <Shield size={24} className="text-red-500" />
                     <span>Security Mode Active</span>
                  </div>
                  <div className="flex gap-4">
                     <button
                        onClick={e => {
                           e.stopPropagation();
                           setIsBlurred(false);
                        }}
                        className="bg-white border-2 border-slate-900 text-slate-900 px-8 py-3 rounded-2xl font-black hover:bg-slate-50 transition-all shadow-xl active:scale-95">
                        REVEAL SECRET
                     </button>
                     <button
                        onClick={e => {
                           e.stopPropagation();
                           setWasManualBurn(true);
                           setStep('BURNED');
                           navigate('/view', { replace: true });
                        }}
                        className="bg-red-600 text-white px-8 py-3 rounded-2xl font-black hover:bg-red-700 transition-all shadow-xl active:scale-95 flex items-center gap-2">
                        <Flame size={18} />
                        BURN SECRET
                     </button>
                  </div>
                  <p className="text-slate-500 text-sm font-bold max-w-sm text-center">Content blurs on movement for security. Reveal to continue viewing, or Burn to permanently end this session.</p>
               </div>
            </div>
         )}

         <div className={`flex-1 flex flex-col items-center p-4 md:p-8 pt-0 transition-opacity duration-200 ${isBlurred ? 'opacity-0' : 'opacity-100'}`}>
            {/* Header / Timer */}
            <div className="w-full max-w-4xl flex justify-between items-center mb-6">
               <div className="flex items-center gap-3">
                  <div className="bg-slate-900 text-white p-2 rounded-lg">
                     <Shield size={20} />
                  </div>
                  <span className="font-black text-slate-900 text-lg uppercase tracking-tight">{validationInfo?.secretName || 'Secret Message'}</span>
               </div>

               {timeLeft !== null && <TimerDisplay timeLeft={timeLeft} initialTime={metaData?.viewTimeSeconds} />}
            </div>

            {/* Main Content Card */}
            <div className="w-full max-w-4xl flex-1 bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden flex flex-col relative">
               <div className="flex-1 p-8 md:p-12 overflow-y-auto no-scrollbar">
                  {decryptedContent?.type === 'image' ? (
                     <div className="flex items-center justify-center min-h-[50vh]">
                        <img src={decryptedContent.data} alt="Secret" className="max-w-full rounded-lg shadow-lg pointer-events-none" />
                     </div>
                  ) : (
                     <p className="text-2xl md:text-3xl font-medium leading-relaxed text-slate-900 font-mono break-words whitespace-pre-wrap">{decryptedContent?.data || decryptedContent}</p>
                  )}
               </div>

               {/* Footer / Actions */}
               <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-sm">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Encrypted with AES-256-GCM</p>
                  <div className="flex items-center gap-2 text-red-500 font-bold text-xs uppercase tracking-tighter">
                     <Lock size={14} />
                     <span>Controlled Environment</span>
                  </div>
               </div>
            </div>

            <div className="mt-8 text-center">
               <p className="text-slate-400 text-sm font-medium">This secret has view limits. Frequent access may exhaust the limit early & permanently burn the secret.</p>
            </div>
         </div>
      </div>
   );
}

// --- Timer Display Component ---
function TimerDisplay({ timeLeft, initialTime }) {
   // Format time as HH:MM:SS or MM:SS or just SS based on remaining time
   const formatTime = seconds => {
      if (seconds >= 3600) {
         const hours = Math.floor(seconds / 3600);
         const mins = Math.floor((seconds % 3600) / 60);
         const secs = seconds % 60;
         return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      } else if (seconds >= 60) {
         const mins = Math.floor(seconds / 60);
         const secs = seconds % 60;
         return `${mins}:${secs.toString().padStart(2, '0')}`;
      } else {
         return `${seconds}s`;
      }
   };

   // Get color based on time remaining
   const getTimerColor = () => {
      if (timeLeft > 120) return { text: 'text-emerald-600', stroke: '#10b981', bg: 'bg-emerald-100' };
      if (timeLeft > 60) return { text: 'text-blue-600', stroke: '#3b82f6', bg: 'bg-blue-100' };
      return { text: 'text-red-600', stroke: '#dc2626', bg: 'bg-red-100' };
   };

   const colors = getTimerColor();
   const progress = initialTime ? (timeLeft / initialTime) * 100 : 100;
   const strokeDashoffset = 100 - progress;

   return (
      <div className={`flex items-center gap-3 px-4 py-2 rounded-full ${colors.bg} transition-colors duration-500`}>
         {/* Circular Progress */}
         <div className="relative w-8 h-8">
            <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 36 36">
               {/* Background circle */}
               <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/50" />
               {/* Progress circle */}
               <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke={colors.stroke}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="100"
                  strokeDashoffset={strokeDashoffset}
                  pathLength="100"
                  className="transition-all duration-1000 ease-linear"
               />
            </svg>
            {/* Inner pulse for urgency */}
            {timeLeft <= 60 && (
               <div className={`absolute inset-0 flex items-center justify-center`}>
                  <div className={`w-3 h-3 rounded-full ${timeLeft <= 10 ? 'bg-red-500 animate-ping' : 'bg-red-400 animate-pulse'}`} />
               </div>
            )}
         </div>

         {/* Time Text */}
         <span className={`font-mono font-black text-lg ${colors.text} ${timeLeft <= 10 ? 'animate-pulse' : ''}`}>{formatTime(timeLeft)}</span>
      </div>
   );
}

// Inline Decryption Helper
async function decryptData(encryptedBase64, keyString) {
   try {
      // 1. Decode Base64
      const binaryString = atob(encryptedBase64);
      const combined = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
         combined[i] = binaryString.charCodeAt(i);
      }

      // 2. Split IV and Data
      const iv = combined.slice(0, 12);
      const data = combined.slice(12);

      // 3. Import Key
      const key = await window.crypto.subtle.importKey('jwk', { k: keyString, alg: 'A256GCM', ext: true, key_ops: ['encrypt', 'decrypt'], kty: 'oct' }, { name: 'AES-GCM' }, false, ['decrypt']);

      // 4. Decrypt
      const decryptedBuffer = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, data);

      // 5. Decode
      const decryptedString = new TextDecoder().decode(decryptedBuffer);
      const payload = JSON.parse(decryptedString);

      return payload;
   } catch (e) {
      console.error('Decryption Verification Failed', e);
      throw new Error('Decryption Failed');
   }
}

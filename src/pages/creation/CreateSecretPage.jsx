import React, { useState, useRef, useEffect } from 'react';
import { Eraser, Shield, Clock, Image as ImageIcon, Lock, X, Eye, Loader2, Type as TypeIcon, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAssets, getCharLimit, getFileSizeLimit } from '../../context/AssetsContext';
import { generateKey, encryptData, fileToBase64 } from '../../utils/crypto';
import { apiRequest } from '../../utils/apiClient';

export default function CreateSecretPage() {
   // Get User and Profile
   const { user, userProfile } = useAuth();
   const { charLimits, fileSizeLimits, loading: assetsLoading } = useAssets();

   const plan = userProfile?.subscription || 'UNDEFINED';
   const charLimit = getCharLimit(charLimits, plan);
   const canUploadImage = plan !== 'ANONYMOUS' && plan !== 'UNDEFINED';
   const imgUploadSizeLimit = getFileSizeLimit(fileSizeLimits, plan);

   // --- State ---
   const [contentType, setContentType] = useState('TEXT'); // 'TEXT' | 'IMAGE'
   const [secretName, setSecretName] = useState('');
   const [secretText, setSecretText] = useState('');
   const [selectedFile, setSelectedFile] = useState(null);

   const [loading, setLoading] = useState(false);
   const [error, setError] = useState('');
   const [resultLink, setResultLink] = useState('');
   const [copied, setCopied] = useState(false);

   // --- Settings State ---
   const [showSettings, setShowSettings] = useState(false);
   const [settings, setSettings] = useState({
      maxViews: 1,
      showTimeBomb: true, // Visual only: does the user see the timer?
      viewTimeSeconds: 60, // Functional: how long does it last?
      expiresAt: '', // New: DateTime string
      password: '' // Optional Password
   });

   const fileInputRef = useRef(null);

   // Minimum expiry (1 hour from now) - updated every minute
   const [minExpiry, setMinExpiry] = useState('');

   // Update minExpiry every minute to keep it current
   useEffect(() => {
      const updateMinExpiry = () => {
         const oneHourFromNow = new Date();
         oneHourFromNow.setHours(oneHourFromNow.getHours() + 1);
         const minIso = oneHourFromNow.toLocaleString('sv').slice(0, 16).replace(' ', 'T');
         setMinExpiry(minIso);
      };

      updateMinExpiry(); // Set initial value
      const interval = setInterval(updateMinExpiry, 60000); // Update every minute

      return () => clearInterval(interval);
   }, []);

   // Initialize Default Expiry (24 hours from now)
   useEffect(() => {
      const tomorrow = new Date();
      tomorrow.setHours(tomorrow.getHours() + 24);
      // Format as YYYY-MM-DDTHH:mm for input[type="datetime-local"]
      // Note: This simple format works in local time.
      const iso = tomorrow.toLocaleString('sv').slice(0, 16).replace(' ', 'T');
      setSettings(s => ({ ...s, expiresAt: iso }));
   }, []);

   // --- Handlers ---

   const handleContentTypeChange = type => {
      setContentType(type);
      setError('');
      // Clear the OTHER type's data to ensure exclusivity
      if (type === 'text') {
         setSelectedFile(null);
         if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
         setSecretText('');
      }
   };

   const handleTextChange = e => {
      const text = e.target.value;
      if (text.length <= charLimit) {
         setSecretText(text);
      }
   };

   const handleFileSelect = e => {
      if (!canUploadImage) {
         setError(`Upgrade to EXPLORER plan to upload images.`);
         return;
      }
      const file = e.target.files[0];
      if (file) {
         if (file.size > imgUploadSizeLimit) {
            setError(`File size too large (Max size ${imgUploadSizeLimit / 1024 / 1024} MB)`);
            return;
         }
         setSelectedFile(file);
         setError('');
      }
   };

   const handleCreate = async () => {
      if (!secretName.trim()) {
         setError('Please name your secret.');
         return;
      }

      const isTextMode = contentType === 'TEXT';
      if (isTextMode && !secretText.trim()) {
         setError('Please enter some text.');
         return;
      }
      if (!isTextMode && !selectedFile) {
         setError('Please attach an image.');
         return;
      }

      setLoading(true);
      setError('');

      try {
         // 1. Prepare Content
         let contentPayload = {};

         if (isTextMode) {
            contentPayload = { type: 'text', data: secretText };
         } else {
            const base64File = await fileToBase64(selectedFile);
            contentPayload = {
               type: 'image',
               data: base64File,
               name: selectedFile.name,
               mimeType: selectedFile.type
            };
         }

         // 2. Client-Side Encryption
         const key = await generateKey();
         const payloadString = JSON.stringify(contentPayload);
         const encryptedData = await encryptData(payloadString, key);

         const requestBody = {
            encryptedPayload: encryptedData,
            secretName: secretName.trim(),
            type: contentType
         };

         // Only send additional settings if the "More Options" panel is open
         if (showSettings) {
            const expiryDate = new Date(settings.expiresAt);
            const expiresAtMillis = expiryDate.getTime();

            if (!isNaN(expiresAtMillis)) {
               requestBody.expiresAt = expiresAtMillis;
            }

            requestBody.password = settings.password?.trim() || null;
            requestBody.maxViews = settings.maxViews;
            requestBody.viewTimeSeconds = settings.viewTimeSeconds;
            requestBody.showTimeBomb = settings.showTimeBomb;
         }

         // 4. API Call
         let token = null;
         if (user) {
            token = await user.getIdToken();
         }

         const response = await apiRequest({
            url: '/api/secrets/create',
            method: 'POST',
            params: requestBody,
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            requestId: 'CREATE_SECRET'
         });

         if (response.isSuccess && response.secretId) {
            const link = `${window.location.origin}/view/${response.secretId}#${key}`;
            setResultLink(link);

            // Reset Form
            setSecretText('');
            setSecretName('');
            setSelectedFile(null);
            // setContentType('text'); // Optional: keep user preference? Resetting for safety.
         } else {
            throw new Error('Invalid response from server');
         }
      } catch (err) {
         console.error(err);
         setError(err.message || 'Failed to create secret. Please try again.');
      } finally {
         setLoading(false);
      }
   };

   if (resultLink) {
      return (
         <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95">
            <div className="bg-emerald-50 p-6 rounded-full mb-6">
               <Shield className="w-16 h-16 text-emerald-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Secret Secured</h2>
            <p className="text-slate-600 mb-8 max-w-md">This link contains the decryption key. If lost, the secret is unrecoverable.</p>

            <div className="w-full max-w-lg bg-slate-100 p-4 rounded-xl flex items-center gap-3 border border-slate-200">
               <code className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-slate-700 font-mono text-sm">{resultLink}</code>
               <button
                  onClick={() => {
                     navigator.clipboard.writeText(resultLink);
                     setCopied(true);
                     setTimeout(() => setCopied(false), 2000);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 ${copied ? 'bg-green-600 text-white' : 'bg-black text-white hover:bg-slate-800'}`}>
                  {copied ? 'Copied!' : 'Copy'}
               </button>
            </div>

            <button
               onClick={() => {
                  setResultLink('');
                  setShowSettings(false);
                  setCopied(false);
               }}
               className="mt-8 text-slate-500 hover:text-slate-900 font-medium">
               Create Another
            </button>
         </div>
      );
   }

   return (
      <div className="h-full flex flex-col animate-in fade-in zoom-in-95 duration-300">
         {/* Header */}
         <header className="px-8 py-6 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-20 flex justify-between items-center">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Compose</h1>
            <button
               onClick={() => {
                  setSecretText('');
                  setSecretName('');
                  setSelectedFile(null);
                  setError('');
               }}
               className="flex items-center gap-1.5 text-slate-500 bg-slate-100 border border-slate-200 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all text-sm font-medium">
               <Eraser size={16} />
               <span className="hidden sm:inline">Reset</span>
            </button>
         </header>

         <div className="flex-1 h-full p-8 flex flex-col gap-6 overflow-y-auto">
            {/* 1. Content Type Toggle */}
            <div className="flex p-1 bg-slate-100 rounded-xl w-fit self-center">
               <button
                  onClick={() => handleContentTypeChange('TEXT')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                     contentType === 'TEXT' ? 'bg-white text-black shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  <TypeIcon size={16} /> Text
               </button>
               <button
                  onClick={() => handleContentTypeChange('IMAGE')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${
                     contentType === 'IMAGE' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  <ImageIcon size={16} /> Image
               </button>
            </div>

            {/* 2. Secret Name (Mandatory) */}
            <div className="space-y-2">
               <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Secret Name (Required)</label>
               <input
                  type="text"
                  maxLength={30}
                  value={secretName}
                  onChange={e => setSecretName(e.target.value)}
                  placeholder="Enter Secret Name (Max 30 chars)"
                  className="w-full text-lg font-bold placeholder:text-slate-300 border-b border-slate-200 py-2 outline-none focus:border-black transition-colors bg-transparent"
               />
               <div className="text-right text-xs text-slate-300">{secretName.length}/30</div>
            </div>

            {/* 3. Main Input Area (Conditional) */}
            <div className="flex-1 flex flex-col min-h-[200px]">
               {contentType === 'TEXT' ? (
                  <>
                     <textarea
                        value={secretText}
                        onChange={handleTextChange}
                        placeholder="Your secrete message (End-to-End Encrypted)"
                        className="w-full flex-1 text-xl md:text-2xl font-medium placeholder:text-slate-300 resize-none outline-none leading-relaxed bg-transparent font-sans border border-[#e2e8ef] rounded-[11px] p-[10px]"
                        spellCheck="false"
                        autoFocus
                     />
                     <div className={`text-right text-xs font-mono mt-2 ${secretText.length >= charLimit ? 'text-red-500' : 'text-slate-400'}`}>
                        {secretText.length} / {charLimit} chars
                     </div>
                  </>
               ) : (
                  <div
                     className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl hover:border-slate-300 transition-colors cursor-pointer bg-slate-50/50"
                     onClick={() => fileInputRef.current?.click()}>
                     <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />

                     {selectedFile ? (
                        <div className="text-center">
                           <div className="bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600">
                              <ImageIcon size={32} />
                           </div>
                           <h3 className="text-slate-900 font-bold mb-1">{selectedFile.name}</h3>
                           <p className="text-slate-500 text-sm">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                           <button
                              onClick={e => {
                                 e.stopPropagation();
                                 setSelectedFile(null);
                              }}
                              className="mt-4 text-red-500 text-sm font-bold hover:text-red-600">
                              Remove
                           </button>
                        </div>
                     ) : (
                        <div className="text-center p-8">
                           <div className="bg-slate-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                              <ImageIcon size={32} />
                           </div>
                           <h3 className="text-slate-900 font-bold mb-1">Click to Upload Image</h3>
                           <p className="text-slate-500 text-sm">Max size: {imgUploadSizeLimit / 1024 / 1024}MB</p>
                        </div>
                     )}
                  </div>
               )}
            </div>

            {/* Error Message */}
            {error && (
               <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2">
                  <Shield size={16} /> {error}
               </div>
            )}

            {/* Bottom Toolbar & Settings */}
            <div className="bg-slate-50 p-6 rounded-[1.5rem] flex flex-col gap-6 border border-slate-100 flex-shrink-0">
               <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                     <ToolbarButton
                        active={showSettings}
                        onClick={() => setShowSettings(!showSettings)}
                        icon={<Lock size={20} />}
                        label="Settings"
                        color="text-purple-600 border-purple-200 bg-purple-50"
                     />
                     <span className="text-sm font-bold text-slate-500 self-center ml-2 hidden sm:inline">{showSettings ? 'Hide Options' : 'More Options'}</span>
                  </div>

                  <button
                     onClick={handleCreate}
                     disabled={loading || !secretName.trim() || (contentType === 'TEXT' && !secretText) || (contentType === 'IMAGE' && !selectedFile)}
                     className="px-8 py-3 rounded-xl font-bold text-lg shadow-lg bg-black text-white hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none">
                     {loading ? <Loader2 className="animate-spin" /> : <Shield size={20} />}
                     Encrypt
                  </button>
               </div>

               {/* Extended Settings Panel */}
               {showSettings && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-top-2 pt-2">
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                           <Eye size={14} /> Max Views
                        </label>
                        <input
                           type="number"
                           min="1"
                           max="100"
                           value={settings.maxViews}
                           onChange={e => setSettings({ ...settings, maxViews: parseInt(e.target.value) || 1 })}
                           className="w-full p-2.5 rounded-lg border border-slate-200 text-sm font-medium focus:border-black outline-none transition-colors"
                        />
                     </div>

                     {/* 2. Password (Optional) */}
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                           <Lock size={14} /> Password (Optional)
                        </label>
                        <input
                           type="text"
                           value={settings.password}
                           onChange={e => setSettings({ ...settings, password: e.target.value })}
                           placeholder="No password set"
                           className="w-full p-2.5 rounded-lg border border-slate-200 text-sm font-medium focus:border-black outline-none transition-colors placeholder:text-slate-300"
                        />
                     </div>

                     {/* 2. Expiration Date */}
                     <div className="space-y-2 lg:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                           <Clock size={14} /> Expiration Date
                        </label>
                        <input
                           type="datetime-local"
                           value={settings.expiresAt}
                           min={minExpiry}
                           onChange={e => setSettings({ ...settings, expiresAt: e.target.value })}
                           className="w-full p-2.5 rounded-lg border border-slate-200 text-sm font-medium focus:border-black outline-none transition-colors"
                        />
                     </div>

                     {/* 4. Time Bomb (Visual Toggle) */}
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">Show Time Bomb?</label>
                        <button
                           onClick={() => setSettings(s => ({ ...s, showTimeBomb: !s.showTimeBomb }))}
                           className={`w-full p-2.5 rounded-lg border text-sm font-bold transition-all ${
                              settings.showTimeBomb ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-slate-200 text-slate-400'
                           }`}>
                           {settings.showTimeBomb ? 'Yes, Show Timer' : 'No, Hide Timer'}
                        </button>
                     </div>

                     {/* 5. View Duration (Seconds) */}
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">View Duration (Sec)</label>
                        <input
                           type="number"
                           min="10"
                           value={settings.viewTimeSeconds}
                           onChange={e => setSettings({ ...settings, viewTimeSeconds: parseInt(e.target.value) || 5 })}
                           className="w-full p-2.5 rounded-lg border border-slate-200 text-sm font-medium focus:border-black outline-none transition-colors"
                        />
                     </div>
                  </div>
               )}
            </div>
         </div>
      </div>
   );
}

function ToolbarButton({ icon, label, onClick, active, color }) {
   return (
      <button
         onClick={onClick}
         className={`w-12 h-12 rounded-2xl border flex items-center justify-center transition-all ${
            active ? color : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
         }`}
         title={label}>
         {icon}
      </button>
   );
}

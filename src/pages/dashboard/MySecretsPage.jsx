import React, { useState, useEffect, useCallback } from 'react';
import { Eye, Clock, CheckCircle, Flame, AlertCircle, RefreshCcw, Filter, ChevronDown, ChevronUp, Loader2, RotateCcwKey, X } from 'lucide-react';
import { apiRequest } from '../../utils/apiClient';
import { useAuth } from '../../context/AuthContext';

export default function MySecretsPage() {
   const { user } = useAuth();
   const [secrets, setSecrets] = useState([]);
   const [loading, setLoading] = useState(true); // Start with loading true to show loader on initial load
   const [error, setError] = useState('');
   const [expandedId, setExpandedId] = useState(null);

   // Filters & Pagination
   const [filters, setFilters] = useState({
      page: 0,
      limit: 10,
      onlyActive: false
   });
   const [hasMore, setHasMore] = useState(true);

   // --- Fetch Secrets ---
   const fetchSecrets = useCallback(
      async (isLoadMore = false) => {
         // If loading more, we append. If not (initial or filter change), we reset.
         // But we must handle the state carefully to not duplicate or lose data.

         const currentPage = isLoadMore ? filters.page : 0;
         setLoading(true);
         setError('');

         try {
            const token = user ? await user.getIdToken() : null;

            const response = await apiRequest({
               url: '/api/dashboard/secrets',
               method: 'GET',
               params: {
                  page: currentPage,
                  limit: filters.limit,
                  onlyActive: filters.onlyActive
               },
               headers: token ? { Authorization: `Bearer ${token}` } : {},
               requestId: 'FETCH_SECRETS',
               silentOnDuplicate: true
            });

            if (Array.isArray(response)) {
               // Client-side sorting: Descending order of createdAt
               // (Assuming response might not be strictly sorted, though backend usually handles this)
               const sortedData = response.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

               if (isLoadMore) {
                  setSecrets(prev => [...prev, ...sortedData]);
               } else {
                  setSecrets(sortedData);
               }

               // If we got fewer items than requested limit, means no more data
               setHasMore(sortedData.length >= filters.limit);
            } else {
               setSecrets([]);
               setHasMore(false);
            }
         } catch (err) {
            console.error('Failed to fetch secrets:', err);
            setError('Failed to load secrets history.');
         } finally {
            setLoading(false);
         }
      },
      [user, filters.limit, filters.onlyActive, filters.page]
   );

   // Initial Fetch & Filter Change Effect
   // We effectively reset page to 1 when filters change (except 'page' itself if handled manually, but here we control flow)
   // NOTE: To avoid infinite loops or conflicts, we trigger fetch when specific deps change.
   // But `filters.page` changes on load more.

   // Strategy:
   // 1. When limit/onlyActive changes -> Reset page to 1, clear secrets, trigger fetch.
   // 2. When 'Load More' clicked -> Increase page, trigger fetch (append).

   useEffect(() => {
      // Reset logic is handled by setting page to 1 in input handlers
      // Here we just fetch based on current state.
      // BUT if we just use one effect, we need to know if it's a reset or append.
      // Let's rely on `filters.page === 1` to assume reset, > 1 to assume append.
      // Actually, easier to just trigger fetch manually from handlers or a dedicated effect.

      // Let's use a dedicated effect for INITIAL load and Filter changes (resetting page).
      // If we change filters, we should setPage(1) first.

      fetchSecrets(filters.page > 0);
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [filters.page, filters.limit, filters.onlyActive]); // Dependencies trigger fetch

   // --- Handlers ---

   const handleFilterChange = (key, value) => {
      // When changing filter, reset pagination
      setFilters(prev => ({ ...prev, [key]: value, page: 0 }));
      setSecrets([]); // Clear current view
      setHasMore(true);
   };

   const handleLoadMore = () => {
      setFilters(prev => ({ ...prev, page: prev.page + 1 }));
   };

   const toggleExpand = id => {
      setExpandedId(prev => (prev === id ? null : id));
   };

   return (
      <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
         {/* 1. Header & Controls */}
         <header className="px-6 py-6 border-b border-slate-100 bg-white sticky top-0 z-20 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
               <h1 className="text-3xl font-black tracking-tight mb-1 text-slate-900">Secret History</h1>
               <p className="text-slate-500 font-medium text-sm">Track your created secrets.</p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
               {/* Active Only Toggle */}
               <button
                  onClick={() => handleFilterChange('onlyActive', !filters.onlyActive)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all border ${
                     filters.onlyActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}>
                  {filters.onlyActive ? <CheckCircle size={16} className="fill-emerald-100" /> : <Filter size={16} />}
                  {filters.onlyActive ? 'Active Only' : 'All Secrets'}
               </button>

               {/* Limit Dropdown */}
               <div className="relative group">
                  <select
                     value={filters.limit}
                     onChange={e => handleFilterChange('limit', Number(e.target.value))}
                     className="appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-bold py-2 pl-4 pr-8 rounded-lg outline-none focus:border-slate-400 cursor-pointer">
                     <option value={5}>5</option>
                     <option value={10}>10</option>
                     <option value={15}>15</option>
                     <option value={20}>20</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
               </div>
            </div>
         </header>

         {/* 2. Scrollable List */}
         <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading && secrets.length === 0 && (
               <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-2" />
                  <span className="text-sm font-bold">Fetching secrets history...</span>
               </div>
            )}

            {error && (
               <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-2 text-sm font-bold">
                  <AlertCircle size={18} />
                  {error}
                  <button onClick={() => fetchSecrets(false)} className="ml-auto underline">
                     Retry
                  </button>
               </div>
            )}

            {!loading && secrets.length === 0 && !error && (
               <div className="text-center py-20 text-slate-400">
                  <p className="text-lg font-bold mb-1">No Secrets Found</p>
                  <p className="text-sm">You haven't created any secrets yet. Create your first secret to see it here.</p>
               </div>
            )}

            {secrets.map(secret => (
               <SecretRow key={secret.secretId} data={secret} expanded={expandedId === secret.secretId} onToggle={() => toggleExpand(secret.secretId)} />
            ))}

            {/* Load More / Loading Stats */}
            {hasMore && secrets.length > 0 && (
               <div className="pt-4 pb-8 flex justify-center">
                  <button
                     onClick={handleLoadMore}
                     disabled={loading}
                     className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50">
                     {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCcw size={16} />}
                     {loading ? 'Loading more...' : 'Load More Results'}
                  </button>
               </div>
            )}
         </div>
      </div>
   );
}

// Extracted Row Component for cleaner render logic
function SecretRow({ data, expanded, onToggle }) {
   const [logs, setLogs] = useState([]);
   const [logsLoading, setLogsLoading] = useState(false);
   const [logsError, setLogsError] = useState('');

   // Password update states
   const [showPasswordModal, setShowPasswordModal] = useState(false);
   const [newPassword, setNewPassword] = useState('');
   const [passwordUpdating, setPasswordUpdating] = useState(false);
   const [passwordError, setPasswordError] = useState('');
   const [passwordSuccess, setPasswordSuccess] = useState(false);

   // Format Date
   const dateStr = new Date(data.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
   });

   // Fetch logs when expanded
   useEffect(() => {
      if (expanded && logs.length === 0 && !logsLoading && !logsError) {
         fetchAccessLogs();
      }
   }, [expanded]);

   const fetchAccessLogs = async () => {
      setLogsLoading(true);
      setLogsError('');
      try {
         const response = await apiRequest({
            url: `/api/dashboard/secrets/${data.secretId}/10/logs`,
            method: 'GET',
            requestId: `FETCH_LOGS_${data.secretId}`
         });

         if (Array.isArray(response)) {
            setLogs(response);
         } else if (response?.logs) {
            setLogs(response.logs);
         } else {
            setLogs([]);
         }
      } catch (err) {
         console.error('Failed to fetch access logs:', err);
         setLogsError('Failed to load access logs.');
      } finally {
         setLogsLoading(false);
      }
   };

   const formatLogDate = dateString => {
      return new Date(dateString).toLocaleString(undefined, {
         month: 'short',
         day: 'numeric',
         hour: '2-digit',
         minute: '2-digit',
         second: '2-digit'
      });
   };

   const openPasswordModal = e => {
      e.stopPropagation();
      setShowPasswordModal(true);
      setPasswordError('');
      setPasswordSuccess(false);
      setNewPassword('');
   };

   const handleUpdatePassword = async () => {
      if (!newPassword.trim()) {
         setPasswordError('Password cannot be empty');
         return;
      }

      setPasswordUpdating(true);
      setPasswordError('');
      setPasswordSuccess(false);

      try {
         await apiRequest({
            url: `/api/secrets/update-password/${data.secretId}`,
            method: 'POST',
            params: { password: newPassword },
            requestId: `UPDATE_PASSWORD_${data.secretId}`
         });

         setPasswordSuccess(true);
         setTimeout(() => {
            setShowPasswordModal(false);
            setNewPassword('');
         }, 1500);
      } catch (err) {
         console.error('Failed to update password:', err);
         setPasswordError(err.message || 'Failed to update password');
      } finally {
         setPasswordUpdating(false);
      }
   };

   return (
      <div
         className={`group rounded-[1.5rem] border transition-all cursor-pointer overflow-hidden ${
            expanded ? 'bg-slate-50 border-slate-300 shadow-md' : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-50/50'
         }`}>
         {/* Main Row Content */}
         <div onClick={onToggle} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left Side: ID, Name, Date */}
            <div>
               <div className="flex items-center gap-3 mb-1">
                  <div className={`w-3 h-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.2)] ${data.isActive ? 'bg-emerald-500 shadow-emerald-200' : 'bg-red-500 shadow-red-200'}`}></div>
                  <span className="font-black text-slate-900 text-xl tracking-tight">{data.secretName}</span>
                  {data.secretId && (
                     <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded textxs font-bold tracking-wider text-[10px] hidden sm:inline-block">{data.secretId.slice(0, 8)}</span>
                  )}
               </div>
               <span className="font-bold text-slate-400 text-xs pl-6">{dateStr}</span>
            </div>

            {/* Right Side: Stats Badges */}
            <div className="flex items-center gap-3 pl-6 md:pl-0">
               <StatusBadge status={data.isActive ? 'Active' : data.currentViews >= data.maxViews ? 'Burned' : 'Expired'} showTimeBomb={data.showTimeBomb} />

               <div
                  className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-bold shadow-sm ${
                     data.currentViews === data.maxViews ? 'bg-red-50 border-red-100 text-red-500' : 'bg-white border-slate-100 text-slate-500'
                  }`}>
                  <Eye size={16} className={data.currentViews === data.maxViews ? 'text-red-500' : 'text-blue-500'} />
                  <span>
                     {data.currentViews} / {data.maxViews} Used
                  </span>
               </div>

               {/* Password Update Icon - Only for password-protected secrets */}
               {data.isPasswordProtected && (
                  <button
                     onClick={openPasswordModal}
                     className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 hover:text-slate-900 transition-colors"
                     title="Update Password">
                     <RotateCcwKey size={18} />
                  </button>
               )}

               <div className="text-slate-300 ml-2">{expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</div>
            </div>
         </div>

         {/* Expanded Content (Access Logs) */}
         {expanded && (
            <div className="px-6 pb-6 animate-in slide-in-from-top-2 border-t border-slate-200 pt-4">
               <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                  {/* Header */}
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                     <h3 className="text-slate-900 font-bold">Access Logs</h3>
                     <button
                        onClick={e => {
                           e.stopPropagation();
                           setLogs([]);
                           fetchAccessLogs();
                        }}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                        disabled={logsLoading}>
                        <RefreshCcw size={16} className={logsLoading ? 'animate-spin' : ''} />
                     </button>
                  </div>

                  {/* Loading State */}
                  {logsLoading && (
                     <div className="p-8 text-center">
                        <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                           <Loader2 className="animate-spin" size={20} />
                        </div>
                        <p className="text-slate-500 text-sm">Fetching access history...</p>
                     </div>
                  )}

                  {/* Error State */}
                  {logsError && !logsLoading && (
                     <div className="p-6 text-center">
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center justify-center gap-2 text-sm font-bold">
                           <AlertCircle size={18} />
                           {logsError}
                        </div>
                     </div>
                  )}

                  {/* Empty State */}
                  {!logsLoading && !logsError && logs.length === 0 && (
                     <div className="p-8 text-center">
                        <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                           <Eye size={20} />
                        </div>
                        <p className="text-slate-500 text-sm">No access logs yet.</p>
                     </div>
                  )}

                  {/* Logs Cards */}
                  {!logsLoading && logs.length > 0 && (
                     <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
                        {logs.map((log, index) => (
                           <div key={index} className="p-4 rounded-xl border border-slate-100 bg-slate-50/30">
                              <div className="flex items-start justify-between gap-3">
                                 {/* Left: Time & IP */}
                                 <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 text-slate-600 text-sm font-medium mb-1">
                                       <Clock size={14} className="text-slate-400 flex-shrink-0" />
                                       <span>{formatLogDate(log.accessedAt)}</span>
                                    </div>
                                    <div className="text-slate-900 font-mono text-sm font-bold truncate">{log.ipAddress || '-'}</div>
                                    {!log.wasSuccessful && log.failureReason && (
                                       <p className="mt-2 text-red-600 text-xs font-medium bg-red-100/50 px-2 py-1 rounded-lg inline-block">{log.failureReason}</p>
                                    )}
                                 </div>

                                 {/* Right: Status Badge */}
                                 <div className="flex-shrink-0">
                                    {log.wasSuccessful ? (
                                       <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                          <CheckCircle size={16} className="text-emerald-600" />
                                       </div>
                                    ) : (
                                       <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                                          <AlertCircle size={16} className="text-red-600" />
                                       </div>
                                    )}
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>
                  )}
               </div>
            </div>
         )}

         {/* Password Update Modal */}
         {showPasswordModal && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50" onClick={() => setShowPasswordModal(false)}>
               <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-4">
                     <h3 className="text-xl font-bold text-slate-900">Update Secret Password</h3>
                     <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                     </button>
                  </div>

                  <input
                     type="password"
                     placeholder="Enter new password"
                     value={newPassword}
                     onChange={e => setNewPassword(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && handleUpdatePassword()}
                     className="w-full px-4 py-3 border border-slate-200 rounded-xl mb-4 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-transparent"
                     autoFocus
                  />

                  {passwordError && (
                     <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                        <p className="text-red-600 text-sm font-medium">{passwordError}</p>
                     </div>
                  )}

                  {passwordSuccess && (
                     <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl">
                        <p className="text-green-600 text-sm font-medium">Password updated successfully!</p>
                     </div>
                  )}

                  <div className="flex justify-end gap-3">
                     <button
                        onClick={() => setShowPasswordModal(false)}
                        className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors font-semibold"
                        disabled={passwordUpdating}>
                        Cancel
                     </button>
                     <button
                        onClick={handleUpdatePassword}
                        className="px-5 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold flex items-center gap-2"
                        disabled={passwordUpdating}>
                        {passwordUpdating ? (
                           <>
                              <Loader2 className="animate-spin" size={16} />
                              <span>Updating...</span>
                           </>
                        ) : (
                           'Update Password'
                        )}
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}

// Helper Component for badges
function StatusBadge({ status, showTimeBomb }) {
   const styles = {
      Active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      Burned: 'bg-red-100 text-red-700 border-red-200',
      Expired: 'bg-slate-100 text-slate-500 border-slate-200'
   };

   const icons = {
      Active: <CheckCircle size={14} />,
      Burned: <Flame size={14} />,
      Expired: <AlertCircle size={14} />
   };

   return (
      <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border flex items-center gap-2 ${styles[status] || styles.Expired}`}>
         {icons[status] || icons.Expired}
         {status}
         {showTimeBomb && status === 'Active' && <Clock size={14} className="ml-1 text-emerald-500" />}
      </span>
   );
}

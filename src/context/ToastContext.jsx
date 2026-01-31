import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toastManager } from '../utils/toast';
import { X, Check, AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';

// Context
const ToastContext = createContext(null);

// Hook to use toast context
export const useToast = () => {
   const context = useContext(ToastContext);
   if (!context) {
      throw new Error('useToast must be used within a ToastProvider');
   }
   return context;
};

// Animation keyframes CSS
const toastStyles = `
@keyframes toast-slide-in {
   from {
      transform: translateY(-100%) translateX(-50%);
      opacity: 0;
   }
   to {
      transform: translateY(0) translateX(-50%);
      opacity: 1;
   }
}

@keyframes toast-slide-out {
   from {
      transform: translateY(0) translateX(-50%);
      opacity: 1;
   }
   to {
      transform: translateY(-100%) translateX(-50%);
      opacity: 0;
   }
}

@keyframes toast-fade-in {
   from {
      opacity: 0;
      transform: translateX(-50%) scale(0.95);
   }
   to {
      opacity: 1;
      transform: translateX(-50%) scale(1);
   }
}

@keyframes toast-fade-out {
   from {
      opacity: 1;
      transform: translateX(-50%) scale(1);
   }
   to {
      opacity: 0;
      transform: translateX(-50%) scale(0.95);
   }
}

@keyframes toast-bounce-in {
   0% {
      transform: translateX(-50%) scale(0);
      opacity: 0;
   }
   50% {
      transform: translateX(-50%) scale(1.05);
   }
   70% {
      transform: translateX(-50%) scale(0.98);
   }
   100% {
      transform: translateX(-50%) scale(1);
      opacity: 1;
   }
}

@keyframes toast-bounce-out {
   0% {
      transform: translateX(-50%) scale(1);
      opacity: 1;
   }
   50% {
      transform: translateX(-50%) scale(1.05);
   }
   100% {
      transform: translateX(-50%) scale(0);
      opacity: 0;
   }
}
`;

// Color configurations - refined for dark/light compatibility with app theme
const colorConfig = {
   success: {
      bg: '#ffffff',
      border: '#d1fae5',
      text: '#0f172a',
      subtleBg: '#ecfdf5',
      icon: CheckCircle,
      iconColor: '#10b981',
      buttonBg: '#10b981',
      buttonHover: '#059669'
   },
   error: {
      bg: '#ffffff',
      border: '#fecaca',
      text: '#0f172a',
      subtleBg: '#fef2f2',
      icon: XCircle,
      iconColor: '#ef4444',
      buttonBg: '#ef4444',
      buttonHover: '#dc2626'
   },
   warning: {
      bg: '#ffffff',
      border: '#fde68a',
      text: '#0f172a',
      subtleBg: '#fffbeb',
      icon: AlertTriangle,
      iconColor: '#f59e0b',
      buttonBg: '#f59e0b',
      buttonHover: '#d97706'
   },
   info: {
      bg: '#ffffff',
      border: '#bfdbfe',
      text: '#0f172a',
      subtleBg: '#eff6ff',
      icon: Info,
      iconColor: '#3b82f6',
      buttonBg: '#3b82f6',
      buttonHover: '#2563eb'
   },
   neutral: {
      bg: '#ffffff',
      border: '#e2e8f0',
      text: '#0f172a',
      subtleBg: '#f8fafc',
      icon: Info,
      iconColor: '#64748b',
      buttonBg: '#64748b',
      buttonHover: '#475569'
   }
};

// Animation configurations
const getAnimationStyle = (animation, isExiting) => {
   const duration = animation === 'bounce' ? '0.4s' : '0.25s';
   const timing = animation === 'bounce' ? 'cubic-bezier(0.34, 1.56, 0.64, 1)' : 'ease-out';

   const animations = {
      slide: isExiting ? 'toast-slide-out' : 'toast-slide-in',
      fade: isExiting ? 'toast-fade-out' : 'toast-fade-in',
      bounce: isExiting ? 'toast-bounce-out' : 'toast-bounce-in'
   };

   return {
      animation: `${animations[animation]} ${duration} ${timing} forwards`
   };
};

// Individual Toast Component
function ToastItem({ toast, onDismiss, onConfirm, style }) {
   const [isExiting, setIsExiting] = useState(false);
   const [isMobile, setIsMobile] = useState(window.innerWidth < 480);
   const toastRef = useRef(null);
   const colors = colorConfig[toast.color] || colorConfig.neutral;
   const IconComponent = colors.icon;

   // Handle viewport resize for responsive layout
   useEffect(() => {
      const handleResize = () => setIsMobile(window.innerWidth < 480);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
   }, []);

   // Handle dismiss with exit animation
   const handleDismiss = useCallback(() => {
      if (isExiting) return;
      setIsExiting(true);
      setTimeout(() => onDismiss(toast.id), 250);
   }, [toast.id, onDismiss, isExiting]);

   // Handle confirmation
   const handleConfirm = useCallback(
      result => {
         if (isExiting) return;
         setIsExiting(true);
         setTimeout(() => onConfirm(toast.id, result), 250);
      },
      [toast.id, onConfirm, isExiting]
   );

   // Auto-dismiss timer
   useEffect(() => {
      if (toast.duration > 0 && !toast.needConfirmation) {
         const timer = setTimeout(handleDismiss, toast.duration);
         return () => clearTimeout(timer);
      }
   }, [toast.duration, toast.needConfirmation, handleDismiss]);

   // Keyboard support for confirmation toasts (Enter = confirm, Escape = reject)
   useEffect(() => {
      if (!toast.needConfirmation) return;

      const handleKeyDown = event => {
         if (event.key === 'Enter') {
            event.preventDefault();
            handleConfirm(true);
         } else if (event.key === 'Escape') {
            event.preventDefault();
            handleConfirm(false);
         }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
   }, [toast.needConfirmation, handleConfirm]);

   // Focus management for accessibility
   useEffect(() => {
      if (toast.needConfirmation && toastRef.current) {
         toastRef.current.focus();
      }
   }, [toast.needConfirmation]);

   const animationStyle = getAnimationStyle(toast.animation, isExiting);
   const isConfirmation = toast.needConfirmation;
   const useVerticalLayout = isConfirmation && isMobile;

   return (
      <div
         ref={toastRef}
         tabIndex={isConfirmation ? 0 : -1}
         style={{
            ...style,
            ...animationStyle,
            position: 'fixed',
            left: '50%',
            transform: 'translateX(-50%)',
            width: useVerticalLayout ? 'calc(100vw - 32px)' : 'max-content',
            maxWidth: 'min(90vw, 480px)',
            padding: '12px 16px',
            borderRadius: '12px',
            background: colors.bg,
            border: `1px solid ${colors.border}`,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.06)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: useVerticalLayout ? 'column' : 'row',
            alignItems: useVerticalLayout ? 'stretch' : 'center',
            gap: useVerticalLayout ? '12px' : '10px',
            outline: 'none'
         }}
         role="alert"
         aria-live="polite">
         {/* Top row with icon and message */}
         <div
            style={{
               display: 'flex',
               alignItems: 'center',
               gap: '10px',
               flex: useVerticalLayout ? 'none' : 1,
               minWidth: 0
            }}>
            {/* Icon */}
            <div
               style={{
                  flexShrink: 0,
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: colors.subtleBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
               }}>
               <IconComponent size={16} style={{ color: colors.iconColor }} />
            </div>

            {/* Message */}
            <p
               style={{
                  margin: 0,
                  fontSize: '13px',
                  fontWeight: 500,
                  color: colors.text,
                  lineHeight: 1.4,
                  flex: 1,
                  minWidth: 0
               }}>
               {toast.message}
            </p>

            {/* Close button for non-confirmation (inline on desktop) */}
            {!isConfirmation && (
               <button
                  onClick={handleDismiss}
                  style={{
                     flexShrink: 0,
                     width: '20px',
                     height: '20px',
                     borderRadius: '6px',
                     border: 'none',
                     background: 'transparent',
                     color: '#94a3b8',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     cursor: 'pointer',
                     transition: 'all 0.15s',
                     padding: 0
                  }}
                  onMouseOver={e => {
                     e.currentTarget.style.color = '#64748b';
                     e.currentTarget.style.background = '#f1f5f9';
                  }}
                  onMouseOut={e => {
                     e.currentTarget.style.color = '#94a3b8';
                     e.currentTarget.style.background = 'transparent';
                  }}
                  aria-label="Dismiss">
                  <X size={14} />
               </button>
            )}
         </div>

         {/* Confirmation Buttons */}
         {isConfirmation && (
            <div
               style={{
                  display: 'flex',
                  gap: '8px',
                  justifyContent: useVerticalLayout ? 'flex-end' : 'flex-start',
                  flexShrink: 0
               }}>
               <button
                  onClick={() => handleConfirm(false)}
                  style={{
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     padding: '8px 14px',
                     borderRadius: '8px',
                     border: '1px solid #e2e8f0',
                     background: '#f8fafc',
                     color: '#64748b',
                     fontSize: '13px',
                     fontWeight: 600,
                     cursor: 'pointer',
                     transition: 'all 0.15s',
                     whiteSpace: 'nowrap',
                     flex: useVerticalLayout ? 1 : 'none'
                  }}
                  onMouseOver={e => {
                     e.currentTarget.style.background = '#f1f5f9';
                     e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                  onMouseOut={e => {
                     e.currentTarget.style.background = '#f8fafc';
                     e.currentTarget.style.borderColor = '#e2e8f0';
                  }}>
                  {toast.confirmRejectText}
               </button>
               <button
                  onClick={() => handleConfirm(true)}
                  style={{
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     padding: '8px 14px',
                     borderRadius: '8px',
                     border: 'none',
                     background: '#0f172a',
                     color: 'white',
                     fontSize: '13px',
                     fontWeight: 600,
                     cursor: 'pointer',
                     transition: 'all 0.15s',
                     whiteSpace: 'nowrap',
                     flex: useVerticalLayout ? 1 : 'none'
                  }}
                  onMouseOver={e => {
                     e.currentTarget.style.background = '#1e293b';
                  }}
                  onMouseOut={e => {
                     e.currentTarget.style.background = '#0f172a';
                  }}>
                  {toast.confirmOkText}
               </button>
            </div>
         )}
      </div>
   );
}

// Toast Container Component
function ToastContainer({ toasts, onDismiss, onConfirm }) {
   // Inject keyframe styles
   useEffect(() => {
      const styleId = 'toast-animations';
      if (!document.getElementById(styleId)) {
         const styleEl = document.createElement('style');
         styleEl.id = styleId;
         styleEl.textContent = toastStyles;
         document.head.appendChild(styleEl);
      }
   }, []);

   if (toasts.length === 0) return null;

   return createPortal(
      <div
         style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            pointerEvents: 'none',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
         }}
         aria-label="Notifications">
         {toasts.map((toast, index) => (
            <div key={toast.id} style={{ pointerEvents: 'auto' }}>
               <ToastItem
                  toast={toast}
                  onDismiss={onDismiss}
                  onConfirm={onConfirm}
                  style={{
                     top: `${16 + index * 60}px`
                  }}
               />
            </div>
         ))}
      </div>,
      document.body
   );
}

// Toast Provider Component
export function ToastProvider({ children }) {
   const [toasts, setToasts] = useState([]);

   // Subscribe to toast manager events
   useEffect(() => {
      const unsubShow = toastManager.subscribe('show', config => {
         setToasts(prev => {
            // Remove existing toast with same ID
            const filtered = prev.filter(t => t.id !== config.id);
            // Add new toast at the end
            return [...filtered, config];
         });
      });

      const unsubDismiss = toastManager.subscribe('dismiss', id => {
         setToasts(prev => prev.filter(t => t.id !== id));
      });

      const unsubDismissAll = toastManager.subscribe('dismissAll', () => {
         setToasts([]);
      });

      return () => {
         unsubShow();
         unsubDismiss();
         unsubDismissAll();
      };
   }, []);

   // Handle dismiss
   const handleDismiss = useCallback(id => {
      setToasts(prev => prev.filter(t => t.id !== id));
   }, []);

   // Handle confirmation
   const handleConfirm = useCallback((id, result) => {
      toastManager.resolveConfirmation(id, result);
   }, []);

   return (
      <ToastContext.Provider value={{ toasts }}>
         {children}
         <ToastContainer toasts={toasts} onDismiss={handleDismiss} onConfirm={handleConfirm} />
      </ToastContext.Provider>
   );
}

export default ToastProvider;

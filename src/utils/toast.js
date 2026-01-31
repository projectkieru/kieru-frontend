/**
 * Toast Notification Utility
 *
 * A comprehensive, enterprise-grade toast notification system.
 *
 * Usage:
 *   import { toast } from '../utils/toast';
 *
 *   // Simple toasts
 *   toast({ message: 'Hello World' });
 *   toast.success('Operation completed!');
 *   toast.error('Something went wrong');
 *   toast.warning('Please be careful');
 *   toast.info('Did you know?');
 *
 *   // Confirmation toast (returns Promise<boolean>)
 *   const confirmed = await toast.confirm('Are you sure?');
 *   if (confirmed) { ... }
 *
 *   // Full configuration
 *   toast({
 *     id: 'unique-id',
 *     message: 'Custom toast',
 *     duration: 5000,
 *     color: 'success',
 *     animation: 'bounce'
 *   });
 */

// Event emitter for React integration
class ToastEventEmitter {
   constructor() {
      this.listeners = new Map();
   }

   on(event, callback) {
      if (!this.listeners.has(event)) {
         this.listeners.set(event, new Set());
      }
      this.listeners.get(event).add(callback);
      return () => this.off(event, callback);
   }

   off(event, callback) {
      if (this.listeners.has(event)) {
         this.listeners.get(event).delete(callback);
      }
   }

   emit(event, data) {
      if (this.listeners.has(event)) {
         this.listeners.get(event).forEach(callback => callback(data));
      }
   }
}

// Generate unique ID
const generateId = () => `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// Toast Manager Singleton
class ToastManager {
   constructor() {
      this.emitter = new ToastEventEmitter();
      this.confirmResolvers = new Map();
   }

   /**
    * Show a toast notification
    * @param {Object} config - Toast configuration
    * @param {string} [config.id] - Unique identifier (auto-generated if not provided)
    * @param {string} config.message - Toast message (required)
    * @param {number} [config.duration=3000] - Auto-dismiss duration in ms (0 = no auto-dismiss)
    * @param {'success'|'error'|'warning'|'info'|'neutral'} [config.color='neutral'] - Color theme
    * @param {'slide'|'fade'|'bounce'} [config.animation='slide'] - Animation type
    * @param {boolean} [config.needConfirmation=false] - Show confirmation buttons
    * @param {string} [config.confirmOkText='OK'] - Confirmation OK button text
    * @param {string} [config.confirmRejectText='Cancel'] - Confirmation Cancel button text
    * @param {number} [config.confirmTimeout=60000] - Auto-reject timeout for confirmations
    * @returns {string|Promise<boolean>} Toast ID or Promise for confirmations
    */
   show(config) {
      const toastConfig = {
         id: config.id || generateId(),
         message: config.message || '',
         duration: config.duration ?? 3000,
         color: config.color || 'neutral',
         animation: config.animation || 'slide',
         needConfirmation: config.needConfirmation || false,
         confirmOkText: config.confirmOkText || 'OK',
         confirmRejectText: config.confirmRejectText || 'Cancel',
         confirmTimeout: config.confirmTimeout ?? 60000,
         createdAt: Date.now()
      };

      this.emitter.emit('show', toastConfig);

      // If confirmation, return a promise
      if (toastConfig.needConfirmation) {
         return new Promise(resolve => {
            this.confirmResolvers.set(toastConfig.id, resolve);

            // Auto-reject after timeout
            if (toastConfig.confirmTimeout > 0) {
               setTimeout(() => {
                  if (this.confirmResolvers.has(toastConfig.id)) {
                     this.resolveConfirmation(toastConfig.id, false);
                  }
               }, toastConfig.confirmTimeout);
            }
         });
      }

      return toastConfig.id;
   }

   /**
    * Dismiss a toast by ID
    */
   dismiss(id) {
      this.emitter.emit('dismiss', id);
   }

   /**
    * Dismiss all toasts
    */
   dismissAll() {
      this.emitter.emit('dismissAll');
   }

   /**
    * Resolve a confirmation toast
    */
   resolveConfirmation(id, result) {
      const resolver = this.confirmResolvers.get(id);
      if (resolver) {
         resolver(result);
         this.confirmResolvers.delete(id);
      }
      this.dismiss(id);
   }

   /**
    * Subscribe to toast events
    */
   subscribe(event, callback) {
      return this.emitter.on(event, callback);
   }

   // Preset methods
   success(message, options = {}) {
      return this.show({ ...options, message, color: 'success' });
   }

   error(message, options = {}) {
      return this.show({ ...options, message, color: 'error' });
   }

   warning(message, options = {}) {
      return this.show({ ...options, message, color: 'warning' });
   }

   info(message, options = {}) {
      return this.show({ ...options, message, color: 'info' });
   }

   /**
    * Show a confirmation toast that returns a Promise<boolean>
    */
   confirm(message, options = {}) {
      return this.show({
         ...options,
         message,
         color: options.color || 'info',
         needConfirmation: true,
         duration: 0 // Don't auto-dismiss confirmations
      });
   }
}

// Create singleton instance
const toastManager = new ToastManager();

// Main toast function
const toast = config => {
   if (typeof config === 'string') {
      return toastManager.show({ message: config });
   }
   return toastManager.show(config);
};

// Attach preset methods
toast.success = (message, options) => toastManager.success(message, options);
toast.error = (message, options) => toastManager.error(message, options);
toast.warning = (message, options) => toastManager.warning(message, options);
toast.info = (message, options) => toastManager.info(message, options);
toast.confirm = (message, options) => toastManager.confirm(message, options);
toast.dismiss = id => toastManager.dismiss(id);
toast.dismissAll = () => toastManager.dismissAll();

// Export manager for React integration
export { toastManager, toast };
export default toast;

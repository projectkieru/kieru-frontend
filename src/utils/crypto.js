/**
 * Enterprise Crypto Utility using Web Crypto API (Native)
 * Supports Text and Files (via Base64)
 */

// 1. Generate a random Encryption Key (AES-GCM 256-bit)
export const generateKey = async () => {
   const key = await window.crypto.subtle.generateKey(
      {
         name: 'AES-GCM',
         length: 256
      },
      true,
      ['encrypt', 'decrypt']
   );
   // Export as JWK (JSON Web Key) to easily put in URL hash
   const exported = await window.crypto.subtle.exportKey('jwk', key);
   return exported.k; // The raw key string
};

// 2. Encrypt Data (Text or Base64 Image)
export const encryptData = async (secretData, keyString) => {
   try {
      // A. Import key string back to CryptoKey
      const key = await window.crypto.subtle.importKey('jwk', { k: keyString, alg: 'A256GCM', ext: true, key_ops: ['encrypt', 'decrypt'], kty: 'oct' }, { name: 'AES-GCM' }, false, ['encrypt']);

      // B. Create IV (Initialization Vector)
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      // C. Encode data
      const encodedData = new TextEncoder().encode(secretData);

      // D. Encrypt
      const encryptedBuffer = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, encodedData);

      // E. Combine IV + Encrypted Data
      const encryptedArray = new Uint8Array(encryptedBuffer);
      const combined = new Uint8Array(iv.length + encryptedArray.length);
      combined.set(iv);
      combined.set(encryptedArray, iv.length);

      // F. Return as Base64 string
      // Use a safer method for large data than String.fromCharCode(...combined)
      let binary = '';
      const len = combined.byteLength;
      for (let i = 0; i < len; i++) {
         binary += String.fromCharCode(combined[i]);
      }
      return btoa(binary);
   } catch (e) {
      console.error('Encryption Failed:', e);
      throw new Error('Encryption failed');
   }
};

// 3. Helper: Convert File to Base64
export const fileToBase64 = file => {
   return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
   });
};

import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingFallback() {
   return (
      <div className="h-full w-full flex items-center justify-center min-h-[50vh] animate-in fade-in duration-300">
         <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
   );
}

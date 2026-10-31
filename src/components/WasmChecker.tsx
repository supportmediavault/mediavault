'use client';

import { useState, useEffect } from 'react';

export function WasmChecker({ isDarkMode, isRtl }: { isDarkMode: boolean; isRtl: boolean }) {
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    const hasWasm = typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';
    const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
    
    if (!hasWasm || !hasSharedArrayBuffer) {
      setIsSupported(false);
    }
  }, []);

  if (isSupported) return null;

  return (
    <div className={`p-4 mb-4 rounded-2xl border text-xs font-bold flex items-center gap-3 ${
      isDarkMode ? 'bg-rose-950/40 border-rose-800 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'
    }`}>
      <span className="text-xl">⚠️</span>
      <div>
        <p className="font-extrabold text-sm">
          {isRtl ? 'المتصفح بحاجة لتحديث' : 'Browser Performance Warning'}
        </p>
        <p className="font-normal opacity-90 mt-0.5">
          {isRtl 
            ? 'متصفحك الحالي لا يدعم تسريع WebAssembly بالكامل. يرجى استخدام أحدث نسخة من Chrome أو Edge لتجربة تحويل سريعة.' 
            : 'Your browser lacks full SharedArrayBuffer support. For maximum conversion speed, please update to the latest Google Chrome or Edge.'}
        </p>
      </div>
    </div>
  );
}
'use client';

import React, { useState, useEffect, useRef } from 'react';
import emailjs from '@emailjs/browser';

interface SuggestionBoxProps {
  isDarkMode?: boolean;
  isRtl?: boolean;
  t: any;
}

export const SuggestionBox: React.FC<SuggestionBoxProps> = ({
  isDarkMode = false,
  isRtl = false,
  t,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSubmitting) return;

    setIsSubmitting(true);

    const SERVICE_ID = 'service_p9ul7kn'; 
    const TEMPLATE_ID = 'template_lbyqphq'; 
    const PUBLIC_KEY = 'zLzMWtYkM-2C2GzLf';     

    const templateParams = {
      email: 'idea-sender@mediavault.app',
      message: `[فكرة / اقتراح جديد من المستخدم]:\n\n${text}`,
    };

    emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY)
      .then((response) => {
        setIsSubmitting(false);
        setSubmitted(true);
        setText('');
        setTimeout(() => {
          setSubmitted(false);
          setIsOpen(false);
        }, 3000);
      })
      .catch((error) => {
        setIsSubmitting(false);
        alert(isRtl ? 'حدث خطأ أثناء إرسال الاقتراح، يرجى المحاولة مرة أخرى.' : 'Failed to send suggestion, please try again.');
      });
  };

  return (
    // تم تعديل الـ bottom هنا ليصبح أعلى في الهواتف (20px) لكي لا يغطي الفوتر، وفي الشاشات الكبيرة (6px)
    <div ref={boxRef} style={{ position: 'fixed', left: '24px', zIndex: 9999 }} className="bottom-20 sm:bottom-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          style={{ width: 'auto' }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-xl border transition-all hover:scale-105 cursor-pointer backdrop-blur-xl ${
            isDarkMode
              ? 'bg-slate-900/90 border-slate-700 text-sky-400 hover:bg-slate-800 shadow-sky-950/40'
              : 'bg-white/95 border-sky-200 text-sky-600 hover:bg-sky-50 shadow-sky-200/40'
          }`}
        >
          <span className="text-base animate-bounce">💡</span>
          <span className="text-xs font-bold">{t.ideaBtn || 'Have an idea?'}</span>
        </button>
      ) : (
        <div
          style={{ width: '320px', maxWidth: '90vw' }}
          className={`p-5 rounded-3xl shadow-2xl border transition-all animate-in fade-in zoom-in-95 font-sans ${
            isDarkMode
              ? 'bg-[#0f172a] border-slate-700 text-white shadow-black/95' 
              : 'bg-white border-sky-200 text-slate-900 shadow-2xl'
          }`}
        >
          {/* رأس الصندوق */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-500/20">
            <div className="flex items-center gap-2">
              <span className="text-base">💡</span>
              <h4 className={`text-sm font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {t.ideaHeader || 'Feedback & Ideas'}
              </h4>
            </div>
            {/* زر إغلاق نظيف بدون أي خلفية سوداء مزعجة */}
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-full bg-slate-500/10 hover:bg-red-500 hover:text-white flex items-center justify-center text-slate-500 dark:text-slate-400 font-black text-xs transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* النص الوصفي بلون أغمق وأكثر وضوحاً */}
          <p className={`text-xs font-bold mb-3.5 leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            {t.ideaDesc || 'Share your thoughts or request a new format!'}
          </p>

          {submitted ? (
            <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-300 text-center text-xs font-bold">
              🎉 {t.ideaSuccess || 'Thank you! Idea received'}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <textarea
                rows={3}
                required
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t.ideaPlaceholder || 'Type your suggestion...'}
                className={`w-full p-3 rounded-2xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none shadow-inner ${
                  isDarkMode 
                    ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-400' 
                    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                }`}
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-black rounded-2xl text-xs shadow-lg shadow-sky-500/30 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <span>🚀</span>
                <span>{isSubmitting ? t.sendingBtn || 'Sending...' : t.ideaSubmit || 'Submit Idea'}</span>
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

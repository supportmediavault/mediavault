import { describe, it, expect, beforeEach } from 'vitest';
import { baseTranslations, LANGUAGES } from '../src/core/i18n/translator';
import { queueManager } from '../src/core/queueManager';

describe('🚀 الفحص الشامل لمنصة تحويل الوسائط (MediaVault)', () => {

  // 1. فحص محرك الترجمة واللغات الـ 10
  describe('1. اختبار الترجمة وتعدد اللغات', () => {
    it('يجب أن يدعم 10 لغات كاملة وبدون نقص', () => {
      expect(LANGUAGES.length).toBe(10);
    });

    it('يجب أن تحتوي كل لغة على المفاتيح الأساسية (مثل mainHeading و dropzoneTitle)', () => {
      LANGUAGES.forEach((langObj) => {
        const langCode = langObj.code;
        const dict = baseTranslations[langCode];
        
        expect(dict).toBeDefined();
        expect(dict.mainHeading).toBeDefined();
        expect(dict.dropzoneTitle).toBeDefined();
        expect(dict.converting).toBeDefined();
      });
    });
  });

  // 2. فحص إدارة الطابور والملفات (Queue Manager)
  describe('2. اختبار إدارة الطابور والملفات (Queue Manager)', () => {
    beforeEach(() => {
      queueManager.clear();
    });

    it('يجب أن يتم إضافة الملفات إلى الطابور وتحديث الحالة بنجاح', () => {
      const mockFile = new File(['dummy content 1'], 'test1.png', { type: 'image/png' });

      // إضافة الملف للطابور
      queueManager.addFiles([mockFile]);
      
      // التحقق من اشتراك الطابور أو الحالة الداخلية
      let capturedItems: any[] = [];
      const unsubscribe = queueManager.subscribe((items) => {
        capturedItems = items;
      });

      expect(capturedItems.length).toBe(1);
      expect(capturedItems[0].customName).toBe('test1');

      // اختبار تعديل اسم الملف
      queueManager.updateFileName(capturedItems[0].id, 'updated-name');
      expect(capturedItems[0].customName).toBe('updated-name');

      // اختبار تفريغ الطابور
      queueManager.clear();
      expect(capturedItems.length).toBe(0);

      unsubscribe();
    });
  });

});
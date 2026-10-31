export class P2PSharer {
  /**
   * تحويل الـ Blob إلى Data URL ليكون قابلاً للفتح والنسخ في أي تبويب أو متصفح
   */
  public static async createShareableUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * نسخ رابط المشاركة إلى الحافظة
   */
  public static async copyShareLink(url: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch (err) {
      console.error('Failed to copy share link', err);
      return false;
    }
  }

  /**
   * تنظيف الرابط المؤقت عند الانتهاء (Data URLs لا تحتاج إلى إلغاء تخصيص مباشر)
   */
  public static revokeShareableUrl(url: string) {
    // Data URLs managed automatically by JS Garbage Collection
  }
}
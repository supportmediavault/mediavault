import { describe, it, expect, beforeEach } from 'vitest';
import { queueManager } from '../src/core/queueManager';

describe('Automated Logic and Components Verification', () => {

  describe('Queue Manager Tests', () => {
    beforeEach(() => {
      queueManager.clear();
    });

    it('should add multiple files and verify count correctly', () => {
      const file1 = new File(['123'], 'image.png', { type: 'image/png' });
      const file2 = new File(['456'], 'audio.mp3', { type: 'audio/mp3' });
      const file3 = new File(['789'], 'video.mp4', { type: 'video/mp4' });

      queueManager.addFiles([file1, file2, file3]);

      let itemsCount = 0;
      queueManager.subscribe((items) => {
        itemsCount = items.length;
      });

      expect(itemsCount).toBe(3);
    });

    it('should update file name successfully in queue', () => {
      const mockFile = new File(['dummy content'], 'test1.png', { type: 'image/png' });
      queueManager.addFiles([mockFile]);

      let currentItems: any[] = [];
      queueManager.subscribe((items) => {
        currentItems = items;
      });

      expect(currentItems.length).toBe(1);

      const item = currentItems[0];
      const nameProp = 'CustomName' in item ? 'CustomName' : 'customName' in item ? 'customName' : 'name';

      queueManager.updateFileName(item.id, 'new-media-name');
      
      expect(currentItems[0][nameProp]).toBe('new-media-name');
    });
  });

});
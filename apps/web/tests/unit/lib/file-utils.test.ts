import { describe, it, expect } from 'vitest';
import {
  formatFileSize,
  getFileIcon,
  isImageFile,
  ACCEPTED_FILE_TYPES,
  MAX_FILE_SIZE,
  MAX_FILES_PER_MESSAGE,
} from '@/lib/file-utils';
import {
  FileText,
  File,
  FileArchive,
  FileImage,
  FileVideo,
} from 'lucide-react';

describe('file-utils', () => {
  describe('formatFileSize', () => {
    it('should return "0 Bytes" for 0 bytes', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
    });

    it('should format bytes correctly', () => {
      expect(formatFileSize(500)).toBe('500 Bytes');
      expect(formatFileSize(1023)).toBe('1023 Bytes');
    });

    it('should format KB correctly', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(2048)).toBe('2 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('should format MB correctly', () => {
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(2097152)).toBe('2 MB');
      expect(formatFileSize(1572864)).toBe('1.5 MB');
    });

    it('should format GB correctly', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB');
      expect(formatFileSize(2147483648)).toBe('2 GB');
      expect(formatFileSize(1610612736)).toBe('1.5 GB');
    });

    it('should handle max file size (10MB)', () => {
      expect(formatFileSize(MAX_FILE_SIZE)).toBe('10 MB');
    });
  });

  describe('getFileIcon', () => {
    it('should return FileImage for image MIME types', () => {
      expect(getFileIcon('image/png')).toBe(FileImage);
      expect(getFileIcon('image/jpeg')).toBe(FileImage);
      expect(getFileIcon('image/gif')).toBe(FileImage);
      expect(getFileIcon('image/webp')).toBe(FileImage);
    });

    it('should return FileVideo for video MIME types', () => {
      expect(getFileIcon('video/mp4')).toBe(FileVideo);
      expect(getFileIcon('video/webm')).toBe(FileVideo);
    });

    it('should return FileText for PDF MIME type', () => {
      expect(getFileIcon('application/pdf')).toBe(FileText);
    });

    it('should return FileArchive for archive MIME types', () => {
      expect(getFileIcon('application/zip')).toBe(FileArchive);
      expect(getFileIcon('application/x-zip-compressed')).toBe(FileArchive);
      expect(getFileIcon('application/x-archive')).toBe(FileArchive);
    });

    it('should return File for unknown MIME types', () => {
      expect(getFileIcon('text/plain')).toBe(File);
      expect(getFileIcon('application/json')).toBe(File);
      expect(getFileIcon('text/csv')).toBe(File);
      expect(getFileIcon('application/xml')).toBe(File);
    });
  });

  describe('isImageFile', () => {
    it('should return true for image MIME types', () => {
      expect(isImageFile('image/png')).toBe(true);
      expect(isImageFile('image/jpeg')).toBe(true);
      expect(isImageFile('image/gif')).toBe(true);
      expect(isImageFile('image/webp')).toBe(true);
      expect(isImageFile('image/svg+xml')).toBe(true);
    });

    it('should return false for non-image MIME types', () => {
      expect(isImageFile('application/pdf')).toBe(false);
      expect(isImageFile('text/plain')).toBe(false);
      expect(isImageFile('video/mp4')).toBe(false);
      expect(isImageFile('application/json')).toBe(false);
    });
  });

  describe('constants', () => {
    it('should define accepted file types array', () => {
      expect(ACCEPTED_FILE_TYPES).toBeInstanceOf(Array);
      expect(ACCEPTED_FILE_TYPES.length).toBeGreaterThan(0);
      expect(ACCEPTED_FILE_TYPES).toContain('image/png');
      expect(ACCEPTED_FILE_TYPES).toContain('application/pdf');
    });

    it('should define max file size (10MB)', () => {
      expect(MAX_FILE_SIZE).toBe(10485760);
    });

    it('should define max files per message', () => {
      expect(MAX_FILES_PER_MESSAGE).toBe(5);
    });
  });
});

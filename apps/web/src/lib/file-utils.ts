import {
  FileText,
  File,
  FileArchive,
  FileImage,
  FileVideo,
  type LucideIcon,
} from 'lucide-react';

/**
 * Formats bytes to human-readable file size
 * @param bytes - File size in bytes
 * @returns Formatted file size string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

/**
 * Returns appropriate Lucide icon component for given MIME type
 * @param mimeType - File MIME type
 * @returns Lucide icon component
 */
export function getFileIcon(mimeType: string): LucideIcon {
  if (mimeType.startsWith('image/')) return FileImage;
  if (mimeType.startsWith('video/')) return FileVideo;
  if (mimeType === 'application/pdf') return FileText;
  if (mimeType.includes('zip') || mimeType.includes('archive'))
    return FileArchive;
  return File;
}

/**
 * Checks if MIME type represents an image file
 * @param mimeType - File MIME type
 * @returns True if file is an image
 */
export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Accepted file types for ping attachments
 */
export const ACCEPTED_FILE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'application/xml',
  'application/zip',
];

/**
 * Maximum file size in bytes (10MB)
 */
export const MAX_FILE_SIZE = 10485760; // 10MB in bytes

/**
 * Maximum number of files per message
 */
export const MAX_FILES_PER_MESSAGE = 5;

'use client';

import { useRef } from 'react';
import { Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  ACCEPTED_FILE_TYPES,
  MAX_FILE_SIZE,
  MAX_FILES_PER_MESSAGE,
  formatFileSize,
} from '@/lib/file-utils';

interface FileAttachmentInputProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxFileSize?: number;
  acceptedFileTypes?: string[];
  isUploading?: boolean;
  disabled?: boolean;
}

export function FileAttachmentInput({
  onFilesSelected,
  maxFiles = MAX_FILES_PER_MESSAGE,
  maxFileSize = MAX_FILE_SIZE,
  acceptedFileTypes = ACCEPTED_FILE_TYPES,
  isUploading = false,
  disabled = false,
}: FileAttachmentInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize) {
      return `File "${file.name}" exceeds ${formatFileSize(maxFileSize)} limit`;
    }

    // Check file type
    if (!acceptedFileTypes.includes(file.type)) {
      return `File type "${file.type}" is not supported`;
    }

    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    if (selectedFiles.length === 0) {
      return;
    }

    // Check file count
    if (selectedFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files per message`);
      e.target.value = ''; // Reset input
      return;
    }

    // Validate each file
    const validationErrors: string[] = [];
    const validFiles: File[] = [];

    for (const file of selectedFiles) {
      const error = validateFile(file);
      if (error) {
        validationErrors.push(error);
      } else {
        validFiles.push(file);
      }
    }

    // Show validation errors
    if (validationErrors.length > 0) {
      validationErrors.forEach((error) => toast.error(error));
      e.target.value = ''; // Reset input
      return;
    }

    // All files valid
    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }

    // Reset input to allow selecting the same files again
    e.target.value = '';
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedFileTypes.join(',')}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
        data-testid="file-input"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleButtonClick}
        disabled={disabled || isUploading}
        className="flex-shrink-0"
        title="Attach files"
      >
        <Paperclip className="w-4 h-4" />
      </Button>
    </>
  );
}

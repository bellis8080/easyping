'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatFileSize, getFileIcon, isImageFile } from '@/lib/file-utils';

interface FilePreviewListProps {
  files: File[];
  onRemove: (index: number) => void;
  uploadProgress?: Record<string, number>; // file.name -> percentage
}

export function FilePreviewList({
  files,
  onRemove,
  uploadProgress = {},
}: FilePreviewListProps) {
  return (
    <div className="space-y-2 mt-2">
      {files.map((file, index) => (
        <FilePreviewItem
          key={`${file.name}-${index}`}
          file={file}
          onRemove={() => onRemove(index)}
          progress={uploadProgress[file.name]}
        />
      ))}
    </div>
  );
}

interface FilePreviewItemProps {
  file: File;
  onRemove: () => void;
  progress?: number;
}

function FilePreviewItem({ file, onRemove, progress }: FilePreviewItemProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const FileIcon = getFileIcon(file.type);
  const isImage = isImageFile(file.type);

  useEffect(() => {
    if (isImage) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }

    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [file, isImage]);

  return (
    <div className="flex items-center gap-3 p-2 border border-gray-200 rounded-lg bg-white">
      {/* Thumbnail or Icon */}
      <div className="flex-shrink-0 w-12 h-12 rounded border border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
        {isImage && preview ? (
          <img
            src={preview}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <FileIcon className="w-6 h-6 text-gray-400" />
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {file.name}
        </p>
        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>

        {/* Upload progress */}
        {progress !== undefined && progress < 100 && (
          <div className="mt-1">
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{progress}%</p>
          </div>
        )}
      </div>

      {/* Remove button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="flex-shrink-0"
        type="button"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

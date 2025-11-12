'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Download } from 'lucide-react';
import { PingAttachment } from '@easyping/types';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { formatFileSize, getFileIcon, isImageFile } from '@/lib/file-utils';
import { ImageLightbox } from './image-lightbox';

interface AttachmentDisplayProps {
  attachment: PingAttachment;
  variant?: 'inline' | 'compact';
}

export function AttachmentDisplay({ attachment }: AttachmentDisplayProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const isImage = isImageFile(attachment.mime_type);
  const FileIcon = getFileIcon(attachment.mime_type);

  useEffect(() => {
    if (isImage) {
      // Fetch signed URL for image
      supabase.storage
        .from('ping-attachments')
        .createSignedUrl(attachment.file_path, 3600)
        .then(({ data, error }) => {
          if (error) {
            console.error('Error fetching signed URL:', error);
          } else if (data) {
            setImageUrl(data.signedUrl);
          }
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [attachment.file_path, isImage]);

  const handleDownload = async () => {
    const { data, error } = await supabase.storage
      .from('ping-attachments')
      .createSignedUrl(attachment.file_path, 60);

    if (error) {
      console.error('Error fetching download URL:', error);
      return;
    }

    if (data) {
      window.open(data.signedUrl, '_blank');
    }
  };

  if (isImage) {
    if (isLoading) {
      return (
        <div className="w-full max-w-md h-48 bg-gray-100 rounded-lg animate-pulse" />
      );
    }

    if (!imageUrl) {
      return (
        <div className="w-full max-w-md p-4 bg-gray-100 rounded-lg text-center text-sm text-gray-500">
          Failed to load image
        </div>
      );
    }

    return (
      <>
        <div
          className="relative w-full max-w-md h-auto cursor-pointer rounded-lg overflow-hidden border border-gray-200 hover:opacity-90 transition-opacity"
          onClick={() => setIsLightboxOpen(true)}
        >
          <Image
            src={imageUrl}
            alt={attachment.file_name}
            width={400}
            height={300}
            className="object-contain"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {attachment.file_name} • {formatFileSize(attachment.file_size)}
        </p>
        <ImageLightbox
          imageUrl={imageUrl}
          fileName={attachment.file_name}
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
        />
      </>
    );
  }

  // Non-image file
  return (
    <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors">
      <div className="flex-shrink-0 w-10 h-10 rounded border border-gray-200 flex items-center justify-center bg-gray-50">
        <FileIcon className="w-5 h-5 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {attachment.file_name}
        </p>
        <p className="text-xs text-gray-500">
          {formatFileSize(attachment.file_size)}
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDownload}
        className="flex-shrink-0"
        title="Download file"
      >
        <Download className="w-4 h-4" />
      </Button>
    </div>
  );
}

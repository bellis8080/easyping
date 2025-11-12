import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AttachmentDisplay } from '@/components/pings/attachment-display';
import type { PingAttachment } from '@easyping/types';

// Mock Supabase client
const mockCreateSignedUrl = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    storage: {
      from: () => ({
        createSignedUrl: mockCreateSignedUrl,
      }),
    },
  }),
}));

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    ...props
  }: {
    src: string;
    alt: string;
    [key: string]: unknown;
  }) => <img src={src} alt={alt} {...props} />,
}));

describe('AttachmentDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockImageAttachment: PingAttachment = {
    id: 'attachment-1',
    ping_message_id: 'message-1',
    file_name: 'screenshot.png',
    file_path: 'user-123/screenshot.png',
    file_size: 1048576, // 1MB
    mime_type: 'image/png',
    storage_bucket: 'ping-attachments',
    uploaded_by: 'user-123',
    created_at: '2025-01-12T10:00:00Z',
  };

  const mockPdfAttachment: PingAttachment = {
    id: 'attachment-2',
    ping_message_id: 'message-1',
    file_name: 'document.pdf',
    file_path: 'user-123/document.pdf',
    file_size: 2097152, // 2MB
    mime_type: 'application/pdf',
    storage_bucket: 'ping-attachments',
    uploaded_by: 'user-123',
    created_at: '2025-01-12T10:00:00Z',
  };

  describe('Image attachments', () => {
    it('should display image thumbnail for image MIME types', async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: 'https://example.com/signed-url' },
        error: null,
      });

      render(<AttachmentDisplay attachment={mockImageAttachment} />);

      await waitFor(() => {
        const img = screen.getByAlt('screenshot.png');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'https://example.com/signed-url');
      });
    });

    it('should fetch signed URL from Supabase Storage for images', async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: 'https://example.com/signed-url' },
        error: null,
      });

      render(<AttachmentDisplay attachment={mockImageAttachment} />);

      await waitFor(() => {
        expect(mockCreateSignedUrl).toHaveBeenCalledWith(
          'user-123/screenshot.png',
          3600
        );
      });
    });

    it('should open image lightbox on thumbnail click', async () => {
      const user = userEvent.setup();
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: 'https://example.com/signed-url' },
        error: null,
      });

      render(<AttachmentDisplay attachment={mockImageAttachment} />);

      await waitFor(() => {
        expect(screen.getByAlt('screenshot.png')).toBeInTheDocument();
      });

      const thumbnail = screen.getByAlt('screenshot.png');
      await user.click(thumbnail);

      // Lightbox should open (check for dialog or modal)
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('Non-image attachments', () => {
    it('should display file icon and download link for non-images', () => {
      render(<AttachmentDisplay attachment={mockPdfAttachment} />);

      expect(screen.getByText('document.pdf')).toBeInTheDocument();
      expect(screen.getByText('2 MB')).toBeInTheDocument();
    });

    it('should format file size correctly', () => {
      render(<AttachmentDisplay attachment={mockPdfAttachment} />);

      expect(screen.getByText('2 MB')).toBeInTheDocument();
    });

    it('should trigger download on click', async () => {
      const user = userEvent.setup();
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: 'https://example.com/download-url' },
        error: null,
      });

      // Mock window.open
      const mockOpen = vi.fn();
      vi.stubGlobal('open', mockOpen);

      render(<AttachmentDisplay attachment={mockPdfAttachment} />);

      const downloadButton = screen.getByRole('button', { name: /download/i });
      await user.click(downloadButton);

      await waitFor(() => {
        expect(mockCreateSignedUrl).toHaveBeenCalledWith(
          'user-123/document.pdf',
          60
        );
        expect(mockOpen).toHaveBeenCalledWith(
          'https://example.com/download-url',
          '_blank'
        );
      });

      vi.unstubAllGlobals();
    });
  });

  describe('Loading states', () => {
    it('should show loading skeleton while fetching signed URL', () => {
      mockCreateSignedUrl.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<AttachmentDisplay attachment={mockImageAttachment} />);

      const skeleton = document.querySelector('.animate-pulse');
      expect(skeleton).toBeInTheDocument();
    });

    it('should show error message if image URL fetch fails', async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: null,
        error: new Error('Failed to fetch'),
      });

      render(<AttachmentDisplay attachment={mockImageAttachment} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load image')).toBeInTheDocument();
      });
    });
  });
});

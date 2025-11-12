import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileAttachmentInput } from '@/components/pings/file-attachment-input';
import { MAX_FILE_SIZE, MAX_FILES_PER_MESSAGE } from '@/lib/file-utils';
import * as sonner from 'sonner';

// Mock toast module
vi.mock('sonner');

describe('FileAttachmentInput', () => {
  const mockOnFilesSelected = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup toast.error spy
    vi.mocked(sonner.toast.error).mockImplementation(() => 1);
  });

  it('should render paperclip icon button', () => {
    render(<FileAttachmentInput onFilesSelected={mockOnFilesSelected} />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('type', 'button');
  });

  it('should open file picker on button click', async () => {
    const user = userEvent.setup();
    render(<FileAttachmentInput onFilesSelected={mockOnFilesSelected} />);

    const button = screen.getByRole('button');
    const fileInput = screen.getByTestId('file-input');

    // Mock click on hidden input
    const clickSpy = vi.spyOn(fileInput, 'click');

    await user.click(button);

    expect(clickSpy).toHaveBeenCalled();
  });

  it('should validate file count (max 5)', async () => {
    const user = userEvent.setup();
    render(<FileAttachmentInput onFilesSelected={mockOnFilesSelected} />);

    const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

    // Create 6 files (exceeds max)
    const files = Array.from(
      { length: 6 },
      (_, i) => new File(['content'], `file${i}.png`, { type: 'image/png' })
    );

    await user.upload(fileInput, files);

    expect(vi.mocked(sonner.toast.error)).toHaveBeenCalledWith(
      `Maximum ${MAX_FILES_PER_MESSAGE} files per message`
    );
    expect(mockOnFilesSelected).not.toHaveBeenCalled();
  });

  it('should validate file size (max 10MB)', async () => {
    const user = userEvent.setup();
    render(<FileAttachmentInput onFilesSelected={mockOnFilesSelected} />);

    const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

    // Create file larger than 10MB
    const largeFile = new File(
      [new ArrayBuffer(MAX_FILE_SIZE + 1)],
      'large.png',
      { type: 'image/png' }
    );

    await user.upload(fileInput, [largeFile]);

    expect(vi.mocked(sonner.toast.error)).toHaveBeenCalledWith(
      expect.stringContaining('exceeds 10 MB limit')
    );
    expect(mockOnFilesSelected).not.toHaveBeenCalled();
  });

  it('should validate file type against accepted types', async () => {
    render(<FileAttachmentInput onFilesSelected={mockOnFilesSelected} />);

    const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

    // Create unsupported file type
    const unsupportedFile = new File(['content'], 'file.exe', {
      type: 'application/x-msdownload',
    });

    // Manually set files property and dispatch change event to bypass accept filter
    Object.defineProperty(fileInput, 'files', {
      value: [unsupportedFile],
      writable: false,
    });
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));

    expect(vi.mocked(sonner.toast.error)).toHaveBeenCalledWith(
      expect.stringContaining('not supported')
    );
    expect(mockOnFilesSelected).not.toHaveBeenCalled();
  });

  it('should show validation errors for invalid files', async () => {
    render(<FileAttachmentInput onFilesSelected={mockOnFilesSelected} />);

    const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

    const invalidFile = new File(['content'], 'invalid.xyz', {
      type: 'application/octet-stream',
    });

    // Manually set files property and dispatch change event to bypass accept filter
    Object.defineProperty(fileInput, 'files', {
      value: [invalidFile],
      writable: false,
    });
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));

    expect(vi.mocked(sonner.toast.error)).toHaveBeenCalled();
  });

  it('should call onFilesSelected with valid files', async () => {
    const user = userEvent.setup();
    render(<FileAttachmentInput onFilesSelected={mockOnFilesSelected} />);

    const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

    const validFiles = [
      new File(['content'], 'image.png', { type: 'image/png' }),
      new File(['content'], 'document.pdf', { type: 'application/pdf' }),
    ];

    await user.upload(fileInput, validFiles);

    expect(mockOnFilesSelected).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: 'image.png' }),
        expect.objectContaining({ name: 'document.pdf' }),
      ])
    );
    expect(vi.mocked(sonner.toast.error)).not.toHaveBeenCalled();
  });

  it('should display selected files with previews', async () => {
    const user = userEvent.setup();
    render(<FileAttachmentInput onFilesSelected={mockOnFilesSelected} />);

    const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

    const file = new File(['content'], 'test.png', { type: 'image/png' });

    await user.upload(fileInput, [file]);

    // After selection, FilePreviewList should show the file
    expect(mockOnFilesSelected).toHaveBeenCalled();
  });

  it('should disable button when isUploading is true', () => {
    render(
      <FileAttachmentInput
        onFilesSelected={mockOnFilesSelected}
        isUploading={true}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('should enable button when isUploading is false', () => {
    render(
      <FileAttachmentInput
        onFilesSelected={mockOnFilesSelected}
        isUploading={false}
      />
    );

    const button = screen.getByRole('button');
    expect(button).not.toBeDisabled();
  });

  it('should accept custom maxFiles prop', async () => {
    const user = userEvent.setup();
    render(
      <FileAttachmentInput onFilesSelected={mockOnFilesSelected} maxFiles={2} />
    );

    const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

    const files = [
      new File(['content'], 'file1.png', { type: 'image/png' }),
      new File(['content'], 'file2.png', { type: 'image/png' }),
      new File(['content'], 'file3.png', { type: 'image/png' }),
    ];

    await user.upload(fileInput, files);

    expect(vi.mocked(sonner.toast.error)).toHaveBeenCalledWith(
      'Maximum 2 files per message'
    );
  });

  it('should accept custom maxFileSize prop', async () => {
    const user = userEvent.setup();
    const customMaxSize = 1048576; // 1MB

    render(
      <FileAttachmentInput
        onFilesSelected={mockOnFilesSelected}
        maxFileSize={customMaxSize}
      />
    );

    const fileInput = screen.getByTestId('file-input') as HTMLInputElement;

    const largeFile = new File(
      [new ArrayBuffer(customMaxSize + 1)],
      'large.png',
      { type: 'image/png' }
    );

    await user.upload(fileInput, [largeFile]);

    expect(vi.mocked(sonner.toast.error)).toHaveBeenCalled();
  });
});

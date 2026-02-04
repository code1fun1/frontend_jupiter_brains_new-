import { useState } from 'react';
import { API_ENDPOINTS, buildAuthHeaders } from '@/utils/config';
import { toast } from 'sonner';

interface UploadedFile {
    id: string;
    name: string;
    status: 'uploading' | 'processing' | 'completed' | 'error';
    progress?: number;
    error?: string;
}

export function useFileUpload() {
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const uploadFile = async (file: File): Promise<string | null> => {
        const fileId = Math.random().toString(36).substring(7);

        // Add file to state
        setUploadedFiles(prev => [...prev, {
            id: fileId,
            name: file.name,
            status: 'uploading',
            progress: 0,
        }]);

        setIsUploading(true);

        try {
            // Step 1: Upload file
            const formData = new FormData();
            formData.append('file', file);

            const uploadUrl = API_ENDPOINTS.files.upload(true);
            const uploadResponse = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    ...buildAuthHeaders(),
                },
                body: formData,
                credentials: 'include',
            });

            if (!uploadResponse.ok) {
                throw new Error('Upload failed');
            }

            const uploadData = await uploadResponse.json();
            const serverFileId = uploadData.id || uploadData.file_id;

            if (!serverFileId) {
                throw new Error('No file ID returned from server');
            }

            // Update status to processing
            setUploadedFiles(prev => prev.map(f =>
                f.id === fileId
                    ? { ...f, status: 'processing' as const, progress: 50 }
                    : f
            ));

            // Step 2: Poll status
            await pollFileStatus(serverFileId, fileId);

            setIsUploading(false);
            return serverFileId;

        } catch (error) {
            console.error('File upload error:', error);

            setUploadedFiles(prev => prev.map(f =>
                f.id === fileId
                    ? { ...f, status: 'error' as const, error: error instanceof Error ? error.message : 'Upload failed' }
                    : f
            ));

            toast.error('File upload failed', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });

            setIsUploading(false);
            return null;
        }
    };

    const pollFileStatus = async (serverFileId: string, localFileId: string) => {
        const statusUrl = API_ENDPOINTS.files.status(serverFileId, true);

        try {
            const response = await fetch(statusUrl, {
                headers: {
                    ...buildAuthHeaders(),
                },
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Status check failed');
            }

            // If streaming, read the stream
            if (response.body) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();

                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n').filter(line => line.trim());

                    for (const line of lines) {
                        try {
                            const data = JSON.parse(line);

                            // Update progress
                            if (data.status === 'processing') {
                                setUploadedFiles(prev => prev.map(f =>
                                    f.id === localFileId
                                        ? { ...f, progress: data.progress || 75 }
                                        : f
                                ));
                            } else if (data.status === 'completed' || data.status === 'success') {
                                setUploadedFiles(prev => prev.map(f =>
                                    f.id === localFileId
                                        ? { ...f, status: 'completed' as const, progress: 100 }
                                        : f
                                ));

                                toast.success('File processed successfully', {
                                    description: `${uploadedFiles.find(f => f.id === localFileId)?.name || 'File'} is ready`,
                                });

                                break;
                            } else if (data.status === 'error' || data.status === 'failed') {
                                throw new Error(data.error || 'Processing failed');
                            }
                        } catch (parseError) {
                            // Ignore JSON parse errors for incomplete chunks
                            continue;
                        }
                    }
                }
            } else {
                // Non-streaming fallback
                const data = await response.json();

                if (data.status === 'completed' || data.status === 'success') {
                    setUploadedFiles(prev => prev.map(f =>
                        f.id === localFileId
                            ? { ...f, status: 'completed' as const, progress: 100 }
                            : f
                    ));

                    toast.success('File processed successfully');
                } else if (data.status === 'error' || data.status === 'failed') {
                    throw new Error(data.error || 'Processing failed');
                }
            }

        } catch (error) {
            console.error('Status polling error:', error);

            setUploadedFiles(prev => prev.map(f =>
                f.id === localFileId
                    ? { ...f, status: 'error' as const, error: error instanceof Error ? error.message : 'Processing failed' }
                    : f
            ));

            throw error;
        }
    };

    const removeFile = (fileId: string) => {
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    };

    const clearFiles = () => {
        setUploadedFiles([]);
    };

    return {
        uploadedFiles,
        isUploading,
        uploadFile,
        removeFile,
        clearFiles,
    };
}

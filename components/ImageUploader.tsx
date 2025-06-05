'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase, isDemoMode } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

interface ImageUploaderProps {
  onImageUpload: (file: File, url: string) => void;
  currentImage?: string;
  onRemoveImage?: () => void;
  className?: string;
}

export default function ImageUploader({
  onImageUpload,
  currentImage,
  onRemoveImage,
  className = '',
}: ImageUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const convertToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const uploadToSupabase = async (file: File): Promise<string> => {
    try {
      // Check if we're in demo mode
      if (isDemoMode()) {
        console.log('Demo mode: Using data URL for image');
        return await convertToDataUrl(file);
      }

      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('Uploading image via API route...');

      // Upload via API route (bypasses RLS policies)
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', user.id);

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('API upload error:', result);
        // Fallback to data URL if API fails
        console.log('⚠️ API upload failed - falling back to data URL');
        return await convertToDataUrl(file);
      }

      console.log('✅ Image uploaded successfully via API:', result.url);
      return result.url;
    } catch (error) {
      console.error('Upload error:', error);
      // Final fallback to data URL
      console.log('⚠️ Upload completely failed - using data URL fallback');
      return await convertToDataUrl(file);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
    },
    maxFiles: 1,
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setIsProcessing(true);
        try {
          const file = acceptedFiles[0];
          const url = await uploadToSupabase(file);
          onImageUpload(file, url);
        } catch (error) {
          console.error('Error processing image:', error);
          alert('Failed to process image. Please try again.');
        } finally {
          setIsProcessing(false);
        }
      }
      setIsDragOver(false);
    },
    onDragEnter: () => setIsDragOver(true),
    onDragLeave: () => setIsDragOver(false),
  });

  if (currentImage) {
    return (
      <div className={`relative ${className}`}>
        <img
          src={currentImage}
          alt="Campaign image"
          className="w-full h-full object-cover rounded-lg"
        />
        {onRemoveImage && (
          <button
            onClick={onRemoveImage}
            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`
        ${className}
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
        ${isDragActive || isDragOver 
          ? 'border-blue-600 bg-blue-50' 
          : 'border-gray-300 hover:border-gray-400'
        }
        ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} disabled={isProcessing} />
      
      <div className="flex flex-col items-center space-y-4">
        <div className={`p-3 rounded-full ${isDragActive || isDragOver ? 'bg-blue-100' : 'bg-gray-100'}`}>
          {isProcessing ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          ) : isDragActive || isDragOver ? (
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z" />
            </svg>
          )}
        </div>
        
        <div>
          <p className="text-lg font-medium text-gray-900 mb-1">
            {isProcessing ? 'Processing image...' : isDragActive ? 'Drop your image here' : 'Upload campaign image'}
          </p>
          <p className="text-sm text-gray-500">
            {isProcessing 
              ? 'Please wait...' 
              : isDemoMode() 
                ? 'Drag and drop or click to select (Demo mode - using data URLs)'
                : 'Drag and drop or click to select (JPEG, PNG, GIF, WebP)'
            }
          </p>
        </div>
      </div>
    </div>
  );
} 
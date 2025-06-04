'use client';

import { useDropzone } from 'react-dropzone';
import { useState } from 'react';

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onImageUpload(acceptedFiles[0]);
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
      `}
    >
      <input {...getInputProps()} />
      
      <div className="flex flex-col items-center space-y-4">
        <div className={`p-3 rounded-full ${isDragActive || isDragOver ? 'bg-blue-100' : 'bg-gray-100'}`}>
          {isDragActive || isDragOver ? (
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </div>
        
        <div>
          <p className="text-lg font-medium text-gray-900 mb-1">
            {isDragActive ? 'Drop your image here' : 'Upload campaign image'}
          </p>
          <p className="text-sm text-gray-500">
            Drag and drop or click to select (JPEG, PNG, GIF, WebP)
          </p>
        </div>
      </div>
    </div>
  );
}

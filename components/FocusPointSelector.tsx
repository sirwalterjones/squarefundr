'use client';

import { useState, useRef } from 'react';

interface FocusPointSelectorProps {
  imageUrl: string;
  onFocusPointChange: (focusPoint: { x: number; y: number }) => void;
  initialFocusPoint?: { x: number; y: number };
  className?: string;
}

export default function FocusPointSelector({
  imageUrl,
  onFocusPointChange,
  initialFocusPoint = { x: 0.5, y: 0.3 },
  className = ''
}: FocusPointSelectorProps) {
  const [focusPoint, setFocusPoint] = useState(initialFocusPoint);
  const [isDragging, setIsDragging] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    const newFocusPoint = {
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y))
    };

    setFocusPoint(newFocusPoint);
    onFocusPointChange(newFocusPoint);
  };

  const presetPoints = [
    { name: 'Top Center', point: { x: 0.5, y: 0.2 } },
    { name: 'Upper Center', point: { x: 0.5, y: 0.3 } },
    { name: 'Center', point: { x: 0.5, y: 0.5 } },
    { name: 'Lower Center', point: { x: 0.5, y: 0.7 } },
    { name: 'Top Left', point: { x: 0.3, y: 0.3 } },
    { name: 'Top Right', point: { x: 0.7, y: 0.3 } },
  ];

  const handlePresetClick = (preset: { x: number; y: number }) => {
    setFocusPoint(preset);
    onFocusPointChange(preset);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Social Media Preview Focus Point
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Click on the image to set where social media platforms should focus when cropping your image for previews.
        </p>
      </div>

      {/* Image with focus point overlay */}
      <div className="relative">
        <div
          ref={imageRef}
          className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden cursor-crosshair border-2 border-gray-200 hover:border-blue-300 transition-colors"
          onClick={handleClick}
        >
          <img
            src={imageUrl}
            alt="Focus point selector"
            className="w-full h-full object-cover"
            draggable={false}
          />
          
          {/* Focus point indicator */}
          <div
            className="absolute w-6 h-6 bg-blue-500 border-2 border-white rounded-full shadow-lg transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              left: `${focusPoint.x * 100}%`,
              top: `${focusPoint.y * 100}%`
            }}
          >
            <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75"></div>
          </div>

          {/* Preview crop area overlay */}
          <div className="absolute inset-0 pointer-events-none">
            {/* This shows roughly how social media platforms might crop */}
            <div 
              className="absolute border-2 border-yellow-400 border-dashed bg-yellow-400 bg-opacity-10"
              style={{
                left: `${Math.max(0, focusPoint.x * 100 - 25)}%`,
                top: `${Math.max(0, focusPoint.y * 100 - 15)}%`,
                width: '50%',
                height: '30%',
                minWidth: '200px',
                minHeight: '100px'
              }}
            >
              <div className="absolute -top-6 left-0 text-xs text-yellow-600 font-medium bg-white px-1 rounded">
                Preview Crop Area
              </div>
            </div>
          </div>
        </div>

        {/* Current coordinates display */}
        <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
          {Math.round(focusPoint.x * 100)}%, {Math.round(focusPoint.y * 100)}%
        </div>
      </div>

      {/* Preset buttons */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Quick Presets:</p>
        <div className="grid grid-cols-3 gap-2">
          {presetPoints.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handlePresetClick(preset.point)}
              className={`px-3 py-2 text-xs border rounded-lg transition-colors ${
                focusPoint.x === preset.point.x && focusPoint.y === preset.point.y
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Social media preview simulation */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Social Media Preview Simulation:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Facebook-style preview */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="h-24 bg-gray-100 overflow-hidden">
              <img
                src={imageUrl}
                alt="Facebook preview"
                className="w-full h-full object-cover"
                style={{
                  objectPosition: `${focusPoint.x * 100}% ${focusPoint.y * 100}%`
                }}
              />
            </div>
            <div className="p-2">
              <p className="text-xs font-medium text-gray-900 truncate">Campaign Title</p>
              <p className="text-xs text-gray-500">squarefundr.com</p>
            </div>
          </div>

          {/* Twitter-style preview */}
          <div className="bg-white border rounded-lg overflow-hidden">
            <div className="h-24 bg-gray-100 overflow-hidden">
              <img
                src={imageUrl}
                alt="Twitter preview"
                className="w-full h-full object-cover"
                style={{
                  objectPosition: `${focusPoint.x * 100}% ${focusPoint.y * 100}%`
                }}
              />
            </div>
            <div className="p-2">
              <p className="text-xs font-medium text-gray-900 truncate">Campaign Title</p>
              <p className="text-xs text-gray-500">Support this fundraiser...</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
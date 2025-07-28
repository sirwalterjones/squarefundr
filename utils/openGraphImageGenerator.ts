/**
 * Utility for generating optimized Open Graph images
 * Handles positioning, cropping, and text overlays for social media previews
 */

export interface OpenGraphImageOptions {
  sourceImageUrl: string;
  title: string;
  description?: string;
  focusPoint?: {
    x: number; // 0-1, where 0.5 is center
    y: number; // 0-1, where 0.5 is center
  };
  overlay?: {
    backgroundColor?: string;
    textColor?: string;
    opacity?: number;
  };
}

/**
 * Generate an optimized Open Graph image URL with positioning controls
 */
export function generateOpenGraphImageUrl(options: OpenGraphImageOptions): string {
  const {
    sourceImageUrl,
    title,
    description,
    focusPoint = { x: 0.5, y: 0.3 }, // Default to upper-center for better face/subject positioning
    overlay = {}
  } = options;

  // If using Unsplash, we can use their URL parameters for smart cropping
  if (sourceImageUrl.includes('unsplash.com')) {
    const baseUrl = sourceImageUrl.split('?')[0];
    const focusParams = `&fp-x=${focusPoint.x}&fp-y=${focusPoint.y}`;
    return `${baseUrl}?w=1200&h=630&fit=crop&auto=format${focusParams}`;
  }

  // If using Supabase storage, we'll need to implement server-side image processing
  if (sourceImageUrl.includes('supabase')) {
    // For now, return the original URL - we'd need to implement image processing
    return sourceImageUrl;
  }

  // For other images, return as-is
  return sourceImageUrl;
}

/**
 * Generate Open Graph image with text overlay using a service like Bannerbear or custom implementation
 */
export function generateOpenGraphImageWithOverlay(options: OpenGraphImageOptions): string {
  // This would integrate with a service like:
  // - Bannerbear API
  // - Cloudinary's text overlay features
  // - Custom Next.js API route with canvas/sharp
  
  // For now, return the basic optimized image
  return generateOpenGraphImageUrl(options);
}

/**
 * Smart crop suggestions based on image analysis
 */
export function suggestFocusPoint(imageUrl: string): Promise<{ x: number; y: number }> {
  // This could integrate with:
  // - Google Cloud Vision API for face detection
  // - AWS Rekognition
  // - Custom ML model for subject detection
  
  return Promise.resolve({ x: 0.5, y: 0.3 }); // Default upper-center
}

/**
 * Generate multiple Open Graph image variants for A/B testing
 */
export function generateOpenGraphVariants(options: OpenGraphImageOptions) {
  const variants = [
    { ...options, focusPoint: { x: 0.5, y: 0.2 } }, // Top center
    { ...options, focusPoint: { x: 0.5, y: 0.3 } }, // Upper center  
    { ...options, focusPoint: { x: 0.5, y: 0.5 } }, // Center
    { ...options, focusPoint: { x: 0.3, y: 0.3 } }, // Left upper
    { ...options, focusPoint: { x: 0.7, y: 0.3 } }, // Right upper
  ];

  return variants.map(variant => ({
    url: generateOpenGraphImageUrl(variant),
    description: `Focus: ${Math.round(variant.focusPoint!.x * 100)}% right, ${Math.round(variant.focusPoint!.y * 100)}% down`
  }));
} 
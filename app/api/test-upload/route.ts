import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided',
        details: 'Please select a file to upload'
      }, { status: 400 });
    }

    // Check file size (in MB)
    const fileSizeMB = file.size / (1024 * 1024);
    
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const isValidType = allowedTypes.includes(file.type);
    
    // Get device info from headers
    const userAgent = request.headers.get('user-agent') || '';
    const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
    
    const analysis = {
      fileName: file.name,
      fileSize: file.size,
      fileSizeMB: Math.round(fileSizeMB * 100) / 100,
      fileType: file.type,
      isValidType,
      isMobile,
      userAgent: userAgent.substring(0, 100) + '...',
      lastModified: new Date(file.lastModified).toISOString(),
      recommendations: [] as string[]
    };

    // Add recommendations based on analysis
    if (fileSizeMB > 10) {
      analysis.recommendations.push('File is larger than 10MB limit. Please compress or resize the image.');
    } else if (fileSizeMB > 5) {
      analysis.recommendations.push('Large file detected. Consider compressing for faster upload.');
    }
    
    if (!isValidType) {
      analysis.recommendations.push(`Invalid file type: ${file.type}. Please use JPEG, PNG, GIF, or WebP format.`);
    }
    
    if (isMobile && fileSizeMB > 2) {
      analysis.recommendations.push('Mobile photo detected. Large mobile photos may take longer to upload.');
    }
    
    if (analysis.recommendations.length === 0) {
      analysis.recommendations.push('File looks good for upload!');
    }

    return NextResponse.json({
      success: true,
      analysis,
      message: 'File analysis complete'
    });

  } catch (error) {
    console.error('Test upload error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to analyze file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 
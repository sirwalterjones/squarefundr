# SquareFundr Troubleshooting Guide

## Campaign Creation Issues

### Problem: Campaign creation takes forever or times out

**Causes:**
- Large grid sizes (e.g., 50x50 = 2500 squares) take time to create
- Database timeouts during square generation
- Network connectivity issues

**Solutions:**
1. **Start with smaller grids**: Try 10x10 or 20x20 grids first
2. **Grid size limits**: Maximum allowed is 100x100 or 2500 total squares
3. **Wait for completion**: Large grids may take up to 30 seconds
4. **Check network**: Ensure stable internet connection

### Problem: Campaign created but no squares visible

**Causes:**
- Square creation failed after campaign was created
- Grid overlay not loading properly

**Solutions:**
1. Refresh the page and check again
2. Use the `/api/fix-campaign-squares` endpoint to regenerate squares
3. Contact support if issue persists

## Photo Upload Issues

### Problem: Mobile photos won't upload or take too long

**Causes:**
- Large file sizes (mobile photos can be 5-15MB)
- Slow network connections
- Unsupported file formats

**Solutions:**
1. **Compress photos before upload**:
   - iOS: Use "Optimize iPhone Storage" in Photos settings
   - Android: Use built-in photo editor to reduce size
   
2. **File size limits**:
   - Maximum: 10MB per file
   - Recommended: Under 2MB for best performance
   - Auto-compression kicks in for files over 2MB

3. **Supported formats**:
   - JPEG/JPG ✅
   - PNG ✅
   - GIF ✅
   - WebP ✅
   - HEIC ❌ (convert to JPEG first)

### Problem: Upload fails with error messages

**Common errors and solutions:**
- "File too large": Compress image below 10MB
- "Invalid file type": Convert to JPEG, PNG, GIF, or WebP
- "Network error": Check internet connection and try again

## Testing Your Uploads

Use the test endpoint to diagnose upload issues:

```bash
# Test your file
curl -X POST /api/test-upload -F "file=@your-image.jpg"
```

This will analyze your file and provide recommendations.

## Performance Optimizations Applied

### Campaign Creation
- **Batch processing**: Squares inserted in batches of 50 (down from 100)
- **Timeout handling**: 30-second timeout for API routes
- **Bulk insert**: Large grids use optimized SQL for faster creation
- **Grid size validation**: Prevents extremely large grids that cause timeouts

### Image Upload
- **Auto-compression**: Files over 2MB are automatically compressed
- **Progressive loading**: Better feedback during upload process
- **Error handling**: Clear error messages for common issues
- **Mobile optimization**: Special handling for large mobile photos

## Browser Compatibility

**Recommended browsers:**
- Chrome 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅
- Edge 90+ ✅

**Known issues:**
- Older browsers may have file upload limitations
- iOS Safari < 14 may have compression issues

## Getting Help

If you continue experiencing issues:

1. Check browser console for error messages
2. Try a different browser or device
3. Test with the `/api/test-upload` endpoint
4. Contact support with specific error messages

## Recent Improvements (Latest Update)

✅ Added file size limits and validation
✅ Implemented auto-compression for large images
✅ Optimized campaign creation for large grids
✅ Added better error messages and user feedback
✅ Improved mobile photo upload handling
✅ Added timeout configurations for API routes 
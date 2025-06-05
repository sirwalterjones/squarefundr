import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

interface ImageUploaderProps {
  onImageUpload: (file: File, url: string) => void;
} 
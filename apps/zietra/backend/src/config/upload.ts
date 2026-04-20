/**
 * File Upload Configuration
 * Centralized configuration for file uploads, sizes, and limits
 */

export const UPLOAD_CONFIG = {
  // Maximum file size (in bytes)
  maxFileSize: Number.parseInt(process.env.MAX_UPLOAD_SIZE_MB || '10') * 1024 * 1024,

  // Maximum number of files per upload
  maxFiles: Number.parseInt(process.env.MAX_CSV_FILES || '10'),

  // Upload directory
  uploadDir: process.env.UPLOAD_DIR || 'uploads/csv/',

  // Allowed file types
  allowedMimeTypes: [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
};

/**
 * Get multer configuration
 */
export function getMulterConfig() {
  return {
    limits: {
      fileSize: UPLOAD_CONFIG.maxFileSize,
      files: UPLOAD_CONFIG.maxFiles,
    },
  };
}

"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Image as ImageIcon,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Camera,
  Sparkles,
} from "lucide-react";
import { useUpload } from "../../hooks/useUpload";
import { motion, AnimatePresence } from "framer-motion";

interface FileUploaderProps {
  onUploadSuccess?: (url: string) => void;
  onFileSelect?: (file: File | null) => void;
  onCancel?: () => void;
  folder?: string;
  label?: string;
  previewUrl?: string;
  id?: string;
  uploadButtonText?: string;
}

export default function FileUploader({
  onUploadSuccess,
  onFileSelect,
  onCancel,
  folder = "general",
  label = "Upload Image",
  previewUrl: initialPreview,
  id,
  uploadButtonText = "Save Image",
}: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initialPreview || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useUpload();
  useEffect(() => {
    return () => {
      if (preview && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreview(objectUrl);
      onFileSelect?.(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    uploadMutation.mutate(
      { file, folder },
      {
        onSuccess: (data) => {
          onUploadSuccess?.(data.url);
          setFile(null);
        },
      },
    );
  };

  const handleRemove = () => {
    setFile(null);
    setPreview(initialPreview || null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onFileSelect?.(null);
    onCancel?.();
  };

  return (
    <div className="flex flex-col gap-5 p-6 rounded-2xl bg-white/40 backdrop-blur-md border border-white/20 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Camera size={18} />
          </div>
          <label className="text-sm font-bold text-gray-800 tracking-tight">
            {label}
          </label>
        </div>
        {file && !uploadMutation.isPending && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={handleRemove}
            className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X size={14} className="text-gray-500" />
          </motion.button>
        )}
      </div>

      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="relative group flex flex-col items-center justify-center min-h-[140px] border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden hover:border-primary/50 transition-all duration-300 bg-gray-50/30"
      >
        <AnimatePresence mode="wait">
          {preview ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full h-full flex items-center justify-center p-2"
            >
              <div className="relative w-full aspect-square max-w-[160px] rounded-xl overflow-hidden shadow-2xl border-2 border-white">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                {uploadMutation.isPending && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-sm">
                    <Loader2
                      className="animate-spin text-white"
                      size={32}
                      strokeWidth={3}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center cursor-pointer py-8"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center mb-4 group-hover:from-primary group-hover:to-primary-hover group-hover:text-white transition-all duration-300">
                <ImageIcon
                  size={32}
                  strokeWidth={1.5}
                  className="text-primary group-hover:text-white"
                />
              </div>
              <p className="text-sm font-bold text-gray-700">
                Click to select photo
              </p>
              <p className="text-xs text-gray-400 mt-1">
                SVG, PNG, JPG (max. 5MB)
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <input
          type="file"
          id={id}
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
      </motion.div>

      <AnimatePresence>
        {file && !uploadMutation.isPending && !uploadMutation.isSuccess && (
          <div className="flex flex-col gap-2">
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={handleUpload}
              className="w-full py-3 bg-gradient-to-r from-primary to-primary-hover text-white rounded-xl font-bold shadow-lg shadow-primary/25 flex items-center justify-center gap-2 hover:brightness-110 transition-all"
            >
              <Sparkles size={18} />
              {uploadButtonText}
            </motion.button>
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={handleRemove}
              className="w-full py-2 text-gray-500 hover:text-gray-700 font-bold transition-all text-sm"
            >
              Cancel
            </motion.button>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {uploadMutation.isSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 text-green-600 bg-green-50/80 backdrop-blur-sm p-3 rounded-xl text-sm font-bold border border-green-100"
          >
            <CheckCircle size={18} />
            <span>Photo uploaded successfully!</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {uploadMutation.isError && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 text-red-600 bg-red-50/80 backdrop-blur-sm p-3 rounded-xl text-sm font-bold border border-red-100"
          >
            <AlertCircle size={18} />
            <span>Upload failed. Please try again.</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

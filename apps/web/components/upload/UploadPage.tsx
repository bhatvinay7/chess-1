"use client";

import React, { useState } from "react";
import FileUploader from "../common/FileUploader";
import { useMultipleUpload } from "../../hooks/useUpload";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Image as ImageIcon,
  Loader2,
  CheckCircle,
} from "lucide-react";
import styles from "./Upload.module.css";

export default function UploadPage() {
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const multipleUpload = useMultipleUpload();

  const handleMultipleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      multipleUpload.mutate(
        { files, folder: "bulk_uploads" },
        {
          onSuccess: (data) => {
            setUploadedUrls((prev) => [
              ...prev,
              ...data.files.map((f) => f.url),
            ]);
          },
        },
      );
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={styles.badge}
          >
            <Sparkles size={16} />
            Powered by Cloudinary
          </motion.div>
          <h1 className={styles.title}>
            Media <span className={styles.gradientText}>Studio</span>
          </h1>
          <p className={styles.subtitle}>
            Seamlessly upload, manage, and optimize your assets with our
            lightning-fast media engine.
          </p>
        </div>

        <div className={styles.grid}>
          {/* Single Upload Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col"
          >
            <div className={styles.cardHeader}>
              <div className={styles.indicator} />
              <h2 className={styles.cardTitle}>Single</h2>
            </div>
            <FileUploader
              label="Avatar"
              folder="avatars"
              onUploadSuccess={(url) =>
                setUploadedUrls((prev) => [...prev, url])
              }
            />
          </motion.div>

          {/* Bulk Upload Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col"
          >
            <div className={styles.cardHeader}>
              <div className={styles.indicator} />
              <h2 className={styles.cardTitle}>Batch</h2>
            </div>
            <div className="flex flex-col gap-4 sm:gap-5 p-4 sm:p-6 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-xl min-h-[240px] sm:min-h-[300px] h-full justify-center">
              <div
                className={styles.dropzone}
                onClick={() => document.getElementById("bulk-upload")?.click()}
              >
                <div className={styles.dropIconWrap}>
                  <ImageIcon size={28} className="text-orange-500" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold">Drop files here</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-wider">
                    Multiple Assets
                  </p>
                </div>
                <input
                  type="file"
                  multiple
                  onChange={handleMultipleFiles}
                  className="hidden"
                  id="bulk-upload"
                />
              </div>

              {multipleUpload.isPending && (
                <div className="flex items-center justify-center gap-2 py-2 bg-primary/5 rounded-xl border border-primary/10">
                  <Loader2 className="animate-spin text-primary" size={14} />
                  <p className="text-[10px] font-bold text-primary uppercase">
                    Processing...
                  </p>
                </div>
              )}

              {multipleUpload.isSuccess && (
                <div className="flex items-center justify-center gap-2 py-2 bg-green-500/10 rounded-xl border border-green-500/20">
                  <CheckCircle className="text-green-500" size={14} />
                  <p className="text-[10px] font-bold text-green-400 uppercase">
                    Uploaded {multipleUpload.data.files.length} items
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {uploadedUrls.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-12 sm:mt-24"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 sm:mb-10">
              <h3 className="text-2xl sm:text-3xl font-black">
                Recent <span className="text-gray-400">Library</span>
              </h3>
              <div className="px-4 py-1 bg-white/10 rounded-full text-xs font-bold uppercase tracking-widest">
                {uploadedUrls.length} ITEMS
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6">
              <AnimatePresence>
                {uploadedUrls.map((url, i) => (
                  <motion.div
                    key={url}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="aspect-square rounded-3xl overflow-hidden border border-white/20 shadow-lg group relative"
                  >
                    <img
                      src={url}
                      alt="Uploaded"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-4">
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-white/20 backdrop-blur-md py-2 rounded-xl text-[10px] text-white font-bold text-center hover:bg-white/30 transition-colors"
                      >
                        OPEN ORIGINAL
                      </a>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

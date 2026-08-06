import { useMutation } from "@tanstack/react-query";
import {
  uploadFile,
  uploadMultipleFiles,
  UploadResponse,
  MultipleUploadResponse,
} from "../app/lib/api/upload";

export const useUpload = () => {
  return useMutation<UploadResponse, Error, { file: File; folder?: string }>({
    mutationFn: ({ file, folder }) => uploadFile(file, folder),
  });
};

export const useMultipleUpload = () => {
  return useMutation<
    MultipleUploadResponse,
    Error,
    { files: File[]; folder?: string }
  >({
    mutationFn: ({ files, folder }) => uploadMultipleFiles(files, folder),
  });
};

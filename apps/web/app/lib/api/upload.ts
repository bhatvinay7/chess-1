import axiosInstance from "../axio";

export interface UploadResponse {
  message: string;
  url: string;
  publicId: string;
}

export interface MultipleUploadResponse {
  message: string;
  files: Array<{
    url: string;
    publicId: string;
  }>;
}

export const uploadFile = async (
  file: File,
  folder?: string,
): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append("file", file);
  if (folder) {
    formData.append("folder", folder);
  }

  const { data } = await axiosInstance.post<UploadResponse>(
    "/upload/single",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return data;
};

export const uploadMultipleFiles = async (
  files: File[],
  folder?: string,
): Promise<MultipleUploadResponse> => {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  if (folder) {
    formData.append("folder", folder);
  }

  const { data } = await axiosInstance.post<MultipleUploadResponse>(
    "/upload/multiple",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return data;
};

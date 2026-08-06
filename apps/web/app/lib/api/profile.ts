import axiosInstance from "../axio";
import { UserProfile, UpdateProfileRequest } from "../../../types/profile";

export const getProfile = async (userId: string): Promise<UserProfile> => {
  const { data } = await axiosInstance.get(`/profile/${userId}`);
  return data;
};

export const updateProfile = async (
  userId: string,
  profileData: UpdateProfileRequest,
): Promise<UserProfile> => {
  const { data } = await axiosInstance.put(`/profile/${userId}`, profileData);
  return data;
};

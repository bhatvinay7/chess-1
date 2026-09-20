"use client";

import { useState, useCallback } from "react";
import axio from "../app/lib/axio";

export interface InvitePayload {
  timeControl: string;
  gameMode: string;
  scheduledTime: string;
  color: "white" | "black" | "random";
}

export interface Invite {
  id: string;
  senderId: string;
  receiverId: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "PROCESSED";
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  payload: InvitePayload | null;
  sender?: {
    id: string;
    username: string;
    profileImageUrl?: string | null;
    rating?: number;
  };
  receiver?: {
    id: string;
    username: string;
    profileImageUrl?: string | null;
    rating?: number;
  };
}

export interface Notification {
  id: string;
  type: string;
  message: string;
  metadata: Record<string, any> | null;
  isRead: boolean;
  createdAt: string;
}

const OPT = { withCredentials: true };

export function useInvites() {
  const [sentInvites, setSentInvites] = useState<Invite[]>([]);
  const [receivedInvites, setReceivedInvites] = useState<Invite[]>([]);
  const [loadingSent, setLoadingSent] = useState(false);
  const [loadingReceived, setLoadingReceived] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSent = useCallback(async () => {
    setLoadingSent(true);
    try {
      const res = await axio.get(`/invites/sent`, OPT);
      setSentInvites(res.data ?? []);
    } catch {
      setError("Failed to load sent invites.");
    } finally {
      setLoadingSent(false);
    }
  }, []);

  const fetchReceived = useCallback(async () => {
    setLoadingReceived(true);
    try {
      const res = await axio.get(`/invites/received`, OPT);
      setReceivedInvites(res.data ?? []);
    } catch {
      setError("Failed to load received invites.");
    } finally {
      setLoadingReceived(false);
    }
  }, []);

  const sendInvite = useCallback(
    async (body: {
      receiverId: string;
      timeControl: string;
      gameMode: string;
      color: string;
      scheduledTime: string;
    }) => {
      await axio.post(`/invites`, body, OPT);
    },
    [],
  );

  const acceptInvite = useCallback(
    async (id: string) => {
      setActionLoading(id);
      try {
        await axio.post(`/invites/${id}/accept`, {}, OPT);
        await fetchReceived();
      } finally {
        setActionLoading(null);
      }
    },
    [fetchReceived],
  );

  const rejectInvite = useCallback(
    async (id: string) => {
      setActionLoading(id);
      try {
        await axio.post(`/invites/${id}/reject`, {}, OPT);
        await fetchReceived();
      } finally {
        setActionLoading(null);
      }
    },
    [fetchReceived],
  );

  return {
    sentInvites,
    receivedInvites,
    loadingSent,
    loadingReceived,
    actionLoading,
    error,
    fetchSent,
    fetchReceived,
    sendInvite,
    acceptInvite,
    rejectInvite,
  };
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axio.get(`/notifications`, OPT);
      const data: Notification[] = res.data ?? [];
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.isRead).length);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    await axio.patch(`/notifications/${id}/read`, {}, OPT);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    await axio.patch(`/notifications/read-all`, {}, OPT);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    loading,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
}

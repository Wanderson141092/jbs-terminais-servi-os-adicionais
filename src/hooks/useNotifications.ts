import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useNotifications = (userId: string | null) => {
  const permissionRef = useRef<NotificationPermission>("default");

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      console.log("This browser does not support notifications");
      return false;
    }

    if (Notification.permission === "granted") {
      permissionRef.current = "granted";
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      permissionRef.current = permission;
      return permission === "granted";
    }

    return false;
  }, []);

  // Show native notification
  const showNativeNotification = useCallback(
    (title: string, body: string, onClick?: () => void) => {
      if (permissionRef.current !== "granted") {
        return;
      }

      const notification = new Notification(title, {
        body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: `jbs-${Date.now()}`,
        requireInteraction: true,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        onClick?.();
      };

      // Auto close after 10 seconds
      setTimeout(() => notification.close(), 10000);
    },
    []
  );

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!userId) return;

    requestPermission();

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `usuario_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as any;
          
          // Show native notification
          showNativeNotification(
            "JBS Terminais - Nova Notificação",
            notification.mensagem,
            () => {
              // Mark as read when clicked
              supabase
                .from("notifications")
                .update({ lida: true })
                .eq("id", notification.id);
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, requestPermission, showNativeNotification]);

  return { requestPermission, showNativeNotification };
};

export default useNotifications;

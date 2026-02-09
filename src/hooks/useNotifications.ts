import { useEffect, useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useNotifications = (userId: string | null) => {
  const permissionRef = useRef<NotificationPermission>("default");
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Request notification permission immediately and show prompt
  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      console.log("This browser does not support notifications");
      toast.error("Seu navegador não suporta notificações nativas");
      return false;
    }

    if (Notification.permission === "granted") {
      permissionRef.current = "granted";
      setPermissionGranted(true);
      return true;
    }

    if (Notification.permission === "denied") {
      toast.error("Notificações bloqueadas. Habilite nas configurações do navegador.");
      return false;
    }

    // Show request dialog
    try {
      const permission = await Notification.requestPermission();
      permissionRef.current = permission;
      setPermissionGranted(permission === "granted");
      
      if (permission === "granted") {
        toast.success("Notificações ativadas! Você receberá alertas de novos pedidos.");
        // Show test notification
        new Notification("JBS Terminais - Notificações Ativadas", {
          body: "Você receberá alertas sobre novos pedidos e atualizações.",
          icon: "/favicon.ico",
          requireInteraction: false,
        });
      } else {
        toast.warning("Notificações não habilitadas. Você pode perder alertas importantes.");
      }
      
      return permission === "granted";
    } catch (err) {
      console.error("Error requesting notification permission:", err);
      return false;
    }
  }, []);

  // Show native notification with sound
  const showNativeNotification = useCallback(
    (title: string, body: string, onClick?: () => void) => {
      if (permissionRef.current !== "granted") {
        // Fallback to toast if no permission
        toast.info(body, { duration: 10000 });
        return;
      }

      try {
        const notification = new Notification(title, {
          body,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          tag: `jbs-${Date.now()}`,
          requireInteraction: true,
          silent: false, // Allow sound
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
          onClick?.();
        };

        // Also show toast for visibility
        toast.info(body, {
          duration: 8000,
          action: {
            label: "Ver",
            onClick: () => onClick?.(),
          },
        });

        // Auto close after 15 seconds
        setTimeout(() => notification.close(), 15000);
      } catch (err) {
        console.error("Error showing notification:", err);
        toast.info(body, { duration: 10000 });
      }
    },
    []
  );

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!userId) return;

    // Request permission on mount
    requestPermission();

    const channel = supabase
      .channel(`notifications-realtime-${userId}`)
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
          
          // Show native notification immediately
          showNativeNotification(
            "🔔 JBS Terminais - Nova Notificação",
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
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Subscribed to notifications realtime");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, requestPermission, showNativeNotification]);

  return { requestPermission, showNativeNotification, permissionGranted };
};

export default useNotifications;

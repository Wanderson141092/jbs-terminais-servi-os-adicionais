import { useEffect, useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Play a notification sound
const playNotificationSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
    oscillator.frequency.setValueAtTime(1100, audioCtx.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.2);
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.5);
  } catch (e) {
    console.warn("Could not play notification sound:", e);
  }
};

export const useNotifications = (userId: string | null) => {
  const permissionRef = useRef<NotificationPermission>("default");
  const [permissionGranted, setPermissionGranted] = useState(false);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      console.log("This browser does not support notifications");
      return false;
    }

    if (Notification.permission === "granted") {
      permissionRef.current = "granted";
      setPermissionGranted(true);
      return true;
    }

    if (Notification.permission === "denied") {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      permissionRef.current = permission;
      setPermissionGranted(permission === "granted");
      
      if (permission === "granted") {
        new Notification("JBS Terminais - Notificações Ativadas", {
          body: "Você receberá alertas sobre novos pedidos e atualizações.",
          icon: "/favicon.ico",
        });
      }
      
      return permission === "granted";
    } catch (err) {
      console.error("Error requesting notification permission:", err);
      return false;
    }
  }, []);

  const showNativeNotification = useCallback(
    (title: string, body: string, onClick?: () => void) => {
      // Always play sound
      playNotificationSound();

      // Always show prominent in-app toast (works everywhere)
      toast(body, {
        duration: 15000,
        position: "top-center",
        style: {
          background: "#DC2626",
          color: "#FFFFFF",
          border: "2px solid #B91C1C",
          fontWeight: "600",
          fontSize: "14px",
          padding: "16px 20px",
          boxShadow: "0 8px 32px rgba(220,38,38,0.4)",
          zIndex: 999999,
        },
        action: onClick
          ? {
              label: "Ver",
              onClick: () => onClick(),
            }
          : undefined,
      });

      // Try OS-level notification
      if ("Notification" in window && Notification.permission === "granted") {
        try {
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

          setTimeout(() => notification.close(), 20000);
        } catch (err) {
          console.warn("Native notification failed:", err);
        }
      }

      // Try vibration on mobile
      if ("vibrate" in navigator) {
        try { navigator.vibrate([200, 100, 200]); } catch {}
      }
    },
    []
  );

  useEffect(() => {
    if (!userId) return;

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
          
          showNativeNotification(
            "🔔 JBS Terminais - Nova Notificação",
            notification.mensagem,
            () => {
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

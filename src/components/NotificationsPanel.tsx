import { useState, useEffect } from "react";
import { X, Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface NotificationsPanelProps {
  userId: string;
  onClose: () => void;
}

const NotificationsPanel = ({ userId, onClose }: NotificationsPanelProps) => {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("usuario_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      setNotifications(data || []);
    };
    fetch();
  }, [userId]);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ lida: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
    );
  };

  const markAllRead = async () => {
    await supabase.from("notifications").update({ lida: true }).eq("usuario_id", userId).eq("lida", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, lida: true })));
  };

  return (
    <Card className="mb-6 border-0 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bell className="h-4 w-4" /> Notificações
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs">
            <Check className="h-3 w-3 mr-1" /> Marcar todas como lidas
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="max-h-64 overflow-auto space-y-2 py-0 pb-4">
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma notificação.</p>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-3 rounded-lg text-sm cursor-pointer transition-colors ${
                n.lida ? "bg-muted/30" : "bg-secondary/10 border border-secondary/20"
              }`}
              onClick={() => !n.lida && markRead(n.id)}
            >
              <p className={n.lida ? "text-muted-foreground" : "text-foreground font-medium"}>
                {n.mensagem}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {new Date(n.created_at).toLocaleString("pt-BR")}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationsPanel;

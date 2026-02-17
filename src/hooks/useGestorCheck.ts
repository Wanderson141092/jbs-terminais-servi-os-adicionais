import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useGestorCheck = (userId: string | null) => {
  const [isGestor, setIsGestor] = useState(false);
  const [gestorLoading, setGestorLoading] = useState(true);
  const [gestorSetorEmail, setGestorSetorEmail] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      if (!userId) {
        setIsGestor(false);
        setGestorLoading(false);
        return;
      }

      // Check user_roles for 'gestor' role
      const [rolesRes, profileRes] = await Promise.all([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .eq("role", "gestor")
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("email_setor")
          .eq("id", userId)
          .maybeSingle(),
      ]);

      setIsGestor(!!rolesRes.data);
      setGestorSetorEmail(profileRes.data?.email_setor || null);
      setGestorLoading(false);
    };

    check();
  }, [userId]);

  return { isGestor, gestorLoading, gestorSetorEmail };
};

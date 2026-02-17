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

      const { data: profile } = await supabase
        .from("profiles")
        .select("email_setor, setor_emails(perfis)")
        .eq("id", userId)
        .maybeSingle();

      const perfis = (profile as any)?.setor_emails?.perfis || [];
      setIsGestor(perfis.includes("GESTOR"));
      setGestorSetorEmail(profile?.email_setor || null);
      setGestorLoading(false);
    };

    check();
  }, [userId]);

  return { isGestor, gestorLoading, gestorSetorEmail };
};

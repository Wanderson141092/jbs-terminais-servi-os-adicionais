import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface RoleCheckResult {
  isAdmin: boolean;
  isGestor: boolean;
  gestorSetorEmail: string | null;
  loading: boolean;
}

export const useRoleCheck = (userId: string | null): RoleCheckResult => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGestor, setIsGestor] = useState(false);
  const [gestorSetorEmail, setGestorSetorEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      // null = session not yet loaded → keep loading: true
      if (userId === null) {
        setLoading(true);
        return;
      }
      // empty string = confirmed no session → resolve as no roles
      if (userId === "") {
        setIsAdmin(false);
        setIsGestor(false);
        setGestorSetorEmail(null);
        setLoading(false);
        return;
      }

      const [rolesRes, profileRes] = await Promise.all([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId),
        supabase
          .from("profiles")
          .select("email_setor")
          .eq("id", userId)
          .maybeSingle(),
      ]);

      const roles = new Set((rolesRes.data || []).map((r: any) => r.role));
      setIsAdmin(roles.has("admin"));
      setIsGestor(roles.has("gestor"));
      setGestorSetorEmail(profileRes.data?.email_setor || null);
      setLoading(false);
    };

    check();
  }, [userId]);

  return { isAdmin, isGestor, gestorSetorEmail, loading };
};

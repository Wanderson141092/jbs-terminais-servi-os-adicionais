import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// This page now redirects to the home page since login is handled via the overlay
const InternoLogin = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/interno/dashboard");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/interno/dashboard");
      } else {
        // Redirect to home page where the login overlay is available
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return null;
};

export default InternoLogin;

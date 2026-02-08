import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Settings, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Config {
  id: string;
  config_key: string;
  config_value: string | null;
  config_type: string;
  description: string | null;
  is_active: boolean;
}

const AdminParametros = () => {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    const { data, error } = await supabase
      .from("system_config")
      .select("*")
      .order("config_key");

    if (error) {
      toast.error("Erro ao carregar configurações");
    } else {
      setConfigs(data || []);
    }
    setLoading(false);
  };

  const updateConfig = (id: string, value: string) => {
    setConfigs(configs.map(c => c.id === id ? { ...c, config_value: value } : c));
  };

  const toggleActive = (id: string) => {
    setConfigs(configs.map(c => c.id === id ? { ...c, is_active: !c.is_active } : c));
  };

  const saveConfigs = async () => {
    setSaving(true);
    
    for (const config of configs) {
      const { error } = await supabase
        .from("system_config")
        .update({
          config_value: config.config_value,
          is_active: config.is_active,
          updated_at: new Date().toISOString()
        })
        .eq("id", config.id);

      if (error) {
        toast.error(`Erro ao salvar ${config.config_key}`);
        setSaving(false);
        return;
      }
    }

    toast.success("Configurações salvas com sucesso!");
    setSaving(false);
  };

  const getInputType = (configType: string) => {
    switch (configType) {
      case "number": return "number";
      case "time": return "time";
      case "url": return "url";
      default: return "text";
    }
  };

  const getLabel = (key: string) => {
    const labels: Record<string, string> = {
      limite_pedidos_dia: "Limite de Pedidos por Dia",
      horario_corte: "Horário de Corte",
      hashdata_form_url: "URL do Formulário Hashdata",
      smartnx_api_url: "URL da API SmartNX",
      sistema_nome: "Nome do Sistema"
    };
    return labels[key] || key;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/interno/dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Parâmetros do Sistema</h1>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Regras de Negócio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {configs.filter(c => ["limite_pedidos_dia", "horario_corte"].includes(c.config_key)).map(config => (
              <div key={config.id} className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <Label htmlFor={config.id}>{getLabel(config.config_key)}</Label>
                  <p className="text-sm text-muted-foreground">{config.description}</p>
                </div>
                <div className="flex items-center gap-4">
                  <Input
                    id={config.id}
                    type={getInputType(config.config_type)}
                    value={config.config_value || ""}
                    onChange={(e) => updateConfig(config.id, e.target.value)}
                    className="w-32"
                  />
                  <Switch
                    checked={config.is_active}
                    onCheckedChange={() => toggleActive(config.id)}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integrações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {configs.filter(c => ["hashdata_form_url", "smartnx_api_url"].includes(c.config_key)).map(config => (
              <div key={config.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={config.id}>{getLabel(config.config_key)}</Label>
                  <Switch
                    checked={config.is_active}
                    onCheckedChange={() => toggleActive(config.id)}
                  />
                </div>
                <Input
                  id={config.id}
                  type="url"
                  value={config.config_value || ""}
                  onChange={(e) => updateConfig(config.id, e.target.value)}
                  placeholder="https://..."
                />
                <p className="text-sm text-muted-foreground">{config.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configurações Gerais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {configs.filter(c => c.config_key === "sistema_nome").map(config => (
              <div key={config.id} className="space-y-2">
                <Label htmlFor={config.id}>{getLabel(config.config_key)}</Label>
                <Input
                  id={config.id}
                  type="text"
                  value={config.config_value || ""}
                  onChange={(e) => updateConfig(config.id, e.target.value)}
                />
                <p className="text-sm text-muted-foreground">{config.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end mt-6">
        <Button onClick={saveConfigs} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </div>
  );
};

export default AdminParametros;

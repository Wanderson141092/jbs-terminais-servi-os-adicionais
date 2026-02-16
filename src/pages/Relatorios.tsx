import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Upload, Download, Trash2, FileSpreadsheet, BarChart3, Plus, File } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import jbsLogo from "@/assets/jbs-terminais-logo.png";

interface ModeloRelatorio {
  id: string;
  nome: string;
  descricao: string | null;
  file_name: string;
  file_path: string;
  file_size: number | null;
  tipo: string;
  ativo: boolean;
  created_at: string;
}

const FILE_TYPE_ICONS: Record<string, string> = {
  excel: "📊",
  pdf: "📄",
  word: "📝",
  outro: "📁",
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileType = (fileName: string): string => {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (["xlsx", "xls", "csv"].includes(ext || "")) return "excel";
  if (ext === "pdf") return "pdf";
  if (["doc", "docx"].includes(ext || "")) return "word";
  return "outro";
};

const Relatorios = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [modelos, setModelos] = useState<ModeloRelatorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({ nome: "", descricao: "" });

  const { isAdmin } = useAdminCheck(user?.id || null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { navigate("/interno"); return; }
      setUser(user);
    });
  }, [navigate]);

  const fetchModelos = useCallback(async () => {
    const { data, error } = await supabase
      .from("modelos_relatorio")
      .select("*")
      .eq("ativo", true)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar modelos");
    } else {
      setModelos((data || []) as ModeloRelatorio[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) fetchModelos();
  }, [user, fetchModelos]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx. 20MB)");
      return;
    }
    setUploadFile(file);
    if (!formData.nome) {
      setFormData(prev => ({ ...prev, nome: file.name.replace(/\.[^.]+$/, "") }));
    }
  };

  const handleUpload = async () => {
    if (!uploadFile || !formData.nome.trim()) {
      toast.error("Preencha o nome e selecione um arquivo");
      return;
    }

    setUploading(true);
    try {
      const fileExt = uploadFile.name.split(".").pop();
      const filePath = `${Date.now()}_${uploadFile.name}`;

      const { error: storageError } = await supabase.storage
        .from("modelos-relatorio")
        .upload(filePath, uploadFile);

      if (storageError) {
        toast.error("Erro ao enviar arquivo");
        setUploading(false);
        return;
      }

      const { error: dbError } = await supabase.from("modelos_relatorio").insert({
        nome: formData.nome.trim(),
        descricao: formData.descricao.trim() || null,
        file_name: uploadFile.name,
        file_path: filePath,
        file_size: uploadFile.size,
        tipo: getFileType(uploadFile.name),
        criado_por: user?.id,
      });

      if (dbError) {
        toast.error("Erro ao salvar modelo");
        // Cleanup uploaded file
        await supabase.storage.from("modelos-relatorio").remove([filePath]);
        setUploading(false);
        return;
      }

      toast.success("Modelo importado com sucesso!");
      setShowUploadDialog(false);
      setUploadFile(null);
      setFormData({ nome: "", descricao: "" });
      fetchModelos();
    } catch {
      toast.error("Erro inesperado");
    }
    setUploading(false);
  };

  const handleDownload = async (modelo: ModeloRelatorio) => {
    const { data, error } = await supabase.storage
      .from("modelos-relatorio")
      .download(modelo.file_path);

    if (error || !data) {
      toast.error("Erro ao baixar arquivo");
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = modelo.file_name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (modelo: ModeloRelatorio) => {
    const { error: dbError } = await supabase
      .from("modelos_relatorio")
      .update({ ativo: false, updated_at: new Date().toISOString() })
      .eq("id", modelo.id);

    if (dbError) {
      toast.error("Erro ao remover modelo");
      return;
    }

    toast.success("Modelo removido!");
    fetchModelos();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="jbs-header sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-white rounded-lg p-1.5 sm:p-2 shrink-0">
              <img src={jbsLogo} alt="JBS Terminais" className="h-6 sm:h-8 w-auto" />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-bold">Relatórios</h1>
              <p className="text-[10px] sm:text-xs text-primary-foreground/70">Modelos de relatórios disponíveis</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/interno/dashboard")} className="text-primary-foreground hover:bg-primary-foreground/10">
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Modelos de Relatório</h2>
            <Badge variant="secondary" className="text-xs">{modelos.length} modelo(s)</Badge>
          </div>
          {isAdmin && (
            <Button onClick={() => { setShowUploadDialog(true); setUploadFile(null); setFormData({ nome: "", descricao: "" }); }}>
              <Upload className="h-4 w-4 mr-2" /> Importar Modelo
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden sm:table-cell">Descrição</TableHead>
                  <TableHead>Arquivo</TableHead>
                  <TableHead className="hidden sm:table-cell">Tamanho</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Carregando...</TableCell>
                  </TableRow>
                ) : modelos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum modelo de relatório disponível.
                      {isAdmin && " Clique em 'Importar Modelo' para adicionar."}
                    </TableCell>
                  </TableRow>
                ) : (
                  modelos.map(modelo => (
                    <TableRow key={modelo.id}>
                      <TableCell className="text-lg">{FILE_TYPE_ICONS[modelo.tipo] || "📁"}</TableCell>
                      <TableCell className="font-medium">{modelo.nome}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                        {modelo.descricao || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{modelo.file_name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{formatFileSize(modelo.file_size)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleDownload(modelo)} title="Baixar">
                            <Download className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive" title="Remover">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remover modelo?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    O modelo "{modelo.nome}" será removido da lista. O arquivo não será excluído permanentemente.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(modelo)}>Remover</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Upload */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Importar Modelo de Relatório
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Arquivo *</Label>
              <div className="mt-1">
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col items-center text-sm text-muted-foreground">
                    {uploadFile ? (
                      <>
                        <File className="h-6 w-6 mb-1" />
                        <span className="font-medium text-foreground">{uploadFile.name}</span>
                        <span className="text-xs">{formatFileSize(uploadFile.size)}</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 mb-1" />
                        <span>Clique para selecionar</span>
                        <span className="text-xs">Excel, PDF, Word (máx. 20MB)</span>
                      </>
                    )}
                  </div>
                  <input type="file" className="hidden" onChange={handleFileSelect} accept=".xlsx,.xls,.csv,.pdf,.doc,.docx" />
                </label>
              </div>
            </div>

            <div>
              <Label>Nome do Modelo *</Label>
              <Input
                value={formData.nome}
                onChange={e => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Relatório Mensal de Posicionamento"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={e => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Breve descrição do modelo..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpload} disabled={uploading || !uploadFile} className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Enviando..." : "Importar Modelo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Relatorios;

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Upload, Download, Trash2, BarChart3, File, FileSpreadsheet, Settings2, Database } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRoleCheck } from "@/hooks/useRoleCheck";
import jbsLogo from "@/assets/jbs-terminais-logo.png";
import ReportColumnMappingDialog from "@/components/admin/ReportColumnMappingDialog";
import ReportDownloadDialog from "@/components/admin/ReportDownloadDialog";

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
  const [mappingModeloId, setMappingModeloId] = useState<string | null>(null);
  const [mappingModeloNome, setMappingModeloNome] = useState("");
  const [downloadModelo, setDownloadModelo] = useState<ModeloRelatorio | null>(null);
  const [modeloMappingCounts, setModeloMappingCounts] = useState<Record<string, number>>({});

  const { isAdmin } = useRoleCheck(user?.id || null);

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
      const models = (data || []) as ModeloRelatorio[];
      setModelos(models);

      // Fetch mapping counts
      if (models.length > 0) {
        const { data: mappings } = await supabase
          .from("modelo_relatorio_colunas")
          .select("modelo_id, campo_sistema")
          .in("modelo_id", models.map(m => m.id));

        const counts: Record<string, number> = {};
        (mappings || []).forEach((m: any) => {
          if (m.campo_sistema) {
            counts[m.modelo_id] = (counts[m.modelo_id] || 0) + 1;
          }
        });
        setModeloMappingCounts(counts);
      }
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
      const filePath = `${Date.now()}_${uploadFile.name}`;

      const { error: storageError } = await supabase.storage
        .from("modelos-relatorio")
        .upload(filePath, uploadFile);

      if (storageError) {
        toast.error("Erro ao enviar arquivo");
        setUploading(false);
        return;
      }

      const { data: inserted, error: dbError } = await supabase.from("modelos_relatorio").insert({
        nome: formData.nome.trim(),
        descricao: formData.descricao.trim() || null,
        file_name: uploadFile.name,
        file_path: filePath,
        file_size: uploadFile.size,
        tipo: getFileType(uploadFile.name),
        criado_por: user?.id,
      }).select().single();

      if (dbError) {
        toast.error("Erro ao salvar modelo");
        await supabase.storage.from("modelos-relatorio").remove([filePath]);
        setUploading(false);
        return;
      }

      toast.success("Modelo importado com sucesso!");
      setShowUploadDialog(false);
      setUploadFile(null);
      setFormData({ nome: "", descricao: "" });
      fetchModelos();

      // Open column mapping dialog for spreadsheets
      if (inserted && ["xlsx", "xls", "csv"].includes(uploadFile.name.split(".").pop()?.toLowerCase() || "")) {
        setTimeout(() => {
          setMappingModeloId(inserted.id);
          setMappingModeloNome(inserted.nome);
        }, 500);
      }
    } catch {
      toast.error("Erro inesperado");
    }
    setUploading(false);
  };

  const handleDownloadFile = async (modelo: ModeloRelatorio) => {
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
              <p className="text-[10px] sm:text-xs text-primary-foreground/70">Modelos e exportação de dados</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/interno/dashboard")} className="text-primary-foreground hover:bg-primary-foreground/10">
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="exportar" className="space-y-6">
          <TabsList>
            <TabsTrigger value="exportar" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Exportar Dados
            </TabsTrigger>
            <TabsTrigger value="modelos" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Modelos Importados
            </TabsTrigger>
          </TabsList>

          {/* EXPORTAR DADOS */}
          <TabsContent value="exportar">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold">Exportar Dados</h2>
              <p className="text-sm text-muted-foreground ml-2">Selecione um modelo para exportar os dados do sistema</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {modelos.filter(m => (modeloMappingCounts[m.id] || 0) > 0).map(modelo => (
                <Card key={modelo.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDownloadModelo(modelo)}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{FILE_TYPE_ICONS[modelo.tipo] || "📁"}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{modelo.nome}</h3>
                        <p className="text-xs text-muted-foreground truncate">{modelo.descricao || "Sem descrição"}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-[10px]">
                            {modeloMappingCounts[modelo.id] || 0} colunas mapeadas
                          </Badge>
                        </div>
                      </div>
                      <Download className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              ))}
              {modelos.filter(m => (modeloMappingCounts[m.id] || 0) > 0).length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-12">
                  Nenhum modelo com colunas mapeadas. Importe um modelo e configure o mapeamento na aba "Modelos Importados".
                </div>
              )}
            </div>
          </TabsContent>

          {/* MODELOS IMPORTADOS */}
          <TabsContent value="modelos">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold">Modelos Importados</h2>
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
                      <TableHead>Mapeamento</TableHead>
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
                          <TableCell className="text-sm text-muted-foreground">
                            <div>{modelo.file_name}</div>
                            <div className="text-xs">{formatFileSize(modelo.file_size)}</div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={(modeloMappingCounts[modelo.id] || 0) > 0 ? "default" : "outline"}
                              className="text-xs cursor-pointer"
                              onClick={() => {
                                setMappingModeloId(modelo.id);
                                setMappingModeloNome(modelo.nome);
                              }}
                            >
                              <Settings2 className="h-3 w-3 mr-1" />
                              {(modeloMappingCounts[modelo.id] || 0) > 0
                                ? `${modeloMappingCounts[modelo.id]} colunas`
                                : "Configurar"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleDownloadFile(modelo)} title="Baixar arquivo original">
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
                                        O modelo "{modelo.nome}" será removido da lista.
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
          </TabsContent>
        </Tabs>
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

      {/* Column Mapping Dialog */}
      {mappingModeloId && (
        <ReportColumnMappingDialog
          modeloId={mappingModeloId}
          modeloNome={mappingModeloNome}
          open={!!mappingModeloId}
          onClose={() => setMappingModeloId(null)}
          onSaved={() => fetchModelos()}
        />
      )}

      {/* Download Dialog */}
      {downloadModelo && (
        <ReportDownloadDialog
          modeloId={downloadModelo.id}
          modeloNome={downloadModelo.nome}
          modeloFileName={downloadModelo.file_name}
          open={!!downloadModelo}
          onClose={() => setDownloadModelo(null)}
        />
      )}
    </div>
  );
};

export default Relatorios;

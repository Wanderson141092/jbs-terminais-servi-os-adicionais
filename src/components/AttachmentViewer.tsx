import { useState, useEffect } from "react";
import { FileText, Download, Eye, Paperclip, Image, File, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface AttachmentItem {
  pergunta_id: string;
  file_url: string;
  file_name: string;
  /** Label from the form question (rótulo) */
  label?: string;
  /** Whether this attachment failed to load */
  error?: boolean;
}

interface AttachmentViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  arquivos: AttachmentItem[];
  title?: string;
  /** Index to select when opening */
  initialIndex?: number;
}

const getFileIcon = (fileName: string) => {
  if (/\.pdf(\?|$)/i.test(fileName)) return <FileText className="h-4 w-4 shrink-0" />;
  if (/\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(fileName)) return <Image className="h-4 w-4 shrink-0" />;
  return <File className="h-4 w-4 shrink-0" />;
};

const getFileType = (fileName: string) => {
  if (/\.pdf(\?|$)/i.test(fileName)) return "pdf";
  if (/\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(fileName)) return "image";
  return "other";
};

const AttachmentViewer = ({ open, onOpenChange, arquivos, title = "Anexos da Solicitação", initialIndex = 0 }: AttachmentViewerProps) => {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [loadError, setLoadError] = useState(false);

  // Sync selected index when initialIndex or open state changes
  useEffect(() => {
    if (open) {
      setSelectedIndex(Math.min(initialIndex, Math.max(0, arquivos.length - 1)));
      setLoadError(false);
    }
  }, [open, initialIndex, arquivos.length]);

  if (arquivos.length === 0) return null;

  const selected = arquivos[selectedIndex] || arquivos[0];
  const fileType = getFileType(selected.file_url || selected.file_name || "");
  const hasValidUrl = selected.file_url && selected.file_url.startsWith("http");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] p-0 flex flex-col">
        <DialogHeader className="px-4 pt-4 pb-2 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Paperclip className="h-4 w-4" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {arquivos.length} arquivo{arquivos.length > 1 ? "s" : ""} enviado{arquivos.length > 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          {/* Left sidebar - file list */}
          <ScrollArea className="w-56 shrink-0 border-r bg-muted/20">
            <div className="p-2 space-y-1">
              {arquivos.map((arq, idx) => (
                <button
                  key={idx}
                  onClick={() => { setSelectedIndex(idx); setLoadError(false); }}
                  className={cn(
                    "w-full text-left rounded-md px-3 py-2.5 transition-colors",
                    "hover:bg-accent/50",
                    idx === selectedIndex
                      ? "bg-primary/10 border border-primary/30 text-primary"
                      : "text-foreground/80",
                    arq.error && "border-destructive/30 bg-destructive/5"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-muted-foreground">
                      {arq.error ? <AlertTriangle className="h-4 w-4 text-destructive" /> : getFileIcon(arq.file_name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium leading-tight truncate">
                        {arq.label || arq.file_name}
                      </p>
                      {arq.label && (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                          {arq.file_name}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>

          {/* Right preview pane */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Preview toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/10">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{selected.label || selected.file_name}</p>
                {selected.label && (
                  <p className="text-xs text-muted-foreground truncate">{selected.file_name}</p>
                )}
              </div>
              <div className="flex gap-1 shrink-0 ml-2">
                {hasValidUrl && (
                  <>
                    <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                      <a href={selected.file_url} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Abrir
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                      <a href={selected.file_url} download target="_blank" rel="noopener noreferrer">
                        <Download className="h-3.5 w-3.5 mr-1" />
                        Baixar
                      </a>
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Preview content */}
            <div className="flex-1 flex items-center justify-center bg-muted/5 overflow-auto p-2">
              {!hasValidUrl || loadError ? (
                <div className="text-center space-y-3 text-destructive/70">
                  <AlertTriangle className="h-16 w-16 mx-auto opacity-50" />
                  <p className="text-sm font-medium">Não foi possível carregar este anexo.</p>
                  <p className="text-xs text-muted-foreground">O arquivo pode estar corrompido ou a URL expirou.</p>
                </div>
              ) : fileType === "pdf" ? (
                <iframe
                  src={selected.file_url}
                  className="w-full h-full rounded border"
                  title={selected.file_name}
                  onError={() => setLoadError(true)}
                />
              ) : fileType === "image" ? (
                <img
                  src={selected.file_url}
                  alt={selected.file_name}
                  className="max-w-full max-h-full object-contain rounded"
                  onError={() => setLoadError(true)}
                />
              ) : (
                <div className="text-center space-y-3 text-muted-foreground">
                  <File className="h-16 w-16 mx-auto opacity-40" />
                  <p className="text-sm">Pré-visualização não disponível para este tipo de arquivo.</p>
                  <Button variant="outline" size="sm" asChild>
                    <a href={selected.file_url} download target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Baixar arquivo
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AttachmentViewer;

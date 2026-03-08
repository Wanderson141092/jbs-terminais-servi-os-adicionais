import { useState } from "react";
import { FileText, Download, Eye, Paperclip, Image, File, AlertTriangle, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { AttachmentItem } from "./AttachmentViewer";

interface InlineAttachmentPreviewProps {
  arquivos: AttachmentItem[];
  title: string;
  icon?: React.ReactNode;
  className?: string;
  onExpandClick?: () => void;
}

const getFileType = (fileName: string) => {
  if (/\.pdf(\?|$)/i.test(fileName)) return "pdf";
  if (/\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(fileName)) return "image";
  return "other";
};

const getFileIcon = (fileName: string) => {
  if (/\.pdf(\?|$)/i.test(fileName)) return <FileText className="h-3.5 w-3.5 shrink-0" />;
  if (/\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(fileName)) return <Image className="h-3.5 w-3.5 shrink-0" />;
  return <File className="h-3.5 w-3.5 shrink-0" />;
};

const InlineAttachmentPreview = ({
  arquivos,
  title,
  icon,
  className,
  onExpandClick,
}: InlineAttachmentPreviewProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loadError, setLoadError] = useState(false);

  if (arquivos.length === 0) return null;

  const selected = arquivos[selectedIndex] || arquivos[0];
  const fileType = getFileType(selected.file_url || selected.file_name || "");
  const hasValidUrl = selected.file_url && selected.file_url.startsWith("http");

  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
          {icon || <Paperclip className="h-4 w-4" />}
          {title} ({arquivos.length})
        </p>
        {onExpandClick && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] gap-1 px-2"
            onClick={onExpandClick}
          >
            <Maximize2 className="h-3 w-3" />
            Expandir
          </Button>
        )}
      </div>

      <div className="flex h-[340px]">
        {/* Sidebar — file list */}
        <ScrollArea className="w-[200px] shrink-0 border-r bg-muted/10">
          <div className="p-1.5 space-y-0.5">
            {arquivos.map((arq, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSelectedIndex(idx);
                  setLoadError(false);
                }}
                className={cn(
                  "w-full text-left rounded-md px-2.5 py-2 transition-colors",
                  "hover:bg-accent/50",
                  idx === selectedIndex
                    ? "bg-primary/10 border border-primary/30 text-primary"
                    : "text-foreground/80",
                  arq.error && "border-destructive/30 bg-destructive/5"
                )}
              >
                <div className="flex items-start gap-1.5">
                  <span className="mt-0.5 text-muted-foreground">
                    {arq.error ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    ) : (
                      getFileIcon(arq.file_name)
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium leading-tight truncate">
                      {arq.label || arq.file_name}
                    </p>
                    {arq.label && (
                      <p className="text-[9px] text-muted-foreground truncate mt-0.5">
                        {arq.file_name}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>

        {/* Preview pane */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/5">
            <p className="text-[11px] font-medium truncate min-w-0">
              {selected.label || selected.file_name}
            </p>
            <div className="flex gap-1 shrink-0 ml-2">
              {hasValidUrl && (
                <>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" asChild>
                    <a href={selected.file_url} target="_blank" rel="noopener noreferrer">
                      <Eye className="h-3 w-3 mr-1" />
                      Abrir
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" asChild>
                    <a href={selected.file_url} download target="_blank" rel="noopener noreferrer">
                      <Download className="h-3 w-3 mr-1" />
                      Baixar
                    </a>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex items-center justify-center bg-muted/5 overflow-auto p-2">
            {!hasValidUrl || loadError ? (
              <div className="text-center space-y-2 text-destructive/70">
                <AlertTriangle className="h-10 w-10 mx-auto opacity-50" />
                <p className="text-xs font-medium">Não foi possível carregar este anexo.</p>
                <p className="text-[10px] text-muted-foreground">
                  O arquivo pode estar corrompido ou a URL expirou.
                </p>
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
              <div className="text-center space-y-2 text-muted-foreground">
                <File className="h-10 w-10 mx-auto opacity-40" />
                <p className="text-xs">Pré-visualização não disponível.</p>
                <Button variant="outline" size="sm" className="text-xs" asChild>
                  <a href={selected.file_url} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-3 w-3 mr-1" />
                    Baixar arquivo
                  </a>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InlineAttachmentPreview;

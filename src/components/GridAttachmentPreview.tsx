import { useState } from "react";
import { FileText, Download, Eye, Paperclip, Image, File, AlertTriangle, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AttachmentItem } from "./AttachmentViewer";

interface GridAttachmentPreviewProps {
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
  if (/\.pdf(\?|$)/i.test(fileName)) return <FileText className="h-5 w-5" />;
  if (/\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(fileName)) return <Image className="h-5 w-5" />;
  return <File className="h-5 w-5" />;
};

const GridAttachmentPreview = ({
  arquivos,
  title,
  icon,
  className,
  onExpandClick,
}: GridAttachmentPreviewProps) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);

  if (arquivos.length === 0) return null;

  const selected = selectedIndex !== null ? arquivos[selectedIndex] : null;
  const fileType = selected ? getFileType(selected.file_url || selected.file_name || "") : null;
  const hasValidUrl = selected?.file_url && selected.file_url.startsWith("http");

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

      {/* Grid de arquivos — horizontal com wrap */}
      <div className="p-3 flex flex-wrap gap-2">
        {arquivos.map((arq, idx) => {
          const isSelected = selectedIndex === idx;
          const type = getFileType(arq.file_url || arq.file_name || "");
          return (
            <button
              key={idx}
              onClick={() => {
                setSelectedIndex(isSelected ? null : idx);
                setLoadError(false);
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 px-3 py-2 min-w-[80px] max-w-[110px] rounded-lg border transition-colors",
                "hover:bg-accent/50 hover:border-accent",
                isSelected
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "bg-muted/20 border-border text-foreground/80",
                arq.error && "border-destructive/40 bg-destructive/5"
              )}
            >
              <span className="text-muted-foreground">
                {arq.error ? (
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                ) : (
                  getFileIcon(arq.file_name)
                )}
              </span>
              <span className="text-[10px] leading-tight text-center break-all line-clamp-2 max-h-[2.4em]">
                {arq.label || arq.file_name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Preview pane — aparece abaixo quando um arquivo é selecionado */}
      {selected && (
        <div className="border-t">
          {/* Preview toolbar */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/10">
            <p className="text-[11px] font-medium truncate min-w-0 flex-1">
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

          {/* Preview content */}
          <div className="flex items-center justify-center bg-muted/5 h-[280px] overflow-auto p-2">
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
      )}
    </div>
  );
};

export default GridAttachmentPreview;

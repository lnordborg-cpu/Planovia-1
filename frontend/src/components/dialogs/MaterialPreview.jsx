import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";

const isPdfLike = (m) =>
  (m.mimeType && m.mimeType.includes("pdf")) ||
  /\.pdf(\?|#|$)/i.test(m.name || "") ||
  /\.pdf(\?|#|$)/i.test(m.url || "");

const isImageLike = (m) =>
  (m.mimeType && m.mimeType.startsWith("image/")) ||
  /\.(png|jpe?g|gif|webp|svg)(\?|#|$)/i.test(m.name || "") ||
  /\.(png|jpe?g|gif|webp|svg)(\?|#|$)/i.test(m.url || "");

export const canPreview = (m) => isPdfLike(m) || isImageLike(m);

export default function MaterialPreview({ material, onOpenChange }) {
  if (!material) return null;
  const pdf = isPdfLike(material);
  const img = isImageLike(material);

  return (
    <Dialog open={!!material} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] p-0 flex flex-col overflow-hidden" data-testid="material-preview-dialog">
        <DialogHeader className="px-5 py-3 border-b border-[#DEDAD2] flex-row items-center gap-3 space-y-0">
          <DialogTitle className="font-serif-display text-lg truncate flex-1">{material.name}</DialogTitle>
          <div className="flex items-center gap-2">
            {material.url && (
              <>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-[#DEDAD2]"
                  data-testid="preview-open-tab"
                >
                  <a href={material.url} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> Ny flik
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-[#DEDAD2]"
                  data-testid="preview-download"
                >
                  <a href={material.url} download={material.name}>
                    <Download className="h-3.5 w-3.5 mr-1" /> Ladda ner
                  </a>
                </Button>
              </>
            )}
          </div>
        </DialogHeader>
        <div className="flex-1 min-h-0 bg-[#EFEAE1]">
          {pdf && material.url ? (
            <iframe
              src={material.url}
              title={material.name}
              className="w-full h-full border-0"
              data-testid="preview-iframe"
            />
          ) : img && material.url ? (
            <div className="w-full h-full flex items-center justify-center p-6 overflow-auto">
              <img src={material.url} alt={material.name} className="max-w-full max-h-full object-contain" data-testid="preview-image" />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-[#78817D] text-sm px-6 text-center">
              Förhandsgranskning saknas för denna filtyp. Använd knapparna ovan.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

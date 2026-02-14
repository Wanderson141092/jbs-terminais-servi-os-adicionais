export interface FormStyle {
  container: string;
  header: string;
  field: string;
  button: string;
}

const styleClasses: Record<string, FormStyle> = {
  jbs: {
    container: "bg-card rounded-lg p-6 md:p-8 max-w-2xl mx-auto",
    header: "text-center mb-8 pb-4 border-b-2 border-secondary",
    field: "space-y-2",
    button: "w-full jbs-btn-primary",
  },
  hashdata: {
    container: "bg-card rounded-xl p-6 md:p-10 max-w-3xl mx-auto shadow-lg border",
    header: "mb-8 pb-4 border-b border-muted",
    field: "space-y-2 bg-muted/30 rounded-lg p-4",
    button: "w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg",
  },
  google: {
    container: "bg-card rounded-lg max-w-2xl mx-auto border-t-4 border-t-primary shadow-md",
    header: "p-6 md:p-8 pb-4",
    field: "space-y-2 border rounded-lg p-4 bg-card",
    button: "bg-primary hover:bg-primary/90 text-primary-foreground px-8",
  },
  jotform: {
    container: "bg-gradient-to-b from-muted/20 to-card rounded-2xl p-6 md:p-10 max-w-2xl mx-auto shadow-xl",
    header: "text-center mb-10 pb-6 border-b border-muted/50",
    field: "space-y-2 bg-card rounded-xl p-5 shadow-sm border",
    button: "w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl py-3 text-lg",
  },
  formstack: {
    container: "bg-card max-w-2xl mx-auto p-6 md:p-8 border rounded-lg",
    header: "mb-6 pb-3 border-b-2 border-primary",
    field: "space-y-1",
    button: "w-full bg-primary hover:bg-primary/90 text-primary-foreground",
  },
};

export const getStyleClasses = (estilo: string): FormStyle => {
  return styleClasses[estilo] || styleClasses.jbs;
};

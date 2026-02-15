import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:text-white group-[.toaster]:border-none group-[.toaster]:shadow-2xl group-[.toaster]:text-base group-[.toaster]:font-semibold group-[.toaster]:py-5 group-[.toaster]:px-6 group-[.toaster]:min-w-[380px] group-[.toaster]:max-w-[520px] group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-white/90 group-[.toast]:text-sm",
          actionButton: "group-[.toast]:bg-white/20 group-[.toast]:text-white group-[.toast]:hover:bg-white/30",
          cancelButton: "group-[.toast]:bg-white/20 group-[.toast]:text-white group-[.toast]:hover:bg-white/30",
          success: "group-[.toaster]:!bg-green-600",
          error: "group-[.toaster]:!bg-red-600",
          warning: "group-[.toaster]:!bg-yellow-50/90 group-[.toaster]:!text-amber-600 group-[.toaster]:!border group-[.toaster]:!border-yellow-200",
          info: "group-[.toaster]:!bg-sky-400",
        },
      }}
      style={{ zIndex: 999999 }}
      {...props}
    />
  );
};

export { Toaster, toast };

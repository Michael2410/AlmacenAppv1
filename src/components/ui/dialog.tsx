import type { PropsWithChildren, HTMLAttributes } from 'react';

export function Dialog({ open, onClose, children }: PropsWithChildren<{ open: boolean; onClose: () => void }>) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-md bg-white p-4 shadow-lg">
        {children}
      </div>
    </div>
  );
}

export function DialogHeader(props: HTMLAttributes<HTMLDivElement>) {
  return <div className="mb-2 text-lg font-semibold" {...props} />
}
export function DialogFooter(props: HTMLAttributes<HTMLDivElement>) {
  return <div className="mt-4 flex justify-end gap-2" {...props} />
}

export default Dialog;

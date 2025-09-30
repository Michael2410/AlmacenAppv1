import type { LabelHTMLAttributes, PropsWithChildren } from 'react';
import { twMerge } from 'tailwind-merge';

export default function Label({ className, ...props }: PropsWithChildren<LabelHTMLAttributes<HTMLLabelElement>>) {
  return <label className={twMerge('mb-1 block text-sm font-medium text-gray-700', className)} {...props} />
}

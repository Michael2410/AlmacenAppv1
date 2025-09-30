import type { SelectHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export default function Select({ className, children, ...props }: SelectProps) {
  return (
    <select className={twMerge('h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 outline-none focus:ring-2 focus:ring-primary', className)} {...props}>
      {children}
    </select>
  );
}

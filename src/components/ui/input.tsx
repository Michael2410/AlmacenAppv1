import type { InputHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export default function Input({ className, ...props }: InputProps) {
  return <input className={twMerge('h-9 w-full rounded-md border border-gray-300 px-3 py-1 outline-none focus:ring-2 focus:ring-primary', className)} {...props} />
}

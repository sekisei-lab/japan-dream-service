import * as React from 'react';

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={['flex w-full border px-3 py-2 text-sm outline-none', className].filter(Boolean).join(' ')} {...props} />;
}

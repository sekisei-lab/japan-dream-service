import * as React from 'react';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' };

export function Button({ className, variant = 'default', ...props }: Props) {
  const base = 'inline-flex items-center justify-center whitespace-nowrap px-4 py-2 text-sm font-medium transition-colors cursor-pointer';
  const v = variant === 'outline' ? 'border' : '';
  return <button className={[base, v, className].filter(Boolean).join(' ')} {...props} />;
}

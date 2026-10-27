import * as React from 'react';

const cx = (...c: (string | undefined)[]) => c.filter(Boolean).join(' ');

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rounded-xl border bg-white text-inherit', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('p-6', className)} {...props} />;
}

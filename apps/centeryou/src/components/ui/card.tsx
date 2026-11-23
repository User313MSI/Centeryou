import type { HTMLAttributes } from 'react';
import { cx } from '../../lib/utils';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx('bg-surface rounded-card border border-line/70 shadow-card', className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('flex items-center justify-between gap-3 px-6 pt-6 pb-2', className)} {...props} />;
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('px-6 pb-6', className)} {...props} />;
}

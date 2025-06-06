import { ReactNode } from 'react';
import classNames from 'classnames';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
  noPadding?: boolean;
}

export default function Card({ title, children, className, footer, noPadding = false }: CardProps) {
  return (
    <div className={classNames("bg-white rounded-lg shadow overflow-hidden", className)}>
      {title && (
        <div className="border-b border-gray-200 px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">{title}</h3>
        </div>
      )}
      <div className={noPadding ? '' : 'px-4 py-5 sm:p-6'}>
        {children}
      </div>
      {footer && (
        <div className="border-t border-gray-200 px-4 py-4 sm:px-6">
          {footer}
        </div>
      )}
    </div>
  );
}
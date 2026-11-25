import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'green' | 'secondary';

/** Lance's 2.5D raised pill (M14): darker base edge that compresses on press; disabled state never animates. */
export function RaisedPill({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type="button" className={`spct-pill spct-pill-${variant} ${className}`} {...props} />;
}

export function RaisedPillLink({ variant = 'primary', className = '', ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant }) {
  return <a className={`spct-pill spct-pill-${variant} ${className}`} {...props} />;
}

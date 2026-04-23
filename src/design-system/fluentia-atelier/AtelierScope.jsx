import React from 'react';
import './tokens.css';
import './bridge.css';
import './base.css';

/**
 * AtelierScope — wraps children in the Atelier design language.
 * Token mappings and base styles only activate inside this scope.
 * Global UI remains on the pre-Atelier tokens.
 *
 * Usage:
 *   <AtelierScope>
 *     <YourPreviewContent />
 *   </AtelierScope>
 */
export default function AtelierScope({ children, className = '', style, as: Tag = 'div', ...rest }) {
  return (
    <Tag
      className={`atelier-scope ${className}`.trim()}
      style={{ minHeight: '100vh', ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

import React from 'react';

export function extractCodeText(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) {
    return children.map(child => extractCodeText(child)).join('');
  }
  if (React.isValidElement(children) && children.props.children) {
    return extractCodeText(children.props.children);
  }
  return '';
}

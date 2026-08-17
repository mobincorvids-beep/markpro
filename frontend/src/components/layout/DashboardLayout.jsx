import React from 'react';

/**
 * Legacy layout shim.
 *
 * Module pages were originally written to wrap themselves in their own
 * dashboard chrome. The shell (sidebar + topbar) now lives in AppLayout, so
 * this simply renders children and keeps the optional `title` as a heading.
 */
export default function DashboardLayout({ title, children }) {
  return (
    <>
      {title && <h1 className="page-title">{title}</h1>}
      {children}
    </>
  );
}

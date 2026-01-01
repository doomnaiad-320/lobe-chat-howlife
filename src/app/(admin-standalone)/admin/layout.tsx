import type { ReactNode } from 'react';

import AdminLayout from './_layout/AdminLayout';

export default function Layout({ children }: { children: ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}

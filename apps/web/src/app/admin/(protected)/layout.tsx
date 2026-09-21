import type { ReactNode } from "react";
import { AdminLayout } from "@/views/admin";

export default function Layout({ children }: { children: ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}

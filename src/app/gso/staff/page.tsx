import type { Metadata } from "next";
import { StaffView } from "@/components/views/StaffView";

export const metadata: Metadata = { title: "Cainta Queue · GSO · Staff" };

export default function Page() {
  return <StaffView office="gso" />;
}

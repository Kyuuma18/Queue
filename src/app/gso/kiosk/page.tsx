import type { Metadata } from "next";
import { KioskView } from "@/components/views/KioskView";

export const metadata: Metadata = { title: "Cainta Queue · GSO · Get a number" };

export default function Page() {
  return <KioskView office="gso" />;
}

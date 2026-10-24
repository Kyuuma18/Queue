import type { Metadata } from "next";
import { DisplayView } from "@/components/views/DisplayView";

export const metadata: Metadata = { title: "Cainta Queue · GSO · TV display" };

export default function Page() {
  return <DisplayView office="gso" />;
}

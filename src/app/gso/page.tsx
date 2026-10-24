import type { Metadata } from "next";
import { HomeView } from "@/components/views/HomeView";

export const metadata: Metadata = { title: "Cainta Queue · GSO" };

export default function Page() {
  return <HomeView office="gso" />;
}

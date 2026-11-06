import type { MetadataRoute } from "next";

// Installed from the browser ("Add to Home Screen" / "Install app"), it opens full screen like an app, with no
// address bar. /open sends each device where it belongs: a set-up kiosk to its kiosk screen, everyone else to staff login.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/open",
    name: "Cainta Queue",
    short_name: "Cainta Queue",
    description: "Cainta queueing system: kiosk and staff counter.",
    start_url: "/open",
    scope: "/",
    display: "standalone",
    display_override: ["fullscreen", "standalone"],
    orientation: "any",
    background_color: "#fbf8f1",
    theme_color: "#0b2a6f",
    categories: ["business", "government"],
    icons: [
      { src: "/icon", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
    shortcuts: [
      { name: "BPLO Kiosk", url: "/kiosk" },
      { name: "GSO Kiosk", url: "/gso/kiosk" },
      { name: "BPLO Staff", url: "/staff" },
      { name: "GSO Staff", url: "/gso/staff" },
    ],
  };
}

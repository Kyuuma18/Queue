import type { MetadataRoute } from "next";

// Lets phones and tablets "Add to Home Screen" / "Install app" so the queue opens full screen like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cainta Queue",
    short_name: "Cainta Queue",
    description: "Kumuha ng numero at bantayan ang pila. Take a queue number and follow the line.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#fbf8f1",
    theme_color: "#0b2a6f",
    icons: [{ src: "/icon", sizes: "192x192", type: "image/png", purpose: "any" }],
  };
}

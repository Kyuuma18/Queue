import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iPhone / iPad home-screen icon: the seal on a plain background (iOS turns see-through areas black).
export default async function AppleIcon() {
  const jpg = await readFile(join(process.cwd(), "public", "logo.jpg"));
  const src = `data:image/jpeg;base64,${jpg.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff" }}>
        <div style={{ width: 150, height: 150, display: "flex", position: "relative", borderRadius: "50%", overflow: "hidden" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} width={156} height={163} style={{ position: "absolute", left: -1.5, top: -7 }} alt="" />
        </div>
      </div>
    ),
    size,
  );
}

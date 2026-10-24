import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

// Browser-tab icon: the Cainta seal (public/logo.jpg) cut to its circle on a transparent background.
export default async function Icon() {
  const jpg = await readFile(join(process.cwd(), "public", "logo.jpg"));
  const src = `data:image/jpeg;base64,${jpg.toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          borderRadius: "50%",
          overflow: "hidden",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={200} height={208} style={{ position: "absolute", left: -2, top: -9 }} alt="" />
      </div>
    ),
    size,
  );
}

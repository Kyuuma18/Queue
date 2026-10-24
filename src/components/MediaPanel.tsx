"use client";
import { useEffect, useState } from "react";
import { SLIDES, VIDEOS } from "@/lib/config";
import { useLang } from "@/lib/i18n";

function youTubeId(url: string) {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
  return m?.[1] ?? null;
}
function playlistId(url: string) {
  return url.match(/[?&]list=([\w-]+)/)?.[1] ?? null;
}

export function MediaPanel() {
  const yt = VIDEOS.filter((v) => /youtu/.test(v));
  const mp4 = VIDEOS.filter((v) => !/youtu/.test(v));

  if (yt.length) {
    const list = playlistId(yt[0]);
    const ids = yt.map(youTubeId).filter(Boolean) as string[];
    const src = list
      ? `https://www.youtube.com/embed/videoseries?list=${list}&autoplay=1&mute=1&loop=1`
      : `https://www.youtube.com/embed/${ids[0]}?autoplay=1&mute=1&loop=1&playlist=${ids.join(",")}`;
    return (
      <div style={{ aspectRatio: "16/9", borderRadius: 18, overflow: "hidden", background: "#000" }}>
        <iframe src={src} style={{ width: "100%", height: "100%", border: 0 }} allow="autoplay; encrypted-media" title="Video" />
      </div>
    );
  }
  if (mp4.length) return <Mp4Loop urls={mp4} />;
  return <Slides />;
}

function Mp4Loop({ urls }: { urls: string[] }) {
  const [i, setI] = useState(0);
  return (
    <video
      key={i}
      src={urls[i]}
      autoPlay
      muted
      playsInline
      onEnded={() => setI((i + 1) % urls.length)}
      style={{ width: "100%", borderRadius: 18, background: "#000" }}
    />
  );
}

function Slides() {
  const lang = useLang();
  const slides = SLIDES[lang];
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % slides.length), 12000);
    return () => clearInterval(id);
  }, [slides.length]);
  const s = slides[i % slides.length];
  return (
    <div className="slide" key={i} style={{ animation: "fadein .5s ease" }}>
      <h3>{s.title}</h3>
      {s.body && <p style={{ margin: 0 }}>{s.body}</p>}
      {s.list && (
        <ul>
          {s.list.map((x) => (
            <li key={x}>✔ {x}</li>
          ))}
        </ul>
      )}
      <div style={{ display: "flex", gap: 6, marginTop: 14 }} aria-hidden>
        {slides.map((_, j) => (
          <span key={j} style={{ width: 28, height: 6, borderRadius: 6, background: j === i ? "var(--navy)" : "var(--line)" }} />
        ))}
      </div>
    </div>
  );
}

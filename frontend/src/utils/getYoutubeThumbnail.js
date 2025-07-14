export function getYoutubeThumbnail(videoUrl) {
  if (!videoUrl) return null;
  const match = videoUrl.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w\-]+)/
  );
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
}

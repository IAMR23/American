export function getYoutubeThumbnail(videoUrl) {
  if (!videoUrl) return null;
  const match = videoUrl.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w\-]+)/
  );
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : null;
}

export function dropboxUrlToRaw(url) {
  try {
    const urlObj = new URL(url);
    // Verificamos si es URL de Dropbox
    if (urlObj.hostname.includes("dropbox.com")) {
      if (urlObj.searchParams.has("dl")) {
        urlObj.searchParams.delete("dl");
      }
      urlObj.searchParams.set("raw", "1");
      return urlObj.toString();
    } else {
      // No es Dropbox, devolvemos la URL normal
      return url;
    }
  } catch (error) {
    // Si no es URL válida, devolver original para evitar error
    return url;
  }
}

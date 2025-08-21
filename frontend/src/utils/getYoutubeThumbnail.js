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
    if (urlObj.hostname.includes("dropbox.com")) {
      if (urlObj.searchParams.has("dl")) {
        urlObj.searchParams.delete("dl");
      }
      urlObj.searchParams.set("raw", "1");
      return urlObj.toString().replace("www.dropbox.com", "dl.dropboxusercontent.com");
    } else {
      return url;
    }
  } catch (error) {
    return url;
  }
}

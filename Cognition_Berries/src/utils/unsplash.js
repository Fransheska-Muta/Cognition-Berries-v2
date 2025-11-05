// utils/unsplash.js
const UNSPLASH_ACCESS_KEY = "dzFbstXDygOJcoyYCNjsuN6EQwS1Q7CNMOepOOlhy_g";

export async function getUnsplashImage(query) {
  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&client_id=${UNSPLASH_ACCESS_KEY}`
    );
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      return data.results[0].urls.small; // or 'regular' for higher quality
    } else {
      // fallback image if nothing found
      return "https://via.placeholder.com/300x200?text=No+Image";
    }
  } catch (err) {
    console.error("Error fetching Unsplash image:", err);
    return "https://via.placeholder.com/300x200?text=Error";
  }
}

// === CONFIGURATION ===
const CONFIG = {
  HANDLE: "bsky.app",         // Set this to your handle, without the @
  AUTHOR_ONLY: true,          // True for only your original posts; falst to include your reposts and replies
  PDS: "https://api.bsky.app" // Ignore; for potential later use.
};


// === STATE ===
let cursor = null;
let loading = false;


// === UTILITY ===
function isReply(post) {
  return post?.record?.reply?.root !== undefined;
}

function isRepost(item) {
  return item?.reason?.["$type"] === "app.bsky.feed.defs#reasonRepost";
}

function formatCount(n) {
  if (n < 10000) {
    return Intl.NumberFormat('en', {
      maximumFractionDigits: 0
    }).format(n);
  } else {
    return Intl.NumberFormat('en', {
      notation: 'compact',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(n);
  }
}

function linkifyProfileText(text) {
  if (!text) return "";

  // Escape only &, <, >
  let safe = text.replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));

  // URLs: replace with placeholders (so later regexes don't touch them)
  const urlRegex = /\bhttps?:\/\/[^\s<>"',)]+/gi;
  const urlAnchors = [];
  safe = safe.replace(urlRegex, (url) => {
  // Remove trailing punctuation , . ) ] if not part of the URL
  url = url.replace(/[),.]+$/, '');
  
  let display = url.replace(/^https?:\/\//i, '');
  if (display.length > 40) display = display.slice(0, 40) + "…";
  
  return `<a href="${url}" target="_blank" rel="noopener noreferrer">${display}</a>`;
  });

  // Linkify @handles (DNS-style Bluesky handles)
  safe = safe.replace(
    /@([a-z0-9][a-z0-9.-]*\.[a-z]{2,})/gi,
    (_, handle) =>
      `<a href="https://bsky.app/profile/${handle}" target="_blank" rel="noopener noreferrer">@${handle}</a>`
  );

  // Linkify #hashtags (avoid grabbing the preceding char)
  safe = safe.replace(
    /(^|[^A-Za-z0-9_])#([A-Za-z0-9_]+)/g,
    (_, pre, tag) =>
      `${pre}<a href="https://bsky.app/hashtag/${tag}" target="_blank" rel="noopener noreferrer">#${tag}</a>`
  );

  // Restore URL anchors
  safe = safe.replace(/__URL_PLACEHOLDER_(\d+)__/g, (_, i) => urlAnchors[Number(i)]);

  // Preserve line breaks
  return safe.replace(/\n/g, "<br>");
}


// === FETCHING ===
async function fetchProfile(handle) {
  const actor = encodeURIComponent(handle);
  const url = `${CONFIG.PDS}/xrpc/app.bsky.actor.getProfile?actor=${actor}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (e) {
    console.error("Failed to fetch profile:", e);
    return null;
  }
}

let previousCursor = null;
const seenURIs = new Set();

async function fetchNextPage() {
  const actor = encodeURIComponent(CONFIG.HANDLE);
  let url = `${CONFIG.PDS}/xrpc/app.bsky.feed.getAuthorFeed?actor=${actor}`;
  if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;

  let data = null; // <-- declare in outer scope

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      console.error(`Fetch failed ${res.status}: ${msg}`);
      cursor = null;
      return [];
    }
    data = await res.json();
  } catch (e) {
    console.error("Network/parse error:", e);
    cursor = null;
    return [];
  }

  if (!data || !Array.isArray(data.feed)) {
    console.warn("Unexpected feed structure:", data);
    cursor = null;
    return [];
  }

  if (data.cursor === previousCursor) {
    console.warn("Pagination cursor did not advance. Stopping.");
    cursor = null;
    return [];
  }

  previousCursor = cursor;
  cursor = data.cursor || null;

  const supported = data.feed.filter(item => {
    const post = item.post;
    const embed = post?.embed;
    const uri = post?.uri;

    if (!uri || seenURIs.has(uri)) return false;
    if (CONFIG.AUTHOR_ONLY && (isRepost(item) || isReply(post))) return false;

    return (
      embed &&
      (embed["$type"] === "app.bsky.embed.images#view" ||
       embed["$type"] === "app.bsky.embed.video#view")
    );
  });

  supported.forEach(item => seenURIs.add(item.post.uri));
  return supported;
}

async function fetchInitialMediaPosts(minCount = 9) {
  let mediaPosts = [];
  while (mediaPosts.length < minCount) {
    const nextPosts = await fetchNextPage();
    if (nextPosts.length === 0) break;
    mediaPosts.push(...nextPosts);
  }
  return mediaPosts;
}


// === RENDERING ===
function renderProfile(profile) {
  const el = document.getElementById("profile");
  if (!profile) {
    el.textContent = "Profile unavailable.";
    return;
  }

  const avatar = profile.avatar || "";
  const displayName = profile.displayName || profile.handle || "";
  const posts = formatCount(profile.postsCount);
  const followers = formatCount(profile.followersCount);
  const following = formatCount(profile.followsCount);
  const profileURL = `https://bsky.app/profile/${profile.handle}`;

  const descriptionHTML = linkifyProfileText(profile.description);

  el.innerHTML = `
    <div class="profile-header-row">
      <img class="profile-avatar"
           src="${avatar}"
           alt="${displayName}'s avatar"
           onerror="this.style.display='none'">

      <div class="profile-topline">
        <div class="profile-handle">
          <a href="${profileURL}" target="_blank" rel="noopener noreferrer">@${profile.handle}</a>
        </div>
        <a class="follow-button"
           href="${profileURL}"
           target="_blank"
           rel="noopener noreferrer">Follow</a>
      </div>
    </div>

    <div class="profile-rest">
      <div class="profile-counts">
        <a href="${profileURL}" target="_blank" rel="noopener noreferrer">
          <div><span class="count-num">${posts}</span> <span class="count-label">posts</span></div>
        </a>
        <a href="${profileURL}/followers" target="_blank" rel="noopener noreferrer">
          <div><span class="count-num">${followers}</span> <span class="count-label">followers</span></div>
        </a>
        <a href="${profileURL}/follows" target="_blank" rel="noopener noreferrer">
          <div><span class="count-num">${following}</span> <span class="count-label">following</span></div>
        </a>
      </div>

      <div class="profile-name">${displayName}</div>
      <div class="profile-desc">${descriptionHTML}</div>
    </div>
  `;
}

function renderFeed(postList, append = false) {
  const feedEl = document.getElementById("feed");

  if (!append) {
    feedEl.innerHTML = ""; 
  }

  if (!postList || postList.length === 0) {
    if (!append) {
      feedEl.innerHTML = `<div class="empty">No media posts found for this handle.</div>`;
    }
    return;
  }

  if (!append) {
    feedEl.innerHTML = ""; 
  }

  postList.forEach(item => {
  const post = item.post;
  const embed = post?.embed;

  const isSupported =
    embed &&
    (embed["$type"] === "app.bsky.embed.images#view" ||
     embed["$type"] === "app.bsky.embed.video#view");

  if (!isSupported) return;

  const container = document.createElement("a");
  container.className = "post";
  container.href = `https://bsky.app/profile/${post.author?.handle}/post/${post.uri?.split("/").pop()}`;
  container.target = "_blank";
  container.rel = "noopener noreferrer";

  const wrapper = document.createElement("div");
  wrapper.classList.add("single-photo");

  /* Type-specific thumbnail and icon */
  if (embed["$type"] === "app.bsky.embed.images#view") {
    const image = embed.images?.[0];
    const img = document.createElement("img");
    img.src = image?.thumb || image?.fullsize || "";
    img.alt = image?.alt || "";
    wrapper.appendChild(img);

    if ((embed.images?.length || 0) > 1) {
      const overlay = document.createElement("div");
      overlay.classList.add("multi-icon");
      overlay.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20.0833 15.1999L21.2854 15.9212C21.5221 16.0633 21.5989 16.3704 21.4569 16.6072C21.4146 16.6776 21.3557 16.7365 21.2854 16.7787L12.5144 22.0412C12.1977 22.2313 11.8021 22.2313 11.4854 22.0412L2.71451 16.7787C2.47772 16.6366 2.40093 16.3295 2.54301 16.0927C2.58523 16.0223 2.64413 15.9634 2.71451 15.9212L3.9166 15.1999L11.9999 20.0499L20.0833 15.1999ZM20.0833 10.4999L21.2854 11.2212C21.5221 11.3633 21.5989 11.6704 21.4569 11.9072C21.4146 11.9776 21.3557 12.0365 21.2854 12.0787L11.9999 17.6499L2.71451 12.0787C2.47772 11.9366 2.40093 11.6295 2.54301 11.3927C2.58523 11.3223 2.64413 11.2634 2.71451 11.2212L3.9166 10.4999L11.9999 15.3499L20.0833 10.4999ZM12.5144 1.30864L21.2854 6.5712C21.5221 6.71327 21.5989 7.0204 21.4569 7.25719C21.4146 7.32757 21.3557 7.38647 21.2854 7.42869L11.9999 12.9999L2.71451 7.42869C2.47772 7.28662 2.40093 6.97949 2.54301 6.7427C2.58523 6.67232 2.64413 6.61343 2.71451 6.5712L11.4854 1.30864C11.8021 1.11864 12.1977 1.11864 12.5144 1.30864ZM11.9999 3.33233L5.88723 6.99995L11.9999 10.6676L18.1126 6.99995L11.9999 3.33233Z"></path></svg>`;
      wrapper.appendChild(overlay);
    }
  } else if (embed["$type"] === "app.bsky.embed.video#view") {
    const img = document.createElement("img");
    img.src = embed.thumbnail || "";
    img.alt = "Video thumbnail";
    wrapper.appendChild(img);

    const playOverlay = document.createElement("div");
    playOverlay.classList.add("video-icon");
    playOverlay.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 122.14 122.88" fill="currentColor"><path d="M35.14,0H87c9.65,0,18.43,3.96,24.8,10.32c6.38,6.37,10.34,15.16,10.34,24.82v52.61c0,9.64-3.96,18.42-10.32,24.79 l-0.02,0.02c-6.38,6.37-15.16,10.32-24.79,10.32H35.14c-9.66,0-18.45-3.96-24.82-10.32l-0.24-0.27C3.86,105.95,0,97.27,0,87.74 V35.14c0-9.67,3.95-18.45,10.32-24.82S25.47,0,35.14,0L35.14,0z M91.51,31.02l0.07,0.11h21.6c-0.87-5.68-3.58-10.78-7.48-14.69 C100.9,11.64,94.28,8.66,87,8.66h-8.87L91.51,31.02L91.51,31.02z M81.52,31.13L68.07,8.66H38.57l13.61,22.47H81.52L81.52,31.13z M42.11,31.13L28.95,9.39c-4.81,1.16-9.12,3.65-12.51,7.05c-3.9,3.9-6.6,9.01-7.48,14.69H42.11L42.11,31.13z M113.48,39.79H8.66 v47.96c0,7.17,2.89,13.7,7.56,18.48l0.22,0.21c4.8,4.8,11.43,7.79,18.7,7.79H87c7.28,0,13.9-2.98,18.69-7.77l0.02-0.02 c4.79-4.79,7.77-11.41,7.77-18.69V39.79L113.48,39.79z M50.95,54.95l26.83,17.45c0.43,0.28,0.82,0.64,1.13,1.08 c1.22,1.77,0.77,4.2-1,5.42L51.19,94.67c-0.67,0.55-1.53,0.88-2.48,0.88c-2.16,0-3.91-1.75-3.91-3.91V58.15h0.02 c0-0.77,0.23-1.55,0.7-2.23C46.76,54.15,49.19,53.72,50.95,54.95L50.95,54.95L50.95,54.95z"/></svg>`;
    wrapper.appendChild(playOverlay);
  }

  /* Common meta information (likes/replies) */
  const counts = document.createElement("div");
  counts.className = "counts";
  counts.innerHTML = `
  <span class="count like">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M12.001 4.52853C14.35 2.42 17.98 2.49 20.2426 4.75736C22.5053 7.02472 22.583 10.637 20.4786 12.993L11.9999 21.485L3.52138 12.993C1.41705 10.637 1.49571 7.01901 3.75736 4.75736C6.02157 2.49315 9.64519 2.41687 12.001 4.52853Z"></path></svg>
    ${post.likeCount ?? 0}
  </span>
  <span class="count reply">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M10 3H14C18.4183 3 22 6.58172 22 11C22 15.4183 18.4183 19 14 19V22.5C9 20.5 2 17.5 2 11C2 6.58172 5.58172 3 10 3Z"></path></svg>
    ${post.replyCount ?? 0}
  </span>
  `;

  const hover = document.createElement("div");
  hover.className = "hover-overlay";

  const overlayMeta = document.createElement("div");
  overlayMeta.className = "overlay-meta";
  overlayMeta.append(counts.cloneNode(true));

  hover.appendChild(overlayMeta);
  wrapper.appendChild(hover);

  const metaBar = document.createElement("div");
  metaBar.className = "meta-bar";
  metaBar.append(counts);

  container.appendChild(wrapper);
  container.appendChild(metaBar);
  feedEl.appendChild(container);
  });
}


// === LOADING DATA ===
function resetPaging() {
  cursor = null;
  previousCursor = null;
  seenURIs.clear();
}

async function loadInitialFeed() {
  loading = true;
  const feedEl = document.getElementById("feed");
  try {
    const result = await fetchInitialMediaPosts(9);
    renderFeed(result, false);  
  } catch (e) {
    console.error("Initial load failed:", e);
    feedEl.innerHTML = `<div class="empty">Error loading feed.</div>`;
  } finally {
    loading = false;
  }
}

/* Infinite scroll */
window.addEventListener("scroll", async () => {
  if (loading || !cursor) return;

  const scrollY = window.scrollY;
  const viewportHeight = window.innerHeight;
  const docHeight = document.documentElement.scrollHeight;

  if (scrollY + viewportHeight >= docHeight - 200) {
    loading = true; 
    const result = await fetchNextPage();
    renderFeed(result, true);
    loading = false;
  }
});


// === SETUP ===
let booted = false;

document.addEventListener("DOMContentLoaded", async () => {
  if (booted) return;
  booted = true;

  const profile = await fetchProfile(CONFIG.HANDLE);
  renderProfile(profile);

  await loadInitialFeed();
});

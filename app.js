const baseURL = "http://localhost:3000/api";

// DOM references
const authSection = document.getElementById("authSection");
const newsSection = document.getElementById("newsSection");
const profileSection = document.getElementById("profileSection");
const bookmarksSection = document.getElementById("bookmarksSection");

const homeBtn = document.getElementById("homeBtn");
const profileBtn = document.getElementById("profileBtn");
const bookmarksBtn = document.getElementById("bookmarksBtn");
const logoutBtn = document.getElementById("logoutBtn");

function showSection(section) {
  [authSection, newsSection, profileSection, bookmarksSection].forEach(s => s.classList.add("hidden"));
  section.classList.remove("hidden");
}

// ---------- AUTH ----------
const tabButtons = document.querySelectorAll(".tab-btn");
const forms = document.querySelectorAll(".auth-form");

tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    // remove active from buttons
    tabButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // show correct form
    forms.forEach(form => form.classList.remove("active"));
    document
      .getElementById(btn.dataset.tab + "Form")
      .classList.add("active");
  });
});

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = loginUsername.value;
  const password = loginPassword.value;

  const res = await fetch(`${baseURL}/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();

  if (res.ok) {
    // Only call checkLogin — it will take care of everything
    await checkLogin();
  } else {
    alert(data.message || "Login failed");
  }
});

document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = registerUsername.value;
  const password = registerPassword.value;

  const res = await fetch(`${baseURL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  alert(data.message || "Registration complete");
});

// ---------- LOAD NEWS ----------
async function loadCategories() {
  try {
    const res = await fetch(`${baseURL}/user/categories`);
    const data = await res.json();

    const select = document.getElementById("categorySelect");
    if (!data.categories || data.categories.length === 0) return;

    data.categories.forEach(cat => {
      const option = document.createElement("option");
      option.value = cat;
      option.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
      select.appendChild(option);
    });
  } catch (err) {
    console.error("Error loading categories:", err);
  }
}

loadCategories();

async function loadNews(query = "") {
  const res = await fetch(`${baseURL}/user/search?query=${query}`);
  const data = await res.json();
  const news = data.results || []; // <-- correct array

  const container = document.getElementById("newsList");
  container.innerHTML = "";

  news.forEach(item => {
    const div = document.createElement("div");
    div.className = "news-item";
    div.innerHTML = `
      <div class="news-card">
    <a href="${item.url}" target="_blank" rel="noopener noreferrer">

        <div class="news-card-header">
          <h3>${item.title}</h3>
          <p>${item.description}</p>
        </div>
    </a>
        <div class="news-card-footer">
    
          <button class="action-btn like-btn" id="like-btn-${item.news_id}" onclick="toggleLike('${item.news_id}')">
            <i class="bi bi-heart"></i>
            <span>${item.likes ?? 0}</span>
          </button>
    
          <button class="action-btn comment-btn">
            <i class="bi bi-chat-left-text"></i>
            <span id="comment-count-${item.news_id}"></span>
          </button>
    
          <button class="action-btn bookmark-btn" onclick="toggleBookmark('${item.news_id}')">
            <i class="bi bi-bookmark"></i>
          </button>
    
        </div>
    
        <div class="comment-box">
          <input type="text" id="comment-${item.news_id}" placeholder="Write a comment..." />
          <button onclick="addComment('${item.news_id}')">Send</button>
        </div>
    
        <div id="comments-${item.news_id}"></div>
    
      </div>
    `;

    container.appendChild(div);
    loadComments(item.news_id);
  });
}

/* ---------- STATE ---------- */
let searchState = {
  query: "",
  category: "",
  startDate: "",
  endDate: "",
  page: 1,
  limit: 9,
  sort: "" // example values: 'publishedAt_desc', 'publishedAt_asc', 'likes_desc'
};

/* ---------- UTILS ---------- */
function buildSearchUrl() {
  const params = new URLSearchParams();
  if (searchState.query) params.set('query', searchState.query);
  if (searchState.category) params.set('category', searchState.category);
  if (searchState.startDate) params.set('startDate', searchState.startDate);
  if (searchState.endDate) params.set('endDate', searchState.endDate);
  if (searchState.page) params.set('page', searchState.page);
  if (searchState.limit) params.set('limit', searchState.limit);

  // Sorting is not explicitly in the controller, but we can send 'sort' and handle in backend later.
  if (searchState.sort) params.set('sort', searchState.sort);

  return `${baseURL}/user/search?${params.toString()}`;
}

/* ---------- renderNews: uses same output as loadNews() for visual parity ---------- */
function renderNews(results) {
  const container = document.getElementById("newsList");
  container.innerHTML = "";

  // If results is empty
  if (!results || results.length === 0) {
    container.innerHTML = "<p>No articles found.</p>";
    return;
  }
  results.forEach(item => {
    const div = document.createElement("div");
    div.className = "news-item";
    div.innerHTML = `
      <div class="news-card">
    <a href="${item.url}" target="_blank" rel="noopener noreferrer">
        <div class="news-card-header">
          <h3>${item.title}</h3>
          <p>${item.description}</p>
        </div>
    </a>
        <div class="news-card-footer">
    
          <button class="action-btn like-btn" id="like-btn-${item.news_id}" onclick="toggleLike('${item.news_id}')">
            <i class="bi bi-heart"></i>
            <span>${item.likes ?? 0}</span>
          </button>
    
          <button class="action-btn comment-btn">
            <i class="bi bi-chat-left-text"></i>
            <span id="comment-count-${item.news_id}"></span>
          </button>
    
          <button class="action-btn bookmark-btn" onclick="toggleBookmark('${item.news_id}')">
            <i class="bi bi-bookmark"></i>
          </button>
    
        </div>
    
        <div class="comment-box">
          <input type="text" id="comment-${item.news_id}" placeholder="Write a comment..." />
          <button onclick="addComment('${item.news_id}')">Send</button>
        </div>
    
        <div id="comments-${item.news_id}"></div>
    
      </div>
    `;

    container.appendChild(div);
    loadComments(item.news_id);
  });
}

/* ---------- performSearch: builds query, fetches backend with full params, updates pagination ---------- */
async function performSearch(pushToHistory = false) {
  const url = buildSearchUrl();

  try {
    const res = await fetch(url, { credentials: "include" });
    const data = await res.json();

    // The controller returns results and pagination
    const results = data.results || [];
    renderNews(results);

    // update pagination controls using controller's pagination field if present
    const page = data.pagination?.page ?? searchState.page;
    const totalPages = data.pagination?.totalPages ?? 1;

    searchState.page = page;
    document.getElementById("currentPage").textContent = page;
    document.getElementById("totalPages").textContent = totalPages;

    // Optionally push state to history so back/forward works
    if (pushToHistory) {
      const urlState = new URLSearchParams({
        query: searchState.query,
        category: searchState.category,
        startDate: searchState.startDate,
        endDate: searchState.endDate,
        page: searchState.page,
        limit: searchState.limit,
        sort: searchState.sort
      }).toString();
      history.pushState(searchState, "", `?${urlState}`);
    }
  } catch (err) {
    console.error("Search failed:", err);
    document.getElementById("newsList").innerHTML = "<p>Error loading search results.</p>";
  }
}

/* ---------- wire up controls ---------- */
function initSearchControls() {
  const searchForm = document.getElementById("searchForm");
  const categorySelect = document.getElementById("categorySelect");
  const startDateInput = document.getElementById("startDate");
  const endDateInput = document.getElementById("endDate");
  const sortSelect = document.getElementById("sortSelect");
  const applyBtn = document.getElementById("applyBtn");

  const prevBtn = document.getElementById("prevPageBtn");
  const nextBtn = document.getElementById("nextPageBtn");

  if (!applyBtn || !prevBtn || !nextBtn) {
    console.error("Search controls missing in DOM!");
    return;
  }

  // Main search trigger
  searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    searchState.query = searchInput.value;
    searchState.category = categorySelect.value;
    searchState.startDate = startDateInput.value;
    searchState.endDate = endDateInput.value;
    searchState.sort = sortSelect.value;
    searchState.page = 1;     // reset page on new search
    performSearch(true);
  });

  // Pagination buttons
  prevBtn.addEventListener("click", () => {
    if (searchState.page > 1) {
      searchState.page--;
      performSearch(false);
    }
  });

  nextBtn.addEventListener("click", () => {
    if (searchState.page < searchState.totalPages) {
      searchState.page++;
      performSearch(false);
    }
  });
}


/* ---------- initialize on page load ---------- */
document.addEventListener("DOMContentLoaded", () => {
  performSearch(true);
  initSearchControls();   // your existing initializer (optional)

  // Pagination handlers
  const prevBtn = document.getElementById("prevPageBtn");
  const nextBtn = document.getElementById("nextPageBtn");

  prevBtn.addEventListener("click", () => {
    if (searchState.page > 1) {
      searchState.page--;
      performSearch(true);
    }
  });

  nextBtn.addEventListener("click", () => {
    const totalPages = parseInt(document.getElementById("totalPages").textContent, 10);
    if (searchState.page < totalPages) {
      searchState.page++;
      performSearch(true);
    }
  });
});



document.getElementById("searchForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const query = document.getElementById("searchInput").value;
  const category = document.getElementById("categorySelect").value;
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;
  const sort = document.getElementById("sortSelect").value;

  // Build query string
  let finalQuery = query;

  if (category) finalQuery += `&category=${category}`;
  if (startDate) finalQuery += `&startDate=${startDate}`;
  if (endDate) finalQuery += `&endDate=${endDate}`;
  if (sort === "latest") finalQuery += `&sort=desc`;
  if (sort === "oldest") finalQuery += `&sort=asc`;

  console.log("Searching:", finalQuery);

  loadNews(finalQuery);
});

const navButtons = document.querySelectorAll('nav button');

navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    navButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// ---------- COMMENTS ----------
async function loadComments(news_id) {
  // remember current news id for actions that need it
  window.currentNewsId = news_id;

  const container = document.getElementById(`comments-${news_id}`);
  if (!container) {
    // container not in DOM - nothing to render into
    console.warn(`No comments container found for news_id=${news_id}`);
    return;
  }
  container.innerHTML = "Loading comments...";

  try {
    const res = await fetch(`${baseURL}/user/comments/${news_id}`, {
      credentials: "include"
    });
    const data = await res.json();

    if (!data.comments?.length) {
      container.innerHTML = "<p>No comments yet.</p>";
      return;
    }

    // Build HTML for comments; pass news_id into loadReplies
    const htmlParts = await Promise.all(
      data.comments.map(async (c) => {
        const repliesHtml = await loadReplies(c._id, news_id); // pass news_id
        return `
  <div class="comment-item" id="comment-${c._id}">

    <div class="comment-header">
      <strong>${escapeHtml(c.username)}</strong>
      <span class="comment-text">${escapeHtml(c.comment)}</span>
    </div>

    <div class="comment-actions">

      <button class="vote-btn" onclick="voteComment('${c._id}', 'up', '${news_id}')">
        <i class="bi bi-hand-thumbs-up"></i>
      </button>

      <span class="comment-score">${c.score || 0}</span>

      <button class="vote-btn" onclick="voteComment('${c._id}', 'down', '${news_id}')">
        <i class="bi bi-hand-thumbs-down"></i>
      </button>

      <button class="reply-btn" onclick="toggleReplyBox('${c._id}')">
        <i class="bi bi-reply-fill"></i> Reply
      </button>

      <button class="delete-comment-btn" onclick="deleteComment('${news_id}', '${c._id}')">
        <i class="bi bi-trash3-fill"></i>
      </button>

    </div>

    <div id="reply-box-${c._id}" class="reply-box" style="display:none;">
      <textarea id="reply-text-${c._id}" placeholder="Write a reply..."></textarea>
      <button onclick="addReply('${news_id}', '${c._id}')">Submit</button>
    </div>

    <div class="replies replies-container">
      ${repliesHtml}
    </div>

  </div>
`;
      })
    );

    container.innerHTML = htmlParts.join("");

  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Error loading comments.</p>";
  }
}


async function addComment(news_id) {
  const input = document.getElementById(`comment-${news_id}`);
  const comment = input.value.trim();
  if (!comment) return alert("Please enter a comment");

  try {
    const res = await fetch('http://localhost:3000/api/user/comments', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ news_id, comment })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    loadComments(news_id);
    input.value = "";
  } catch (err) {
    console.error(err);
    alert("Error adding comment: " + err.message);
  }
}

async function deleteComment(news_id, commentId) {
  if (!confirm("Delete this comment?")) return;

  try {
    const res = await fetch(`${baseURL}/user/comments/${commentId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: 'include',
      body: JSON.stringify({ news_id })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    loadComments(news_id);
  } catch (err) {
    console.error(err);
    alert("Error deleting comment: " + err.message);
  }
}

async function voteComment(commentId, voteType, news_id) {
  try {
    const res = await fetch(`${baseURL}/user/comments/${commentId}/votes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ voteType })
    });

    const data = await res.json();
    if (!res.ok) return alert(data.message);

    // Reload comments properly
    loadComments(news_id);

  } catch (err) {
    console.error(err);
    alert("Error voting.");
  }
}



// ---------- REPLIES ----------
function toggleReplyBox(commentId) {
  const box = document.getElementById(`reply-box-${commentId}`);
  box.style.display = box.style.display === "none" ? "block" : "none";
}


async function loadReplies(commentId, news_id) {
  try {
    const res = await fetch(`${baseURL}/user/comments/${commentId}/replies`, {
      credentials: "include"
    });

    const data = await res.json();
    if (!data.replies?.length) return "<p class='no-replies'>No replies.</p>";

    return data.replies
      .map(r => `
        <div class="reply" id="reply-${r._id}">
          <b>${escapeHtml(r.username)}</b>: ${escapeHtml(r.comment)}

          <div class="votes">
            <button onclick="voteReply('${commentId}','${r._id}','up')">⬆</button>
            <button onclick="voteReply('${commentId}','${r._id}','down')">⬇</button>
            <span>Score: ${r.score || 0}</span>
          </div>

          <button onclick="deleteReply('${commentId}', '${r._id}', '${news_id}')">🗑️</button>
        </div>
      `)
      .join("");
  } catch (err) {
    console.error(err);
    return "<p>Error loading replies.</p>";
  }
}


async function addReply(news_id, commentId) {
  const text = document.getElementById(`reply-text-${commentId}`).value.trim();
  if (!text) return alert("Reply cannot be empty.");

  try {
    const res = await fetch(`${baseURL}/user/comments/${commentId}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ news_id, comment: text })
    });

    const data = await res.json();
    if (!res.ok) return alert(data.message);

    // Reload comments
    loadComments(news_id);

  } catch (err) {
    console.error(err);
    alert("Error adding reply.");
  }
}

async function deleteReply(commentId, replyId, news_id) {
  try {
    const res = await fetch(`${baseURL}/user/comments/${commentId}/replies/${replyId}`, {
      method: "DELETE",
      credentials: "include"
    });

    const data = await res.json();
    if (!res.ok) return alert(data.message);

    loadComments(news_id);
  } catch (err) {
    console.error(err);
    alert("Error deleting reply.");
  }
}


async function voteReply(commentId, replyId, voteType) {
  try {
    const res = await fetch(`${baseURL}/user/comments/${commentId}/replies/${replyId}/votes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ voteType })
    });
    const data = await res.json();
    if (!res.ok) return alert(data.message || 'Vote failed');
    loadComments(window.currentNewsId);
  } catch (err) {
    console.error(err);
    alert("Error voting reply.");
  }
}



//Utility function to escape HTML
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}




// ---------- LIKES ----------
async function toggleLike(newsId) {
  try {
    const res = await fetch(`${baseURL}/user/likes`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ news_id: newsId }),
    });

    const data = await res.json();
    if (!res.ok) {
      return alert(data.message);
    }

    // ---- Update only the button ----
    const btn = document.getElementById(`like-btn-${newsId}`);
    if (!btn) return;

    const icon = btn.querySelector("i");
    const countSpan = btn.querySelector("span");

    // update like count
    countSpan.textContent = data.totalLikes;

    // toggle styles/icons
    if (data.isLiked) {
      icon.classList.remove("bi-heart");
      icon.classList.add("bi-heart-fill");
      btn.classList.add("liked");
    } else {
      icon.classList.remove("bi-heart-fill");
      icon.classList.add("bi-heart");
      btn.classList.remove("liked");
    }

  } catch (err) {
    console.error("Like error:", err);
    alert("Error toggling like");
  }
}



// ---------- BOOKMARKS ----------
async function toggleBookmark(newsId) {
  await fetch(`${baseURL}/user/bookmarks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: 'include',
    body: JSON.stringify({ news_id: newsId }),
  });
  loadBookmarked();
}

async function loadBookmarked() {
  const res = await fetch(`${baseURL}/user/bookmarks/`, {
    credentials: "include"
  });

  const data = await res.json();
  const bookmarked = data.bookmarkedNews;

  const list = document.getElementById("bookmarkedList");
  list.innerHTML = ""; // clear

  for (let item of bookmarked) {
    const newsId = item.news_id;

    // Fetch full news details
    const newsRes = await fetch(`${baseURL}/user/getNews/${newsId}`);
    const newsData = await newsRes.json();

    const news = newsData.news;

    list.innerHTML += `
      <div class="news-item">
        <h4>${news.title}</h4>
      </div>
    `;
  }
}




// ---------- PROFILE ----------
async function loadProfile() {
  const res = await fetch(`${baseURL}/user/profile`, {
    headers: { "Content-Type": "application/json" },
    credentials: 'include',
  });
  const user = await res.json();
  document.getElementById("profileInfo").innerHTML = `
    <p><strong>Username:</strong> ${user.user.username}</p>
    <p><strong>Bio:</strong> ${user.user.bio_data || "No bio yet."}</p>
  `;
  document.getElementById("profileAvatar").src = user.user.profileImage || 'assets/default-avatar.png';
}

document.getElementById("saveBioBtn").addEventListener("click", async () => {
  const bio = document.getElementById("bioInput").value;
  await fetch(`${baseURL}/user/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: 'include',
    body: JSON.stringify({ bio_data: bio }),
  });
  loadProfile();
});

//PROFILE PICTURE HANDLER
document.getElementById("profileUpload").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("photo", file);

    const res = await fetch(`${baseURL}/user/upload-photo`, {
        method: "POST",
        credentials: "include",
        body: formData,
    });

    const data = await res.json();
    if (res.status === 200){
        document.getElementById("profileAvatar").src = data.profileImage;
    } else {
        alert("Error updating profile image: " + data.message);
    }
});


//PROFILE ACTIVITY
async function loadUserActivity() {
    try {
        const res = await fetch(`${baseURL}/user/activity`, {
            method: "GET",
            credentials: "include",
        });

        const data = await res.json();
        const container = document.getElementById("activityContainer");

        container.innerHTML = "";

        if (!data.activity || data.activity.length === 0) {
            container.innerHTML = `<p>No activity found.</p>`;
            return;
        }

        // Load all activity items
        for (const item of data.activity) {

            // ⬅ Fetch news details for each activity item
            const newsRes = await fetch(`${baseURL}/user/getNews/${item.news_id}`);
            const newsData = await newsRes.json();

            const title = newsData?.news?.title || "Unknown News Title";

            const card = document.createElement("div");
            card.className = "activity-card";

            card.innerHTML = `
                <div class="activity-header">
                    <h3>${title}</h3>
                </div>

                <div class="activity-body">
                    <p><strong>Liked:</strong> ${item.likes > 0 ? "Yes" : "No"}</p>
                    <p><strong>Bookmarked:</strong> ${item.bookmarked ? "Yes" : "No"}</p>

                    <div class="activity-comments">
                        <h4>Comments (${item.comments.length})</h4>
                        ${
                            item.comments.length === 0
                            ? "<p>No comments</p>"
                            : item.comments.map(c => `
                                <div class="single-comment">
                                    <p>${c.comment}</p>
                                    <span>${new Date(c.timestamp).toLocaleString()}</span>
                                </div>
                              `).join("")
                        }
                    </div>
                </div>
            `;

            container.appendChild(card);
        }

    } catch (error) {
        console.error("Error fetching user activity:", error);
    }
}



// ---------- NAVIGATION ----------
homeBtn.onclick = () => { loadNews(); showSection(newsSection); };
profileBtn.onclick = () => { loadProfile(); loadUserActivity(); showSection(profileSection); };
bookmarksBtn.onclick = () => { loadBookmarked(); showSection(bookmarksSection); };
logoutBtn.onclick = async () => {
  await fetch(`${baseURL}/auth/logout`, {
    method: "POST",
    credentials: "include"
  });

  // This will hide nav + show login section automatically
  await checkLogin();
};


async function checkLogin() {
  const nav = document.getElementById("mainNav");

  const res = await fetch(`${baseURL}/auth/verify`, {
    credentials: "include",
  });

  if (res.ok) {
    const data = await res.json();
    if (data.loggedIn) {
      nav.style.display = "flex";
      await loadNews();
      showSection(newsSection);
      return;
    }
  }

  nav.style.display = "none";
  showSection(authSection);
}

checkLogin();
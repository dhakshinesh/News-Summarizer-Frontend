/* Admin frontend (vanilla JS)
   Assumptions:
   - Backend base URL:
       const API = "http://localhost:3000/api";
   - All requests that require auth must include credentials: "include"
*/

const API = "http://localhost:3000/api";

// ---- UI elements ----
const loginSection = document.getElementById("loginSection");
const dashboard = document.getElementById("dashboard");
const usersPanel = document.getElementById("users");
const statsPanel = document.getElementById("stats");
const activityPanel = document.getElementById("userActivity");

const navDashboard = document.getElementById("nav-dashboard");
const navUsers = document.getElementById("nav-users");
const navStats = document.getElementById("nav-stats");
const navActivity = document.getElementById("nav-activity");
const adminLogout = document.getElementById("adminLogout");

const adminLoginForm = document.getElementById("adminLoginForm");
const loginMessage = document.getElementById("loginMessage");

// users
const usersList = document.getElementById("usersList");
const fetchUsersBtn = document.getElementById("fetchUsersBtn");
const userSearch = document.getElementById("userSearch");
const statusFilter = document.getElementById("statusFilter");
const usersPrev = document.getElementById("usersPrev");
const usersNext = document.getElementById("usersNext");
const usersPageEl = document.getElementById("usersPage");
const usersTotalPagesEl = document.getElementById("usersTotalPages");

let usersState = { page: 1, totalPages: 1, limit: 12 };

// activity
const viewActivityBtn = document.getElementById("viewActivityBtn");
const activityUsername = document.getElementById("activityUsername");
const activityResult = document.getElementById("activityResult");

// stats
const fetchStatsBtn = document.getElementById("fetchStats");
const statsDaysInput = document.getElementById("statsDays");
const statsContainer = document.getElementById("statsContainer");

// navigation helpers
function showPanel(panel) {
  // hide everything
  [loginSection, dashboard, usersPanel, statsPanel, activityPanel].forEach(p => p.classList.add("hidden"));
  // deactivate nav
  [navDashboard, navUsers, navStats, navActivity].forEach(n => n.classList.remove("active"));
  panel.classList.remove("hidden");
  if (panel !== loginSection) {
    showSidebar();
    }
   if (panel === loginSection) {
    hideSidebar();
    }
}

// verify admin session at load
function hideSidebar() {
  const sidebar = document.getElementById("sideMenu");
  if (sidebar) sidebar.style.display = "none";
}

function showSidebar() {
  const sidebar = document.getElementById("sideMenu");
  if (sidebar) sidebar.style.display = "block";
}

async function verifyAdmin() {
  try {
    const res = await fetch(`${API}/auth/verifyAdmin`, {
      method: "GET",
      credentials: "include"
    });

    // If request fails or returns non-200
    if (!res.ok) {
      hideSidebar();
      showPanel(loginSection);
      return;
    }

    const data = await res.json();

    // If NOT logged in
    if (!data.isAdmin || !data.user) {
      hideSidebar();
      showPanel(loginSection);
      return;
    }

    // If logged in but NOT admin
    else if (data.user.role !== "admin") {
      hideSidebar();
      showPanel(loginSection);
      return;
    }
    else {
        // Logged in as admin
        initAfterLogin();
    }

  } catch (err) {
    hideSidebar();
    showPanel(loginSection);
  }
}


// after login, initialize dashboard and users
async function initAfterLogin() {
  showPanel(dashboard);
  navDashboard.classList.add("active");
  await loadDashboard();
  await loadUsers();
}

// ---- Login ----
adminLoginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginMessage.textContent = "";
  const username = document.getElementById("adminUsername").value.trim();
  const password = document.getElementById("adminPassword").value;

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) {
      loginMessage.textContent = data.message || "Login failed";
      return;
    }
    // Check role via verify endpoint (token is set as cookie)
    const v = await fetch(`${API}/auth/verifyAdmin`, { credentials: "include" });
    if (!v.ok) {
      loginMessage.textContent = "Unable to verify admin role";
      return;
    }
    const info = await v.json();
    if (!info.user || info.user.role !== "admin") {
      loginMessage.textContent = "Admin role required";
      return;
    }
    loginMessage.textContent = "Welcome, " + info.user.username;
    initAfterLogin();
  } catch (err) {
    console.error(err);
    loginMessage.textContent = "Login error";
  }
});

// ---- Logout ----
adminLogout.addEventListener("click", async () => {
  try {
    await fetch(`${API}/auth/logoutAdmin`, { method: "POST", credentials: "include" });
  } catch (e) { /* ignore */ }
  // show login
  console.log("Logged out");
  showPanel(loginSection);
});

// ---- Nav ----
navDashboard.addEventListener("click", () => { showPanel(dashboard); navDashboard.classList.add("active"); });
navUsers.addEventListener("click", () => { showPanel(usersPanel); navUsers.classList.add("active"); });
navStats.addEventListener("click", () => { showPanel(statsPanel); navStats.classList.add("active"); loadRegistrationStats(); });
navActivity.addEventListener("click", () => { showPanel(activityPanel); navActivity.classList.add("active"); });

// ---- Dashboard ----
async function loadDashboard() {
    try {
        const res = await fetch(`${API}/admin/users?page=1&limit=1`, {
            credentials: "include"
        });
        const usersData = res.ok ? await res.json() : null;

        console.log("Dashboard users data:", usersData);

        const totalEl = document.getElementById("statTotalUsers");
        if (totalEl) totalEl.textContent = usersData ? usersData.total : "—";

        const activeEl = document.getElementById("statActiveUsers");
        if (activeEl) activeEl.textContent = usersData ? usersData.total : "—";

        const newUsersEl = document.getElementById("statNewUsers");
        if (newUsersEl) {
            const newRes = await fetch(`${API}/admin/users/new/count`, {
            credentials: "include"
        });
        const newData = newRes.ok ? await newRes.json() : null;
        console.log("Hello" + newData)
        const newUsersEl = document.getElementById("statNewUsers");
        if (newUsersEl) newUsersEl.textContent =
            newData ? newData.newUsers : "—";
        }

        // recent activity
        const recentEl = document.getElementById("recentActivities");
        if (!recentEl) return; // prevent crash

        const activitiesRes = await fetch(`${API}/admin/users/activity`, {
            credentials: "include"
        });
        const activities = activitiesRes.ok
            ? await activitiesRes.json()
            : null;
        console.log("Dashboard recent activities:", activities);
        recentEl.innerHTML = "";
        function formatActivity(it) {
            switch(it.action) {
                case "auth.login":
                    return `${it.username} logged in at ${new Date(it.createdAt).toLocaleString()}`;
                case "comment.delete":
                    return `${it.username} deleted a comment on news ${it.news_id} at ${new Date(it.createdAt).toLocaleString()}`;
                default:
                    return `${it.username} performed ${it.action}`;
            }
        }

        if (activities && activities.activities?.length) {
            activities.activities.slice(0, 6).forEach(it => {
                const div = document.createElement("div");
                div.className = "activity-item";
                div.textContent = formatActivity(it);
                recentEl.appendChild(div);
            });
        } else {
            recentEl.textContent = "No recent activity.";
        }

    } catch (err) {
        console.error("loadDashboard error:", err);
    }
}



// ---- Users ----
fetchUsersBtn.addEventListener("click", () => { usersState.page = 1; loadUsers(); });
usersPrev.addEventListener("click", () => { if (usersState.page > 1) { usersState.page--; loadUsers(); }});
usersNext.addEventListener("click", () => { if (usersState.page < usersState.totalPages) { usersState.page++; loadUsers(); }});

async function loadUsers() {
  usersList.innerHTML = "Loading...";
  const page = usersState.page;
  const limit = usersState.limit;
  const search = userSearch.value.trim();
  const status = statusFilter.value;

  const params = new URLSearchParams({ page, limit });
  if (status) params.set("status", status);
  if (search) params.set("search", search);

  try {
    const res = await fetch(`${API}/admin/users?${params.toString()}`, { credentials: "include" });
    if (!res.ok) {
      usersList.innerHTML = "Failed to load users";
      return;
    }
    const data = await res.json();
    usersState.totalPages = data.totalPages || 1;
    usersPageEl.textContent = data.page || page;
    usersTotalPagesEl.textContent = usersState.totalPages;

    usersList.innerHTML = "";
    data.users.forEach(u => {
    const row = document.createElement("div");
    row.className = "user-row";

    // Determine toggle button label
    const isSuspended = u.status === "suspended";
    const buttonLabel = isSuspended ? "Unsuspend" : "Suspend";
    const isAdminUser = u.role === "admin";

    row.innerHTML = `
        <div class="user-meta">
        <div><strong>${u.username}</strong></div>
        <div class="muted">${u.status || 'active'}</div>
        </div>
        <div class="user-actions">
        <button class="secondary" onclick="viewUserActivity('${u.username}')">Activity</button>

        <button 
            class="secondary" 
            onclick="toggleSuspend('${u._id}', '${u.status}')"
            ${isAdminUser ? "disabled" : ""}
        >
            ${buttonLabel}
        </button>

        <button class="danger" onclick="permanentDeleteUser('${u._id}')"
            ${isAdminUser ? "disabled" : ""}
        >Delete</button>
        </div>
    `;

    usersList.appendChild(row);
    });

  } catch (err) {
    console.error(err);
    usersList.innerHTML = "Error loading users";
  }
}

// expose functions to window so inline onclick works
window.viewUserActivity = async function(username) {
  showPanel(activityPanel);
  navActivity.classList.add("active");
  activityUsername.value = username;
  await fetchUserActivity(username);
};

window.toggleSuspend = async function(id, status) {
  const isSuspended = status === "suspended";

  if (!confirm(isSuspended ? "Unsuspend this user?" : "Suspend this user?")) return;

  const endpoint = isSuspended
    ? `${API}/admin/users/${id}/unsuspend`
    : `${API}/admin/users/${id}/suspend`;

  await fetch(endpoint, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });

  loadUsers();
};

window.unsuspendUser = async function(id) {
  if (!confirm("Unsuspend this user?")) return;
  await fetch(`${API}/admin/users/${id}/unsuspend`, {
    method: "POST", credentials: "include", headers: {"Content-Type":"application/json"}, body: JSON.stringify({})
  });
  loadUsers();
};


window.permanentDeleteUser = async function(id) {
  if (!confirm("Permanently delete this user? This cannot be undone.")) return;
  await fetch(`${API}/admin/users/${id}`, {
    method: "DELETE", credentials: "include", headers: {"Content-Type":"application/json"}, body: JSON.stringify({confirm: true})
  });
  loadUsers();
};

// ---- User Activity (admin view) ----
viewActivityBtn.addEventListener("click", () => {
  const username = activityUsername.value.trim();
  if (!username) { activityResult.innerHTML = "Enter a username"; return; }
  fetchUserActivity(username);
});

async function fetchUserActivity(username) {
  activityResult.innerHTML = "Loading...";
  try {
    const res = await fetch(`${API}/admin/users/${encodeURIComponent(username)}/activity`, { credentials: "include" });
    if (!res.ok) {
      activityResult.innerHTML = "No activity or error.";
      return;
    }
    const data = await res.json();
    // render activities
    if (!data.activities || data.activities.length === 0) {
      activityResult.innerHTML = "<p>No activity found.</p>"; return;
    }
    activityResult.innerHTML = data.activities.map(a => `
      <div class="panel-section" style="margin-bottom:8px;">
        <div><strong>${a.action}</strong> — <span class="muted">${new Date(a.createdAt).toLocaleString()}</span></div>
        <div class="muted">${JSON.stringify(a.meta || {})}</div>
      </div>
    `).join("");
  } catch (err) {
    console.error(err); activityResult.innerHTML = "Error fetching activity.";
  }
}

// ---- Stats ----
fetchStatsBtn.addEventListener("click", loadRegistrationStats);
let regChart = null;

async function loadRegistrationStats() {
    console.log("Loading stats...");
    statsContainer.textContent = "Loading...";

    const days = Math.max(7, parseInt(statsDaysInput.value || 30, 10));

    try {
        const res = await fetch(`${API}/admin/stats/registrations?days=${days}`, {
            credentials: "include",
        });

        if (!res.ok) {
            statsContainer.textContent = "Failed to load";
            return;
        }

        const data = await res.json();
        const stats = data.registrationStats;  // array of {date, count}

        const labels = stats.map(s => s.date);
        const counts = stats.map(s => s.count);

        statsContainer.innerHTML = `<canvas id="regChart"></canvas>`;

        const ctx = document.getElementById("regChart").getContext("2d");

        // Destroy old chart if exists
        if (regChart) regChart.destroy();

        regChart = new Chart(ctx, {
            type: "line",
            data: {
                labels,
                datasets: [
                    {
                        label: "Registrations",
                        data: counts,
                        borderWidth: 2,
                        fill: false,
                        tension: 0.2,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // prevents height stretching
                scales: {
                    y: {
                        beginAtZero: true,       // stops crazy scaling
                        suggestedMax: Math.max(...counts) + 2 // neat top padding
                    },
                },
            },
        });
    } catch (err) {
        console.error(err);
        statsContainer.textContent = "Error loading stats.";
    }
}

// ---- Init ----
verifyAdmin();


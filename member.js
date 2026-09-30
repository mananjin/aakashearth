/* =========================================================
   AAKASH EARTH - MEMBER DASHBOARD
   firebase.js KO TOUCH NAHI KARNA
   Firebase Storage intentionally NOT used for task proof.
========================================================= */

import {
  db,
  ref,
  get,
  onValue,
  push,
  set,
  update
} from "./firebase.js";


/* =========================================================
   SESSION
========================================================= */

const loginRole =
  sessionStorage.getItem("aakashLoginRole");

const memberLogin =
  sessionStorage.getItem("aakashMemberLogin");

const memberKey =
  sessionStorage.getItem("aakashMemberKey");

const sessionMemberId =
  sessionStorage.getItem("aakashMemberId") || "";

if (
  loginRole !== "member" ||
  memberLogin !== "true" ||
  !memberKey
) {
  window.location.replace("login.html");
  throw new Error("Member login required.");
}


/* =========================================================
   HELPERS
========================================================= */

const $ = (selector) =>
  document.querySelector(selector);

const $$ = (selector) =>
  [...document.querySelectorAll(selector)];

function text(id, value) {
  const element =
    document.getElementById(id);

  if (element) {
    element.textContent =
      value === undefined ||
      value === null ||
      value === ""
        ? "—"
        : value;
  }
}

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalize(value = "") {
  return String(value)
    .trim()
    .toLowerCase();
}

function safeImage(value = "") {
  const url =
    String(value || "").trim();

  if (
    url.startsWith("https://") ||
    url.startsWith("http://") ||
    url.startsWith("data:image/")
  ) {
    return url;
  }

  return "";
}

function objectToArray(data) {
  if (!data || typeof data !== "object") {
    return [];
  }

  return Object.entries(data).map(
    ([key, value]) => ({
      key,
      ...(value || {})
    })
  );
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return escapeHTML(value);
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  ).format(date);
}

function showFormMessage(
  element,
  message,
  type = "success"
) {
  if (!element) return;

  element.textContent = message;

  element.className =
    `form-message show ${type}`;
}

function clearFormMessage(element) {
  if (!element) return;

  element.textContent = "";
  element.className = "form-message";
}

function publicStatus(item) {
  const status =
    normalize(item?.status);

  return (
    !status ||
    status === "active" ||
    status === "approved" ||
    status === "published" ||
    status === "upcoming"
  );
}


/* =========================================================
   STATE
========================================================= */

let currentMember = null;
let memberTasks = [];
let selectedTaskKey = null;
let selectedTaskFile = null;

let currentTaskFilter = "all";

let complaints = [];
let proposals = [];


/* =========================================================
   SIDEBAR / PANEL NAVIGATION
========================================================= */

const sidebar =
  $("#memberSidebar");

const menuButton =
  $("#memberMenuBtn");

const pageTitle =
  $("#memberPageTitle");

const panelTitles = {
  dashboard: "Dashboard",
  profile: "My Profile",
  idcard: "My I-Card",
  tasks: "My Tasks",
  points: "Points & Rating",
  history: "Task History",
  organize: "Organize & Manage",
  complaints: "Complaints Against Me",
  receipts: "Receipts / Vargani",
  volunteers: "Volunteers",
  festivals: "Festivals",
  sports: "Sports",
  updates: "Updates",
  gallery: "Gallery"
};

function openPanel(panelName) {
  const target =
    document.querySelector(
      `[data-panel-content="${panelName}"]`
    );

  if (!target) return;

  $$(".member-panel").forEach(
    (panel) => {
      panel.classList.remove("active");
    }
  );

  target.classList.add("active");

  $$(".member-link[data-panel]").forEach(
    (button) => {
      button.classList.toggle(
        "active",
        button.dataset.panel === panelName
      );
    }
  );

  if (pageTitle) {
    pageTitle.textContent =
      panelTitles[panelName] ||
      "Member Portal";
  }

  sidebar?.classList.remove("open");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

$$(".member-link[data-panel]").forEach(
  (button) => {
    button.addEventListener(
      "click",
      () => {
        openPanel(
          button.dataset.panel
        );
      }
    );
  }
);

$$("[data-open-panel]").forEach(
  (button) => {
    button.addEventListener(
      "click",
      () => {
        openPanel(
          button.dataset.openPanel
        );
      }
    );
  }
);

menuButton?.addEventListener(
  "click",
  () => {
    sidebar?.classList.toggle("open");
  }
);


/* =========================================================
   LOGOUT
========================================================= */

$("#memberLogout")?.addEventListener(
  "click",
  () => {
    [
      "aakashLoginRole",

      "aakashMemberLogin",
      "aakashMemberKey",
      "aakashMemberId",
      "aakashMemberName",
      "aakashMemberUsername"
    ].forEach((key) => {
      sessionStorage.removeItem(key);
    });

    window.location.replace(
      "login.html"
    );
  }
);


/* =========================================================
   MEMBER PROFILE
========================================================= */

function setPhoto(elementId, photoURL) {
  const element =
    document.getElementById(elementId);

  if (!element) return;

  const image =
    safeImage(photoURL);

  if (!image) {
    element.innerHTML = "👤";
    return;
  }

  element.innerHTML = `
    <img
      src="${image}"
      alt="Member Photo"
      onerror="
        this.parentElement.innerHTML='👤';
      "
    >
  `;
}

function renderMemberProfile() {
  if (!currentMember) return;

  const member =
    currentMember;

  const name =
    member.name || "Member";

  const id =
    member.memberId ||
    sessionMemberId ||
    "—";

  const position =
    member.position ||
    "Member";

  const year =
    member.year || "—";

  const status =
    member.status || "—";

  text("sidebarMemberName", name);
  text("sidebarMemberId", id);

  text("topMemberName", name);
  text("welcomeMemberName", name);

  text("dashboardMemberId", id);
  text(
    "dashboardMemberPosition",
    position
  );
  text(
    "dashboardMemberYear",
    year
  );
  text(
    "dashboardMemberStatus",
    status
  );

  text("profileMemberName", name);
  text("profileMemberId", id);
  text(
    "profileMemberPosition",
    position
  );

  text("detailMemberId", id);
  text("detailMemberName", name);

  text(
    "detailMemberMobile",
    member.mobile || "—"
  );

  text(
    "detailMemberPosition",
    position
  );

  text(
    "detailMemberUsername",
    member.username || "—"
  );

  text("detailMemberYear", year);
  text(
    "detailMemberStatus",
    status
  );

  text(
    "detailMemberAddress",
    member.address || "—"
  );

  setPhoto(
    "sidebarMemberPhoto",
    member.photoURL
  );

  setPhoto(
    "profileMemberPhoto",
    member.photoURL
  );

  updatePointsAndRating();
}

onValue(
  ref(db, `members/${memberKey}`),

  (snapshot) => {
    if (!snapshot.exists()) {
      alert(
        "Member account not found."
      );

      sessionStorage.clear();

      window.location.replace(
        "login.html"
      );

      return;
    }

    currentMember = {
      key: memberKey,
      ...snapshot.val()
    };

    if (
      normalize(
        currentMember.status
      ) !== "active"
    ) {
      alert(
        "Your member account is inactive."
      );

      sessionStorage.clear();

      window.location.replace(
        "login.html"
      );

      return;
    }

    renderMemberProfile();
    renderComplaints();
  },

  (error) => {
    console.error(
      "Member profile error:",
      error
    );
  }
);


/* =========================================================
   I-CARD
========================================================= */

function openIdCard() {
  const id =
    currentMember?.memberId ||
    sessionMemberId;

  if (!id) {
    alert(
      "Member ID is not available."
    );

    return;
  }

  window.location.href =
    `id-card.html?id=${encodeURIComponent(id)}&type=member`;
}

$("#dashboardViewIdCard")
  ?.addEventListener(
    "click",
    openIdCard
  );

$("#viewMemberIdCard")
  ?.addEventListener(
    "click",
    openIdCard
  );


/* =========================================================
   TASKS
========================================================= */

function taskStatusLabel(status) {
  const value =
    normalize(status);

  const labels = {
    assigned: "Assigned",
    pending_review:
      "Pending Review",
    completed: "Completed",
    rejected: "Rejected"
  };

  return labels[value] ||
    value ||
    "Assigned";
}

function taskStatusStyle(status) {
  const value =
    normalize(status);

  if (value === "completed") {
    return `
      color:#0a6953;
      background:rgba(20,125,100,.09);
    `;
  }

  if (value === "rejected") {
    return `
      color:#842d3a;
      background:rgba(122,36,48,.09);
    `;
  }

  if (value === "pending_review") {
    return `
      color:#8b661c;
      background:rgba(214,173,69,.14);
    `;
  }

  return `
    color:#164f76;
    background:rgba(18,59,99,.08);
  `;
}

function createTaskCard(task) {
  const status =
    normalize(task.status) ||
    "assigned";

  const title =
    escapeHTML(
      task.title ||
      task.taskTitle ||
      "Member Task"
    );

  const description =
    escapeHTML(
      task.description ||
      task.details ||
      ""
    );

  const deadline =
    task.deadline ||
    task.dueDate ||
    "";

  const points =
    Number(task.points) || 0;

  const canSubmit =
    status === "assigned" ||
    status === "rejected";

  return `
    <article
      class="dashboard-card"
      style="padding:20px;"
    >

      <div
        style="
          display:flex;
          justify-content:space-between;
          gap:15px;
          align-items:flex-start;
        "
      >

        <div>

          <strong
            style="
              display:block;
              color:#071a2b;
              font-family:Cinzel,serif;
              font-size:14px;
            "
          >
            ${title}
          </strong>

          ${
            description
              ? `
                <p
                  style="
                    margin-top:8px;
                    color:#687681;
                    font-size:10px;
                    line-height:1.6;
                  "
                >
                  ${description}
                </p>
              `
              : ""
          }

        </div>

        <span
          style="
            flex-shrink:0;
            padding:7px 10px;
            border-radius:30px;
            font-size:8px;
            font-weight:800;
            ${taskStatusStyle(status)}
          "
        >
          ${taskStatusLabel(status)}
        </span>

      </div>

      <div
        style="
          display:flex;
          flex-wrap:wrap;
          gap:10px;
          margin-top:15px;
          color:#687681;
          font-size:9px;
        "
      >

        <span>
          📅 Deadline:
          ${deadline
            ? formatDate(deadline)
            : "No deadline"}
        </span>

        <span>
          ⭐ ${points} Points
        </span>

      </div>

      ${
        task.adminReply
          ? `
            <div
              style="
                margin-top:13px;
                padding:11px;
                border-radius:10px;
                background:#f7f2e7;
                color:#58646c;
                font-size:9px;
                line-height:1.5;
              "
            >
              <strong>
                Admin:
              </strong>
              ${escapeHTML(
                task.adminReply
              )}
            </div>
          `
          : ""
      }

      ${
        canSubmit
          ? `
            <button
              type="button"
              class="member-submit open-task-modal"
              data-task-key="${escapeHTML(
                task.key
              )}"
              style="margin-top:15px;"
            >
              ${
                status === "rejected"
                  ? "Resubmit Task →"
                  : "Complete Task →"
              }
            </button>
          `
          : ""
      }

    </article>
  `;
}

function filteredTasks() {
  if (
    currentTaskFilter === "all"
  ) {
    return memberTasks;
  }

  return memberTasks.filter(
    (task) =>
      normalize(task.status) ===
      currentTaskFilter
  );
}

function renderTasks() {
  const container =
    $("#memberTaskList");

  if (!container) return;

  const tasks =
    filteredTasks();

  if (!tasks.length) {
    container.innerHTML = `
      <div class="empty-state">
        No tasks found in this category.
      </div>
    `;

    return;
  }

  container.innerHTML =
    tasks
      .map(createTaskCard)
      .join("");

  $$(".open-task-modal").forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          openTaskModal(
            button.dataset.taskKey
          );
        }
      );
    }
  );
}

function renderTaskHistory() {
  const container =
    $("#memberTaskHistory");

  if (!container) return;

  const history =
    memberTasks.filter((task) => {
      const status =
        normalize(task.status);

      return (
        status === "completed" ||
        status === "rejected" ||
        status === "pending_review"
      );
    });

  if (!history.length) {
    container.innerHTML = `
      <div class="empty-state">
        No task history available.
      </div>
    `;

    return;
  }

  container.innerHTML = `
    <div class="table-wrap">

      <table class="member-table">

        <thead>
          <tr>
            <th>Task</th>
            <th>Status</th>
            <th>Points</th>
            <th>Submitted</th>
          </tr>
        </thead>

        <tbody>

          ${history
            .map(
              (task) => `
                <tr>
                  <td>
                    ${escapeHTML(
                      task.title ||
                      task.taskTitle ||
                      "Task"
                    )}
                  </td>

                  <td>
                    ${taskStatusLabel(
                      task.status
                    )}
                  </td>

                  <td>
                    ${Number(
                      task.points
                    ) || 0}
                  </td>

                  <td>
                    ${
                      task.submittedAt
                        ? formatDate(
                            task.submittedAt
                          )
                        : "—"
                    }
                  </td>
                </tr>
              `
            )
            .join("")}

        </tbody>

      </table>

    </div>
  `;
}

function updateTaskStats() {
  const completed =
    memberTasks.filter(
      (task) =>
        normalize(task.status) ===
        "completed"
    );

  text(
    "memberTotalTasks",
    memberTasks.length
  );

  text(
    "memberCompletedTasks",
    completed.length
  );

  updatePointsAndRating();
}

onValue(
  ref(
    db,
    `memberTasks/${memberKey}`
  ),

  (snapshot) => {
    memberTasks =
      objectToArray(
        snapshot.val()
      ).sort(
        (a, b) =>
          Number(
            b.createdAt || 0
          ) -
          Number(
            a.createdAt || 0
          )
      );

    renderTasks();
    renderTaskHistory();
    updateTaskStats();
  },

  (error) => {
    console.error(
      "Member tasks error:",
      error
    );

    const container =
      $("#memberTaskList");

    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          Unable to load tasks.
        </div>
      `;
    }
  }
);

$$(".task-filter").forEach(
  (button) => {
    button.addEventListener(
      "click",
      () => {
        currentTaskFilter =
          button.dataset.taskFilter ||
          "all";

        $$(".task-filter").forEach(
          (item) => {
            item.classList.toggle(
              "active",
              item === button
            );
          }
        );

        renderTasks();
      }
    );
  }
);


/* =========================================================
   POINTS & RATING
========================================================= */

function updatePointsAndRating() {
  const completedTasks =
    memberTasks.filter(
      (task) =>
        normalize(task.status) ===
        "completed"
    );

  /*
    Priority:
    1. Member profile points/rating if admin saved them.
    2. Otherwise completed task values.
  */

  const calculatedPoints =
    completedTasks.reduce(
      (total, task) =>
        total +
        (Number(task.points) || 0),
      0
    );

  const savedPoints =
    Number(currentMember?.points);

  const points =
    Number.isFinite(savedPoints) &&
    currentMember?.points !== undefined
      ? savedPoints
      : calculatedPoints;

  let rating =
    currentMember?.rating;

  if (
    rating === undefined ||
    rating === null ||
    rating === ""
  ) {
    const ratings =
      completedTasks
        .map(
          (task) =>
            Number(task.rating)
        )
        .filter(
          (value) =>
            Number.isFinite(value) &&
            value > 0
        );

    if (ratings.length) {
      rating =
        (
          ratings.reduce(
            (a, b) => a + b,
            0
          ) /
          ratings.length
        ).toFixed(1);
    } else {
      rating = "-";
    }
  }

  text("memberPoints", points);
  text("memberRating", rating);

  text(
    "pointsPageTotal",
    points
  );

  text(
    "pointsPageRating",
    rating
  );
}


/* =========================================================
   TASK MODAL
========================================================= */

const taskModal =
  $("#memberTaskModal");

const proofInput =
  $("#memberTaskProofPhoto");

const proofPreview =
  $("#memberTaskProofPreview");

const taskFormMessage =
  $("#memberTaskFormMessage");

function openTaskModal(taskKey) {
  const task =
    memberTasks.find(
      (item) =>
        item.key === taskKey
    );

  if (!task) return;

  selectedTaskKey = taskKey;
  selectedTaskFile = null;

  text(
    "memberTaskModalTitle",
    task.title ||
    task.taskTitle ||
    "Complete Task"
  );

  text(
    "memberTaskModalDescription",
    task.description ||
    task.details ||
    "—"
  );

  text(
    "memberTaskModalDeadline",
    task.deadline ||
    task.dueDate
      ? formatDate(
          task.deadline ||
          task.dueDate
        )
      : "No deadline"
  );

  text(
    "memberTaskModalPoints",
    Number(task.points) || 0
  );

  if (proofInput) {
    proofInput.value = "";
  }

  if (proofPreview) {
    proofPreview.src = "";
    proofPreview.style.display =
      "none";
  }

  clearFormMessage(
    taskFormMessage
  );

  taskModal?.classList.add(
    "open"
  );
}

function closeTaskModal() {
  taskModal?.classList.remove(
    "open"
  );

  selectedTaskKey = null;
  selectedTaskFile = null;

  if (proofPreview) {
    proofPreview.src = "";
    proofPreview.style.display =
      "none";
  }
}

$("#closeMemberTaskModal")
  ?.addEventListener(
    "click",
    closeTaskModal
  );

taskModal?.addEventListener(
  "click",
  (event) => {
    if (event.target === taskModal) {
      closeTaskModal();
    }
  }
);


/* =========================================================
   LOCAL TASK PHOTO PREVIEW
   NO FIREBASE STORAGE
========================================================= */

proofInput?.addEventListener(
  "change",
  () => {
    clearFormMessage(
      taskFormMessage
    );

    const file =
      proofInput.files?.[0];

    selectedTaskFile = null;

    if (!file) {
      proofPreview.style.display =
        "none";

      return;
    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      proofInput.value = "";

      showFormMessage(
        taskFormMessage,
        "Please select an image file.",
        "error"
      );

      return;
    }

    const maxSize =
      5 * 1024 * 1024;

    if (file.size > maxSize) {
      proofInput.value = "";

      showFormMessage(
        taskFormMessage,
        "Image must be 5 MB or smaller.",
        "error"
      );

      return;
    }

    selectedTaskFile = file;

    const reader =
      new FileReader();

    reader.onload = () => {
      proofPreview.src =
        reader.result;

      proofPreview.style.display =
        "block";
    };

    reader.readAsDataURL(file);
  }
);


/* =========================================================
   SUBMIT TASK
   TEMPORARY STORAGE WORKAROUND
========================================================= */

$("#submitMemberTaskProof")
  ?.addEventListener(
    "click",
    async () => {
      if (!selectedTaskKey) {
        return;
      }

      const button =
        $("#submitMemberTaskProof");

      try {
        button.disabled = true;

        showFormMessage(
          taskFormMessage,
          "Submitting task...",
          "success"
        );

        /*
          IMPORTANT:
          Photo Firebase Storage me upload nahi ho rahi.
          Sirf filename save ho raha hai.
        */

        await update(
          ref(
            db,
            `memberTasks/${memberKey}/${selectedTaskKey}`
          ),
          {
            status:
              "pending_review",

            proofURL: "",

            proofPhotoName:
              selectedTaskFile?.name ||
              "",

            proofStoragePending:
              Boolean(
                selectedTaskFile
              ),

            submittedAt:
              Date.now(),

            updatedAt:
              Date.now()
          }
        );

        showFormMessage(
          taskFormMessage,
          "Task submitted for admin review. Photo upload is temporarily disabled while Storage is being fixed.",
          "success"
        );

        setTimeout(() => {
          closeTaskModal();
        }, 1700);
      }

      catch (error) {
        console.error(
          "Task submit error:",
          error
        );

        showFormMessage(
          taskFormMessage,
          "Unable to submit task. Please try again.",
          "error"
        );
      }

      finally {
        button.disabled = false;
      }
    }
  );


/* =========================================================
   MEMBER PROPOSALS
========================================================= */

const organizeForm =
  $("#memberOrganizeForm");

const organizeMessage =
  $("#organizeFormMessage");

organizeForm?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    clearFormMessage(
      organizeMessage
    );

    if (!currentMember) {
      showFormMessage(
        organizeMessage,
        "Member information is still loading.",
        "error"
      );

      return;
    }

    const type =
      $("#organizeType")?.value
        .trim();

    const title =
      $("#organizeTitle")?.value
        .trim();

    const date =
      $("#organizeDate")?.value ||
      "";

    const time =
      $("#organizeTime")?.value ||
      "";

    const venue =
      $("#organizeVenue")?.value
        .trim() || "";

    const description =
      $("#organizeDescription")
        ?.value.trim();

    if (
      !type ||
      !title ||
      !description
    ) {
      showFormMessage(
        organizeMessage,
        "Please complete all required fields.",
        "error"
      );

      return;
    }

    try {
      const proposalRef =
        push(
          ref(db, "proposals")
        );

      await set(
        proposalRef,
        {
          type,
          title,
          date,
          time,
          venue,
          description,

          organizerType:
            "member",

          organizerKey:
            memberKey,

          organizerId:
            currentMember.memberId ||
            sessionMemberId ||
            "",

          organizerName:
            currentMember.name ||
            "Member",

          status:
            "pending",

          approvedBy:
            null,

          createdAt:
            Date.now(),

          updatedAt:
            Date.now()
        }
      );

      organizeForm.reset();

      showFormMessage(
        organizeMessage,
        "Proposal submitted successfully. Admin approval is pending.",
        "success"
      );
    }

    catch (error) {
      console.error(
        "Proposal error:",
        error
      );

      showFormMessage(
        organizeMessage,
        "Unable to submit proposal.",
        "error"
      );
    }
  }
);

function renderProposals() {
  const container =
    $("#memberOrganizeList");

  if (!container) return;

  if (!proposals.length) {
    container.innerHTML = `
      <div class="empty-state">
        No proposals submitted yet.
      </div>
    `;

    return;
  }

  container.innerHTML =
    proposals
      .map((proposal) => {
        const status =
          normalize(
            proposal.status
          ) || "pending";

        return `
          <div
            style="
              padding:15px;
              margin-bottom:10px;
              border:1px solid rgba(7,26,43,.08);
              border-radius:13px;
              background:#faf7f0;
            "
          >

            <div
              style="
                display:flex;
                justify-content:space-between;
                gap:12px;
              "
            >

              <strong
                style="
                  color:#071a2b;
                  font-size:11px;
                "
              >
                ${escapeHTML(
                  proposal.title ||
                  "Proposal"
                )}
              </strong>

              <span
                style="
                  font-size:8px;
                  font-weight:800;
                  color:#a77a20;
                "
              >
                ${escapeHTML(
                  status.toUpperCase()
                )}
              </span>

            </div>

            <p
              style="
                margin-top:7px;
                color:#687681;
                font-size:9px;
                line-height:1.5;
              "
            >
              ${escapeHTML(
                proposal.type || ""
              )}

              ${
                proposal.date
                  ? ` • ${formatDate(
                      proposal.date
                    )}`
                  : ""
              }
            </p>

            ${
              proposal.adminReply
                ? `
                  <p
                    style="
                      margin-top:8px;
                      font-size:9px;
                      color:#58646c;
                    "
                  >
                    <strong>
                      Admin:
                    </strong>
                    ${escapeHTML(
                      proposal.adminReply
                    )}
                  </p>
                `
                : ""
            }

          </div>
        `;
      })
      .join("");
}

onValue(
  ref(db, "proposals"),

  (snapshot) => {
    proposals =
      objectToArray(
        snapshot.val()
      )
        .filter(
          (proposal) =>
            proposal.organizerType ===
              "member" &&
            proposal.organizerKey ===
              memberKey
        )
        .sort(
          (a, b) =>
            Number(
              b.createdAt || 0
            ) -
            Number(
              a.createdAt || 0
            )
        );

    renderProposals();
  },

  (error) => {
    console.error(
      "Proposal load error:",
      error
    );
  }
);


/* =========================================================
   COMPLAINTS AGAINST MEMBER
========================================================= */

function complaintMatchesMember(
  complaint
) {
  if (!currentMember) {
    return false;
  }

  if (
    normalize(
      complaint.complaintAgainstType
    ) !== "member"
  ) {
    return false;
  }

  const complaintId =
    normalize(
      complaint.complaintAgainstId
    );

  const memberId =
    normalize(
      currentMember.memberId ||
      sessionMemberId
    );

  if (
    complaintId &&
    memberId &&
    complaintId === memberId
  ) {
    return true;
  }

  /*
    Fallback only if ID was not saved
    in an older complaint record.
  */

  if (!complaintId) {
    return (
      normalize(
        complaint.complaintAgainstName
      ) ===
      normalize(
        currentMember.name
      )
    );
  }

  return false;
}

function renderComplaints() {
  const body =
    $("#memberComplaintList");

  if (!body) return;

  const myComplaints =
    complaints
      .filter(
        complaintMatchesMember
      )
      .sort(
        (a, b) =>
          Number(
            b.createdAt || 0
          ) -
          Number(
            a.createdAt || 0
          )
      );

  text(
    "memberComplaintCount",
    myComplaints.length
  );

  if (!myComplaints.length) {
    body.innerHTML = `
      <tr>
        <td colspan="5">
          No complaints are linked to your Member ID.
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML =
    myComplaints
      .map(
        (complaint) => `
          <tr>

            <td>
              ${escapeHTML(
                complaint.complaintId ||
                "—"
              )}
            </td>

            <td>
              ${escapeHTML(
                complaint.reason ||
                "—"
              )}
            </td>

            <td>
              ${
                complaint.incidentDate
                  ? formatDate(
                      complaint.incidentDate
                    )
                  : "—"
              }
            </td>

            <td>
              ${escapeHTML(
                String(
                  complaint.status ||
                  "submitted"
                )
                  .replaceAll(
                    "_",
                    " "
                  )
              )}
            </td>

            <td>
              ${escapeHTML(
                complaint.adminReply ||
                "No reply yet"
              )}
            </td>

          </tr>
        `
      )
      .join("");
}

onValue(
  ref(db, "complaints"),

  (snapshot) => {
    complaints =
      objectToArray(
        snapshot.val()
      );

    renderComplaints();
  },

  (error) => {
    console.error(
      "Complaint load error:",
      error
    );
  }
);


/* =========================================================
   PUBLIC MODULE CARD
========================================================= */

function createModuleCard(
  item,
  icon = "✦"
) {
  const title =
    escapeHTML(
      item.title ||
      item.name ||
      "AAKASH EARTH"
    );

  const description =
    escapeHTML(
      item.description ||
      item.details ||
      item.message ||
      ""
    );

  const image =
    safeImage(
      item.photoURL ||
      item.imageURL ||
      item.image ||
      ""
    );

  return `
    <article
      class="dashboard-card"
      style="overflow:hidden;padding:0;"
    >

      <div
        style="
          height:160px;
          overflow:hidden;
          display:grid;
          place-items:center;
          background:linear-gradient(
            135deg,
            #123b63,
            #071a2b
          );
          color:#f2d78b;
          font-size:40px;
        "
      >
        ${
          image
            ? `
              <img
                src="${image}"
                alt="${title}"
                loading="lazy"
                style="
                  width:100%;
                  height:100%;
                  object-fit:cover;
                "
              >
            `
            : icon
        }
      </div>

      <div style="padding:17px;">

        <strong
          style="
            display:block;
            color:#071a2b;
            font-family:Cinzel,serif;
            font-size:12px;
          "
        >
          ${title}
        </strong>

        ${
          description
            ? `
              <p
                style="
                  margin-top:7px;
                  color:#687681;
                  font-size:9px;
                  line-height:1.55;
                "
              >
                ${description}
              </p>
            `
            : ""
        }

      </div>

    </article>
  `;
}

function renderPublicModule(
  containerId,
  data,
  icon,
  emptyText
) {
  const container =
    document.getElementById(
      containerId
    );

  if (!container) return;

  const visible =
    data.filter(publicStatus);

  if (!visible.length) {
    container.innerHTML = `
      <div class="empty-state">
        ${escapeHTML(emptyText)}
      </div>
    `;

    return;
  }

  container.innerHTML =
    visible
      .map(
        (item) =>
          createModuleCard(
            item,
            icon
          )
      )
      .join("");
}


/* =========================================================
   VOLUNTEERS
========================================================= */

onValue(
  ref(db, "volunteers"),

  (snapshot) => {
    const volunteers =
      objectToArray(
        snapshot.val()
      )
        .filter(
          (volunteer) =>
            normalize(
              volunteer.status
            ) === "approved"
        )
        .map(
          (volunteer) => ({
            ...volunteer,
            description:
              volunteer.volunteerId ||
              "Approved Volunteer"
          })
        );

    renderPublicModule(
      "memberVolunteerList",
      volunteers,
      "🤝",
      "No approved volunteers available."
    );
  }
);


/* =========================================================
   FESTIVALS
========================================================= */

onValue(
  ref(db, "festivals"),

  (snapshot) => {
    renderPublicModule(
      "memberFestivalList",
      objectToArray(
        snapshot.val()
      ),
      "🪔",
      "Festival information will appear here."
    );
  }
);


/* =========================================================
   SPORTS
========================================================= */

onValue(
  ref(db, "sports"),

  (snapshot) => {
    renderPublicModule(
      "memberSportsList",
      objectToArray(
        snapshot.val()
      ),
      "🏆",
      "Sports activities will appear here."
    );
  }
);


/* =========================================================
   UPDATES
========================================================= */

onValue(
  ref(db, "updates"),

  (snapshot) => {
    renderPublicModule(
      "memberUpdatesList",
      objectToArray(
        snapshot.val()
      ),
      "📢",
      "Community updates will appear here."
    );
  }
);


/* =========================================================
   GALLERY
========================================================= */

onValue(
  ref(db, "gallery"),

  (snapshot) => {
    renderPublicModule(
      "memberGalleryList",
      objectToArray(
        snapshot.val()
      ),
      "▣",
      "Gallery will appear here."
    );
  }
);


/* =========================================================
   RECEIPTS / VARGANI
   Reads receipts and only shows records linked
   to current member where possible.
========================================================= */

onValue(
  ref(db, "receipts"),

  (snapshot) => {
    const container =
      $("#memberReceiptList");

    if (!container) return;

    const records =
      objectToArray(
        snapshot.val()
      );

    const memberId =
      normalize(
        currentMember?.memberId ||
        sessionMemberId
      );

    const memberName =
      normalize(
        currentMember?.name
      );

    const myReceipts =
      records.filter((receipt) => {
        const creatorId =
          normalize(
            receipt.memberId ||
            receipt.createdById ||
            receipt.receiverId
          );

        if (
          memberId &&
          creatorId === memberId
        ) {
          return true;
        }

        const creatorName =
          normalize(
            receipt.memberName ||
            receipt.createdByName
          );

        return (
          memberName &&
          creatorName === memberName
        );
      });

    if (!myReceipts.length) {
      container.innerHTML = `
        <div class="empty-state">
          No receipt records are linked to your Member ID yet.
        </div>
      `;

      return;
    }

    container.innerHTML = `
      <div class="table-wrap">

        <table class="member-table">

          <thead>
            <tr>
              <th>Receipt</th>
              <th>Name</th>
              <th>Amount</th>
              <th>Date</th>
            </tr>
          </thead>

          <tbody>

            ${myReceipts
              .map(
                (receipt) => `
                  <tr>

                    <td>
                      ${escapeHTML(
                        receipt.receiptId ||
                        receipt.receiptNo ||
                        receipt.key
                      )}
                    </td>

                    <td>
                      ${escapeHTML(
                        receipt.name ||
                        receipt.donorName ||
                        "—"
                      )}
                    </td>

                    <td>
                      ₹${escapeHTML(
                        receipt.amount ||
                        "0"
                      )}
                    </td>

                    <td>
                      ${
                        receipt.createdAt ||
                        receipt.date
                          ? formatDate(
                              receipt.createdAt ||
                              receipt.date
                            )
                          : "—"
                      }
                    </td>

                  </tr>
                `
              )
              .join("")}

          </tbody>

        </table>

      </div>
    `;
  }
);


/* =========================================================
   ESC CLOSE MODAL
========================================================= */

document.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key === "Escape" &&
      taskModal?.classList.contains(
        "open"
      )
    ) {
      closeTaskModal();
    }
  }
);


/* =========================================================
   STARTUP
========================================================= */

console.log(
  "AAKASH EARTH Member Portal connected."
);
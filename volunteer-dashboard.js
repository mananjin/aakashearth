/* =========================================================
   AAKASH EARTH - VOLUNTEER DASHBOARD
   Realtime Database only
   Firebase Storage temporarily NOT used
========================================================= */

import {
  db,
  ref,
  onValue,
  update
} from "./firebase.js";


/* =========================================================
   SESSION CHECK
========================================================= */

const loginRole =
  sessionStorage.getItem("aakashLoginRole");

const volunteerLogin =
  sessionStorage.getItem("aakashVolunteerLogin");

const volunteerKey =
  sessionStorage.getItem("aakashVolunteerKey");

const sessionVolunteerId =
  sessionStorage.getItem("aakashVolunteerId") || "";

if (
  loginRole !== "volunteer" ||
  volunteerLogin !== "true" ||
  !volunteerKey
) {
  window.location.replace("login.html");
  throw new Error("Volunteer login required.");
}


/* =========================================================
   HELPERS
========================================================= */

const $ = (selector) =>
  document.querySelector(selector);

const $$ = (selector) =>
  [...document.querySelectorAll(selector)];

function setText(id, value) {
  const element =
    document.getElementById(id);

  if (!element) return;

  element.textContent =
    value === undefined ||
    value === null ||
    value === ""
      ? "—"
      : value;
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

function formatDate(value) {
  if (!value) return "—";

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
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

function showTaskMessage(
  message,
  type = "success"
) {
  const box =
    $("#volunteerTaskFormMessage");

  if (!box) return;

  box.textContent = message;

  box.className =
    `vol-form-message show ${type}`;
}

function clearTaskMessage() {
  const box =
    $("#volunteerTaskFormMessage");

  if (!box) return;

  box.textContent = "";

  box.className =
    "vol-form-message";
}


/* =========================================================
   STATE
========================================================= */

let currentVolunteer = null;

let volunteerTasks = [];

let currentTaskFilter = "all";

let selectedTaskKey = null;

let selectedTaskFile = null;

let allVolunteers = [];

let allComplaints = [];


/* =========================================================
   SIDEBAR / PANELS
========================================================= */

const sidebar =
  $("#volunteerSidebar");

const pageTitle =
  $("#volunteerPageTitle");

const panelTitles = {
  dashboard: "Dashboard",
  profile: "My Profile",
  idcard: "My I-Card",
  tasks: "My Tasks",
  performance: "Points & Rating",
  ranking: "Volunteer Ranking",
  history: "Task History",
  complaints: "Complaints Against Me",
  festivals: "Festivals",
  sports: "Sports",
  updates: "Updates",
  gallery: "Gallery"
};

function openPanel(panelName) {
  const target =
    document.querySelector(
      `[data-vol-panel-content="${panelName}"]`
    );

  if (!target) return;

  $$(".volunteer-panel").forEach(
    (panel) => {
      panel.classList.remove(
        "active"
      );
    }
  );

  target.classList.add(
    "active"
  );

  $$(
    ".volunteer-link[data-vol-panel]"
  ).forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.volPanel ===
        panelName
    );
  });

  if (pageTitle) {
    pageTitle.textContent =
      panelTitles[panelName] ||
      "Volunteer Portal";
  }

  sidebar?.classList.remove(
    "open"
  );

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

$$(
  ".volunteer-link[data-vol-panel]"
).forEach((button) => {
  button.addEventListener(
    "click",
    () => {
      openPanel(
        button.dataset.volPanel
      );
    }
  );
});

$$("[data-open-vol-panel]")
  .forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        openPanel(
          button.dataset.openVolPanel
        );
      }
    );
  });

$("#volunteerMenuBtn")
  ?.addEventListener(
    "click",
    () => {
      sidebar?.classList.toggle(
        "open"
      );
    }
  );


/* =========================================================
   LOGOUT
========================================================= */

$("#volunteerLogout")
  ?.addEventListener(
    "click",
    () => {
      [
        "aakashLoginRole",

        "aakashVolunteerLogin",
        "aakashVolunteerKey",
        "aakashVolunteerId",
        "aakashVolunteerName"
      ].forEach((key) => {
        sessionStorage.removeItem(
          key
        );
      });

      window.location.replace(
        "login.html"
      );
    }
  );


/* =========================================================
   PROFILE PHOTO
========================================================= */

function setVolunteerPhoto(
  elementId,
  photoURL
) {
  const element =
    document.getElementById(
      elementId
    );

  if (!element) return;

  const image =
    safeImage(photoURL);

  if (!image) {
    element.textContent = "🤝";
    return;
  }

  element.innerHTML = "";

  const img =
    document.createElement("img");

  img.src = image;
  img.alt = "Volunteer Photo";

  img.addEventListener(
    "error",
    () => {
      element.textContent =
        "🤝";
    }
  );

  element.appendChild(img);
}


/* =========================================================
   VOLUNTEER PROFILE
========================================================= */

function renderVolunteerProfile() {
  if (!currentVolunteer) {
    return;
  }

  const volunteer =
    currentVolunteer;

  const name =
    volunteer.name ||
    "Volunteer";

  const id =
    volunteer.volunteerId ||
    sessionVolunteerId ||
    "—";

  const year =
    volunteer.year || "—";

  const area =
    volunteer.area || "—";

  const status =
    volunteer.status || "—";


  setText(
    "sidebarVolunteerName",
    name
  );

  setText(
    "sidebarVolunteerId",
    id
  );

  setText(
    "topVolunteerName",
    name
  );

  setText(
    "welcomeVolunteerName",
    name
  );

  setText(
    "dashboardVolunteerId",
    id
  );

  setText(
    "dashboardVolunteerYear",
    year
  );

  setText(
    "dashboardVolunteerArea",
    area
  );

  setText(
    "dashboardVolunteerStatus",
    status
  );


  /* PROFILE */

  setText(
    "profileVolunteerName",
    name
  );

  setText(
    "profileVolunteerId",
    id
  );

  setText(
    "profileVolunteerArea",
    area
  );


  /* DETAILS */

  setText(
    "detailVolunteerId",
    id
  );

  setText(
    "detailVolunteerName",
    name
  );

  setText(
    "detailVolunteerMobile",
    volunteer.mobile || "—"
  );

  setText(
    "detailVolunteerDob",
    volunteer.dob
      ? formatDate(
          volunteer.dob
        )
      : "—"
  );

  setText(
    "detailVolunteerGender",
    volunteer.gender || "—"
  );

  setText(
    "detailVolunteerYear",
    year
  );

  setText(
    "detailVolunteerArea",
    area
  );

  setText(
    "detailVolunteerStatus",
    status
  );

  setText(
    "detailVolunteerAddress",
    volunteer.address || "—"
  );


  setVolunteerPhoto(
    "sidebarVolunteerPhoto",
    volunteer.photoURL
  );

  setVolunteerPhoto(
    "profileVolunteerPhoto",
    volunteer.photoURL
  );

  updatePerformance();

  renderComplaints();
}


/* =========================================================
   LIVE VOLUNTEER ACCOUNT
========================================================= */

onValue(
  ref(
    db,
    `volunteers/${volunteerKey}`
  ),

  (snapshot) => {
    if (!snapshot.exists()) {
      alert(
        "Volunteer account not found."
      );

      logoutInvalidSession();

      return;
    }

    currentVolunteer = {
      key: volunteerKey,
      ...snapshot.val()
    };

    if (
      normalize(
        currentVolunteer.status
      ) !== "approved"
    ) {
      alert(
        "Your volunteer account is not approved."
      );

      logoutInvalidSession();

      return;
    }

    if (
      !currentVolunteer.volunteerId
    ) {
      alert(
        "Official Volunteer ID has not been assigned yet."
      );

      logoutInvalidSession();

      return;
    }

    renderVolunteerProfile();

    renderRanking();
  },

  (error) => {
    console.error(
      "Volunteer profile error:",
      error
    );
  }
);

function logoutInvalidSession() {
  [
    "aakashLoginRole",
    "aakashVolunteerLogin",
    "aakashVolunteerKey",
    "aakashVolunteerId",
    "aakashVolunteerName"
  ].forEach((key) => {
    sessionStorage.removeItem(
      key
    );
  });

  window.location.replace(
    "login.html"
  );
}


/* =========================================================
   I-CARD
========================================================= */

function openVolunteerIdCard() {
  const volunteerId =
    currentVolunteer?.volunteerId ||
    sessionVolunteerId;

  if (!volunteerId) {
    alert(
      "Volunteer ID is not available."
    );

    return;
  }

  window.location.href =
    `id-card.html?id=${encodeURIComponent(
      volunteerId
    )}&type=volunteer`;
}

$("#dashboardVolunteerIdCard")
  ?.addEventListener(
    "click",
    openVolunteerIdCard
  );

$("#viewVolunteerIdCard")
  ?.addEventListener(
    "click",
    openVolunteerIdCard
  );


/* =========================================================
   TASK HELPERS
========================================================= */

function taskStatus(status) {
  const value =
    normalize(status);

  const labels = {
    assigned: "Assigned",

    pending_review:
      "Pending Review",

    completed: "Completed",

    rejected: "Rejected"
  };

  return (
    labels[value] ||
    value ||
    "Assigned"
  );
}

function taskStatusStyle(status) {
  const value =
    normalize(status);

  if (value === "completed") {
    return `
      color:#08624d;
      background:rgba(20,125,100,.09);
    `;
  }

  if (value === "rejected") {
    return `
      color:#862536;
      background:rgba(122,36,48,.09);
    `;
  }

  if (
    value === "pending_review"
  ) {
    return `
      color:#88631b;
      background:rgba(215,173,74,.14);
    `;
  }

  return `
    color:#145e50;
    background:rgba(20,125,100,.09);
  `;
}


/* =========================================================
   TASK CARD
========================================================= */

function createTaskCard(task) {
  const status =
    normalize(task.status) ||
    "assigned";

  const title =
    escapeHTML(
      task.title ||
      task.taskTitle ||
      "Volunteer Task"
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
    <article class="vol-card">

      <div
        style="
          display:flex;
          justify-content:space-between;
          align-items:flex-start;
          gap:15px;
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
            ${taskStatusStyle(
              status
            )}
          "
        >
          ${taskStatus(status)}
        </span>

      </div>


      <div
        style="
          display:flex;
          flex-wrap:wrap;
          gap:12px;
          margin-top:15px;
          color:#687681;
          font-size:9px;
        "
      >

        <span>
          📅 Deadline:
          ${
            deadline
              ? formatDate(
                  deadline
                )
              : "No deadline"
          }
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
              class="
                vol-submit-btn
                open-vol-task
              "
              data-task-key="${
                task.key
              }"
              style="
                margin-top:15px;
              "
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


/* =========================================================
   TASK FILTER
========================================================= */

function getFilteredTasks() {
  if (
    currentTaskFilter === "all"
  ) {
    return volunteerTasks;
  }

  return volunteerTasks.filter(
    (task) =>
      normalize(task.status) ===
      currentTaskFilter
  );
}


/* =========================================================
   RENDER TASKS
========================================================= */

function renderTasks() {
  const container =
    $("#volunteerTaskList");

  if (!container) return;

  const tasks =
    getFilteredTasks();

  if (!tasks.length) {
    container.innerHTML = `
      <div class="vol-empty">
        No tasks found in this category.
      </div>
    `;

    return;
  }

  container.innerHTML =
    tasks
      .map(createTaskCard)
      .join("");

  $$(".open-vol-task")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          openTaskModal(
            button.dataset.taskKey
          );
        }
      );
    });
}


/* =========================================================
   TASK HISTORY
========================================================= */

function renderTaskHistory() {
  const container =
    $("#volunteerTaskHistory");

  if (!container) return;

  const history =
    volunteerTasks.filter(
      (task) => {
        const status =
          normalize(task.status);

        return (
          status ===
            "pending_review" ||
          status ===
            "completed" ||
          status ===
            "rejected"
        );
      }
    );

  if (!history.length) {
    container.innerHTML = `
      <div class="vol-empty">
        No task history available.
      </div>
    `;

    return;
  }

  container.innerHTML = `
    <div class="vol-table-wrap">

      <table class="vol-table">

        <thead>
          <tr>
            <th>Task</th>
            <th>Status</th>
            <th>Points</th>
            <th>Rating</th>
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
                    ${taskStatus(
                      task.status
                    )}
                  </td>

                  <td>
                    ${
                      Number(
                        task.points
                      ) || 0
                    }
                  </td>

                  <td>
                    ${
                      task.rating ||
                      "—"
                    }
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


/* =========================================================
   TASK STATS
========================================================= */

function updateTaskStats() {
  const completed =
    volunteerTasks.filter(
      (task) =>
        normalize(
          task.status
        ) === "completed"
    );

  setText(
    "volunteerTotalTasks",
    volunteerTasks.length
  );

  setText(
    "volunteerCompletedTasks",
    completed.length
  );

  setText(
    "performanceCompleted",
    completed.length
  );

  updatePerformance();
}


/* =========================================================
   LIVE TASKS
========================================================= */

onValue(
  ref(
    db,
    `volunteerTasks/${volunteerKey}`
  ),

  (snapshot) => {
    volunteerTasks =
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
      "Volunteer task error:",
      error
    );

    const container =
      $("#volunteerTaskList");

    if (container) {
      container.innerHTML = `
        <div class="vol-empty">
          Unable to load your tasks.
        </div>
      `;
    }
  }
);


/* =========================================================
   TASK FILTER BUTTONS
========================================================= */

$$(".vol-task-filter")
  .forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        currentTaskFilter =
          button.dataset
            .volTaskFilter ||
          "all";

        $$(".vol-task-filter")
          .forEach((item) => {
            item.classList.toggle(
              "active",
              item === button
            );
          });

        renderTasks();
      }
    );
  });


/* =========================================================
   PERFORMANCE
========================================================= */

function calculateTaskPoints() {
  return volunteerTasks
    .filter(
      (task) =>
        normalize(
          task.status
        ) === "completed"
    )
    .reduce(
      (total, task) =>
        total +
        (Number(task.points) || 0),
      0
    );
}

function calculateTaskRating() {
  const ratings =
    volunteerTasks
      .filter(
        (task) =>
          normalize(
            task.status
          ) === "completed"
      )
      .map(
        (task) =>
          Number(task.rating)
      )
      .filter(
        (rating) =>
          Number.isFinite(rating) &&
          rating > 0
      );

  if (!ratings.length) {
    return "-";
  }

  return (
    ratings.reduce(
      (a, b) => a + b,
      0
    ) / ratings.length
  ).toFixed(1);
}

function getVolunteerPoints(
  volunteer
) {
  const points =
    Number(volunteer?.points);

  if (
    volunteer?.points !==
      undefined &&
    Number.isFinite(points)
  ) {
    return points;
  }

  if (
    volunteer?.key ===
    volunteerKey
  ) {
    return calculateTaskPoints();
  }

  return 0;
}

function getVolunteerRating(
  volunteer
) {
  const rating =
    Number(volunteer?.rating);

  if (
    volunteer?.rating !==
      undefined &&
    Number.isFinite(rating) &&
    rating > 0
  ) {
    return rating;
  }

  if (
    volunteer?.key ===
    volunteerKey
  ) {
    const taskRating =
      calculateTaskRating();

    return taskRating === "-"
      ? 0
      : Number(taskRating);
  }

  return 0;
}

function updatePerformance() {
  if (!currentVolunteer) {
    return;
  }

  const savedPoints =
    Number(
      currentVolunteer.points
    );

  const points =
    currentVolunteer.points !==
      undefined &&
    Number.isFinite(savedPoints)
      ? savedPoints
      : calculateTaskPoints();

  const savedRating =
    Number(
      currentVolunteer.rating
    );

  let rating = "-";

  if (
    currentVolunteer.rating !==
      undefined &&
    Number.isFinite(savedRating) &&
    savedRating > 0
  ) {
    rating =
      savedRating.toFixed(1);
  } else {
    rating =
      calculateTaskRating();
  }

  setText(
    "volunteerPoints",
    points
  );

  setText(
    "performancePoints",
    points
  );

  setText(
    "volunteerRating",
    rating
  );

  setText(
    "performanceRating",
    rating
  );

  renderRanking();
}


/* =========================================================
   TASK MODAL
========================================================= */

const taskModal =
  $("#volunteerTaskModal");

const proofInput =
  $("#volunteerTaskProofPhoto");

const proofPreview =
  $("#volunteerTaskProofPreview");

function openTaskModal(taskKey) {
  const task =
    volunteerTasks.find(
      (item) =>
        item.key === taskKey
    );

  if (!task) return;

  selectedTaskKey =
    taskKey;

  selectedTaskFile =
    null;

  setText(
    "volunteerTaskModalTitle",
    task.title ||
    task.taskTitle ||
    "Complete Task"
  );

  setText(
    "volunteerTaskModalDescription",
    task.description ||
    task.details ||
    "—"
  );

  setText(
    "volunteerTaskModalDeadline",
    task.deadline ||
    task.dueDate
      ? formatDate(
          task.deadline ||
          task.dueDate
        )
      : "No deadline"
  );

  setText(
    "volunteerTaskModalPoints",
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

  clearTaskMessage();

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

  if (proofInput) {
    proofInput.value = "";
  }

  if (proofPreview) {
    proofPreview.src = "";

    proofPreview.style.display =
      "none";
  }

  clearTaskMessage();
}

$("#closeVolunteerTaskModal")
  ?.addEventListener(
    "click",
    closeTaskModal
  );

taskModal?.addEventListener(
  "click",
  (event) => {
    if (
      event.target === taskModal
    ) {
      closeTaskModal();
    }
  }
);


/* =========================================================
   TASK PHOTO PREVIEW
   NO STORAGE
========================================================= */

proofInput?.addEventListener(
  "change",
  () => {
    clearTaskMessage();

    const file =
      proofInput.files?.[0];

    selectedTaskFile = null;

    if (!file) {
      if (proofPreview) {
        proofPreview.style.display =
          "none";
      }

      return;
    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      proofInput.value = "";

      showTaskMessage(
        "Please select a valid image file.",
        "error"
      );

      return;
    }

    const maxSize =
      5 * 1024 * 1024;

    if (file.size > maxSize) {
      proofInput.value = "";

      showTaskMessage(
        "Photo must be 5 MB or smaller.",
        "error"
      );

      return;
    }

    selectedTaskFile =
      file;

    const reader =
      new FileReader();

    reader.onload = () => {
      if (!proofPreview) return;

      proofPreview.src =
        reader.result;

      proofPreview.style.display =
        "block";
    };

    reader.onerror = () => {
      selectedTaskFile = null;

      proofInput.value = "";

      showTaskMessage(
        "Unable to preview selected photo.",
        "error"
      );
    };

    reader.readAsDataURL(
      file
    );
  }
);


/* =========================================================
   SUBMIT TASK FOR REVIEW
========================================================= */

$("#submitVolunteerTaskProof")
  ?.addEventListener(
    "click",
    async () => {
      if (!selectedTaskKey) {
        showTaskMessage(
          "Task not selected.",
          "error"
        );

        return;
      }

      const button =
        $("#submitVolunteerTaskProof");

      try {
        button.disabled = true;

        showTaskMessage(
          "Submitting task...",
          "success"
        );

        /*
          Firebase Storage temporarily disabled.

          We save:
          - status
          - filename
          - photo metadata
          - submission time

          Actual image URL remains blank.
        */

        await update(
          ref(
            db,
            `volunteerTasks/${volunteerKey}/${selectedTaskKey}`
          ),
          {
            status:
              "pending_review",

            proofURL: "",

            proofPhotoName:
              selectedTaskFile?.name ||
              "",

            proofPhotoType:
              selectedTaskFile?.type ||
              "",

            proofPhotoSize:
              selectedTaskFile?.size ||
              0,

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

        showTaskMessage(
          "Task submitted for admin review. Photo upload is temporarily disabled while Storage is being fixed.",
          "success"
        );

        setTimeout(
          closeTaskModal,
          1800
        );
      }

      catch (error) {
        console.error(
          "Task submission error:",
          error
        );

        showTaskMessage(
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
   VOLUNTEER RANKING
========================================================= */

function renderRanking() {
  const body =
    $("#volunteerRankingList");

  if (!body) return;

  const approved =
    allVolunteers
      .filter(
        (volunteer) =>
          normalize(
            volunteer.status
          ) === "approved"
      )
      .map(
        (volunteer) => ({
          ...volunteer,

          calculatedPoints:
            getVolunteerPoints(
              volunteer
            ),

          calculatedRating:
            getVolunteerRating(
              volunteer
            )
        })
      )
      .sort(
        (a, b) => {
          if (
            b.calculatedPoints !==
            a.calculatedPoints
          ) {
            return (
              b.calculatedPoints -
              a.calculatedPoints
            );
          }

          return (
            b.calculatedRating -
            a.calculatedRating
          );
        }
      );

  if (!approved.length) {
    body.innerHTML = `
      <tr>
        <td colspan="5">
          No approved volunteers available.
        </td>
      </tr>
    `;

    setText(
      "volunteerRank",
      "-"
    );

    return;
  }

  let myRank = "-";

  body.innerHTML =
    approved
      .map(
        (volunteer, index) => {
          const rank =
            index + 1;

          if (
            volunteer.key ===
            volunteerKey
          ) {
            myRank = rank;
          }

          const rankIcon =
            rank === 1
              ? "🥇"
              : rank === 2
                ? "🥈"
                : rank === 3
                  ? "🥉"
                  : `#${rank}`;

          const rating =
            volunteer.calculatedRating >
            0
              ? volunteer
                  .calculatedRating
                  .toFixed(1)
              : "—";

          return `
            <tr
              ${
                volunteer.key ===
                volunteerKey
                  ? `
                    style="
                      background:
                      rgba(20,125,100,.06);
                    "
                  `
                  : ""
              }
            >

              <td>
                <strong>
                  ${rankIcon}
                </strong>
              </td>

              <td>
                ${escapeHTML(
                  volunteer.name ||
                  "Volunteer"
                )}

                ${
                  volunteer.key ===
                  volunteerKey
                    ? `
                      <strong
                        style="
                          color:#147d64;
                          font-size:8px;
                        "
                      >
                        (YOU)
                      </strong>
                    `
                    : ""
                }
              </td>

              <td>
                ${escapeHTML(
                  volunteer.volunteerId ||
                  "—"
                )}
              </td>

              <td>
                ${
                  volunteer
                    .calculatedPoints
                }
              </td>

              <td>
                ${rating}
              </td>

            </tr>
          `;
        }
      )
      .join("");

  setText(
    "volunteerRank",
    myRank === "-"
      ? "-"
      : `#${myRank}`
  );
}

onValue(
  ref(db, "volunteers"),

  (snapshot) => {
    allVolunteers =
      objectToArray(
        snapshot.val()
      );

    renderRanking();
  },

  (error) => {
    console.error(
      "Ranking error:",
      error
    );
  }
);


/* =========================================================
   COMPLAINTS AGAINST VOLUNTEER
========================================================= */

function complaintBelongsToMe(
  complaint
) {
  if (!currentVolunteer) {
    return false;
  }

  if (
    normalize(
      complaint
        .complaintAgainstType
    ) !== "volunteer"
  ) {
    return false;
  }

  const complaintId =
    normalize(
      complaint
        .complaintAgainstId
    );

  const myId =
    normalize(
      currentVolunteer
        .volunteerId ||
      sessionVolunteerId
    );

  if (
    complaintId &&
    myId &&
    complaintId === myId
  ) {
    return true;
  }

  /*
    Fallback for older records
    where ID was not stored.
  */

  if (!complaintId) {
    return (
      normalize(
        complaint
          .complaintAgainstName
      ) ===
      normalize(
        currentVolunteer.name
      )
    );
  }

  return false;
}

function renderComplaints() {
  const body =
    $("#volunteerComplaintList");

  if (!body) return;

  const complaints =
    allComplaints
      .filter(
        complaintBelongsToMe
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

  if (!complaints.length) {
    body.innerHTML = `
      <tr>
        <td colspan="5">
          No complaints are linked to your Volunteer ID.
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML =
    complaints
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
                      complaint
                        .incidentDate
                    )
                  : "—"
              }
            </td>

            <td>
              ${escapeHTML(
                String(
                  complaint.status ||
                  "submitted"
                ).replaceAll(
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
    allComplaints =
      objectToArray(
        snapshot.val()
      );

    renderComplaints();
  },

  (error) => {
    console.error(
      "Complaint error:",
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
      class="vol-card"
      style="
        overflow:hidden;
        padding:0;
      "
    >

      <div
        style="
          height:160px;
          overflow:hidden;
          display:grid;
          place-items:center;
          background:
            linear-gradient(
              135deg,
              #0b5b4b,
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
  emptyMessage
) {
  const container =
    document.getElementById(
      containerId
    );

  if (!container) return;

  const items =
    data.filter(
      publicStatus
    );

  if (!items.length) {
    container.innerHTML = `
      <div class="vol-empty">
        ${escapeHTML(
          emptyMessage
        )}
      </div>
    `;

    return;
  }

  container.innerHTML =
    items
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
   FESTIVALS
========================================================= */

onValue(
  ref(db, "festivals"),

  (snapshot) => {
    renderPublicModule(
      "volunteerFestivalList",

      objectToArray(
        snapshot.val()
      ),

      "🪔",

      "Festival information will appear here."
    );
  },

  (error) => {
    console.error(
      "Festival error:",
      error
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
      "volunteerSportsList",

      objectToArray(
        snapshot.val()
      ),

      "🏆",

      "Sports activities will appear here."
    );
  },

  (error) => {
    console.error(
      "Sports error:",
      error
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
      "volunteerUpdatesList",

      objectToArray(
        snapshot.val()
      ),

      "📢",

      "Community updates will appear here."
    );
  },

  (error) => {
    console.error(
      "Updates error:",
      error
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
      "volunteerGalleryList",

      objectToArray(
        snapshot.val()
      ),

      "▣",

      "Gallery will appear here."
    );
  },

  (error) => {
    console.error(
      "Gallery error:",
      error
    );
  }
);


/* =========================================================
   ESCAPE CLOSE MODAL
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
   CLOSE SIDEBAR ON MOBILE OUTSIDE CLICK
========================================================= */

document.addEventListener(
  "click",
  (event) => {
    if (
      window.innerWidth > 900 ||
      !sidebar?.classList.contains(
        "open"
      )
    ) {
      return;
    }

    const menuButton =
      $("#volunteerMenuBtn");

    if (
      sidebar.contains(
        event.target
      ) ||
      menuButton?.contains(
        event.target
      )
    ) {
      return;
    }

    sidebar.classList.remove(
      "open"
    );
  }
);


/* =========================================================
   START
========================================================= */

console.log(
  "AAKASH EARTH Volunteer Dashboard connected."
);
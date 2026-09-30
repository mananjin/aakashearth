/* =========================================================
   AAKASH EARTH - TASK MANAGEMENT
   Member + Volunteer Tasks
   Firebase Realtime Database
   Storage temporarily NOT used
========================================================= */

import {
  db,
  ref,
  push,
  set,
  get,
  onValue,
  update,
  remove
} from "./firebase.js";


/* =========================================================
   HELPERS
========================================================= */

const $ = (id) =>
  document.getElementById(id);

const $$ = (selector) =>
  [...document.querySelectorAll(selector)];

function clean(value = "") {
  return String(value).trim();
}

function normalize(value = "") {
  return clean(value).toLowerCase();
}

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

function formatDateTime(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  ).format(date);
}

function statusLabel(value = "") {
  const status = normalize(value);

  const labels = {
    assigned: "Assigned",
    pending: "Assigned",
    pending_review: "Pending Review",
    completed: "Completed",
    rejected: "Rejected"
  };

  return (
    labels[status] ||
    clean(value).replaceAll("_", " ") ||
    "—"
  );
}

function normalizeTaskStatus(value = "") {
  const status = normalize(value);

  if (
    !status ||
    status === "pending"
  ) {
    return "assigned";
  }

  return status;
}

function showMessage(
  element,
  message,
  type = "success"
) {
  if (!element) return;

  element.textContent = message;

  element.className =
    `task-message show ${type}`;
}

function clearMessage(element) {
  if (!element) return;

  element.textContent = "";
  element.className = "task-message";
}


/* =========================================================
   ADMIN SESSION
========================================================= */

function checkAdminSession() {
  const role =
    sessionStorage.getItem(
      "aakashLoginRole"
    );

  const adminLogin =
    sessionStorage.getItem(
      "aakashAdminLogin"
    );

  if (
    role !== "admin" &&
    adminLogin !== "true"
  ) {
    window.location.replace(
      "login.html"
    );
  }
}

checkAdminSession();


/* =========================================================
   STATE
========================================================= */

let members = [];
let volunteers = [];

let memberTasks = [];
let volunteerTasks = [];

let selectedTask = null;


/* =========================================================
   TABS
========================================================= */

function openTaskPanel(name) {
  $$("[data-task-panel]")
    .forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.taskPanel ===
          name
      );
    });

  $$("[data-task-panel-content]")
    .forEach((panel) => {
      panel.classList.toggle(
        "active",
        panel.dataset
          .taskPanelContent === name
      );
    });
}

$$("[data-task-panel]")
  .forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        openTaskPanel(
          button.dataset.taskPanel
        );
      }
    );
  });


/* =========================================================
   MEMBER / VOLUNTEER DATA
========================================================= */

onValue(
  ref(db, "members"),

  (snapshot) => {
    members = [];

    const data =
      snapshot.val() || {};

    Object.entries(data)
      .forEach(([key, value]) => {
        members.push({
          key,
          ...(value || {})
        });
      });

    populatePeople();
    renderEverything();
  },

  (error) => {
    console.error(
      "Members load error:",
      error
    );
  }
);


onValue(
  ref(db, "volunteers"),

  (snapshot) => {
    volunteers = [];

    const data =
      snapshot.val() || {};

    Object.entries(data)
      .forEach(([key, value]) => {
        volunteers.push({
          key,
          ...(value || {})
        });
      });

    populatePeople();
    renderEverything();
  },

  (error) => {
    console.error(
      "Volunteers load error:",
      error
    );
  }
);


/* =========================================================
   PERSON SELECT
========================================================= */

$("taskPersonType")
  ?.addEventListener(
    "change",
    populatePeople
  );

function populatePeople() {
  const type =
    normalize(
      $("taskPersonType")?.value
    );

  const select =
    $("taskPerson");

  if (!select) return;

  if (type === "member") {
    const available =
      members
        .filter(
          (member) =>
            normalize(member.status) ===
            "active"
        )
        .sort((a, b) =>
          String(a.name || "")
            .localeCompare(
              String(b.name || "")
            )
        );

    select.innerHTML =
      `
        <option value="">
          Select Member
        </option>
      ` +
      available
        .map((member) => `
          <option value="${escapeHTML(member.key)}">
            ${escapeHTML(member.name || "Member")}
            ${
              member.memberId
                ? `(${escapeHTML(member.memberId)})`
                : ""
            }
          </option>
        `)
        .join("");

    return;
  }

  if (type === "volunteer") {
    const available =
      volunteers
        .filter(
          (volunteer) =>
            normalize(volunteer.status) ===
            "approved"
        )
        .sort((a, b) =>
          String(a.name || "")
            .localeCompare(
              String(b.name || "")
            )
        );

    select.innerHTML =
      `
        <option value="">
          Select Volunteer
        </option>
      ` +
      available
        .map((volunteer) => `
          <option value="${escapeHTML(volunteer.key)}">
            ${escapeHTML(volunteer.name || "Volunteer")}
            ${
              volunteer.volunteerId
                ? `(${escapeHTML(volunteer.volunteerId)})`
                : ""
            }
          </option>
        `)
        .join("");

    return;
  }

  select.innerHTML = `
    <option value="">
      Select type first
    </option>
  `;
}


/* =========================================================
   ASSIGN TASK
========================================================= */

$("taskAssignForm")
  ?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const message =
        $("taskAssignMessage");

      clearMessage(message);

      const type =
        normalize(
          $("taskPersonType")?.value
        );

      const personKey =
        clean(
          $("taskPerson")?.value
        );

      const title =
        clean(
          $("taskTitle")?.value
        );

      const description =
        clean(
          $("taskDescription")?.value
        );

      const deadline =
        clean(
          $("taskDeadline")?.value
        );

      const points =
        Math.max(
          0,
          Number(
            $("taskPoints")?.value ||
            0
          )
        );

      if (
        !["member", "volunteer"]
          .includes(type)
      ) {
        showMessage(
          message,
          "Please select Member or Volunteer.",
          "error"
        );

        return;
      }

      if (!personKey) {
        showMessage(
          message,
          "Please select a person.",
          "error"
        );

        return;
      }

      if (!title) {
        showMessage(
          message,
          "Please enter task title.",
          "error"
        );

        return;
      }

      if (!description) {
        showMessage(
          message,
          "Please enter task description.",
          "error"
        );

        return;
      }

      const person =
        type === "member"
          ? members.find(
              (item) =>
                item.key === personKey
            )
          : volunteers.find(
              (item) =>
                item.key === personKey
            );

      if (!person) {
        showMessage(
          message,
          "Selected person was not found.",
          "error"
        );

        return;
      }

      const path =
        type === "member"
          ? `memberTasks/${personKey}`
          : `volunteerTasks/${personKey}`;

      const button =
        $("taskAssignButton");

      try {
        if (button) {
          button.disabled = true;
          button.textContent =
            "Assigning Task...";
        }

        const newTaskRef =
          push(ref(db, path));

        await set(
          newTaskRef,
          {
            title,
            description,
            deadline,
            points,

            status: "assigned",

            personType: type,
            personKey,

            personId:
              type === "member"
                ? person.memberId || ""
                : person.volunteerId || "",

            personName:
              person.name || "",

            proofURL: "",
            proofPhotoName: "",
            proofStoragePending: false,

            rating: 0,
            adminRemark: "",

            createdBy: "admin",

            assignedAt:
              Date.now(),

            createdAt:
              Date.now(),

            updatedAt:
              Date.now()
          }
        );

        showMessage(
          message,
          `Task assigned successfully to ${person.name || "user"}.`,
          "success"
        );

        event.target.reset();

        populatePeople();

      } catch (error) {
        console.error(
          "Task assign error:",
          error
        );

        showMessage(
          message,
          "Unable to assign task. Check Firebase Database rules.",
          "error"
        );

      } finally {
        if (button) {
          button.disabled = false;
          button.textContent =
            "Assign Task →";
        }
      }
    }
  );


/* =========================================================
   FLATTEN TASKS
========================================================= */

function flattenTasks(
  data,
  type
) {
  const result = [];

  if (!data) return result;

  Object.entries(data)
    .forEach(
      ([personKey, tasks]) => {
        if (!tasks) return;

        Object.entries(tasks)
          .forEach(
            ([taskKey, task]) => {
              result.push({
                personKey,
                taskKey,
                type,
                ...(task || {})
              });
            }
          );
      }
    );

  return result;
}


/* =========================================================
   TASK LIVE LISTENERS
========================================================= */

onValue(
  ref(db, "memberTasks"),

  (snapshot) => {
    memberTasks =
      flattenTasks(
        snapshot.val(),
        "member"
      );

    renderEverything();
  },

  (error) => {
    console.error(
      "Member tasks load error:",
      error
    );

    if ($("allTaskList")) {
      $("allTaskList").innerHTML = `
        <tr>
          <td colspan="7">
            Unable to load Member tasks.
          </td>
        </tr>
      `;
    }
  }
);


onValue(
  ref(db, "volunteerTasks"),

  (snapshot) => {
    volunteerTasks =
      flattenTasks(
        snapshot.val(),
        "volunteer"
      );

    renderEverything();
  },

  (error) => {
    console.error(
      "Volunteer tasks load error:",
      error
    );
  }
);


/* =========================================================
   ALL TASKS
========================================================= */

function getAllTasks() {
  return [
    ...memberTasks,
    ...volunteerTasks
  ];
}

function getPerson(task) {
  if (task.type === "member") {
    return members.find(
      (member) =>
        member.key ===
        task.personKey
    );
  }

  return volunteers.find(
    (volunteer) =>
      volunteer.key ===
      task.personKey
  );
}

function taskPersonName(task) {
  const person =
    getPerson(task);

  return (
    task.personName ||
    person?.name ||
    "Unknown"
  );
}

function taskPersonId(task) {
  const person =
    getPerson(task);

  if (task.personId) {
    return task.personId;
  }

  if (task.type === "member") {
    return (
      person?.memberId ||
      "—"
    );
  }

  return (
    person?.volunteerId ||
    person?.applicationId ||
    "—"
  );
}


/* =========================================================
   STATS
========================================================= */

function renderStats() {
  const tasks =
    getAllTasks();

  const assigned =
    tasks.filter(
      (task) =>
        normalizeTaskStatus(
          task.status
        ) === "assigned"
    ).length;

  const pending =
    tasks.filter(
      (task) =>
        normalizeTaskStatus(
          task.status
        ) ===
        "pending_review"
    ).length;

  const completed =
    tasks.filter(
      (task) =>
        normalizeTaskStatus(
          task.status
        ) === "completed"
    ).length;

  const rejected =
    tasks.filter(
      (task) =>
        normalizeTaskStatus(
          task.status
        ) === "rejected"
    ).length;

  if ($("taskTotalCount")) {
    $("taskTotalCount").textContent =
      tasks.length;
  }

  if ($("taskAssignedCount")) {
    $("taskAssignedCount").textContent =
      assigned;
  }

  if ($("taskPendingReviewCount")) {
    $("taskPendingReviewCount")
      .textContent = pending;
  }

  if ($("taskCompletedCount")) {
    $("taskCompletedCount")
      .textContent = completed;
  }

  if ($("taskRejectedCount")) {
    $("taskRejectedCount")
      .textContent = rejected;
  }
}


/* =========================================================
   STATUS BADGE
========================================================= */

function statusBadge(status) {
  const normalized =
    normalizeTaskStatus(status);

  return `
    <span class="task-status ${escapeHTML(normalized)}">
      ${escapeHTML(statusLabel(normalized))}
    </span>
  `;
}


/* =========================================================
   PENDING REVIEW
========================================================= */

function renderPendingTasks() {
  const body =
    $("pendingTaskList");

  if (!body) return;

  const typeFilter =
    normalize(
      $("pendingTypeFilter")?.value ||
      "all"
    );

  let tasks =
    getAllTasks()
      .filter(
        (task) =>
          normalizeTaskStatus(
            task.status
          ) ===
          "pending_review"
      );

  if (typeFilter !== "all") {
    tasks =
      tasks.filter(
        (task) =>
          task.type ===
          typeFilter
      );
  }

  tasks.sort(
    (a, b) =>
      Number(
        b.submittedAt ||
        b.updatedAt ||
        0
      ) -
      Number(
        a.submittedAt ||
        a.updatedAt ||
        0
      )
  );

  if (!tasks.length) {
    body.innerHTML = `
      <tr>
        <td colspan="7">
          No tasks are waiting for review.
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML =
    tasks
      .map((task) => `
        <tr>

          <td>
            <strong>
              ${escapeHTML(taskPersonName(task))}
            </strong>
            <br>
            ${escapeHTML(taskPersonId(task))}
          </td>

          <td>
            ${escapeHTML(
              task.type === "member"
                ? "Member"
                : "Volunteer"
            )}
          </td>

          <td>
            <strong>
              ${escapeHTML(task.title || "Task")}
            </strong>
          </td>

          <td>
            ${escapeHTML(formatDate(task.deadline))}
          </td>

          <td>
            ${
              task.proofURL
                ? `
                  <a
                    href="${escapeHTML(task.proofURL)}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Proof
                  </a>
                `
                : escapeHTML(
                    task.proofPhotoName ||
                    "No uploaded photo"
                  )
            }
          </td>

          <td>
            ${Number(task.points || 0)}
          </td>

          <td>
            <button
              type="button"
              class="task-mini-btn gold"
              data-task-open="${task.type}|${task.personKey}|${task.taskKey}"
            >
              Review
            </button>
          </td>

        </tr>
      `)
      .join("");
}


/* =========================================================
   ALL TASK LIST
========================================================= */

function renderAllTasks() {
  const body =
    $("allTaskList");

  if (!body) return;

  const search =
    normalize(
      $("allTaskSearch")?.value
    );

  const typeFilter =
    normalize(
      $("allTaskTypeFilter")?.value ||
      "all"
    );

  const statusFilter =
    normalize(
      $("allTaskStatusFilter")?.value ||
      "all"
    );

  let tasks =
    getAllTasks();

  tasks =
    tasks.filter((task) => {
      const status =
        normalizeTaskStatus(
          task.status
        );

      const haystack =
        normalize(
          `${task.title || ""}
           ${task.description || ""}
           ${taskPersonName(task)}
           ${taskPersonId(task)}
           ${task.type}`
        );

      const searchMatch =
        !search ||
        haystack.includes(search);

      const typeMatch =
        typeFilter === "all" ||
        task.type === typeFilter;

      const statusMatch =
        statusFilter === "all" ||
        status === statusFilter;

      return (
        searchMatch &&
        typeMatch &&
        statusMatch
      );
    });

  tasks.sort(
    (a, b) =>
      Number(
        b.createdAt ||
        b.assignedAt ||
        0
      ) -
      Number(
        a.createdAt ||
        a.assignedAt ||
        0
      )
  );

  if (!tasks.length) {
    body.innerHTML = `
      <tr>
        <td colspan="7">
          No tasks found.
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML =
    tasks
      .map((task) => `
        <tr>

          <td>
            <strong>
              ${escapeHTML(taskPersonName(task))}
            </strong>
            <br>
            ${escapeHTML(taskPersonId(task))}
          </td>

          <td>
            ${escapeHTML(
              task.type === "member"
                ? "Member"
                : "Volunteer"
            )}
          </td>

          <td>
            ${escapeHTML(task.title || "Task")}
          </td>

          <td>
            ${escapeHTML(formatDate(task.deadline))}
          </td>

          <td>
            ${Number(task.points || 0)}
          </td>

          <td>
            ${statusBadge(task.status)}
          </td>

          <td>
            <button
              type="button"
              class="task-mini-btn gold"
              data-task-open="${task.type}|${task.personKey}|${task.taskKey}"
            >
              View
            </button>
          </td>

        </tr>
      `)
      .join("");
}


/* =========================================================
   COMPLETED
========================================================= */

function renderCompletedTasks() {
  const body =
    $("completedTaskList");

  if (!body) return;

  const tasks =
    getAllTasks()
      .filter(
        (task) =>
          normalizeTaskStatus(
            task.status
          ) === "completed"
      )
      .sort(
        (a, b) =>
          Number(
            b.completedAt ||
            b.reviewedAt ||
            b.updatedAt ||
            0
          ) -
          Number(
            a.completedAt ||
            a.reviewedAt ||
            a.updatedAt ||
            0
          )
      );

  if (!tasks.length) {
    body.innerHTML = `
      <tr>
        <td colspan="7">
          No completed tasks yet.
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML =
    tasks
      .map((task) => `
        <tr>

          <td>
            <strong>
              ${escapeHTML(taskPersonName(task))}
            </strong>
            <br>
            ${escapeHTML(taskPersonId(task))}
          </td>

          <td>
            ${escapeHTML(
              task.type === "member"
                ? "Member"
                : "Volunteer"
            )}
          </td>

          <td>
            ${escapeHTML(task.title || "Task")}
          </td>

          <td>
            ${Number(task.points || 0)}
          </td>

          <td>
            ${
              Number(task.rating || 0) > 0
                ? `${Number(task.rating).toFixed(1)} ★`
                : "—"
            }
          </td>

          <td>
            ${escapeHTML(
              formatDateTime(
                task.completedAt ||
                task.reviewedAt ||
                task.updatedAt
              )
            )}
          </td>

          <td>
            <button
              type="button"
              class="task-mini-btn gold"
              data-task-open="${task.type}|${task.personKey}|${task.taskKey}"
            >
              View
            </button>
          </td>

        </tr>
      `)
      .join("");
}


/* =========================================================
   REJECTED
========================================================= */

function renderRejectedTasks() {
  const body =
    $("rejectedTaskList");

  if (!body) return;

  const tasks =
    getAllTasks()
      .filter(
        (task) =>
          normalizeTaskStatus(
            task.status
          ) === "rejected"
      )
      .sort(
        (a, b) =>
          Number(
            b.reviewedAt ||
            b.updatedAt ||
            0
          ) -
          Number(
            a.reviewedAt ||
            a.updatedAt ||
            0
          )
      );

  if (!tasks.length) {
    body.innerHTML = `
      <tr>
        <td colspan="7">
          No rejected tasks.
        </td>
      </tr>
    `;

    return;
  }

  body.innerHTML =
    tasks
      .map((task) => `
        <tr>

          <td>
            <strong>
              ${escapeHTML(taskPersonName(task))}
            </strong>
            <br>
            ${escapeHTML(taskPersonId(task))}
          </td>

          <td>
            ${escapeHTML(
              task.type === "member"
                ? "Member"
                : "Volunteer"
            )}
          </td>

          <td>
            ${escapeHTML(task.title || "Task")}
          </td>

          <td>
            ${escapeHTML(
              task.adminRemark ||
              task.reviewNote ||
              task.rejectionReason ||
              "Please submit again."
            )}
          </td>

          <td>
            ${escapeHTML(formatDate(task.deadline))}
          </td>

          <td>
            ${Number(task.points || 0)}
          </td>

          <td>
            <button
              type="button"
              class="task-mini-btn gold"
              data-task-open="${task.type}|${task.personKey}|${task.taskKey}"
            >
              View
            </button>
          </td>

        </tr>
      `)
      .join("");
}


/* =========================================================
   FILTER EVENTS
========================================================= */

$("pendingTypeFilter")
  ?.addEventListener(
    "change",
    renderPendingTasks
  );

$("allTaskSearch")
  ?.addEventListener(
    "input",
    renderAllTasks
  );

$("allTaskTypeFilter")
  ?.addEventListener(
    "change",
    renderAllTasks
  );

$("allTaskStatusFilter")
  ?.addEventListener(
    "change",
    renderAllTasks
  );


/* =========================================================
   TASK OPEN EVENT DELEGATION
========================================================= */

document.addEventListener(
  "click",
  (event) => {
    const button =
      event.target.closest(
        "[data-task-open]"
      );

    if (!button) return;

    const value =
      button.dataset.taskOpen || "";

    const [
      type,
      personKey,
      taskKey
    ] = value.split("|");

    openTaskModal(
      type,
      personKey,
      taskKey
    );
  }
);


/* =========================================================
   TASK MODAL
========================================================= */

const taskModal =
  $("taskManagerModal");

function findTask(
  type,
  personKey,
  taskKey
) {
  const source =
    type === "member"
      ? memberTasks
      : volunteerTasks;

  return source.find(
    (task) =>
      task.personKey === personKey &&
      task.taskKey === taskKey
  );
}

function openTaskModal(
  type,
  personKey,
  taskKey
) {
  const task =
    findTask(
      type,
      personKey,
      taskKey
    );

  if (!task) {
    alert(
      "Task record not found."
    );

    return;
  }

  selectedTask = task;

  const status =
    normalizeTaskStatus(
      task.status
    );

  $("taskManagerModalTitle")
    .textContent =
      task.title || "Task";

  $("taskManagerDetails")
    .innerHTML = `

      <p>
        <strong>Person:</strong>
        ${escapeHTML(taskPersonName(task))}
      </p>

      <p>
        <strong>ID:</strong>
        ${escapeHTML(taskPersonId(task))}
      </p>

      <p>
        <strong>Type:</strong>
        ${
          task.type === "member"
            ? "Member"
            : "Volunteer"
        }
      </p>

      <p>
        <strong>Description:</strong>
        ${escapeHTML(task.description || "—")}
      </p>

      <p>
        <strong>Deadline:</strong>
        ${escapeHTML(formatDate(task.deadline))}
      </p>

      <p>
        <strong>Assigned Points:</strong>
        ${Number(task.points || 0)}
      </p>

      <p>
        <strong>Status:</strong>
        ${escapeHTML(statusLabel(status))}
      </p>

      <p>
        <strong>Proof Photo:</strong>
        ${
          task.proofURL
            ? `
              <a
                href="${escapeHTML(task.proofURL)}"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Proof Photo
              </a>
            `
            : escapeHTML(
                task.proofPhotoName ||
                "No uploaded proof photo"
              )
        }
      </p>

      <p>
        <strong>Submitted:</strong>
        ${escapeHTML(
          formatDateTime(
            task.submittedAt
          )
        )}
      </p>

      <p>
        <strong>Admin Remark:</strong>
        ${escapeHTML(
          task.adminRemark ||
          task.reviewNote ||
          "—"
        )}
      </p>

      <p>
        <strong>Rating:</strong>
        ${
          Number(task.rating || 0) > 0
            ? `${Number(task.rating).toFixed(1)} ★`
            : "—"
        }
      </p>
  `;

  $("taskManagerPoints").value =
    Number(task.points || 0);

  $("taskManagerRating").value =
    Number(task.rating || 0) > 0
      ? String(task.rating)
      : "";

  $("taskManagerRemark").value =
    task.adminRemark ||
    task.reviewNote ||
    "";

  clearMessage(
    $("taskManagerMessage")
  );

  const reviewControls =
    $("taskManagerReviewControls");

  /*
    Assigned tasks have not been
    submitted yet, so review controls
    stay hidden.

    Pending / completed / rejected
    can be inspected/reviewed.
  */

  if (reviewControls) {
    reviewControls.style.display =
      status === "assigned"
        ? "none"
        : "block";
  }

  taskModal?.classList.add(
    "open"
  );
}

function closeTaskModal() {
  taskModal?.classList.remove(
    "open"
  );

  selectedTask = null;

  clearMessage(
    $("taskManagerMessage")
  );
}

$("closeTaskManagerModal")
  ?.addEventListener(
    "click",
    closeTaskModal
  );

taskModal
  ?.addEventListener(
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
   PERSON STATS
========================================================= */

async function getPersonRecord(
  task
) {
  const path =
    task.type === "member"
      ? `members/${task.personKey}`
      : `volunteers/${task.personKey}`;

  const snapshot =
    await get(
      ref(db, path)
    );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    path,
    data: snapshot.val() || {}
  };
}


/* =========================================================
   APPROVE TASK
========================================================= */

$("taskManagerApprove")
  ?.addEventListener(
    "click",
    async () => {
      if (!selectedTask) {
        return;
      }

      const message =
        $("taskManagerMessage");

      clearMessage(message);

      const finalPoints =
        Math.max(
          0,
          Number(
            $("taskManagerPoints")
              ?.value || 0
          )
        );

      const finalRating =
        Math.min(
          5,
          Math.max(
            0,
            Number(
              $("taskManagerRating")
                ?.value || 0
            )
          )
        );

      const remark =
        clean(
          $("taskManagerRemark")
            ?.value
        );

      const taskPath =
        selectedTask.type ===
        "member"
          ? `memberTasks/${selectedTask.personKey}/${selectedTask.taskKey}`
          : `volunteerTasks/${selectedTask.personKey}/${selectedTask.taskKey}`;

      const button =
        $("taskManagerApprove");

      try {
        if (button) {
          button.disabled = true;
          button.textContent =
            "Approving...";
        }

        /*
          Important:
          Points/rating are added only
          when task is NOT already completed.
          This prevents basic double credit.
        */

        if (
          normalizeTaskStatus(
            selectedTask.status
          ) !== "completed"
        ) {
          const record =
            await getPersonRecord(
              selectedTask
            );

          if (record) {
            const person =
              record.data;

            const currentPoints =
              Number(
                person.points || 0
              );

            const currentRating =
              Number(
                person.rating || 0
              );

            const ratingCount =
              Number(
                person.ratingCount || 0
              );

            const personUpdate = {
              points:
                currentPoints +
                finalPoints,

              updatedAt:
                Date.now()
            };

            if (finalRating > 0) {
              const newCount =
                ratingCount + 1;

              personUpdate.rating =
                (
                  (
                    currentRating *
                    ratingCount
                  ) +
                  finalRating
                ) / newCount;

              personUpdate.ratingCount =
                newCount;
            }

            await update(
              ref(
                db,
                record.path
              ),
              personUpdate
            );
          }
        }

        await update(
          ref(db, taskPath),
          {
            points:
              finalPoints,

            rating:
              finalRating,

            adminRemark:
              remark,

            status:
              "completed",

            reviewedAt:
              Date.now(),

            completedAt:
              Date.now(),

            updatedAt:
              Date.now()
          }
        );

        showMessage(
          message,
          "Task approved successfully. Points and rating updated.",
          "success"
        );

        /*
          Keep local selected state
          consistent until listener refresh.
        */

        selectedTask.status =
          "completed";

        selectedTask.points =
          finalPoints;

        selectedTask.rating =
          finalRating;

        selectedTask.adminRemark =
          remark;

      } catch (error) {
        console.error(
          "Task approval error:",
          error
        );

        showMessage(
          message,
          "Unable to approve task.",
          "error"
        );

      } finally {
        if (button) {
          button.disabled = false;
          button.textContent =
            "✓ Approve & Complete";
        }
      }
    }
  );


/* =========================================================
   REJECT TASK
========================================================= */

$("taskManagerReject")
  ?.addEventListener(
    "click",
    async () => {
      if (!selectedTask) {
        return;
      }

      const message =
        $("taskManagerMessage");

      const remark =
        clean(
          $("taskManagerRemark")
            ?.value
        );

      const taskPath =
        selectedTask.type ===
        "member"
          ? `memberTasks/${selectedTask.personKey}/${selectedTask.taskKey}`
          : `volunteerTasks/${selectedTask.personKey}/${selectedTask.taskKey}`;

      try {
        await update(
          ref(db, taskPath),
          {
            status:
              "rejected",

            adminRemark:
              remark ||
              "Please correct the work and submit again.",

            rejectionReason:
              remark ||
              "Please correct the work and submit again.",

            reviewedAt:
              Date.now(),

            updatedAt:
              Date.now()
          }
        );

        showMessage(
          message,
          "Task rejected. Member/Volunteer can resubmit it.",
          "success"
        );

        selectedTask.status =
          "rejected";

      } catch (error) {
        console.error(
          "Task reject error:",
          error
        );

        showMessage(
          message,
          "Unable to reject task.",
          "error"
        );
      }
    }
  );


/* =========================================================
   DELETE TASK
========================================================= */

$("taskManagerDelete")
  ?.addEventListener(
    "click",
    async () => {
      if (!selectedTask) {
        return;
      }

      const confirmed =
        window.confirm(
          "Are you sure you want to permanently delete this task?"
        );

      if (!confirmed) {
        return;
      }

      const taskPath =
        selectedTask.type ===
        "member"
          ? `memberTasks/${selectedTask.personKey}/${selectedTask.taskKey}`
          : `volunteerTasks/${selectedTask.personKey}/${selectedTask.taskKey}`;

      try {
        await remove(
          ref(db, taskPath)
        );

        closeTaskModal();

      } catch (error) {
        console.error(
          "Task delete error:",
          error
        );

        showMessage(
          $("taskManagerMessage"),
          "Unable to delete task.",
          "error"
        );
      }
    }
  );


/* =========================================================
   RENDER EVERYTHING
========================================================= */

function renderEverything() {
  renderStats();

  renderPendingTasks();

  renderAllTasks();

  renderCompletedTasks();

  renderRejectedTasks();
}


/* =========================================================
   ESC
========================================================= */

document.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key === "Escape"
    ) {
      closeTaskModal();
    }
  }
);


/* =========================================================
   START
========================================================= */

console.log(
  "AAKASH EARTH Task Management connected."
);
/* =========================================================
   AAKASH EARTH - ADMIN CONTROL PANEL
   Firebase Realtime Database
   Storage temporarily NOT used
========================================================= */

import {
  db,
  ref,
  set,
  push,
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

function mobile(value = "") {
  let result =
    String(value).replace(/\D/g, "");

  if (
    result.length === 12 &&
    result.startsWith("91")
  ) {
    result = result.slice(-10);
  }

  return result.slice(-10);
}

function escapeHTML(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function arrayFromObject(data) {
  if (!data) return [];

  return Object.entries(data)
    .map(([key, value]) => ({
      key,
      ...(value || {})
    }));
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
  const map = {
    active: "Active",
    inactive: "Inactive",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    assigned: "Assigned",
    pending_review: "Pending Review",
    completed: "Completed",
    submitted: "Submitted",
    under_review: "Under Review",
    in_progress: "In Progress",
    resolved: "Resolved",
    published: "Published"
  };

  const key = normalize(value);

  return (
    map[key] ||
    clean(value).replaceAll("_", " ") ||
    "—"
  );
}

function randomCode(length = 6) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let output = "";

  if (
    window.crypto &&
    window.crypto.getRandomValues
  ) {
    const values =
      new Uint32Array(length);

    window.crypto.getRandomValues(values);

    values.forEach((value) => {
      output +=
        chars[value % chars.length];
    });

    return output;
  }

  for (let i = 0; i < length; i++) {
    output +=
      chars[
        Math.floor(
          Math.random() * chars.length
        )
      ];
  }

  return output;
}

function showMessage(
  element,
  message,
  type = "success"
) {
  if (!element) return;

  element.textContent = message;

  element.className =
    `admin-message show ${type}`;
}

function clearMessage(element) {
  if (!element) return;

  element.textContent = "";
  element.className = "admin-message";
}

function confirmAction(message) {
  return window.confirm(message);
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

  /*
    Existing login.js may have only role saved,
    so admin role is accepted too.
  */

  if (
    role !== "admin" &&
    adminLogin !== "true"
  ) {
    window.location.href =
      "login.html";
  }
}

checkAdminSession();


/* =========================================================
   STATE
========================================================= */

let members = [];
let volunteers = [];
let complaints = [];
let proposals = [];
let receipts = [];

let memberTasks = [];
let volunteerTasks = [];

let festivals = [];
let sports = [];
let updatesData = [];
let gallery = [];

let selectedVolunteerKey = null;
let selectedTask = null;
let selectedComplaintKey = null;
let selectedProposalKey = null;


/* =========================================================
   SIDEBAR / PANELS
========================================================= */

const adminSidebar =
  $("adminSidebar");

const adminPageTitle =
  $("adminPageTitle");

const panelTitles = {
  dashboard: "Dashboard",
  members: "Members",
  volunteers: "Volunteers",
  tasks: "Assign Tasks",
  taskreview: "Task Review",
  complaints: "Complaints",
  proposals: "Proposals",
  receipts: "Receipts / Vargani",
  festivals: "Festivals",
  sports: "Sports",
  updates: "Updates",
  gallery: "Gallery"
};

function openPanel(name) {
  $$("[data-admin-panel-content]")
    .forEach((panel) => {
      panel.classList.toggle(
        "active",
        panel.dataset
          .adminPanelContent === name
      );
    });

  $$("[data-admin-panel]")
    .forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset
          .adminPanel === name
      );
    });

  if (adminPageTitle) {
    adminPageTitle.textContent =
      panelTitles[name] || "Admin";
  }

  adminSidebar?.classList.remove("open");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

$$("[data-admin-panel]")
  .forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        openPanel(
          button.dataset.adminPanel
        );
      }
    );
  });

$$("[data-open-admin-panel]")
  .forEach((button) => {
    button.addEventListener(
      "click",
      () => {
        openPanel(
          button.dataset
            .openAdminPanel
        );
      }
    );
  });

$("adminMenuBtn")
  ?.addEventListener(
    "click",
    () => {
      adminSidebar
        ?.classList.toggle("open");
    }
  );


/* =========================================================
   LOGOUT
========================================================= */

$("adminLogout")
  ?.addEventListener(
    "click",
    () => {
      sessionStorage.removeItem(
        "aakashLoginRole"
      );

      sessionStorage.removeItem(
        "aakashAdminLogin"
      );

      sessionStorage.removeItem(
        "aakashAdminUsername"
      );

      window.location.href =
        "login.html";
    }
  );


/* =========================================================
   MODAL HELPERS
========================================================= */

function openModal(element) {
  element?.classList.add("open");
}

function closeModal(element) {
  element?.classList.remove("open");
}

const addMemberModal =
  $("addMemberModal");

const volunteerReviewModal =
  $("volunteerReviewModal");

const taskReviewModal =
  $("taskReviewModal");

const complaintAdminModal =
  $("complaintAdminModal");

const proposalReviewModal =
  $("proposalReviewModal");


$("openAddMemberModal")
  ?.addEventListener(
    "click",
    () => {
      clearMessage(
        $("addMemberMessage")
      );

      openModal(addMemberModal);
    }
  );

$("closeAddMemberModal")
  ?.addEventListener(
    "click",
    () => closeModal(addMemberModal)
  );

$("closeVolunteerReviewModal")
  ?.addEventListener(
    "click",
    () =>
      closeModal(
        volunteerReviewModal
      )
  );

$("closeTaskReviewModal")
  ?.addEventListener(
    "click",
    () =>
      closeModal(taskReviewModal)
  );

$("closeComplaintAdminModal")
  ?.addEventListener(
    "click",
    () =>
      closeModal(
        complaintAdminModal
      )
  );

$("closeProposalReviewModal")
  ?.addEventListener(
    "click",
    () =>
      closeModal(
        proposalReviewModal
      )
  );

$$(".admin-modal")
  .forEach((modal) => {
    modal.addEventListener(
      "click",
      (event) => {
        if (event.target === modal) {
          closeModal(modal);
        }
      }
    );
  });


/* =========================================================
   MEMBER ID
========================================================= */

function generateMemberId(year) {
  return (
    `AE-MEM-${year}-` +
    randomCode(6)
  );
}

function generateVolunteerId(year) {
  return (
    `AE-VOL-${year}-` +
    randomCode(6)
  );
}


/* =========================================================
   ADD MEMBER
========================================================= */

$("newMemberMobile")
  ?.addEventListener(
    "input",
    (event) => {
      event.target.value =
        mobile(event.target.value);
    }
  );

$("adminAddMemberForm")
  ?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const message =
        $("addMemberMessage");

      clearMessage(message);

      const name =
        clean(
          $("newMemberName")?.value
        );

      const memberMobile =
        mobile(
          $("newMemberMobile")?.value
        );

      const position =
        clean(
          $("newMemberPosition")?.value
        ) || "Member";

      const year =
        clean(
          $("newMemberYear")?.value
        );

      const username =
        clean(
          $("newMemberUsername")?.value
        );

      const password =
        clean(
          $("newMemberPassword")?.value
        );

      const address =
        clean(
          $("newMemberAddress")?.value
        );

      if (name.length < 2) {
        showMessage(
          message,
          "Enter member name.",
          "error"
        );
        return;
      }

      if (!/^\d{10}$/.test(memberMobile)) {
        showMessage(
          message,
          "Enter valid 10-digit mobile number.",
          "error"
        );
        return;
      }

      if (!year) {
        showMessage(
          message,
          "Enter member year.",
          "error"
        );
        return;
      }

      if (!username) {
        showMessage(
          message,
          "Enter username.",
          "error"
        );
        return;
      }

      if (!password) {
        showMessage(
          message,
          "Enter password.",
          "error"
        );
        return;
      }

      const duplicate =
        members.some((member) =>
          normalize(member.username) ===
            normalize(username) ||
          mobile(member.mobile) ===
            memberMobile
        );

      if (duplicate) {
        showMessage(
          message,
          "Username or mobile number already exists.",
          "error"
        );
        return;
      }

      const submit =
        $("addMemberSubmit");

      try {
        if (submit) {
          submit.disabled = true;
          submit.textContent =
            "Creating Member...";
        }

        const memberId =
          generateMemberId(year);

        const newRef =
          push(ref(db, "members"));

        await set(newRef, {
          memberId,
          name,
          mobile: memberMobile,
          position,
          year,
          username,
          password,
          address,
          photoURL: "",
          status: "active",
          points: 0,
          rating: 0,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });

        showMessage(
          message,
          `Member created successfully. ID: ${memberId}`,
          "success"
        );

        event.target.reset();

      } catch (error) {
        console.error(error);

        showMessage(
          message,
          "Unable to create member. Check Firebase Database rules.",
          "error"
        );

      } finally {
        if (submit) {
          submit.disabled = false;
          submit.textContent =
            "Create Member Account →";
        }
      }
    }
  );


/* =========================================================
   MEMBERS LIVE
========================================================= */

onValue(
  ref(db, "members"),
  (snapshot) => {
    members =
      arrayFromObject(
        snapshot.val()
      );

    renderMembers();
    updateDashboardStats();
    populateTaskUsers();
  }
);

function renderMembers() {
  const body =
    $("adminMemberList");

  if (!body) return;

  const search =
    normalize(
      $("memberAdminSearch")?.value
    );

  const status =
    normalize(
      $("memberAdminStatusFilter")?.value ||
      "all"
    );

  const filtered =
    members.filter((member) => {
      const haystack =
        normalize(
          `${member.name || ""}
           ${member.memberId || ""}
           ${member.mobile || ""}
           ${member.username || ""}`
        );

      const searchMatch =
        !search ||
        haystack.includes(search);

      const statusMatch =
        status === "all" ||
        normalize(member.status) ===
          status;

      return searchMatch &&
        statusMatch;
    });

  if (!filtered.length) {
    body.innerHTML = `
      <tr>
        <td colspan="7">
          No members found.
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML =
    filtered
      .sort(
        (a, b) =>
          Number(b.createdAt || 0) -
          Number(a.createdAt || 0)
      )
      .map((member) => `
        <tr>
          <td>
            <strong>
              ${escapeHTML(member.name || "—")}
            </strong>
            <br>
            ${escapeHTML(member.username || "")}
          </td>

          <td>
            ${escapeHTML(member.memberId || "—")}
          </td>

          <td>
            ${escapeHTML(member.mobile || "—")}
          </td>

          <td>
            ${escapeHTML(member.position || "Member")}
          </td>

          <td>
            ${escapeHTML(member.year || "—")}
          </td>

          <td>
            ${escapeHTML(statusLabel(member.status))}
          </td>

          <td>
            <div class="admin-actions">

              <button
                class="admin-mini-btn gold"
                data-member-toggle="${member.key}"
              >
                ${
                  normalize(member.status) ===
                  "active"
                    ? "Deactivate"
                    : "Activate"
                }
              </button>

              <button
                class="admin-mini-btn red"
                data-member-delete="${member.key}"
              >
                Delete
              </button>

            </div>
          </td>
        </tr>
      `)
      .join("");

  $$("[data-member-toggle]")
    .forEach((button) => {
      button.addEventListener(
        "click",
        async () => {
          const key =
            button.dataset.memberToggle;

          const member =
            members.find(
              (item) =>
                item.key === key
            );

          if (!member) return;

          const nextStatus =
            normalize(member.status) ===
            "active"
              ? "inactive"
              : "active";

          await update(
            ref(db, `members/${key}`),
            {
              status: nextStatus,
              updatedAt: Date.now()
            }
          );
        }
      );
    });

  $$("[data-member-delete]")
    .forEach((button) => {
      button.addEventListener(
        "click",
        async () => {
          const key =
            button.dataset.memberDelete;

          if (
            !confirmAction(
              "Delete this member permanently?"
            )
          ) {
            return;
          }

          await remove(
            ref(db, `members/${key}`)
          );
        }
      );
    });
}

$("memberAdminSearch")
  ?.addEventListener(
    "input",
    renderMembers
  );

$("memberAdminStatusFilter")
  ?.addEventListener(
    "change",
    renderMembers
  );


/* =========================================================
   VOLUNTEERS LIVE
========================================================= */

onValue(
  ref(db, "volunteers"),
  (snapshot) => {
    volunteers =
      arrayFromObject(
        snapshot.val()
      );

    renderVolunteers();
    updateDashboardStats();
    populateTaskUsers();
  }
);

function renderVolunteers() {
  const body =
    $("adminVolunteerList");

  if (!body) return;

  const search =
    normalize(
      $("volunteerAdminSearch")?.value
    );

  const filter =
    normalize(
      $("volunteerAdminStatusFilter")?.value ||
      "all"
    );

  const filtered =
    volunteers.filter((volunteer) => {
      const haystack =
        normalize(
          `${volunteer.name || ""}
           ${volunteer.volunteerId || ""}
           ${volunteer.applicationId || ""}
           ${volunteer.mobile || ""}
           ${volunteer.area || ""}`
        );

      return (
        (!search ||
          haystack.includes(search)) &&
        (
          filter === "all" ||
          normalize(volunteer.status) ===
            filter
        )
      );
    });

  if (!filtered.length) {
    body.innerHTML = `
      <tr>
        <td colspan="7">
          No volunteers found.
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML =
    filtered
      .sort(
        (a, b) =>
          Number(b.createdAt || 0) -
          Number(a.createdAt || 0)
      )
      .map((volunteer) => `
        <tr>
          <td>
            <strong>
              ${escapeHTML(volunteer.name || "—")}
            </strong>
            <br>
            ${escapeHTML(volunteer.applicationId || "")}
          </td>

          <td>
            ${escapeHTML(volunteer.volunteerId || "Not Assigned")}
          </td>

          <td>
            ${escapeHTML(volunteer.mobile || "—")}
          </td>

          <td>
            ${escapeHTML(volunteer.area || "—")}
          </td>

          <td>
            ${escapeHTML(volunteer.year || "—")}
          </td>

          <td>
            ${escapeHTML(statusLabel(volunteer.status))}
          </td>

          <td>
            <button
              class="admin-mini-btn gold"
              data-review-volunteer="${volunteer.key}"
            >
              View / Review
            </button>
          </td>
        </tr>
      `)
      .join("");

  $$("[data-review-volunteer]")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          openVolunteerReview(
            button.dataset
              .reviewVolunteer
          );
        }
      );
    });
}

$("volunteerAdminSearch")
  ?.addEventListener(
    "input",
    renderVolunteers
  );

$("volunteerAdminStatusFilter")
  ?.addEventListener(
    "change",
    renderVolunteers
  );


/* =========================================================
   VOLUNTEER REVIEW
========================================================= */

function openVolunteerReview(key) {
  const volunteer =
    volunteers.find(
      (item) => item.key === key
    );

  if (!volunteer) return;

  selectedVolunteerKey = key;

  $("reviewVolunteerName").textContent =
    volunteer.name || "Volunteer";

  $("reviewVolunteerDetails").innerHTML = `
    <div class="admin-card">

      <p>
        <strong>Application ID:</strong>
        ${escapeHTML(volunteer.applicationId || "—")}
      </p>

      <p>
        <strong>Volunteer ID:</strong>
        ${escapeHTML(volunteer.volunteerId || "Not assigned")}
      </p>

      <p>
        <strong>Mobile:</strong>
        ${escapeHTML(volunteer.mobile || "—")}
      </p>

      <p>
        <strong>DOB:</strong>
        ${escapeHTML(volunteer.dob || "—")}
      </p>

      <p>
        <strong>Gender:</strong>
        ${escapeHTML(volunteer.gender || "—")}
      </p>

      <p>
        <strong>Year:</strong>
        ${escapeHTML(volunteer.year || "—")}
      </p>

      <p>
        <strong>Area:</strong>
        ${escapeHTML(volunteer.area || "—")}
      </p>

      <p>
        <strong>Address:</strong>
        ${escapeHTML(volunteer.address || "—")}
      </p>

      <p>
        <strong>Reason:</strong>
        ${escapeHTML(volunteer.reason || "—")}
      </p>

      <p>
        <strong>Photo File:</strong>
        ${escapeHTML(volunteer.photoFileName || "No photo")}
      </p>

      <p>
        <strong>Status:</strong>
        ${escapeHTML(statusLabel(volunteer.status))}
      </p>

    </div>
  `;

  clearMessage(
    $("volunteerReviewMessage")
  );

  openModal(
    volunteerReviewModal
  );
}

$("approveVolunteerBtn")
  ?.addEventListener(
    "click",
    async () => {
      if (!selectedVolunteerKey) {
        return;
      }

      const volunteer =
        volunteers.find(
          (item) =>
            item.key ===
            selectedVolunteerKey
        );

      if (!volunteer) return;

      const message =
        $("volunteerReviewMessage");

      try {
        const volunteerId =
          volunteer.volunteerId ||
          generateVolunteerId(
            volunteer.year ||
            new Date().getFullYear()
          );

        await update(
          ref(
            db,
            `volunteers/${selectedVolunteerKey}`
          ),
          {
            volunteerId,
            status: "approved",
            approvedAt: Date.now(),
            updatedAt: Date.now()
          }
        );

        showMessage(
          message,
          `Volunteer approved. ID: ${volunteerId}`,
          "success"
        );

      } catch (error) {
        console.error(error);

        showMessage(
          message,
          "Unable to approve volunteer.",
          "error"
        );
      }
    }
  );

$("rejectVolunteerBtn")
  ?.addEventListener(
    "click",
    async () => {
      if (!selectedVolunteerKey) {
        return;
      }

      if (
        !confirmAction(
          "Reject this volunteer application?"
        )
      ) {
        return;
      }

      try {
        await update(
          ref(
            db,
            `volunteers/${selectedVolunteerKey}`
          ),
          {
            status: "rejected",
            updatedAt: Date.now()
          }
        );

        showMessage(
          $("volunteerReviewMessage"),
          "Volunteer application rejected.",
          "success"
        );

      } catch (error) {
        console.error(error);

        showMessage(
          $("volunteerReviewMessage"),
          "Unable to reject application.",
          "error"
        );
      }
    }
  );


/* =========================================================
   TASK ASSIGNMENT
========================================================= */

$("adminTaskUserType")
  ?.addEventListener(
    "change",
    populateTaskUsers
  );

function populateTaskUsers() {
  const type =
    normalize(
      $("adminTaskUserType")?.value
    );

  const select =
    $("adminTaskUser");

  if (!select) return;

  if (type === "member") {
    const activeMembers =
      members.filter(
        (item) =>
          normalize(item.status) ===
          "active"
      );

    select.innerHTML =
      `<option value="">Select Member</option>` +
      activeMembers
        .map((item) => `
          <option value="${escapeHTML(item.key)}">
            ${escapeHTML(item.name || "Member")}
            (${escapeHTML(item.memberId || "")})
          </option>
        `)
        .join("");

    return;
  }

  if (type === "volunteer") {
    const approved =
      volunteers.filter(
        (item) =>
          normalize(item.status) ===
          "approved"
      );

    select.innerHTML =
      `<option value="">Select Volunteer</option>` +
      approved
        .map((item) => `
          <option value="${escapeHTML(item.key)}">
            ${escapeHTML(item.name || "Volunteer")}
            (${escapeHTML(item.volunteerId || "")})
          </option>
        `)
        .join("");

    return;
  }

  select.innerHTML =
    `<option value="">Select type first</option>`;
}

$("adminTaskForm")
  ?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const message =
        $("adminTaskMessage");

      clearMessage(message);

      const type =
        normalize(
          $("adminTaskUserType")?.value
        );

      const userKey =
        clean(
          $("adminTaskUser")?.value
        );

      const title =
        clean(
          $("adminTaskTitle")?.value
        );

      const description =
        clean(
          $("adminTaskDescription")?.value
        );

      const deadline =
        clean(
          $("adminTaskDeadline")?.value
        );

      const points =
        Math.max(
          0,
          Number(
            $("adminTaskPoints")?.value ||
            0
          )
        );

      if (
        !["member", "volunteer"]
          .includes(type)
      ) {
        showMessage(
          message,
          "Select Member or Volunteer.",
          "error"
        );
        return;
      }

      if (!userKey || !title) {
        showMessage(
          message,
          "Select person and enter task title.",
          "error"
        );
        return;
      }

      const person =
        type === "member"
          ? members.find(
              (item) =>
                item.key === userKey
            )
          : volunteers.find(
              (item) =>
                item.key === userKey
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
          ? `memberTasks/${userKey}`
          : `volunteerTasks/${userKey}`;

      try {
        const newTask =
          push(ref(db, path));

        await set(newTask, {
          title,
          description,
          deadline,
          points,
          status: "assigned",
          personType: type,
          personKey: userKey,
          personId:
            type === "member"
              ? person.memberId || ""
              : person.volunteerId || "",
          personName:
            person.name || "",
          proofURL: "",
          proofPhotoName: "",
          adminRemark: "",
          rating: 0,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });

        showMessage(
          message,
          `Task assigned to ${person.name || "user"}.`,
          "success"
        );

        event.target.reset();

        populateTaskUsers();

      } catch (error) {
        console.error(error);

        showMessage(
          message,
          "Unable to assign task.",
          "error"
        );
      }
    }
  );


/* =========================================================
   TASKS LIVE
========================================================= */

function flattenTasks(
  data,
  type
) {
  const output = [];

  if (!data) return output;

  Object.entries(data)
    .forEach(
      ([personKey, taskObject]) => {
        if (!taskObject) return;

        Object.entries(taskObject)
          .forEach(
            ([taskKey, task]) => {
              output.push({
                personKey,
                taskKey,
                type,
                ...(task || {})
              });
            }
          );
      }
    );

  return output;
}

onValue(
  ref(db, "memberTasks"),
  (snapshot) => {
    memberTasks =
      flattenTasks(
        snapshot.val(),
        "member"
      );

    renderTaskReview();
    updateDashboardStats();
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

    renderTaskReview();
    updateDashboardStats();
  }
);

function getTaskPerson(task) {
  if (task.type === "member") {
    return members.find(
      (item) =>
        item.key ===
        task.personKey
    );
  }

  return volunteers.find(
    (item) =>
      item.key ===
      task.personKey
  );
}

function renderTaskReview() {
  const body =
    $("adminTaskReviewList");

  if (!body) return;

  const typeFilter =
    normalize(
      $("taskReviewTypeFilter")?.value ||
      "all"
    );

  const statusFilter =
    normalize(
      $("taskReviewStatusFilter")?.value ||
      "pending_review"
    );

  const allTasks = [
    ...memberTasks,
    ...volunteerTasks
  ];

  const filtered =
    allTasks.filter((task) => {
      const typeMatch =
        typeFilter === "all" ||
        task.type === typeFilter;

      const statusMatch =
        statusFilter === "all" ||
        normalize(task.status) ===
          statusFilter;

      return typeMatch &&
        statusMatch;
    });

  if (!filtered.length) {
    body.innerHTML = `
      <tr>
        <td colspan="7">
          No task submissions found.
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML =
    filtered
      .sort(
        (a, b) =>
          Number(
            b.submittedAt ||
            b.updatedAt ||
            b.createdAt ||
            0
          ) -
          Number(
            a.submittedAt ||
            a.updatedAt ||
            a.createdAt ||
            0
          )
      )
      .map((task) => {
        const person =
          getTaskPerson(task);

        return `
          <tr>

            <td>
              <strong>
                ${escapeHTML(
                  task.personName ||
                  person?.name ||
                  "—"
                )}
              </strong>
            </td>

            <td>
              ${escapeHTML(statusLabel(task.type))}
            </td>

            <td>
              ${escapeHTML(task.title || "—")}
            </td>

            <td>
              ${
                task.proofURL
                  ? `<a href="${escapeHTML(task.proofURL)}" target="_blank">View Proof</a>`
                  : escapeHTML(
                      task.proofPhotoName ||
                      "No proof photo"
                    )
              }
            </td>

            <td>
              ${Number(task.points || 0)}
            </td>

            <td>
              ${escapeHTML(statusLabel(task.status))}
            </td>

            <td>
              <button
                class="admin-mini-btn gold"
                data-task-review="${task.type}|${task.personKey}|${task.taskKey}"
              >
                Review
              </button>
            </td>

          </tr>
        `;
      })
      .join("");

  $$("[data-task-review]")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          const [
            type,
            personKey,
            taskKey
          ] =
            button.dataset
              .taskReview
              .split("|");

          openTaskReview(
            type,
            personKey,
            taskKey
          );
        }
      );
    });
}

$("taskReviewTypeFilter")
  ?.addEventListener(
    "change",
    renderTaskReview
  );

$("taskReviewStatusFilter")
  ?.addEventListener(
    "change",
    renderTaskReview
  );


/* =========================================================
   TASK REVIEW MODAL
========================================================= */

function openTaskReview(
  type,
  personKey,
  taskKey
) {
  const source =
    type === "member"
      ? memberTasks
      : volunteerTasks;

  const task =
    source.find(
      (item) =>
        item.personKey === personKey &&
        item.taskKey === taskKey
    );

  if (!task) return;

  selectedTask = task;

  const person =
    getTaskPerson(task);

  $("taskReviewModalTitle").textContent =
    task.title || "Review Task";

  $("taskReviewDetails").innerHTML = `
    <div class="admin-card">

      <p>
        <strong>Person:</strong>
        ${escapeHTML(
          task.personName ||
          person?.name ||
          "—"
        )}
      </p>

      <p>
        <strong>Type:</strong>
        ${escapeHTML(statusLabel(type))}
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
        <strong>Submitted Proof:</strong>
        ${escapeHTML(task.proofPhotoName || "No photo filename")}
      </p>

      <p>
        <strong>Status:</strong>
        ${escapeHTML(statusLabel(task.status))}
      </p>

    </div>
  `;

  $("taskReviewPoints").value =
    Number(task.points || 0);

  $("taskReviewRating").value =
    task.rating
      ? String(task.rating)
      : "";

  $("taskReviewRemark").value =
    task.adminRemark || "";

  clearMessage(
    $("taskReviewMessage")
  );

  openModal(taskReviewModal);
}

async function updatePersonStats(
  task,
  points,
  rating
) {
  const personPath =
    task.type === "member"
      ? `members/${task.personKey}`
      : `volunteers/${task.personKey}`;

  const snapshot =
    await get(
      ref(db, personPath)
    );

  if (!snapshot.exists()) {
    return;
  }

  const person =
    snapshot.val() || {};

  const oldPoints =
    Number(person.points || 0);

  const oldRating =
    Number(person.rating || 0);

  const oldRatingCount =
    Number(
      person.ratingCount || 0
    );

  const updates = {
    points:
      oldPoints + points,
    updatedAt:
      Date.now()
  };

  if (rating > 0) {
    const newCount =
      oldRatingCount + 1;

    updates.rating =
      (
        (
          oldRating *
          oldRatingCount
        ) +
        rating
      ) / newCount;

    updates.ratingCount =
      newCount;
  }

  await update(
    ref(db, personPath),
    updates
  );
}

$("approveTaskBtn")
  ?.addEventListener(
    "click",
    async () => {
      if (!selectedTask) return;

      const message =
        $("taskReviewMessage");

      const points =
        Math.max(
          0,
          Number(
            $("taskReviewPoints")?.value ||
            0
          )
        );

      const rating =
        Math.min(
          5,
          Math.max(
            0,
            Number(
              $("taskReviewRating")?.value ||
              0
            )
          )
        );

      const remark =
        clean(
          $("taskReviewRemark")?.value
        );

      const path =
        selectedTask.type === "member"
          ? `memberTasks/${selectedTask.personKey}/${selectedTask.taskKey}`
          : `volunteerTasks/${selectedTask.personKey}/${selectedTask.taskKey}`;

      try {
        /*
          Prevent accidental double-points if an
          already completed task is opened again.
        */

        if (
          normalize(
            selectedTask.status
          ) !== "completed"
        ) {
          await updatePersonStats(
            selectedTask,
            points,
            rating
          );
        }

        await update(
          ref(db, path),
          {
            points,
            rating,
            adminRemark: remark,
            status: "completed",
            reviewedAt: Date.now(),
            updatedAt: Date.now()
          }
        );

        showMessage(
          message,
          "Task approved. Points and rating updated.",
          "success"
        );

      } catch (error) {
        console.error(error);

        showMessage(
          message,
          "Unable to approve task.",
          "error"
        );
      }
    }
  );

$("rejectTaskBtn")
  ?.addEventListener(
    "click",
    async () => {
      if (!selectedTask) return;

      const remark =
        clean(
          $("taskReviewRemark")?.value
        );

      const path =
        selectedTask.type === "member"
          ? `memberTasks/${selectedTask.personKey}/${selectedTask.taskKey}`
          : `volunteerTasks/${selectedTask.personKey}/${selectedTask.taskKey}`;

      try {
        await update(
          ref(db, path),
          {
            status: "rejected",
            adminRemark:
              remark ||
              "Please review and submit again.",
            reviewedAt: Date.now(),
            updatedAt: Date.now()
          }
        );

        showMessage(
          $("taskReviewMessage"),
          "Task rejected / sent for resubmission.",
          "success"
        );

      } catch (error) {
        console.error(error);

        showMessage(
          $("taskReviewMessage"),
          "Unable to update task.",
          "error"
        );
      }
    }
  );


/* =========================================================
   COMPLAINTS
========================================================= */

onValue(
  ref(db, "complaints"),
  (snapshot) => {
    complaints =
      arrayFromObject(
        snapshot.val()
      );

    renderComplaints();
    updateDashboardStats();
  }
);

function renderComplaints() {
  const body =
    $("adminComplaintList");

  if (!body) return;

  const search =
    normalize(
      $("adminComplaintSearch")?.value
    );

  const status =
    normalize(
      $("adminComplaintStatusFilter")?.value ||
      "all"
    );

  const filtered =
    complaints.filter((item) => {
      const haystack =
        normalize(
          `${item.complaintId || ""}
           ${item.complainantName || ""}
           ${item.complainantMobile || item.mobile || ""}
           ${item.complaintAgainstName || ""}
           ${item.reason || ""}`
        );

      return (
        (!search ||
          haystack.includes(search)) &&
        (
          status === "all" ||
          normalize(item.status) ===
            status
        )
      );
    });

  if (!filtered.length) {
    body.innerHTML = `
      <tr>
        <td colspan="7">
          No complaints found.
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML =
    filtered
      .sort(
        (a, b) =>
          Number(b.createdAt || 0) -
          Number(a.createdAt || 0)
      )
      .map((item) => `
        <tr>

          <td>
            <strong>
              ${escapeHTML(item.complaintId || "—")}
            </strong>
          </td>

          <td>
            ${escapeHTML(item.complainantName || "—")}
            <br>
            ${escapeHTML(
              item.complainantMobile ||
              item.mobile ||
              ""
            )}
          </td>

          <td>
            ${escapeHTML(
              `${statusLabel(item.complaintAgainstType)} — ${item.complaintAgainstName || "—"}`
            )}
          </td>

          <td>
            ${escapeHTML(item.reason || "—")}
          </td>

          <td>
            ${escapeHTML(statusLabel(item.status))}
          </td>

          <td>
            ${escapeHTML(formatDate(item.createdAt))}
          </td>

          <td>
            <button
              class="admin-mini-btn gold"
              data-complaint-view="${item.key}"
            >
              Open
            </button>
          </td>

        </tr>
      `)
      .join("");

  $$("[data-complaint-view]")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          openComplaint(
            button.dataset
              .complaintView
          );
        }
      );
    });
}

$("adminComplaintSearch")
  ?.addEventListener(
    "input",
    renderComplaints
  );

$("adminComplaintStatusFilter")
  ?.addEventListener(
    "change",
    renderComplaints
  );


/* =========================================================
   COMPLAINT REVIEW
========================================================= */

function openComplaint(key) {
  const complaint =
    complaints.find(
      (item) => item.key === key
    );

  if (!complaint) return;

  selectedComplaintKey = key;

  $("complaintModalId").textContent =
    complaint.complaintId ||
    "Complaint";

  $("complaintAdminDetails").innerHTML = `
    <div class="admin-card">

      <p>
        <strong>Complainant:</strong>
        ${escapeHTML(complaint.complainantName || "—")}
      </p>

      <p>
        <strong>Mobile:</strong>
        ${escapeHTML(
          complaint.complainantMobile ||
          complaint.mobile ||
          "—"
        )}
      </p>

      <p>
        <strong>Address:</strong>
        ${escapeHTML(
          complaint.complainantAddress ||
          complaint.address ||
          "—"
        )}
      </p>

      <p>
        <strong>Against:</strong>
        ${escapeHTML(
          `${statusLabel(complaint.complaintAgainstType)} — ${complaint.complaintAgainstName || "—"}`
        )}
      </p>

      <p>
        <strong>Against ID:</strong>
        ${escapeHTML(complaint.complaintAgainstId || "—")}
      </p>

      <p>
        <strong>Reason:</strong>
        ${escapeHTML(complaint.reason || "—")}
      </p>

      <p>
        <strong>Description:</strong>
        ${escapeHTML(complaint.description || "—")}
      </p>

      <p>
        <strong>Incident:</strong>
        ${escapeHTML(complaint.incidentDate || "—")}
        ${escapeHTML(complaint.incidentTime || "")}
      </p>

      <p>
        <strong>Proof File:</strong>
        ${escapeHTML(complaint.proofPhotoName || "No proof")}
      </p>

      <p>
        <strong>Submitted:</strong>
        ${escapeHTML(formatDateTime(complaint.createdAt))}
      </p>

    </div>
  `;

  $("complaintAdminStatus").value =
    normalize(
      complaint.status ||
      "submitted"
    );

  $("complaintAdminReply").value =
    complaint.adminReply || "";

  clearMessage(
    $("complaintAdminMessage")
  );

  openModal(
    complaintAdminModal
  );
}

$("saveComplaintAdminBtn")
  ?.addEventListener(
    "click",
    async () => {
      if (!selectedComplaintKey) {
        return;
      }

      const status =
        normalize(
          $("complaintAdminStatus")?.value
        );

      const reply =
        clean(
          $("complaintAdminReply")?.value
        );

      try {
        await update(
          ref(
            db,
            `complaints/${selectedComplaintKey}`
          ),
          {
            status,
            adminReply: reply,
            updatedAt: Date.now()
          }
        );

        showMessage(
          $("complaintAdminMessage"),
          "Complaint updated successfully.",
          "success"
        );

      } catch (error) {
        console.error(error);

        showMessage(
          $("complaintAdminMessage"),
          "Unable to update complaint.",
          "error"
        );
      }
    }
  );


/* =========================================================
   PROPOSALS
========================================================= */

onValue(
  ref(db, "proposals"),
  (snapshot) => {
    proposals =
      arrayFromObject(
        snapshot.val()
      );

    renderProposals();
    updateDashboardStats();
  }
);

function renderProposals() {
  const body =
    $("adminProposalList");

  if (!body) return;

  const status =
    normalize(
      $("adminProposalStatusFilter")?.value ||
      "pending"
    );

  const filtered =
    proposals.filter(
      (item) =>
        status === "all" ||
        normalize(item.status) ===
          status
    );

  if (!filtered.length) {
    body.innerHTML = `
      <tr>
        <td colspan="7">
          No proposals found.
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML =
    filtered
      .sort(
        (a, b) =>
          Number(b.createdAt || 0) -
          Number(a.createdAt || 0)
      )
      .map((item) => `
        <tr>

          <td>
            <strong>
              ${escapeHTML(item.organizerName || "—")}
            </strong>
            <br>
            ${escapeHTML(item.organizerId || "")}
          </td>

          <td>
            ${escapeHTML(statusLabel(item.type))}
          </td>

          <td>
            ${escapeHTML(item.title || "—")}
          </td>

          <td>
            ${escapeHTML(formatDate(item.date))}
          </td>

          <td>
            ${escapeHTML(item.venue || "—")}
          </td>

          <td>
            ${escapeHTML(statusLabel(item.status))}
          </td>

          <td>
            <button
              class="admin-mini-btn gold"
              data-proposal-view="${item.key}"
            >
              Review
            </button>
          </td>

        </tr>
      `)
      .join("");

  $$("[data-proposal-view]")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          openProposal(
            button.dataset
              .proposalView
          );
        }
      );
    });
}

$("adminProposalStatusFilter")
  ?.addEventListener(
    "change",
    renderProposals
  );


/* =========================================================
   PROPOSAL REVIEW
========================================================= */

function openProposal(key) {
  const proposal =
    proposals.find(
      (item) => item.key === key
    );

  if (!proposal) return;

  selectedProposalKey = key;

  $("proposalReviewTitle").textContent =
    proposal.title || "Proposal";

  $("proposalReviewDetails").innerHTML = `
    <div class="admin-card">

      <p>
        <strong>Organizer:</strong>
        ${escapeHTML(proposal.organizerName || "—")}
      </p>

      <p>
        <strong>Organizer ID:</strong>
        ${escapeHTML(proposal.organizerId || "—")}
      </p>

      <p>
        <strong>Type:</strong>
        ${escapeHTML(statusLabel(proposal.type))}
      </p>

      <p>
        <strong>Date:</strong>
        ${escapeHTML(formatDate(proposal.date))}
      </p>

      <p>
        <strong>Time:</strong>
        ${escapeHTML(proposal.time || "—")}
      </p>

      <p>
        <strong>Venue:</strong>
        ${escapeHTML(proposal.venue || "—")}
      </p>

      <p>
        <strong>Description:</strong>
        ${escapeHTML(proposal.description || "—")}
      </p>

      <p>
        <strong>Status:</strong>
        ${escapeHTML(statusLabel(proposal.status))}
      </p>

    </div>
  `;

  clearMessage(
    $("proposalReviewMessage")
  );

  openModal(
    proposalReviewModal
  );
}

async function publishProposal(
  proposal
) {
  const allowed = [
    "festival",
    "sports",
    "update",
    "gallery",
    "event"
  ];

  const type =
    normalize(proposal.type);

  if (!allowed.includes(type)) {
    return;
  }

  /*
    Event proposals are published
    into festivals for current website
    compatibility.
  */

  const path =
    type === "event"
      ? "festivals"
      : type === "update"
        ? "updates"
        : type;

  const newRef =
    push(ref(db, path));

  await set(newRef, {
    title: proposal.title || "",
    date: proposal.date || "",
    time: proposal.time || "",
    venue: proposal.venue || "",
    description:
      proposal.description || "",
    organizerType:
      proposal.organizerType ||
      "member",
    organizerKey:
      proposal.organizerKey || "",
    organizerId:
      proposal.organizerId || "",
    organizerName:
      proposal.organizerName || "",
    sourceProposalKey:
      proposal.key,
    status: "published",
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
}

$("approveProposalBtn")
  ?.addEventListener(
    "click",
    async () => {
      const proposal =
        proposals.find(
          (item) =>
            item.key ===
            selectedProposalKey
        );

      if (!proposal) return;

      try {
        /*
          Avoid duplicate publish
          if already approved.
        */

        if (
          normalize(proposal.status) !==
          "approved"
        ) {
          await publishProposal(
            proposal
          );
        }

        await update(
          ref(
            db,
            `proposals/${proposal.key}`
          ),
          {
            status: "approved",
            approvedBy: "admin",
            approvedAt: Date.now(),
            updatedAt: Date.now()
          }
        );

        showMessage(
          $("proposalReviewMessage"),
          "Proposal approved and published.",
          "success"
        );

      } catch (error) {
        console.error(error);

        showMessage(
          $("proposalReviewMessage"),
          "Unable to approve proposal.",
          "error"
        );
      }
    }
  );

$("rejectProposalBtn")
  ?.addEventListener(
    "click",
    async () => {
      if (!selectedProposalKey) {
        return;
      }

      try {
        await update(
          ref(
            db,
            `proposals/${selectedProposalKey}`
          ),
          {
            status: "rejected",
            approvedBy: "admin",
            updatedAt: Date.now()
          }
        );

        showMessage(
          $("proposalReviewMessage"),
          "Proposal rejected.",
          "success"
        );

      } catch (error) {
        console.error(error);

        showMessage(
          $("proposalReviewMessage"),
          "Unable to reject proposal.",
          "error"
        );
      }
    }
  );


/* =========================================================
   RECEIPTS
========================================================= */

onValue(
  ref(db, "receipts"),
  (snapshot) => {
    receipts =
      arrayFromObject(
        snapshot.val()
      );

    renderReceipts();
  }
);

function renderReceipts() {
  const body =
    $("adminReceiptList");

  if (!body) return;

  const search =
    normalize(
      $("adminReceiptSearch")?.value
    );

  const filtered =
    receipts.filter((item) => {
      const haystack =
        normalize(
          `${item.receiptId || item.receiptNo || ""}
           ${item.name || item.donorName || ""}
           ${item.mobile || ""}
           ${item.createdByName || ""}`
        );

      return (
        !search ||
        haystack.includes(search)
      );
    });

  if (!filtered.length) {
    body.innerHTML = `
      <tr>
        <td colspan="7">
          No receipt records found.
        </td>
      </tr>
    `;
    return;
  }

  body.innerHTML =
    filtered
      .sort(
        (a, b) =>
          Number(b.createdAt || 0) -
          Number(a.createdAt || 0)
      )
      .map((item) => `
        <tr>

          <td>
            <strong>
              ${escapeHTML(
                item.receiptId ||
                item.receiptNo ||
                item.key
              )}
            </strong>
          </td>

          <td>
            ${escapeHTML(
              item.name ||
              item.donorName ||
              "—"
            )}
          </td>

          <td>
            ${escapeHTML(item.mobile || "—")}
          </td>

          <td>
            ₹${escapeHTML(item.amount || "0")}
          </td>

          <td>
            ${escapeHTML(item.purpose || "Vargani")}
          </td>

          <td>
            ${escapeHTML(
              item.createdByName ||
              item.memberName ||
              item.volunteerName ||
              "—"
            )}
          </td>

          <td>
            ${escapeHTML(formatDateTime(item.createdAt))}
          </td>

        </tr>
      `)
      .join("");
}

$("adminReceiptSearch")
  ?.addEventListener(
    "input",
    renderReceipts
  );


/* =========================================================
   CONTENT LISTENER HELPER
========================================================= */

function listenContent(
  path,
  callback
) {
  onValue(
    ref(db, path),
    (snapshot) => {
      callback(
        arrayFromObject(
          snapshot.val()
        )
      );
    }
  );
}


/* =========================================================
   FESTIVALS
========================================================= */

listenContent(
  "festivals",
  (data) => {
    festivals = data;

    renderContentCards(
      "adminFestivalList",
      festivals,
      "festivals"
    );
  }
);

$("adminFestivalForm")
  ?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      await createContent({
        path: "festivals",
        form: event.target,
        message:
          $("adminFestivalMessage"),
        data: {
          title:
            clean(
              $("adminFestivalTitle")?.value
            ),
          date:
            $("adminFestivalDate")?.value ||
            "",
          venue:
            clean(
              $("adminFestivalVenue")?.value
            ),
          description:
            clean(
              $("adminFestivalDescription")?.value
            )
        }
      });
    }
  );


/* =========================================================
   SPORTS
========================================================= */

listenContent(
  "sports",
  (data) => {
    sports = data;

    renderContentCards(
      "adminSportsList",
      sports,
      "sports"
    );
  }
);

$("adminSportsForm")
  ?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      await createContent({
        path: "sports",
        form: event.target,
        message:
          $("adminSportsMessage"),
        data: {
          title:
            clean(
              $("adminSportsTitle")?.value
            ),
          date:
            $("adminSportsDate")?.value ||
            "",
          venue:
            clean(
              $("adminSportsVenue")?.value
            ),
          description:
            clean(
              $("adminSportsDescription")?.value
            )
        }
      });
    }
  );


/* =========================================================
   UPDATES
========================================================= */

listenContent(
  "updates",
  (data) => {
    updatesData = data;

    renderContentCards(
      "adminUpdatesList",
      updatesData,
      "updates"
    );
  }
);

$("adminUpdateForm")
  ?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      await createContent({
        path: "updates",
        form: event.target,
        message:
          $("adminUpdateMessage"),
        data: {
          title:
            clean(
              $("adminUpdateTitle")?.value
            ),
          description:
            clean(
              $("adminUpdateDescription")?.value
            )
        }
      });
    }
  );


/* =========================================================
   GALLERY
========================================================= */

listenContent(
  "gallery",
  (data) => {
    gallery = data;

    renderContentCards(
      "adminGalleryList",
      gallery,
      "gallery"
    );
  }
);

$("adminGalleryForm")
  ?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      await createContent({
        path: "gallery",
        form: event.target,
        message:
          $("adminGalleryMessage"),
        data: {
          title:
            clean(
              $("adminGalleryTitle")?.value
            ),
          description:
            clean(
              $("adminGalleryDescription")?.value
            ),
          imageURL: ""
        }
      });
    }
  );


/* =========================================================
   CREATE CONTENT
========================================================= */

async function createContent({
  path,
  form,
  message,
  data
}) {
  clearMessage(message);

  if (!data.title) {
    showMessage(
      message,
      "Title is required.",
      "error"
    );
    return;
  }

  try {
    const newRef =
      push(ref(db, path));

    await set(newRef, {
      ...data,
      status: "published",
      createdBy: "admin",
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    showMessage(
      message,
      "Published successfully.",
      "success"
    );

    form.reset();

  } catch (error) {
    console.error(error);

    showMessage(
      message,
      "Unable to publish.",
      "error"
    );
  }
}


/* =========================================================
   CONTENT CARDS
========================================================= */

function renderContentCards(
  containerId,
  items,
  path
) {
  const container =
    $(containerId);

  if (!container) return;

  if (!items.length) {
    container.innerHTML = `
      <div class="admin-empty">
        No records available.
      </div>
    `;
    return;
  }

  container.innerHTML =
    items
      .sort(
        (a, b) =>
          Number(b.createdAt || 0) -
          Number(a.createdAt || 0)
      )
      .map((item) => `
        <article class="admin-quick">

          <span class="admin-quick-icon">
            ${
              path === "festivals"
                ? "🪔"
                : path === "sports"
                  ? "🏆"
                  : path === "updates"
                    ? "📢"
                    : "▣"
            }
          </span>

          <strong>
            ${escapeHTML(item.title || "Untitled")}
          </strong>

          <span>
            ${
              item.date
                ? escapeHTML(
                    formatDate(item.date)
                  )
                : escapeHTML(
                    statusLabel(
                      item.status ||
                      "published"
                    )
                  )
            }
          </span>

          <button
            type="button"
            class="admin-mini-btn red"
            data-content-delete="${path}|${item.key}"
          >
            Delete
          </button>

        </article>
      `)
      .join("");

  $$("[data-content-delete]")
    .forEach((button) => {
      button.addEventListener(
        "click",
        async () => {
          const [
            contentPath,
            key
          ] =
            button.dataset
              .contentDelete
              .split("|");

          if (
            !confirmAction(
              "Delete this record?"
            )
          ) {
            return;
          }

          try {
            await remove(
              ref(
                db,
                `${contentPath}/${key}`
              )
            );
          } catch (error) {
            console.error(error);

            alert(
              "Unable to delete record."
            );
          }
        }
      );
    });
}


/* =========================================================
   DASHBOARD STATS
========================================================= */

function updateDashboardStats() {
  const activeMembers =
    members.filter(
      (item) =>
        normalize(item.status) ===
        "active"
    ).length;

  const approvedVolunteers =
    volunteers.filter(
      (item) =>
        normalize(item.status) ===
        "approved"
    ).length;

  const pendingVolunteers =
    volunteers.filter(
      (item) =>
        normalize(item.status) ===
        "pending"
    ).length;

  const pendingTasks = [
    ...memberTasks,
    ...volunteerTasks
  ].filter(
    (item) =>
      normalize(item.status) ===
      "pending_review"
  ).length;

  const openComplaints =
    complaints.filter(
      (item) =>
        normalize(item.status) !==
        "resolved"
    ).length;

  const pendingProposals =
    proposals.filter(
      (item) =>
        normalize(item.status) ===
        "pending"
    ).length;

  if ($("adminMemberCount")) {
    $("adminMemberCount").textContent =
      activeMembers;
  }

  if ($("adminVolunteerCount")) {
    $("adminVolunteerCount").textContent =
      approvedVolunteers;
  }

  if ($("adminPendingVolunteerCount")) {
    $("adminPendingVolunteerCount").textContent =
      pendingVolunteers;
  }

  if ($("adminPendingTaskCount")) {
    $("adminPendingTaskCount").textContent =
      pendingTasks;
  }

  if ($("adminComplaintCount")) {
    $("adminComplaintCount").textContent =
      openComplaints;
  }

  if ($("adminProposalCount")) {
    $("adminProposalCount").textContent =
      pendingProposals;
  }
}


/* =========================================================
   ESC CLOSE MODAL
========================================================= */

document.addEventListener(
  "keydown",
  (event) => {
    if (event.key !== "Escape") {
      return;
    }

    $$(
      ".admin-modal.open"
    ).forEach(
      (modal) =>
        closeModal(modal)
    );

    adminSidebar
      ?.classList.remove("open");
  }
);


/* =========================================================
   START
========================================================= */

console.log(
  "AAKASH EARTH Admin Control Panel connected."
);
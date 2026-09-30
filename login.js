/* =========================================================
   AAKASH EARTH - LOGIN SYSTEM
   firebase.js KO TOUCH NAHI KARNA
========================================================= */

import {
  db,
  ref,
  get
} from "./firebase.js";


/* =========================================================
   ELEMENTS
========================================================= */

const loginForm =
  document.getElementById("loginForm");

const loginTabs =
  document.querySelectorAll(".login-tab");

const loginDescription =
  document.getElementById("loginDescription");

const usernameLabel =
  document.getElementById("usernameLabel");

const passwordLabel =
  document.getElementById("passwordLabel");

const loginUsername =
  document.getElementById("loginUsername");

const loginPassword =
  document.getElementById("loginPassword");

const togglePassword =
  document.getElementById("togglePassword");

const loginMessage =
  document.getElementById("loginMessage");

const loginButton =
  document.getElementById("loginButton");

const loginButtonText =
  document.getElementById("loginButtonText");

const volunteerRegisterBox =
  document.getElementById("volunteerRegisterBox");


/* =========================================================
   CURRENT LOGIN ROLE
========================================================= */

let selectedRole = "admin";


/* =========================================================
   HELPERS
========================================================= */

function normalize(value = "") {
  return String(value)
    .trim()
    .toLowerCase();
}

function clearMessage() {
  if (!loginMessage) return;

  loginMessage.textContent = "";

  loginMessage.className =
    "login-message";
}

function showMessage(
  message,
  type = "error"
) {
  if (!loginMessage) return;

  loginMessage.textContent = message;

  loginMessage.className =
    `login-message show ${type}`;
}

function setLoading(loading) {
  if (!loginButton) return;

  loginButton.disabled = loading;

  if (loading) {
    if (loginButtonText) {
      loginButtonText.textContent =
        "Please wait...";
    }

    return;
  }

  updateLoginButton();
}


/* =========================================================
   CLEAR OLD LOGIN SESSIONS
========================================================= */

function clearPortalSessions() {

  const keys = [
    "aakashLoginRole",

    "aakashAdminLogin",
    "aakashAdminUsername",

    "aakashMemberLogin",
    "aakashMemberKey",
    "aakashMemberId",
    "aakashMemberName",
    "aakashMemberUsername",

    "aakashVolunteerLogin",
    "aakashVolunteerKey",
    "aakashVolunteerId",
    "aakashVolunteerName"
  ];

  keys.forEach((key) => {
    sessionStorage.removeItem(key);
  });
}


/* =========================================================
   ROLE UI
========================================================= */

const roleSettings = {

  admin: {
    description:
      "Sign in to the Admin Portal.",

    usernameLabel:
      "Admin Username",

    usernamePlaceholder:
      "Enter admin username",

    passwordLabel:
      "Password",

    passwordPlaceholder:
      "Enter admin password",

    button:
      "Login to Admin Portal",

    passwordType:
      "password"
  },


  member: {
    description:
      "Sign in using your Member username and password.",

    usernameLabel:
      "Member Username",

    usernamePlaceholder:
      "Enter member username",

    passwordLabel:
      "Password",

    passwordPlaceholder:
      "Enter member password",

    button:
      "Login to Member Portal",

    passwordType:
      "password"
  },


  volunteer: {
    description:
      "Approved volunteers can sign in using Volunteer ID and registered mobile number.",

    usernameLabel:
      "Volunteer ID",

    usernamePlaceholder:
      "Example: AE-VOL-2026-ABC123",

    passwordLabel:
      "Registered Mobile Number",

    passwordPlaceholder:
      "Enter 10-digit mobile number",

    button:
      "Login to Volunteer Portal",

    passwordType:
      "tel"
  }

};


/* =========================================================
   UPDATE LOGIN BUTTON
========================================================= */

function updateLoginButton() {

  const settings =
    roleSettings[selectedRole];

  if (loginButtonText) {
    loginButtonText.textContent =
      settings.button;
  }
}


/* =========================================================
   CHANGE ROLE
========================================================= */

function changeRole(role) {

  if (!roleSettings[role]) {
    return;
  }

  selectedRole = role;

  const settings =
    roleSettings[role];


  /* TAB ACTIVE STATE */

  loginTabs.forEach((tab) => {

    tab.classList.toggle(
      "active",
      tab.dataset.role === role
    );

  });


  /* DESCRIPTION */

  if (loginDescription) {
    loginDescription.textContent =
      settings.description;
  }


  /* LABELS */

  if (usernameLabel) {
    usernameLabel.textContent =
      settings.usernameLabel;
  }

  if (passwordLabel) {
    passwordLabel.textContent =
      settings.passwordLabel;
  }


  /* INPUTS */

  if (loginUsername) {

    loginUsername.value = "";

    loginUsername.placeholder =
      settings.usernamePlaceholder;

    loginUsername.autocomplete =
      role === "volunteer"
        ? "off"
        : "username";
  }


  if (loginPassword) {

    loginPassword.value = "";

    loginPassword.placeholder =
      settings.passwordPlaceholder;

    loginPassword.type =
      settings.passwordType;

    loginPassword.inputMode =
      role === "volunteer"
        ? "numeric"
        : "text";

    loginPassword.maxLength =
      role === "volunteer"
        ? 10
        : 100;

    loginPassword.autocomplete =
      role === "volunteer"
        ? "tel"
        : "current-password";
  }


  /* PASSWORD EYE */

  if (togglePassword) {

    togglePassword.style.display =
      role === "volunteer"
        ? "none"
        : "grid";

    togglePassword.textContent =
      "👁";
  }


  /* VOLUNTEER REGISTER */

  volunteerRegisterBox?.classList.toggle(
    "show",
    role === "volunteer"
  );


  clearMessage();
  updateLoginButton();

  loginUsername?.focus();
}


/* =========================================================
   TAB EVENTS
========================================================= */

loginTabs.forEach((tab) => {

  tab.addEventListener(
    "click",
    () => {

      const role =
        tab.dataset.role;

      changeRole(role);

    }
  );

});


/* =========================================================
   SHOW / HIDE PASSWORD
========================================================= */

togglePassword?.addEventListener(
  "click",
  () => {

    if (selectedRole === "volunteer") {
      return;
    }

    const isPassword =
      loginPassword.type ===
      "password";

    loginPassword.type =
      isPassword
        ? "text"
        : "password";

    togglePassword.textContent =
      isPassword
        ? "🙈"
        : "👁";

  }
);


/* =========================================================
   VOLUNTEER MOBILE - NUMBERS ONLY
========================================================= */

loginPassword?.addEventListener(
  "input",
  () => {

    if (selectedRole !== "volunteer") {
      return;
    }

    loginPassword.value =
      loginPassword.value
        .replace(/\D/g, "")
        .slice(0, 10);

  }
);


/* =========================================================
   ADMIN LOGIN
========================================================= */

async function loginAdmin(
  username,
  password
) {

  /*
     TEMPORARY ADMIN LOGIN

     NOTE:
     GitHub Pages public website me ye credentials
     source code me visible ho sakte hain.

     Production security ke liye later proper
     authentication/backend use karna hoga.
  */

  const ADMIN_USERNAME =
    "admin";

  const ADMIN_PASSWORD =
    "admin@123";


  if (
    username !== ADMIN_USERNAME ||
    password !== ADMIN_PASSWORD
  ) {

    throw new Error(
      "Invalid admin username or password."
    );

  }


  clearPortalSessions();


  sessionStorage.setItem(
    "aakashLoginRole",
    "admin"
  );

  sessionStorage.setItem(
    "aakashAdminLogin",
    "true"
  );

  sessionStorage.setItem(
    "aakashAdminUsername",
    ADMIN_USERNAME
  );


  showMessage(
    "Admin login successful. Opening dashboard...",
    "success"
  );


  setTimeout(() => {

    window.location.href =
      "admin.html";

  }, 450);

}


/* =========================================================
   MEMBER LOGIN
========================================================= */

async function loginMember(
  username,
  password
) {

  const snapshot =
    await get(
      ref(db, "members")
    );


  if (!snapshot.exists()) {

    throw new Error(
      "No member accounts found."
    );

  }


  const members =
    snapshot.val();


  let matchedMember = null;
  let matchedKey = null;


  Object.entries(members).some(
    ([key, member]) => {

      if (!member) {
        return false;
      }


      const savedUsername =
        normalize(
          member.username
        );


      const enteredUsername =
        normalize(username);


      const savedPassword =
        String(
          member.password || ""
        );


      if (
        savedUsername ===
          enteredUsername &&
        savedPassword ===
          password
      ) {

        matchedMember = member;
        matchedKey = key;

        return true;

      }


      return false;

    }
  );


  if (
    !matchedMember ||
    !matchedKey
  ) {

    throw new Error(
      "Invalid member username or password."
    );

  }


  const status =
    normalize(
      matchedMember.status
    );


  if (status !== "active") {

    throw new Error(
      "Your member account is currently inactive. Please contact the administrator."
    );

  }


  clearPortalSessions();


  sessionStorage.setItem(
    "aakashLoginRole",
    "member"
  );

  sessionStorage.setItem(
    "aakashMemberLogin",
    "true"
  );

  sessionStorage.setItem(
    "aakashMemberKey",
    matchedKey
  );

  sessionStorage.setItem(
    "aakashMemberId",
    matchedMember.memberId || ""
  );

  sessionStorage.setItem(
    "aakashMemberName",
    matchedMember.name || ""
  );

  sessionStorage.setItem(
    "aakashMemberUsername",
    matchedMember.username || ""
  );


  showMessage(
    `Welcome ${matchedMember.name || "Member"}. Opening your dashboard...`,
    "success"
  );


  setTimeout(() => {

    window.location.href =
      "member.html";

  }, 450);

}


/* =========================================================
   VOLUNTEER LOGIN
========================================================= */

async function loginVolunteer(
  volunteerId,
  mobile
) {

  const cleanVolunteerId =
    normalize(volunteerId);


  const cleanMobile =
    String(mobile)
      .replace(/\D/g, "")
      .trim();


  if (cleanMobile.length !== 10) {

    throw new Error(
      "Please enter your registered 10-digit mobile number."
    );

  }


  const snapshot =
    await get(
      ref(db, "volunteers")
    );


  if (!snapshot.exists()) {

    throw new Error(
      "No approved volunteer accounts found."
    );

  }


  const volunteers =
    snapshot.val();


  let matchedVolunteer = null;
  let matchedKey = null;


  Object.entries(volunteers).some(
    ([key, volunteer]) => {

      if (!volunteer) {
        return false;
      }


      const savedId =
        normalize(
          volunteer.volunteerId
        );


      const savedMobile =
        String(
          volunteer.mobile || ""
        )
          .replace(/\D/g, "")
          .trim();


      if (
        savedId ===
          cleanVolunteerId &&
        savedMobile ===
          cleanMobile
      ) {

        matchedVolunteer =
          volunteer;

        matchedKey =
          key;

        return true;

      }


      return false;

    }
  );


  if (
    !matchedVolunteer ||
    !matchedKey
  ) {

    throw new Error(
      "Volunteer ID or registered mobile number is incorrect."
    );

  }


  if (
    normalize(
      matchedVolunteer.status
    ) !== "approved"
  ) {

    throw new Error(
      "Your volunteer application is not approved yet."
    );

  }


  clearPortalSessions();


  sessionStorage.setItem(
    "aakashLoginRole",
    "volunteer"
  );

  sessionStorage.setItem(
    "aakashVolunteerLogin",
    "true"
  );

  sessionStorage.setItem(
    "aakashVolunteerKey",
    matchedKey
  );

  sessionStorage.setItem(
    "aakashVolunteerId",
    matchedVolunteer.volunteerId || ""
  );

  sessionStorage.setItem(
    "aakashVolunteerName",
    matchedVolunteer.name || ""
  );


  showMessage(
    `Welcome ${matchedVolunteer.name || "Volunteer"}. Opening your dashboard...`,
    "success"
  );


  setTimeout(() => {

    window.location.href =
      "volunteer-dashboard.html";

  }, 450);

}


/* =========================================================
   FORM SUBMIT
========================================================= */

loginForm?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    clearMessage();


    const username =
      loginUsername.value.trim();

    const password =
      loginPassword.value.trim();


    if (
      !username ||
      !password
    ) {

      showMessage(
        "Please complete both fields.",
        "error"
      );

      return;

    }


    try {

      setLoading(true);


      /* -------------------------
         ADMIN
      ------------------------- */

      if (
        selectedRole === "admin"
      ) {

        await loginAdmin(
          username,
          password
        );

        return;

      }


      /* -------------------------
         MEMBER
      ------------------------- */

      if (
        selectedRole === "member"
      ) {

        await loginMember(
          username,
          password
        );

        return;

      }


      /* -------------------------
         VOLUNTEER
      ------------------------- */

      if (
        selectedRole === "volunteer"
      ) {

        await loginVolunteer(
          username,
          password
        );

        return;

      }


      throw new Error(
        "Please select a valid login type."
      );

    }

    catch (error) {

      console.error(
        "Login error:",
        error
      );


      showMessage(
        error?.message ||
        "Unable to login. Please try again.",
        "error"
      );


      setLoading(false);

    }

  }
);


/* =========================================================
   AUTO REDIRECT IF ALREADY LOGGED IN
========================================================= */

function checkExistingSession() {

  const role =
    sessionStorage.getItem(
      "aakashLoginRole"
    );


  if (
    role === "admin" &&
    sessionStorage.getItem(
      "aakashAdminLogin"
    ) === "true"
  ) {

    showMessage(
      "Admin session already active.",
      "info"
    );

    return;

  }


  if (
    role === "member" &&
    sessionStorage.getItem(
      "aakashMemberLogin"
    ) === "true"
  ) {

    showMessage(
      "Member session already active.",
      "info"
    );

    return;

  }


  if (
    role === "volunteer" &&
    sessionStorage.getItem(
      "aakashVolunteerLogin"
    ) === "true"
  ) {

    showMessage(
      "Volunteer session already active.",
      "info"
    );

  }

}


/* =========================================================
   START
========================================================= */

changeRole("admin");

checkExistingSession();
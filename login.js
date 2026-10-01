/* =========================================================
   AAKASH EARTH
   LOGIN SYSTEM
   Complete replacement: login.js
========================================================= */

import {
  db,
  ref,
  get,
  push,
  set
} from "./firebase.js";


/* =========================================================
   HELPERS
========================================================= */

const $ = (id) =>
  document.getElementById(id);

const clean = (value) =>
  String(value ?? "").trim();

const normalizeId = (value) =>
  clean(value).toUpperCase();


const withTimeout = (
  promise,
  milliseconds = 12000,
  message = "Request timed out."
) => {

  let timer;

  const timeout = new Promise(
    (_, reject) => {

      timer = setTimeout(
        () => reject(
          new Error(message)
        ),
        milliseconds
      );

    }
  );

  return Promise.race([
    promise,
    timeout
  ]).finally(() => {

    clearTimeout(timer);

  });

};


/* =========================================================
   LOGIN PAGE ELEMENTS
========================================================= */

const loginForm =
  $("loginForm");

const loginRole =
  $("loginRole");

const loginUserId =
  $("loginUserId");

const loginPassword =
  $("loginPassword");

const loginSubmit =
  $("loginSubmit");

const loginMessage =
  $("loginMessage");


/* =========================================================
   START
========================================================= */

if (
  !loginForm ||
  !loginRole ||
  !loginUserId ||
  !loginPassword ||
  !loginSubmit ||
  !loginMessage
) {

  console.error(
    "Required login page elements are missing."
  );

} else {

  initializeLogin();

}


/* =========================================================
   INITIALIZE
========================================================= */

function initializeLogin() {

  clearOldSession();

  loginForm.addEventListener(
    "submit",
    handleLogin
  );

}


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(
  message = "",
  type = ""
) {

  loginMessage.textContent =
    message;

  loginMessage.classList.remove(
    "error",
    "success"
  );

  if (type) {

    loginMessage.classList.add(
      type
    );

  }

}


/* =========================================================
   BUTTON LOADING
========================================================= */

function setLoading(
  loading,
  role = "member"
) {

  loginSubmit.disabled =
    loading;

  if (loading) {

    loginSubmit.textContent =
      "VERIFYING...";

    return;

  }


  if (role === "admin") {

    loginSubmit.textContent =
      "LOGIN TO ADMIN PANEL →";

  } else if (role === "volunteer") {

    loginSubmit.textContent =
      "LOGIN TO VOLUNTEER PORTAL →";

  } else {

    loginSubmit.textContent =
      "LOGIN TO MEMBER PORTAL →";

  }

}


/* =========================================================
   MAIN LOGIN
========================================================= */

async function handleLogin(event) {

  event.preventDefault();


  const role =
    clean(
      loginRole.value
    ).toLowerCase();


  const rawUserId =
    clean(
      loginUserId.value
    );


  const userId =
    normalizeId(
      rawUserId
    );


  const password =
    clean(
      loginPassword.value
    );


  showMessage();


  if (
    ![
      "member",
      "volunteer",
      "admin"
    ].includes(role)
  ) {

    showMessage(
      "Please select a valid portal role.",
      "error"
    );

    return;

  }


  if (!rawUserId) {

    showMessage(
      "Please enter your User ID.",
      "error"
    );

    loginUserId.focus();

    return;

  }


  if (!password) {

    showMessage(
      "Please enter your password.",
      "error"
    );

    loginPassword.focus();

    return;

  }


  setLoading(
    true,
    role
  );


  try {

    let result = null;


    /* =====================================================
       ADMIN LOGIN
    ===================================================== */

    if (role === "admin") {

      result =
        checkAdminLogin(
          rawUserId,
          password
        );


      if (!result) {

        throw new Error(
          "Invalid Admin User ID or password."
        );

      }

    }


    /* =====================================================
       MEMBER LOGIN
    ===================================================== */

    if (role === "member") {

      result =
        await findAccount(
          "members",
          userId,
          [
            "memberId",
            "memberID",
            "userId",
            "id"
          ]
        );


      if (!result) {

        throw new Error(
          "Invalid Member ID or password."
        );

      }


      validateAccount(
        result.data,
        password,
        "Member"
      );

    }


    /* =====================================================
       VOLUNTEER LOGIN
    ===================================================== */

    if (role === "volunteer") {

      result =
        await findAccount(
          "volunteers",
          userId,
          [
            "volunteerId",
            "volunteerID",
            "userId",
            "id"
          ]
        );


      if (!result) {

        throw new Error(
          "Invalid Volunteer ID or password."
        );

      }


      validateAccount(
        result.data,
        password,
        "Volunteer"
      );

    }


    /* =====================================================
       CREATE SESSION
    ===================================================== */

    const session =
      createSession(
        role,
        result.key,
        role === "admin"
          ? "admin"
          : userId,
        result.data
      );


    saveSession(
      session
    );


    /* =====================================================
       LOGIN ACTIVITY
    ===================================================== */

    await Promise.allSettled([

      saveLoginActivity(
        session
      ),

      createAdminLoginNotification(
        session
      )

    ]);


    showMessage(
      "Login successful. Opening portal...",
      "success"
    );


    setTimeout(
      () => {

        redirectByRole(
          role
        );

      },
      400
    );


  } catch (error) {

    console.error(
      "Login error:",
      error
    );


    showMessage(
      error?.message ||
      "Unable to login. Please try again.",
      "error"
    );


    setLoading(
      false,
      role
    );

  }

}


/* =========================================================
   ADMIN LOGIN DETAILS

   ADMIN USER:
   admin

   ADMIN PASSWORD:
   MANANJISABH@124
========================================================= */

function checkAdminLogin(
  userId,
  password
) {

  const ADMIN_USER =
    "admin";

  const ADMIN_PASSWORD =
    "MANANJISABH@124";


  if (
    clean(userId).toLowerCase() !==
    ADMIN_USER
  ) {

    return null;

  }


  if (
    password !==
    ADMIN_PASSWORD
  ) {

    return null;

  }


  return {

    key:
      "defaultAdmin",

    data: {

      adminUserId:
        ADMIN_USER,

      name:
        "AAKASH EARTH Admin",

      status:
        "active"

    }

  };

}


/* =========================================================
   MEMBER / VOLUNTEER ACCOUNT SEARCH
========================================================= */

async function findAccount(
  collection,
  userId,
  possibleIdFields
) {

  /*
    First try direct Firebase key.
  */

  try {

    const directSnapshot =
      await withTimeout(

        get(
          ref(
            db,
            `${collection}/${userId}`
          )
        ),

        10000,

        "Database request timed out."

      );


    if (
      directSnapshot.exists()
    ) {

      return {

        key:
          userId,

        data:
          directSnapshot.val()

      };

    }

  } catch (error) {

    console.warn(
      "Direct lookup failed:",
      error
    );

  }


  /*
    Search collection.
  */

  const snapshot =
    await withTimeout(

      get(
        ref(
          db,
          collection
        )
      ),

      12000,

      "Database request timed out."

    );


  if (
    !snapshot.exists()
  ) {

    return null;

  }


  const records =
    snapshot.val() || {};


  for (
    const [key, data]
    of Object.entries(records)
  ) {

    if (
      !data ||
      typeof data !== "object"
    ) {

      continue;

    }


    /*
      Firebase key match.
    */

    if (
      normalizeId(key) ===
      userId
    ) {

      return {
        key,
        data
      };

    }


    /*
      Assigned ID match.
    */

    for (
      const field
      of possibleIdFields
    ) {

      if (
        normalizeId(
          data[field]
        ) ===
        userId
      ) {

        return {
          key,
          data
        };

      }

    }

  }


  return null;

}


/* =========================================================
   VALIDATE MEMBER / VOLUNTEER
========================================================= */

function validateAccount(
  account,
  enteredPassword,
  roleName
) {

  if (
    isAccountDisabled(
      account
    )
  ) {

    throw new Error(
      `${roleName} account is currently inactive.`
    );

  }


  const savedPassword =
    getAccountPassword(
      account
    );


  if (!savedPassword) {

    throw new Error(
      "Password is not configured for this account. Please contact the administrator."
    );

  }


  if (
    enteredPassword !==
    savedPassword
  ) {

    throw new Error(
      `Invalid ${roleName} ID or password.`
    );

  }

}


/* =========================================================
   GET PASSWORD
========================================================= */

function getAccountPassword(
  account
) {

  return clean(

    account?.password ??
    account?.portalPassword ??
    account?.loginPassword ??
    ""

  );

}


/* =========================================================
   ACCOUNT STATUS
========================================================= */

function isAccountDisabled(
  account
) {

  if (
    account?.active === false
  ) {

    return true;

  }


  const status =
    clean(
      account?.status
    ).toLowerCase();


  return [

    "inactive",
    "disabled",
    "blocked",
    "suspended",
    "rejected"

  ].includes(
    status
  );

}


/* =========================================================
   CREATE LOGIN SESSION
========================================================= */

function createSession(
  role,
  recordKey,
  userId,
  account
) {

  const name =
    clean(

      account?.name ??
      account?.fullName ??
      account?.memberName ??
      account?.volunteerName ??
      account?.adminName ??
      "AAKASH EARTH User"

    );


  return {

    loggedIn:
      true,

    role,

    recordKey:
      clean(
        recordKey
      ),

    userId:
      clean(
        userId
      ),

    name,

    loginAt:
      Date.now()

  };

}


/* =========================================================
   SAVE SESSION

   Password is NOT stored here.
========================================================= */

function saveSession(
  session
) {

  sessionStorage.setItem(
    "aePortalSession",
    JSON.stringify(
      session
    )
  );


  sessionStorage.setItem(
    "aeLoggedIn",
    "true"
  );


  sessionStorage.setItem(
    "aeRole",
    session.role
  );


  sessionStorage.setItem(
    "aeUserId",
    session.userId
  );


  sessionStorage.setItem(
    "aeRecordKey",
    session.recordKey
  );

}


/* =========================================================
   CLEAR OLD SESSION
========================================================= */

function clearOldSession() {

  const keys = [

    "aePortalSession",
    "aeLoggedIn",
    "aeRole",
    "aeUserId",
    "aeRecordKey"

  ];


  keys.forEach(
    (key) => {

      sessionStorage.removeItem(
        key
      );

    }
  );

}


/* =========================================================
   LOGIN ACTIVITY

   Password is NEVER stored.
========================================================= */

async function saveLoginActivity(
  session
) {

  try {

    const activityRef =
      push(
        ref(
          db,
          "loginActivity"
        )
      );


    await withTimeout(

      set(
        activityRef,
        {

          type:
            "portal_login",

          role:
            session.role,

          userId:
            session.userId,

          recordKey:
            session.recordKey,

          name:
            session.name,

          timestamp:
            Date.now()

        }
      ),

      10000,

      "Activity save timed out."

    );


  } catch (error) {

    console.warn(
      "Login activity could not be saved:",
      error
    );

  }

}


/* =========================================================
   ADMIN NOTIFICATION

   Member/Volunteer successful login
   creates an unread notification.

   Password is NEVER stored.
========================================================= */

async function createAdminLoginNotification(
  session
) {

  /*
    Do not create notification
    when Admin logs in.
  */

  if (
    session.role === "admin"
  ) {

    return;

  }


  try {

    const notificationRef =
      push(
        ref(
          db,
          "adminNotifications"
        )
      );


    const roleName =
      session.role ===
      "volunteer"
        ? "Volunteer"
        : "Member";


    await withTimeout(

      set(
        notificationRef,
        {

          type:
            `${session.role}_login`,

          title:
            `${roleName} Login`,

          message:
            `${session.name} (${session.userId}) logged into the portal.`,

          role:
            session.role,

          userId:
            session.userId,

          recordKey:
            session.recordKey,

          name:
            session.name,

          read:
            false,

          createdAt:
            Date.now()

        }
      ),

      10000,

      "Notification save timed out."

    );


  } catch (error) {

    console.warn(
      "Admin notification could not be saved:",
      error
    );

  }

}


/* =========================================================
   REDIRECT
========================================================= */

function redirectByRole(
  role
) {

  if (
    role === "admin"
  ) {

    window.location.href =
      "admin.html";

    return;

  }


  if (
    role === "volunteer"
  ) {

    window.location.href =
      "volunteer.html";

    return;

  }


  window.location.href =
    "member.html";

}
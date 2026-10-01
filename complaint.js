/* =========================================================
   AAKASH EARTH
   PUBLIC COMPLAINT SYSTEM
   Complete replacement: complaint.js
========================================================= */

import {
  db,
  storage,
  ref,
  push,
  set,
  storageRef,
  uploadBytes,
  getDownloadURL
} from "./firebase.js";


/* =========================================================
   HELPERS
========================================================= */

const $ = (id) =>
  document.getElementById(id);

const clean = (value) =>
  String(value ?? "").trim();


function withTimeout(
  promise,
  milliseconds = 15000,
  message = "Request timed out."
) {

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

}


function showMessage(
  message = "",
  error = false
) {

  const element =
    $("complaintMessage");

  if (!element) {
    return;
  }

  element.textContent =
    message;

  element.style.color =
    error
      ? "#9a3e38"
      : "#795b18";

}


/* =========================================================
   CURRENT YEAR
========================================================= */

if ($("complaintCurrentYear")) {

  $("complaintCurrentYear")
    .textContent =
    new Date().getFullYear();

}


/* =========================================================
   PHOTO PREVIEW
========================================================= */

const photoInput =
  $("complaintPhoto");

const previewBox =
  $("complaintPhotoPreviewBox");

const previewImage =
  $("complaintPhotoPreview");

const previewName =
  $("complaintPhotoName");


let previewObjectURL = "";


photoInput?.addEventListener(
  "change",
  () => {

    clearPreview();

    const file =
      photoInput.files?.[0];

    if (!file) {
      return;
    }


    if (
      !file.type.startsWith(
        "image/"
      )
    ) {

      photoInput.value = "";

      showMessage(
        "Please select a valid image.",
        true
      );

      return;

    }


    if (
      file.size >
      15 * 1024 * 1024
    ) {

      photoInput.value = "";

      showMessage(
        "Photo must be smaller than 15 MB.",
        true
      );

      return;

    }


    previewObjectURL =
      URL.createObjectURL(
        file
      );


    if (previewImage) {

      previewImage.src =
        previewObjectURL;

    }


    if (previewName) {

      previewName.textContent =
        file.name;

    }


    previewBox?.classList.add(
      "show"
    );


    showMessage("");

  }
);


function clearPreview() {

  if (previewObjectURL) {

    URL.revokeObjectURL(
      previewObjectURL
    );

    previewObjectURL = "";

  }


  previewBox?.classList.remove(
    "show"
  );


  if (previewImage) {

    previewImage.removeAttribute(
      "src"
    );

  }


  if (previewName) {

    previewName.textContent = "";

  }

}


/* =========================================================
   IMAGE COMPRESSION
========================================================= */

const MAX_ORIGINAL_SIZE =
  15 * 1024 * 1024;

const MAX_DIMENSION =
  1280;

const TARGET_SIZE =
  700 * 1024;


function canvasToBlob(
  canvas,
  quality
) {

  return new Promise(
    (resolve) => {

      canvas.toBlob(
        resolve,
        "image/jpeg",
        quality
      );

    }
  );

}


async function compressImage(
  file
) {

  if (!file) {
    return null;
  }


  if (
    !file.type.startsWith(
      "image/"
    )
  ) {

    throw new Error(
      "Please select a valid image."
    );

  }


  if (
    file.size >
    MAX_ORIGINAL_SIZE
  ) {

    throw new Error(
      "Photo must be smaller than 15 MB."
    );

  }


  const bitmap =
    await createImageBitmap(
      file
    );


  let width =
    bitmap.width;

  let height =
    bitmap.height;


  if (
    width > MAX_DIMENSION ||
    height > MAX_DIMENSION
  ) {

    const ratio =
      Math.min(
        MAX_DIMENSION / width,
        MAX_DIMENSION / height
      );


    width =
      Math.round(
        width * ratio
      );

    height =
      Math.round(
        height * ratio
      );

  }


  const canvas =
    document.createElement(
      "canvas"
    );


  canvas.width =
    width;

  canvas.height =
    height;


  const context =
    canvas.getContext(
      "2d",
      {
        alpha: false
      }
    );


  context.drawImage(
    bitmap,
    0,
    0,
    width,
    height
  );


  bitmap.close?.();


  let quality =
    0.78;


  let blob =
    await canvasToBlob(
      canvas,
      quality
    );


  while (
    blob &&
    blob.size > TARGET_SIZE &&
    quality > 0.52
  ) {

    quality -= 0.06;


    blob =
      await canvasToBlob(
        canvas,
        quality
      );

  }


  if (!blob) {

    throw new Error(
      "Unable to process photo."
    );

  }


  return blob;

}


/* =========================================================
   OPTIONAL PHOTO UPLOAD
========================================================= */

async function uploadOptionalPhoto(
  file,
  complaintKey
) {

  /*
    IMPORTANT:
    Photo is optional.

    If no photo is selected,
    complaint continues normally.
  */

  if (!file) {

    return {
      url: "",
      path: ""
    };

  }


  const blob =
    await compressImage(
      file
    );


  const fileName =
    `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.jpg`;


  const path =
    `complaints/${complaintKey}/${fileName}`;


  const fileRef =
    storageRef(
      storage,
      path
    );


  await withTimeout(
    uploadBytes(
      fileRef,
      blob,
      {
        contentType:
          "image/jpeg"
      }
    ),
    45000,
    "Photo upload timed out."
  );


  const url =
    await withTimeout(
      getDownloadURL(
        fileRef
      ),
      15000,
      "Unable to get photo URL."
    );


  return {
    url,
    path
  };

}


/* =========================================================
   COMPLAINT ID
========================================================= */

function createComplaintId() {

  const now =
    new Date();


  const year =
    now.getFullYear();


  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      "0"
    );


  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    );


  const random =
    Math.floor(
      1000 +
      Math.random() * 9000
    );


  return (
    `AE-C-${year}${month}${day}-${random}`
  );

}


/* =========================================================
   VALIDATION
========================================================= */

function validateForm(
  data
) {

  if (
    data.name.length < 2
  ) {

    return "Please enter your full name.";

  }


  if (
    !/^[0-9+\-\s]{7,15}$/.test(
      data.mobile
    )
  ) {

    return "Please enter a valid mobile number.";

  }


  if (
    data.email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      data.email
    )
  ) {

    return "Please enter a valid email address.";

  }


  if (!data.category) {

    return "Please select complaint category.";

  }


  if (
    data.subject.length < 3
  ) {

    return "Please enter complaint subject.";

  }


  if (
    data.description.length < 10
  ) {

    return "Please explain the complaint in at least 10 characters.";

  }


  return "";

}


/* =========================================================
   FORM SUBMISSION
========================================================= */

$("complaintForm")
  ?.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      const form =
        $("complaintForm");


      const button =
        $("complaintSubmitBtn");


      const data = {

        name:
          clean(
            $("complaintName")?.value
          ),

        mobile:
          clean(
            $("complaintMobile")?.value
          ),

        email:
          clean(
            $("complaintEmail")?.value
          ),

        category:
          clean(
            $("complaintCategory")?.value
          ),

        subject:
          clean(
            $("complaintSubject")?.value
          ),

        description:
          clean(
            $("complaintDescription")?.value
          )

      };


      const validationError =
        validateForm(
          data
        );


      if (validationError) {

        showMessage(
          validationError,
          true
        );

        return;

      }


      /*
        Photo is OPTIONAL.
      */

      const file =
        photoInput?.files?.[0] ||
        null;


      let complaintSaved =
        false;


      try {

        if (button) {

          button.disabled =
            true;

          button.textContent =
            file
              ? "UPLOADING..."
              : "SUBMITTING...";

        }


        showMessage(
          file
            ? "Preparing proof photo..."
            : "Submitting complaint..."
        );


        /*
          Generate Firebase key first.
        */

        const complaintRef =
          push(
            ref(
              db,
              "complaints"
            )
          );


        const complaintKey =
          complaintRef.key;


        if (!complaintKey) {

          throw new Error(
            "Unable to create complaint."
          );

        }


        const complaintId =
          createComplaintId();


        /*
          Optional image upload.
        */

        const uploaded =
          await uploadOptionalPhoto(
            file,
            complaintKey
          );


        if (file) {

          showMessage(
            "Saving complaint..."
          );

        }


        /*
          Save complaint.
        */

        const complaintData = {

          complaintId,

          name:
            data.name,

          mobile:
            data.mobile,

          email:
            data.email,

          category:
            data.category,

          subject:
            data.subject,

          description:
            data.description,

          status:
            "pending",

          proofPhotoURL:
            uploaded.url,

          proofPhotoPath:
            uploaded.path,

          createdAt:
            Date.now(),

          updatedAt:
            Date.now()

        };


        await withTimeout(
          set(
            complaintRef,
            complaintData
          ),
          15000,
          "Complaint save timed out."
        );


        complaintSaved =
          true;


        /*
          Admin notification.
          Notification failure will not
          cancel the saved complaint.
        */

        await createAdminNotification(
          complaintKey,
          complaintId,
          data
        );


        showSuccess(
          complaintId
        );


        form?.reset();

        clearPreview();


      } catch (error) {

        console.error(
          "Complaint submit error:",
          error
        );


        if (
          complaintSaved
        ) {

          showMessage(
            "Complaint was saved, but notification could not be completed."
          );

        } else {

          showMessage(
            error.message ||
            "Unable to submit complaint. Please try again.",
            true
          );

        }


      } finally {

        if (button) {

          button.disabled =
            false;

          button.textContent =
            "SUBMIT COMPLAINT";

        }

      }

    }
  );


/* =========================================================
   ADMIN NOTIFICATION
========================================================= */

async function createAdminNotification(
  complaintKey,
  complaintId,
  data
) {

  try {

    const notificationRef =
      push(
        ref(
          db,
          "adminNotifications"
        )
      );


    await withTimeout(
      set(
        notificationRef,
        {
          type:
            "new_complaint",

          title:
            "New Complaint",

          message:
            `${data.name} submitted complaint ${complaintId}: ${data.subject}`,

          complaintKey,

          complaintId,

          category:
            data.category,

          read:
            false,

          createdAt:
            Date.now()
        }
      ),
      10000,
      "Notification timed out."
    );


  } catch (error) {

    /*
      Complaint has already been saved.
      Do not fail the complaint because
      of notification failure.
    */

    console.warn(
      "Admin notification error:",
      error
    );

  }

}


/* =========================================================
   SUCCESS SCREEN
========================================================= */

function showSuccess(
  complaintId
) {

  const form =
    $("complaintForm");

  const header =
    $("complaintFormHeader");

  const success =
    $("complaintSuccess");


  if (
    $("complaintSuccessId")
  ) {

    $("complaintSuccessId")
      .textContent =
      complaintId;

  }


  if (form) {

    form.style.display =
      "none";

  }


  if (header) {

    header.style.display =
      "none";

  }


  success?.classList.add(
    "show"
  );


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


/* =========================================================
   SUBMIT ANOTHER
========================================================= */

$("submitAnotherComplaint")
  ?.addEventListener(
    "click",
    () => {

      const form =
        $("complaintForm");

      const header =
        $("complaintFormHeader");

      const success =
        $("complaintSuccess");


      success?.classList.remove(
        "show"
      );


      if (form) {

        form.style.display =
          "";

        form.reset();

      }


      if (header) {

        header.style.display =
          "";

      }


      if (
        $("complaintSuccessId")
      ) {

        $("complaintSuccessId")
          .textContent =
          "—";

      }


      clearPreview();

      showMessage("");


      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

    }
  );


/* =========================================================
   READY
========================================================= */

console.log(
  "AAKASH EARTH Complaint Portal ready."
);
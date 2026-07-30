// Note saving interaction with a toast confirmation.
document.addEventListener("DOMContentLoaded", () => {
  const saveButton = document.getElementById("saveNoteBtn");
  const toast = document.getElementById("toast");

  if (!saveButton || !toast) return;

  saveButton.addEventListener("click", () => {
    toast.textContent = "Saved successfully";
    toast.hidden = false;
    toast.classList.add("show");

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        toast.hidden = true;
      }, 250);
    }, 1600);
  });
});

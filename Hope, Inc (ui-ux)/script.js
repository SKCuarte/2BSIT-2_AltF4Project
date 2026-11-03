const form = document.getElementById("registration-form");
const message = document.getElementById("registration-message");

form.addEventListener("submit", async function (event) {
  event.preventDefault();
  message.textContent = "";
  message.className = "msg";

  const formData = new FormData(form);
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: formData.get("firstName"),
        lastName: formData.get("lastName"),
        email: formData.get("email")
      })
    });

    if (!response.ok) {
      message.textContent = "Registration could not be completed. Please try again later.";
      return;
    }

    form.reset();
    message.textContent = "Registration submitted. Your account is pending approval.";
    message.classList.add("ok");
  } catch {
    message.textContent = "Registration service is unavailable. Please try again later.";
  } finally {
    submitButton.disabled = false;
  }
});

function addRipple(control, clientX, clientY) {
  const bounds = control.getBoundingClientRect();
  const x = clientX - bounds.left;
  const y = clientY - bounds.top;
  const radius = Math.hypot(
    Math.max(x, bounds.width - x),
    Math.max(y, bounds.height - y)
  );
  const ripple = document.createElement("span");

  ripple.className = "ripple-wave";
  ripple.setAttribute("aria-hidden", "true");
  ripple.style.left = x + "px";
  ripple.style.top = y + "px";
  ripple.style.width = radius * 2 + "px";
  ripple.style.height = radius * 2 + "px";
  ripple.addEventListener("animationend", function () {
    ripple.remove();
  }, { once: true });

  control.appendChild(ripple);
}

document.addEventListener("pointerdown", function (event) {
  if (event.button !== 0 || event.isPrimary === false) return;

  const control = event.target instanceof Element
    ? event.target.closest("button, .btn")
    : null;

  if (!control || control.disabled) return;
  addRipple(control, event.clientX, event.clientY);
});

document.addEventListener("click", function (event) {
  if (event.detail !== 0) return;

  const control = event.target instanceof Element
    ? event.target.closest("button, .btn")
    : null;

  if (!control || control.disabled) return;
  const bounds = control.getBoundingClientRect();
  addRipple(control, bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
});

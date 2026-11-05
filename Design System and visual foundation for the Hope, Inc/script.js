const dialog = document.querySelector('#ds-modal-dialog');
const openButton = document.querySelector('#ds-open-modal');
const closeButton = document.querySelector('#ds-close-modal');
const cancelButton = document.querySelector('#ds-cancel-modal');
const sendButton = document.querySelector('#ds-send-invite');
const inviteInput = document.querySelector('#ds-invite');
const message = document.querySelector('#ds-modal-message');

openButton.addEventListener('click', () => {
  message.textContent = '';
  if (typeof dialog.showModal === 'function') dialog.showModal();
});

function closeDialog() {
  if (dialog.open) dialog.close();
}

closeButton.addEventListener('click', closeDialog);
cancelButton.addEventListener('click', closeDialog);
sendButton.addEventListener('click', () => {
  if (!inviteInput.value.trim() || !inviteInput.validity.valid) {
    inviteInput.reportValidity();
    return;
  }
  message.textContent = 'Demo only(In development) — no invitation was sent.';
});


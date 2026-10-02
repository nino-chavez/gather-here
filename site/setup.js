const button = document.getElementById('copy-brief');
button.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(document.getElementById('agent-prompt').textContent);
    document.getElementById('copy-status').textContent = 'Copied. Paste this into your agent.';
  } catch {
    document.getElementById('copy-status').textContent = 'Copy is unavailable here. Select the brief above and copy it manually.';
    document.getElementById('agent-prompt').focus();
  }
});

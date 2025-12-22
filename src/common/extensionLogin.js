// Common utility to retrieve extension login with wait & polling

export const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

export const isMobileUA = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export const getExtensionLoginOnce = () =>
  window.sessionStorage.getItem('extensionLogin') ||
  window.localStorage.getItem('extensionLogin') || '';

export const waitForExtensionLogin = async ({ minWait = 500, maxWait = 2000 } = {}) => {
  // Ensure at least minWait, then poll until maxWait total
  await sleep(minWait);
  let value = getExtensionLoginOnce();
  const deadline = Date.now() + Math.max(0, maxWait - minWait);
  while (!value && Date.now() < deadline) {
    await sleep(100);
    value = getExtensionLoginOnce();
  }
  return value || null;
};

export const decodeUserId = (encoded) => {
  if (!encoded) return '';
  try {
    return atob(encoded);
  } catch (e) {
    return encoded;
  }
};

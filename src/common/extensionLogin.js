// Common utility to retrieve extension login with wait & polling

export const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

export const isMobileUA = () =>
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

export const getExtensionLoginOnce = () =>
  window.sessionStorage.getItem('extensionLogin') ||
  window.localStorage.getItem('extensionLogin') ||
  '';

export const getExtensionLoginJsonOnce = () => {
  try {
    const json =
      window.sessionStorage.getItem('extensionLoginJson') ||
      window.localStorage.getItem('extensionLoginJson') ||
      '';
    return json ? JSON.parse(json) : null;
  } catch (e) {
    console.warn('Failed to parse extensionLoginJson:', e);
    return null;
  }
};

export const getUserIdFromExtension = () => {
  // 우선 새로운 extensionLoginJson에서 USR_ID 시도
  const loginJson = getExtensionLoginJsonOnce();
  if (loginJson && loginJson.USR_ID) {
    return loginJson.USR_ID;
  }
  // 기존 extensionLogin 사용 (호환성)
  const login = getExtensionLoginOnce();
  if (login) {
    return decodeUserId(login).trim();
  }
  return '';
};

export const waitForExtensionLogin = async ({
  minWait = 500,
  maxWait = 2000,
} = {}) => {
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

export const waitForExtensionLoginJson = async ({
  minWait = 500,
  maxWait = 2000,
} = {}) => {
  // Ensure at least minWait, then poll until maxWait total
  await sleep(minWait);
  let value = getExtensionLoginJsonOnce();
  const deadline = Date.now() + Math.max(0, maxWait - minWait);
  while (!value && Date.now() < deadline) {
    await sleep(100);
    value = getExtensionLoginJsonOnce();
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

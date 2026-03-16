export const TOKEN_STORAGE_KEY = "ccic_admin_token";
export const USER_STORAGE_KEY = "ccic_admin_user";

const readStorage = (key: string) =>
  sessionStorage.getItem(key) ?? localStorage.getItem(key);

const writeStorage = (key: string, value: string) => {
  sessionStorage.setItem(key, value);
  localStorage.removeItem(key);
};

const removeStorage = (key: string) => {
  sessionStorage.removeItem(key);
  localStorage.removeItem(key);
};

export const readAuthToken = () => readStorage(TOKEN_STORAGE_KEY) ?? "";

export const writeAuthToken = (token: string) => {
  writeStorage(TOKEN_STORAGE_KEY, token);
};

export const clearAuthToken = () => {
  removeStorage(TOKEN_STORAGE_KEY);
};

export const readStoredUserRaw = () => readStorage(USER_STORAGE_KEY);

export const writeStoredUserRaw = (raw: string) => {
  writeStorage(USER_STORAGE_KEY, raw);
};

export const clearStoredUser = () => {
  removeStorage(USER_STORAGE_KEY);
};


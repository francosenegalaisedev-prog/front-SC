import axios, { isAxiosError } from "axios";
import { NETWORK_ERROR_MESSAGE, SERVER_ERROR_MESSAGE } from "./apiError";
import { clearSession, getSession } from "./session";

// VITE_API_URL doit contenir la base de l’API, y compris /api (ex. https://api.example.com/api).

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
});

/** Routes d'authentification : un 401 ici (ex. mauvais mot de passe) ne doit pas effacer une session active. */
const AUTH_ENDPOINTS =
  /^\/?auth\/(admin\/login|client\/login|login|google|register|forgot-password|reset-password|verify-email)\b/;

/*
  Session refusée par le serveur (401) : la session locale est supprimée. Les 5xx et erreurs réseau
  gardent leur AxiosError pour le statut et les traitements métier, mais leur message et leur corps
  sont remplacés par des informations sûres avant d'atteindre les écrans.
*/
api.interceptors.response.use(undefined, (error: unknown) => {
  if (
    isAxiosError(error) &&
    error.response?.status === 401 &&
    !AUTH_ENDPOINTS.test(error.config?.url ?? "") &&
    getSession()
  ) {
    clearSession();
  }
  if (isAxiosError(error)) {
    if (error.response && error.response.status >= 500) {
      error.message = SERVER_ERROR_MESSAGE;
      error.response.data = {
        error: {
          code: "ERREUR_SERVEUR",
          message: SERVER_ERROR_MESSAGE,
        },
      };
    } else if (!error.response) {
      error.message = NETWORK_ERROR_MESSAGE;
    }
  }
  return Promise.reject(error);
});

// API RESPONSE TYPE

export type apiResponse<T> = {
  succes?: string;
  message?: string;
  data?: T;
};

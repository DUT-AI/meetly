// This file is needed to support autocomplete for process.env
export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // app base url
      NEXT_PUBLIC_APP_BASE_URL: string;
      NEXT_PUBLIC_API_BASE_URL: string;
    }
  }
}

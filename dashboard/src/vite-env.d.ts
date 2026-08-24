/// <reference types="vite/client" />

// Vite asset imports
declare module '*.js?url' {
  const src: string;
  export default src;
}

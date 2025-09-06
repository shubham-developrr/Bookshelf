/**
 * @file This file contains TypeScript declarations for Vite-specific environment variables
 * and for importing various image file types as modules.
 */

/// <reference types="vite/client" />

/**
 * @interface ImportMetaEnv
 * @description Defines the shape of the environment variables available through `import.meta.env`.
 * @property {string} VITE_GROQ_API_KEY - The API key for the Groq service.
 */
interface ImportMetaEnv {
  readonly VITE_GROQ_API_KEY: string
}

/**
 * @interface ImportMeta
 * @description Extends the `ImportMeta` interface to include the `env` property.
 * @property {ImportMetaEnv} env - The environment variables object.
 */
interface ImportMeta {
  readonly env: ImportMetaEnv
}

/**
 * @description TypeScript module declarations for various image file types.
 * This allows these files to be imported as modules in the application.
 */
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';
declare module '*.gif';
declare module '*.webp';

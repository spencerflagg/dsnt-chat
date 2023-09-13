// import { sveltekit } from '@sveltejs/kit/vite';

// const config = {
// 	plugins: [sveltekit()]
// };

// export default config;

// vite.config.js
import { defineConfig } from "vite";
import { sveltekit } from "@sveltejs/kit/vite"
import svelteMd from "vite-plugin-svelte-md";

export default defineConfig({
  plugins: [
    svelteMd(), // <--
    sveltekit(),
  ],
});
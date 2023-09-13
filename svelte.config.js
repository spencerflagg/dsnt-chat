import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/kit/vite';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({ out: 'build' }),
	},
	preprocess: vitePreprocess(),
	extensions: [".svelte", ".md"],
};

export default config;

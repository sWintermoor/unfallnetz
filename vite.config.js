import { defineConfig } from 'vite';

export default defineConfig({
    define: {
        'process.env': process.env, // Expose environment variables
    },
});
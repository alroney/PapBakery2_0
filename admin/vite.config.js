import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const baseURL = 'http://10.0.0.100';
const port = 3020;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, //Allow external access.
    port: port, //Use port 3020.
    strictPort: true, //Fail if the port is unavailable.
  },
  base: `${baseURL}:${port}/`, //Set the base URL.
})

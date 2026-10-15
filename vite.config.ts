import tailwindcss from "/node_modules/.vite/deps/@tailwindcss_vite.js?v=7e38a459";
import react from "/node_modules/.vite/deps/@vitejs_plugin-react.js?v=c5609f9d";
import path from "/@id/__vite-browser-external:path";
import { defineConfig } from "/node_modules/.vite/deps/vite.js?v=6cd42304";
export default defineConfig(() => {
	return {
		plugins: [react(), tailwindcss()],
		resolve: { alias: { "@": path.resolve(import.meta.dirname, ".") } },
		optimizeDeps: { exclude: ["@tailwindcss/oxide"] },
		server: {
			// HMR is disabled in AI Studio via DISABLE_HMR env var.
			// Do not modify—file watching is disabled to prevent flickering during agent edits.
			hmr: process.env.DISABLE_HMR !== "true",
			// Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
			watch: process.env.DISABLE_HMR === "true" ? null : {}
		}
	};
});

//# sourceMappingURL=data:application/json;base64,eyJtYXBwaW5ncyI6IkFBQUEsT0FBTyxpQkFBaUI7QUFDeEIsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixTQUFRLG9CQUFtQjtBQUUzQixlQUFlLG1CQUFtQjtDQUNoQyxPQUFPO0VBQ0wsU0FBUyxDQUFDLE1BQU0sR0FBRyxZQUFZLENBQUM7RUFDaEMsU0FBUyxFQUNQLE9BQU8sRUFDTCxLQUFLLEtBQUssUUFBUSxZQUFZLFNBQVMsR0FBRyxFQUM1QyxFQUNGO0VBQ0EsY0FBYyxFQUNaLFNBQVMsQ0FBQyxvQkFBb0IsRUFDaEM7RUFDQSxRQUFROzs7R0FHTixLQUFLLFFBQVEsSUFBSSxnQkFBZ0I7O0dBRWpDLE9BQU8sUUFBUSxJQUFJLGdCQUFnQixTQUFTLE9BQU8sQ0FBQztFQUN0RDtDQUNGO0FBQ0YsQ0FBQyIsIm5hbWVzIjpbXSwic291cmNlcyI6WyJ2aXRlLmNvbmZpZy50cyJdLCJ2ZXJzaW9uIjozLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgdGFpbHdpbmRjc3MgZnJvbSAnQHRhaWx3aW5kY3NzL3ZpdGUnO1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtkZWZpbmVDb25maWd9IGZyb20gJ3ZpdGUnO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKCkgPT4ge1xuICByZXR1cm4ge1xuICAgIHBsdWdpbnM6IFtyZWFjdCgpLCB0YWlsd2luZGNzcygpXSxcbiAgICByZXNvbHZlOiB7XG4gICAgICBhbGlhczoge1xuICAgICAgICAnQCc6IHBhdGgucmVzb2x2ZShpbXBvcnQubWV0YS5kaXJuYW1lLCAnLicpLFxuICAgICAgfSxcbiAgICB9LFxuICAgIG9wdGltaXplRGVwczoge1xuICAgICAgZXhjbHVkZTogWydAdGFpbHdpbmRjc3Mvb3hpZGUnXSxcbiAgICB9LFxuICAgIHNlcnZlcjoge1xuICAgICAgLy8gSE1SIGlzIGRpc2FibGVkIGluIEFJIFN0dWRpbyB2aWEgRElTQUJMRV9ITVIgZW52IHZhci5cbiAgICAgIC8vIERvIG5vdCBtb2RpZnnigJRmaWxlIHdhdGNoaW5nIGlzIGRpc2FibGVkIHRvIHByZXZlbnQgZmxpY2tlcmluZyBkdXJpbmcgYWdlbnQgZWRpdHMuXG4gICAgICBobXI6IHByb2Nlc3MuZW52LkRJU0FCTEVfSE1SICE9PSAndHJ1ZScsXG4gICAgICAvLyBEaXNhYmxlIGZpbGUgd2F0Y2hpbmcgd2hlbiBESVNBQkxFX0hNUiBpcyB0cnVlIHRvIHNhdmUgQ1BVIGR1cmluZyBhZ2VudCBlZGl0cy5cbiAgICAgIHdhdGNoOiBwcm9jZXNzLmVudi5ESVNBQkxFX0hNUiA9PT0gJ3RydWUnID8gbnVsbCA6IHt9LFxuICAgIH0sXG4gIH07XG59KTtcbiJdfQ==
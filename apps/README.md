Each app is a self-contained JS module that exports:
- init(windowElement) — called when app opens, receives the content div
- destroy() — cleanup when window closes

The window manager will load these.

// Side-effect CSS imports (e.g. `import '../styles/window.css'`) need a module
// declaration when TypeScript is run with `--noUncheckedSideEffectImports`.
// Next.js handles CSS bundling at build time; this just satisfies the type
// checker / IDE language server.
declare module '*.css';

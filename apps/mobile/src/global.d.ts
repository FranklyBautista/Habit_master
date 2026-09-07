// Metro's experimental CSS support (used by src/global.css on the web
// target) has no bundled ambient type — `tsc` needs this to type-check the
// side-effect import in src/constants/theme.ts.
declare module "*.css";

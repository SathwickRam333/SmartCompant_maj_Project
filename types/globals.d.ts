// CSS Module type declarations
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

// Global CSS imports
declare module '*/globals.css';
declare module 'leaflet/dist/leaflet.css';

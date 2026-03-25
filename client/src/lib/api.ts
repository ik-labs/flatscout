const configuredApiUrl = import.meta.env.VITE_API_URL || ""

// In production, the frontend and backend are served from the same origin.
// Avoid baking localhost into the build, which breaks mobile/browser access.
export const API_URL = import.meta.env.PROD ? "" : configuredApiUrl

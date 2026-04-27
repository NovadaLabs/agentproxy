// Proxy username injection prevention — no hyphens allowed
// (providers use `-` as segment delimiter in auth strings)
export const SAFE_COUNTRY    = /^[a-zA-Z0-9_]+$/;
export const SAFE_CITY       = /^[a-zA-Z0-9_]+$/;
export const SAFE_SESSION_ID = /^[a-zA-Z0-9_]+$/;

export const QUOTA_NOTE = "Check dashboard.novada.com for real-time balance";

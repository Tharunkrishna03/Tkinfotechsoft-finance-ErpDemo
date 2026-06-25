export function getCsrfToken() {
  if (typeof document === "undefined") {
    return "";
  }
  
  const name = "jewel_finance_csrf=";
  const decodedCookie = decodeURIComponent(document.cookie);
  const ca = decodedCookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") {
      c = c.substring(1);
    }
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }

  try {
    return localStorage.getItem("jewel_finance_csrf_token") || "";
  } catch {
    return "";
  }
}

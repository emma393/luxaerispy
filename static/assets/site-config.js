// LuxAeris Configuration File

const CONFIG = {
  // Google Apps Script endpoint (live lead capture)
  GOOGLE_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbyVtBdiUqdgDODvVoz7MUsB5Yx1zJx8iIQg71fcFuiWR1AcBVJa5D44fTgdLeW5kqnZ/exec",

  // Form validation settings
  REQUIRE_VALID_AIRPORTS: true,
  REQUIRE_CONTACT: true, // requires email or WhatsApp

  // Lead scoring (mirrors backend logic for consistency)
  SCORING: {
    FIRST_CLASS: 50,
    BUSINESS_CLASS: 30,
    INTERNATIONAL_ROUTE: 30,
    HIGH_BUDGET: 20
  }
};

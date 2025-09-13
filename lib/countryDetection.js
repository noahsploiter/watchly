// Country code mapping
export const countryCodes = {
  ET: "+251", // Ethiopia
  US: "+1", // United States
  GB: "+44", // United Kingdom
  FR: "+33", // France
  DE: "+49", // Germany
  CN: "+86", // China
  IN: "+91", // India
  NG: "+234", // Nigeria
  ZA: "+27", // South Africa
  KE: "+254", // Kenya
};

// Default to Ethiopia
export const defaultCountryCode = "+251";

// Get country code from user's location
export async function detectCountryCode() {
  try {
    // Try to get country from browser's timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Map timezone to country code
    const timezoneToCountry = {
      "Africa/Addis_Ababa": "ET",
      "America/New_York": "US",
      "America/Los_Angeles": "US",
      "Europe/London": "GB",
      "Europe/Paris": "FR",
      "Europe/Berlin": "DE",
      "Asia/Shanghai": "CN",
      "Asia/Kolkata": "IN",
      "Africa/Lagos": "NG",
      "Africa/Johannesburg": "ZA",
      "Africa/Nairobi": "KE",
    };

    const country = timezoneToCountry[timezone] || "ET";
    return countryCodes[country] || defaultCountryCode;
  } catch (error) {
    console.error("Error detecting country:", error);
    return defaultCountryCode;
  }
}

// Get country flag emoji
export function getCountryFlag(countryCode) {
  const flagMap = {
    "+251": "🇪🇹",
    "+1": "🇺🇸",
    "+44": "🇬🇧",
    "+33": "🇫🇷",
    "+49": "🇩🇪",
    "+86": "🇨🇳",
    "+91": "🇮🇳",
    "+234": "🇳🇬",
    "+27": "🇿🇦",
    "+254": "🇰🇪",
  };
  return flagMap[countryCode] || "🇪🇹";
}

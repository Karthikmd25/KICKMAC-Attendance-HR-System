// Calculates distance in meters between two GPS coordinates using the Haversine formula
function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180;

  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in meters
}

// Returns 'VERIFIED' or 'OUT_OF_RANGE' based on office settings
function checkLocationStatus(employeeLat, employeeLon, officeSettings) {
  if (!officeSettings) return 'UNKNOWN';

  const distance = getDistanceInMeters(
    employeeLat,
    employeeLon,
    officeSettings.officeLatitude,
    officeSettings.officeLongitude
  );

  return distance <= officeSettings.officeRadiusMeters ? 'VERIFIED' : 'OUT_OF_RANGE';
}

module.exports = { getDistanceInMeters, checkLocationStatus };
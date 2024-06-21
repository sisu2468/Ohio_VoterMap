const regexLat = /^(-?[1-8]?\d(?:\.\d{1,18})?|90(?:\.0{1,18})?)$/;
const regexLon = /^(-?(?:1[0-7]|[1-9])?\d(?:\.\d{1,18})?|180(?:\.0{1,18})?)$/;

export function checkLatLng(lat, lon) {
  let validLat = regexLat.test(lat);
  let validLon = regexLon.test(lon);
  return validLat && validLon;
}

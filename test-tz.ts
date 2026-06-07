import { toZonedTime, fromZonedTime } from "date-fns-tz";
const tz = "Europe/Madrid";
const now = new Date(); // assume the server is running this
const zonedNow = toZonedTime(now, tz);
const startOfZoned = new Date(zonedNow);
startOfZoned.setHours(0, 0, 0, 0);
const endOfZoned = new Date(zonedNow);
endOfZoned.setHours(23, 59, 59, 999);
const startUtc = fromZonedTime(startOfZoned, tz);
const endUtc = fromZonedTime(endOfZoned, tz);
console.log("Original now:", now.toISOString());
console.log("startUtc:", startUtc.toISOString());
console.log("endUtc:", endUtc.toISOString());

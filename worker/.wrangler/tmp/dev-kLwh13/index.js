var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// wrangler-modules-watch:wrangler:modules-watch
var init_wrangler_modules_watch = __esm({
  "wrangler-modules-watch:wrangler:modules-watch"() {
    init_modules_watch_stub();
  }
});

// node_modules/wrangler/templates/modules-watch-stub.js
var init_modules_watch_stub = __esm({
  "node_modules/wrangler/templates/modules-watch-stub.js"() {
    init_wrangler_modules_watch();
  }
});

// src/calendar/calendarCache.js
function setCalendarCache(payload, ttlMs = CALENDAR_CACHE_TTL_MS) {
  memoryCache2 = {
    payload,
    expiresAt: Date.now() + ttlMs
  };
}
function getFreshCalendarCache() {
  if (!memoryCache2) return null;
  if (Date.now() > memoryCache2.expiresAt) return null;
  return memoryCache2.payload;
}
function getStaleCalendarCache() {
  return memoryCache2?.payload ?? null;
}
function resetCalendarCacheForTests() {
  memoryCache2 = null;
}
var CALENDAR_CACHE_TTL_MS, memoryCache2;
var init_calendarCache = __esm({
  "src/calendar/calendarCache.js"() {
    init_modules_watch_stub();
    CALENDAR_CACHE_TTL_MS = 5 * 60 * 1e3;
    memoryCache2 = null;
    __name(setCalendarCache, "setCalendarCache");
    __name(getFreshCalendarCache, "getFreshCalendarCache");
    __name(getStaleCalendarCache, "getStaleCalendarCache");
    __name(resetCalendarCacheForTests, "resetCalendarCacheForTests");
  }
});

// src/calendar/timezone.js
function getZonedParts(date, timeZone = HOME_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });
  const parts = formatter.formatToParts(date);
  const map = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second)
  };
}
function formatIsoDate(year2, month, day2) {
  return `${year2}-${String(month).padStart(2, "0")}-${String(day2).padStart(2, "0")}`;
}
function localDateKey(date, timeZone = HOME_TIMEZONE) {
  const parts = getZonedParts(date, timeZone);
  return formatIsoDate(parts.year, parts.month, parts.day);
}
function addDaysToIsoDate(isoDate, dayOffset) {
  const [year2, month, day2] = isoDate.split("-").map(Number);
  const utc = new Date(Date.UTC(year2, month - 1, day2 + dayOffset, 12, 0, 0));
  return localDateKey(utc);
}
function computeRange(asOf = /* @__PURE__ */ new Date()) {
  const from = localDateKey(asOf);
  const to = addDaysToIsoDate(from, 6);
  return { from, to };
}
function rangeBounds(asOf = /* @__PURE__ */ new Date()) {
  const { from, to } = computeRange(asOf);
  const start = zonedDateTimeToUtc(from, 0, 0, 0);
  const end = zonedDateTimeToUtc(to, 23, 59, 59);
  return { from, to, startUtc: start, endUtc: end };
}
function zonedDateTimeToUtc(isoDate, hour2, minute2, second) {
  const [year2, month, day2] = isoDate.split("-").map(Number);
  let guess = Date.UTC(year2, month - 1, day2, hour2, minute2, second);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = getZonedParts(new Date(guess));
    const targetMs = Date.UTC(year2, month - 1, day2, hour2, minute2, second);
    const actualMs = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const delta = targetMs - actualMs;
    if (delta === 0) break;
    guess += delta;
  }
  return new Date(guess);
}
function formatOffsetIso(date, timeZone = HOME_TIMEZONE) {
  const parts = getZonedParts(date, timeZone);
  const isoDate = formatIsoDate(parts.year, parts.month, parts.day);
  const time = `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}:${String(parts.second).padStart(2, "0")}`;
  const londonOffset = formatLondonOffset(date);
  if (time === "00:00:00" && parts.hour === 0) {
    return `${isoDate}T${time}${londonOffset}`;
  }
  return `${isoDate}T${time}${londonOffset}`;
}
function formatLondonOffset(date) {
  const utc = date.getTime();
  const parts = getZonedParts(date);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const offsetMinutes = Math.round((asUtc - utc) / 6e4);
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}
var HOME_TIMEZONE;
var init_timezone = __esm({
  "src/calendar/timezone.js"() {
    init_modules_watch_stub();
    HOME_TIMEZONE = "Europe/London";
    __name(getZonedParts, "getZonedParts");
    __name(formatIsoDate, "formatIsoDate");
    __name(localDateKey, "localDateKey");
    __name(addDaysToIsoDate, "addDaysToIsoDate");
    __name(computeRange, "computeRange");
    __name(rangeBounds, "rangeBounds");
    __name(zonedDateTimeToUtc, "zonedDateTimeToUtc");
    __name(formatOffsetIso, "formatOffsetIso");
    __name(formatLondonOffset, "formatLondonOffset");
  }
});

// node_modules/ical.js/dist/ical.js
function parseDurationChunk(letter, number, object) {
  let type;
  switch (letter) {
    case "P":
      if (number && number === "-") {
        object.isNegative = true;
      } else {
        object.isNegative = false;
      }
      break;
    case "D":
      type = "days";
      break;
    case "W":
      type = "weeks";
      break;
    case "H":
      type = "hours";
      break;
    case "M":
      type = "minutes";
      break;
    case "S":
      type = "seconds";
      break;
    default:
      return 0;
  }
  if (type) {
    if (!number && number !== 0) {
      throw new Error(
        'invalid duration value: Missing number before "' + letter + '"'
      );
    }
    let num = parseInt(number, 10);
    if (isStrictlyNaN(num)) {
      throw new Error(
        'invalid duration value: Invalid number "' + number + '" before "' + letter + '"'
      );
    }
    object[type] = num;
  }
  return 1;
}
function parse2(input) {
  let state = {};
  let root = state.component = [];
  state.stack = [root];
  parse2._eachLine(input, function(err, line) {
    parse2._handleContentLine(line, state);
  });
  if (state.stack.length > 1) {
    throw new ParserError(
      "invalid ical body. component began but did not end"
    );
  }
  state = null;
  return root.length == 1 ? root[0] : root;
}
function updateTimezones(vcal) {
  let allsubs, properties, vtimezones, reqTzid, i;
  if (!vcal || vcal.name !== "vcalendar") {
    return vcal;
  }
  allsubs = vcal.getAllSubcomponents();
  properties = [];
  vtimezones = {};
  for (i = 0; i < allsubs.length; i++) {
    if (allsubs[i].name === "vtimezone") {
      let tzid = allsubs[i].getFirstProperty("tzid").getFirstValue();
      vtimezones[tzid] = allsubs[i];
    } else {
      properties = properties.concat(allsubs[i].getAllProperties());
    }
  }
  reqTzid = {};
  for (i = 0; i < properties.length; i++) {
    let tzid = properties[i].getParameter("tzid");
    if (tzid) {
      reqTzid[tzid] = true;
    }
  }
  for (let [tzid, comp] of Object.entries(vtimezones)) {
    if (!reqTzid[tzid]) {
      vcal.removeSubcomponent(comp);
    }
  }
  for (let tzid of Object.keys(reqTzid)) {
    if (!vtimezones[tzid] && TimezoneService.has(tzid)) {
      vcal.addSubcomponent(TimezoneService.get(tzid).component);
    }
  }
  return vcal;
}
function isStrictlyNaN(number) {
  return typeof number === "number" && isNaN(number);
}
function strictParseInt(string) {
  let result = parseInt(string, 10);
  if (isStrictlyNaN(result)) {
    throw new Error(
      'Could not extract integer from "' + string + '"'
    );
  }
  return result;
}
function formatClassType(data, type) {
  if (typeof data === "undefined") {
    return void 0;
  }
  if (data instanceof type) {
    return data;
  }
  return new type(data);
}
function unescapedIndexOf(buffer, search, pos) {
  while ((pos = buffer.indexOf(search, pos)) !== -1) {
    if (pos > 0 && buffer[pos - 1] === "\\") {
      pos += 1;
    } else {
      return pos;
    }
  }
  return -1;
}
function binsearchInsert(list, seekVal, cmpfunc) {
  if (!list.length)
    return 0;
  let low = 0, high = list.length - 1, mid, cmpval;
  while (low <= high) {
    mid = low + Math.floor((high - low) / 2);
    cmpval = cmpfunc(seekVal, list[mid]);
    if (cmpval < 0)
      high = mid - 1;
    else if (cmpval > 0)
      low = mid + 1;
    else
      break;
  }
  if (cmpval < 0)
    return mid;
  else if (cmpval > 0)
    return mid + 1;
  else
    return mid;
}
function clone2(aSrc, aDeep) {
  if (!aSrc || typeof aSrc != "object") {
    return aSrc;
  } else if (aSrc instanceof Date) {
    return new Date(aSrc.getTime());
  } else if ("clone" in aSrc) {
    return aSrc.clone();
  } else if (Array.isArray(aSrc)) {
    let arr = [];
    for (let i = 0; i < aSrc.length; i++) {
      arr.push(aDeep ? clone2(aSrc[i], true) : aSrc[i]);
    }
    return arr;
  } else {
    let obj = {};
    for (let [name, value] of Object.entries(aSrc)) {
      if (aDeep) {
        obj[name] = clone2(value, true);
      } else {
        obj[name] = value;
      }
    }
    return obj;
  }
}
function foldline(aLine) {
  let result = "";
  let line = aLine || "", pos = 0, line_length = 0;
  while (line.length) {
    let cp = line.codePointAt(pos);
    if (cp < 128) ++line_length;
    else if (cp < 2048) line_length += 2;
    else if (cp < 65536) line_length += 3;
    else line_length += 4;
    if (line_length < ICALmodule.foldLength + 1)
      pos += cp > 65535 ? 2 : 1;
    else {
      result += ICALmodule.newLineChar + " " + line.slice(0, Math.max(0, pos));
      line = line.slice(Math.max(0, pos));
      pos = line_length = 0;
    }
  }
  return result.slice(ICALmodule.newLineChar.length + 1);
}
function pad2(data) {
  if (typeof data !== "string") {
    if (typeof data === "number") {
      data = parseInt(data);
    }
    data = String(data);
  }
  let len = data.length;
  switch (len) {
    case 0:
      return "00";
    case 1:
      return "0" + data;
    default:
      return data;
  }
}
function trunc(number) {
  return number < 0 ? Math.ceil(number) : Math.floor(number);
}
function extend(source, target) {
  for (let key in source) {
    let descr = Object.getOwnPropertyDescriptor(source, key);
    if (descr && !Object.getOwnPropertyDescriptor(target, key)) {
      Object.defineProperty(target, key, descr);
    }
  }
  return target;
}
function parseNumericValue(type, min, max, value) {
  let result = value;
  if (value[0] === "+") {
    result = value.slice(1);
  }
  result = strictParseInt(result);
  if (min !== void 0 && value < min) {
    throw new Error(
      type + ': invalid value "' + value + '" must be > ' + min
    );
  }
  if (max !== void 0 && value > max) {
    throw new Error(
      type + ': invalid value "' + value + '" must be < ' + min
    );
  }
  return result;
}
function createTextType(fromNewline, toNewline) {
  let result = {
    matches: /.*/,
    fromICAL: /* @__PURE__ */ __name(function(aValue, structuredEscape) {
      return replaceNewline(aValue, fromNewline, structuredEscape);
    }, "fromICAL"),
    toICAL: /* @__PURE__ */ __name(function(aValue, structuredEscape) {
      let regEx = toNewline;
      if (structuredEscape)
        regEx = new RegExp(regEx.source + "|" + structuredEscape, regEx.flags);
      return aValue.replace(regEx, function(str) {
        switch (str) {
          case "\\":
            return "\\\\";
          case ";":
            return "\\;";
          case ",":
            return "\\,";
          case "\n":
            return "\\n";
          /* c8 ignore next 2 */
          default:
            return str;
        }
      });
    }, "toICAL")
  };
  return result;
}
function replaceNewlineReplace(string) {
  switch (string) {
    case "\\\\":
      return "\\";
    case "\\;":
      return ";";
    case "\\,":
      return ",";
    case "\\n":
    case "\\N":
      return "\n";
    /* c8 ignore next 2 */
    default:
      return string;
  }
}
function replaceNewline(value, newline, structuredEscape) {
  if (value.indexOf("\\") === -1) {
    return value;
  }
  if (structuredEscape)
    newline = new RegExp(newline.source + "|\\\\" + structuredEscape, newline.flags);
  return value.replace(newline, replaceNewlineReplace);
}
function stringify(jCal) {
  if (typeof jCal[0] == "string") {
    jCal = [jCal];
  }
  let i = 0;
  let len = jCal.length;
  let result = "";
  for (; i < len; i++) {
    result += stringify.component(jCal[i]) + LINE_ENDING;
  }
  return result;
}
function compareRangeException(a, b) {
  if (a[0] > b[0]) return 1;
  if (b[0] > a[0]) return -1;
  return 0;
}
var Binary, DURATION_LETTERS, DATA_PROPS_TO_COPY, Duration, Period, Time, CHAR, VALUE_DELIMITER, PARAM_DELIMITER, PARAM_NAME_DELIMITER, DEFAULT_VALUE_TYPE$1, DEFAULT_PARAM_TYPE, RFC6868_REPLACE_MAP$1, ParserError, OPTIONS, Timezone, zones, TimezoneService, helpers, UtcOffset, VCardTime, RecurIterator, InvalidRecurrenceRuleError, VALID_DAY_NAMES, VALID_BYDAY_PART, DOW_MAP, REVERSE_DOW_MAP, ALLOWED_FREQ, Recur, optionDesign, partDesign, FROM_ICAL_NEWLINE, TO_ICAL_NEWLINE, FROM_VCARD_NEWLINE, TO_VCARD_NEWLINE, DEFAULT_TYPE_TEXT, DEFAULT_TYPE_TEXT_MULTI, DEFAULT_TYPE_TEXT_STRUCTURED, DEFAULT_TYPE_INTEGER, DEFAULT_TYPE_DATETIME_DATE, DEFAULT_TYPE_DATETIME, DEFAULT_TYPE_URI, DEFAULT_TYPE_UTCOFFSET, DEFAULT_TYPE_RECUR, DEFAULT_TYPE_DATE_ANDOR_TIME, commonProperties, commonValues, icalParams, icalValues, icalProperties, vcardValues, vcardParams, vcardProperties, vcard3Values, vcard3Params, vcard3Properties, icalSet, vcardSet, vcard3Set, design, LINE_ENDING, DEFAULT_VALUE_TYPE, RFC6868_REPLACE_MAP, NAME_INDEX$1, PROP_INDEX, TYPE_INDEX, VALUE_INDEX, Property, NAME_INDEX, PROPERTY_INDEX, COMPONENT_INDEX, PROPERTY_NAME_INDEX, PROPERTY_VALUE_INDEX, Component, RecurExpansion, Event, ComponentParser, ICALmodule;
var init_ical = __esm({
  "node_modules/ical.js/dist/ical.js"() {
    init_modules_watch_stub();
    Binary = class _Binary {
      static {
        __name(this, "Binary");
      }
      /**
       * Creates a binary value from the given string.
       *
       * @param {String} aString        The binary value string
       * @return {Binary}               The binary value instance
       */
      static fromString(aString) {
        return new _Binary(aString);
      }
      /**
       * Creates a new ICAL.Binary instance
       *
       * @param {String} aValue     The binary data for this value
       */
      constructor(aValue) {
        this.value = aValue;
      }
      /**
       * The type name, to be used in the jCal object.
       * @default "binary"
       * @constant
       */
      icaltype = "binary";
      /**
       * Base64 decode the current value
       *
       * @return {String}         The base64-decoded value
       */
      decodeValue() {
        return this._b64_decode(this.value);
      }
      /**
       * Encodes the passed parameter with base64 and sets the internal
       * value to the result.
       *
       * @param {String} aValue      The raw binary value to encode
       */
      setEncodedValue(aValue) {
        this.value = this._b64_encode(aValue);
      }
      _b64_encode(data) {
        let b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        let o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, enc = "", tmp_arr = [];
        if (!data) {
          return data;
        }
        do {
          o1 = data.charCodeAt(i++);
          o2 = data.charCodeAt(i++);
          o3 = data.charCodeAt(i++);
          bits = o1 << 16 | o2 << 8 | o3;
          h1 = bits >> 18 & 63;
          h2 = bits >> 12 & 63;
          h3 = bits >> 6 & 63;
          h4 = bits & 63;
          tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
        } while (i < data.length);
        enc = tmp_arr.join("");
        let r = data.length % 3;
        return (r ? enc.slice(0, r - 3) : enc) + "===".slice(r || 3);
      }
      _b64_decode(data) {
        let b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        let o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, dec = "", tmp_arr = [];
        if (!data) {
          return data;
        }
        data += "";
        do {
          h1 = b64.indexOf(data.charAt(i++));
          h2 = b64.indexOf(data.charAt(i++));
          h3 = b64.indexOf(data.charAt(i++));
          h4 = b64.indexOf(data.charAt(i++));
          bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;
          o1 = bits >> 16 & 255;
          o2 = bits >> 8 & 255;
          o3 = bits & 255;
          if (h3 == 64) {
            tmp_arr[ac++] = String.fromCharCode(o1);
          } else if (h4 == 64) {
            tmp_arr[ac++] = String.fromCharCode(o1, o2);
          } else {
            tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
          }
        } while (i < data.length);
        dec = tmp_arr.join("");
        return dec;
      }
      /**
       * The string representation of this value
       * @return {String}
       */
      toString() {
        return this.value;
      }
    };
    DURATION_LETTERS = /([PDWHMTS]{1,1})/;
    DATA_PROPS_TO_COPY = ["weeks", "days", "hours", "minutes", "seconds", "isNegative"];
    Duration = class _Duration {
      static {
        __name(this, "Duration");
      }
      /**
       * Returns a new ICAL.Duration instance from the passed seconds value.
       *
       * @param {Number} aSeconds       The seconds to create the instance from
       * @return {Duration}             The newly created duration instance
       */
      static fromSeconds(aSeconds) {
        return new _Duration().fromSeconds(aSeconds);
      }
      /**
       * Checks if the given string is an iCalendar duration value.
       *
       * @param {String} value      The raw ical value
       * @return {Boolean}          True, if the given value is of the
       *                              duration ical type
       */
      static isValueString(string) {
        return string[0] === "P" || string[1] === "P";
      }
      /**
       * Creates a new {@link ICAL.Duration} instance from the passed string.
       *
       * @param {String} aStr       The string to parse
       * @return {Duration}         The created duration instance
       */
      static fromString(aStr) {
        let pos = 0;
        let dict = /* @__PURE__ */ Object.create(null);
        let chunks = 0;
        while ((pos = aStr.search(DURATION_LETTERS)) !== -1) {
          let type = aStr[pos];
          let numeric = aStr.slice(0, Math.max(0, pos));
          aStr = aStr.slice(pos + 1);
          chunks += parseDurationChunk(type, numeric, dict);
        }
        if (chunks < 2) {
          throw new Error(
            'invalid duration value: Not enough duration components in "' + aStr + '"'
          );
        }
        return new _Duration(dict);
      }
      /**
       * Creates a new ICAL.Duration instance from the given data object.
       *
       * @param {Object} aData                An object with members of the duration
       * @param {Number=} aData.weeks         Duration in weeks
       * @param {Number=} aData.days          Duration in days
       * @param {Number=} aData.hours         Duration in hours
       * @param {Number=} aData.minutes       Duration in minutes
       * @param {Number=} aData.seconds       Duration in seconds
       * @param {Boolean=} aData.isNegative   If true, the duration is negative
       * @return {Duration}                   The createad duration instance
       */
      static fromData(aData) {
        return new _Duration(aData);
      }
      /**
       * Creates a new ICAL.Duration instance.
       *
       * @param {Object} data                 An object with members of the duration
       * @param {Number=} data.weeks          Duration in weeks
       * @param {Number=} data.days           Duration in days
       * @param {Number=} data.hours          Duration in hours
       * @param {Number=} data.minutes        Duration in minutes
       * @param {Number=} data.seconds        Duration in seconds
       * @param {Boolean=} data.isNegative    If true, the duration is negative
       */
      constructor(data) {
        this.wrappedJSObject = this;
        this.fromData(data);
      }
      /**
       * The weeks in this duration
       * @type {Number}
       * @default 0
       */
      weeks = 0;
      /**
       * The days in this duration
       * @type {Number}
       * @default 0
       */
      days = 0;
      /**
       * The days in this duration
       * @type {Number}
       * @default 0
       */
      hours = 0;
      /**
       * The minutes in this duration
       * @type {Number}
       * @default 0
       */
      minutes = 0;
      /**
       * The seconds in this duration
       * @type {Number}
       * @default 0
       */
      seconds = 0;
      /**
       * The seconds in this duration
       * @type {Boolean}
       * @default false
       */
      isNegative = false;
      /**
       * The class identifier.
       * @constant
       * @type {String}
       * @default "icalduration"
       */
      icalclass = "icalduration";
      /**
       * The type name, to be used in the jCal object.
       * @constant
       * @type {String}
       * @default "duration"
       */
      icaltype = "duration";
      /**
       * Returns a clone of the duration object.
       *
       * @return {Duration}      The cloned object
       */
      clone() {
        return _Duration.fromData(this);
      }
      /**
       * The duration value expressed as a number of seconds.
       *
       * @return {Number}             The duration value in seconds
       */
      toSeconds() {
        let seconds = this.seconds + 60 * this.minutes + 3600 * this.hours + 86400 * this.days + 7 * 86400 * this.weeks;
        return this.isNegative ? -seconds : seconds;
      }
      /**
       * Reads the passed seconds value into this duration object. Afterwards,
       * members like {@link ICAL.Duration#days days} and {@link ICAL.Duration#weeks weeks} will be set up
       * accordingly.
       *
       * @param {Number} aSeconds     The duration value in seconds
       * @return {Duration}           Returns this instance
       */
      fromSeconds(aSeconds) {
        let secs = Math.abs(aSeconds);
        this.isNegative = aSeconds < 0;
        this.days = trunc(secs / 86400);
        if (this.days % 7 == 0) {
          this.weeks = this.days / 7;
          this.days = 0;
        } else {
          this.weeks = 0;
        }
        secs -= (this.days + 7 * this.weeks) * 86400;
        this.hours = trunc(secs / 3600);
        secs -= this.hours * 3600;
        this.minutes = trunc(secs / 60);
        secs -= this.minutes * 60;
        this.seconds = secs;
        return this;
      }
      /**
       * Sets up the current instance using members from the passed data object.
       *
       * @param {Object} aData                An object with members of the duration
       * @param {Number=} aData.weeks         Duration in weeks
       * @param {Number=} aData.days          Duration in days
       * @param {Number=} aData.hours         Duration in hours
       * @param {Number=} aData.minutes       Duration in minutes
       * @param {Number=} aData.seconds       Duration in seconds
       * @param {Boolean=} aData.isNegative   If true, the duration is negative
       */
      fromData(aData) {
        for (let prop of DATA_PROPS_TO_COPY) {
          if (aData && prop in aData) {
            this[prop] = aData[prop];
          } else {
            this[prop] = 0;
          }
        }
      }
      /**
       * Resets the duration instance to the default values, i.e. PT0S
       */
      reset() {
        this.isNegative = false;
        this.weeks = 0;
        this.days = 0;
        this.hours = 0;
        this.minutes = 0;
        this.seconds = 0;
      }
      /**
       * Compares the duration instance with another one.
       *
       * @param {Duration} aOther             The instance to compare with
       * @return {Number}                     -1, 0 or 1 for less/equal/greater
       */
      compare(aOther) {
        let thisSeconds = this.toSeconds();
        let otherSeconds = aOther.toSeconds();
        return (thisSeconds > otherSeconds) - (thisSeconds < otherSeconds);
      }
      /**
       * Normalizes the duration instance. For example, a duration with a value
       * of 61 seconds will be normalized to 1 minute and 1 second.
       */
      normalize() {
        this.fromSeconds(this.toSeconds());
      }
      /**
       * The string representation of this duration.
       * @return {String}
       */
      toString() {
        if (this.toSeconds() == 0) {
          return "PT0S";
        } else {
          let str = "";
          if (this.isNegative) str += "-";
          str += "P";
          let hasWeeks = false;
          if (this.weeks) {
            if (this.days || this.hours || this.minutes || this.seconds) {
              str += this.weeks * 7 + this.days + "D";
            } else {
              str += this.weeks + "W";
              hasWeeks = true;
            }
          } else if (this.days) {
            str += this.days + "D";
          }
          if (!hasWeeks) {
            if (this.hours || this.minutes || this.seconds) {
              str += "T";
              if (this.hours) {
                str += this.hours + "H";
              }
              if (this.minutes) {
                str += this.minutes + "M";
              }
              if (this.seconds) {
                str += this.seconds + "S";
              }
            }
          }
          return str;
        }
      }
      /**
       * The iCalendar string representation of this duration.
       * @return {String}
       */
      toICALString() {
        return this.toString();
      }
    };
    __name(parseDurationChunk, "parseDurationChunk");
    Period = class _Period {
      static {
        __name(this, "Period");
      }
      /**
       * Creates a new {@link ICAL.Period} instance from the passed string.
       *
       * @param {String} str            The string to parse
       * @param {Property} prop         The property this period will be on
       * @return {Period}               The created period instance
       */
      static fromString(str, prop) {
        let parts = str.split("/");
        if (parts.length !== 2) {
          throw new Error(
            'Invalid string value: "' + str + '" must contain a "/" char.'
          );
        }
        let options = {
          start: Time.fromDateTimeString(parts[0], prop)
        };
        let end = parts[1];
        if (Duration.isValueString(end)) {
          options.duration = Duration.fromString(end);
        } else {
          options.end = Time.fromDateTimeString(end, prop);
        }
        return new _Period(options);
      }
      /**
       * Creates a new {@link ICAL.Period} instance from the given data object.
       * The passed data object cannot contain both and end date and a duration.
       *
       * @param {Object} aData                  An object with members of the period
       * @param {Time=} aData.start             The start of the period
       * @param {Time=} aData.end               The end of the period
       * @param {Duration=} aData.duration      The duration of the period
       * @return {Period}                       The period instance
       */
      static fromData(aData) {
        return new _Period(aData);
      }
      /**
       * Returns a new period instance from the given jCal data array. The first
       * member is always the start date string, the second member is either a
       * duration or end date string.
       *
       * @param {jCalComponent} aData           The jCal data array
       * @param {Property} aProp                The property this jCal data is on
       * @param {Boolean} aLenient              If true, data value can be both date and date-time
       * @return {Period}                       The period instance
       */
      static fromJSON(aData, aProp, aLenient) {
        function fromDateOrDateTimeString(aValue, dateProp) {
          if (aLenient) {
            return Time.fromString(aValue, dateProp);
          } else {
            return Time.fromDateTimeString(aValue, dateProp);
          }
        }
        __name(fromDateOrDateTimeString, "fromDateOrDateTimeString");
        if (Duration.isValueString(aData[1])) {
          return _Period.fromData({
            start: fromDateOrDateTimeString(aData[0], aProp),
            duration: Duration.fromString(aData[1])
          });
        } else {
          return _Period.fromData({
            start: fromDateOrDateTimeString(aData[0], aProp),
            end: fromDateOrDateTimeString(aData[1], aProp)
          });
        }
      }
      /**
       * Creates a new ICAL.Period instance. The passed data object cannot contain both and end date and
       * a duration.
       *
       * @param {Object} aData                  An object with members of the period
       * @param {Time=} aData.start             The start of the period
       * @param {Time=} aData.end               The end of the period
       * @param {Duration=} aData.duration      The duration of the period
       */
      constructor(aData) {
        this.wrappedJSObject = this;
        if (aData && "start" in aData) {
          if (aData.start && !(aData.start instanceof Time)) {
            throw new TypeError(".start must be an instance of ICAL.Time");
          }
          this.start = aData.start;
        }
        if (aData && aData.end && aData.duration) {
          throw new Error("cannot accept both end and duration");
        }
        if (aData && "end" in aData) {
          if (aData.end && !(aData.end instanceof Time)) {
            throw new TypeError(".end must be an instance of ICAL.Time");
          }
          this.end = aData.end;
        }
        if (aData && "duration" in aData) {
          if (aData.duration && !(aData.duration instanceof Duration)) {
            throw new TypeError(".duration must be an instance of ICAL.Duration");
          }
          this.duration = aData.duration;
        }
      }
      /**
       * The start of the period
       * @type {Time}
       */
      start = null;
      /**
       * The end of the period
       * @type {Time}
       */
      end = null;
      /**
       * The duration of the period
       * @type {Duration}
       */
      duration = null;
      /**
       * The class identifier.
       * @constant
       * @type {String}
       * @default "icalperiod"
       */
      icalclass = "icalperiod";
      /**
       * The type name, to be used in the jCal object.
       * @constant
       * @type {String}
       * @default "period"
       */
      icaltype = "period";
      /**
       * Returns a clone of the duration object.
       *
       * @return {Period}      The cloned object
       */
      clone() {
        return _Period.fromData({
          start: this.start ? this.start.clone() : null,
          end: this.end ? this.end.clone() : null,
          duration: this.duration ? this.duration.clone() : null
        });
      }
      /**
       * Calculates the duration of the period, either directly or by subtracting
       * start from end date.
       *
       * @return {Duration}      The calculated duration
       */
      getDuration() {
        if (this.duration) {
          return this.duration;
        } else {
          return this.end.subtractDate(this.start);
        }
      }
      /**
       * Calculates the end date of the period, either directly or by adding
       * duration to start date.
       *
       * @return {Time}          The calculated end date
       */
      getEnd() {
        if (this.end) {
          return this.end;
        } else {
          let end = this.start.clone();
          end.addDuration(this.duration);
          return end;
        }
      }
      /**
       * Compare this period with a date or other period. To maintain the logic where a.compare(b)
       * returns 1 when a > b, this function will return 1 when the period is after the date, 0 when the
       * date is within the period, and -1 when the period is before the date. When comparing two
       * periods, as soon as they overlap in any way this will return 0.
       *
       * @param {Time|Period} dt    The date or other period to compare with
       */
      compare(dt) {
        if (dt.compare(this.start) < 0) {
          return 1;
        } else if (dt.compare(this.getEnd()) > 0) {
          return -1;
        } else {
          return 0;
        }
      }
      /**
       * The string representation of this period.
       * @return {String}
       */
      toString() {
        return this.start + "/" + (this.end || this.duration);
      }
      /**
       * The jCal representation of this period type.
       * @return {Object}
       */
      toJSON() {
        return [this.start.toString(), (this.end || this.duration).toString()];
      }
      /**
       * The iCalendar string representation of this period.
       * @return {String}
       */
      toICALString() {
        return this.start.toICALString() + "/" + (this.end || this.duration).toICALString();
      }
    };
    Time = class _Time {
      static {
        __name(this, "Time");
      }
      static _dowCache = {};
      static _wnCache = {};
      /**
       * Returns the days in the given month
       *
       * @param {Number} month      The month to check
       * @param {Number} year       The year to check
       * @return {Number}           The number of days in the month
       */
      static daysInMonth(month, year2) {
        let _daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        let days = 30;
        if (month < 1 || month > 12) return days;
        days = _daysInMonth[month];
        if (month == 2) {
          days += _Time.isLeapYear(year2);
        }
        return days;
      }
      /**
       * Checks if the year is a leap year
       *
       * @param {Number} year       The year to check
       * @return {Boolean}          True, if the year is a leap year
       */
      static isLeapYear(year2) {
        if (year2 <= 1752) {
          return year2 % 4 == 0;
        } else {
          return year2 % 4 == 0 && year2 % 100 != 0 || year2 % 400 == 0;
        }
      }
      /**
       * Create a new ICAL.Time from the day of year and year. The date is returned
       * in floating timezone.
       *
       * @param {Number} aDayOfYear     The day of year
       * @param {Number} aYear          The year to create the instance in
       * @return {Time}                 The created instance with the calculated date
       */
      static fromDayOfYear(aDayOfYear, aYear) {
        let year2 = aYear;
        let doy = aDayOfYear;
        let tt = new _Time();
        tt.auto_normalize = false;
        let is_leap = _Time.isLeapYear(year2) ? 1 : 0;
        if (doy < 1) {
          year2--;
          is_leap = _Time.isLeapYear(year2) ? 1 : 0;
          doy += _Time.daysInYearPassedMonth[is_leap][12];
          return _Time.fromDayOfYear(doy, year2);
        } else if (doy > _Time.daysInYearPassedMonth[is_leap][12]) {
          is_leap = _Time.isLeapYear(year2) ? 1 : 0;
          doy -= _Time.daysInYearPassedMonth[is_leap][12];
          year2++;
          return _Time.fromDayOfYear(doy, year2);
        }
        tt.year = year2;
        tt.isDate = true;
        for (let month = 11; month >= 0; month--) {
          if (doy > _Time.daysInYearPassedMonth[is_leap][month]) {
            tt.month = month + 1;
            tt.day = doy - _Time.daysInYearPassedMonth[is_leap][month];
            break;
          }
        }
        tt.auto_normalize = true;
        return tt;
      }
      /**
       * Returns a new ICAL.Time instance from a date string, e.g 2015-01-02.
       *
       * @deprecated                Use {@link ICAL.Time.fromDateString} instead
       * @param {String} str        The string to create from
       * @return {Time}             The date/time instance
       */
      static fromStringv2(str) {
        return new _Time({
          year: parseInt(str.slice(0, 4), 10),
          month: parseInt(str.slice(5, 7), 10),
          day: parseInt(str.slice(8, 10), 10),
          isDate: true
        });
      }
      /**
       * Returns a new ICAL.Time instance from a date string, e.g 2015-01-02.
       *
       * @param {String} aValue     The string to create from
       * @return {Time}             The date/time instance
       */
      static fromDateString(aValue) {
        return new _Time({
          year: strictParseInt(aValue.slice(0, 4)),
          month: strictParseInt(aValue.slice(5, 7)),
          day: strictParseInt(aValue.slice(8, 10)),
          isDate: true
        });
      }
      /**
       * Returns a new ICAL.Time instance from a date-time string, e.g
       * 2015-01-02T03:04:05. If a property is specified, the timezone is set up
       * from the property's TZID parameter.
       *
       * @param {String} aValue         The string to create from
       * @param {Property=} prop        The property the date belongs to
       * @return {Time}                 The date/time instance
       */
      static fromDateTimeString(aValue, prop) {
        if (aValue.length < 19) {
          throw new Error(
            'invalid date-time value: "' + aValue + '"'
          );
        }
        let zone;
        let zoneId;
        if (aValue.slice(-1) === "Z") {
          zone = Timezone.utcTimezone;
        } else if (prop) {
          zoneId = prop.getParameter("tzid");
          if (prop.parent) {
            if (prop.parent.name === "standard" || prop.parent.name === "daylight") {
              zone = Timezone.localTimezone;
            } else if (zoneId) {
              zone = prop.parent.getTimeZoneByID(zoneId);
            }
          }
        }
        const timeData = {
          year: strictParseInt(aValue.slice(0, 4)),
          month: strictParseInt(aValue.slice(5, 7)),
          day: strictParseInt(aValue.slice(8, 10)),
          hour: strictParseInt(aValue.slice(11, 13)),
          minute: strictParseInt(aValue.slice(14, 16)),
          second: strictParseInt(aValue.slice(17, 19))
        };
        if (zoneId && !zone) {
          timeData.timezone = zoneId;
        }
        return new _Time(timeData, zone);
      }
      /**
       * Returns a new ICAL.Time instance from a date or date-time string,
       *
       * @param {String} aValue         The string to create from
       * @param {Property=} prop        The property the date belongs to
       * @return {Time}                 The date/time instance
       */
      static fromString(aValue, aProperty) {
        if (aValue.length > 10) {
          return _Time.fromDateTimeString(aValue, aProperty);
        } else {
          return _Time.fromDateString(aValue);
        }
      }
      /**
       * Creates a new ICAL.Time instance from the given Javascript Date.
       *
       * @param {?Date} aDate             The Javascript Date to read, or null to reset
       * @param {Boolean} [useUTC=false]  If true, the UTC values of the date will be used
       */
      static fromJSDate(aDate, useUTC) {
        let tt = new _Time();
        return tt.fromJSDate(aDate, useUTC);
      }
      /**
       * Creates a new ICAL.Time instance from the the passed data object.
       *
       * @param {timeInit} aData          Time initialization
       * @param {Timezone=} aZone         Timezone this position occurs in
       */
      static fromData = /* @__PURE__ */ __name(function fromData(aData, aZone) {
        let t = new _Time();
        return t.fromData(aData, aZone);
      }, "fromData");
      /**
       * Creates a new ICAL.Time instance from the current moment.
       * The instance is “floating” - has no timezone relation.
       * To create an instance considering the time zone, call
       * ICAL.Time.fromJSDate(new Date(), true)
       * @return {Time}
       */
      static now() {
        return _Time.fromJSDate(/* @__PURE__ */ new Date(), false);
      }
      /**
       * Returns the date on which ISO week number 1 starts.
       *
       * @see Time#weekNumber
       * @param {Number} aYear                  The year to search in
       * @param {weekDay=} aWeekStart           The week start weekday, used for calculation.
       * @return {Time}                         The date on which week number 1 starts
       */
      static weekOneStarts(aYear, aWeekStart) {
        let t = _Time.fromData({
          year: aYear,
          month: 1,
          day: 1,
          isDate: true
        });
        let dow = t.dayOfWeek();
        let wkst = aWeekStart || _Time.DEFAULT_WEEK_START;
        if (dow > _Time.THURSDAY) {
          t.day += 7;
        }
        if (wkst > _Time.THURSDAY) {
          t.day -= 7;
        }
        t.day -= dow - wkst;
        return t;
      }
      /**
       * Get the dominical letter for the given year. Letters range from A - G for
       * common years, and AG to GF for leap years.
       *
       * @param {Number} yr           The year to retrieve the letter for
       * @return {String}             The dominical letter.
       */
      static getDominicalLetter(yr) {
        let LTRS = "GFEDCBA";
        let dom = (yr + (yr / 4 | 0) + (yr / 400 | 0) - (yr / 100 | 0) - 1) % 7;
        let isLeap = _Time.isLeapYear(yr);
        if (isLeap) {
          return LTRS[(dom + 6) % 7] + LTRS[dom];
        } else {
          return LTRS[dom];
        }
      }
      static #epochTime = null;
      /**
       * January 1st, 1970 as an ICAL.Time.
       * @type {Time}
       * @constant
       * @instance
       */
      static get epochTime() {
        if (!this.#epochTime) {
          this.#epochTime = _Time.fromData({
            year: 1970,
            month: 1,
            day: 1,
            hour: 0,
            minute: 0,
            second: 0,
            isDate: false,
            timezone: "Z"
          });
        }
        return this.#epochTime;
      }
      static _cmp_attr(a, b, attr) {
        if (a[attr] > b[attr]) return 1;
        if (a[attr] < b[attr]) return -1;
        return 0;
      }
      /**
       * The days that have passed in the year after a given month. The array has
       * two members, one being an array of passed days for non-leap years, the
       * other analog for leap years.
       * @example
       * var isLeapYear = ICAL.Time.isLeapYear(year);
       * var passedDays = ICAL.Time.daysInYearPassedMonth[isLeapYear][month];
       * @type {Array.<Array.<Number>>}
       */
      static daysInYearPassedMonth = [
        [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365],
        [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335, 366]
      ];
      static SUNDAY = 1;
      static MONDAY = 2;
      static TUESDAY = 3;
      static WEDNESDAY = 4;
      static THURSDAY = 5;
      static FRIDAY = 6;
      static SATURDAY = 7;
      /**
       * The default weekday for the WKST part.
       * @constant
       * @default ICAL.Time.MONDAY
       */
      static DEFAULT_WEEK_START = 2;
      // MONDAY
      /**
       * Creates a new ICAL.Time instance.
       *
       * @param {timeInit} data           Time initialization
       * @param {Timezone} zone           timezone this position occurs in
       */
      constructor(data, zone) {
        this.wrappedJSObject = this;
        this._time = /* @__PURE__ */ Object.create(null);
        this._time.year = 0;
        this._time.month = 1;
        this._time.day = 1;
        this._time.hour = 0;
        this._time.minute = 0;
        this._time.second = 0;
        this._time.isDate = false;
        this.fromData(data, zone);
      }
      /**
       * The class identifier.
       * @constant
       * @type {String}
       * @default "icaltime"
       */
      icalclass = "icaltime";
      _cachedUnixTime = null;
      /**
       * The type name, to be used in the jCal object. This value may change and
       * is strictly defined by the {@link ICAL.Time#isDate isDate} member.
       * @type {String}
       * @default "date-time"
       */
      get icaltype() {
        return this.isDate ? "date" : "date-time";
      }
      /**
       * The timezone for this time.
       * @type {Timezone}
       */
      zone = null;
      /**
       * Internal uses to indicate that a change has been made and the next read
       * operation must attempt to normalize the value (for example changing the
       * day to 33).
       *
       * @type {Boolean}
       * @private
       */
      _pendingNormalization = false;
      /**
       * The year of this date.
       * @type {Number}
       */
      get year() {
        return this._getTimeAttr("year");
      }
      set year(val) {
        this._setTimeAttr("year", val);
      }
      /**
       * The month of this date.
       * @type {Number}
       */
      get month() {
        return this._getTimeAttr("month");
      }
      set month(val) {
        this._setTimeAttr("month", val);
      }
      /**
       * The day of this date.
       * @type {Number}
       */
      get day() {
        return this._getTimeAttr("day");
      }
      set day(val) {
        this._setTimeAttr("day", val);
      }
      /**
       * The hour of this date-time.
       * @type {Number}
       */
      get hour() {
        return this._getTimeAttr("hour");
      }
      set hour(val) {
        this._setTimeAttr("hour", val);
      }
      /**
       * The minute of this date-time.
       * @type {Number}
       */
      get minute() {
        return this._getTimeAttr("minute");
      }
      set minute(val) {
        this._setTimeAttr("minute", val);
      }
      /**
       * The second of this date-time.
       * @type {Number}
       */
      get second() {
        return this._getTimeAttr("second");
      }
      set second(val) {
        this._setTimeAttr("second", val);
      }
      /**
       * If true, the instance represents a date (as opposed to a date-time)
       * @type {Boolean}
       */
      get isDate() {
        return this._getTimeAttr("isDate");
      }
      set isDate(val) {
        this._setTimeAttr("isDate", val);
      }
      /**
       * @private
       * @param {String} attr             Attribute to get (one of: year, month,
       *                                  day, hour, minute, second, isDate)
       * @return {Number|Boolean}         Current value for the attribute
       */
      _getTimeAttr(attr) {
        if (this._pendingNormalization) {
          this._normalize();
          this._pendingNormalization = false;
        }
        return this._time[attr];
      }
      /**
       * @private
       * @param {String} attr             Attribute to set (one of: year, month,
       *                                  day, hour, minute, second, isDate)
       * @param {Number|Boolean} val      New value for the attribute
       */
      _setTimeAttr(attr, val) {
        if (attr === "isDate" && val && !this._time.isDate) {
          this.adjust(0, 0, 0, 0);
        }
        this._cachedUnixTime = null;
        this._pendingNormalization = true;
        this._time[attr] = val;
      }
      /**
       * Returns a clone of the time object.
       *
       * @return {Time}              The cloned object
       */
      clone() {
        return new _Time(this._time, this.zone);
      }
      /**
       * Reset the time instance to epoch time
       */
      reset() {
        this.fromData(_Time.epochTime);
        this.zone = Timezone.utcTimezone;
      }
      /**
       * Reset the time instance to the given date/time values.
       *
       * @param {Number} year             The year to set
       * @param {Number} month            The month to set
       * @param {Number} day              The day to set
       * @param {Number} hour             The hour to set
       * @param {Number} minute           The minute to set
       * @param {Number} second           The second to set
       * @param {Timezone} timezone       The timezone to set
       */
      resetTo(year2, month, day2, hour2, minute2, second, timezone) {
        this.fromData({
          year: year2,
          month,
          day: day2,
          hour: hour2,
          minute: minute2,
          second,
          zone: timezone
        });
      }
      /**
       * Set up the current instance from the Javascript date value.
       *
       * @param {?Date} aDate             The Javascript Date to read, or null to reset
       * @param {Boolean} [useUTC=false]  If true, the UTC values of the date will be used
       */
      fromJSDate(aDate, useUTC) {
        if (!aDate) {
          this.reset();
        } else {
          if (useUTC) {
            this.zone = Timezone.utcTimezone;
            this.year = aDate.getUTCFullYear();
            this.month = aDate.getUTCMonth() + 1;
            this.day = aDate.getUTCDate();
            this.hour = aDate.getUTCHours();
            this.minute = aDate.getUTCMinutes();
            this.second = aDate.getUTCSeconds();
          } else {
            this.zone = Timezone.localTimezone;
            this.year = aDate.getFullYear();
            this.month = aDate.getMonth() + 1;
            this.day = aDate.getDate();
            this.hour = aDate.getHours();
            this.minute = aDate.getMinutes();
            this.second = aDate.getSeconds();
          }
        }
        this._cachedUnixTime = null;
        return this;
      }
      /**
       * Sets up the current instance using members from the passed data object.
       *
       * @param {timeInit} aData          Time initialization
       * @param {Timezone=} aZone         Timezone this position occurs in
       */
      fromData(aData, aZone) {
        if (aData) {
          for (let [key, value] of Object.entries(aData)) {
            if (key === "icaltype") continue;
            this[key] = value;
          }
        }
        if (aZone) {
          this.zone = aZone;
        }
        if (aData && !("isDate" in aData)) {
          this.isDate = !("hour" in aData);
        } else if (aData && "isDate" in aData) {
          this.isDate = aData.isDate;
        }
        if (aData && "timezone" in aData) {
          let zone = TimezoneService.get(
            aData.timezone
          );
          this.zone = zone || Timezone.localTimezone;
        }
        if (aData && "zone" in aData) {
          this.zone = aData.zone;
        }
        if (!this.zone) {
          this.zone = Timezone.localTimezone;
        }
        this._cachedUnixTime = null;
        return this;
      }
      /**
       * Calculate the day of week.
       * @param {weekDay=} aWeekStart
       *        The week start weekday, defaults to SUNDAY
       * @return {weekDay}
       */
      dayOfWeek(aWeekStart) {
        let firstDow = aWeekStart || _Time.SUNDAY;
        let dowCacheKey = (this.year << 12) + (this.month << 8) + (this.day << 3) + firstDow;
        if (dowCacheKey in _Time._dowCache) {
          return _Time._dowCache[dowCacheKey];
        }
        let q = this.day;
        let m = this.month + (this.month < 3 ? 12 : 0);
        let Y = this.year - (this.month < 3 ? 1 : 0);
        let h = q + Y + trunc((m + 1) * 26 / 10) + trunc(Y / 4);
        {
          h += trunc(Y / 100) * 6 + trunc(Y / 400);
        }
        h = (h + 7 - firstDow) % 7 + 1;
        _Time._dowCache[dowCacheKey] = h;
        return h;
      }
      /**
       * Calculate the day of year.
       * @return {Number}
       */
      dayOfYear() {
        let is_leap = _Time.isLeapYear(this.year) ? 1 : 0;
        let diypm = _Time.daysInYearPassedMonth;
        return diypm[is_leap][this.month - 1] + this.day;
      }
      /**
       * Returns a copy of the current date/time, rewound to the start of the
       * week. The resulting ICAL.Time instance is of icaltype date, even if this
       * is a date-time.
       *
       * @param {weekDay=} aWeekStart
       *        The week start weekday, defaults to SUNDAY
       * @return {Time}      The start of the week (cloned)
       */
      startOfWeek(aWeekStart) {
        let firstDow = aWeekStart || _Time.SUNDAY;
        let result = this.clone();
        result.day -= (this.dayOfWeek() + 7 - firstDow) % 7;
        result.isDate = true;
        result.hour = 0;
        result.minute = 0;
        result.second = 0;
        return result;
      }
      /**
       * Returns a copy of the current date/time, shifted to the end of the week.
       * The resulting ICAL.Time instance is of icaltype date, even if this is a
       * date-time.
       *
       * @param {weekDay=} aWeekStart
       *        The week start weekday, defaults to SUNDAY
       * @return {Time}      The end of the week (cloned)
       */
      endOfWeek(aWeekStart) {
        let firstDow = aWeekStart || _Time.SUNDAY;
        let result = this.clone();
        result.day += (7 - this.dayOfWeek() + firstDow - _Time.SUNDAY) % 7;
        result.isDate = true;
        result.hour = 0;
        result.minute = 0;
        result.second = 0;
        return result;
      }
      /**
       * Returns a copy of the current date/time, rewound to the start of the
       * month. The resulting ICAL.Time instance is of icaltype date, even if
       * this is a date-time.
       *
       * @return {Time}      The start of the month (cloned)
       */
      startOfMonth() {
        let result = this.clone();
        result.day = 1;
        result.isDate = true;
        result.hour = 0;
        result.minute = 0;
        result.second = 0;
        return result;
      }
      /**
       * Returns a copy of the current date/time, shifted to the end of the
       * month.  The resulting ICAL.Time instance is of icaltype date, even if
       * this is a date-time.
       *
       * @return {Time}      The end of the month (cloned)
       */
      endOfMonth() {
        let result = this.clone();
        result.day = _Time.daysInMonth(result.month, result.year);
        result.isDate = true;
        result.hour = 0;
        result.minute = 0;
        result.second = 0;
        return result;
      }
      /**
       * Returns a copy of the current date/time, rewound to the start of the
       * year. The resulting ICAL.Time instance is of icaltype date, even if
       * this is a date-time.
       *
       * @return {Time}      The start of the year (cloned)
       */
      startOfYear() {
        let result = this.clone();
        result.day = 1;
        result.month = 1;
        result.isDate = true;
        result.hour = 0;
        result.minute = 0;
        result.second = 0;
        return result;
      }
      /**
       * Returns a copy of the current date/time, shifted to the end of the
       * year.  The resulting ICAL.Time instance is of icaltype date, even if
       * this is a date-time.
       *
       * @return {Time}      The end of the year (cloned)
       */
      endOfYear() {
        let result = this.clone();
        result.day = 31;
        result.month = 12;
        result.isDate = true;
        result.hour = 0;
        result.minute = 0;
        result.second = 0;
        return result;
      }
      /**
       * First calculates the start of the week, then returns the day of year for
       * this date. If the day falls into the previous year, the day is zero or negative.
       *
       * @param {weekDay=} aFirstDayOfWeek
       *        The week start weekday, defaults to SUNDAY
       * @return {Number}     The calculated day of year
       */
      startDoyWeek(aFirstDayOfWeek) {
        let firstDow = aFirstDayOfWeek || _Time.SUNDAY;
        let delta = this.dayOfWeek() - firstDow;
        if (delta < 0) delta += 7;
        return this.dayOfYear() - delta;
      }
      /**
       * Get the dominical letter for the current year. Letters range from A - G
       * for common years, and AG to GF for leap years.
       *
       * @param {Number} yr           The year to retrieve the letter for
       * @return {String}             The dominical letter.
       */
      getDominicalLetter() {
        return _Time.getDominicalLetter(this.year);
      }
      /**
       * Finds the nthWeekDay relative to the current month (not day).  The
       * returned value is a day relative the month that this month belongs to so
       * 1 would indicate the first of the month and 40 would indicate a day in
       * the following month.
       *
       * @param {Number} aDayOfWeek   Day of the week see the day name constants
       * @param {Number} aPos         Nth occurrence of a given week day values
       *        of 1 and 0 both indicate the first weekday of that type. aPos may
       *        be either positive or negative
       *
       * @return {Number} numeric value indicating a day relative
       *                   to the current month of this time object
       */
      nthWeekDay(aDayOfWeek, aPos) {
        let daysInMonth = _Time.daysInMonth(this.month, this.year);
        let weekday;
        let pos = aPos;
        let start = 0;
        let otherDay = this.clone();
        if (pos >= 0) {
          otherDay.day = 1;
          if (pos != 0) {
            pos--;
          }
          start = otherDay.day;
          let startDow = otherDay.dayOfWeek();
          let offset = aDayOfWeek - startDow;
          if (offset < 0)
            offset += 7;
          start += offset;
          start -= aDayOfWeek;
          weekday = aDayOfWeek;
        } else {
          otherDay.day = daysInMonth;
          let endDow = otherDay.dayOfWeek();
          pos++;
          weekday = endDow - aDayOfWeek;
          if (weekday < 0) {
            weekday += 7;
          }
          weekday = daysInMonth - weekday;
        }
        weekday += pos * 7;
        return start + weekday;
      }
      /**
       * Checks if current time is the nth weekday, relative to the current
       * month.  Will always return false when rule resolves outside of current
       * month.
       *
       * @param {weekDay} aDayOfWeek                 Day of week to check
       * @param {Number} aPos                        Relative position
       * @return {Boolean}                           True, if it is the nth weekday
       */
      isNthWeekDay(aDayOfWeek, aPos) {
        let dow = this.dayOfWeek();
        if (aPos === 0 && dow === aDayOfWeek) {
          return true;
        }
        let day2 = this.nthWeekDay(aDayOfWeek, aPos);
        if (day2 === this.day) {
          return true;
        }
        return false;
      }
      /**
       * Calculates the ISO 8601 week number. The first week of a year is the
       * week that contains the first Thursday. The year can have 53 weeks, if
       * January 1st is a Friday.
       *
       * Note there are regions where the first week of the year is the one that
       * starts on January 1st, which may offset the week number. Also, if a
       * different week start is specified, this will also affect the week
       * number.
       *
       * @see Time.weekOneStarts
       * @param {weekDay} aWeekStart                  The weekday the week starts with
       * @return {Number}                             The ISO week number
       */
      weekNumber(aWeekStart) {
        let wnCacheKey = (this.year << 12) + (this.month << 8) + (this.day << 3) + aWeekStart;
        if (wnCacheKey in _Time._wnCache) {
          return _Time._wnCache[wnCacheKey];
        }
        let week1;
        let dt = this.clone();
        dt.isDate = true;
        let isoyear = this.year;
        if (dt.month == 12 && dt.day > 25) {
          week1 = _Time.weekOneStarts(isoyear + 1, aWeekStart);
          if (dt.compare(week1) < 0) {
            week1 = _Time.weekOneStarts(isoyear, aWeekStart);
          } else {
            isoyear++;
          }
        } else {
          week1 = _Time.weekOneStarts(isoyear, aWeekStart);
          if (dt.compare(week1) < 0) {
            week1 = _Time.weekOneStarts(--isoyear, aWeekStart);
          }
        }
        let daysBetween = dt.subtractDate(week1).toSeconds() / 86400;
        let answer = trunc(daysBetween / 7) + 1;
        _Time._wnCache[wnCacheKey] = answer;
        return answer;
      }
      /**
       * Adds the duration to the current time. The instance is modified in
       * place.
       *
       * @param {Duration} aDuration         The duration to add
       */
      addDuration(aDuration) {
        let mult = aDuration.isNegative ? -1 : 1;
        let second = this.second;
        let minute2 = this.minute;
        let hour2 = this.hour;
        let day2 = this.day;
        second += mult * aDuration.seconds;
        minute2 += mult * aDuration.minutes;
        hour2 += mult * aDuration.hours;
        day2 += mult * aDuration.days;
        day2 += mult * 7 * aDuration.weeks;
        this.second = second;
        this.minute = minute2;
        this.hour = hour2;
        this.day = day2;
        this._cachedUnixTime = null;
      }
      /**
       * Subtract the date details (_excluding_ timezone).  Useful for finding
       * the relative difference between two time objects excluding their
       * timezone differences.
       *
       * @param {Time} aDate     The date to subtract
       * @return {Duration}      The difference as a duration
       */
      subtractDate(aDate) {
        let unixTime = this.toUnixTime() + this.utcOffset();
        let other = aDate.toUnixTime() + aDate.utcOffset();
        return Duration.fromSeconds(unixTime - other);
      }
      /**
       * Subtract the date details, taking timezones into account.
       *
       * @param {Time} aDate  The date to subtract
       * @return {Duration}   The difference in duration
       */
      subtractDateTz(aDate) {
        let unixTime = this.toUnixTime();
        let other = aDate.toUnixTime();
        return Duration.fromSeconds(unixTime - other);
      }
      /**
       * Compares the ICAL.Time instance with another one, or a period.
       *
       * @param {Time|Period} aOther                  The instance to compare with
       * @return {Number}                             -1, 0 or 1 for less/equal/greater
       */
      compare(other) {
        if (other instanceof Period) {
          return -1 * other.compare(this);
        } else {
          let a = this.toUnixTime();
          let b = other.toUnixTime();
          if (a > b) return 1;
          if (b > a) return -1;
          return 0;
        }
      }
      /**
       * Compares only the date part of this instance with another one.
       *
       * @param {Time} other                  The instance to compare with
       * @param {Timezone} tz                 The timezone to compare in
       * @return {Number}                     -1, 0 or 1 for less/equal/greater
       */
      compareDateOnlyTz(other, tz) {
        let a = this.convertToZone(tz);
        let b = other.convertToZone(tz);
        let rc = 0;
        if ((rc = _Time._cmp_attr(a, b, "year")) != 0) return rc;
        if ((rc = _Time._cmp_attr(a, b, "month")) != 0) return rc;
        if ((rc = _Time._cmp_attr(a, b, "day")) != 0) return rc;
        return rc;
      }
      /**
       * Convert the instance into another timezone. The returned ICAL.Time
       * instance is always a copy.
       *
       * @param {Timezone} zone      The zone to convert to
       * @return {Time}              The copy, converted to the zone
       */
      convertToZone(zone) {
        let copy = this.clone();
        let zone_equals = this.zone.tzid == zone.tzid;
        if (!this.isDate && !zone_equals) {
          Timezone.convert_time(copy, this.zone, zone);
        }
        copy.zone = zone;
        return copy;
      }
      /**
       * Calculates the UTC offset of the current date/time in the timezone it is
       * in.
       *
       * @return {Number}     UTC offset in seconds
       */
      utcOffset() {
        if (this.zone == Timezone.localTimezone || this.zone == Timezone.utcTimezone) {
          return 0;
        } else {
          return this.zone.utcOffset(this);
        }
      }
      /**
       * Returns an RFC 5545 compliant ical representation of this object.
       *
       * @return {String} ical date/date-time
       */
      toICALString() {
        let string = this.toString();
        if (string.length > 10) {
          return design.icalendar.value["date-time"].toICAL(string);
        } else {
          return design.icalendar.value.date.toICAL(string);
        }
      }
      /**
       * The string representation of this date/time, in jCal form
       * (including : and - separators).
       * @return {String}
       */
      toString() {
        let result = this.year + "-" + pad2(this.month) + "-" + pad2(this.day);
        if (!this.isDate) {
          result += "T" + pad2(this.hour) + ":" + pad2(this.minute) + ":" + pad2(this.second);
          if (this.zone === Timezone.utcTimezone) {
            result += "Z";
          }
        }
        return result;
      }
      /**
       * Converts the current instance to a Javascript date
       * @return {Date}
       */
      toJSDate() {
        if (this.zone == Timezone.localTimezone) {
          if (this.isDate) {
            return new Date(this.year, this.month - 1, this.day);
          } else {
            return new Date(
              this.year,
              this.month - 1,
              this.day,
              this.hour,
              this.minute,
              this.second,
              0
            );
          }
        } else {
          return new Date(this.toUnixTime() * 1e3);
        }
      }
      _normalize() {
        if (this._time.isDate) {
          this._time.hour = 0;
          this._time.minute = 0;
          this._time.second = 0;
        }
        this.adjust(0, 0, 0, 0);
        return this;
      }
      /**
       * Adjust the date/time by the given offset
       *
       * @param {Number} aExtraDays       The extra amount of days
       * @param {Number} aExtraHours      The extra amount of hours
       * @param {Number} aExtraMinutes    The extra amount of minutes
       * @param {Number} aExtraSeconds    The extra amount of seconds
       * @param {Number=} aTime           The time to adjust, defaults to the
       *                                    current instance.
       */
      adjust(aExtraDays, aExtraHours, aExtraMinutes, aExtraSeconds, aTime) {
        let minutesOverflow, hoursOverflow, daysOverflow = 0, yearsOverflow = 0;
        let second, minute2, hour2, day2;
        let daysInMonth;
        let time = aTime || this._time;
        if (!time.isDate) {
          second = time.second + aExtraSeconds;
          time.second = second % 60;
          minutesOverflow = trunc(second / 60);
          if (time.second < 0) {
            time.second += 60;
            minutesOverflow--;
          }
          minute2 = time.minute + aExtraMinutes + minutesOverflow;
          time.minute = minute2 % 60;
          hoursOverflow = trunc(minute2 / 60);
          if (time.minute < 0) {
            time.minute += 60;
            hoursOverflow--;
          }
          hour2 = time.hour + aExtraHours + hoursOverflow;
          time.hour = hour2 % 24;
          daysOverflow = trunc(hour2 / 24);
          if (time.hour < 0) {
            time.hour += 24;
            daysOverflow--;
          }
        }
        if (time.month > 12) {
          yearsOverflow = trunc((time.month - 1) / 12);
        } else if (time.month < 1) {
          yearsOverflow = trunc(time.month / 12) - 1;
        }
        time.year += yearsOverflow;
        time.month -= 12 * yearsOverflow;
        day2 = time.day + aExtraDays + daysOverflow;
        if (day2 > 0) {
          for (; ; ) {
            daysInMonth = _Time.daysInMonth(time.month, time.year);
            if (day2 <= daysInMonth) {
              break;
            }
            time.month++;
            if (time.month > 12) {
              time.year++;
              time.month = 1;
            }
            day2 -= daysInMonth;
          }
        } else {
          while (day2 <= 0) {
            if (time.month == 1) {
              time.year--;
              time.month = 12;
            } else {
              time.month--;
            }
            day2 += _Time.daysInMonth(time.month, time.year);
          }
        }
        time.day = day2;
        this._cachedUnixTime = null;
        return this;
      }
      /**
       * Sets up the current instance from unix time, the number of seconds since
       * January 1st, 1970.
       *
       * @param {Number} seconds      The seconds to set up with
       */
      fromUnixTime(seconds) {
        this.zone = Timezone.utcTimezone;
        let date = new Date(seconds * 1e3);
        this.year = date.getUTCFullYear();
        this.month = date.getUTCMonth() + 1;
        this.day = date.getUTCDate();
        if (this._time.isDate) {
          this.hour = 0;
          this.minute = 0;
          this.second = 0;
        } else {
          this.hour = date.getUTCHours();
          this.minute = date.getUTCMinutes();
          this.second = date.getUTCSeconds();
        }
        this._cachedUnixTime = null;
      }
      /**
       * Converts the current instance to seconds since January 1st 1970.
       *
       * @return {Number}         Seconds since 1970
       */
      toUnixTime() {
        if (this._cachedUnixTime !== null) {
          return this._cachedUnixTime;
        }
        let offset = this.utcOffset();
        let ms = Date.UTC(
          this.year,
          this.month - 1,
          this.day,
          this.hour,
          this.minute,
          this.second - offset
        );
        this._cachedUnixTime = ms / 1e3;
        return this._cachedUnixTime;
      }
      /**
       * Converts time to into Object which can be serialized then re-created
       * using the constructor.
       *
       * @example
       * // toJSON will automatically be called
       * var json = JSON.stringify(mytime);
       *
       * var deserialized = JSON.parse(json);
       *
       * var time = new ICAL.Time(deserialized);
       *
       * @return {Object}
       */
      toJSON() {
        let copy = [
          "year",
          "month",
          "day",
          "hour",
          "minute",
          "second",
          "isDate"
        ];
        let result = /* @__PURE__ */ Object.create(null);
        let i = 0;
        let len = copy.length;
        let prop;
        for (; i < len; i++) {
          prop = copy[i];
          result[prop] = this[prop];
        }
        if (this.zone) {
          result.timezone = this.zone.tzid;
        }
        return result;
      }
    };
    CHAR = /[^ \t]/;
    VALUE_DELIMITER = ":";
    PARAM_DELIMITER = ";";
    PARAM_NAME_DELIMITER = "=";
    DEFAULT_VALUE_TYPE$1 = "unknown";
    DEFAULT_PARAM_TYPE = "text";
    RFC6868_REPLACE_MAP$1 = { "^'": '"', "^n": "\n", "^^": "^" };
    __name(parse2, "parse");
    parse2.property = function(str, designSet) {
      let state = {
        component: [[], []],
        designSet: designSet || design.defaultSet
      };
      parse2._handleContentLine(str, state);
      return state.component[1][0];
    };
    parse2.component = function(str) {
      return parse2(str);
    };
    ParserError = class extends Error {
      static {
        __name(this, "ParserError");
      }
      name = this.constructor.name;
    };
    parse2.ParserError = ParserError;
    parse2._handleContentLine = function(line, state) {
      let valuePos = line.indexOf(VALUE_DELIMITER);
      let paramPos = line.indexOf(PARAM_DELIMITER);
      let lastParamIndex;
      let lastValuePos;
      let name;
      let value;
      let params = {};
      if (paramPos !== -1 && valuePos !== -1) {
        if (paramPos > valuePos) {
          paramPos = -1;
        }
      }
      let parsedParams;
      if (paramPos !== -1) {
        name = line.slice(0, Math.max(0, paramPos)).toLowerCase();
        parsedParams = parse2._parseParameters(line.slice(Math.max(0, paramPos)), 0, state.designSet);
        if (parsedParams[2] == -1) {
          throw new ParserError("Invalid parameters in '" + line + "'");
        }
        params = parsedParams[0];
        let parsedParamLength;
        if (typeof parsedParams[1] === "string") {
          parsedParamLength = parsedParams[1].length;
        } else {
          parsedParamLength = parsedParams[1].reduce((accumulator, currentValue) => {
            return accumulator + currentValue.length;
          }, 0);
        }
        lastParamIndex = parsedParamLength + parsedParams[2] + paramPos;
        if ((lastValuePos = line.slice(Math.max(0, lastParamIndex)).indexOf(VALUE_DELIMITER)) !== -1) {
          value = line.slice(Math.max(0, lastParamIndex + lastValuePos + 1));
        } else {
          throw new ParserError("Missing parameter value in '" + line + "'");
        }
      } else if (valuePos !== -1) {
        name = line.slice(0, Math.max(0, valuePos)).toLowerCase();
        value = line.slice(Math.max(0, valuePos + 1));
        if (name === "begin") {
          let newComponent = [value.toLowerCase(), [], []];
          if (state.stack.length === 1) {
            state.component.push(newComponent);
          } else {
            state.component[2].push(newComponent);
          }
          state.stack.push(state.component);
          state.component = newComponent;
          if (!state.designSet) {
            state.designSet = design.getDesignSet(state.component[0]);
          }
          return;
        } else if (name === "end") {
          state.component = state.stack.pop();
          return;
        }
      } else {
        throw new ParserError(
          'invalid line (no token ";" or ":") "' + line + '"'
        );
      }
      let valueType;
      let multiValue = false;
      let structuredValue = false;
      let propertyDetails;
      let splitName;
      let ungroupedName;
      if (state.designSet.propertyGroups && name.indexOf(".") !== -1) {
        splitName = name.split(".");
        params.group = splitName[0];
        ungroupedName = splitName[1];
      } else {
        ungroupedName = name;
      }
      if (ungroupedName in state.designSet.property) {
        propertyDetails = state.designSet.property[ungroupedName];
        if ("multiValue" in propertyDetails) {
          multiValue = propertyDetails.multiValue;
        }
        if ("structuredValue" in propertyDetails) {
          structuredValue = propertyDetails.structuredValue;
        }
        if (value && "detectType" in propertyDetails) {
          valueType = propertyDetails.detectType(value);
        }
      }
      if (!valueType) {
        if (!("value" in params)) {
          if (propertyDetails) {
            valueType = propertyDetails.defaultType;
          } else {
            valueType = DEFAULT_VALUE_TYPE$1;
          }
        } else {
          valueType = params.value.toLowerCase();
        }
      }
      delete params.value;
      let result;
      if (multiValue && structuredValue) {
        value = parse2._parseMultiValue(value, structuredValue, valueType, [], multiValue, state.designSet, structuredValue);
        result = [ungroupedName, params, valueType, value];
      } else if (multiValue) {
        result = [ungroupedName, params, valueType];
        parse2._parseMultiValue(value, multiValue, valueType, result, null, state.designSet, false);
      } else if (structuredValue) {
        value = parse2._parseMultiValue(value, structuredValue, valueType, [], null, state.designSet, structuredValue);
        result = [ungroupedName, params, valueType, value];
      } else {
        value = parse2._parseValue(value, valueType, state.designSet, false);
        result = [ungroupedName, params, valueType, value];
      }
      if (state.component[0] === "vcard" && state.component[1].length === 0 && !(name === "version" && value === "4.0")) {
        state.designSet = design.getDesignSet("vcard3");
      }
      state.component[1].push(result);
    };
    parse2._parseValue = function(value, type, designSet, structuredValue) {
      if (type in designSet.value && "fromICAL" in designSet.value[type]) {
        return designSet.value[type].fromICAL(value, structuredValue);
      }
      return value;
    };
    parse2._parseParameters = function(line, start, designSet) {
      let lastParam = start;
      let pos = 0;
      let delim = PARAM_NAME_DELIMITER;
      let result = {};
      let name, lcname;
      let value, valuePos = -1;
      let type, multiValue, mvdelim;
      while (pos !== false && (pos = line.indexOf(delim, pos + 1)) !== -1) {
        name = line.slice(lastParam + 1, pos);
        if (name.length == 0) {
          throw new ParserError("Empty parameter name in '" + line + "'");
        }
        lcname = name.toLowerCase();
        mvdelim = false;
        multiValue = false;
        if (lcname in designSet.param && designSet.param[lcname].valueType) {
          type = designSet.param[lcname].valueType;
        } else {
          type = DEFAULT_PARAM_TYPE;
        }
        if (lcname in designSet.param) {
          multiValue = designSet.param[lcname].multiValue;
          if (designSet.param[lcname].multiValueSeparateDQuote) {
            mvdelim = parse2._rfc6868Escape('"' + multiValue + '"');
          }
        }
        let nextChar = line[pos + 1];
        if (nextChar === '"') {
          valuePos = pos + 2;
          pos = line.indexOf('"', valuePos);
          if (multiValue && pos != -1) {
            let extendedValue = true;
            while (extendedValue) {
              if (line[pos + 1] == multiValue && line[pos + 2] == '"') {
                pos = line.indexOf('"', pos + 3);
              } else {
                extendedValue = false;
              }
            }
          }
          if (pos === -1) {
            throw new ParserError(
              'invalid line (no matching double quote) "' + line + '"'
            );
          }
          value = line.slice(valuePos, pos);
          lastParam = line.indexOf(PARAM_DELIMITER, pos);
          let propValuePos = line.indexOf(VALUE_DELIMITER, pos);
          if (lastParam === -1 || propValuePos !== -1 && lastParam > propValuePos) {
            pos = false;
          }
        } else {
          valuePos = pos + 1;
          let nextPos = line.indexOf(PARAM_DELIMITER, valuePos);
          let propValuePos = line.indexOf(VALUE_DELIMITER, valuePos);
          if (propValuePos !== -1 && nextPos > propValuePos) {
            nextPos = propValuePos;
            pos = false;
          } else if (nextPos === -1) {
            if (propValuePos === -1) {
              nextPos = line.length;
            } else {
              nextPos = propValuePos;
            }
            pos = false;
          } else {
            lastParam = nextPos;
            pos = nextPos;
          }
          value = line.slice(valuePos, nextPos);
        }
        const length_before = value.length;
        value = parse2._rfc6868Escape(value);
        valuePos += length_before - value.length;
        if (multiValue) {
          let delimiter = mvdelim || multiValue;
          value = parse2._parseMultiValue(value, delimiter, type, [], null, designSet);
        } else {
          value = parse2._parseValue(value, type, designSet);
        }
        if (multiValue && lcname in result) {
          if (Array.isArray(result[lcname])) {
            result[lcname].push(value);
          } else {
            result[lcname] = [
              result[lcname],
              value
            ];
          }
        } else {
          result[lcname] = value;
        }
      }
      return [result, value, valuePos];
    };
    parse2._rfc6868Escape = function(val) {
      return val.replace(/\^['n^]/g, function(x) {
        return RFC6868_REPLACE_MAP$1[x];
      });
    };
    parse2._parseMultiValue = function(buffer, delim, type, result, innerMulti, designSet, structuredValue) {
      let pos = 0;
      let lastPos = 0;
      let value;
      if (delim.length === 0) {
        return buffer;
      }
      while ((pos = unescapedIndexOf(buffer, delim, lastPos)) !== -1) {
        value = buffer.slice(lastPos, pos);
        if (innerMulti) {
          value = parse2._parseMultiValue(value, innerMulti, type, [], null, designSet, structuredValue);
        } else {
          value = parse2._parseValue(value, type, designSet, structuredValue);
        }
        result.push(value);
        lastPos = pos + delim.length;
      }
      value = buffer.slice(lastPos);
      if (innerMulti) {
        value = parse2._parseMultiValue(value, innerMulti, type, [], null, designSet, structuredValue);
      } else {
        value = parse2._parseValue(value, type, designSet, structuredValue);
      }
      result.push(value);
      return result.length == 1 ? result[0] : result;
    };
    parse2._eachLine = function(buffer, callback) {
      let len = buffer.length;
      let lastPos = buffer.search(CHAR);
      let pos = lastPos;
      let line;
      let firstChar;
      let newlineOffset;
      do {
        pos = buffer.indexOf("\n", lastPos) + 1;
        if (pos > 1 && buffer[pos - 2] === "\r") {
          newlineOffset = 2;
        } else {
          newlineOffset = 1;
        }
        if (pos === 0) {
          pos = len;
          newlineOffset = 0;
        }
        firstChar = buffer[lastPos];
        if (firstChar === " " || firstChar === "	") {
          line += buffer.slice(lastPos + 1, pos - newlineOffset);
        } else {
          if (line)
            callback(null, line);
          line = buffer.slice(lastPos, pos - newlineOffset);
        }
        lastPos = pos;
      } while (pos !== len);
      line = line.trim();
      if (line.length)
        callback(null, line);
    };
    OPTIONS = ["tzid", "location", "tznames", "latitude", "longitude"];
    Timezone = class _Timezone {
      static {
        __name(this, "Timezone");
      }
      static _compare_change_fn(a, b) {
        if (a.year < b.year) return -1;
        else if (a.year > b.year) return 1;
        if (a.month < b.month) return -1;
        else if (a.month > b.month) return 1;
        if (a.day < b.day) return -1;
        else if (a.day > b.day) return 1;
        if (a.hour < b.hour) return -1;
        else if (a.hour > b.hour) return 1;
        if (a.minute < b.minute) return -1;
        else if (a.minute > b.minute) return 1;
        if (a.second < b.second) return -1;
        else if (a.second > b.second) return 1;
        return 0;
      }
      /**
       * Convert the date/time from one zone to the next.
       *
       * @param {Time} tt                  The time to convert
       * @param {Timezone} from_zone       The source zone to convert from
       * @param {Timezone} to_zone         The target zone to convert to
       * @return {Time}                    The converted date/time object
       */
      static convert_time(tt, from_zone, to_zone) {
        if (tt.isDate || from_zone.tzid == to_zone.tzid || from_zone == _Timezone.localTimezone || to_zone == _Timezone.localTimezone) {
          tt.zone = to_zone;
          return tt;
        }
        let utcOffset = from_zone.utcOffset(tt);
        tt.adjust(0, 0, 0, -utcOffset);
        utcOffset = to_zone.utcOffset(tt);
        tt.adjust(0, 0, 0, utcOffset);
        return null;
      }
      /**
       * Creates a new ICAL.Timezone instance from the passed data object.
       *
       * @param {Component|Object} aData options for class
       * @param {String|Component} aData.component
       *        If aData is a simple object, then this member can be set to either a
       *        string containing the component data, or an already parsed
       *        ICAL.Component
       * @param {String} aData.tzid      The timezone identifier
       * @param {String} aData.location  The timezone locationw
       * @param {String} aData.tznames   An alternative string representation of the
       *                                  timezone
       * @param {Number} aData.latitude  The latitude of the timezone
       * @param {Number} aData.longitude The longitude of the timezone
       */
      static fromData(aData) {
        let tt = new _Timezone();
        return tt.fromData(aData);
      }
      /**
       * The instance describing the UTC timezone
       * @type {Timezone}
       * @constant
       * @instance
       */
      static #utcTimezone = null;
      static get utcTimezone() {
        if (!this.#utcTimezone) {
          this.#utcTimezone = _Timezone.fromData({
            tzid: "UTC"
          });
        }
        return this.#utcTimezone;
      }
      /**
       * The instance describing the local timezone
       * @type {Timezone}
       * @constant
       * @instance
       */
      static #localTimezone = null;
      static get localTimezone() {
        if (!this.#localTimezone) {
          this.#localTimezone = _Timezone.fromData({
            tzid: "floating"
          });
        }
        return this.#localTimezone;
      }
      /**
       * Adjust a timezone change object.
       * @private
       * @param {Object} change     The timezone change object
       * @param {Number} days       The extra amount of days
       * @param {Number} hours      The extra amount of hours
       * @param {Number} minutes    The extra amount of minutes
       * @param {Number} seconds    The extra amount of seconds
       */
      static adjust_change(change, days, hours, minutes, seconds) {
        return Time.prototype.adjust.call(
          change,
          days,
          hours,
          minutes,
          seconds,
          change
        );
      }
      static _minimumExpansionYear = -1;
      static EXTRA_COVERAGE = 5;
      /**
       * Creates a new ICAL.Timezone instance, by passing in a tzid and component.
       *
       * @param {Component|Object} data options for class
       * @param {String|Component} data.component
       *        If data is a simple object, then this member can be set to either a
       *        string containing the component data, or an already parsed
       *        ICAL.Component
       * @param {String} data.tzid      The timezone identifier
       * @param {String} data.location  The timezone locationw
       * @param {String} data.tznames   An alternative string representation of the
       *                                  timezone
       * @param {Number} data.latitude  The latitude of the timezone
       * @param {Number} data.longitude The longitude of the timezone
       */
      constructor(data) {
        this.wrappedJSObject = this;
        this.fromData(data);
      }
      /**
       * Timezone identifier
       * @type {String}
       */
      tzid = "";
      /**
       * Timezone location
       * @type {String}
       */
      location = "";
      /**
       * Alternative timezone name, for the string representation
       * @type {String}
       */
      tznames = "";
      /**
       * The primary latitude for the timezone.
       * @type {Number}
       */
      latitude = 0;
      /**
       * The primary longitude for the timezone.
       * @type {Number}
       */
      longitude = 0;
      /**
       * The vtimezone component for this timezone.
       * @type {Component}
       */
      component = null;
      /**
       * The year this timezone has been expanded to. All timezone transition
       * dates until this year are known and can be used for calculation
       *
       * @private
       * @type {Number}
       */
      expandedUntilYear = 0;
      /**
       * The class identifier.
       * @constant
       * @type {String}
       * @default "icaltimezone"
       */
      icalclass = "icaltimezone";
      /**
       * Sets up the current instance using members from the passed data object.
       *
       * @param {Component|Object} aData options for class
       * @param {String|Component} aData.component
       *        If aData is a simple object, then this member can be set to either a
       *        string containing the component data, or an already parsed
       *        ICAL.Component
       * @param {String} aData.tzid      The timezone identifier
       * @param {String} aData.location  The timezone locationw
       * @param {String} aData.tznames   An alternative string representation of the
       *                                  timezone
       * @param {Number} aData.latitude  The latitude of the timezone
       * @param {Number} aData.longitude The longitude of the timezone
       */
      fromData(aData) {
        this.expandedUntilYear = 0;
        this.changes = [];
        if (aData instanceof Component) {
          this.component = aData;
        } else {
          if (aData && "component" in aData) {
            if (typeof aData.component == "string") {
              let jCal = parse2(aData.component);
              this.component = new Component(jCal);
            } else if (aData.component instanceof Component) {
              this.component = aData.component;
            } else {
              this.component = null;
            }
          }
          for (let prop of OPTIONS) {
            if (aData && prop in aData) {
              this[prop] = aData[prop];
            }
          }
        }
        if (this.component instanceof Component && !this.tzid) {
          this.tzid = this.component.getFirstPropertyValue("tzid");
        }
        return this;
      }
      /**
       * Finds the utcOffset the given time would occur in this timezone.
       *
       * @param {Time} tt         The time to check for
       * @return {Number}         utc offset in seconds
       */
      utcOffset(tt) {
        if (this == _Timezone.utcTimezone || this == _Timezone.localTimezone) {
          return 0;
        }
        this._ensureCoverage(tt.year);
        if (!this.changes.length) {
          return 0;
        }
        let tt_change = {
          year: tt.year,
          month: tt.month,
          day: tt.day,
          hour: tt.hour,
          minute: tt.minute,
          second: tt.second
        };
        let change_num = this._findNearbyChange(tt_change);
        let change_num_to_use = -1;
        let step = 1;
        for (; ; ) {
          let change = clone2(this.changes[change_num], true);
          if (change.utcOffset < change.prevUtcOffset) {
            _Timezone.adjust_change(change, 0, 0, 0, change.utcOffset);
          } else {
            _Timezone.adjust_change(
              change,
              0,
              0,
              0,
              change.prevUtcOffset
            );
          }
          let cmp = _Timezone._compare_change_fn(tt_change, change);
          if (cmp >= 0) {
            change_num_to_use = change_num;
          } else {
            step = -1;
          }
          if (step == -1 && change_num_to_use != -1) {
            break;
          }
          change_num += step;
          if (change_num < 0) {
            return 0;
          }
          if (change_num >= this.changes.length) {
            break;
          }
        }
        let zone_change = this.changes[change_num_to_use];
        let utcOffset_change = zone_change.utcOffset - zone_change.prevUtcOffset;
        if (utcOffset_change < 0 && change_num_to_use > 0) {
          let tmp_change = clone2(zone_change, true);
          _Timezone.adjust_change(tmp_change, 0, 0, 0, tmp_change.prevUtcOffset);
          if (_Timezone._compare_change_fn(tt_change, tmp_change) < 0) {
            let prev_zone_change = this.changes[change_num_to_use - 1];
            let want_daylight = false;
            if (zone_change.is_daylight != want_daylight && prev_zone_change.is_daylight == want_daylight) {
              zone_change = prev_zone_change;
            }
          }
        }
        return zone_change.utcOffset;
      }
      _findNearbyChange(change) {
        let idx = binsearchInsert(
          this.changes,
          change,
          _Timezone._compare_change_fn
        );
        if (idx >= this.changes.length) {
          return this.changes.length - 1;
        }
        return idx;
      }
      _ensureCoverage(aYear) {
        if (_Timezone._minimumExpansionYear == -1) {
          let today = Time.now();
          _Timezone._minimumExpansionYear = today.year;
        }
        let changesEndYear = aYear;
        if (changesEndYear < _Timezone._minimumExpansionYear) {
          changesEndYear = _Timezone._minimumExpansionYear;
        }
        changesEndYear += _Timezone.EXTRA_COVERAGE;
        if (!this.changes.length || this.expandedUntilYear < aYear) {
          let subcomps = this.component.getAllSubcomponents();
          let compLen = subcomps.length;
          let compIdx = 0;
          for (; compIdx < compLen; compIdx++) {
            this._expandComponent(
              subcomps[compIdx],
              changesEndYear,
              this.changes
            );
          }
          this.changes.sort(_Timezone._compare_change_fn);
          this.expandedUntilYear = changesEndYear;
        }
      }
      _expandComponent(aComponent, aYear, changes) {
        if (!aComponent.hasProperty("dtstart") || !aComponent.hasProperty("tzoffsetto") || !aComponent.hasProperty("tzoffsetfrom")) {
          return null;
        }
        let dtstart = aComponent.getFirstProperty("dtstart").getFirstValue();
        let change;
        function convert_tzoffset(offset) {
          return offset.factor * (offset.hours * 3600 + offset.minutes * 60);
        }
        __name(convert_tzoffset, "convert_tzoffset");
        function init_changes() {
          let changebase = {};
          changebase.is_daylight = aComponent.name == "daylight";
          changebase.utcOffset = convert_tzoffset(
            aComponent.getFirstProperty("tzoffsetto").getFirstValue()
          );
          changebase.prevUtcOffset = convert_tzoffset(
            aComponent.getFirstProperty("tzoffsetfrom").getFirstValue()
          );
          return changebase;
        }
        __name(init_changes, "init_changes");
        if (!aComponent.hasProperty("rrule") && !aComponent.hasProperty("rdate")) {
          change = init_changes();
          change.year = dtstart.year;
          change.month = dtstart.month;
          change.day = dtstart.day;
          change.hour = dtstart.hour;
          change.minute = dtstart.minute;
          change.second = dtstart.second;
          _Timezone.adjust_change(change, 0, 0, 0, -change.prevUtcOffset);
          changes.push(change);
        } else {
          let props = aComponent.getAllProperties("rdate");
          for (let rdate of props) {
            let time = rdate.getFirstValue();
            change = init_changes();
            change.year = time.year;
            change.month = time.month;
            change.day = time.day;
            if (time.isDate) {
              change.hour = dtstart.hour;
              change.minute = dtstart.minute;
              change.second = dtstart.second;
              if (dtstart.zone != _Timezone.utcTimezone) {
                _Timezone.adjust_change(change, 0, 0, 0, -change.prevUtcOffset);
              }
            } else {
              change.hour = time.hour;
              change.minute = time.minute;
              change.second = time.second;
              if (time.zone != _Timezone.utcTimezone) {
                _Timezone.adjust_change(change, 0, 0, 0, -change.prevUtcOffset);
              }
            }
            changes.push(change);
          }
          let rrule = aComponent.getFirstProperty("rrule");
          if (rrule) {
            rrule = rrule.getFirstValue();
            change = init_changes();
            if (rrule.until && rrule.until.zone == _Timezone.utcTimezone) {
              rrule.until.adjust(0, 0, 0, change.prevUtcOffset);
              rrule.until.zone = _Timezone.localTimezone;
            }
            let iterator = rrule.iterator(dtstart);
            let occ;
            while (occ = iterator.next()) {
              change = init_changes();
              if (occ.year > aYear || !occ) {
                break;
              }
              change.year = occ.year;
              change.month = occ.month;
              change.day = occ.day;
              change.hour = occ.hour;
              change.minute = occ.minute;
              change.second = occ.second;
              change.isDate = occ.isDate;
              _Timezone.adjust_change(change, 0, 0, 0, -change.prevUtcOffset);
              changes.push(change);
            }
          }
        }
        return changes;
      }
      /**
       * The string representation of this timezone.
       * @return {String}
       */
      toString() {
        return this.tznames ? this.tznames : this.tzid;
      }
    };
    zones = null;
    TimezoneService = {
      get count() {
        if (zones === null) {
          return 0;
        }
        return Object.keys(zones).length;
      },
      reset: /* @__PURE__ */ __name(function() {
        zones = /* @__PURE__ */ Object.create(null);
        let utc = Timezone.utcTimezone;
        zones.Z = utc;
        zones.UTC = utc;
        zones.GMT = utc;
      }, "reset"),
      _hard_reset: /* @__PURE__ */ __name(function() {
        zones = null;
      }, "_hard_reset"),
      /**
       * Checks if timezone id has been registered.
       *
       * @param {String} tzid     Timezone identifier (e.g. America/Los_Angeles)
       * @return {Boolean}        False, when not present
       */
      has: /* @__PURE__ */ __name(function(tzid) {
        if (zones === null) {
          return false;
        }
        return !!zones[tzid];
      }, "has"),
      /**
       * Returns a timezone by its tzid if present.
       *
       * @param {String} tzid               Timezone identifier (e.g. America/Los_Angeles)
       * @return {Timezone | undefined}     The timezone, or undefined if not found
       */
      get: /* @__PURE__ */ __name(function(tzid) {
        if (zones === null) {
          this.reset();
        }
        return zones[tzid];
      }, "get"),
      /**
       * Registers a timezone object or component.
       *
       * @param {Component|Timezone} timezone
       *        The initialized zone or vtimezone.
       *
       * @param {String=} name
       *        The name of the timezone. Defaults to the component's TZID if not
       *        passed.
       */
      register: /* @__PURE__ */ __name(function(timezone, name) {
        if (zones === null) {
          this.reset();
        }
        if (typeof timezone === "string" && name instanceof Timezone) {
          [timezone, name] = [name, timezone];
        }
        if (!name) {
          if (timezone instanceof Timezone) {
            name = timezone.tzid;
          } else {
            if (timezone.name === "vtimezone") {
              timezone = new Timezone(timezone);
              name = timezone.tzid;
            }
          }
        }
        if (!name) {
          throw new TypeError("Neither a timezone nor a name was passed");
        }
        if (timezone instanceof Timezone) {
          zones[name] = timezone;
        } else {
          throw new TypeError("timezone must be ICAL.Timezone or ICAL.Component");
        }
      }, "register"),
      /**
       * Removes a timezone by its tzid from the list.
       *
       * @param {String} tzid     Timezone identifier (e.g. America/Los_Angeles)
       * @return {?Timezone}      The removed timezone, or null if not registered
       */
      remove: /* @__PURE__ */ __name(function(tzid) {
        if (zones === null) {
          return null;
        }
        return delete zones[tzid];
      }, "remove")
    };
    __name(updateTimezones, "updateTimezones");
    __name(isStrictlyNaN, "isStrictlyNaN");
    __name(strictParseInt, "strictParseInt");
    __name(formatClassType, "formatClassType");
    __name(unescapedIndexOf, "unescapedIndexOf");
    __name(binsearchInsert, "binsearchInsert");
    __name(clone2, "clone");
    __name(foldline, "foldline");
    __name(pad2, "pad2");
    __name(trunc, "trunc");
    __name(extend, "extend");
    helpers = /* @__PURE__ */ Object.freeze({
      __proto__: null,
      binsearchInsert,
      clone: clone2,
      extend,
      foldline,
      formatClassType,
      isStrictlyNaN,
      pad2,
      strictParseInt,
      trunc,
      unescapedIndexOf,
      updateTimezones
    });
    UtcOffset = class _UtcOffset {
      static {
        __name(this, "UtcOffset");
      }
      /**
       * Creates a new {@link ICAL.UtcOffset} instance from the passed string.
       *
       * @param {String} aString    The string to parse
       * @return {Duration}         The created utc-offset instance
       */
      static fromString(aString) {
        let options = {};
        options.factor = aString[0] === "+" ? 1 : -1;
        options.hours = strictParseInt(aString.slice(1, 3));
        options.minutes = strictParseInt(aString.slice(4, 6));
        return new _UtcOffset(options);
      }
      /**
       * Creates a new {@link ICAL.UtcOffset} instance from the passed seconds
       * value.
       *
       * @param {Number} aSeconds       The number of seconds to convert
       */
      static fromSeconds(aSeconds) {
        let instance = new _UtcOffset();
        instance.fromSeconds(aSeconds);
        return instance;
      }
      /**
       * Creates a new ICAL.UtcOffset instance.
       *
       * @param {Object} aData          An object with members of the utc offset
       * @param {Number=} aData.hours   The hours for the utc offset
       * @param {Number=} aData.minutes The minutes in the utc offset
       * @param {Number=} aData.factor  The factor for the utc-offset, either -1 or 1
       */
      constructor(aData) {
        this.fromData(aData);
      }
      /**
       * The hours in the utc-offset
       * @type {Number}
       */
      hours = 0;
      /**
       * The minutes in the utc-offset
       * @type {Number}
       */
      minutes = 0;
      /**
       * The sign of the utc offset, 1 for positive offset, -1 for negative
       * offsets.
       * @type {Number}
       */
      factor = 1;
      /**
       * The type name, to be used in the jCal object.
       * @constant
       * @type {String}
       * @default "utc-offset"
       */
      icaltype = "utc-offset";
      /**
       * Returns a clone of the utc offset object.
       *
       * @return {UtcOffset}     The cloned object
       */
      clone() {
        return _UtcOffset.fromSeconds(this.toSeconds());
      }
      /**
       * Sets up the current instance using members from the passed data object.
       *
       * @param {Object} aData          An object with members of the utc offset
       * @param {Number=} aData.hours   The hours for the utc offset
       * @param {Number=} aData.minutes The minutes in the utc offset
       * @param {Number=} aData.factor  The factor for the utc-offset, either -1 or 1
       */
      fromData(aData) {
        if (aData) {
          for (let [key, value] of Object.entries(aData)) {
            this[key] = value;
          }
        }
        this._normalize();
      }
      /**
       * Sets up the current instance from the given seconds value. The seconds
       * value is truncated to the minute. Offsets are wrapped when the world
       * ends, the hour after UTC+14:00 is UTC-12:00.
       *
       * @param {Number} aSeconds         The seconds to convert into an offset
       */
      fromSeconds(aSeconds) {
        let secs = Math.abs(aSeconds);
        this.factor = aSeconds < 0 ? -1 : 1;
        this.hours = trunc(secs / 3600);
        secs -= this.hours * 3600;
        this.minutes = trunc(secs / 60);
        return this;
      }
      /**
       * Convert the current offset to a value in seconds
       *
       * @return {Number}                 The offset in seconds
       */
      toSeconds() {
        return this.factor * (60 * this.minutes + 3600 * this.hours);
      }
      /**
       * Compare this utc offset with another one.
       *
       * @param {UtcOffset} other             The other offset to compare with
       * @return {Number}                     -1, 0 or 1 for less/equal/greater
       */
      compare(other) {
        let a = this.toSeconds();
        let b = other.toSeconds();
        return (a > b) - (b > a);
      }
      _normalize() {
        let secs = this.toSeconds();
        let factor = this.factor;
        while (secs < -43200) {
          secs += 97200;
        }
        while (secs > 50400) {
          secs -= 97200;
        }
        this.fromSeconds(secs);
        if (secs == 0) {
          this.factor = factor;
        }
      }
      /**
       * The iCalendar string representation of this utc-offset.
       * @return {String}
       */
      toICALString() {
        return design.icalendar.value["utc-offset"].toICAL(this.toString());
      }
      /**
       * The string representation of this utc-offset.
       * @return {String}
       */
      toString() {
        return (this.factor == 1 ? "+" : "-") + pad2(this.hours) + ":" + pad2(this.minutes);
      }
    };
    VCardTime = class _VCardTime extends Time {
      static {
        __name(this, "VCardTime");
      }
      /**
       * Returns a new ICAL.VCardTime instance from a date and/or time string.
       *
       * @param {String} aValue     The string to create from
       * @param {String} aIcalType  The type for this instance, e.g. date-and-or-time
       * @return {VCardTime}        The date/time instance
       */
      static fromDateAndOrTimeString(aValue, aIcalType) {
        function part(v, s, e) {
          return v ? strictParseInt(v.slice(s, s + e)) : null;
        }
        __name(part, "part");
        let parts = aValue.split("T");
        let dt = parts[0], tmz = parts[1];
        let splitzone = tmz ? design.vcard.value.time._splitZone(tmz) : [];
        let zone = splitzone[0], tm = splitzone[1];
        let dtlen = dt ? dt.length : 0;
        let tmlen = tm ? tm.length : 0;
        let hasDashDate = dt && dt[0] == "-" && dt[1] == "-";
        let hasDashTime = tm && tm[0] == "-";
        let o = {
          year: hasDashDate ? null : part(dt, 0, 4),
          month: hasDashDate && (dtlen == 4 || dtlen == 7) ? part(dt, 2, 2) : dtlen == 7 ? part(dt, 5, 2) : dtlen == 10 ? part(dt, 5, 2) : null,
          day: dtlen == 5 ? part(dt, 3, 2) : dtlen == 7 && hasDashDate ? part(dt, 5, 2) : dtlen == 10 ? part(dt, 8, 2) : null,
          hour: hasDashTime ? null : part(tm, 0, 2),
          minute: hasDashTime && tmlen == 3 ? part(tm, 1, 2) : tmlen > 4 ? hasDashTime ? part(tm, 1, 2) : part(tm, 3, 2) : null,
          second: tmlen == 4 ? part(tm, 2, 2) : tmlen == 6 ? part(tm, 4, 2) : tmlen == 8 ? part(tm, 6, 2) : null
        };
        if (zone == "Z") {
          zone = Timezone.utcTimezone;
        } else if (zone && zone[3] == ":") {
          zone = UtcOffset.fromString(zone);
        } else {
          zone = null;
        }
        return new _VCardTime(o, zone, aIcalType);
      }
      /**
       * Creates a new ICAL.VCardTime instance.
       *
       * @param {Object} data                           The data for the time instance
       * @param {Number=} data.year                     The year for this date
       * @param {Number=} data.month                    The month for this date
       * @param {Number=} data.day                      The day for this date
       * @param {Number=} data.hour                     The hour for this date
       * @param {Number=} data.minute                   The minute for this date
       * @param {Number=} data.second                   The second for this date
       * @param {Timezone|UtcOffset} zone               The timezone to use
       * @param {String} icaltype                       The type for this date/time object
       */
      constructor(data, zone, icaltype) {
        super(data, zone);
        this.icaltype = icaltype || "date-and-or-time";
      }
      /**
       * The class identifier.
       * @constant
       * @type {String}
       * @default "vcardtime"
       */
      icalclass = "vcardtime";
      /**
       * The type name, to be used in the jCal object.
       * @type {String}
       * @default "date-and-or-time"
       */
      icaltype = "date-and-or-time";
      /**
       * Returns a clone of the vcard date/time object.
       *
       * @return {VCardTime}     The cloned object
       */
      clone() {
        return new _VCardTime(this._time, this.zone, this.icaltype);
      }
      _normalize() {
        return this;
      }
      /**
       * @inheritdoc
       */
      utcOffset() {
        if (this.zone instanceof UtcOffset) {
          return this.zone.toSeconds();
        } else {
          return Time.prototype.utcOffset.apply(this, arguments);
        }
      }
      /**
       * Returns an RFC 6350 compliant representation of this object.
       *
       * @return {String}         vcard date/time string
       */
      toICALString() {
        return design.vcard.value[this.icaltype].toICAL(this.toString());
      }
      /**
       * The string representation of this date/time, in jCard form
       * (including : and - separators).
       * @return {String}
       */
      toString() {
        let y = this.year, m = this.month, d = this.day;
        let h = this.hour, mm = this.minute, s = this.second;
        let hasYear = y !== null, hasMonth = m !== null, hasDay = d !== null;
        let hasHour = h !== null, hasMinute = mm !== null, hasSecond = s !== null;
        let datepart = (hasYear ? pad2(y) + (hasMonth || hasDay ? "-" : "") : hasMonth || hasDay ? "--" : "") + (hasMonth ? pad2(m) : "") + (hasDay ? "-" + pad2(d) : "");
        let timepart = (hasHour ? pad2(h) : "-") + (hasHour && hasMinute ? ":" : "") + (hasMinute ? pad2(mm) : "") + (!hasHour && !hasMinute ? "-" : "") + (hasMinute && hasSecond ? ":" : "") + (hasSecond ? pad2(s) : "");
        let zone;
        if (this.zone === Timezone.utcTimezone) {
          zone = "Z";
        } else if (this.zone instanceof UtcOffset) {
          zone = this.zone.toString();
        } else if (this.zone === Timezone.localTimezone) {
          zone = "";
        } else if (this.zone instanceof Timezone) {
          let offset = UtcOffset.fromSeconds(this.zone.utcOffset(this));
          zone = offset.toString();
        } else {
          zone = "";
        }
        switch (this.icaltype) {
          case "time":
            return timepart + zone;
          case "date-and-or-time":
          case "date-time":
            return datepart + (timepart == "--" ? "" : "T" + timepart + zone);
          case "date":
            return datepart;
        }
        return null;
      }
    };
    RecurIterator = class _RecurIterator {
      static {
        __name(this, "RecurIterator");
      }
      static _indexMap = {
        "BYSECOND": 0,
        "BYMINUTE": 1,
        "BYHOUR": 2,
        "BYDAY": 3,
        "BYMONTHDAY": 4,
        "BYYEARDAY": 5,
        "BYWEEKNO": 6,
        "BYMONTH": 7,
        "BYSETPOS": 8
      };
      static _expandMap = {
        "SECONDLY": [1, 1, 1, 1, 1, 1, 1, 1],
        "MINUTELY": [2, 1, 1, 1, 1, 1, 1, 1],
        "HOURLY": [2, 2, 1, 1, 1, 1, 1, 1],
        "DAILY": [2, 2, 2, 1, 1, 1, 1, 1],
        "WEEKLY": [2, 2, 2, 2, 3, 3, 1, 1],
        "MONTHLY": [2, 2, 2, 2, 2, 3, 3, 1],
        "YEARLY": [2, 2, 2, 2, 2, 2, 2, 2]
      };
      static UNKNOWN = 0;
      static CONTRACT = 1;
      static EXPAND = 2;
      static ILLEGAL = 3;
      /**
       * Creates a new ICAL.RecurIterator instance. The options object may contain additional members
       * when resuming iteration from a previous run.
       *
       * @param {Object} options                The iterator options
       * @param {Recur} options.rule            The rule to iterate.
       * @param {Time} options.dtstart          The start date of the event.
       * @param {Boolean=} options.initialized  When true, assume that options are
       *        from a previously constructed iterator. Initialization will not be
       *        repeated.
       */
      constructor(options) {
        this.fromData(options);
      }
      /**
       * True when iteration is finished.
       * @type {Boolean}
       */
      completed = false;
      /**
       * The rule that is being iterated
       * @type {Recur}
       */
      rule = null;
      /**
       * The start date of the event being iterated.
       * @type {Time}
       */
      dtstart = null;
      /**
       * The last occurrence that was returned from the
       * {@link RecurIterator#next} method.
       * @type {Time}
       */
      last = null;
      /**
       * The sequence number from the occurrence
       * @type {Number}
       */
      occurrence_number = 0;
      /**
       * The indices used for the {@link ICAL.RecurIterator#by_data} object.
       * @type {Object}
       * @private
       */
      by_indices = null;
      /**
       * If true, the iterator has already been initialized
       * @type {Boolean}
       * @private
       */
      initialized = false;
      /**
       * The initializd by-data.
       * @type {Object}
       * @private
       */
      by_data = null;
      /**
       * The expanded yeardays
       * @type {Array}
       * @private
       */
      days = null;
      /**
       * The index in the {@link ICAL.RecurIterator#days} array.
       * @type {Number}
       * @private
       */
      days_index = 0;
      /**
       * Initialize the recurrence iterator from the passed data object. This
       * method is usually not called directly, you can initialize the iterator
       * through the constructor.
       *
       * @param {Object} options                The iterator options
       * @param {Recur} options.rule            The rule to iterate.
       * @param {Time} options.dtstart          The start date of the event.
       * @param {Boolean=} options.initialized  When true, assume that options are
       *        from a previously constructed iterator. Initialization will not be
       *        repeated.
       */
      fromData(options) {
        this.rule = formatClassType(options.rule, Recur);
        if (!this.rule) {
          throw new Error("iterator requires a (ICAL.Recur) rule");
        }
        this.dtstart = formatClassType(options.dtstart, Time);
        if (!this.dtstart) {
          throw new Error("iterator requires a (ICAL.Time) dtstart");
        }
        if (options.by_data) {
          this.by_data = options.by_data;
        } else {
          this.by_data = clone2(this.rule.parts, true);
        }
        if (options.occurrence_number)
          this.occurrence_number = options.occurrence_number;
        this.days = options.days || [];
        if (options.last) {
          this.last = formatClassType(options.last, Time);
        }
        this.by_indices = options.by_indices;
        if (!this.by_indices) {
          this.by_indices = {
            "BYSECOND": 0,
            "BYMINUTE": 0,
            "BYHOUR": 0,
            "BYDAY": 0,
            "BYMONTH": 0,
            "BYWEEKNO": 0,
            "BYMONTHDAY": 0
          };
        }
        this.initialized = options.initialized || false;
        if (!this.initialized) {
          try {
            this.init();
          } catch (e) {
            if (e instanceof InvalidRecurrenceRuleError) {
              this.completed = true;
            } else {
              throw e;
            }
          }
        }
      }
      /**
       * Initialize the iterator
       * @private
       */
      init() {
        this.initialized = true;
        this.last = this.dtstart.clone();
        let parts = this.by_data;
        if ("BYDAY" in parts) {
          this.sort_byday_rules(parts.BYDAY);
        }
        if ("BYYEARDAY" in parts) {
          if ("BYMONTH" in parts || "BYWEEKNO" in parts || "BYMONTHDAY" in parts) {
            throw new Error("Invalid BYYEARDAY rule");
          }
        }
        if ("BYWEEKNO" in parts && "BYMONTHDAY" in parts) {
          throw new Error("BYWEEKNO does not fit to BYMONTHDAY");
        }
        if (this.rule.freq == "MONTHLY" && ("BYYEARDAY" in parts || "BYWEEKNO" in parts)) {
          throw new Error("For MONTHLY recurrences neither BYYEARDAY nor BYWEEKNO may appear");
        }
        if (this.rule.freq == "WEEKLY" && ("BYYEARDAY" in parts || "BYMONTHDAY" in parts)) {
          throw new Error("For WEEKLY recurrences neither BYMONTHDAY nor BYYEARDAY may appear");
        }
        if (this.rule.freq != "YEARLY" && "BYYEARDAY" in parts) {
          throw new Error("BYYEARDAY may only appear in YEARLY rules");
        }
        this.last.second = this.setup_defaults("BYSECOND", "SECONDLY", this.dtstart.second);
        this.last.minute = this.setup_defaults("BYMINUTE", "MINUTELY", this.dtstart.minute);
        this.last.hour = this.setup_defaults("BYHOUR", "HOURLY", this.dtstart.hour);
        this.last.day = this.setup_defaults("BYMONTHDAY", "DAILY", this.dtstart.day);
        this.last.month = this.setup_defaults("BYMONTH", "MONTHLY", this.dtstart.month);
        if (this.rule.freq == "WEEKLY") {
          if ("BYDAY" in parts) {
            let [, dow] = this.ruleDayOfWeek(parts.BYDAY[0], this.rule.wkst);
            let wkdy = dow - this.last.dayOfWeek(this.rule.wkst);
            if (this.last.dayOfWeek(this.rule.wkst) < dow && wkdy >= 0 || wkdy < 0) {
              this.last.day += wkdy;
            }
          } else {
            let dayName = Recur.numericDayToIcalDay(this.dtstart.dayOfWeek());
            parts.BYDAY = [dayName];
          }
        }
        if (this.rule.freq == "YEARLY") {
          const untilYear = this.rule.until ? this.rule.until.year : 2e4;
          while (this.last.year <= untilYear) {
            this.expand_year_days(this.last.year);
            if (this.days.length > 0) {
              break;
            }
            this.increment_year(this.rule.interval);
          }
          if (this.days.length == 0) {
            throw new InvalidRecurrenceRuleError();
          }
          if (!this._nextByYearDay() && !this.next_year() && !this.next_year() && !this.next_year()) {
            throw new InvalidRecurrenceRuleError();
          }
        }
        if (this.rule.freq == "MONTHLY") {
          if (this.has_by_data("BYDAY")) {
            let tempLast = null;
            let initLast = this.last.clone();
            let daysInMonth = Time.daysInMonth(this.last.month, this.last.year);
            for (let bydow of this.by_data.BYDAY) {
              this.last = initLast.clone();
              let [pos, dow] = this.ruleDayOfWeek(bydow);
              let dayOfMonth = this.last.nthWeekDay(dow, pos);
              if (pos >= 6 || pos <= -6) {
                throw new Error("Malformed values in BYDAY part");
              }
              if (dayOfMonth > daysInMonth || dayOfMonth <= 0) {
                if (tempLast && tempLast.month == initLast.month) {
                  continue;
                }
                while (dayOfMonth > daysInMonth || dayOfMonth <= 0) {
                  this.increment_month();
                  daysInMonth = Time.daysInMonth(this.last.month, this.last.year);
                  dayOfMonth = this.last.nthWeekDay(dow, pos);
                }
              }
              this.last.day = dayOfMonth;
              if (!tempLast || this.last.compare(tempLast) < 0) {
                tempLast = this.last.clone();
              }
            }
            this.last = tempLast.clone();
            if (this.has_by_data("BYMONTHDAY")) {
              this._byDayAndMonthDay(true);
            }
            if (this.last.day > daysInMonth || this.last.day == 0) {
              throw new Error("Malformed values in BYDAY part");
            }
          } else if (this.has_by_data("BYMONTHDAY")) {
            this.last.day = 1;
            let normalized = this.normalizeByMonthDayRules(
              this.last.year,
              this.last.month,
              this.rule.parts.BYMONTHDAY
            ).filter((d) => d >= this.last.day);
            if (normalized.length) {
              this.last.day = normalized[0];
              this.by_data.BYMONTHDAY = normalized;
            } else {
              if (!this.next_month() && !this.next_month() && !this.next_month()) {
                throw new InvalidRecurrenceRuleError();
              }
            }
          }
        }
      }
      /**
       * Retrieve the next occurrence from the iterator.
       * @return {Time}
       */
      next(again = false) {
        let before = this.last ? this.last.clone() : null;
        if (this.rule.count && this.occurrence_number >= this.rule.count || this.rule.until && this.last.compare(this.rule.until) > 0) {
          this.completed = true;
        }
        if (this.completed) {
          return null;
        }
        if (this.occurrence_number == 0 && this.last.compare(this.dtstart) >= 0) {
          this.occurrence_number++;
          return this.last;
        }
        let valid;
        let invalid_count = 0;
        do {
          valid = 1;
          switch (this.rule.freq) {
            case "SECONDLY":
              this.next_second();
              break;
            case "MINUTELY":
              this.next_minute();
              break;
            case "HOURLY":
              this.next_hour();
              break;
            case "DAILY":
              this.next_day();
              break;
            case "WEEKLY":
              this.next_week();
              break;
            case "MONTHLY":
              valid = this.next_month();
              if (valid) {
                invalid_count = 0;
              } else if (++invalid_count == 336) {
                this.completed = true;
                return null;
              }
              break;
            case "YEARLY":
              valid = this.next_year();
              if (valid) {
                invalid_count = 0;
              } else if (++invalid_count == 28) {
                this.completed = true;
                return null;
              }
              break;
            default:
              return null;
          }
        } while (!this.check_contracting_rules() || this.last.compare(this.dtstart) < 0 || !valid);
        if (this.last.compare(before) == 0) {
          if (again) {
            throw new Error("Same occurrence found twice, protecting you from death by recursion");
          }
          this.next(true);
        }
        if (this.rule.until && this.last.compare(this.rule.until) > 0) {
          this.completed = true;
          return null;
        } else {
          this.occurrence_number++;
          return this.last;
        }
      }
      next_second() {
        return this.next_generic("BYSECOND", "SECONDLY", "second", "minute");
      }
      increment_second(inc) {
        return this.increment_generic(inc, "second", 60, "minute");
      }
      next_minute() {
        return this.next_generic(
          "BYMINUTE",
          "MINUTELY",
          "minute",
          "hour",
          "next_second"
        );
      }
      increment_minute(inc) {
        return this.increment_generic(inc, "minute", 60, "hour");
      }
      next_hour() {
        return this.next_generic(
          "BYHOUR",
          "HOURLY",
          "hour",
          "monthday",
          "next_minute"
        );
      }
      increment_hour(inc) {
        this.increment_generic(inc, "hour", 24, "monthday");
      }
      next_day() {
        let this_freq = this.rule.freq == "DAILY";
        if (this.next_hour() == 0) {
          return 0;
        }
        if (this_freq) {
          this.increment_monthday(this.rule.interval);
        } else {
          this.increment_monthday(1);
        }
        return 0;
      }
      next_week() {
        let end_of_data = 0;
        if (this.next_weekday_by_week() == 0) {
          return end_of_data;
        }
        if (this.has_by_data("BYWEEKNO")) {
          this.by_indices.BYWEEKNO++;
          if (this.by_indices.BYWEEKNO == this.by_data.BYWEEKNO.length) {
            this.by_indices.BYWEEKNO = 0;
            end_of_data = 1;
          }
          this.last.month = 1;
          this.last.day = 1;
          let week_no = this.by_data.BYWEEKNO[this.by_indices.BYWEEKNO];
          this.last.day += 7 * week_no;
          if (end_of_data) {
            this.increment_year(1);
          }
        } else {
          this.increment_monthday(7 * this.rule.interval);
        }
        return end_of_data;
      }
      /**
       * Normalize each by day rule for a given year/month.
       * Takes into account ordering and negative rules
       *
       * @private
       * @param {Number} year         Current year.
       * @param {Number} month        Current month.
       * @param {Array}  rules        Array of rules.
       *
       * @return {Array} sorted and normalized rules.
       *                 Negative rules will be expanded to their
       *                 correct positive values for easier processing.
       */
      normalizeByMonthDayRules(year2, month, rules) {
        let daysInMonth = Time.daysInMonth(month, year2);
        let newRules = [];
        let ruleIdx = 0;
        let len = rules.length;
        let rule;
        for (; ruleIdx < len; ruleIdx++) {
          rule = parseInt(rules[ruleIdx], 10);
          if (isNaN(rule)) {
            throw new Error("Invalid BYMONTHDAY value");
          }
          if (Math.abs(rule) > daysInMonth) {
            continue;
          }
          if (rule < 0) {
            rule = daysInMonth + (rule + 1);
          } else if (rule === 0) {
            continue;
          }
          if (newRules.indexOf(rule) === -1) {
            newRules.push(rule);
          }
        }
        return newRules.sort(function(a, b) {
          return a - b;
        });
      }
      /**
       * NOTES:
       * We are given a list of dates in the month (BYMONTHDAY) (23, etc..)
       * Also we are given a list of days (BYDAY) (MO, 2SU, etc..) when
       * both conditions match a given date (this.last.day) iteration stops.
       *
       * @private
       * @param {Boolean=} isInit     When given true will not increment the
       *                                current day (this.last).
       */
      _byDayAndMonthDay(isInit) {
        let byMonthDay;
        let byDay = this.by_data.BYDAY;
        let date;
        let dateIdx = 0;
        let dateLen;
        let dayLen = byDay.length;
        let dataIsValid = 0;
        let daysInMonth;
        let self = this;
        let lastDay = this.last.day;
        function initMonth() {
          daysInMonth = Time.daysInMonth(
            self.last.month,
            self.last.year
          );
          byMonthDay = self.normalizeByMonthDayRules(
            self.last.year,
            self.last.month,
            self.by_data.BYMONTHDAY
          );
          dateLen = byMonthDay.length;
          while (byMonthDay[dateIdx] <= lastDay && !(isInit && byMonthDay[dateIdx] == lastDay) && dateIdx < dateLen - 1) {
            dateIdx++;
          }
        }
        __name(initMonth, "initMonth");
        function nextMonth() {
          lastDay = 0;
          self.increment_month();
          dateIdx = 0;
          initMonth();
        }
        __name(nextMonth, "nextMonth");
        initMonth();
        if (isInit) {
          lastDay -= 1;
        }
        let monthsCounter = 48;
        while (!dataIsValid && monthsCounter) {
          monthsCounter--;
          date = lastDay + 1;
          if (date > daysInMonth) {
            nextMonth();
            continue;
          }
          let next = byMonthDay[dateIdx++];
          if (next >= date) {
            lastDay = next;
          } else {
            nextMonth();
            continue;
          }
          for (let dayIdx = 0; dayIdx < dayLen; dayIdx++) {
            let parts = this.ruleDayOfWeek(byDay[dayIdx]);
            let pos = parts[0];
            let dow = parts[1];
            this.last.day = lastDay;
            if (this.last.isNthWeekDay(dow, pos)) {
              dataIsValid = 1;
              break;
            }
          }
          if (!dataIsValid && dateIdx === dateLen) {
            nextMonth();
            continue;
          }
        }
        if (monthsCounter <= 0) {
          throw new Error("Malformed values in BYDAY combined with BYMONTHDAY parts");
        }
        return dataIsValid;
      }
      next_month() {
        let data_valid = 1;
        if (this.next_hour() == 0) {
          return data_valid;
        }
        if (this.has_by_data("BYDAY") && this.has_by_data("BYMONTHDAY")) {
          data_valid = this._byDayAndMonthDay();
        } else if (this.has_by_data("BYDAY")) {
          let daysInMonth = Time.daysInMonth(this.last.month, this.last.year);
          let setpos = 0;
          let setpos_total = 0;
          if (this.has_by_data("BYSETPOS")) {
            let last_day = this.last.day;
            for (let day3 = 1; day3 <= daysInMonth; day3++) {
              this.last.day = day3;
              if (this.is_day_in_byday(this.last)) {
                setpos_total++;
                if (day3 <= last_day) {
                  setpos++;
                }
              }
            }
            this.last.day = last_day;
          }
          data_valid = 0;
          let day2;
          for (day2 = this.last.day + 1; day2 <= daysInMonth; day2++) {
            this.last.day = day2;
            if (this.is_day_in_byday(this.last)) {
              if (!this.has_by_data("BYSETPOS") || this.check_set_position(++setpos) || this.check_set_position(setpos - setpos_total - 1)) {
                data_valid = 1;
                break;
              }
            }
          }
          if (day2 > daysInMonth) {
            this.last.day = 1;
            this.increment_month();
            if (this.is_day_in_byday(this.last)) {
              if (!this.has_by_data("BYSETPOS") || this.check_set_position(1)) {
                data_valid = 1;
              }
            } else {
              data_valid = 0;
            }
          }
        } else if (this.has_by_data("BYMONTHDAY")) {
          this.by_indices.BYMONTHDAY++;
          if (this.by_indices.BYMONTHDAY >= this.by_data.BYMONTHDAY.length) {
            this.by_indices.BYMONTHDAY = 0;
            this.increment_month();
            if (this.by_indices.BYMONTHDAY >= this.by_data.BYMONTHDAY.length) {
              return 0;
            }
          }
          let daysInMonth = Time.daysInMonth(this.last.month, this.last.year);
          let day2 = this.by_data.BYMONTHDAY[this.by_indices.BYMONTHDAY];
          if (day2 < 0) {
            day2 = daysInMonth + day2 + 1;
          }
          if (day2 > daysInMonth) {
            this.last.day = 1;
            data_valid = this.is_day_in_byday(this.last);
          } else {
            this.last.day = day2;
          }
        } else {
          this.increment_month();
          let daysInMonth = Time.daysInMonth(this.last.month, this.last.year);
          if (this.by_data.BYMONTHDAY[0] > daysInMonth) {
            data_valid = 0;
          } else {
            this.last.day = this.by_data.BYMONTHDAY[0];
          }
        }
        return data_valid;
      }
      next_weekday_by_week() {
        let end_of_data = 0;
        if (this.next_hour() == 0) {
          return end_of_data;
        }
        if (!this.has_by_data("BYDAY")) {
          return 1;
        }
        for (; ; ) {
          let tt = new Time();
          this.by_indices.BYDAY++;
          if (this.by_indices.BYDAY == Object.keys(this.by_data.BYDAY).length) {
            this.by_indices.BYDAY = 0;
            end_of_data = 1;
          }
          let coded_day = this.by_data.BYDAY[this.by_indices.BYDAY];
          let parts = this.ruleDayOfWeek(coded_day);
          let dow = parts[1];
          dow -= this.rule.wkst;
          if (dow < 0) {
            dow += 7;
          }
          tt.year = this.last.year;
          tt.month = this.last.month;
          tt.day = this.last.day;
          let startOfWeek = tt.startDoyWeek(this.rule.wkst);
          if (dow + startOfWeek < 1) {
            if (!end_of_data) {
              continue;
            }
          }
          let next = Time.fromDayOfYear(startOfWeek + dow, this.last.year);
          this.last.year = next.year;
          this.last.month = next.month;
          this.last.day = next.day;
          return end_of_data;
        }
      }
      next_year() {
        if (this.next_hour() == 0) {
          return 0;
        }
        if (this.days.length == 0 || ++this.days_index == this.days.length) {
          this.days_index = 0;
          this.increment_year(this.rule.interval);
          if (this.has_by_data("BYMONTHDAY")) {
            this.by_data.BYMONTHDAY = this.normalizeByMonthDayRules(
              this.last.year,
              this.last.month,
              this.rule.parts.BYMONTHDAY
            );
          }
          this.expand_year_days(this.last.year);
          if (this.days.length == 0) {
            return 0;
          }
        }
        return this._nextByYearDay();
      }
      _nextByYearDay() {
        let doy = this.days[this.days_index];
        let year2 = this.last.year;
        if (Math.abs(doy) == 366 && !Time.isLeapYear(this.last.year)) {
          return 0;
        }
        if (doy < 1) {
          doy += 1;
          year2 += 1;
        }
        let next = Time.fromDayOfYear(doy, year2);
        this.last.day = next.day;
        this.last.month = next.month;
        return 1;
      }
      /**
       * @param dow (eg: '1TU', '-1MO')
       * @param {weekDay=} aWeekStart The week start weekday
       * @return [pos, numericDow] (eg: [1, 3]) numericDow is relative to aWeekStart
       */
      ruleDayOfWeek(dow, aWeekStart) {
        let matches = dow.match(/([+-]?[0-9])?(MO|TU|WE|TH|FR|SA|SU)/);
        if (matches) {
          let pos = parseInt(matches[1] || 0, 10);
          dow = Recur.icalDayToNumericDay(matches[2], aWeekStart);
          return [pos, dow];
        } else {
          return [0, 0];
        }
      }
      next_generic(aRuleType, aInterval, aDateAttr, aFollowingAttr, aPreviousIncr) {
        let has_by_rule = aRuleType in this.by_data;
        let this_freq = this.rule.freq == aInterval;
        let end_of_data = 0;
        if (aPreviousIncr && this[aPreviousIncr]() == 0) {
          return end_of_data;
        }
        if (has_by_rule) {
          this.by_indices[aRuleType]++;
          let dta = this.by_data[aRuleType];
          if (this.by_indices[aRuleType] == dta.length) {
            this.by_indices[aRuleType] = 0;
            end_of_data = 1;
          }
          this.last[aDateAttr] = dta[this.by_indices[aRuleType]];
        } else if (this_freq) {
          this["increment_" + aDateAttr](this.rule.interval);
        }
        if (has_by_rule && end_of_data && this_freq) {
          this["increment_" + aFollowingAttr](1);
        }
        return end_of_data;
      }
      increment_monthday(inc) {
        for (let i = 0; i < inc; i++) {
          let daysInMonth = Time.daysInMonth(this.last.month, this.last.year);
          this.last.day++;
          if (this.last.day > daysInMonth) {
            this.last.day -= daysInMonth;
            this.increment_month();
          }
        }
      }
      increment_month() {
        this.last.day = 1;
        if (this.has_by_data("BYMONTH")) {
          this.by_indices.BYMONTH++;
          if (this.by_indices.BYMONTH == this.by_data.BYMONTH.length) {
            this.by_indices.BYMONTH = 0;
            this.increment_year(1);
          }
          this.last.month = this.by_data.BYMONTH[this.by_indices.BYMONTH];
        } else {
          if (this.rule.freq == "MONTHLY") {
            this.last.month += this.rule.interval;
          } else {
            this.last.month++;
          }
          this.last.month--;
          let years = trunc(this.last.month / 12);
          this.last.month %= 12;
          this.last.month++;
          if (years != 0) {
            this.increment_year(years);
          }
        }
        if (this.has_by_data("BYMONTHDAY")) {
          this.by_data.BYMONTHDAY = this.normalizeByMonthDayRules(
            this.last.year,
            this.last.month,
            this.rule.parts.BYMONTHDAY
          );
        }
      }
      increment_year(inc) {
        this.last.day = 1;
        this.last.year += inc;
      }
      increment_generic(inc, aDateAttr, aFactor, aNextIncrement) {
        this.last[aDateAttr] += inc;
        let nextunit = trunc(this.last[aDateAttr] / aFactor);
        this.last[aDateAttr] %= aFactor;
        if (nextunit != 0) {
          this["increment_" + aNextIncrement](nextunit);
        }
      }
      has_by_data(aRuleType) {
        return aRuleType in this.rule.parts;
      }
      expand_year_days(aYear) {
        let t = new Time();
        this.days = [];
        let parts = {};
        let rules = ["BYDAY", "BYWEEKNO", "BYMONTHDAY", "BYMONTH", "BYYEARDAY"];
        for (let part of rules) {
          if (part in this.rule.parts) {
            parts[part] = this.rule.parts[part];
          }
        }
        if ("BYMONTH" in parts && "BYWEEKNO" in parts) {
          let valid = 1;
          let validWeeks = {};
          t.year = aYear;
          t.isDate = true;
          for (let monthIdx = 0; monthIdx < this.by_data.BYMONTH.length; monthIdx++) {
            let month = this.by_data.BYMONTH[monthIdx];
            t.month = month;
            t.day = 1;
            let first_week = t.weekNumber(this.rule.wkst);
            t.day = Time.daysInMonth(month, aYear);
            let last_week = t.weekNumber(this.rule.wkst);
            for (monthIdx = first_week; monthIdx < last_week; monthIdx++) {
              validWeeks[monthIdx] = 1;
            }
          }
          for (let weekIdx = 0; weekIdx < this.by_data.BYWEEKNO.length && valid; weekIdx++) {
            let weekno = this.by_data.BYWEEKNO[weekIdx];
            if (weekno < 52) {
              valid &= validWeeks[weekIdx];
            } else {
              valid = 0;
            }
          }
          if (valid) {
            delete parts.BYMONTH;
          } else {
            delete parts.BYWEEKNO;
          }
        }
        let partCount = Object.keys(parts).length;
        if (partCount == 0) {
          let t1 = this.dtstart.clone();
          t1.year = this.last.year;
          this.days.push(t1.dayOfYear());
        } else if (partCount == 1 && "BYMONTH" in parts) {
          for (let month of this.by_data.BYMONTH) {
            let t2 = this.dtstart.clone();
            t2.year = aYear;
            t2.month = month;
            t2.isDate = true;
            this.days.push(t2.dayOfYear());
          }
        } else if (partCount == 1 && "BYMONTHDAY" in parts) {
          for (let monthday of this.by_data.BYMONTHDAY) {
            let t3 = this.dtstart.clone();
            if (monthday < 0) {
              let daysInMonth = Time.daysInMonth(t3.month, aYear);
              monthday = monthday + daysInMonth + 1;
            }
            t3.day = monthday;
            t3.year = aYear;
            t3.isDate = true;
            this.days.push(t3.dayOfYear());
          }
        } else if (partCount == 2 && "BYMONTHDAY" in parts && "BYMONTH" in parts) {
          for (let month of this.by_data.BYMONTH) {
            let daysInMonth = Time.daysInMonth(month, aYear);
            for (let monthday of this.by_data.BYMONTHDAY) {
              if (monthday < 0) {
                monthday = monthday + daysInMonth + 1;
              }
              t.day = monthday;
              t.month = month;
              t.year = aYear;
              t.isDate = true;
              this.days.push(t.dayOfYear());
            }
          }
        } else if (partCount == 1 && "BYWEEKNO" in parts) ;
        else if (partCount == 2 && "BYWEEKNO" in parts && "BYMONTHDAY" in parts) ;
        else if (partCount == 1 && "BYDAY" in parts) {
          this.days = this.days.concat(this.expand_by_day(aYear));
        } else if (partCount == 2 && "BYDAY" in parts && "BYMONTH" in parts) {
          for (let month of this.by_data.BYMONTH) {
            let daysInMonth = Time.daysInMonth(month, aYear);
            t.year = aYear;
            t.month = month;
            t.day = 1;
            t.isDate = true;
            let first_dow = t.dayOfWeek();
            let doy_offset = t.dayOfYear() - 1;
            t.day = daysInMonth;
            let last_dow = t.dayOfWeek();
            if (this.has_by_data("BYSETPOS")) {
              let by_month_day = [];
              for (let day2 = 1; day2 <= daysInMonth; day2++) {
                t.day = day2;
                if (this.is_day_in_byday(t)) {
                  by_month_day.push(day2);
                }
              }
              for (let spIndex = 0; spIndex < by_month_day.length; spIndex++) {
                if (this.check_set_position(spIndex + 1) || this.check_set_position(spIndex - by_month_day.length)) {
                  this.days.push(doy_offset + by_month_day[spIndex]);
                }
              }
            } else {
              for (let coded_day of this.by_data.BYDAY) {
                let bydayParts = this.ruleDayOfWeek(coded_day);
                let pos = bydayParts[0];
                let dow = bydayParts[1];
                let month_day;
                let first_matching_day = (dow + 7 - first_dow) % 7 + 1;
                let last_matching_day = daysInMonth - (last_dow + 7 - dow) % 7;
                if (pos == 0) {
                  for (let day2 = first_matching_day; day2 <= daysInMonth; day2 += 7) {
                    this.days.push(doy_offset + day2);
                  }
                } else if (pos > 0) {
                  month_day = first_matching_day + (pos - 1) * 7;
                  if (month_day <= daysInMonth) {
                    this.days.push(doy_offset + month_day);
                  }
                } else {
                  month_day = last_matching_day + (pos + 1) * 7;
                  if (month_day > 0) {
                    this.days.push(doy_offset + month_day);
                  }
                }
              }
            }
          }
          this.days.sort(function(a, b) {
            return a - b;
          });
        } else if (partCount == 2 && "BYDAY" in parts && "BYMONTHDAY" in parts) {
          let expandedDays = this.expand_by_day(aYear);
          for (let day2 of expandedDays) {
            let tt = Time.fromDayOfYear(day2, aYear);
            if (this.by_data.BYMONTHDAY.indexOf(tt.day) >= 0) {
              this.days.push(day2);
            }
          }
        } else if (partCount == 3 && "BYDAY" in parts && "BYMONTHDAY" in parts && "BYMONTH" in parts) {
          let expandedDays = this.expand_by_day(aYear);
          for (let day2 of expandedDays) {
            let tt = Time.fromDayOfYear(day2, aYear);
            if (this.by_data.BYMONTH.indexOf(tt.month) >= 0 && this.by_data.BYMONTHDAY.indexOf(tt.day) >= 0) {
              this.days.push(day2);
            }
          }
        } else if (partCount == 2 && "BYDAY" in parts && "BYWEEKNO" in parts) {
          let expandedDays = this.expand_by_day(aYear);
          for (let day2 of expandedDays) {
            let tt = Time.fromDayOfYear(day2, aYear);
            let weekno = tt.weekNumber(this.rule.wkst);
            if (this.by_data.BYWEEKNO.indexOf(weekno)) {
              this.days.push(day2);
            }
          }
        } else if (partCount == 3 && "BYDAY" in parts && "BYWEEKNO" in parts && "BYMONTHDAY" in parts) ;
        else if (partCount == 1 && "BYYEARDAY" in parts) {
          this.days = this.days.concat(this.by_data.BYYEARDAY);
        } else if (partCount == 2 && "BYYEARDAY" in parts && "BYDAY" in parts) {
          let daysInYear2 = Time.isLeapYear(aYear) ? 366 : 365;
          let expandedDays = new Set(this.expand_by_day(aYear));
          for (let doy of this.by_data.BYYEARDAY) {
            if (doy < 0) {
              doy += daysInYear2 + 1;
            }
            if (expandedDays.has(doy)) {
              this.days.push(doy);
            }
          }
        } else {
          this.days = [];
        }
        let daysInYear = Time.isLeapYear(aYear) ? 366 : 365;
        this.days.sort((a, b) => {
          if (a < 0) a += daysInYear + 1;
          if (b < 0) b += daysInYear + 1;
          return a - b;
        });
        return 0;
      }
      expand_by_day(aYear) {
        let days_list = [];
        let tmp = this.last.clone();
        tmp.year = aYear;
        tmp.month = 1;
        tmp.day = 1;
        tmp.isDate = true;
        let start_dow = tmp.dayOfWeek();
        tmp.month = 12;
        tmp.day = 31;
        tmp.isDate = true;
        let end_dow = tmp.dayOfWeek();
        let end_year_day = tmp.dayOfYear();
        for (let day2 of this.by_data.BYDAY) {
          let parts = this.ruleDayOfWeek(day2);
          let pos = parts[0];
          let dow = parts[1];
          if (pos == 0) {
            let tmp_start_doy = (dow + 7 - start_dow) % 7 + 1;
            for (let doy = tmp_start_doy; doy <= end_year_day; doy += 7) {
              days_list.push(doy);
            }
          } else if (pos > 0) {
            let first;
            if (dow >= start_dow) {
              first = dow - start_dow + 1;
            } else {
              first = dow - start_dow + 8;
            }
            days_list.push(first + (pos - 1) * 7);
          } else {
            let last;
            pos = -pos;
            if (dow <= end_dow) {
              last = end_year_day - end_dow + dow;
            } else {
              last = end_year_day - end_dow + dow - 7;
            }
            days_list.push(last - (pos - 1) * 7);
          }
        }
        return days_list;
      }
      is_day_in_byday(tt) {
        if (this.by_data.BYDAY) {
          for (let day2 of this.by_data.BYDAY) {
            let parts = this.ruleDayOfWeek(day2);
            let pos = parts[0];
            let dow = parts[1];
            let this_dow = tt.dayOfWeek();
            if (pos == 0 && dow == this_dow || tt.nthWeekDay(dow, pos) == tt.day) {
              return 1;
            }
          }
        }
        return 0;
      }
      /**
       * Checks if given value is in BYSETPOS.
       *
       * @private
       * @param {Numeric} aPos position to check for.
       * @return {Boolean} false unless BYSETPOS rules exist
       *                   and the given value is present in rules.
       */
      check_set_position(aPos) {
        if (this.has_by_data("BYSETPOS")) {
          let idx = this.by_data.BYSETPOS.indexOf(aPos);
          return idx !== -1;
        }
        return false;
      }
      sort_byday_rules(aRules) {
        for (let i = 0; i < aRules.length; i++) {
          for (let j = 0; j < i; j++) {
            let one = this.ruleDayOfWeek(aRules[j], this.rule.wkst)[1];
            let two = this.ruleDayOfWeek(aRules[i], this.rule.wkst)[1];
            if (one > two) {
              let tmp = aRules[i];
              aRules[i] = aRules[j];
              aRules[j] = tmp;
            }
          }
        }
      }
      check_contract_restriction(aRuleType, v) {
        let indexMapValue = _RecurIterator._indexMap[aRuleType];
        let ruleMapValue = _RecurIterator._expandMap[this.rule.freq][indexMapValue];
        let pass = false;
        if (aRuleType in this.by_data && ruleMapValue == _RecurIterator.CONTRACT) {
          let ruleType = this.by_data[aRuleType];
          for (let bydata of ruleType) {
            if (bydata == v) {
              pass = true;
              break;
            }
          }
        } else {
          pass = true;
        }
        return pass;
      }
      check_contracting_rules() {
        let dow = this.last.dayOfWeek();
        let weekNo = this.last.weekNumber(this.rule.wkst);
        let doy = this.last.dayOfYear();
        return this.check_contract_restriction("BYSECOND", this.last.second) && this.check_contract_restriction("BYMINUTE", this.last.minute) && this.check_contract_restriction("BYHOUR", this.last.hour) && this.check_contract_restriction("BYDAY", Recur.numericDayToIcalDay(dow)) && this.check_contract_restriction("BYWEEKNO", weekNo) && this.check_contract_restriction("BYMONTHDAY", this.last.day) && this.check_contract_restriction("BYMONTH", this.last.month) && this.check_contract_restriction("BYYEARDAY", doy);
      }
      setup_defaults(aRuleType, req, deftime) {
        let indexMapValue = _RecurIterator._indexMap[aRuleType];
        let ruleMapValue = _RecurIterator._expandMap[this.rule.freq][indexMapValue];
        if (ruleMapValue != _RecurIterator.CONTRACT) {
          if (!(aRuleType in this.by_data)) {
            this.by_data[aRuleType] = [deftime];
          }
          if (this.rule.freq != req) {
            return this.by_data[aRuleType][0];
          }
        }
        return deftime;
      }
      /**
       * Convert iterator into a serialize-able object.  Will preserve current
       * iteration sequence to ensure the seamless continuation of the recurrence
       * rule.
       * @return {Object}
       */
      toJSON() {
        let result = /* @__PURE__ */ Object.create(null);
        result.initialized = this.initialized;
        result.rule = this.rule.toJSON();
        result.dtstart = this.dtstart.toJSON();
        result.by_data = this.by_data;
        result.days = this.days;
        result.last = this.last.toJSON();
        result.by_indices = this.by_indices;
        result.occurrence_number = this.occurrence_number;
        return result;
      }
    };
    InvalidRecurrenceRuleError = class extends Error {
      static {
        __name(this, "InvalidRecurrenceRuleError");
      }
      constructor() {
        super("Recurrence rule has no valid occurrences");
      }
    };
    VALID_DAY_NAMES = /^(SU|MO|TU|WE|TH|FR|SA)$/;
    VALID_BYDAY_PART = /^([+-])?(5[0-3]|[1-4][0-9]|[1-9])?(SU|MO|TU|WE|TH|FR|SA)$/;
    DOW_MAP = {
      SU: Time.SUNDAY,
      MO: Time.MONDAY,
      TU: Time.TUESDAY,
      WE: Time.WEDNESDAY,
      TH: Time.THURSDAY,
      FR: Time.FRIDAY,
      SA: Time.SATURDAY
    };
    REVERSE_DOW_MAP = Object.fromEntries(Object.entries(DOW_MAP).map((entry) => entry.reverse()));
    ALLOWED_FREQ = [
      "SECONDLY",
      "MINUTELY",
      "HOURLY",
      "DAILY",
      "WEEKLY",
      "MONTHLY",
      "YEARLY"
    ];
    Recur = class _Recur {
      static {
        __name(this, "Recur");
      }
      /**
       * Creates a new {@link ICAL.Recur} instance from the passed string.
       *
       * @param {String} string         The string to parse
       * @return {Recur}                The created recurrence instance
       */
      static fromString(string) {
        let data = this._stringToData(string, false);
        return new _Recur(data);
      }
      /**
       * Creates a new {@link ICAL.Recur} instance using members from the passed
       * data object.
       *
       * @param {Object} aData                              An object with members of the recurrence
       * @param {frequencyValues=} aData.freq               The frequency value
       * @param {Number=} aData.interval                    The INTERVAL value
       * @param {weekDay=} aData.wkst                       The week start value
       * @param {Time=} aData.until                         The end of the recurrence set
       * @param {Number=} aData.count                       The number of occurrences
       * @param {Array.<Number>=} aData.bysecond            The seconds for the BYSECOND part
       * @param {Array.<Number>=} aData.byminute            The minutes for the BYMINUTE part
       * @param {Array.<Number>=} aData.byhour              The hours for the BYHOUR part
       * @param {Array.<String>=} aData.byday               The BYDAY values
       * @param {Array.<Number>=} aData.bymonthday          The days for the BYMONTHDAY part
       * @param {Array.<Number>=} aData.byyearday           The days for the BYYEARDAY part
       * @param {Array.<Number>=} aData.byweekno            The weeks for the BYWEEKNO part
       * @param {Array.<Number>=} aData.bymonth             The month for the BYMONTH part
       * @param {Array.<Number>=} aData.bysetpos            The positionals for the BYSETPOS part
       */
      static fromData(aData) {
        return new _Recur(aData);
      }
      /**
       * Converts a recurrence string to a data object, suitable for the fromData
       * method.
       *
       * @private
       * @param {String} string     The string to parse
       * @param {Boolean} fmtIcal   If true, the string is considered to be an
       *                              iCalendar string
       * @return {Recur}            The recurrence instance
       */
      static _stringToData(string, fmtIcal) {
        let dict = /* @__PURE__ */ Object.create(null);
        let values = string.split(";");
        let len = values.length;
        for (let i = 0; i < len; i++) {
          let parts = values[i].split("=");
          let ucname = parts[0].toUpperCase();
          let lcname = parts[0].toLowerCase();
          let name = fmtIcal ? lcname : ucname;
          let value = parts[1];
          if (ucname in partDesign) {
            let partArr = value.split(",");
            let partSet = /* @__PURE__ */ new Set();
            for (let part of partArr) {
              partSet.add(partDesign[ucname](part));
            }
            partArr = [...partSet];
            dict[name] = partArr.length == 1 ? partArr[0] : partArr;
          } else if (ucname in optionDesign) {
            optionDesign[ucname](value, dict, fmtIcal);
          } else {
            dict[lcname] = value;
          }
        }
        return dict;
      }
      /**
       * Convert an ical representation of a day (SU, MO, etc..)
       * into a numeric value of that day.
       *
       * @param {String} string     The iCalendar day name
       * @param {weekDay=} aWeekStart
       *        The week start weekday, defaults to SUNDAY
       * @return {Number}           Numeric value of given day
       */
      static icalDayToNumericDay(string, aWeekStart) {
        let firstDow = aWeekStart || Time.SUNDAY;
        return (DOW_MAP[string] - firstDow + 7) % 7 + 1;
      }
      /**
       * Convert a numeric day value into its ical representation (SU, MO, etc..)
       *
       * @param {Number} num        Numeric value of given day
       * @param {weekDay=} aWeekStart
       *        The week start weekday, defaults to SUNDAY
       * @return {String}           The ICAL day value, e.g SU,MO,...
       */
      static numericDayToIcalDay(num, aWeekStart) {
        let firstDow = aWeekStart || Time.SUNDAY;
        let dow = num + firstDow - Time.SUNDAY;
        if (dow > 7) {
          dow -= 7;
        }
        return REVERSE_DOW_MAP[dow];
      }
      /**
       * Create a new instance of the Recur class.
       *
       * @param {Object} data                               An object with members of the recurrence
       * @param {frequencyValues=} data.freq                The frequency value
       * @param {Number=} data.interval                     The INTERVAL value
       * @param {weekDay=} data.wkst                        The week start value
       * @param {Time=} data.until                          The end of the recurrence set
       * @param {Number=} data.count                        The number of occurrences
       * @param {Array.<Number>=} data.bysecond             The seconds for the BYSECOND part
       * @param {Array.<Number>=} data.byminute             The minutes for the BYMINUTE part
       * @param {Array.<Number>=} data.byhour               The hours for the BYHOUR part
       * @param {Array.<String>=} data.byday                The BYDAY values
       * @param {Array.<Number>=} data.bymonthday           The days for the BYMONTHDAY part
       * @param {Array.<Number>=} data.byyearday            The days for the BYYEARDAY part
       * @param {Array.<Number>=} data.byweekno             The weeks for the BYWEEKNO part
       * @param {Array.<Number>=} data.bymonth              The month for the BYMONTH part
       * @param {Array.<Number>=} data.bysetpos             The positionals for the BYSETPOS part
       */
      constructor(data) {
        this.wrappedJSObject = this;
        this.parts = {};
        if (data && typeof data === "object") {
          this.fromData(data);
        }
      }
      /**
       * An object holding the BY-parts of the recurrence rule
       * @memberof ICAL.Recur
       * @typedef {Object} byParts
       * @property {Array.<Number>=} BYSECOND            The seconds for the BYSECOND part
       * @property {Array.<Number>=} BYMINUTE            The minutes for the BYMINUTE part
       * @property {Array.<Number>=} BYHOUR              The hours for the BYHOUR part
       * @property {Array.<String>=} BYDAY               The BYDAY values
       * @property {Array.<Number>=} BYMONTHDAY          The days for the BYMONTHDAY part
       * @property {Array.<Number>=} BYYEARDAY           The days for the BYYEARDAY part
       * @property {Array.<Number>=} BYWEEKNO            The weeks for the BYWEEKNO part
       * @property {Array.<Number>=} BYMONTH             The month for the BYMONTH part
       * @property {Array.<Number>=} BYSETPOS            The positionals for the BYSETPOS part
       */
      /**
       * An object holding the BY-parts of the recurrence rule
       * @type {byParts}
       */
      parts = null;
      /**
       * The interval value for the recurrence rule.
       * @type {Number}
       */
      interval = 1;
      /**
       * The week start day
       *
       * @type {weekDay}
       * @default ICAL.Time.MONDAY
       */
      wkst = Time.MONDAY;
      /**
       * The end of the recurrence
       * @type {?Time}
       */
      until = null;
      /**
       * The maximum number of occurrences
       * @type {?Number}
       */
      count = null;
      /**
       * The frequency value.
       * @type {frequencyValues}
       */
      freq = null;
      /**
       * The class identifier.
       * @constant
       * @type {String}
       * @default "icalrecur"
       */
      icalclass = "icalrecur";
      /**
       * The type name, to be used in the jCal object.
       * @constant
       * @type {String}
       * @default "recur"
       */
      icaltype = "recur";
      /**
       * Create a new iterator for this recurrence rule. The passed start date
       * must be the start date of the event, not the start of the range to
       * search in.
       *
       * @example
       * let recur = comp.getFirstPropertyValue('rrule');
       * let dtstart = comp.getFirstPropertyValue('dtstart');
       * let iter = recur.iterator(dtstart);
       * for (let next = iter.next(); next; next = iter.next()) {
       *   if (next.compare(rangeStart) < 0) {
       *     continue;
       *   }
       *   console.log(next.toString());
       * }
       *
       * @param {Time} aStart        The item's start date
       * @return {RecurIterator}     The recurrence iterator
       */
      iterator(aStart) {
        return new RecurIterator({
          rule: this,
          dtstart: aStart
        });
      }
      /**
       * Returns a clone of the recurrence object.
       *
       * @return {Recur}      The cloned object
       */
      clone() {
        return new _Recur(this.toJSON());
      }
      /**
       * Checks if the current rule is finite, i.e. has a count or until part.
       *
       * @return {Boolean}        True, if the rule is finite
       */
      isFinite() {
        return !!(this.count || this.until);
      }
      /**
       * Checks if the current rule has a count part, and not limited by an until
       * part.
       *
       * @return {Boolean}        True, if the rule is by count
       */
      isByCount() {
        return !!(this.count && !this.until);
      }
      /**
       * Adds a component (part) to the recurrence rule. This is not a component
       * in the sense of {@link ICAL.Component}, but a part of the recurrence
       * rule, i.e. BYMONTH.
       *
       * @param {String} aType            The name of the component part
       * @param {Array|String} aValue     The component value
       */
      addComponent(aType, aValue) {
        let ucname = aType.toUpperCase();
        if (ucname in this.parts) {
          this.parts[ucname].push(aValue);
        } else {
          this.parts[ucname] = [aValue];
        }
      }
      /**
       * Sets the component value for the given by-part.
       *
       * @param {String} aType        The component part name
       * @param {Array} aValues       The component values
       */
      setComponent(aType, aValues) {
        this.parts[aType.toUpperCase()] = aValues.slice();
      }
      /**
       * Gets (a copy) of the requested component value.
       *
       * @param {String} aType        The component part name
       * @return {Array}              The component part value
       */
      getComponent(aType) {
        let ucname = aType.toUpperCase();
        return ucname in this.parts ? this.parts[ucname].slice() : [];
      }
      /**
       * Retrieves the next occurrence after the given recurrence id. See the
       * guide on {@tutorial terminology} for more details.
       *
       * NOTE: Currently, this method iterates all occurrences from the start
       * date. It should not be called in a loop for performance reasons. If you
       * would like to get more than one occurrence, you can iterate the
       * occurrences manually, see the example on the
       * {@link ICAL.Recur#iterator iterator} method.
       *
       * @param {Time} aStartTime        The start of the event series
       * @param {Time} aRecurrenceId     The date of the last occurrence
       * @return {Time}                  The next occurrence after
       */
      getNextOccurrence(aStartTime, aRecurrenceId) {
        let iter = this.iterator(aStartTime);
        let next;
        do {
          next = iter.next();
        } while (next && next.compare(aRecurrenceId) <= 0);
        if (next && aRecurrenceId.zone) {
          next.zone = aRecurrenceId.zone;
        }
        return next;
      }
      /**
       * Sets up the current instance using members from the passed data object.
       *
       * @param {Object} data                               An object with members of the recurrence
       * @param {frequencyValues=} data.freq                The frequency value
       * @param {Number=} data.interval                     The INTERVAL value
       * @param {weekDay=} data.wkst                        The week start value
       * @param {Time=} data.until                          The end of the recurrence set
       * @param {Number=} data.count                        The number of occurrences
       * @param {Array.<Number>=} data.bysecond             The seconds for the BYSECOND part
       * @param {Array.<Number>=} data.byminute             The minutes for the BYMINUTE part
       * @param {Array.<Number>=} data.byhour               The hours for the BYHOUR part
       * @param {Array.<String>=} data.byday                The BYDAY values
       * @param {Array.<Number>=} data.bymonthday           The days for the BYMONTHDAY part
       * @param {Array.<Number>=} data.byyearday            The days for the BYYEARDAY part
       * @param {Array.<Number>=} data.byweekno             The weeks for the BYWEEKNO part
       * @param {Array.<Number>=} data.bymonth              The month for the BYMONTH part
       * @param {Array.<Number>=} data.bysetpos             The positionals for the BYSETPOS part
       */
      fromData(data) {
        for (let key in data) {
          let uckey = key.toUpperCase();
          if (uckey in partDesign) {
            if (Array.isArray(data[key])) {
              this.parts[uckey] = data[key];
            } else {
              this.parts[uckey] = [data[key]];
            }
          } else {
            this[key] = data[key];
          }
        }
        if (this.interval && typeof this.interval != "number") {
          optionDesign.INTERVAL(this.interval, this);
        }
        if (this.wkst && typeof this.wkst != "number") {
          this.wkst = _Recur.icalDayToNumericDay(this.wkst);
        }
        if (this.until && !(this.until instanceof Time)) {
          this.until = Time.fromString(this.until);
        }
      }
      /**
       * The jCal representation of this recurrence type.
       * @return {Object}
       */
      toJSON() {
        let res = /* @__PURE__ */ Object.create(null);
        res.freq = this.freq;
        if (this.count) {
          res.count = this.count;
        }
        if (this.interval > 1) {
          res.interval = this.interval;
        }
        for (let [k, kparts] of Object.entries(this.parts)) {
          if (Array.isArray(kparts) && kparts.length == 1) {
            res[k.toLowerCase()] = kparts[0];
          } else {
            res[k.toLowerCase()] = clone2(kparts);
          }
        }
        if (this.until) {
          res.until = this.until.toString();
        }
        if ("wkst" in this && this.wkst !== Time.DEFAULT_WEEK_START) {
          res.wkst = _Recur.numericDayToIcalDay(this.wkst);
        }
        return res;
      }
      /**
       * The string representation of this recurrence rule.
       * @return {String}
       */
      toString() {
        let str = "FREQ=" + this.freq;
        if (this.count) {
          str += ";COUNT=" + this.count;
        }
        if (this.interval > 1) {
          str += ";INTERVAL=" + this.interval;
        }
        for (let [k, v] of Object.entries(this.parts)) {
          str += ";" + k + "=" + v;
        }
        if (this.until) {
          str += ";UNTIL=" + this.until.toICALString();
        }
        if ("wkst" in this && this.wkst !== Time.DEFAULT_WEEK_START) {
          str += ";WKST=" + _Recur.numericDayToIcalDay(this.wkst);
        }
        return str;
      }
    };
    __name(parseNumericValue, "parseNumericValue");
    optionDesign = {
      FREQ: /* @__PURE__ */ __name(function(value, dict, fmtIcal) {
        if (ALLOWED_FREQ.indexOf(value) !== -1) {
          dict.freq = value;
        } else {
          throw new Error(
            'invalid frequency "' + value + '" expected: "' + ALLOWED_FREQ.join(", ") + '"'
          );
        }
      }, "FREQ"),
      COUNT: /* @__PURE__ */ __name(function(value, dict, fmtIcal) {
        dict.count = strictParseInt(value);
      }, "COUNT"),
      INTERVAL: /* @__PURE__ */ __name(function(value, dict, fmtIcal) {
        dict.interval = strictParseInt(value);
        if (dict.interval < 1) {
          dict.interval = 1;
        }
      }, "INTERVAL"),
      UNTIL: /* @__PURE__ */ __name(function(value, dict, fmtIcal) {
        if (value.length > 10) {
          dict.until = design.icalendar.value["date-time"].fromICAL(value);
        } else {
          dict.until = design.icalendar.value.date.fromICAL(value);
        }
        if (!fmtIcal) {
          dict.until = Time.fromString(dict.until);
        }
      }, "UNTIL"),
      WKST: /* @__PURE__ */ __name(function(value, dict, fmtIcal) {
        if (VALID_DAY_NAMES.test(value)) {
          dict.wkst = Recur.icalDayToNumericDay(value);
        } else {
          throw new Error('invalid WKST value "' + value + '"');
        }
      }, "WKST")
    };
    partDesign = {
      BYSECOND: parseNumericValue.bind(void 0, "BYSECOND", 0, 60),
      BYMINUTE: parseNumericValue.bind(void 0, "BYMINUTE", 0, 59),
      BYHOUR: parseNumericValue.bind(void 0, "BYHOUR", 0, 23),
      BYDAY: /* @__PURE__ */ __name(function(value) {
        if (VALID_BYDAY_PART.test(value)) {
          return value;
        } else {
          throw new Error('invalid BYDAY value "' + value + '"');
        }
      }, "BYDAY"),
      BYMONTHDAY: parseNumericValue.bind(void 0, "BYMONTHDAY", -31, 31),
      BYYEARDAY: parseNumericValue.bind(void 0, "BYYEARDAY", -366, 366),
      BYWEEKNO: parseNumericValue.bind(void 0, "BYWEEKNO", -53, 53),
      BYMONTH: parseNumericValue.bind(void 0, "BYMONTH", 1, 12),
      BYSETPOS: parseNumericValue.bind(void 0, "BYSETPOS", -366, 366)
    };
    FROM_ICAL_NEWLINE = /\\\\|\\;|\\,|\\[Nn]/g;
    TO_ICAL_NEWLINE = /\\|;|,|\n/g;
    FROM_VCARD_NEWLINE = /\\\\|\\,|\\[Nn]/g;
    TO_VCARD_NEWLINE = /\\|,|\n/g;
    __name(createTextType, "createTextType");
    DEFAULT_TYPE_TEXT = { defaultType: "text" };
    DEFAULT_TYPE_TEXT_MULTI = { defaultType: "text", multiValue: "," };
    DEFAULT_TYPE_TEXT_STRUCTURED = { defaultType: "text", structuredValue: ";" };
    DEFAULT_TYPE_INTEGER = { defaultType: "integer" };
    DEFAULT_TYPE_DATETIME_DATE = { defaultType: "date-time", allowedTypes: ["date-time", "date"] };
    DEFAULT_TYPE_DATETIME = { defaultType: "date-time" };
    DEFAULT_TYPE_URI = { defaultType: "uri" };
    DEFAULT_TYPE_UTCOFFSET = { defaultType: "utc-offset" };
    DEFAULT_TYPE_RECUR = { defaultType: "recur" };
    DEFAULT_TYPE_DATE_ANDOR_TIME = { defaultType: "date-and-or-time", allowedTypes: ["date-time", "date", "text"] };
    __name(replaceNewlineReplace, "replaceNewlineReplace");
    __name(replaceNewline, "replaceNewline");
    commonProperties = {
      "categories": DEFAULT_TYPE_TEXT_MULTI,
      "url": DEFAULT_TYPE_URI,
      "version": DEFAULT_TYPE_TEXT,
      "uid": DEFAULT_TYPE_TEXT
    };
    commonValues = {
      "boolean": {
        values: ["TRUE", "FALSE"],
        fromICAL: /* @__PURE__ */ __name(function(aValue) {
          switch (aValue) {
            case "TRUE":
              return true;
            case "FALSE":
              return false;
            default:
              return false;
          }
        }, "fromICAL"),
        toICAL: /* @__PURE__ */ __name(function(aValue) {
          if (aValue) {
            return "TRUE";
          }
          return "FALSE";
        }, "toICAL")
      },
      float: {
        matches: /^[+-]?\d+\.\d+$/,
        fromICAL: /* @__PURE__ */ __name(function(aValue) {
          let parsed = parseFloat(aValue);
          if (isStrictlyNaN(parsed)) {
            return 0;
          }
          return parsed;
        }, "fromICAL"),
        toICAL: /* @__PURE__ */ __name(function(aValue) {
          return String(aValue);
        }, "toICAL")
      },
      integer: {
        fromICAL: /* @__PURE__ */ __name(function(aValue) {
          let parsed = parseInt(aValue);
          if (isStrictlyNaN(parsed)) {
            return 0;
          }
          return parsed;
        }, "fromICAL"),
        toICAL: /* @__PURE__ */ __name(function(aValue) {
          return String(aValue);
        }, "toICAL")
      },
      "utc-offset": {
        toICAL: /* @__PURE__ */ __name(function(aValue) {
          if (aValue.length < 7) {
            return aValue.slice(0, 3) + aValue.slice(4, 6);
          } else {
            return aValue.slice(0, 3) + aValue.slice(4, 6) + aValue.slice(7, 9);
          }
        }, "toICAL"),
        fromICAL: /* @__PURE__ */ __name(function(aValue) {
          if (aValue.length < 6) {
            return aValue.slice(0, 3) + ":" + aValue.slice(3, 5);
          } else {
            return aValue.slice(0, 3) + ":" + aValue.slice(3, 5) + ":" + aValue.slice(5, 7);
          }
        }, "fromICAL"),
        decorate: /* @__PURE__ */ __name(function(aValue) {
          return UtcOffset.fromString(aValue);
        }, "decorate"),
        undecorate: /* @__PURE__ */ __name(function(aValue) {
          return aValue.toString();
        }, "undecorate")
      }
    };
    icalParams = {
      // Although the syntax is DQUOTE uri DQUOTE, I don't think we should
      // enforce anything aside from it being a valid content line.
      //
      // At least some params require - if multi values are used - DQUOTEs
      // for each of its values - e.g. delegated-from="uri1","uri2"
      // To indicate this, I introduced the new k/v pair
      // multiValueSeparateDQuote: true
      //
      // "ALTREP": { ... },
      // CN just wants a param-value
      // "CN": { ... }
      "cutype": {
        values: ["INDIVIDUAL", "GROUP", "RESOURCE", "ROOM", "UNKNOWN"],
        allowXName: true,
        allowIanaToken: true
      },
      "delegated-from": {
        valueType: "cal-address",
        multiValue: ",",
        multiValueSeparateDQuote: true
      },
      "delegated-to": {
        valueType: "cal-address",
        multiValue: ",",
        multiValueSeparateDQuote: true
      },
      // "DIR": { ... }, // See ALTREP
      "encoding": {
        values: ["8BIT", "BASE64"]
      },
      // "FMTTYPE": { ... }, // See ALTREP
      "fbtype": {
        values: ["FREE", "BUSY", "BUSY-UNAVAILABLE", "BUSY-TENTATIVE"],
        allowXName: true,
        allowIanaToken: true
      },
      // "LANGUAGE": { ... }, // See ALTREP
      "member": {
        valueType: "cal-address",
        multiValue: ",",
        multiValueSeparateDQuote: true
      },
      "partstat": {
        // TODO These values are actually different per-component
        values: [
          "NEEDS-ACTION",
          "ACCEPTED",
          "DECLINED",
          "TENTATIVE",
          "DELEGATED",
          "COMPLETED",
          "IN-PROCESS"
        ],
        allowXName: true,
        allowIanaToken: true
      },
      "range": {
        values: ["THISANDFUTURE"]
      },
      "related": {
        values: ["START", "END"]
      },
      "reltype": {
        values: ["PARENT", "CHILD", "SIBLING"],
        allowXName: true,
        allowIanaToken: true
      },
      "role": {
        values: [
          "REQ-PARTICIPANT",
          "CHAIR",
          "OPT-PARTICIPANT",
          "NON-PARTICIPANT"
        ],
        allowXName: true,
        allowIanaToken: true
      },
      "rsvp": {
        values: ["TRUE", "FALSE"]
      },
      "sent-by": {
        valueType: "cal-address"
      },
      "tzid": {
        matches: /^\//
      },
      "value": {
        // since the value here is a 'type' lowercase is used.
        values: [
          "binary",
          "boolean",
          "cal-address",
          "date",
          "date-time",
          "duration",
          "float",
          "integer",
          "period",
          "recur",
          "text",
          "time",
          "uri",
          "utc-offset"
        ],
        allowXName: true,
        allowIanaToken: true
      }
    };
    icalValues = extend(commonValues, {
      text: createTextType(FROM_ICAL_NEWLINE, TO_ICAL_NEWLINE),
      uri: {
        // TODO
        /* ... */
      },
      "binary": {
        decorate: /* @__PURE__ */ __name(function(aString) {
          return Binary.fromString(aString);
        }, "decorate"),
        undecorate: /* @__PURE__ */ __name(function(aBinary) {
          return aBinary.toString();
        }, "undecorate")
      },
      "cal-address": {
        // needs to be an uri
      },
      "date": {
        decorate: /* @__PURE__ */ __name(function(aValue, aProp) {
          if (design.strict) {
            return Time.fromDateString(aValue, aProp);
          } else {
            return Time.fromString(aValue, aProp);
          }
        }, "decorate"),
        /**
         * undecorates a time object.
         */
        undecorate: /* @__PURE__ */ __name(function(aValue) {
          return aValue.toString();
        }, "undecorate"),
        fromICAL: /* @__PURE__ */ __name(function(aValue) {
          if (!design.strict && aValue.length >= 15) {
            return icalValues["date-time"].fromICAL(aValue);
          } else {
            return aValue.slice(0, 4) + "-" + aValue.slice(4, 6) + "-" + aValue.slice(6, 8);
          }
        }, "fromICAL"),
        toICAL: /* @__PURE__ */ __name(function(aValue) {
          let len = aValue.length;
          if (len == 10) {
            return aValue.slice(0, 4) + aValue.slice(5, 7) + aValue.slice(8, 10);
          } else if (len >= 19) {
            return icalValues["date-time"].toICAL(aValue);
          } else {
            return aValue;
          }
        }, "toICAL")
      },
      "date-time": {
        fromICAL: /* @__PURE__ */ __name(function(aValue) {
          if (!design.strict && aValue.length == 8) {
            return icalValues.date.fromICAL(aValue);
          } else {
            let result = aValue.slice(0, 4) + "-" + aValue.slice(4, 6) + "-" + aValue.slice(6, 8) + "T" + aValue.slice(9, 11) + ":" + aValue.slice(11, 13) + ":" + aValue.slice(13, 15);
            if (aValue[15] && aValue[15] === "Z") {
              result += "Z";
            }
            return result;
          }
        }, "fromICAL"),
        toICAL: /* @__PURE__ */ __name(function(aValue) {
          let len = aValue.length;
          if (len == 10 && !design.strict) {
            return icalValues.date.toICAL(aValue);
          } else if (len >= 19) {
            let result = aValue.slice(0, 4) + aValue.slice(5, 7) + // grab the (DDTHH) segment
            aValue.slice(8, 13) + // MM
            aValue.slice(14, 16) + // SS
            aValue.slice(17, 19);
            if (aValue[19] && aValue[19] === "Z") {
              result += "Z";
            }
            return result;
          } else {
            return aValue;
          }
        }, "toICAL"),
        decorate: /* @__PURE__ */ __name(function(aValue, aProp) {
          if (design.strict) {
            return Time.fromDateTimeString(aValue, aProp);
          } else {
            return Time.fromString(aValue, aProp);
          }
        }, "decorate"),
        undecorate: /* @__PURE__ */ __name(function(aValue) {
          return aValue.toString();
        }, "undecorate")
      },
      duration: {
        decorate: /* @__PURE__ */ __name(function(aValue) {
          return Duration.fromString(aValue);
        }, "decorate"),
        undecorate: /* @__PURE__ */ __name(function(aValue) {
          return aValue.toString();
        }, "undecorate")
      },
      period: {
        fromICAL: /* @__PURE__ */ __name(function(string) {
          let parts = string.split("/");
          parts[0] = icalValues["date-time"].fromICAL(parts[0]);
          if (!Duration.isValueString(parts[1])) {
            parts[1] = icalValues["date-time"].fromICAL(parts[1]);
          }
          return parts;
        }, "fromICAL"),
        toICAL: /* @__PURE__ */ __name(function(parts) {
          parts = parts.slice();
          if (!design.strict && parts[0].length == 10) {
            parts[0] = icalValues.date.toICAL(parts[0]);
          } else {
            parts[0] = icalValues["date-time"].toICAL(parts[0]);
          }
          if (!Duration.isValueString(parts[1])) {
            if (!design.strict && parts[1].length == 10) {
              parts[1] = icalValues.date.toICAL(parts[1]);
            } else {
              parts[1] = icalValues["date-time"].toICAL(parts[1]);
            }
          }
          return parts.join("/");
        }, "toICAL"),
        decorate: /* @__PURE__ */ __name(function(aValue, aProp) {
          return Period.fromJSON(aValue, aProp, !design.strict);
        }, "decorate"),
        undecorate: /* @__PURE__ */ __name(function(aValue) {
          return aValue.toJSON();
        }, "undecorate")
      },
      recur: {
        fromICAL: /* @__PURE__ */ __name(function(string) {
          return Recur._stringToData(string, true);
        }, "fromICAL"),
        toICAL: /* @__PURE__ */ __name(function(data) {
          let str = "";
          for (let [k, val] of Object.entries(data)) {
            if (k == "until") {
              if (val.length > 10) {
                val = icalValues["date-time"].toICAL(val);
              } else {
                val = icalValues.date.toICAL(val);
              }
            } else if (k == "wkst") {
              if (typeof val === "number") {
                val = Recur.numericDayToIcalDay(val);
              }
            } else if (Array.isArray(val)) {
              val = val.join(",");
            }
            str += k.toUpperCase() + "=" + val + ";";
          }
          return str.slice(0, Math.max(0, str.length - 1));
        }, "toICAL"),
        decorate: /* @__PURE__ */ __name(function decorate(aValue) {
          return Recur.fromData(aValue);
        }, "decorate"),
        undecorate: /* @__PURE__ */ __name(function(aRecur) {
          return aRecur.toJSON();
        }, "undecorate")
      },
      time: {
        fromICAL: /* @__PURE__ */ __name(function(aValue) {
          if (aValue.length < 6) {
            return aValue;
          }
          let result = aValue.slice(0, 2) + ":" + aValue.slice(2, 4) + ":" + aValue.slice(4, 6);
          if (aValue[6] === "Z") {
            result += "Z";
          }
          return result;
        }, "fromICAL"),
        toICAL: /* @__PURE__ */ __name(function(aValue) {
          if (aValue.length < 8) {
            return aValue;
          }
          let result = aValue.slice(0, 2) + aValue.slice(3, 5) + aValue.slice(6, 8);
          if (aValue[8] === "Z") {
            result += "Z";
          }
          return result;
        }, "toICAL")
      }
    });
    icalProperties = extend(commonProperties, {
      "action": DEFAULT_TYPE_TEXT,
      "attach": { defaultType: "uri" },
      "attendee": { defaultType: "cal-address" },
      "calscale": DEFAULT_TYPE_TEXT,
      "class": DEFAULT_TYPE_TEXT,
      "comment": DEFAULT_TYPE_TEXT,
      "completed": DEFAULT_TYPE_DATETIME,
      "contact": DEFAULT_TYPE_TEXT,
      "created": DEFAULT_TYPE_DATETIME,
      "description": DEFAULT_TYPE_TEXT,
      "dtend": DEFAULT_TYPE_DATETIME_DATE,
      "dtstamp": DEFAULT_TYPE_DATETIME,
      "dtstart": DEFAULT_TYPE_DATETIME_DATE,
      "due": DEFAULT_TYPE_DATETIME_DATE,
      "duration": { defaultType: "duration" },
      "exdate": {
        defaultType: "date-time",
        allowedTypes: ["date-time", "date"],
        multiValue: ","
      },
      "exrule": DEFAULT_TYPE_RECUR,
      "freebusy": { defaultType: "period", multiValue: "," },
      "geo": { defaultType: "float", structuredValue: ";" },
      "last-modified": DEFAULT_TYPE_DATETIME,
      "location": DEFAULT_TYPE_TEXT,
      "method": DEFAULT_TYPE_TEXT,
      "organizer": { defaultType: "cal-address" },
      "percent-complete": DEFAULT_TYPE_INTEGER,
      "priority": DEFAULT_TYPE_INTEGER,
      "prodid": DEFAULT_TYPE_TEXT,
      "related-to": DEFAULT_TYPE_TEXT,
      "repeat": DEFAULT_TYPE_INTEGER,
      "rdate": {
        defaultType: "date-time",
        allowedTypes: ["date-time", "date", "period"],
        multiValue: ",",
        detectType: /* @__PURE__ */ __name(function(string) {
          if (string.indexOf("/") !== -1) {
            return "period";
          }
          return string.indexOf("T") === -1 ? "date" : "date-time";
        }, "detectType")
      },
      "recurrence-id": DEFAULT_TYPE_DATETIME_DATE,
      "resources": DEFAULT_TYPE_TEXT_MULTI,
      "request-status": DEFAULT_TYPE_TEXT_STRUCTURED,
      "rrule": DEFAULT_TYPE_RECUR,
      "sequence": DEFAULT_TYPE_INTEGER,
      "status": DEFAULT_TYPE_TEXT,
      "summary": DEFAULT_TYPE_TEXT,
      "transp": DEFAULT_TYPE_TEXT,
      "trigger": { defaultType: "duration", allowedTypes: ["duration", "date-time"] },
      "tzoffsetfrom": DEFAULT_TYPE_UTCOFFSET,
      "tzoffsetto": DEFAULT_TYPE_UTCOFFSET,
      "tzurl": DEFAULT_TYPE_URI,
      "tzid": DEFAULT_TYPE_TEXT,
      "tzname": DEFAULT_TYPE_TEXT
    });
    vcardValues = extend(commonValues, {
      text: createTextType(FROM_VCARD_NEWLINE, TO_VCARD_NEWLINE),
      uri: createTextType(FROM_VCARD_NEWLINE, TO_VCARD_NEWLINE),
      date: {
        decorate: /* @__PURE__ */ __name(function(aValue) {
          return VCardTime.fromDateAndOrTimeString(aValue, "date");
        }, "decorate"),
        undecorate: /* @__PURE__ */ __name(function(aValue) {
          return aValue.toString();
        }, "undecorate"),
        fromICAL: /* @__PURE__ */ __name(function(aValue) {
          if (aValue.length == 8) {
            return icalValues.date.fromICAL(aValue);
          } else if (aValue[0] == "-" && aValue.length == 6) {
            return aValue.slice(0, 4) + "-" + aValue.slice(4);
          } else {
            return aValue;
          }
        }, "fromICAL"),
        toICAL: /* @__PURE__ */ __name(function(aValue) {
          if (aValue.length == 10) {
            return icalValues.date.toICAL(aValue);
          } else if (aValue[0] == "-" && aValue.length == 7) {
            return aValue.slice(0, 4) + aValue.slice(5);
          } else {
            return aValue;
          }
        }, "toICAL")
      },
      time: {
        decorate: /* @__PURE__ */ __name(function(aValue) {
          return VCardTime.fromDateAndOrTimeString("T" + aValue, "time");
        }, "decorate"),
        undecorate: /* @__PURE__ */ __name(function(aValue) {
          return aValue.toString();
        }, "undecorate"),
        fromICAL: /* @__PURE__ */ __name(function(aValue) {
          let splitzone = vcardValues.time._splitZone(aValue, true);
          let zone = splitzone[0], value = splitzone[1];
          if (value.length == 6) {
            value = value.slice(0, 2) + ":" + value.slice(2, 4) + ":" + value.slice(4, 6);
          } else if (value.length == 4 && value[0] != "-") {
            value = value.slice(0, 2) + ":" + value.slice(2, 4);
          } else if (value.length == 5) {
            value = value.slice(0, 3) + ":" + value.slice(3, 5);
          }
          if (zone.length == 5 && (zone[0] == "-" || zone[0] == "+")) {
            zone = zone.slice(0, 3) + ":" + zone.slice(3);
          }
          return value + zone;
        }, "fromICAL"),
        toICAL: /* @__PURE__ */ __name(function(aValue) {
          let splitzone = vcardValues.time._splitZone(aValue);
          let zone = splitzone[0], value = splitzone[1];
          if (value.length == 8) {
            value = value.slice(0, 2) + value.slice(3, 5) + value.slice(6, 8);
          } else if (value.length == 5 && value[0] != "-") {
            value = value.slice(0, 2) + value.slice(3, 5);
          } else if (value.length == 6) {
            value = value.slice(0, 3) + value.slice(4, 6);
          }
          if (zone.length == 6 && (zone[0] == "-" || zone[0] == "+")) {
            zone = zone.slice(0, 3) + zone.slice(4);
          }
          return value + zone;
        }, "toICAL"),
        _splitZone: /* @__PURE__ */ __name(function(aValue, isFromIcal) {
          let lastChar = aValue.length - 1;
          let signChar = aValue.length - (isFromIcal ? 5 : 6);
          let sign = aValue[signChar];
          let zone, value;
          if (aValue[lastChar] == "Z") {
            zone = aValue[lastChar];
            value = aValue.slice(0, Math.max(0, lastChar));
          } else if (aValue.length > 6 && (sign == "-" || sign == "+")) {
            zone = aValue.slice(signChar);
            value = aValue.slice(0, Math.max(0, signChar));
          } else {
            zone = "";
            value = aValue;
          }
          return [zone, value];
        }, "_splitZone")
      },
      "date-time": {
        decorate: /* @__PURE__ */ __name(function(aValue) {
          return VCardTime.fromDateAndOrTimeString(aValue, "date-time");
        }, "decorate"),
        undecorate: /* @__PURE__ */ __name(function(aValue) {
          return aValue.toString();
        }, "undecorate"),
        fromICAL: /* @__PURE__ */ __name(function(aValue) {
          return vcardValues["date-and-or-time"].fromICAL(aValue);
        }, "fromICAL"),
        toICAL: /* @__PURE__ */ __name(function(aValue) {
          return vcardValues["date-and-or-time"].toICAL(aValue);
        }, "toICAL")
      },
      "date-and-or-time": {
        decorate: /* @__PURE__ */ __name(function(aValue) {
          return VCardTime.fromDateAndOrTimeString(aValue, "date-and-or-time");
        }, "decorate"),
        undecorate: /* @__PURE__ */ __name(function(aValue) {
          return aValue.toString();
        }, "undecorate"),
        fromICAL: /* @__PURE__ */ __name(function(aValue) {
          let parts = aValue.split("T");
          return (parts[0] ? vcardValues.date.fromICAL(parts[0]) : "") + (parts[1] ? "T" + vcardValues.time.fromICAL(parts[1]) : "");
        }, "fromICAL"),
        toICAL: /* @__PURE__ */ __name(function(aValue) {
          let parts = aValue.split("T");
          return vcardValues.date.toICAL(parts[0]) + (parts[1] ? "T" + vcardValues.time.toICAL(parts[1]) : "");
        }, "toICAL")
      },
      timestamp: icalValues["date-time"],
      "language-tag": {
        matches: /^[a-zA-Z0-9-]+$/
        // Could go with a more strict regex here
      },
      "phone-number": {
        fromICAL: /* @__PURE__ */ __name(function(aValue) {
          return Array.from(aValue).filter(function(c) {
            return c === "\\" ? void 0 : c;
          }).join("");
        }, "fromICAL"),
        toICAL: /* @__PURE__ */ __name(function(aValue) {
          return Array.from(aValue).map(function(c) {
            return c === "," || c === ";" ? "\\" + c : c;
          }).join("");
        }, "toICAL")
      }
    });
    vcardParams = {
      "type": {
        valueType: "text",
        multiValue: ","
      },
      "value": {
        // since the value here is a 'type' lowercase is used.
        values: [
          "text",
          "uri",
          "date",
          "time",
          "date-time",
          "date-and-or-time",
          "timestamp",
          "boolean",
          "integer",
          "float",
          "utc-offset",
          "language-tag"
        ],
        allowXName: true,
        allowIanaToken: true
      }
    };
    vcardProperties = extend(commonProperties, {
      "adr": { defaultType: "text", structuredValue: ";", multiValue: "," },
      "anniversary": DEFAULT_TYPE_DATE_ANDOR_TIME,
      "bday": DEFAULT_TYPE_DATE_ANDOR_TIME,
      "caladruri": DEFAULT_TYPE_URI,
      "caluri": DEFAULT_TYPE_URI,
      "clientpidmap": DEFAULT_TYPE_TEXT_STRUCTURED,
      "email": DEFAULT_TYPE_TEXT,
      "fburl": DEFAULT_TYPE_URI,
      "fn": DEFAULT_TYPE_TEXT,
      "gender": DEFAULT_TYPE_TEXT_STRUCTURED,
      "geo": DEFAULT_TYPE_URI,
      "impp": DEFAULT_TYPE_URI,
      "key": DEFAULT_TYPE_URI,
      "kind": DEFAULT_TYPE_TEXT,
      "lang": { defaultType: "language-tag" },
      "logo": DEFAULT_TYPE_URI,
      "member": DEFAULT_TYPE_URI,
      "n": { defaultType: "text", structuredValue: ";", multiValue: "," },
      "nickname": DEFAULT_TYPE_TEXT_MULTI,
      "note": DEFAULT_TYPE_TEXT,
      "org": { defaultType: "text", structuredValue: ";" },
      "photo": DEFAULT_TYPE_URI,
      "related": DEFAULT_TYPE_URI,
      "rev": { defaultType: "timestamp" },
      "role": DEFAULT_TYPE_TEXT,
      "sound": DEFAULT_TYPE_URI,
      "source": DEFAULT_TYPE_URI,
      "tel": { defaultType: "uri", allowedTypes: ["uri", "text"] },
      "title": DEFAULT_TYPE_TEXT,
      "tz": { defaultType: "text", allowedTypes: ["text", "utc-offset", "uri"] },
      "xml": DEFAULT_TYPE_TEXT
    });
    vcard3Values = extend(commonValues, {
      binary: icalValues.binary,
      date: vcardValues.date,
      "date-time": vcardValues["date-time"],
      "phone-number": vcardValues["phone-number"],
      uri: icalValues.uri,
      text: vcardValues.text,
      time: icalValues.time,
      vcard: icalValues.text,
      "utc-offset": {
        toICAL: /* @__PURE__ */ __name(function(aValue) {
          return aValue.slice(0, 7);
        }, "toICAL"),
        fromICAL: /* @__PURE__ */ __name(function(aValue) {
          return aValue.slice(0, 7);
        }, "fromICAL"),
        decorate: /* @__PURE__ */ __name(function(aValue) {
          return UtcOffset.fromString(aValue);
        }, "decorate"),
        undecorate: /* @__PURE__ */ __name(function(aValue) {
          return aValue.toString();
        }, "undecorate")
      }
    });
    vcard3Params = {
      "type": {
        valueType: "text",
        multiValue: ","
      },
      "value": {
        // since the value here is a 'type' lowercase is used.
        values: [
          "text",
          "uri",
          "date",
          "date-time",
          "phone-number",
          "time",
          "boolean",
          "integer",
          "float",
          "utc-offset",
          "vcard",
          "binary"
        ],
        allowXName: true,
        allowIanaToken: true
      }
    };
    vcard3Properties = extend(commonProperties, {
      fn: DEFAULT_TYPE_TEXT,
      n: { defaultType: "text", structuredValue: ";", multiValue: "," },
      nickname: DEFAULT_TYPE_TEXT_MULTI,
      photo: { defaultType: "binary", allowedTypes: ["binary", "uri"] },
      bday: {
        defaultType: "date-time",
        allowedTypes: ["date-time", "date"],
        detectType: /* @__PURE__ */ __name(function(string) {
          return string.indexOf("T") === -1 ? "date" : "date-time";
        }, "detectType")
      },
      adr: { defaultType: "text", structuredValue: ";", multiValue: "," },
      label: DEFAULT_TYPE_TEXT,
      tel: { defaultType: "phone-number" },
      email: DEFAULT_TYPE_TEXT,
      mailer: DEFAULT_TYPE_TEXT,
      tz: { defaultType: "utc-offset", allowedTypes: ["utc-offset", "text"] },
      geo: { defaultType: "float", structuredValue: ";" },
      title: DEFAULT_TYPE_TEXT,
      role: DEFAULT_TYPE_TEXT,
      logo: { defaultType: "binary", allowedTypes: ["binary", "uri"] },
      agent: { defaultType: "vcard", allowedTypes: ["vcard", "text", "uri"] },
      org: DEFAULT_TYPE_TEXT_STRUCTURED,
      note: DEFAULT_TYPE_TEXT_MULTI,
      prodid: DEFAULT_TYPE_TEXT,
      rev: {
        defaultType: "date-time",
        allowedTypes: ["date-time", "date"],
        detectType: /* @__PURE__ */ __name(function(string) {
          return string.indexOf("T") === -1 ? "date" : "date-time";
        }, "detectType")
      },
      "sort-string": DEFAULT_TYPE_TEXT,
      sound: { defaultType: "binary", allowedTypes: ["binary", "uri"] },
      class: DEFAULT_TYPE_TEXT,
      key: { defaultType: "binary", allowedTypes: ["binary", "text"] }
    });
    icalSet = {
      name: "ical",
      value: icalValues,
      param: icalParams,
      property: icalProperties,
      propertyGroups: false
    };
    vcardSet = {
      name: "vcard4",
      value: vcardValues,
      param: vcardParams,
      property: vcardProperties,
      propertyGroups: true
    };
    vcard3Set = {
      name: "vcard3",
      value: vcard3Values,
      param: vcard3Params,
      property: vcard3Properties,
      propertyGroups: true
    };
    design = {
      /**
       * Can be set to false to make the parser more lenient.
       */
      strict: true,
      /**
       * The default set for new properties and components if none is specified.
       * @type {designSet}
       */
      defaultSet: icalSet,
      /**
       * The default type for unknown properties
       * @type {String}
       */
      defaultType: "unknown",
      /**
       * Holds the design set for known top-level components
       *
       * @type {Object}
       * @property {designSet} vcard       vCard VCARD
       * @property {designSet} vevent      iCalendar VEVENT
       * @property {designSet} vtodo       iCalendar VTODO
       * @property {designSet} vjournal    iCalendar VJOURNAL
       * @property {designSet} valarm      iCalendar VALARM
       * @property {designSet} vtimezone   iCalendar VTIMEZONE
       * @property {designSet} daylight    iCalendar DAYLIGHT
       * @property {designSet} standard    iCalendar STANDARD
       *
       * @example
       * let propertyName = 'fn';
       * let componentDesign = ICAL.design.components.vcard;
       * let propertyDetails = componentDesign.property[propertyName];
       * if (propertyDetails.defaultType == 'text') {
       *   // Yep, sure is...
       * }
       */
      components: {
        vcard: vcardSet,
        vcard3: vcard3Set,
        vevent: icalSet,
        vtodo: icalSet,
        vjournal: icalSet,
        valarm: icalSet,
        vtimezone: icalSet,
        daylight: icalSet,
        standard: icalSet
      },
      /**
       * The design set for iCalendar (rfc5545/rfc7265) components.
       * @type {designSet}
       */
      icalendar: icalSet,
      /**
       * The design set for vCard (rfc6350/rfc7095) components.
       * @type {designSet}
       */
      vcard: vcardSet,
      /**
       * The design set for vCard (rfc2425/rfc2426/rfc7095) components.
       * @type {designSet}
       */
      vcard3: vcard3Set,
      /**
       * Gets the design set for the given component name.
       *
       * @param {String} componentName        The name of the component
       * @return {designSet}      The design set for the component
       */
      getDesignSet: /* @__PURE__ */ __name(function(componentName) {
        let isInDesign = componentName && componentName in design.components;
        return isInDesign ? design.components[componentName] : design.defaultSet;
      }, "getDesignSet")
    };
    LINE_ENDING = "\r\n";
    DEFAULT_VALUE_TYPE = "unknown";
    RFC6868_REPLACE_MAP = { '"': "^'", "\n": "^n", "^": "^^" };
    __name(stringify, "stringify");
    stringify.component = function(component, designSet) {
      let name = component[0].toUpperCase();
      let result = "BEGIN:" + name + LINE_ENDING;
      let props = component[1];
      let propIdx = 0;
      let propLen = props.length;
      let designSetName = component[0];
      if (designSetName === "vcard" && component[1].length > 0 && !(component[1][0][0] === "version" && component[1][0][3] === "4.0")) {
        designSetName = "vcard3";
      }
      designSet = designSet || design.getDesignSet(designSetName);
      for (; propIdx < propLen; propIdx++) {
        result += stringify.property(props[propIdx], designSet) + LINE_ENDING;
      }
      let comps = component[2] || [];
      let compIdx = 0;
      let compLen = comps.length;
      for (; compIdx < compLen; compIdx++) {
        result += stringify.component(comps[compIdx], designSet) + LINE_ENDING;
      }
      result += "END:" + name;
      return result;
    };
    stringify.property = function(property, designSet, noFold) {
      let name = property[0].toUpperCase();
      let jsName = property[0];
      let params = property[1];
      if (!designSet) {
        designSet = design.defaultSet;
      }
      let groupName = params.group;
      let line;
      if (designSet.propertyGroups && groupName) {
        line = groupName.toUpperCase() + "." + name;
      } else {
        line = name;
      }
      for (let [paramName, value] of Object.entries(params)) {
        if (designSet.propertyGroups && paramName == "group") {
          continue;
        }
        let paramDesign = designSet.param[paramName];
        let multiValue2 = paramDesign && paramDesign.multiValue;
        if (multiValue2 && Array.isArray(value)) {
          value = value.map(function(val) {
            val = stringify._rfc6868Unescape(val);
            val = stringify.paramPropertyValue(val, paramDesign.multiValueSeparateDQuote);
            return val;
          });
          value = stringify.multiValue(value, multiValue2, "unknown", null, designSet);
        } else {
          value = stringify._rfc6868Unescape(value);
          value = stringify.paramPropertyValue(value);
        }
        line += ";" + paramName.toUpperCase() + "=" + value;
      }
      if (property.length === 3) {
        return line + ":";
      }
      let valueType = property[2];
      let propDetails;
      let multiValue = false;
      let structuredValue = false;
      let isDefault = false;
      if (jsName in designSet.property) {
        propDetails = designSet.property[jsName];
        if ("multiValue" in propDetails) {
          multiValue = propDetails.multiValue;
        }
        if ("structuredValue" in propDetails && Array.isArray(property[3])) {
          structuredValue = propDetails.structuredValue;
        }
        if ("defaultType" in propDetails) {
          if (valueType === propDetails.defaultType) {
            isDefault = true;
          }
        } else {
          if (valueType === DEFAULT_VALUE_TYPE) {
            isDefault = true;
          }
        }
      } else {
        if (valueType === DEFAULT_VALUE_TYPE) {
          isDefault = true;
        }
      }
      if (!isDefault) {
        line += ";VALUE=" + valueType.toUpperCase();
      }
      line += ":";
      if (multiValue && structuredValue) {
        line += stringify.multiValue(
          property[3],
          structuredValue,
          valueType,
          multiValue,
          designSet,
          structuredValue
        );
      } else if (multiValue) {
        line += stringify.multiValue(
          property.slice(3),
          multiValue,
          valueType,
          null,
          designSet,
          false
        );
      } else if (structuredValue) {
        line += stringify.multiValue(
          property[3],
          structuredValue,
          valueType,
          null,
          designSet,
          structuredValue
        );
      } else {
        line += stringify.value(property[3], valueType, designSet, false);
      }
      return noFold ? line : foldline(line);
    };
    stringify.paramPropertyValue = function(value, force) {
      if (!force && value.indexOf(",") === -1 && value.indexOf(":") === -1 && value.indexOf(";") === -1) {
        return value;
      }
      return '"' + value + '"';
    };
    stringify.multiValue = function(values, delim, type, innerMulti, designSet, structuredValue) {
      let result = "";
      let len = values.length;
      let i = 0;
      for (; i < len; i++) {
        if (innerMulti && Array.isArray(values[i])) {
          result += stringify.multiValue(values[i], innerMulti, type, null, designSet, structuredValue);
        } else {
          result += stringify.value(values[i], type, designSet, structuredValue);
        }
        if (i !== len - 1) {
          result += delim;
        }
      }
      return result;
    };
    stringify.value = function(value, type, designSet, structuredValue) {
      if (type in designSet.value && "toICAL" in designSet.value[type]) {
        return designSet.value[type].toICAL(value, structuredValue);
      }
      return value;
    };
    stringify._rfc6868Unescape = function(val) {
      return val.replace(/[\n^"]/g, function(x) {
        return RFC6868_REPLACE_MAP[x];
      });
    };
    NAME_INDEX$1 = 0;
    PROP_INDEX = 1;
    TYPE_INDEX = 2;
    VALUE_INDEX = 3;
    Property = class _Property {
      static {
        __name(this, "Property");
      }
      /**
       * Create an {@link ICAL.Property} by parsing the passed iCalendar string.
       *
       * @param {String} str            The iCalendar string to parse
       * @param {designSet=} designSet  The design data to use for this property
       * @return {Property}             The created iCalendar property
       */
      static fromString(str, designSet) {
        return new _Property(parse2.property(str, designSet));
      }
      /**
       * Creates a new ICAL.Property instance.
       *
       * It is important to note that mutations done in the wrapper directly mutate the jCal object used
       * to initialize.
       *
       * Can also be used to create new properties by passing the name of the property (as a String).
       *
       * @param {Array|String} jCal         Raw jCal representation OR the new name of the property
       * @param {Component=} parent         Parent component
       */
      constructor(jCal, parent) {
        this._parent = parent || null;
        if (typeof jCal === "string") {
          this.jCal = [jCal, {}, design.defaultType];
          this.jCal[TYPE_INDEX] = this.getDefaultType();
        } else {
          this.jCal = jCal;
        }
        this._updateType();
      }
      /**
       * The value type for this property
       * @type {String}
       */
      get type() {
        return this.jCal[TYPE_INDEX];
      }
      /**
       * The name of this property, in lowercase.
       * @type {String}
       */
      get name() {
        return this.jCal[NAME_INDEX$1];
      }
      /**
       * The parent component for this property.
       * @type {Component}
       */
      get parent() {
        return this._parent;
      }
      set parent(p) {
        let designSetChanged = !this._parent || p && p._designSet != this._parent._designSet;
        this._parent = p;
        if (this.type == design.defaultType && designSetChanged) {
          this.jCal[TYPE_INDEX] = this.getDefaultType();
          this._updateType();
        }
      }
      /**
       * The design set for this property, e.g. icalendar vs vcard
       *
       * @type {designSet}
       * @private
       */
      get _designSet() {
        return this.parent ? this.parent._designSet : design.defaultSet;
      }
      /**
       * Updates the type metadata from the current jCal type and design set.
       *
       * @private
       */
      _updateType() {
        let designSet = this._designSet;
        if (this.type in designSet.value) {
          if ("decorate" in designSet.value[this.type]) {
            this.isDecorated = true;
          } else {
            this.isDecorated = false;
          }
          if (this.name in designSet.property) {
            this.isMultiValue = "multiValue" in designSet.property[this.name];
            this.isStructuredValue = "structuredValue" in designSet.property[this.name];
          }
        }
      }
      /**
       * Hydrate a single value. The act of hydrating means turning the raw jCal
       * value into a potentially wrapped object, for example {@link ICAL.Time}.
       *
       * @private
       * @param {Number} index        The index of the value to hydrate
       * @return {?Object}             The decorated value.
       */
      _hydrateValue(index) {
        if (this._values && this._values[index]) {
          return this._values[index];
        }
        if (this.jCal.length <= VALUE_INDEX + index) {
          return null;
        }
        if (this.isDecorated) {
          if (!this._values) {
            this._values = [];
          }
          return this._values[index] = this._decorate(
            this.jCal[VALUE_INDEX + index]
          );
        } else {
          return this.jCal[VALUE_INDEX + index];
        }
      }
      /**
       * Decorate a single value, returning its wrapped object. This is used by
       * the hydrate function to actually wrap the value.
       *
       * @private
       * @param {?} value         The value to decorate
       * @return {Object}         The decorated value
       */
      _decorate(value) {
        return this._designSet.value[this.type].decorate(value, this);
      }
      /**
       * Undecorate a single value, returning its raw jCal data.
       *
       * @private
       * @param {Object} value         The value to undecorate
       * @return {?}                   The undecorated value
       */
      _undecorate(value) {
        return this._designSet.value[this.type].undecorate(value, this);
      }
      /**
       * Sets the value at the given index while also hydrating it. The passed
       * value can either be a decorated or undecorated value.
       *
       * @private
       * @param {?} value             The value to set
       * @param {Number} index        The index to set it at
       */
      _setDecoratedValue(value, index) {
        if (!this._values) {
          this._values = [];
        }
        if (typeof value === "object" && "icaltype" in value) {
          this.jCal[VALUE_INDEX + index] = this._undecorate(value);
          this._values[index] = value;
        } else {
          this.jCal[VALUE_INDEX + index] = value;
          this._values[index] = this._decorate(value);
        }
      }
      /**
       * Gets a parameter on the property.
       *
       * @param {String}        name   Parameter name (lowercase)
       * @return {Array|String}        Parameter value
       */
      getParameter(name) {
        if (name in this.jCal[PROP_INDEX]) {
          return this.jCal[PROP_INDEX][name];
        } else {
          return void 0;
        }
      }
      /**
       * Gets first parameter on the property.
       *
       * @param {String}        name   Parameter name (lowercase)
       * @return {String}        Parameter value
       */
      getFirstParameter(name) {
        let parameters = this.getParameter(name);
        if (Array.isArray(parameters)) {
          return parameters[0];
        }
        return parameters;
      }
      /**
       * Sets a parameter on the property.
       *
       * @param {String}       name     The parameter name
       * @param {Array|String} value    The parameter value
       */
      setParameter(name, value) {
        let lcname = name.toLowerCase();
        if (typeof value === "string" && lcname in this._designSet.param && "multiValue" in this._designSet.param[lcname]) {
          value = [value];
        }
        this.jCal[PROP_INDEX][name] = value;
      }
      /**
       * Removes a parameter
       *
       * @param {String} name     The parameter name
       */
      removeParameter(name) {
        delete this.jCal[PROP_INDEX][name];
      }
      /**
       * Get the default type based on this property's name.
       *
       * @return {String}     The default type for this property
       */
      getDefaultType() {
        let name = this.jCal[NAME_INDEX$1];
        let designSet = this._designSet;
        if (name in designSet.property) {
          let details = designSet.property[name];
          if ("defaultType" in details) {
            return details.defaultType;
          }
        }
        return design.defaultType;
      }
      /**
       * Sets type of property and clears out any existing values of the current
       * type.
       *
       * @param {String} type     New iCAL type (see design.*.values)
       */
      resetType(type) {
        this.removeAllValues();
        this.jCal[TYPE_INDEX] = type;
        this._updateType();
      }
      /**
       * Finds the first property value.
       *
       * @return {Binary | Duration | Period |
       * Recur | Time | UtcOffset | Geo | string | null}         First property value
       */
      getFirstValue() {
        return this._hydrateValue(0);
      }
      /**
       * Gets all values on the property.
       *
       * NOTE: this creates an array during each call.
       *
       * @return {Array}          List of values
       */
      getValues() {
        let len = this.jCal.length - VALUE_INDEX;
        if (len < 1) {
          return [];
        }
        let i = 0;
        let result = [];
        for (; i < len; i++) {
          result[i] = this._hydrateValue(i);
        }
        return result;
      }
      /**
       * Removes all values from this property
       */
      removeAllValues() {
        if (this._values) {
          this._values.length = 0;
        }
        this.jCal.length = 3;
      }
      /**
       * Sets the values of the property.  Will overwrite the existing values.
       * This can only be used for multi-value properties.
       *
       * @param {Array} values    An array of values
       */
      setValues(values) {
        if (!this.isMultiValue) {
          throw new Error(
            this.name + ": does not not support mulitValue.\noverride isMultiValue"
          );
        }
        let len = values.length;
        let i = 0;
        this.removeAllValues();
        if (len > 0 && typeof values[0] === "object" && "icaltype" in values[0]) {
          this.resetType(values[0].icaltype);
        }
        if (this.isDecorated) {
          for (; i < len; i++) {
            this._setDecoratedValue(values[i], i);
          }
        } else {
          for (; i < len; i++) {
            this.jCal[VALUE_INDEX + i] = values[i];
          }
        }
      }
      /**
       * Sets the current value of the property. If this is a multi-value
       * property, all other values will be removed.
       *
       * @param {String|Object} value     New property value.
       */
      setValue(value) {
        this.removeAllValues();
        if (typeof value === "object" && "icaltype" in value) {
          this.resetType(value.icaltype);
        }
        if (this.isDecorated) {
          this._setDecoratedValue(value, 0);
        } else {
          this.jCal[VALUE_INDEX] = value;
        }
      }
      /**
       * Returns the Object representation of this component. The returned object
       * is a live jCal object and should be cloned if modified.
       * @return {Object}
       */
      toJSON() {
        return this.jCal;
      }
      /**
       * The string representation of this component.
       * @return {String}
       */
      toICALString() {
        return stringify.property(
          this.jCal,
          this._designSet,
          true
        );
      }
    };
    NAME_INDEX = 0;
    PROPERTY_INDEX = 1;
    COMPONENT_INDEX = 2;
    PROPERTY_NAME_INDEX = 0;
    PROPERTY_VALUE_INDEX = 3;
    Component = class _Component {
      static {
        __name(this, "Component");
      }
      /**
       * Create an {@link ICAL.Component} by parsing the passed iCalendar string.
       *
       * @param {String} str        The iCalendar string to parse
       */
      static fromString(str) {
        return new _Component(parse2.component(str));
      }
      /**
       * Creates a new Component instance.
       *
       * @param {Array|String} jCal         Raw jCal component data OR name of new
       *                                      component
       * @param {Component=} parent     Parent component to associate
       */
      constructor(jCal, parent) {
        if (typeof jCal === "string") {
          jCal = [jCal, [], []];
        }
        this.jCal = jCal;
        this.parent = parent || null;
        if (!this.parent && this.name === "vcalendar") {
          this._timezoneCache = /* @__PURE__ */ new Map();
        }
      }
      /**
       * Hydrated properties are inserted into the _properties array at the same
       * position as in the jCal array, so it is possible that the array contains
       * undefined values for unhydrdated properties. To avoid iterating the
       * array when checking if all properties have been hydrated, we save the
       * count here.
       *
       * @type {Number}
       * @private
       */
      _hydratedPropertyCount = 0;
      /**
       * The same count as for _hydratedPropertyCount, but for subcomponents
       *
       * @type {Number}
       * @private
       */
      _hydratedComponentCount = 0;
      /**
       * A cache of hydrated time zone objects which may be used by consumers, keyed
       * by time zone ID.
       *
       * @type {Map}
       * @private
       */
      _timezoneCache = null;
      /**
       * @private
       */
      _components = null;
      /**
       * @private
       */
      _properties = null;
      /**
       * The name of this component
       *
       * @type {String}
       */
      get name() {
        return this.jCal[NAME_INDEX];
      }
      /**
       * The design set for this component, e.g. icalendar vs vcard
       *
       * @type {designSet}
       * @private
       */
      get _designSet() {
        let parentDesign = this.parent && this.parent._designSet;
        if (!parentDesign && this.name == "vcard") {
          let versionProp = this.jCal[PROPERTY_INDEX]?.[0];
          if (versionProp && versionProp[PROPERTY_NAME_INDEX] == "version" && versionProp[PROPERTY_VALUE_INDEX] == "3.0") {
            return design.getDesignSet("vcard3");
          }
        }
        return parentDesign || design.getDesignSet(this.name);
      }
      /**
       * @private
       */
      _hydrateComponent(index) {
        if (!this._components) {
          this._components = [];
          this._hydratedComponentCount = 0;
        }
        if (this._components[index]) {
          return this._components[index];
        }
        let comp = new _Component(
          this.jCal[COMPONENT_INDEX][index],
          this
        );
        this._hydratedComponentCount++;
        return this._components[index] = comp;
      }
      /**
       * @private
       */
      _hydrateProperty(index) {
        if (!this._properties) {
          this._properties = [];
          this._hydratedPropertyCount = 0;
        }
        if (this._properties[index]) {
          return this._properties[index];
        }
        let prop = new Property(
          this.jCal[PROPERTY_INDEX][index],
          this
        );
        this._hydratedPropertyCount++;
        return this._properties[index] = prop;
      }
      /**
       * Finds first sub component, optionally filtered by name.
       *
       * @param {String=} name        Optional name to filter by
       * @return {?Component}     The found subcomponent
       */
      getFirstSubcomponent(name) {
        if (name) {
          let i = 0;
          let comps = this.jCal[COMPONENT_INDEX];
          let len = comps.length;
          for (; i < len; i++) {
            if (comps[i][NAME_INDEX] === name) {
              let result = this._hydrateComponent(i);
              return result;
            }
          }
        } else {
          if (this.jCal[COMPONENT_INDEX].length) {
            return this._hydrateComponent(0);
          }
        }
        return null;
      }
      /**
       * Finds all sub components, optionally filtering by name.
       *
       * @param {String=} name            Optional name to filter by
       * @return {Component[]}       The found sub components
       */
      getAllSubcomponents(name) {
        let jCalLen = this.jCal[COMPONENT_INDEX].length;
        let i = 0;
        if (name) {
          let comps = this.jCal[COMPONENT_INDEX];
          let result = [];
          for (; i < jCalLen; i++) {
            if (name === comps[i][NAME_INDEX]) {
              result.push(
                this._hydrateComponent(i)
              );
            }
          }
          return result;
        } else {
          if (!this._components || this._hydratedComponentCount !== jCalLen) {
            for (; i < jCalLen; i++) {
              this._hydrateComponent(i);
            }
          }
          return this._components || [];
        }
      }
      /**
       * Returns true when a named property exists.
       *
       * @param {String} name     The property name
       * @return {Boolean}        True, when property is found
       */
      hasProperty(name) {
        let props = this.jCal[PROPERTY_INDEX];
        let len = props.length;
        let i = 0;
        for (; i < len; i++) {
          if (props[i][NAME_INDEX] === name) {
            return true;
          }
        }
        return false;
      }
      /**
       * Finds the first property, optionally with the given name.
       *
       * @param {String=} name        Lowercase property name
       * @return {?Property}     The found property
       */
      getFirstProperty(name) {
        if (name) {
          let i = 0;
          let props = this.jCal[PROPERTY_INDEX];
          let len = props.length;
          for (; i < len; i++) {
            if (props[i][NAME_INDEX] === name) {
              let result = this._hydrateProperty(i);
              return result;
            }
          }
        } else {
          if (this.jCal[PROPERTY_INDEX].length) {
            return this._hydrateProperty(0);
          }
        }
        return null;
      }
      /**
       * Returns first property's value, if available.
       *
       * @param {String=} name                    Lowercase property name
       * @return {Binary | Duration | Period |
       * Recur | Time | UtcOffset | Geo | string | null}         The found property value.
       */
      getFirstPropertyValue(name) {
        let prop = this.getFirstProperty(name);
        if (prop) {
          return prop.getFirstValue();
        }
        return null;
      }
      /**
       * Get all properties in the component, optionally filtered by name.
       *
       * @param {String=} name        Lowercase property name
       * @return {Property[]}    List of properties
       */
      getAllProperties(name) {
        let jCalLen = this.jCal[PROPERTY_INDEX].length;
        let i = 0;
        if (name) {
          let props = this.jCal[PROPERTY_INDEX];
          let result = [];
          for (; i < jCalLen; i++) {
            if (name === props[i][NAME_INDEX]) {
              result.push(
                this._hydrateProperty(i)
              );
            }
          }
          return result;
        } else {
          if (!this._properties || this._hydratedPropertyCount !== jCalLen) {
            for (; i < jCalLen; i++) {
              this._hydrateProperty(i);
            }
          }
          return this._properties || [];
        }
      }
      /**
       * @private
       */
      _removeObjectByIndex(jCalIndex, cache, index) {
        cache = cache || [];
        if (cache[index]) {
          let obj = cache[index];
          if ("parent" in obj) {
            obj.parent = null;
          }
        }
        cache.splice(index, 1);
        this.jCal[jCalIndex].splice(index, 1);
      }
      /**
       * @private
       */
      _removeObject(jCalIndex, cache, nameOrObject) {
        let i = 0;
        let objects = this.jCal[jCalIndex];
        let len = objects.length;
        let cached = this[cache];
        if (typeof nameOrObject === "string") {
          for (; i < len; i++) {
            if (objects[i][NAME_INDEX] === nameOrObject) {
              this._removeObjectByIndex(jCalIndex, cached, i);
              return true;
            }
          }
        } else if (cached) {
          for (; i < len; i++) {
            if (cached[i] && cached[i] === nameOrObject) {
              this._removeObjectByIndex(jCalIndex, cached, i);
              return true;
            }
          }
        }
        return false;
      }
      /**
       * @private
       */
      _removeAllObjects(jCalIndex, cache, name) {
        let cached = this[cache];
        let objects = this.jCal[jCalIndex];
        let i = objects.length - 1;
        for (; i >= 0; i--) {
          if (!name || objects[i][NAME_INDEX] === name) {
            this._removeObjectByIndex(jCalIndex, cached, i);
          }
        }
      }
      /**
       * Adds a single sub component.
       *
       * @param {Component} component        The component to add
       * @return {Component}                 The passed in component
       */
      addSubcomponent(component) {
        if (!this._components) {
          this._components = [];
          this._hydratedComponentCount = 0;
        }
        if (component.parent) {
          component.parent.removeSubcomponent(component);
        }
        let idx = this.jCal[COMPONENT_INDEX].push(component.jCal);
        this._components[idx - 1] = component;
        this._hydratedComponentCount++;
        component.parent = this;
        return component;
      }
      /**
       * Removes a single component by name or the instance of a specific
       * component.
       *
       * @param {Component|String} nameOrComp    Name of component, or component
       * @return {Boolean}                            True when comp is removed
       */
      removeSubcomponent(nameOrComp) {
        let removed = this._removeObject(COMPONENT_INDEX, "_components", nameOrComp);
        if (removed) {
          this._hydratedComponentCount--;
        }
        return removed;
      }
      /**
       * Removes all components or (if given) all components by a particular
       * name.
       *
       * @param {String=} name            Lowercase component name
       */
      removeAllSubcomponents(name) {
        let removed = this._removeAllObjects(COMPONENT_INDEX, "_components", name);
        this._hydratedComponentCount = 0;
        return removed;
      }
      /**
       * Adds an {@link ICAL.Property} to the component.
       *
       * @param {Property} property      The property to add
       * @return {Property}              The passed in property
       */
      addProperty(property) {
        if (!(property instanceof Property)) {
          throw new TypeError("must be instance of ICAL.Property");
        }
        if (!this._properties) {
          this._properties = [];
          this._hydratedPropertyCount = 0;
        }
        if (property.parent) {
          property.parent.removeProperty(property);
        }
        let idx = this.jCal[PROPERTY_INDEX].push(property.jCal);
        this._properties[idx - 1] = property;
        this._hydratedPropertyCount++;
        property.parent = this;
        return property;
      }
      /**
       * Helper method to add a property with a value to the component.
       *
       * @param {String}               name         Property name to add
       * @param {String|Number|Object} value        Property value
       * @return {Property}                    The created property
       */
      addPropertyWithValue(name, value) {
        let prop = new Property(name);
        prop.setValue(value);
        this.addProperty(prop);
        return prop;
      }
      /**
       * Helper method that will update or create a property of the given name
       * and sets its value. If multiple properties with the given name exist,
       * only the first is updated.
       *
       * @param {String}               name         Property name to update
       * @param {String|Number|Object} value        Property value
       * @return {Property}                    The created property
       */
      updatePropertyWithValue(name, value) {
        let prop = this.getFirstProperty(name);
        if (prop) {
          prop.setValue(value);
        } else {
          prop = this.addPropertyWithValue(name, value);
        }
        return prop;
      }
      /**
       * Removes a single property by name or the instance of the specific
       * property.
       *
       * @param {String|Property} nameOrProp     Property name or instance to remove
       * @return {Boolean}                            True, when deleted
       */
      removeProperty(nameOrProp) {
        let removed = this._removeObject(PROPERTY_INDEX, "_properties", nameOrProp);
        if (removed) {
          this._hydratedPropertyCount--;
        }
        return removed;
      }
      /**
       * Removes all properties associated with this component, optionally
       * filtered by name.
       *
       * @param {String=} name        Lowercase property name
       * @return {Boolean}            True, when deleted
       */
      removeAllProperties(name) {
        let removed = this._removeAllObjects(PROPERTY_INDEX, "_properties", name);
        this._hydratedPropertyCount = 0;
        return removed;
      }
      /**
       * Returns the Object representation of this component. The returned object
       * is a live jCal object and should be cloned if modified.
       * @return {Object}
       */
      toJSON() {
        return this.jCal;
      }
      /**
       * The string representation of this component.
       * @return {String}
       */
      toString() {
        return stringify.component(
          this.jCal,
          this._designSet
        );
      }
      /**
       * Retrieve a time zone definition from the component tree, if any is present.
       * If the tree contains no time zone definitions or the TZID cannot be
       * matched, returns null.
       *
       * @param {String} tzid     The ID of the time zone to retrieve
       * @return {Timezone}  The time zone corresponding to the ID, or null
       */
      getTimeZoneByID(tzid) {
        if (this.parent) {
          return this.parent.getTimeZoneByID(tzid);
        }
        if (!this._timezoneCache) {
          return null;
        }
        if (this._timezoneCache.has(tzid)) {
          return this._timezoneCache.get(tzid);
        }
        const zones2 = this.getAllSubcomponents("vtimezone");
        for (const zone of zones2) {
          if (zone.getFirstProperty("tzid").getFirstValue() === tzid) {
            const hydratedZone = new Timezone({
              component: zone,
              tzid
            });
            this._timezoneCache.set(tzid, hydratedZone);
            return hydratedZone;
          }
        }
        return null;
      }
    };
    RecurExpansion = class {
      static {
        __name(this, "RecurExpansion");
      }
      /**
       * Creates a new ICAL.RecurExpansion instance.
       *
       * The options object can be filled with the specified initial values. It can also contain
       * additional members, as a result of serializing a previous expansion state, as shown in the
       * example.
       *
       * @param {Object} options
       *        Recurrence expansion options
       * @param {Time} options.dtstart
       *        Start time of the event
       * @param {Component=} options.component
       *        Component for expansion, required if not resuming.
       */
      constructor(options) {
        this.ruleDates = [];
        this.exDates = [];
        this.fromData(options);
      }
      /**
       * True when iteration is fully completed.
       * @type {Boolean}
       */
      complete = false;
      /**
       * Array of rrule iterators.
       *
       * @type {RecurIterator[]}
       * @private
       */
      ruleIterators = null;
      /**
       * Array of rdate instances.
       *
       * @type {Time[]}
       * @private
       */
      ruleDates = null;
      /**
       * Array of exdate instances.
       *
       * @type {Time[]}
       * @private
       */
      exDates = null;
      /**
       * Current position in ruleDates array.
       * @type {Number}
       * @private
       */
      ruleDateInc = 0;
      /**
       * Current position in exDates array
       * @type {Number}
       * @private
       */
      exDateInc = 0;
      /**
       * Current negative date.
       *
       * @type {Time}
       * @private
       */
      exDate = null;
      /**
       * Current additional date.
       *
       * @type {Time}
       * @private
       */
      ruleDate = null;
      /**
       * Start date of recurring rules.
       *
       * @type {Time}
       */
      dtstart = null;
      /**
       * Last expanded time
       *
       * @type {Time}
       */
      last = null;
      /**
       * Initialize the recurrence expansion from the data object. The options
       * object may also contain additional members, see the
       * {@link ICAL.RecurExpansion constructor} for more details.
       *
       * @param {Object} options
       *        Recurrence expansion options
       * @param {Time} options.dtstart
       *        Start time of the event
       * @param {Component=} options.component
       *        Component for expansion, required if not resuming.
       */
      fromData(options) {
        let start = formatClassType(options.dtstart, Time);
        if (!start) {
          throw new Error(".dtstart (ICAL.Time) must be given");
        } else {
          this.dtstart = start;
        }
        if (options.component) {
          this._init(options.component);
        } else {
          this.last = formatClassType(options.last, Time) || start.clone();
          if (!options.ruleIterators) {
            throw new Error(".ruleIterators or .component must be given");
          }
          this.ruleIterators = options.ruleIterators.map(function(item) {
            return formatClassType(item, RecurIterator);
          });
          this.ruleDateInc = options.ruleDateInc;
          this.exDateInc = options.exDateInc;
          if (options.ruleDates) {
            this.ruleDates = options.ruleDates.map((item) => formatClassType(item, Time));
            this.ruleDate = this.ruleDates[this.ruleDateInc];
          }
          if (options.exDates) {
            this.exDates = options.exDates.map((item) => formatClassType(item, Time));
            this.exDate = this.exDates[this.exDateInc];
          }
          if (typeof options.complete !== "undefined") {
            this.complete = options.complete;
          }
        }
      }
      /**
       * Compare two ICAL.Time objects.  When the second parameter is a DATE and the first parameter is
       * DATE-TIME, strip the time and compare only the days.
       *
       * @private
       * @param {Time} a   The one object to compare
       * @param {Time} b   The other object to compare
       */
      _compare_special(a, b) {
        if (!a.isDate && b.isDate)
          return new Time({ year: a.year, month: a.month, day: a.day }).compare(b);
        return a.compare(b);
      }
      /**
       * Retrieve the next occurrence in the series.
       * @return {Time}
       */
      next() {
        let iter;
        let next;
        let compare;
        let maxTries = 500;
        let currentTry = 0;
        while (true) {
          if (currentTry++ > maxTries) {
            throw new Error(
              "max tries have occurred, rule may be impossible to fulfill."
            );
          }
          next = this.ruleDate;
          iter = this._nextRecurrenceIter(this.last);
          if (!next && !iter) {
            this.complete = true;
            break;
          }
          if (!next || iter && next.compare(iter.last) > 0) {
            next = iter.last.clone();
            iter.next();
          }
          if (this.ruleDate === next) {
            this._nextRuleDay();
          }
          this.last = next;
          if (this.exDate) {
            compare = this._compare_special(this.last, this.exDate);
            if (compare > 0) {
              this._nextExDay();
            }
            if (compare === 0) {
              this._nextExDay();
              continue;
            }
          }
          return this.last;
        }
      }
      /**
       * Converts object into a serialize-able format. This format can be passed
       * back into the expansion to resume iteration.
       * @return {Object}
       */
      toJSON() {
        function toJSON(item) {
          return item.toJSON();
        }
        __name(toJSON, "toJSON");
        let result = /* @__PURE__ */ Object.create(null);
        result.ruleIterators = this.ruleIterators.map(toJSON);
        if (this.ruleDates) {
          result.ruleDates = this.ruleDates.map(toJSON);
        }
        if (this.exDates) {
          result.exDates = this.exDates.map(toJSON);
        }
        result.ruleDateInc = this.ruleDateInc;
        result.exDateInc = this.exDateInc;
        result.last = this.last.toJSON();
        result.dtstart = this.dtstart.toJSON();
        result.complete = this.complete;
        return result;
      }
      /**
       * Extract all dates from the properties in the given component. The
       * properties will be filtered by the property name.
       *
       * @private
       * @param {Component} component             The component to search in
       * @param {String} propertyName             The property name to search for
       * @return {Time[]}                         The extracted dates.
       */
      _extractDates(component, propertyName) {
        let result = [];
        let props = component.getAllProperties(propertyName);
        for (let i = 0, len = props.length; i < len; i++) {
          for (let prop of props[i].getValues()) {
            let idx = binsearchInsert(
              result,
              prop,
              (a, b) => a.compare(b)
            );
            result.splice(idx, 0, prop);
          }
        }
        return result;
      }
      /**
       * Initialize the recurrence expansion.
       *
       * @private
       * @param {Component} component    The component to initialize from.
       */
      _init(component) {
        this.ruleIterators = [];
        this.last = this.dtstart.clone();
        if (!component.hasProperty("rdate") && !component.hasProperty("rrule") && !component.hasProperty("recurrence-id")) {
          this.ruleDate = this.last.clone();
          this.complete = true;
          return;
        }
        if (component.hasProperty("rdate")) {
          this.ruleDates = this._extractDates(component, "rdate");
          if (this.ruleDates[0] && this.ruleDates[0].compare(this.dtstart) < 0) {
            this.ruleDateInc = 0;
            this.last = this.ruleDates[0].clone();
          } else {
            this.ruleDateInc = binsearchInsert(
              this.ruleDates,
              this.last,
              (a, b) => a.compare(b)
            );
          }
          this.ruleDate = this.ruleDates[this.ruleDateInc];
        }
        if (component.hasProperty("rrule")) {
          let rules = component.getAllProperties("rrule");
          let i = 0;
          let len = rules.length;
          let rule;
          let iter;
          for (; i < len; i++) {
            rule = rules[i].getFirstValue();
            iter = rule.iterator(this.dtstart);
            this.ruleIterators.push(iter);
            iter.next();
          }
        }
        if (component.hasProperty("exdate")) {
          this.exDates = this._extractDates(component, "exdate");
          this.exDateInc = binsearchInsert(
            this.exDates,
            this.last,
            this._compare_special
          );
          this.exDate = this.exDates[this.exDateInc];
        }
      }
      /**
       * Advance to the next exdate
       * @private
       */
      _nextExDay() {
        this.exDate = this.exDates[++this.exDateInc];
      }
      /**
       * Advance to the next rule date
       * @private
       */
      _nextRuleDay() {
        this.ruleDate = this.ruleDates[++this.ruleDateInc];
      }
      /**
       * Find and return the recurrence rule with the most recent event and
       * return it.
       *
       * @private
       * @return {?RecurIterator}    Found iterator.
       */
      _nextRecurrenceIter() {
        let iters = this.ruleIterators;
        if (iters.length === 0) {
          return null;
        }
        let len = iters.length;
        let iter;
        let iterTime;
        let iterIdx = 0;
        let chosenIter;
        for (; iterIdx < len; iterIdx++) {
          iter = iters[iterIdx];
          iterTime = iter.last;
          if (iter.completed) {
            len--;
            if (iterIdx !== 0) {
              iterIdx--;
            }
            iters.splice(iterIdx, 1);
            continue;
          }
          if (!chosenIter || chosenIter.last.compare(iterTime) > 0) {
            chosenIter = iter;
          }
        }
        return chosenIter;
      }
    };
    Event = class _Event {
      static {
        __name(this, "Event");
      }
      /**
       * Creates a new ICAL.Event instance.
       *
       * @param {Component=} component              The ICAL.Component to base this event on
       * @param {Object} [options]                  Options for this event
       * @param {Boolean=} options.strictExceptions  When true, will verify exceptions are related by
       *                                              their UUID
       * @param {Array<Component|Event>=} options.exceptions
       *          Exceptions to this event, either as components or events. If not
       *            specified exceptions will automatically be set in relation of
       *            component's parent
       */
      constructor(component, options) {
        if (!(component instanceof Component)) {
          options = component;
          component = null;
        }
        if (component) {
          this.component = component;
        } else {
          this.component = new Component("vevent");
        }
        this._rangeExceptionCache = /* @__PURE__ */ Object.create(null);
        this.exceptions = /* @__PURE__ */ Object.create(null);
        this.rangeExceptions = [];
        if (options && options.strictExceptions) {
          this.strictExceptions = options.strictExceptions;
        }
        if (options && options.exceptions) {
          options.exceptions.forEach(this.relateException, this);
        } else if (this.component.parent && !this.isRecurrenceException()) {
          this.component.parent.getAllSubcomponents("vevent").forEach(function(event) {
            if (event.hasProperty("recurrence-id")) {
              this.relateException(event);
            }
          }, this);
        }
      }
      static THISANDFUTURE = "THISANDFUTURE";
      /**
       * List of related event exceptions.
       *
       * @type {Event[]}
       */
      exceptions = null;
      /**
       * When true, will verify exceptions are related by their UUID.
       *
       * @type {Boolean}
       */
      strictExceptions = false;
      /**
       * Relates a given event exception to this object.  If the given component
       * does not share the UID of this event it cannot be related and will throw
       * an exception.
       *
       * If this component is an exception it cannot have other exceptions
       * related to it.
       *
       * @param {Component|Event} obj       Component or event
       */
      relateException(obj) {
        if (this.isRecurrenceException()) {
          throw new Error("cannot relate exception to exceptions");
        }
        if (obj instanceof Component) {
          obj = new _Event(obj);
        }
        if (this.strictExceptions && obj.uid !== this.uid) {
          throw new Error("attempted to relate unrelated exception");
        }
        let id = obj.recurrenceId.toString();
        this.exceptions[id] = obj;
        if (obj.modifiesFuture()) {
          let item = [
            obj.recurrenceId.toUnixTime(),
            id
          ];
          let idx = binsearchInsert(
            this.rangeExceptions,
            item,
            compareRangeException
          );
          this.rangeExceptions.splice(idx, 0, item);
        }
      }
      /**
       * Checks if this record is an exception and has the RANGE=THISANDFUTURE
       * value.
       *
       * @return {Boolean}        True, when exception is within range
       */
      modifiesFuture() {
        if (!this.component.hasProperty("recurrence-id")) {
          return false;
        }
        let range = this.component.getFirstProperty("recurrence-id").getParameter("range");
        return range === _Event.THISANDFUTURE;
      }
      /**
       * Finds the range exception nearest to the given date.
       *
       * @param {Time} time   usually an occurrence time of an event
       * @return {?Event}     the related event/exception or null
       */
      findRangeException(time) {
        if (!this.rangeExceptions.length) {
          return null;
        }
        let utc = time.toUnixTime();
        let idx = binsearchInsert(
          this.rangeExceptions,
          [utc],
          compareRangeException
        );
        idx -= 1;
        if (idx < 0) {
          return null;
        }
        let rangeItem = this.rangeExceptions[idx];
        if (utc < rangeItem[0]) {
          return null;
        }
        return rangeItem[1];
      }
      /**
       * Returns the occurrence details based on its start time.  If the
       * occurrence has an exception will return the details for that exception.
       *
       * NOTE: this method is intend to be used in conjunction
       *       with the {@link ICAL.Event#iterator iterator} method.
       *
       * @param {Time} occurrence               time occurrence
       * @return {occurrenceDetails}            Information about the occurrence
       */
      getOccurrenceDetails(occurrence) {
        let id = occurrence.toString();
        let utcId = occurrence.convertToZone(Timezone.utcTimezone).toString();
        let item;
        let result = {
          //XXX: Clone?
          recurrenceId: occurrence
        };
        if (id in this.exceptions) {
          item = result.item = this.exceptions[id];
          result.startDate = item.startDate;
          result.endDate = item.endDate;
          result.item = item;
        } else if (utcId in this.exceptions) {
          item = this.exceptions[utcId];
          result.startDate = item.startDate;
          result.endDate = item.endDate;
          result.item = item;
        } else {
          let rangeExceptionId = this.findRangeException(
            occurrence
          );
          let end;
          if (rangeExceptionId) {
            let exception = this.exceptions[rangeExceptionId];
            result.item = exception;
            let startDiff = this._rangeExceptionCache[rangeExceptionId];
            if (!startDiff) {
              let original = exception.recurrenceId.clone();
              let newStart = exception.startDate.clone();
              original.zone = newStart.zone;
              startDiff = newStart.subtractDate(original);
              this._rangeExceptionCache[rangeExceptionId] = startDiff;
            }
            let start = occurrence.clone();
            start.zone = exception.startDate.zone;
            start.addDuration(startDiff);
            end = start.clone();
            end.addDuration(exception.duration);
            result.startDate = start;
            result.endDate = end;
          } else {
            end = occurrence.clone();
            end.addDuration(this.duration);
            result.endDate = end;
            result.startDate = occurrence;
            result.item = this;
          }
        }
        return result;
      }
      /**
       * Builds a recur expansion instance for a specific point in time (defaults
       * to startDate).
       *
       * @param {Time=} startTime     Starting point for expansion
       * @return {RecurExpansion}    Expansion object
       */
      iterator(startTime) {
        return new RecurExpansion({
          component: this.component,
          dtstart: startTime || this.startDate
        });
      }
      /**
       * Checks if the event is recurring
       *
       * @return {Boolean}        True, if event is recurring
       */
      isRecurring() {
        let comp = this.component;
        return comp.hasProperty("rrule") || comp.hasProperty("rdate");
      }
      /**
       * Checks if the event describes a recurrence exception. See
       * {@tutorial terminology} for details.
       *
       * @return {Boolean}    True, if the event describes a recurrence exception
       */
      isRecurrenceException() {
        return this.component.hasProperty("recurrence-id");
      }
      /**
       * Returns the types of recurrences this event may have.
       *
       * Returned as an object with the following possible keys:
       *
       *    - YEARLY
       *    - MONTHLY
       *    - WEEKLY
       *    - DAILY
       *    - MINUTELY
       *    - SECONDLY
       *
       * @return {Object.<frequencyValues, Boolean>}
       *          Object of recurrence flags
       */
      getRecurrenceTypes() {
        let rules = this.component.getAllProperties("rrule");
        let i = 0;
        let len = rules.length;
        let result = /* @__PURE__ */ Object.create(null);
        for (; i < len; i++) {
          let value = rules[i].getFirstValue();
          result[value.freq] = true;
        }
        return result;
      }
      /**
       * The uid of this event
       * @type {String}
       */
      get uid() {
        return this._firstProp("uid");
      }
      set uid(value) {
        this._setProp("uid", value);
      }
      /**
       * The start date
       * @type {Time}
       */
      get startDate() {
        return this._firstProp("dtstart");
      }
      set startDate(value) {
        this._setTime("dtstart", value);
      }
      /**
       * The end date. This can be the result directly from the property, or the
       * end date calculated from start date and duration. Setting the property
       * will remove any duration properties.
       * @type {Time}
       */
      get endDate() {
        let endDate = this._firstProp("dtend");
        if (!endDate) {
          let duration = this._firstProp("duration");
          endDate = this.startDate.clone();
          if (duration) {
            endDate.addDuration(duration);
          } else if (endDate.isDate) {
            endDate.day += 1;
          }
        }
        return endDate;
      }
      set endDate(value) {
        if (this.component.hasProperty("duration")) {
          this.component.removeProperty("duration");
        }
        this._setTime("dtend", value);
      }
      /**
       * The duration. This can be the result directly from the property, or the
       * duration calculated from start date and end date. Setting the property
       * will remove any `dtend` properties.
       * @type {Duration}
       */
      get duration() {
        let duration = this._firstProp("duration");
        if (!duration) {
          return this.endDate.subtractDateTz(this.startDate);
        }
        return duration;
      }
      set duration(value) {
        if (this.component.hasProperty("dtend")) {
          this.component.removeProperty("dtend");
        }
        this._setProp("duration", value);
      }
      /**
       * The location of the event.
       * @type {String}
       */
      get location() {
        return this._firstProp("location");
      }
      set location(value) {
        this._setProp("location", value);
      }
      /**
       * The attendees in the event
       * @type {Property[]}
       */
      get attendees() {
        return this.component.getAllProperties("attendee");
      }
      /**
       * The event summary
       * @type {String}
       */
      get summary() {
        return this._firstProp("summary");
      }
      set summary(value) {
        this._setProp("summary", value);
      }
      /**
       * The event description.
       * @type {String}
       */
      get description() {
        return this._firstProp("description");
      }
      set description(value) {
        this._setProp("description", value);
      }
      /**
       * The event color from [rfc7986](https://datatracker.ietf.org/doc/html/rfc7986)
       * @type {String}
       */
      get color() {
        return this._firstProp("color");
      }
      set color(value) {
        this._setProp("color", value);
      }
      /**
       * The organizer value as an uri. In most cases this is a mailto: uri, but
       * it can also be something else, like urn:uuid:...
       * @type {String}
       */
      get organizer() {
        return this._firstProp("organizer");
      }
      set organizer(value) {
        this._setProp("organizer", value);
      }
      /**
       * The sequence value for this event. Used for scheduling
       * see {@tutorial terminology}.
       * @type {Number}
       */
      get sequence() {
        return this._firstProp("sequence");
      }
      set sequence(value) {
        this._setProp("sequence", value);
      }
      /**
       * The recurrence id for this event. See {@tutorial terminology} for details.
       * @type {Time}
       */
      get recurrenceId() {
        return this._firstProp("recurrence-id");
      }
      set recurrenceId(value) {
        this._setTime("recurrence-id", value);
      }
      /**
       * Set/update a time property's value.
       * This will also update the TZID of the property.
       *
       * TODO: this method handles the case where we are switching
       * from a known timezone to an implied timezone (one without TZID).
       * This does _not_ handle the case of moving between a known
       *  (by TimezoneService) timezone to an unknown timezone...
       *
       * We will not add/remove/update the VTIMEZONE subcomponents
       *  leading to invalid ICAL data...
       * @private
       * @param {String} propName     The property name
       * @param {Time} time           The time to set
       */
      _setTime(propName, time) {
        let prop = this.component.getFirstProperty(propName);
        if (!prop) {
          prop = new Property(propName);
          this.component.addProperty(prop);
        }
        if (time.zone === Timezone.localTimezone || time.zone === Timezone.utcTimezone) {
          prop.removeParameter("tzid");
        } else {
          prop.setParameter("tzid", time.zone.tzid);
        }
        prop.setValue(time);
      }
      _setProp(name, value) {
        this.component.updatePropertyWithValue(name, value);
      }
      _firstProp(name) {
        return this.component.getFirstPropertyValue(name);
      }
      /**
       * The string representation of this event.
       * @return {String}
       */
      toString() {
        return this.component.toString();
      }
    };
    __name(compareRangeException, "compareRangeException");
    ComponentParser = class {
      static {
        __name(this, "ComponentParser");
      }
      /**
       * Creates a new ICAL.ComponentParser instance.
       *
       * @param {Object=} options                   Component parser options
       * @param {Boolean} options.parseEvent        Whether events should be parsed
       * @param {Boolean} options.parseTimezeone    Whether timezones should be parsed
       */
      constructor(options) {
        if (typeof options === "undefined") {
          options = {};
        }
        for (let [key, value] of Object.entries(options)) {
          this[key] = value;
        }
      }
      /**
       * When true, parse events
       *
       * @type {Boolean}
       */
      parseEvent = true;
      /**
       * When true, parse timezones
       *
       * @type {Boolean}
       */
      parseTimezone = true;
      /* SAX like events here for reference */
      /**
       * Fired when parsing is complete
       * @callback
       */
      oncomplete = (
        /* c8 ignore next */
        /* @__PURE__ */ __name(function() {
        }, "oncomplete")
      );
      /**
       * Fired if an error occurs during parsing.
       *
       * @callback
       * @param {Error} err details of error
       */
      onerror = (
        /* c8 ignore next */
        /* @__PURE__ */ __name(function(err) {
        }, "onerror")
      );
      /**
       * Fired when a top level component (VTIMEZONE) is found
       *
       * @callback
       * @param {Timezone} component     Timezone object
       */
      ontimezone = (
        /* c8 ignore next */
        /* @__PURE__ */ __name(function(component) {
        }, "ontimezone")
      );
      /**
       * Fired when a top level component (VEVENT) is found.
       *
       * @callback
       * @param {Event} component    Top level component
       */
      onevent = (
        /* c8 ignore next */
        /* @__PURE__ */ __name(function(component) {
        }, "onevent")
      );
      /**
       * Process a string or parse ical object.  This function itself will return
       * nothing but will start the parsing process.
       *
       * Events must be registered prior to calling this method.
       *
       * @param {Component|String|Object} ical      The component to process,
       *        either in its final form, as a jCal Object, or string representation
       */
      process(ical) {
        if (typeof ical === "string") {
          ical = parse2(ical);
        }
        if (!(ical instanceof Component)) {
          ical = new Component(ical);
        }
        let components = ical.getAllSubcomponents();
        let i = 0;
        let len = components.length;
        let component;
        for (; i < len; i++) {
          component = components[i];
          switch (component.name) {
            case "vtimezone":
              if (this.parseTimezone) {
                let tzid = component.getFirstPropertyValue("tzid");
                if (tzid) {
                  this.ontimezone(new Timezone({
                    tzid,
                    component
                  }));
                }
              }
              break;
            case "vevent":
              if (this.parseEvent) {
                this.onevent(new Event(component));
              }
              break;
            default:
              continue;
          }
        }
        this.oncomplete();
      }
    };
    ICALmodule = {
      /**
       * The number of characters before iCalendar line folding should occur
       * @type {Number}
       * @default 75
       */
      foldLength: 75,
      debug: false,
      /**
       * The character(s) to be used for a newline. The default value is provided by
       * rfc5545.
       * @type {String}
       * @default "\r\n"
       */
      newLineChar: "\r\n",
      Binary,
      Component,
      ComponentParser,
      Duration,
      Event,
      Period,
      Property,
      Recur,
      RecurExpansion,
      RecurIterator,
      Time,
      Timezone,
      TimezoneService,
      UtcOffset,
      VCardTime,
      parse: parse2,
      stringify,
      design,
      helpers
    };
  }
});

// src/calendar/icsNormalize.js
function normalizeIcsText(icsText) {
  let text = icsText.replace(/\uFEFF/g, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  text = text.replace(/\n[ \t]/g, "");
  const fixed = [];
  const propertyLine = /^[A-Za-z0-9-]+(?:;[^:]*)*:/;
  const componentLine = /^(BEGIN|END):/;
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;
    const trimmed = line.trim();
    const isProperty = propertyLine.test(trimmed) || componentLine.test(trimmed);
    if (!isProperty && fixed.length > 0) {
      fixed[fixed.length - 1] += ` ${trimmed}`;
      continue;
    }
    fixed.push(trimmed);
  }
  return `${fixed.join("\r\n")}\r
`;
}
var init_icsNormalize = __esm({
  "src/calendar/icsNormalize.js"() {
    init_modules_watch_stub();
    __name(normalizeIcsText, "normalizeIcsText");
  }
});

// src/calendar/appleIcsExpand.js
function registerIcsTimezones(root) {
  for (const vtimezone of root.getAllSubcomponents("vtimezone")) {
    try {
      const tz = new ICALmodule.Timezone(vtimezone);
      if (!ICALmodule.TimezoneService.has(tz.tzid)) {
        ICALmodule.TimezoneService.register(tz);
      }
    } catch {
    }
  }
}
function getEventTimes(eventLike) {
  const startTime = eventLike.startDate.toJSDate().getTime();
  let endTime = eventLike.endDate.toJSDate().getTime();
  if (eventLike.endDate.isDate && endTime > startTime) {
    endTime -= 1;
  }
  return { startTime, endTime };
}
function isWithinRange(startTime, endTime, after, before) {
  return (!after || endTime >= after.getTime()) && (!before || startTime <= before.getTime());
}
function expandIcsComponentBetween(root, after, before) {
  registerIcsTimezones(root);
  const events = [];
  const occurrences = [];
  const parsed = root.getAllSubcomponents("vevent").map((vevent) => new ICALmodule.Event(vevent));
  const exceptions = parsed.filter((event) => event.isRecurrenceException());
  for (const event of parsed) {
    if (event.isRecurrenceException()) continue;
    try {
      event.startDate.toJSDate();
      event.endDate.toJSDate();
    } catch {
      continue;
    }
    if (event.isRecurring()) {
      const exdates = [];
      event.component.getAllProperties("exdate").forEach((prop) => {
        try {
          exdates.push(prop.getFirstValue().toJSDate().getTime());
        } catch {
        }
      });
      const iterator = event.iterator();
      let next;
      let iterations = 0;
      while ((next = iterator.next()) && iterations < MAX_RECURRENCE_ITERATIONS) {
        iterations += 1;
        let occurrence;
        try {
          occurrence = event.getOccurrenceDetails(next);
        } catch {
          continue;
        }
        const { startTime: startTime2, endTime: endTime2 } = getEventTimes(occurrence);
        if (before && startTime2 > before.getTime()) break;
        if (!isWithinRange(startTime2, endTime2, after, before)) continue;
        if (exdates.includes(startTime2)) continue;
        const exception = exceptions.find((ex) => {
          try {
            return ex.uid === event.uid && ex.recurrenceId.toJSDate().getTime() === occurrence.startDate.toJSDate().getTime();
          } catch {
            return false;
          }
        });
        if (exception) {
          events.push(exception);
        } else {
          occurrences.push({
            item: event,
            startDate: occurrence.startDate,
            endDate: occurrence.endDate
          });
        }
      }
      continue;
    }
    const { startTime, endTime } = getEventTimes(event);
    if (isWithinRange(startTime, endTime, after, before)) {
      events.push(event);
    }
  }
  return { events, occurrences };
}
function parseIcsRoot(icsText, after, before) {
  const normalized = normalizeIcsText(icsText);
  const jcal = ICALmodule.parse(normalized);
  const root = new ICALmodule.Component(jcal);
  return expandIcsComponentBetween(root, after, before);
}
var MAX_RECURRENCE_ITERATIONS;
var init_appleIcsExpand = __esm({
  "src/calendar/appleIcsExpand.js"() {
    init_modules_watch_stub();
    init_ical();
    init_icsNormalize();
    MAX_RECURRENCE_ITERATIONS = 5e3;
    __name(registerIcsTimezones, "registerIcsTimezones");
    __name(getEventTimes, "getEventTimes");
    __name(isWithinRange, "isWithinRange");
    __name(expandIcsComponentBetween, "expandIcsComponentBetween");
    __name(parseIcsRoot, "parseIcsRoot");
  }
});

// src/calendar/recurrence.js
function stableEventId(uid, recurrenceId) {
  const base = uid.trim();
  if (!recurrenceId) return base;
  return `${base}#${recurrenceId}`;
}
function isCancelled(eventLike) {
  let status = eventLike.status?.toString?.()?.toLowerCase?.() ?? eventLike.status;
  if (!status && eventLike.component) {
    status = eventLike.component.getFirstPropertyValue("status")?.toString?.()?.toLowerCase?.();
  }
  return status === "cancelled";
}
function isEventRelevantNow(start, end, allDay, asOf, rangeFrom, rangeTo) {
  if (allDay) {
    const startDay = localDateKey(start);
    const endDay = localDateKey(new Date(end.getTime() - 1));
    if (endDay < rangeFrom || startDay > rangeTo) return false;
    const today = localDateKey(asOf);
    return endDay >= today;
  }
  if (end <= asOf) return false;
  return true;
}
function mapSingleEvent(event, asOf, rangeFrom, rangeTo) {
  if (isCancelled(event)) return null;
  const start = event.startDate.toJSDate();
  const end = event.endDate.toJSDate();
  const allDay = Boolean(event.startDate.isDate);
  if (!isEventRelevantNow(start, end, allDay, asOf, rangeFrom, rangeTo)) return null;
  return {
    id: stableEventId(event.uid, null),
    title: (event.summary || "Busy").trim(),
    start: allDay ? `${localDateKey(start)}T00:00:00+00:00` : formatOffsetIso(start),
    end: allDay ? `${localDateKey(new Date(end.getTime() - 1))}T23:59:59+00:00` : formatOffsetIso(end),
    allDay,
    location: event.location?.trim() || null,
    status: "confirmed"
  };
}
function mapOccurrence(occurrence, asOf, rangeFrom, rangeTo) {
  const item = occurrence.item;
  if (isCancelled(item)) return null;
  const start = occurrence.startDate.toJSDate();
  const end = occurrence.endDate.toJSDate();
  const allDay = Boolean(occurrence.startDate.isDate);
  if (!isEventRelevantNow(start, end, allDay, asOf, rangeFrom, rangeTo)) return null;
  const recurrenceId = occurrence.startDate.toICALString();
  return {
    id: stableEventId(item.uid, recurrenceId),
    title: (item.summary || "Busy").trim(),
    start: allDay ? `${localDateKey(start)}T00:00:00+00:00` : formatOffsetIso(start),
    end: allDay ? `${localDateKey(new Date(end.getTime() - 1))}T23:59:59+00:00` : formatOffsetIso(end),
    allDay,
    location: item.location?.trim() || null,
    status: "confirmed"
  };
}
function mapSingleEventSafe(event, asOf, rangeFrom, rangeTo) {
  try {
    return mapSingleEvent(event, asOf, rangeFrom, rangeTo);
  } catch {
    return null;
  }
}
function mapOccurrenceSafe(occurrence, asOf, rangeFrom, rangeTo) {
  try {
    return mapOccurrence(occurrence, asOf, rangeFrom, rangeTo);
  } catch {
    return null;
  }
}
function parseAndExpandIcs(icsText, asOf = /* @__PURE__ */ new Date()) {
  const { startUtc, endUtc, from, to } = rangeBounds(asOf);
  const { events, occurrences } = parseIcsRoot(icsText, startUtc, endUtc);
  const normalized = [];
  for (const event of events) {
    const mapped = mapSingleEventSafe(event, asOf, from, to);
    if (mapped) normalized.push(mapped);
  }
  for (const occurrence of occurrences) {
    const mapped = mapOccurrenceSafe(occurrence, asOf, from, to);
    if (mapped) normalized.push(mapped);
  }
  normalized.sort((left, right) => left.start.localeCompare(right.start));
  const generatedAt = (/* @__PURE__ */ new Date()).toISOString();
  return {
    generatedAt,
    timezone: HOME_TIMEZONE,
    range: { from, to },
    events: normalized,
    stale: false,
    lastUpdated: generatedAt
  };
}
var init_recurrence = __esm({
  "src/calendar/recurrence.js"() {
    init_modules_watch_stub();
    init_timezone();
    init_appleIcsExpand();
    init_timezone();
    __name(stableEventId, "stableEventId");
    __name(isCancelled, "isCancelled");
    __name(isEventRelevantNow, "isEventRelevantNow");
    __name(mapSingleEvent, "mapSingleEvent");
    __name(mapOccurrence, "mapOccurrence");
    __name(mapSingleEventSafe, "mapSingleEventSafe");
    __name(mapOccurrenceSafe, "mapOccurrenceSafe");
    __name(parseAndExpandIcs, "parseAndExpandIcs");
  }
});

// src/calendar/feedUrl.js
function normalizeAppleCalendarFeedUrl(rawSecret) {
  if (!rawSecret) return null;
  let raw = rawSecret.trim();
  if (!raw) return null;
  if (raw.startsWith('"') && raw.endsWith('"') || raw.startsWith("'") && raw.endsWith("'")) {
    raw = raw.slice(1, -1).trim();
  }
  if (raw.startsWith("webcal://")) {
    raw = `https://${raw.slice("webcal://".length)}`;
  } else if (raw.startsWith("http://")) {
    raw = `https://${raw.slice("http://".length)}`;
  }
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:") return null;
    if (!parsed.hostname) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}
function classifyFetchNetworkError(error) {
  const message2 = error instanceof Error ? error.message : String(error ?? "");
  if (/dns|getaddrinfo|name not resolved/i.test(message2)) return "dns";
  if (/ssl|tls|certificate|cert/i.test(message2)) return "tls";
  if (/redirect/i.test(message2)) return "redirect";
  if (/timeout|timed out/i.test(message2)) return "timeout";
  return "network";
}
function safeFetchErrorDetail(error) {
  if (!(error instanceof Error)) return "fetch_failed";
  return error.message.slice(0, 160);
}
var init_feedUrl = __esm({
  "src/calendar/feedUrl.js"() {
    init_modules_watch_stub();
    __name(normalizeAppleCalendarFeedUrl, "normalizeAppleCalendarFeedUrl");
    __name(classifyFetchNetworkError, "classifyFetchNetworkError");
    __name(safeFetchErrorDetail, "safeFetchErrorDetail");
  }
});

// src/calendar/AppleIcsProvider.js
function createCalendarProvider(env, fetchImpl = fetch) {
  return new AppleIcsProvider(env, fetchImpl);
}
var ICS_FETCH_HEADERS, AppleIcsProvider;
var init_AppleIcsProvider = __esm({
  "src/calendar/AppleIcsProvider.js"() {
    init_modules_watch_stub();
    init_recurrence();
    init_feedUrl();
    ICS_FETCH_HEADERS = {
      Accept: "text/calendar,text/plain,*/*",
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
    };
    AppleIcsProvider = class {
      static {
        __name(this, "AppleIcsProvider");
      }
      /**
       * @param {Record<string, string | undefined>} env
       * @param {typeof fetch} fetchImpl
       */
      constructor(env, fetchImpl = fetch) {
        this.env = env;
        this.fetchImpl = fetchImpl;
      }
      getFeedUrl() {
        return normalizeAppleCalendarFeedUrl(this.env.APPLE_CALENDAR_ICS_URL);
      }
      /**
       * @param {string} url
       */
      async fetchIcsText(url) {
        let lastError;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            const response = await this.fetchImpl(url, {
              method: "GET",
              headers: ICS_FETCH_HEADERS,
              redirect: "follow"
            });
            return response;
          } catch (error) {
            lastError = error;
            if (attempt === 0) {
              await new Promise((resolve) => setTimeout(resolve, 250));
            }
          }
        }
        const detail = safeFetchErrorDetail(lastError);
        const networkReason = classifyFetchNetworkError(lastError);
        console.error(JSON.stringify({ event: "calendar_upstream_network", networkReason, detail }));
        const fetchError = new Error("CALENDAR_UPSTREAM");
        fetchError.code = "CALENDAR_UPSTREAM";
        fetchError.upstreamStatus = 0;
        fetchError.networkReason = networkReason;
        throw fetchError;
      }
      /**
       * @param {Date} [asOf]
       */
      async fetchCalendar(asOf = /* @__PURE__ */ new Date()) {
        try {
          return await this.fetchCalendarInner(asOf);
        } catch (error) {
          if (typeof error?.code === "string") throw error;
          console.error(
            JSON.stringify({
              event: "calendar_unhandled",
              name: error?.name,
              detail: String(error?.message ?? "").slice(0, 160)
            })
          );
          const wrapped = new Error("CALENDAR_RUNTIME");
          wrapped.code = "CALENDAR_RUNTIME";
          throw wrapped;
        }
      }
      /**
       * @param {Date} [asOf]
       */
      async fetchCalendarInner(asOf = /* @__PURE__ */ new Date()) {
        const rawConfigured = Boolean(this.env.APPLE_CALENDAR_ICS_URL?.trim());
        const url = this.getFeedUrl();
        if (!url) {
          const error = new Error(rawConfigured ? "CALENDAR_INVALID_URL" : "CALENDAR_NOT_CONFIGURED");
          error.code = rawConfigured ? "CALENDAR_INVALID_URL" : "CALENDAR_NOT_CONFIGURED";
          throw error;
        }
        const response = await this.fetchIcsText(url);
        if (!response.ok) {
          console.error(JSON.stringify({ event: "calendar_upstream_http", status: response.status }));
          const error = new Error("CALENDAR_UPSTREAM");
          error.code = "CALENDAR_UPSTREAM";
          error.upstreamStatus = response.status;
          throw error;
        }
        const icsText = await response.text();
        if (!icsText.includes("BEGIN:VCALENDAR")) {
          console.error(JSON.stringify({ event: "calendar_upstream_invalid_body" }));
          const error = new Error("CALENDAR_UPSTREAM");
          error.code = "CALENDAR_UPSTREAM";
          error.upstreamStatus = 502;
          throw error;
        }
        try {
          return parseAndExpandIcs(icsText, asOf);
        } catch (parseError) {
          const detail = parseError instanceof Error ? parseError.message.slice(0, 160) : "parse_failed";
          console.error(JSON.stringify({ event: "calendar_parse_failed", detail }));
          const error = new Error("CALENDAR_PARSE");
          error.code = "CALENDAR_PARSE";
          throw error;
        }
      }
    };
    __name(createCalendarProvider, "createCalendarProvider");
  }
});

// src/calendar/calendarService.js
var calendarService_exports = {};
__export(calendarService_exports, {
  getHomeCalendar: () => getHomeCalendar,
  resetCalendarCacheForTests: () => resetCalendarCacheForTests
});
async function getHomeCalendar(env, fetchImpl = fetch, asOf = /* @__PURE__ */ new Date()) {
  const fresh = getFreshCalendarCache();
  if (fresh) {
    return { ...fresh, stale: false };
  }
  const provider = createCalendarProvider(env, fetchImpl);
  try {
    const payload = await provider.fetchCalendar(asOf);
    setCalendarCache(payload);
    return payload;
  } catch (error) {
    if (error?.code === "CALENDAR_NOT_CONFIGURED") {
      throw error;
    }
    const stale = getStaleCalendarCache();
    if (stale) {
      return { ...stale, stale: true };
    }
    throw error;
  }
}
var init_calendarService = __esm({
  "src/calendar/calendarService.js"() {
    init_modules_watch_stub();
    init_calendarCache();
    init_AppleIcsProvider();
    init_calendarCache();
    __name(getHomeCalendar, "getHomeCalendar");
  }
});

// .wrangler/tmp/bundle-mKFrBS/middleware-loader.entry.ts
init_modules_watch_stub();

// .wrangler/tmp/bundle-mKFrBS/middleware-insertion-facade.js
init_modules_watch_stub();

// src/index.js
init_modules_watch_stub();

// src/lib/cors.js
init_modules_watch_stub();
function resolveCorsOrigin(originHeader, allowedOriginsCsv) {
  if (!originHeader) return null;
  const allowed = allowedOriginsCsv.split(",").map((entry) => entry.trim()).filter(Boolean);
  if (allowed.length === 0) return null;
  for (const pattern of allowed) {
    if (pattern === originHeader) return originHeader;
    if (pattern.includes("*")) {
      const regex = new RegExp(`^${pattern.replace(/\./g, "\\.").replace(/\*/g, ".*")}$`);
      if (regex.test(originHeader)) return originHeader;
    }
  }
  return null;
}
__name(resolveCorsOrigin, "resolveCorsOrigin");
function corsHeaders(allowedOrigin) {
  if (!allowedOrigin) return {};
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Correlation-Id, Cf-Access-Jwt-Assertion",
    Vary: "Origin"
  };
}
__name(corsHeaders, "corsHeaders");

// src/lib/securityHeaders.js
init_modules_watch_stub();
function securityHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
  };
}
__name(securityHeaders, "securityHeaders");

// src/routes/health.js
init_modules_watch_stub();
function handleHealth() {
  return Response.json({
    status: "ok",
    service: "lovely-home-hub-api",
    apiVersion: 2
  });
}
__name(handleHealth, "handleHealth");

// src/routes/privateConfigRoute.js
init_modules_watch_stub();

// src/routes/privateConfig.js
init_modules_watch_stub();

// src/lib/hubSecrets.js
init_modules_watch_stub();
var HUB_SECRET_KEYS = (
  /** @type {const} */
  [
    "owner_pin",
    "wifi_ssid",
    "wifi_password",
    "primary_phone",
    "primary_email",
    "secondary_phone",
    "secondary_email",
    "home_address",
    "lockbox_code"
  ]
);
var DEVICE_SESSION_SECRET_KEY = "device_session_secret";
function requireHubDb(db) {
  if (!db) {
    throw new Error("HOUSE_GUIDE_DB is not configured");
  }
  return db;
}
__name(requireHubDb, "requireHubDb");
async function getHubSecretsMap(env) {
  const db = env.HOUSE_GUIDE_DB;
  if (!db) return {};
  const result = await db.prepare(`SELECT key, value FROM hub_secrets`).bind().all();
  const map = {};
  for (const row of result.results ?? []) {
    map[String(row.key)] = String(row.value);
  }
  return map;
}
__name(getHubSecretsMap, "getHubSecretsMap");
async function getHubSecret(env, key) {
  const map = await getHubSecretsMap(env);
  return map[key]?.trim() || "";
}
__name(getHubSecret, "getHubSecret");
async function getHubSecretsStatus(env) {
  const map = await getHubSecretsMap(env);
  const status = {};
  for (const key of HUB_SECRET_KEYS) {
    status[key] = Boolean(map[key]?.trim());
  }
  return status;
}
__name(getHubSecretsStatus, "getHubSecretsStatus");
async function setHubSecrets(env, patch) {
  const db = requireHubDb(env.HOUSE_GUIDE_DB);
  const now = Math.floor(Date.now() / 1e3);
  for (const [key, rawValue] of Object.entries(patch)) {
    if (!HUB_SECRET_KEYS.includes(
      /** @type {HubSecretKey} */
      key
    )) continue;
    const value = String(rawValue ?? "").trim();
    if (!value) {
      await db.prepare(`DELETE FROM hub_secrets WHERE key = ?`).bind(key).run();
      continue;
    }
    await db.prepare(
      `INSERT INTO hub_secrets (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).bind(key, value, now).run();
  }
}
__name(setHubSecrets, "setHubSecrets");
async function setInternalHubSecret(env, key, value) {
  const db = requireHubDb(env.HOUSE_GUIDE_DB);
  const now = Math.floor(Date.now() / 1e3);
  await db.prepare(
    `INSERT INTO hub_secrets (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).bind(key, value, now).run();
}
__name(setInternalHubSecret, "setInternalHubSecret");
function generateRandomSecret(byteLength = 32) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
__name(generateRandomSecret, "generateRandomSecret");
async function getOrCreateDeviceSessionSecret(env) {
  const db = env.HOUSE_GUIDE_DB;
  if (!db) return "";
  const map = await getHubSecretsMap(env);
  const existing = map[DEVICE_SESSION_SECRET_KEY]?.trim();
  if (existing) return existing;
  const secret = generateRandomSecret();
  await setInternalHubSecret(env, DEVICE_SESSION_SECRET_KEY, secret);
  return secret;
}
__name(getOrCreateDeviceSessionSecret, "getOrCreateDeviceSessionSecret");
async function clearHubSecrets(env) {
  const db = requireHubDb(env.HOUSE_GUIDE_DB);
  await db.prepare(`DELETE FROM hub_secrets`).run();
}
__name(clearHubSecrets, "clearHubSecrets");
async function getConfiguredOwnerPin(env) {
  const fromDb = await getHubSecret(env, "owner_pin");
  if (fromDb) return fromDb;
  return env.OWNER_PIN?.trim() || "";
}
__name(getConfiguredOwnerPin, "getConfiguredOwnerPin");

// src/lib/siteProfile.js
init_modules_watch_stub();
var DEFAULT_SITE_PROFILE = {
  onboardingComplete: false,
  hubName: "",
  useCase: "owner",
  primaryContact: { name: "", phone: "", email: "" },
  secondaryContact: { name: "", phone: "", email: "" },
  petCare: {
    hasPets: false,
    name: "",
    species: "",
    age: "",
    temperament: "",
    feeding: "",
    walks: "",
    vet: "",
    vetPhone: "",
    vetEmergency: ""
  }
};
function parseProfilePayload(value) {
  if (!value) return { ...DEFAULT_SITE_PROFILE };
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_SITE_PROFILE };
    return {
      ...DEFAULT_SITE_PROFILE,
      ...parsed,
      primaryContact: { ...DEFAULT_SITE_PROFILE.primaryContact, ...parsed.primaryContact },
      secondaryContact: { ...DEFAULT_SITE_PROFILE.secondaryContact, ...parsed.secondaryContact },
      petCare: { ...DEFAULT_SITE_PROFILE.petCare, ...parsed.petCare }
    };
  } catch {
    return { ...DEFAULT_SITE_PROFILE };
  }
}
__name(parseProfilePayload, "parseProfilePayload");
function requireHubDb2(db) {
  if (!db) {
    throw new Error("HOUSE_GUIDE_DB is not configured");
  }
  return db;
}
__name(requireHubDb2, "requireHubDb");
async function hasSiteProfileRow(env) {
  const db = env.HOUSE_GUIDE_DB;
  if (!db) return false;
  const row = await db.prepare(`SELECT id FROM site_profile WHERE id = ?`).bind("default").first();
  return Boolean(row);
}
__name(hasSiteProfileRow, "hasSiteProfileRow");
async function getSiteProfile(env) {
  const db = env.HOUSE_GUIDE_DB;
  if (!db) return { ...DEFAULT_SITE_PROFILE };
  const row = await db.prepare(`SELECT payload FROM site_profile WHERE id = ?`).bind("default").first();
  return parseProfilePayload(row?.payload);
}
__name(getSiteProfile, "getSiteProfile");
async function updateSiteProfile(env, patch) {
  const db = requireHubDb2(env.HOUSE_GUIDE_DB);
  const current = await getSiteProfile(env);
  const next = {
    ...current,
    ...patch,
    primaryContact: patch.primaryContact ? { ...current.primaryContact, ...patch.primaryContact } : current.primaryContact,
    secondaryContact: patch.secondaryContact ? { ...current.secondaryContact, ...patch.secondaryContact } : current.secondaryContact,
    petCare: patch.petCare ? { ...current.petCare, ...patch.petCare } : current.petCare
  };
  const now = Math.floor(Date.now() / 1e3);
  await db.prepare(
    `INSERT INTO site_profile (id, payload, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`
  ).bind("default", JSON.stringify(next), now).run();
  return next;
}
__name(updateSiteProfile, "updateSiteProfile");
async function resetSiteProfile(env) {
  const db = requireHubDb2(env.HOUSE_GUIDE_DB);
  const now = Math.floor(Date.now() / 1e3);
  await db.prepare(
    `INSERT INTO site_profile (id, payload, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`
  ).bind("default", JSON.stringify(DEFAULT_SITE_PROFILE), now).run();
  return { ...DEFAULT_SITE_PROFILE };
}
__name(resetSiteProfile, "resetSiteProfile");

// src/routes/privateConfig.js
function pickSecret(secrets, key, envValue) {
  const fromDb = secrets[key]?.trim();
  if (fromDb) return fromDb;
  return envValue?.trim() || "";
}
__name(pickSecret, "pickSecret");
async function buildPrivateConfig(env) {
  const [secrets, profile] = await Promise.all([getHubSecretsMap(env), getSiteProfile(env)]);
  const wifiSsid = pickSecret(secrets, "wifi_ssid", env.PRIVATE_WIFI_SSID);
  const wifiPassword = pickSecret(secrets, "wifi_password", env.PRIVATE_WIFI_PASSWORD);
  const primaryPhone = pickSecret(secrets, "primary_phone", env.PRIVATE_MARK_PHONE);
  const primaryEmail = pickSecret(secrets, "primary_email", env.PRIVATE_MARK_EMAIL);
  const secondaryPhone = pickSecret(secrets, "secondary_phone", env.PRIVATE_DONNA_PHONE);
  const secondaryEmail = pickSecret(secrets, "secondary_email", env.PRIVATE_DONNA_EMAIL);
  const homeAddress = pickSecret(secrets, "home_address", env.PRIVATE_HOME_ADDRESS);
  const lockboxCode = pickSecret(secrets, "lockbox_code", env.PRIVATE_LOCKBOX_CODE);
  const primaryName = profile.primaryContact?.name?.trim() || "Primary contact";
  const secondaryName = profile.secondaryContact?.name?.trim() || "Secondary contact";
  const payload = {
    wifi: {},
    contacts: {
      mark: { name: primaryName },
      donna: { name: secondaryName }
    },
    home: {},
    lockbox: {}
  };
  if (wifiSsid) payload.wifi.ssid = wifiSsid;
  if (wifiPassword) payload.wifi.password = wifiPassword;
  if (primaryPhone) payload.contacts.mark.phone = primaryPhone;
  if (primaryEmail) payload.contacts.mark.email = primaryEmail;
  if (secondaryPhone) payload.contacts.donna.phone = secondaryPhone;
  if (secondaryEmail) payload.contacts.donna.email = secondaryEmail;
  if (homeAddress) payload.home.address = homeAddress;
  if (lockboxCode) payload.lockbox.code = lockboxCode;
  return payload;
}
__name(buildPrivateConfig, "buildPrivateConfig");

// src/lib/privateConfigAuth.js
init_modules_watch_stub();

// src/lib/requestAuth.js
init_modules_watch_stub();

// src/lib/accessJwt.js
init_modules_watch_stub();

// node_modules/jose/dist/browser/index.js
init_modules_watch_stub();

// node_modules/jose/dist/browser/runtime/base64url.js
init_modules_watch_stub();

// node_modules/jose/dist/browser/lib/buffer_utils.js
init_modules_watch_stub();

// node_modules/jose/dist/browser/runtime/webcrypto.js
init_modules_watch_stub();
var webcrypto_default = crypto;
var isCryptoKey = /* @__PURE__ */ __name((key) => key instanceof CryptoKey, "isCryptoKey");

// node_modules/jose/dist/browser/lib/buffer_utils.js
var encoder = new TextEncoder();
var decoder = new TextDecoder();
var MAX_INT32 = 2 ** 32;
function concat(...buffers) {
  const size = buffers.reduce((acc, { length }) => acc + length, 0);
  const buf = new Uint8Array(size);
  let i = 0;
  for (const buffer of buffers) {
    buf.set(buffer, i);
    i += buffer.length;
  }
  return buf;
}
__name(concat, "concat");

// node_modules/jose/dist/browser/runtime/base64url.js
var decodeBase64 = /* @__PURE__ */ __name((encoded) => {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}, "decodeBase64");
var decode = /* @__PURE__ */ __name((input) => {
  let encoded = input;
  if (encoded instanceof Uint8Array) {
    encoded = decoder.decode(encoded);
  }
  encoded = encoded.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
  try {
    return decodeBase64(encoded);
  } catch {
    throw new TypeError("The input to be decoded is not correctly encoded.");
  }
}, "decode");

// node_modules/jose/dist/browser/util/errors.js
init_modules_watch_stub();
var JOSEError = class extends Error {
  static {
    __name(this, "JOSEError");
  }
  constructor(message2, options) {
    super(message2, options);
    this.code = "ERR_JOSE_GENERIC";
    this.name = this.constructor.name;
    Error.captureStackTrace?.(this, this.constructor);
  }
};
JOSEError.code = "ERR_JOSE_GENERIC";
var JWTClaimValidationFailed = class extends JOSEError {
  static {
    __name(this, "JWTClaimValidationFailed");
  }
  constructor(message2, payload, claim = "unspecified", reason = "unspecified") {
    super(message2, { cause: { claim, reason, payload } });
    this.code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
    this.claim = claim;
    this.reason = reason;
    this.payload = payload;
  }
};
JWTClaimValidationFailed.code = "ERR_JWT_CLAIM_VALIDATION_FAILED";
var JWTExpired = class extends JOSEError {
  static {
    __name(this, "JWTExpired");
  }
  constructor(message2, payload, claim = "unspecified", reason = "unspecified") {
    super(message2, { cause: { claim, reason, payload } });
    this.code = "ERR_JWT_EXPIRED";
    this.claim = claim;
    this.reason = reason;
    this.payload = payload;
  }
};
JWTExpired.code = "ERR_JWT_EXPIRED";
var JOSEAlgNotAllowed = class extends JOSEError {
  static {
    __name(this, "JOSEAlgNotAllowed");
  }
  constructor() {
    super(...arguments);
    this.code = "ERR_JOSE_ALG_NOT_ALLOWED";
  }
};
JOSEAlgNotAllowed.code = "ERR_JOSE_ALG_NOT_ALLOWED";
var JOSENotSupported = class extends JOSEError {
  static {
    __name(this, "JOSENotSupported");
  }
  constructor() {
    super(...arguments);
    this.code = "ERR_JOSE_NOT_SUPPORTED";
  }
};
JOSENotSupported.code = "ERR_JOSE_NOT_SUPPORTED";
var JWEDecryptionFailed = class extends JOSEError {
  static {
    __name(this, "JWEDecryptionFailed");
  }
  constructor(message2 = "decryption operation failed", options) {
    super(message2, options);
    this.code = "ERR_JWE_DECRYPTION_FAILED";
  }
};
JWEDecryptionFailed.code = "ERR_JWE_DECRYPTION_FAILED";
var JWEInvalid = class extends JOSEError {
  static {
    __name(this, "JWEInvalid");
  }
  constructor() {
    super(...arguments);
    this.code = "ERR_JWE_INVALID";
  }
};
JWEInvalid.code = "ERR_JWE_INVALID";
var JWSInvalid = class extends JOSEError {
  static {
    __name(this, "JWSInvalid");
  }
  constructor() {
    super(...arguments);
    this.code = "ERR_JWS_INVALID";
  }
};
JWSInvalid.code = "ERR_JWS_INVALID";
var JWTInvalid = class extends JOSEError {
  static {
    __name(this, "JWTInvalid");
  }
  constructor() {
    super(...arguments);
    this.code = "ERR_JWT_INVALID";
  }
};
JWTInvalid.code = "ERR_JWT_INVALID";
var JWKInvalid = class extends JOSEError {
  static {
    __name(this, "JWKInvalid");
  }
  constructor() {
    super(...arguments);
    this.code = "ERR_JWK_INVALID";
  }
};
JWKInvalid.code = "ERR_JWK_INVALID";
var JWKSInvalid = class extends JOSEError {
  static {
    __name(this, "JWKSInvalid");
  }
  constructor() {
    super(...arguments);
    this.code = "ERR_JWKS_INVALID";
  }
};
JWKSInvalid.code = "ERR_JWKS_INVALID";
var JWKSNoMatchingKey = class extends JOSEError {
  static {
    __name(this, "JWKSNoMatchingKey");
  }
  constructor(message2 = "no applicable key found in the JSON Web Key Set", options) {
    super(message2, options);
    this.code = "ERR_JWKS_NO_MATCHING_KEY";
  }
};
JWKSNoMatchingKey.code = "ERR_JWKS_NO_MATCHING_KEY";
var JWKSMultipleMatchingKeys = class extends JOSEError {
  static {
    __name(this, "JWKSMultipleMatchingKeys");
  }
  constructor(message2 = "multiple matching keys found in the JSON Web Key Set", options) {
    super(message2, options);
    this.code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
  }
};
JWKSMultipleMatchingKeys.code = "ERR_JWKS_MULTIPLE_MATCHING_KEYS";
var JWKSTimeout = class extends JOSEError {
  static {
    __name(this, "JWKSTimeout");
  }
  constructor(message2 = "request timed out", options) {
    super(message2, options);
    this.code = "ERR_JWKS_TIMEOUT";
  }
};
JWKSTimeout.code = "ERR_JWKS_TIMEOUT";
var JWSSignatureVerificationFailed = class extends JOSEError {
  static {
    __name(this, "JWSSignatureVerificationFailed");
  }
  constructor(message2 = "signature verification failed", options) {
    super(message2, options);
    this.code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
  }
};
JWSSignatureVerificationFailed.code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";

// node_modules/jose/dist/browser/lib/crypto_key.js
init_modules_watch_stub();
function unusable(name, prop = "algorithm.name") {
  return new TypeError(`CryptoKey does not support this operation, its ${prop} must be ${name}`);
}
__name(unusable, "unusable");
function isAlgorithm(algorithm, name) {
  return algorithm.name === name;
}
__name(isAlgorithm, "isAlgorithm");
function getHashLength(hash) {
  return parseInt(hash.name.slice(4), 10);
}
__name(getHashLength, "getHashLength");
function getNamedCurve(alg) {
  switch (alg) {
    case "ES256":
      return "P-256";
    case "ES384":
      return "P-384";
    case "ES512":
      return "P-521";
    default:
      throw new Error("unreachable");
  }
}
__name(getNamedCurve, "getNamedCurve");
function checkUsage(key, usages) {
  if (usages.length && !usages.some((expected) => key.usages.includes(expected))) {
    let msg = "CryptoKey does not support this operation, its usages must include ";
    if (usages.length > 2) {
      const last = usages.pop();
      msg += `one of ${usages.join(", ")}, or ${last}.`;
    } else if (usages.length === 2) {
      msg += `one of ${usages[0]} or ${usages[1]}.`;
    } else {
      msg += `${usages[0]}.`;
    }
    throw new TypeError(msg);
  }
}
__name(checkUsage, "checkUsage");
function checkSigCryptoKey(key, alg, ...usages) {
  switch (alg) {
    case "HS256":
    case "HS384":
    case "HS512": {
      if (!isAlgorithm(key.algorithm, "HMAC"))
        throw unusable("HMAC");
      const expected = parseInt(alg.slice(2), 10);
      const actual = getHashLength(key.algorithm.hash);
      if (actual !== expected)
        throw unusable(`SHA-${expected}`, "algorithm.hash");
      break;
    }
    case "RS256":
    case "RS384":
    case "RS512": {
      if (!isAlgorithm(key.algorithm, "RSASSA-PKCS1-v1_5"))
        throw unusable("RSASSA-PKCS1-v1_5");
      const expected = parseInt(alg.slice(2), 10);
      const actual = getHashLength(key.algorithm.hash);
      if (actual !== expected)
        throw unusable(`SHA-${expected}`, "algorithm.hash");
      break;
    }
    case "PS256":
    case "PS384":
    case "PS512": {
      if (!isAlgorithm(key.algorithm, "RSA-PSS"))
        throw unusable("RSA-PSS");
      const expected = parseInt(alg.slice(2), 10);
      const actual = getHashLength(key.algorithm.hash);
      if (actual !== expected)
        throw unusable(`SHA-${expected}`, "algorithm.hash");
      break;
    }
    case "EdDSA": {
      if (key.algorithm.name !== "Ed25519" && key.algorithm.name !== "Ed448") {
        throw unusable("Ed25519 or Ed448");
      }
      break;
    }
    case "Ed25519": {
      if (!isAlgorithm(key.algorithm, "Ed25519"))
        throw unusable("Ed25519");
      break;
    }
    case "ES256":
    case "ES384":
    case "ES512": {
      if (!isAlgorithm(key.algorithm, "ECDSA"))
        throw unusable("ECDSA");
      const expected = getNamedCurve(alg);
      const actual = key.algorithm.namedCurve;
      if (actual !== expected)
        throw unusable(expected, "algorithm.namedCurve");
      break;
    }
    default:
      throw new TypeError("CryptoKey does not support this operation");
  }
  checkUsage(key, usages);
}
__name(checkSigCryptoKey, "checkSigCryptoKey");

// node_modules/jose/dist/browser/lib/invalid_key_input.js
init_modules_watch_stub();
function message(msg, actual, ...types2) {
  types2 = types2.filter(Boolean);
  if (types2.length > 2) {
    const last = types2.pop();
    msg += `one of type ${types2.join(", ")}, or ${last}.`;
  } else if (types2.length === 2) {
    msg += `one of type ${types2[0]} or ${types2[1]}.`;
  } else {
    msg += `of type ${types2[0]}.`;
  }
  if (actual == null) {
    msg += ` Received ${actual}`;
  } else if (typeof actual === "function" && actual.name) {
    msg += ` Received function ${actual.name}`;
  } else if (typeof actual === "object" && actual != null) {
    if (actual.constructor?.name) {
      msg += ` Received an instance of ${actual.constructor.name}`;
    }
  }
  return msg;
}
__name(message, "message");
var invalid_key_input_default = /* @__PURE__ */ __name((actual, ...types2) => {
  return message("Key must be ", actual, ...types2);
}, "default");
function withAlg(alg, actual, ...types2) {
  return message(`Key for the ${alg} algorithm must be `, actual, ...types2);
}
__name(withAlg, "withAlg");

// node_modules/jose/dist/browser/runtime/is_key_like.js
init_modules_watch_stub();
var is_key_like_default = /* @__PURE__ */ __name((key) => {
  if (isCryptoKey(key)) {
    return true;
  }
  return key?.[Symbol.toStringTag] === "KeyObject";
}, "default");
var types = ["CryptoKey"];

// node_modules/jose/dist/browser/lib/is_disjoint.js
init_modules_watch_stub();
var isDisjoint = /* @__PURE__ */ __name((...headers) => {
  const sources = headers.filter(Boolean);
  if (sources.length === 0 || sources.length === 1) {
    return true;
  }
  let acc;
  for (const header of sources) {
    const parameters = Object.keys(header);
    if (!acc || acc.size === 0) {
      acc = new Set(parameters);
      continue;
    }
    for (const parameter of parameters) {
      if (acc.has(parameter)) {
        return false;
      }
      acc.add(parameter);
    }
  }
  return true;
}, "isDisjoint");
var is_disjoint_default = isDisjoint;

// node_modules/jose/dist/browser/lib/is_object.js
init_modules_watch_stub();
function isObjectLike(value) {
  return typeof value === "object" && value !== null;
}
__name(isObjectLike, "isObjectLike");
function isObject(input) {
  if (!isObjectLike(input) || Object.prototype.toString.call(input) !== "[object Object]") {
    return false;
  }
  if (Object.getPrototypeOf(input) === null) {
    return true;
  }
  let proto = input;
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }
  return Object.getPrototypeOf(input) === proto;
}
__name(isObject, "isObject");

// node_modules/jose/dist/browser/runtime/check_key_length.js
init_modules_watch_stub();
var check_key_length_default = /* @__PURE__ */ __name((alg, key) => {
  if (alg.startsWith("RS") || alg.startsWith("PS")) {
    const { modulusLength } = key.algorithm;
    if (typeof modulusLength !== "number" || modulusLength < 2048) {
      throw new TypeError(`${alg} requires key modulusLength to be 2048 bits or larger`);
    }
  }
}, "default");

// node_modules/jose/dist/browser/runtime/normalize_key.js
init_modules_watch_stub();

// node_modules/jose/dist/browser/lib/is_jwk.js
init_modules_watch_stub();
function isJWK(key) {
  return isObject(key) && typeof key.kty === "string";
}
__name(isJWK, "isJWK");
function isPrivateJWK(key) {
  return key.kty !== "oct" && typeof key.d === "string";
}
__name(isPrivateJWK, "isPrivateJWK");
function isPublicJWK(key) {
  return key.kty !== "oct" && typeof key.d === "undefined";
}
__name(isPublicJWK, "isPublicJWK");
function isSecretJWK(key) {
  return isJWK(key) && key.kty === "oct" && typeof key.k === "string";
}
__name(isSecretJWK, "isSecretJWK");

// node_modules/jose/dist/browser/runtime/jwk_to_key.js
init_modules_watch_stub();
function subtleMapping(jwk) {
  let algorithm;
  let keyUsages;
  switch (jwk.kty) {
    case "RSA": {
      switch (jwk.alg) {
        case "PS256":
        case "PS384":
        case "PS512":
          algorithm = { name: "RSA-PSS", hash: `SHA-${jwk.alg.slice(-3)}` };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "RS256":
        case "RS384":
        case "RS512":
          algorithm = { name: "RSASSA-PKCS1-v1_5", hash: `SHA-${jwk.alg.slice(-3)}` };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "RSA-OAEP":
        case "RSA-OAEP-256":
        case "RSA-OAEP-384":
        case "RSA-OAEP-512":
          algorithm = {
            name: "RSA-OAEP",
            hash: `SHA-${parseInt(jwk.alg.slice(-3), 10) || 1}`
          };
          keyUsages = jwk.d ? ["decrypt", "unwrapKey"] : ["encrypt", "wrapKey"];
          break;
        default:
          throw new JOSENotSupported('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
      }
      break;
    }
    case "EC": {
      switch (jwk.alg) {
        case "ES256":
          algorithm = { name: "ECDSA", namedCurve: "P-256" };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ES384":
          algorithm = { name: "ECDSA", namedCurve: "P-384" };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ES512":
          algorithm = { name: "ECDSA", namedCurve: "P-521" };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ECDH-ES":
        case "ECDH-ES+A128KW":
        case "ECDH-ES+A192KW":
        case "ECDH-ES+A256KW":
          algorithm = { name: "ECDH", namedCurve: jwk.crv };
          keyUsages = jwk.d ? ["deriveBits"] : [];
          break;
        default:
          throw new JOSENotSupported('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
      }
      break;
    }
    case "OKP": {
      switch (jwk.alg) {
        case "Ed25519":
          algorithm = { name: "Ed25519" };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "EdDSA":
          algorithm = { name: jwk.crv };
          keyUsages = jwk.d ? ["sign"] : ["verify"];
          break;
        case "ECDH-ES":
        case "ECDH-ES+A128KW":
        case "ECDH-ES+A192KW":
        case "ECDH-ES+A256KW":
          algorithm = { name: jwk.crv };
          keyUsages = jwk.d ? ["deriveBits"] : [];
          break;
        default:
          throw new JOSENotSupported('Invalid or unsupported JWK "alg" (Algorithm) Parameter value');
      }
      break;
    }
    default:
      throw new JOSENotSupported('Invalid or unsupported JWK "kty" (Key Type) Parameter value');
  }
  return { algorithm, keyUsages };
}
__name(subtleMapping, "subtleMapping");
var parse = /* @__PURE__ */ __name(async (jwk) => {
  if (!jwk.alg) {
    throw new TypeError('"alg" argument is required when "jwk.alg" is not present');
  }
  const { algorithm, keyUsages } = subtleMapping(jwk);
  const rest = [
    algorithm,
    jwk.ext ?? false,
    jwk.key_ops ?? keyUsages
  ];
  const keyData = { ...jwk };
  delete keyData.alg;
  delete keyData.use;
  return webcrypto_default.subtle.importKey("jwk", keyData, ...rest);
}, "parse");
var jwk_to_key_default = parse;

// node_modules/jose/dist/browser/runtime/normalize_key.js
var exportKeyValue = /* @__PURE__ */ __name((k) => decode(k), "exportKeyValue");
var privCache;
var pubCache;
var isKeyObject = /* @__PURE__ */ __name((key) => {
  return key?.[Symbol.toStringTag] === "KeyObject";
}, "isKeyObject");
var importAndCache = /* @__PURE__ */ __name(async (cache, key, jwk, alg, freeze = false) => {
  let cached = cache.get(key);
  if (cached?.[alg]) {
    return cached[alg];
  }
  const cryptoKey = await jwk_to_key_default({ ...jwk, alg });
  if (freeze)
    Object.freeze(key);
  if (!cached) {
    cache.set(key, { [alg]: cryptoKey });
  } else {
    cached[alg] = cryptoKey;
  }
  return cryptoKey;
}, "importAndCache");
var normalizePublicKey = /* @__PURE__ */ __name((key, alg) => {
  if (isKeyObject(key)) {
    let jwk = key.export({ format: "jwk" });
    delete jwk.d;
    delete jwk.dp;
    delete jwk.dq;
    delete jwk.p;
    delete jwk.q;
    delete jwk.qi;
    if (jwk.k) {
      return exportKeyValue(jwk.k);
    }
    pubCache || (pubCache = /* @__PURE__ */ new WeakMap());
    return importAndCache(pubCache, key, jwk, alg);
  }
  if (isJWK(key)) {
    if (key.k)
      return decode(key.k);
    pubCache || (pubCache = /* @__PURE__ */ new WeakMap());
    const cryptoKey = importAndCache(pubCache, key, key, alg, true);
    return cryptoKey;
  }
  return key;
}, "normalizePublicKey");
var normalizePrivateKey = /* @__PURE__ */ __name((key, alg) => {
  if (isKeyObject(key)) {
    let jwk = key.export({ format: "jwk" });
    if (jwk.k) {
      return exportKeyValue(jwk.k);
    }
    privCache || (privCache = /* @__PURE__ */ new WeakMap());
    return importAndCache(privCache, key, jwk, alg);
  }
  if (isJWK(key)) {
    if (key.k)
      return decode(key.k);
    privCache || (privCache = /* @__PURE__ */ new WeakMap());
    const cryptoKey = importAndCache(privCache, key, key, alg, true);
    return cryptoKey;
  }
  return key;
}, "normalizePrivateKey");
var normalize_key_default = { normalizePublicKey, normalizePrivateKey };

// node_modules/jose/dist/browser/key/import.js
init_modules_watch_stub();
async function importJWK(jwk, alg) {
  if (!isObject(jwk)) {
    throw new TypeError("JWK must be an object");
  }
  alg || (alg = jwk.alg);
  switch (jwk.kty) {
    case "oct":
      if (typeof jwk.k !== "string" || !jwk.k) {
        throw new TypeError('missing "k" (Key Value) Parameter value');
      }
      return decode(jwk.k);
    case "RSA":
      if ("oth" in jwk && jwk.oth !== void 0) {
        throw new JOSENotSupported('RSA JWK "oth" (Other Primes Info) Parameter value is not supported');
      }
    case "EC":
    case "OKP":
      return jwk_to_key_default({ ...jwk, alg });
    default:
      throw new JOSENotSupported('Unsupported "kty" (Key Type) Parameter value');
  }
}
__name(importJWK, "importJWK");

// node_modules/jose/dist/browser/lib/check_key_type.js
init_modules_watch_stub();
var tag = /* @__PURE__ */ __name((key) => key?.[Symbol.toStringTag], "tag");
var jwkMatchesOp = /* @__PURE__ */ __name((alg, key, usage) => {
  if (key.use !== void 0 && key.use !== "sig") {
    throw new TypeError("Invalid key for this operation, when present its use must be sig");
  }
  if (key.key_ops !== void 0 && key.key_ops.includes?.(usage) !== true) {
    throw new TypeError(`Invalid key for this operation, when present its key_ops must include ${usage}`);
  }
  if (key.alg !== void 0 && key.alg !== alg) {
    throw new TypeError(`Invalid key for this operation, when present its alg must be ${alg}`);
  }
  return true;
}, "jwkMatchesOp");
var symmetricTypeCheck = /* @__PURE__ */ __name((alg, key, usage, allowJwk) => {
  if (key instanceof Uint8Array)
    return;
  if (allowJwk && isJWK(key)) {
    if (isSecretJWK(key) && jwkMatchesOp(alg, key, usage))
      return;
    throw new TypeError(`JSON Web Key for symmetric algorithms must have JWK "kty" (Key Type) equal to "oct" and the JWK "k" (Key Value) present`);
  }
  if (!is_key_like_default(key)) {
    throw new TypeError(withAlg(alg, key, ...types, "Uint8Array", allowJwk ? "JSON Web Key" : null));
  }
  if (key.type !== "secret") {
    throw new TypeError(`${tag(key)} instances for symmetric algorithms must be of type "secret"`);
  }
}, "symmetricTypeCheck");
var asymmetricTypeCheck = /* @__PURE__ */ __name((alg, key, usage, allowJwk) => {
  if (allowJwk && isJWK(key)) {
    switch (usage) {
      case "sign":
        if (isPrivateJWK(key) && jwkMatchesOp(alg, key, usage))
          return;
        throw new TypeError(`JSON Web Key for this operation be a private JWK`);
      case "verify":
        if (isPublicJWK(key) && jwkMatchesOp(alg, key, usage))
          return;
        throw new TypeError(`JSON Web Key for this operation be a public JWK`);
    }
  }
  if (!is_key_like_default(key)) {
    throw new TypeError(withAlg(alg, key, ...types, allowJwk ? "JSON Web Key" : null));
  }
  if (key.type === "secret") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithms must not be of type "secret"`);
  }
  if (usage === "sign" && key.type === "public") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithm signing must be of type "private"`);
  }
  if (usage === "decrypt" && key.type === "public") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithm decryption must be of type "private"`);
  }
  if (key.algorithm && usage === "verify" && key.type === "private") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithm verifying must be of type "public"`);
  }
  if (key.algorithm && usage === "encrypt" && key.type === "private") {
    throw new TypeError(`${tag(key)} instances for asymmetric algorithm encryption must be of type "public"`);
  }
}, "asymmetricTypeCheck");
function checkKeyType(allowJwk, alg, key, usage) {
  const symmetric = alg.startsWith("HS") || alg === "dir" || alg.startsWith("PBES2") || /^A\d{3}(?:GCM)?KW$/.test(alg);
  if (symmetric) {
    symmetricTypeCheck(alg, key, usage, allowJwk);
  } else {
    asymmetricTypeCheck(alg, key, usage, allowJwk);
  }
}
__name(checkKeyType, "checkKeyType");
var check_key_type_default = checkKeyType.bind(void 0, false);
var checkKeyTypeWithJwk = checkKeyType.bind(void 0, true);

// node_modules/jose/dist/browser/lib/validate_crit.js
init_modules_watch_stub();
function validateCrit(Err, recognizedDefault, recognizedOption, protectedHeader, joseHeader) {
  if (joseHeader.crit !== void 0 && protectedHeader?.crit === void 0) {
    throw new Err('"crit" (Critical) Header Parameter MUST be integrity protected');
  }
  if (!protectedHeader || protectedHeader.crit === void 0) {
    return /* @__PURE__ */ new Set();
  }
  if (!Array.isArray(protectedHeader.crit) || protectedHeader.crit.length === 0 || protectedHeader.crit.some((input) => typeof input !== "string" || input.length === 0)) {
    throw new Err('"crit" (Critical) Header Parameter MUST be an array of non-empty strings when present');
  }
  let recognized;
  if (recognizedOption !== void 0) {
    recognized = new Map([...Object.entries(recognizedOption), ...recognizedDefault.entries()]);
  } else {
    recognized = recognizedDefault;
  }
  for (const parameter of protectedHeader.crit) {
    if (!recognized.has(parameter)) {
      throw new JOSENotSupported(`Extension Header Parameter "${parameter}" is not recognized`);
    }
    if (joseHeader[parameter] === void 0) {
      throw new Err(`Extension Header Parameter "${parameter}" is missing`);
    }
    if (recognized.get(parameter) && protectedHeader[parameter] === void 0) {
      throw new Err(`Extension Header Parameter "${parameter}" MUST be integrity protected`);
    }
  }
  return new Set(protectedHeader.crit);
}
__name(validateCrit, "validateCrit");
var validate_crit_default = validateCrit;

// node_modules/jose/dist/browser/lib/validate_algorithms.js
init_modules_watch_stub();
var validateAlgorithms = /* @__PURE__ */ __name((option, algorithms) => {
  if (algorithms !== void 0 && (!Array.isArray(algorithms) || algorithms.some((s) => typeof s !== "string"))) {
    throw new TypeError(`"${option}" option must be an array of strings`);
  }
  if (!algorithms) {
    return void 0;
  }
  return new Set(algorithms);
}, "validateAlgorithms");
var validate_algorithms_default = validateAlgorithms;

// node_modules/jose/dist/browser/jws/compact/verify.js
init_modules_watch_stub();

// node_modules/jose/dist/browser/jws/flattened/verify.js
init_modules_watch_stub();

// node_modules/jose/dist/browser/runtime/verify.js
init_modules_watch_stub();

// node_modules/jose/dist/browser/runtime/subtle_dsa.js
init_modules_watch_stub();
function subtleDsa(alg, algorithm) {
  const hash = `SHA-${alg.slice(-3)}`;
  switch (alg) {
    case "HS256":
    case "HS384":
    case "HS512":
      return { hash, name: "HMAC" };
    case "PS256":
    case "PS384":
    case "PS512":
      return { hash, name: "RSA-PSS", saltLength: alg.slice(-3) >> 3 };
    case "RS256":
    case "RS384":
    case "RS512":
      return { hash, name: "RSASSA-PKCS1-v1_5" };
    case "ES256":
    case "ES384":
    case "ES512":
      return { hash, name: "ECDSA", namedCurve: algorithm.namedCurve };
    case "Ed25519":
      return { name: "Ed25519" };
    case "EdDSA":
      return { name: algorithm.name };
    default:
      throw new JOSENotSupported(`alg ${alg} is not supported either by JOSE or your javascript runtime`);
  }
}
__name(subtleDsa, "subtleDsa");

// node_modules/jose/dist/browser/runtime/get_sign_verify_key.js
init_modules_watch_stub();
async function getCryptoKey(alg, key, usage) {
  if (usage === "sign") {
    key = await normalize_key_default.normalizePrivateKey(key, alg);
  }
  if (usage === "verify") {
    key = await normalize_key_default.normalizePublicKey(key, alg);
  }
  if (isCryptoKey(key)) {
    checkSigCryptoKey(key, alg, usage);
    return key;
  }
  if (key instanceof Uint8Array) {
    if (!alg.startsWith("HS")) {
      throw new TypeError(invalid_key_input_default(key, ...types));
    }
    return webcrypto_default.subtle.importKey("raw", key, { hash: `SHA-${alg.slice(-3)}`, name: "HMAC" }, false, [usage]);
  }
  throw new TypeError(invalid_key_input_default(key, ...types, "Uint8Array", "JSON Web Key"));
}
__name(getCryptoKey, "getCryptoKey");

// node_modules/jose/dist/browser/runtime/verify.js
var verify = /* @__PURE__ */ __name(async (alg, key, signature, data) => {
  const cryptoKey = await getCryptoKey(alg, key, "verify");
  check_key_length_default(alg, cryptoKey);
  const algorithm = subtleDsa(alg, cryptoKey.algorithm);
  try {
    return await webcrypto_default.subtle.verify(algorithm, cryptoKey, signature, data);
  } catch {
    return false;
  }
}, "verify");
var verify_default = verify;

// node_modules/jose/dist/browser/jws/flattened/verify.js
async function flattenedVerify(jws, key, options) {
  if (!isObject(jws)) {
    throw new JWSInvalid("Flattened JWS must be an object");
  }
  if (jws.protected === void 0 && jws.header === void 0) {
    throw new JWSInvalid('Flattened JWS must have either of the "protected" or "header" members');
  }
  if (jws.protected !== void 0 && typeof jws.protected !== "string") {
    throw new JWSInvalid("JWS Protected Header incorrect type");
  }
  if (jws.payload === void 0) {
    throw new JWSInvalid("JWS Payload missing");
  }
  if (typeof jws.signature !== "string") {
    throw new JWSInvalid("JWS Signature missing or incorrect type");
  }
  if (jws.header !== void 0 && !isObject(jws.header)) {
    throw new JWSInvalid("JWS Unprotected Header incorrect type");
  }
  let parsedProt = {};
  if (jws.protected) {
    try {
      const protectedHeader = decode(jws.protected);
      parsedProt = JSON.parse(decoder.decode(protectedHeader));
    } catch {
      throw new JWSInvalid("JWS Protected Header is invalid");
    }
  }
  if (!is_disjoint_default(parsedProt, jws.header)) {
    throw new JWSInvalid("JWS Protected and JWS Unprotected Header Parameter names must be disjoint");
  }
  const joseHeader = {
    ...parsedProt,
    ...jws.header
  };
  const extensions = validate_crit_default(JWSInvalid, /* @__PURE__ */ new Map([["b64", true]]), options?.crit, parsedProt, joseHeader);
  let b64 = true;
  if (extensions.has("b64")) {
    b64 = parsedProt.b64;
    if (typeof b64 !== "boolean") {
      throw new JWSInvalid('The "b64" (base64url-encode payload) Header Parameter must be a boolean');
    }
  }
  const { alg } = joseHeader;
  if (typeof alg !== "string" || !alg) {
    throw new JWSInvalid('JWS "alg" (Algorithm) Header Parameter missing or invalid');
  }
  const algorithms = options && validate_algorithms_default("algorithms", options.algorithms);
  if (algorithms && !algorithms.has(alg)) {
    throw new JOSEAlgNotAllowed('"alg" (Algorithm) Header Parameter value not allowed');
  }
  if (b64) {
    if (typeof jws.payload !== "string") {
      throw new JWSInvalid("JWS Payload must be a string");
    }
  } else if (typeof jws.payload !== "string" && !(jws.payload instanceof Uint8Array)) {
    throw new JWSInvalid("JWS Payload must be a string or an Uint8Array instance");
  }
  let resolvedKey = false;
  if (typeof key === "function") {
    key = await key(parsedProt, jws);
    resolvedKey = true;
    checkKeyTypeWithJwk(alg, key, "verify");
    if (isJWK(key)) {
      key = await importJWK(key, alg);
    }
  } else {
    checkKeyTypeWithJwk(alg, key, "verify");
  }
  const data = concat(encoder.encode(jws.protected ?? ""), encoder.encode("."), typeof jws.payload === "string" ? encoder.encode(jws.payload) : jws.payload);
  let signature;
  try {
    signature = decode(jws.signature);
  } catch {
    throw new JWSInvalid("Failed to base64url decode the signature");
  }
  const verified = await verify_default(alg, key, signature, data);
  if (!verified) {
    throw new JWSSignatureVerificationFailed();
  }
  let payload;
  if (b64) {
    try {
      payload = decode(jws.payload);
    } catch {
      throw new JWSInvalid("Failed to base64url decode the payload");
    }
  } else if (typeof jws.payload === "string") {
    payload = encoder.encode(jws.payload);
  } else {
    payload = jws.payload;
  }
  const result = { payload };
  if (jws.protected !== void 0) {
    result.protectedHeader = parsedProt;
  }
  if (jws.header !== void 0) {
    result.unprotectedHeader = jws.header;
  }
  if (resolvedKey) {
    return { ...result, key };
  }
  return result;
}
__name(flattenedVerify, "flattenedVerify");

// node_modules/jose/dist/browser/jws/compact/verify.js
async function compactVerify(jws, key, options) {
  if (jws instanceof Uint8Array) {
    jws = decoder.decode(jws);
  }
  if (typeof jws !== "string") {
    throw new JWSInvalid("Compact JWS must be a string or Uint8Array");
  }
  const { 0: protectedHeader, 1: payload, 2: signature, length } = jws.split(".");
  if (length !== 3) {
    throw new JWSInvalid("Invalid Compact JWS");
  }
  const verified = await flattenedVerify({ payload, protected: protectedHeader, signature }, key, options);
  const result = { payload: verified.payload, protectedHeader: verified.protectedHeader };
  if (typeof key === "function") {
    return { ...result, key: verified.key };
  }
  return result;
}
__name(compactVerify, "compactVerify");

// node_modules/jose/dist/browser/jwt/verify.js
init_modules_watch_stub();

// node_modules/jose/dist/browser/lib/jwt_claims_set.js
init_modules_watch_stub();

// node_modules/jose/dist/browser/lib/epoch.js
init_modules_watch_stub();
var epoch_default = /* @__PURE__ */ __name((date) => Math.floor(date.getTime() / 1e3), "default");

// node_modules/jose/dist/browser/lib/secs.js
init_modules_watch_stub();
var minute = 60;
var hour = minute * 60;
var day = hour * 24;
var week = day * 7;
var year = day * 365.25;
var REGEX = /^(\+|\-)? ?(\d+|\d+\.\d+) ?(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)(?: (ago|from now))?$/i;
var secs_default = /* @__PURE__ */ __name((str) => {
  const matched = REGEX.exec(str);
  if (!matched || matched[4] && matched[1]) {
    throw new TypeError("Invalid time period format");
  }
  const value = parseFloat(matched[2]);
  const unit = matched[3].toLowerCase();
  let numericDate;
  switch (unit) {
    case "sec":
    case "secs":
    case "second":
    case "seconds":
    case "s":
      numericDate = Math.round(value);
      break;
    case "minute":
    case "minutes":
    case "min":
    case "mins":
    case "m":
      numericDate = Math.round(value * minute);
      break;
    case "hour":
    case "hours":
    case "hr":
    case "hrs":
    case "h":
      numericDate = Math.round(value * hour);
      break;
    case "day":
    case "days":
    case "d":
      numericDate = Math.round(value * day);
      break;
    case "week":
    case "weeks":
    case "w":
      numericDate = Math.round(value * week);
      break;
    default:
      numericDate = Math.round(value * year);
      break;
  }
  if (matched[1] === "-" || matched[4] === "ago") {
    return -numericDate;
  }
  return numericDate;
}, "default");

// node_modules/jose/dist/browser/lib/jwt_claims_set.js
var normalizeTyp = /* @__PURE__ */ __name((value) => value.toLowerCase().replace(/^application\//, ""), "normalizeTyp");
var checkAudiencePresence = /* @__PURE__ */ __name((audPayload, audOption) => {
  if (typeof audPayload === "string") {
    return audOption.includes(audPayload);
  }
  if (Array.isArray(audPayload)) {
    return audOption.some(Set.prototype.has.bind(new Set(audPayload)));
  }
  return false;
}, "checkAudiencePresence");
var jwt_claims_set_default = /* @__PURE__ */ __name((protectedHeader, encodedPayload, options = {}) => {
  let payload;
  try {
    payload = JSON.parse(decoder.decode(encodedPayload));
  } catch {
  }
  if (!isObject(payload)) {
    throw new JWTInvalid("JWT Claims Set must be a top-level JSON object");
  }
  const { typ } = options;
  if (typ && (typeof protectedHeader.typ !== "string" || normalizeTyp(protectedHeader.typ) !== normalizeTyp(typ))) {
    throw new JWTClaimValidationFailed('unexpected "typ" JWT header value', payload, "typ", "check_failed");
  }
  const { requiredClaims = [], issuer, subject, audience, maxTokenAge } = options;
  const presenceCheck = [...requiredClaims];
  if (maxTokenAge !== void 0)
    presenceCheck.push("iat");
  if (audience !== void 0)
    presenceCheck.push("aud");
  if (subject !== void 0)
    presenceCheck.push("sub");
  if (issuer !== void 0)
    presenceCheck.push("iss");
  for (const claim of new Set(presenceCheck.reverse())) {
    if (!(claim in payload)) {
      throw new JWTClaimValidationFailed(`missing required "${claim}" claim`, payload, claim, "missing");
    }
  }
  if (issuer && !(Array.isArray(issuer) ? issuer : [issuer]).includes(payload.iss)) {
    throw new JWTClaimValidationFailed('unexpected "iss" claim value', payload, "iss", "check_failed");
  }
  if (subject && payload.sub !== subject) {
    throw new JWTClaimValidationFailed('unexpected "sub" claim value', payload, "sub", "check_failed");
  }
  if (audience && !checkAudiencePresence(payload.aud, typeof audience === "string" ? [audience] : audience)) {
    throw new JWTClaimValidationFailed('unexpected "aud" claim value', payload, "aud", "check_failed");
  }
  let tolerance;
  switch (typeof options.clockTolerance) {
    case "string":
      tolerance = secs_default(options.clockTolerance);
      break;
    case "number":
      tolerance = options.clockTolerance;
      break;
    case "undefined":
      tolerance = 0;
      break;
    default:
      throw new TypeError("Invalid clockTolerance option type");
  }
  const { currentDate } = options;
  const now = epoch_default(currentDate || /* @__PURE__ */ new Date());
  if ((payload.iat !== void 0 || maxTokenAge) && typeof payload.iat !== "number") {
    throw new JWTClaimValidationFailed('"iat" claim must be a number', payload, "iat", "invalid");
  }
  if (payload.nbf !== void 0) {
    if (typeof payload.nbf !== "number") {
      throw new JWTClaimValidationFailed('"nbf" claim must be a number', payload, "nbf", "invalid");
    }
    if (payload.nbf > now + tolerance) {
      throw new JWTClaimValidationFailed('"nbf" claim timestamp check failed', payload, "nbf", "check_failed");
    }
  }
  if (payload.exp !== void 0) {
    if (typeof payload.exp !== "number") {
      throw new JWTClaimValidationFailed('"exp" claim must be a number', payload, "exp", "invalid");
    }
    if (payload.exp <= now - tolerance) {
      throw new JWTExpired('"exp" claim timestamp check failed', payload, "exp", "check_failed");
    }
  }
  if (maxTokenAge) {
    const age = now - payload.iat;
    const max = typeof maxTokenAge === "number" ? maxTokenAge : secs_default(maxTokenAge);
    if (age - tolerance > max) {
      throw new JWTExpired('"iat" claim timestamp check failed (too far in the past)', payload, "iat", "check_failed");
    }
    if (age < 0 - tolerance) {
      throw new JWTClaimValidationFailed('"iat" claim timestamp check failed (it should be in the past)', payload, "iat", "check_failed");
    }
  }
  return payload;
}, "default");

// node_modules/jose/dist/browser/jwt/verify.js
async function jwtVerify(jwt, key, options) {
  const verified = await compactVerify(jwt, key, options);
  if (verified.protectedHeader.crit?.includes("b64") && verified.protectedHeader.b64 === false) {
    throw new JWTInvalid("JWTs MUST NOT use unencoded payload");
  }
  const payload = jwt_claims_set_default(verified.protectedHeader, verified.payload, options);
  const result = { payload, protectedHeader: verified.protectedHeader };
  if (typeof key === "function") {
    return { ...result, key: verified.key };
  }
  return result;
}
__name(jwtVerify, "jwtVerify");

// node_modules/jose/dist/browser/jwks/local.js
init_modules_watch_stub();
function getKtyFromAlg(alg) {
  switch (typeof alg === "string" && alg.slice(0, 2)) {
    case "RS":
    case "PS":
      return "RSA";
    case "ES":
      return "EC";
    case "Ed":
      return "OKP";
    default:
      throw new JOSENotSupported('Unsupported "alg" value for a JSON Web Key Set');
  }
}
__name(getKtyFromAlg, "getKtyFromAlg");
function isJWKSLike(jwks) {
  return jwks && typeof jwks === "object" && Array.isArray(jwks.keys) && jwks.keys.every(isJWKLike);
}
__name(isJWKSLike, "isJWKSLike");
function isJWKLike(key) {
  return isObject(key);
}
__name(isJWKLike, "isJWKLike");
function clone(obj) {
  if (typeof structuredClone === "function") {
    return structuredClone(obj);
  }
  return JSON.parse(JSON.stringify(obj));
}
__name(clone, "clone");
var LocalJWKSet = class {
  static {
    __name(this, "LocalJWKSet");
  }
  constructor(jwks) {
    this._cached = /* @__PURE__ */ new WeakMap();
    if (!isJWKSLike(jwks)) {
      throw new JWKSInvalid("JSON Web Key Set malformed");
    }
    this._jwks = clone(jwks);
  }
  async getKey(protectedHeader, token) {
    const { alg, kid } = { ...protectedHeader, ...token?.header };
    const kty = getKtyFromAlg(alg);
    const candidates = this._jwks.keys.filter((jwk2) => {
      let candidate = kty === jwk2.kty;
      if (candidate && typeof kid === "string") {
        candidate = kid === jwk2.kid;
      }
      if (candidate && typeof jwk2.alg === "string") {
        candidate = alg === jwk2.alg;
      }
      if (candidate && typeof jwk2.use === "string") {
        candidate = jwk2.use === "sig";
      }
      if (candidate && Array.isArray(jwk2.key_ops)) {
        candidate = jwk2.key_ops.includes("verify");
      }
      if (candidate) {
        switch (alg) {
          case "ES256":
            candidate = jwk2.crv === "P-256";
            break;
          case "ES256K":
            candidate = jwk2.crv === "secp256k1";
            break;
          case "ES384":
            candidate = jwk2.crv === "P-384";
            break;
          case "ES512":
            candidate = jwk2.crv === "P-521";
            break;
          case "Ed25519":
            candidate = jwk2.crv === "Ed25519";
            break;
          case "EdDSA":
            candidate = jwk2.crv === "Ed25519" || jwk2.crv === "Ed448";
            break;
        }
      }
      return candidate;
    });
    const { 0: jwk, length } = candidates;
    if (length === 0) {
      throw new JWKSNoMatchingKey();
    }
    if (length !== 1) {
      const error = new JWKSMultipleMatchingKeys();
      const { _cached } = this;
      error[Symbol.asyncIterator] = async function* () {
        for (const jwk2 of candidates) {
          try {
            yield await importWithAlgCache(_cached, jwk2, alg);
          } catch {
          }
        }
      };
      throw error;
    }
    return importWithAlgCache(this._cached, jwk, alg);
  }
};
async function importWithAlgCache(cache, jwk, alg) {
  const cached = cache.get(jwk) || cache.set(jwk, {}).get(jwk);
  if (cached[alg] === void 0) {
    const key = await importJWK({ ...jwk, ext: true }, alg);
    if (key instanceof Uint8Array || key.type !== "public") {
      throw new JWKSInvalid("JSON Web Key Set members must be public keys");
    }
    cached[alg] = key;
  }
  return cached[alg];
}
__name(importWithAlgCache, "importWithAlgCache");
function createLocalJWKSet(jwks) {
  const set = new LocalJWKSet(jwks);
  const localJWKSet = /* @__PURE__ */ __name(async (protectedHeader, token) => set.getKey(protectedHeader, token), "localJWKSet");
  Object.defineProperties(localJWKSet, {
    jwks: {
      value: /* @__PURE__ */ __name(() => clone(set._jwks), "value"),
      enumerable: true,
      configurable: false,
      writable: false
    }
  });
  return localJWKSet;
}
__name(createLocalJWKSet, "createLocalJWKSet");

// node_modules/jose/dist/browser/jwks/remote.js
init_modules_watch_stub();

// node_modules/jose/dist/browser/runtime/fetch_jwks.js
init_modules_watch_stub();
var fetchJwks = /* @__PURE__ */ __name(async (url, timeout, options) => {
  let controller;
  let id;
  let timedOut = false;
  if (typeof AbortController === "function") {
    controller = new AbortController();
    id = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeout);
  }
  const response = await fetch(url.href, {
    signal: controller ? controller.signal : void 0,
    redirect: "manual",
    headers: options.headers
  }).catch((err) => {
    if (timedOut)
      throw new JWKSTimeout();
    throw err;
  });
  if (id !== void 0)
    clearTimeout(id);
  if (response.status !== 200) {
    throw new JOSEError("Expected 200 OK from the JSON Web Key Set HTTP response");
  }
  try {
    return await response.json();
  } catch {
    throw new JOSEError("Failed to parse the JSON Web Key Set HTTP response as JSON");
  }
}, "fetchJwks");
var fetch_jwks_default = fetchJwks;

// node_modules/jose/dist/browser/jwks/remote.js
function isCloudflareWorkers() {
  return typeof WebSocketPair !== "undefined" || typeof navigator !== "undefined" && true || typeof EdgeRuntime !== "undefined" && EdgeRuntime === "vercel";
}
__name(isCloudflareWorkers, "isCloudflareWorkers");
var USER_AGENT;
if (typeof navigator === "undefined" || !"Cloudflare-Workers"?.startsWith?.("Mozilla/5.0 ")) {
  const NAME = "jose";
  const VERSION = "v5.10.0";
  USER_AGENT = `${NAME}/${VERSION}`;
}
var jwksCache = /* @__PURE__ */ Symbol();
function isFreshJwksCache(input, cacheMaxAge) {
  if (typeof input !== "object" || input === null) {
    return false;
  }
  if (!("uat" in input) || typeof input.uat !== "number" || Date.now() - input.uat >= cacheMaxAge) {
    return false;
  }
  if (!("jwks" in input) || !isObject(input.jwks) || !Array.isArray(input.jwks.keys) || !Array.prototype.every.call(input.jwks.keys, isObject)) {
    return false;
  }
  return true;
}
__name(isFreshJwksCache, "isFreshJwksCache");
var RemoteJWKSet = class {
  static {
    __name(this, "RemoteJWKSet");
  }
  constructor(url, options) {
    if (!(url instanceof URL)) {
      throw new TypeError("url must be an instance of URL");
    }
    this._url = new URL(url.href);
    this._options = { agent: options?.agent, headers: options?.headers };
    this._timeoutDuration = typeof options?.timeoutDuration === "number" ? options?.timeoutDuration : 5e3;
    this._cooldownDuration = typeof options?.cooldownDuration === "number" ? options?.cooldownDuration : 3e4;
    this._cacheMaxAge = typeof options?.cacheMaxAge === "number" ? options?.cacheMaxAge : 6e5;
    if (options?.[jwksCache] !== void 0) {
      this._cache = options?.[jwksCache];
      if (isFreshJwksCache(options?.[jwksCache], this._cacheMaxAge)) {
        this._jwksTimestamp = this._cache.uat;
        this._local = createLocalJWKSet(this._cache.jwks);
      }
    }
  }
  coolingDown() {
    return typeof this._jwksTimestamp === "number" ? Date.now() < this._jwksTimestamp + this._cooldownDuration : false;
  }
  fresh() {
    return typeof this._jwksTimestamp === "number" ? Date.now() < this._jwksTimestamp + this._cacheMaxAge : false;
  }
  async getKey(protectedHeader, token) {
    if (!this._local || !this.fresh()) {
      await this.reload();
    }
    try {
      return await this._local(protectedHeader, token);
    } catch (err) {
      if (err instanceof JWKSNoMatchingKey) {
        if (this.coolingDown() === false) {
          await this.reload();
          return this._local(protectedHeader, token);
        }
      }
      throw err;
    }
  }
  async reload() {
    if (this._pendingFetch && isCloudflareWorkers()) {
      this._pendingFetch = void 0;
    }
    const headers = new Headers(this._options.headers);
    if (USER_AGENT && !headers.has("User-Agent")) {
      headers.set("User-Agent", USER_AGENT);
      this._options.headers = Object.fromEntries(headers.entries());
    }
    this._pendingFetch || (this._pendingFetch = fetch_jwks_default(this._url, this._timeoutDuration, this._options).then((json) => {
      this._local = createLocalJWKSet(json);
      if (this._cache) {
        this._cache.uat = Date.now();
        this._cache.jwks = json;
      }
      this._jwksTimestamp = Date.now();
      this._pendingFetch = void 0;
    }).catch((err) => {
      this._pendingFetch = void 0;
      throw err;
    }));
    await this._pendingFetch;
  }
};
function createRemoteJWKSet(url, options) {
  const set = new RemoteJWKSet(url, options);
  const remoteJWKSet = /* @__PURE__ */ __name(async (protectedHeader, token) => set.getKey(protectedHeader, token), "remoteJWKSet");
  Object.defineProperties(remoteJWKSet, {
    coolingDown: {
      get: /* @__PURE__ */ __name(() => set.coolingDown(), "get"),
      enumerable: true,
      configurable: false
    },
    fresh: {
      get: /* @__PURE__ */ __name(() => set.fresh(), "get"),
      enumerable: true,
      configurable: false
    },
    reload: {
      value: /* @__PURE__ */ __name(() => set.reload(), "value"),
      enumerable: true,
      configurable: false,
      writable: false
    },
    reloading: {
      get: /* @__PURE__ */ __name(() => !!set._pendingFetch, "get"),
      enumerable: true,
      configurable: false
    },
    jwks: {
      value: /* @__PURE__ */ __name(() => set._local?.jwks(), "value"),
      enumerable: true,
      configurable: false,
      writable: false
    }
  });
  return remoteJWKSet;
}
__name(createRemoteJWKSet, "createRemoteJWKSet");

// src/lib/accessRoles.js
init_modules_watch_stub();
function parseOwnerEmails(csv) {
  if (!csv?.trim()) return /* @__PURE__ */ new Set();
  return new Set(
    csv.split(",").map((entry) => entry.trim().toLowerCase()).filter(Boolean)
  );
}
__name(parseOwnerEmails, "parseOwnerEmails");
function normalizeEmail(email) {
  return email?.trim().toLowerCase() ?? "";
}
__name(normalizeEmail, "normalizeEmail");
function resolveRoleFromEmail(email, env) {
  const normalized = normalizeEmail(email);
  if (!normalized) return "house-sitter";
  const owners = parseOwnerEmails(env.OWNER_EMAILS);
  if (owners.has(normalized)) return "owner";
  return "house-sitter";
}
__name(resolveRoleFromEmail, "resolveRoleFromEmail");

// src/lib/accessJwt.js
var jwksCache2 = /* @__PURE__ */ new Map();
function accessAudiences(env) {
  const raw = env.CF_ACCESS_AUD?.trim() ?? "";
  return raw.split(/[,\s]+/).filter(Boolean);
}
__name(accessAudiences, "accessAudiences");
function isAccessConfigured(env) {
  return Boolean(env.CF_ACCESS_TEAM_DOMAIN?.trim() && accessAudiences(env).length);
}
__name(isAccessConfigured, "isAccessConfigured");
function accessIssuer(env) {
  const team = env.CF_ACCESS_TEAM_DOMAIN?.trim();
  return `https://${team}.cloudflareaccess.com`;
}
__name(accessIssuer, "accessIssuer");
function getJwks(env, _fetchImpl) {
  const team = env.CF_ACCESS_TEAM_DOMAIN?.trim();
  const url = `https://${team}.cloudflareaccess.com/cdn-cgi/access/certs`;
  if (!jwksCache2.has(url)) {
    jwksCache2.set(url, createRemoteJWKSet(new URL(url)));
  }
  return jwksCache2.get(url);
}
__name(getJwks, "getJwks");
async function verifyAccessJwt(token, env, fetchImpl = fetch) {
  if (!isAccessConfigured(env)) {
    return { ok: false };
  }
  const issuer = accessIssuer(env);
  const audiences = accessAudiences(env);
  const audienceOption = audiences.length === 1 ? audiences[0] : audiences;
  const testSecret = env.CF_ACCESS_JWT_TEST_SECRET?.trim();
  if (testSecret) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(testSecret), {
        algorithms: ["HS256"],
        issuer,
        audience: audienceOption
      });
      const email = normalizeEmail(typeof payload.email === "string" ? payload.email : "");
      if (!email) return { ok: false };
      return { ok: true, email };
    } catch {
    }
  }
  try {
    const jwks = getJwks(env, fetchImpl);
    const audiences2 = accessAudiences(env);
    const tryAudiences = audiences2.length ? audiences2 : [audienceOption].flat();
    for (const aud of tryAudiences) {
      try {
        const { payload } = await jwtVerify(token, jwks, {
          issuer,
          audience: aud
        });
        const email = normalizeEmail(typeof payload.email === "string" ? payload.email : "");
        if (!email) continue;
        return { ok: true, email };
      } catch {
        continue;
      }
    }
    return { ok: false };
  } catch {
    return { ok: false };
  }
}
__name(verifyAccessJwt, "verifyAccessJwt");

// src/lib/accessJwtFromRequest.js
init_modules_watch_stub();
function readAccessJwtFromRequest(request) {
  for (const [key, value] of request.headers.entries()) {
    if (key.toLowerCase() === "cf-access-jwt-assertion" && value?.trim()) {
      return value.trim();
    }
  }
  const raw = request.headers.get("Cookie") ?? "";
  for (const part of raw.split(";")) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const name = part.slice(0, eq).trim();
    if (name.toLowerCase() !== "cf_authorization") continue;
    let value = part.slice(eq + 1).trim();
    if (!value) return null;
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    if (value.includes("%")) {
      try {
        value = decodeURIComponent(value);
      } catch {
      }
    }
    return value;
  }
  return null;
}
__name(readAccessJwtFromRequest, "readAccessJwtFromRequest");

// src/lib/hubProxyAuth.js
init_modules_watch_stub();
var HUB_PROXY_AUTH_VERSION = "1";
async function hmacSha256Base64Url(secret, message2) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const bytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message2)));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
__name(hmacSha256Base64Url, "hmacSha256Base64Url");
function timingSafeEqualString(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}
__name(timingSafeEqualString, "timingSafeEqualString");
async function verifyHubProxyAccessEmail(request, env) {
  const secret = env.HUB_PROXY_SECRET?.trim();
  if (!secret) return null;
  if (request.headers.get("X-Hub-Proxy-Auth") !== HUB_PROXY_AUTH_VERSION) return null;
  const email = request.headers.get("X-Hub-Access-Email")?.trim().toLowerCase();
  const tsRaw = request.headers.get("X-Hub-Access-Ts")?.trim();
  const sig = request.headers.get("X-Hub-Access-Sig")?.trim();
  if (!email || !tsRaw || !sig) return null;
  const ts = Number(tsRaw);
  if (!Number.isFinite(ts)) return null;
  const now = Math.floor(Date.now() / 1e3);
  if (Math.abs(now - ts) > 120) return null;
  const expected = await hmacSha256Base64Url(secret, `${email}|${tsRaw}`);
  if (!timingSafeEqualString(sig, expected)) return null;
  return email;
}
__name(verifyHubProxyAccessEmail, "verifyHubProxyAccessEmail");

// src/lib/requestAuth.js
async function authenticateRequest(request, env, fetchImpl = fetch) {
  if (!isAccessConfigured(env)) {
    return { ok: false, status: 503, code: "AUTH_NOT_CONFIGURED" };
  }
  const token = readAccessJwtFromRequest(request);
  if (token) {
    const verified = await verifyAccessJwt(token, env, fetchImpl);
    if (!verified.ok) {
      return { ok: false, status: 401, code: "INVALID_TOKEN" };
    }
    const role = resolveRoleFromEmail(verified.email, env);
    return { ok: true, email: verified.email, role };
  }
  const proxyEmail = await verifyHubProxyAccessEmail(request, env);
  if (proxyEmail) {
    const role = resolveRoleFromEmail(proxyEmail, env);
    return { ok: true, email: proxyEmail, role };
  }
  return { ok: false, status: 401, code: "UNAUTHENTICATED" };
}
__name(authenticateRequest, "authenticateRequest");
function hasRequiredRole(auth, requiredRole) {
  if (requiredRole === "house-sitter") return true;
  return auth.role === "owner";
}
__name(hasRequiredRole, "hasRequiredRole");

// src/lib/deviceSession.js
init_modules_watch_stub();
var DEVICE_SESSION_COOKIE = "lovely_home_device_session";
var DEVICE_SESSION_SET_COOKIE_HEADER = "X-Device-Session-Set-Cookie";
var DEVICE_SESSION_PROXY_COOKIE_FIELD = "_setCookie";
var DEVICE_SESSION_VERSION = 1;
var SITTER_SESSION_TTL_SEC = 30 * 24 * 60 * 60;
var OWNER_INACTIVITY_TTL_SEC = 30 * 60;
var OWNER_ABSOLUTE_TTL_SEC = 4 * 60 * 60;
async function resolveSigningSecret(env) {
  const fromEnv = env.OWNER_SESSION_SECRET?.trim();
  if (fromEnv) return fromEnv;
  const fromDb = await getOrCreateDeviceSessionSecret(env);
  if (fromDb) return fromDb;
  const pin = await getConfiguredOwnerPin(env);
  if (pin) return pin;
  return env.OWNER_PIN?.trim() || null;
}
__name(resolveSigningSecret, "resolveSigningSecret");
async function hmacSign(key, data) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
  return new Uint8Array(signature);
}
__name(hmacSign, "hmacSign");
function base64UrlEncode(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
__name(base64UrlEncode, "base64UrlEncode");
function base64UrlDecode(input) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
__name(base64UrlDecode, "base64UrlDecode");
async function signDeviceSession(claims, env) {
  const secret = await resolveSigningSecret(env);
  if (!secret) return null;
  const payloadPart = base64UrlEncode(new TextEncoder().encode(JSON.stringify(claims)));
  const keyBytes = new TextEncoder().encode(secret);
  const signature = await hmacSign(keyBytes.buffer, payloadPart);
  return `${payloadPart}.${base64UrlEncode(signature)}`;
}
__name(signDeviceSession, "signDeviceSession");
async function verifyDeviceSessionToken(token, env) {
  const secret = await resolveSigningSecret(env);
  if (!secret || !token) return null;
  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) return null;
  const keyBytes = new TextEncoder().encode(secret);
  const expected = await hmacSign(keyBytes.buffer, payloadPart);
  try {
    const provided = base64UrlDecode(signaturePart);
    if (expected.length !== provided.length) return null;
    let diff = 0;
    for (let index = 0; index < expected.length; index += 1) {
      diff |= expected[index] ^ provided[index];
    }
    if (diff !== 0) return null;
  } catch {
    return null;
  }
  try {
    const json = new TextDecoder().decode(base64UrlDecode(payloadPart));
    const claims = (
      /** @type {DeviceSessionClaims} */
      JSON.parse(json)
    );
    if (claims.version !== DEVICE_SESSION_VERSION) return null;
    if (claims.mode !== "sitter" && claims.mode !== "owner") return null;
    if (typeof claims.issuedAt !== "number" || typeof claims.expiresAt !== "number") return null;
    return claims;
  } catch {
    return null;
  }
}
__name(verifyDeviceSessionToken, "verifyDeviceSessionToken");
function isActiveSitterSession(claims, nowSec) {
  return claims.mode === "sitter" && nowSec < claims.expiresAt;
}
__name(isActiveSitterSession, "isActiveSitterSession");
function readDeviceSessionCookie(request) {
  const raw = request.headers.get("Cookie") ?? "";
  for (const part of raw.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${DEVICE_SESSION_COOKIE}=`)) {
      const value = trimmed.slice(DEVICE_SESSION_COOKIE.length + 1);
      if (!value) return null;
      return decodeURIComponent(value);
    }
  }
  return null;
}
__name(readDeviceSessionCookie, "readDeviceSessionCookie");
function createSitterClaims(nowSec) {
  return (
    /** @type {DeviceSessionClaims} */
    {
      mode: "sitter",
      issuedAt: nowSec,
      expiresAt: nowSec + SITTER_SESSION_TTL_SEC,
      version: DEVICE_SESSION_VERSION
    }
  );
}
__name(createSitterClaims, "createSitterClaims");
function defaultOwnerDeviceSession() {
  return {
    mode: (
      /** @type {DeviceMode} */
      "owner"
    ),
    ownerSessionExpiresAtMs: null,
    claims: null,
    cookieValue: null,
    clearCookie: false
  };
}
__name(defaultOwnerDeviceSession, "defaultOwnerDeviceSession");
async function resolveDeviceSession(request, env, nowMs = Date.now()) {
  const nowSec = Math.floor(nowMs / 1e3);
  const token = readDeviceSessionCookie(request);
  const hadCookie = Boolean(token);
  const claims = token ? await verifyDeviceSessionToken(token, env) : null;
  if (!claims) {
    return {
      ...defaultOwnerDeviceSession(),
      clearCookie: hadCookie
    };
  }
  if (isActiveSitterSession(claims, nowSec)) {
    let cookieValue = null;
    let nextClaims = claims;
    if (nowSec + SITTER_SESSION_TTL_SEC / 2 > claims.expiresAt) {
      nextClaims = createSitterClaims(nowSec);
      cookieValue = await signDeviceSession(nextClaims, env);
    }
    return {
      mode: (
        /** @type {DeviceMode} */
        "sitter"
      ),
      ownerSessionExpiresAtMs: null,
      claims: nextClaims,
      cookieValue,
      clearCookie: false
    };
  }
  return {
    ...defaultOwnerDeviceSession(),
    clearCookie: hadCookie
  };
}
__name(resolveDeviceSession, "resolveDeviceSession");
function buildDeviceSessionSetCookie(value, maxAgeSec) {
  return `${DEVICE_SESSION_COOKIE}=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSec}`;
}
__name(buildDeviceSessionSetCookie, "buildDeviceSessionSetCookie");
function buildDeviceSessionClearCookie() {
  return `${DEVICE_SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}
__name(buildDeviceSessionClearCookie, "buildDeviceSessionClearCookie");
function cookieMaxAgeForClaims(claims) {
  const nowSec = Math.floor(Date.now() / 1e3);
  return Math.max(60, claims.expiresAt - nowSec);
}
__name(cookieMaxAgeForClaims, "cookieMaxAgeForClaims");
function deviceSessionJsonBody(session, extras = {}) {
  return {
    authenticated: true,
    mode: session.mode,
    ownerSessionExpiresAt: session.ownerSessionExpiresAtMs != null ? new Date(session.ownerSessionExpiresAtMs).toISOString() : null,
    ...extras
  };
}
__name(deviceSessionJsonBody, "deviceSessionJsonBody");
function buildDeviceSessionCookieHeader(session) {
  if (session.clearCookie) {
    return buildDeviceSessionClearCookie();
  }
  if (session.cookieValue && session.claims) {
    return buildDeviceSessionSetCookie(
      session.cookieValue,
      cookieMaxAgeForClaims(session.claims)
    );
  }
  return null;
}
__name(buildDeviceSessionCookieHeader, "buildDeviceSessionCookieHeader");
function withProxySetCookieField(body, cookieHeader) {
  if (!cookieHeader) return body;
  return { ...body, [DEVICE_SESSION_PROXY_COOKIE_FIELD]: cookieHeader };
}
__name(withProxySetCookieField, "withProxySetCookieField");
function finalizeDeviceSessionJsonResponse(session, status = 200, extras = {}) {
  const cookieHeader = buildDeviceSessionCookieHeader(session);
  const body = deviceSessionJsonBody(session, extras);
  const payload = withProxySetCookieField(body, cookieHeader);
  const headers = new Headers({ "Cache-Control": "no-store" });
  if (cookieHeader) {
    headers.append("Set-Cookie", cookieHeader);
    headers.set(DEVICE_SESSION_SET_COOKIE_HEADER, cookieHeader);
  }
  return Response.json(payload, { status, headers });
}
__name(finalizeDeviceSessionJsonResponse, "finalizeDeviceSessionJsonResponse");

// src/lib/houseSettings.js
init_modules_watch_stub();
var SITTER_SECRETS_KEY = "sitter_secrets_disclosed";
async function clearHouseSettings(env) {
  const db = requireHouseSettingsDb(env.HOUSE_GUIDE_DB);
  await db.prepare(`DELETE FROM house_settings`).run();
}
__name(clearHouseSettings, "clearHouseSettings");
function requireHouseSettingsDb(db) {
  if (!db) {
    throw new Error("HOUSE_GUIDE_DB is not configured");
  }
  return db;
}
__name(requireHouseSettingsDb, "requireHouseSettingsDb");
async function getSitterSecretsDisclosed(env) {
  const db = env.HOUSE_GUIDE_DB;
  if (!db) {
    return env.SITTER_SECRETS_DISCLOSED?.trim() === "1";
  }
  const row = await db.prepare("SELECT value FROM house_settings WHERE key = ?").bind(SITTER_SECRETS_KEY).first();
  return row?.value === "1";
}
__name(getSitterSecretsDisclosed, "getSitterSecretsDisclosed");
async function setSitterSecretsDisclosed(env, disclosed) {
  const db = requireHouseSettingsDb(env.HOUSE_GUIDE_DB);
  const now = Math.floor(Date.now() / 1e3);
  await db.prepare(
    `INSERT INTO house_settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).bind(SITTER_SECRETS_KEY, disclosed ? "1" : "0", now).run();
}
__name(setSitterSecretsDisclosed, "setSitterSecretsDisclosed");

// src/lib/privateConfigAuth.js
async function requirePrivateConfigAccess(request, env, fetchImpl = fetch) {
  const access = await authenticateRequest(request, env, fetchImpl);
  if (!access.ok) {
    return { ok: false, status: access.status, code: access.code };
  }
  const session = await resolveDeviceSession(request, env);
  if (session.mode !== "sitter") {
    if (!hasRequiredRole(access, "owner")) {
      return { ok: false, status: 403, code: "FORBIDDEN" };
    }
    return { ok: true, access, session };
  }
  const disclosed = await getSitterSecretsDisclosed(env);
  if (!disclosed) {
    return { ok: false, status: 403, code: "SITTER_SECRETS_WITHHELD" };
  }
  return { ok: true, access, session };
}
__name(requirePrivateConfigAccess, "requirePrivateConfigAccess");

// src/routes/privateConfigRoute.js
async function handlePrivateConfigRequest(request, env, fetchImpl = fetch) {
  const gate = await requirePrivateConfigAccess(request, env, fetchImpl);
  if (!gate.ok) {
    return Response.json({ error: gate.code }, { status: gate.status });
  }
  return Response.json(await buildPrivateConfig(env), {
    headers: { "Cache-Control": "no-store" }
  });
}
__name(handlePrivateConfigRequest, "handlePrivateConfigRequest");

// src/routes/buttons.js
init_modules_watch_stub();

// src/lib/buttonAllowlist.js
init_modules_watch_stub();
var ALLOWED_BUTTON_CODES = Object.freeze([
  "VB01",
  "VB02",
  "VB03",
  "VB04",
  "VB05",
  "VB06",
  "VB07",
  "VB08",
  "VB09",
  "VB10"
]);
var BUTTON_CODE_TO_VIRTUAL_ID = Object.freeze(
  Object.fromEntries(
    ALLOWED_BUTTON_CODES.map((code) => {
      const numeric = Number.parseInt(code.slice(2), 10);
      return [code, numeric];
    })
  )
);
function normalizeButtonCode(raw) {
  const trimmed = raw.trim().toUpperCase();
  if (/^VB\d{1,2}$/.test(trimmed)) {
    const num = Number.parseInt(trimmed.slice(2), 10);
    if (num >= 1 && num <= 99) {
      return `VB${String(num).padStart(2, "0")}`;
    }
  }
  return null;
}
__name(normalizeButtonCode, "normalizeButtonCode");
function isAllowedButtonCode(code) {
  return ALLOWED_BUTTON_CODES.includes(code);
}
__name(isAllowedButtonCode, "isAllowedButtonCode");

// src/lib/errors.js
init_modules_watch_stub();
function jsonError(status, code, message2, options = {}) {
  const { correlationId, ...init } = options;
  const body = {
    error: {
      code,
      message: message2
    }
  };
  if (correlationId) {
    body.error.correlationId = correlationId;
  }
  return Response.json(body, { status, ...init });
}
__name(jsonError, "jsonError");
function notFound(correlationId) {
  return jsonError(404, "NOT_FOUND", "Route not found.", { correlationId });
}
__name(notFound, "notFound");
function methodNotAllowed(correlationId) {
  return jsonError(405, "METHOD_NOT_ALLOWED", "Method not allowed.", { correlationId });
}
__name(methodNotAllowed, "methodNotAllowed");

// src/services/virtualButtons.js
init_modules_watch_stub();
var DEFAULT_ENDPOINT = "https://api.virtualbuttons.com/v1";
function buildVirtualButtonUrl(accessCode, virtualButtonId, endpoint = DEFAULT_ENDPOINT) {
  const url = new URL(endpoint);
  url.searchParams.set("virtualButton", String(virtualButtonId));
  url.searchParams.set("accessCode", accessCode);
  return url.toString();
}
__name(buildVirtualButtonUrl, "buildVirtualButtonUrl");
async function assertUpstreamAccepted(response) {
  if (!response.ok) {
    throw new Error("UPSTREAM_FAILED");
  }
  const contentType = response.headers.get("Content-Type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    return true;
  }
  try {
    const payload = await response.json();
    if (payload && typeof payload === "object" && "message" in payload && !("pressed" in payload)) {
      throw new Error("UPSTREAM_FAILED");
    }
  } catch (error) {
    if (error instanceof Error && error.message === "UPSTREAM_FAILED") {
      throw error;
    }
  }
  return true;
}
__name(assertUpstreamAccepted, "assertUpstreamAccepted");
async function triggerVirtualButtonUpstream({ accessCode, virtualButtonId, fetchImpl = fetch }) {
  if (!accessCode?.trim()) {
    throw new Error("MISSING_ACCESS_CODE");
  }
  const trimmedCode = accessCode.trim();
  const body = JSON.stringify({
    virtualButton: virtualButtonId,
    accessCode: trimmedCode
  });
  let response = await fetchImpl(DEFAULT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    cache: "no-store"
  });
  if (!response.ok) {
    const legacyUrl = buildVirtualButtonUrl(trimmedCode, virtualButtonId);
    response = await fetchImpl(legacyUrl, { method: "GET", cache: "no-store" });
  }
  return assertUpstreamAccepted(response);
}
__name(triggerVirtualButtonUpstream, "triggerVirtualButtonUpstream");

// src/lib/deviceSessionAuth.js
init_modules_watch_stub();
async function requireOwnerIdentity(request, env, fetchImpl = fetch) {
  const auth = await authenticateRequest(request, env, fetchImpl);
  if (!auth.ok) return { ok: false, status: auth.status, code: auth.code };
  if (!hasRequiredRole(auth, "owner")) {
    return { ok: false, status: 403, code: "FORBIDDEN" };
  }
  return { ok: true, auth };
}
__name(requireOwnerIdentity, "requireOwnerIdentity");
async function requireOwnerDeviceMode(request, env, nowMs = Date.now()) {
  const access = await authenticateRequest(request, env);
  if (!access.ok) {
    return { ok: false, status: access.status, code: access.code };
  }
  if (!hasRequiredRole(access, "owner")) {
    return { ok: false, status: 403, code: "FORBIDDEN" };
  }
  const session = await resolveDeviceSession(request, env, nowMs);
  if (session.mode === "sitter") {
    return { ok: false, status: 403, code: "DEVICE_MODE_REQUIRED" };
  }
  return { ok: true, access, session };
}
__name(requireOwnerDeviceMode, "requireOwnerDeviceMode");
async function requireAnyDeviceSession(request, env) {
  const access = await authenticateRequest(request, env);
  if (!access.ok) {
    return { ok: false, status: access.status, code: access.code };
  }
  const session = await resolveDeviceSession(request, env);
  return { ok: true, access, session };
}
__name(requireAnyDeviceSession, "requireAnyDeviceSession");
async function issueSitterSessionResponse(env, nowSec = Math.floor(Date.now() / 1e3)) {
  const claims = createSitterClaims(nowSec);
  const cookieValue = await signDeviceSession(claims, env);
  if (!cookieValue) {
    return Response.json({ error: "SESSION_UNAVAILABLE" }, { status: 503 });
  }
  return finalizeDeviceSessionJsonResponse({
    mode: "sitter",
    ownerSessionExpiresAtMs: null,
    cookieValue,
    claims,
    clearCookie: false
  });
}
__name(issueSitterSessionResponse, "issueSitterSessionResponse");
async function issueOwnerUnlockResponse() {
  return finalizeDeviceSessionJsonResponse({
    mode: "owner",
    ownerSessionExpiresAtMs: null,
    clearCookie: true
  });
}
__name(issueOwnerUnlockResponse, "issueOwnerUnlockResponse");

// src/lib/controlPermissions.js
init_modules_watch_stub();
var CONTROL_PERMISSIONS = Object.freeze({
  VB01: ["owner", "house-sitter"],
  VB02: ["owner", "house-sitter"],
  VB03: ["owner", "house-sitter"],
  VB04: ["owner", "house-sitter"],
  VB05: ["owner", "house-sitter"],
  VB06: ["owner", "house-sitter"],
  VB09: ["owner", "house-sitter"],
  VB08: ["owner", "house-sitter"],
  VB10: ["owner", "house-sitter"],
  VB07: ["owner"]
});
function isControlAllowedForRole(buttonCode, role) {
  const allowed = CONTROL_PERMISSIONS[buttonCode];
  if (!allowed) return false;
  return allowed.includes(role);
}
__name(isControlAllowedForRole, "isControlAllowedForRole");

// src/lib/controlRateLimitClient.js
init_modules_watch_stub();
function limiterStub(namespace, clientKey) {
  if (!namespace) return null;
  const id = namespace.idFromName(clientKey);
  return namespace.get(id);
}
__name(limiterStub, "limiterStub");
function clientIpFromRequest(request) {
  return request.headers.get("CF-Connecting-IP") ?? request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ?? "unknown";
}
__name(clientIpFromRequest, "clientIpFromRequest");
async function ensureControlActionAllowed(request, email, buttonCode, env) {
  const namespace = (
    /** @type {DurableObjectNamespace | undefined} */
    env.CONTROL_ACTION_LIMITER
  );
  const ip = clientIpFromRequest(request);
  const stub = limiterStub(namespace, `control:${email}:${ip}`);
  if (!stub) {
    return { allowed: true };
  }
  const response = await stub.fetch("https://control-limiter/attempt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, ip, buttonCode, now: Date.now() })
  });
  if (!response.ok) {
    return { allowed: false, reason: "RATE_LIMITED" };
  }
  const body = await response.json();
  return { allowed: Boolean(body.allowed), reason: body.reason };
}
__name(ensureControlActionAllowed, "ensureControlActionAllowed");

// src/lib/auditLog.js
init_modules_watch_stub();
function identityForLogs(email) {
  const normalized = email.trim().toLowerCase();
  const at = normalized.indexOf("@");
  if (at <= 0) return "unknown";
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  const maskedLocal = local.length <= 2 ? "**" : `${local.slice(0, 1)}***`;
  return `${maskedLocal}@${domain}`;
}
__name(identityForLogs, "identityForLogs");

// src/routes/buttons.js
function hasStrictJsonContentType(request) {
  const contentType = request.headers.get("Content-Type")?.split(";")[0]?.trim().toLowerCase();
  return contentType === "application/json";
}
__name(hasStrictJsonContentType, "hasStrictJsonContentType");
async function handleButtonPress(request, buttonParam, env, correlationId, fetchImpl = fetch) {
  if (request.method !== "POST") {
    return jsonError(405, "METHOD_NOT_ALLOWED", "Use POST for this control.", { correlationId });
  }
  if (!hasStrictJsonContentType(request)) {
    return jsonError(415, "UNSUPPORTED_MEDIA_TYPE", "Use application/json.", { correlationId });
  }
  const gate = await requireAnyDeviceSession(request, env);
  if (!gate.ok) {
    return jsonError(gate.status, gate.code, "Authentication required.", { correlationId });
  }
  const auth = gate.access;
  const effectiveRole = gate.session.mode === "owner" ? auth.role : "house-sitter";
  const code = normalizeButtonCode(buttonParam);
  if (!code || !isAllowedButtonCode(code)) {
    logControlAction({
      correlationId,
      action: buttonParam,
      role: effectiveRole,
      identity: identityForLogs(auth.email),
      success: false,
      reason: "UNKNOWN_BUTTON"
    });
    return jsonError(404, "UNKNOWN_BUTTON", "This control is not available.", { correlationId });
  }
  if (!isControlAllowedForRole(code, effectiveRole)) {
    logControlAction({
      correlationId,
      action: code,
      role: effectiveRole,
      identity: identityForLogs(auth.email),
      success: false,
      reason: "FORBIDDEN"
    });
    return jsonError(403, "FORBIDDEN", "This control is not available.", { correlationId });
  }
  const rate = await ensureControlActionAllowed(request, auth.email, code, env);
  if (!rate.allowed) {
    logControlAction({
      correlationId,
      action: code,
      role: effectiveRole,
      identity: identityForLogs(auth.email),
      success: false,
      reason: rate.reason ?? "RATE_LIMITED"
    });
    const status = rate.reason === "DUPLICATE_COOLDOWN" ? 429 : 429;
    return jsonError(status, rate.reason ?? "RATE_LIMITED", "Please wait before trying again.", {
      correlationId
    });
  }
  const accessCode = env.VIRTUAL_BUTTONS_ACCESS_CODE?.trim();
  if (!accessCode) {
    return jsonError(503, "CONFIGURATION_ERROR", "Controls are temporarily unavailable.", { correlationId });
  }
  const virtualButtonId = BUTTON_CODE_TO_VIRTUAL_ID[code];
  try {
    await triggerVirtualButtonUpstream({
      accessCode,
      virtualButtonId,
      fetchImpl
    });
    logControlAction({
      correlationId,
      action: code,
      role: effectiveRole,
      identity: identityForLogs(auth.email),
      success: true
    });
    return Response.json({ ok: true, button: code }, { status: 200 });
  } catch (error) {
    logControlAction({
      correlationId,
      action: code,
      role: effectiveRole,
      identity: identityForLogs(auth.email),
      success: false,
      reason: "UPSTREAM_ERROR"
    });
    const message2 = error instanceof Error && error.message === "UPSTREAM_FAILED" ? "Could not reach the control service." : "Could not trigger this control.";
    return jsonError(502, "UPSTREAM_ERROR", message2, { correlationId });
  }
}
__name(handleButtonPress, "handleButtonPress");
function logControlAction(entry) {
  console.log(
    JSON.stringify({
      event: "control_action",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      ...entry
    })
  );
}
__name(logControlAction, "logControlAction");

// src/routes/ownerAuth.js
init_modules_watch_stub();

// src/lib/timingSafeEqual.js
init_modules_watch_stub();
function timingSafeEqualString2(a, b) {
  const encoder2 = new TextEncoder();
  const left = encoder2.encode(a);
  const right = encoder2.encode(b);
  const length = Math.max(left.byteLength, right.byteLength);
  let mismatch = left.byteLength ^ right.byteLength;
  for (let index = 0; index < length; index += 1) {
    mismatch |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return mismatch === 0;
}
__name(timingSafeEqualString2, "timingSafeEqualString");

// src/lib/ownerAuthRateLimitClient.js
init_modules_watch_stub();
function limiterStub2(namespace, clientKey) {
  if (!namespace) return null;
  const id = namespace.idFromName(clientKey);
  return namespace.get(id);
}
__name(limiterStub2, "limiterStub");
async function checkAllowed(stub) {
  const response = await stub.fetch("https://limiter/check", { method: "GET" });
  if (!response.ok) return false;
  const body = await response.json();
  return Boolean(body.allowed);
}
__name(checkAllowed, "checkAllowed");
async function recordFailure(stub) {
  await stub.fetch("https://limiter/failure", { method: "POST" });
}
__name(recordFailure, "recordFailure");
async function recordSuccess(stub) {
  await stub.fetch("https://limiter/success", { method: "POST" });
}
__name(recordSuccess, "recordSuccess");
function clientKeyFromRequest(request) {
  const ip = request.headers.get("CF-Connecting-IP") ?? request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ?? "unknown";
  return `owner-auth:${ip}`;
}
__name(clientKeyFromRequest, "clientKeyFromRequest");
async function ensureOwnerAuthAllowed(request, env) {
  const namespace = (
    /** @type {DurableObjectNamespace | undefined} */
    env.OWNER_AUTH_LIMITER
  );
  const stub = limiterStub2(namespace, clientKeyFromRequest(request));
  if (!stub) return true;
  return checkAllowed(stub);
}
__name(ensureOwnerAuthAllowed, "ensureOwnerAuthAllowed");
async function recordOwnerAuthFailure(request, env) {
  const namespace = (
    /** @type {DurableObjectNamespace | undefined} */
    env.OWNER_AUTH_LIMITER
  );
  const stub = limiterStub2(namespace, clientKeyFromRequest(request));
  if (stub) await recordFailure(stub);
}
__name(recordOwnerAuthFailure, "recordOwnerAuthFailure");
async function recordOwnerAuthSuccess(request, env) {
  const namespace = (
    /** @type {DurableObjectNamespace | undefined} */
    env.OWNER_AUTH_LIMITER
  );
  const stub = limiterStub2(namespace, clientKeyFromRequest(request));
  if (stub) await recordSuccess(stub);
}
__name(recordOwnerAuthSuccess, "recordOwnerAuthSuccess");

// src/routes/ownerAuth.js
function authJson(authenticated, status, error, code) {
  const body = {
    ok: authenticated,
    authenticated
  };
  if (error) body.error = error;
  if (code) body.code = code;
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
__name(authJson, "authJson");
function normalizePin(pin) {
  if (typeof pin !== "string") return null;
  const trimmed = pin.trim();
  if (!/^\d{4}$/.test(trimmed)) return null;
  return trimmed;
}
__name(normalizePin, "normalizePin");
async function handleOwnerAuth(request, correlationId, env, fetchImpl = fetch) {
  if (request.method !== "POST") {
    return authJson(false, 405, "Method not allowed");
  }
  const accessAuth = await authenticateRequest(request, env, fetchImpl);
  if (!accessAuth.ok) {
    return authJson(false, accessAuth.status, "Authentication required", accessAuth.code);
  }
  if (!hasRequiredRole(accessAuth, "owner")) {
    return authJson(false, 403, "Owner access not permitted for this identity");
  }
  const configuredPin = await getConfiguredOwnerPin(env);
  if (!configuredPin) {
    return authJson(false, 503, "Owner access is unavailable");
  }
  if (!await ensureOwnerAuthAllowed(request, env)) {
    return authJson(false, 429, "Too many attempts. Please wait before trying again.");
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return authJson(false, 400, "Invalid request");
  }
  if (typeof body?.role === "string") {
  }
  const pin = normalizePin(body?.pin);
  if (!pin) {
    return authJson(false, 400, "Invalid request");
  }
  const valid = timingSafeEqualString2(pin, configuredPin);
  if (valid) {
    await recordOwnerAuthSuccess(request, env);
    return issueOwnerUnlockResponse();
  }
  await recordOwnerAuthFailure(request, env);
  return authJson(false, 401, "Invalid credentials", "INVALID_PIN");
}
__name(handleOwnerAuth, "handleOwnerAuth");

// src/routes/weather.js
init_modules_watch_stub();

// src/weather/weatherService.js
init_modules_watch_stub();

// src/weather/OpenMeteoProvider.js
init_modules_watch_stub();

// src/weather/mapOpenMeteo.js
init_modules_watch_stub();

// src/weather/wmoCodes.js
init_modules_watch_stub();
var WMO_CONDITIONS = {
  0: { condition: "Clear", icon: "clear" },
  1: { condition: "Mainly Clear", icon: "clear" },
  2: { condition: "Partly Cloudy", icon: "partly-cloudy" },
  3: { condition: "Overcast", icon: "cloudy" },
  45: { condition: "Fog", icon: "fog" },
  48: { condition: "Fog", icon: "fog" },
  51: { condition: "Drizzle", icon: "drizzle" },
  53: { condition: "Drizzle", icon: "drizzle" },
  55: { condition: "Drizzle", icon: "drizzle" },
  61: { condition: "Rain", icon: "rain" },
  63: { condition: "Rain", icon: "rain" },
  65: { condition: "Heavy Rain", icon: "heavy-rain" },
  71: { condition: "Snow", icon: "snow" },
  73: { condition: "Snow", icon: "snow" },
  75: { condition: "Heavy Snow", icon: "snow" },
  80: { condition: "Showers", icon: "showers" },
  81: { condition: "Showers", icon: "showers" },
  82: { condition: "Heavy Showers", icon: "heavy-rain" },
  95: { condition: "Thunderstorm", icon: "thunderstorm" },
  96: { condition: "Thunderstorm", icon: "thunderstorm" },
  99: { condition: "Thunderstorm", icon: "thunderstorm" }
};
function mapWeatherCode(code) {
  return WMO_CONDITIONS[Number(code)] ?? { condition: "Weather", icon: "cloudy" };
}
__name(mapWeatherCode, "mapWeatherCode");

// src/weather/wind.js
init_modules_watch_stub();
var COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
function degreesToCompass(degrees) {
  if (!Number.isFinite(degrees)) return "";
  const index = Math.round(degrees % 360 / 45) % 8;
  return COMPASS[index];
}
__name(degreesToCompass, "degreesToCompass");

// src/weather/adviceEngine.js
init_modules_watch_stub();
function generateWeatherAdvice(weather, audience = "owner") {
  const houseSitter = audience === "house-sitter";
  const advice = [];
  const { current, today, hourly, daily } = weather;
  const high = today?.high ?? daily[0]?.high;
  const low = today?.low ?? daily[0]?.low;
  const rainChance = today?.rainChance ?? 0;
  const uv = current?.uvIndex ?? 0;
  const wind = current?.windSpeed ?? 0;
  const now = Date.now();
  const upcomingHours = hourly.filter((hour2) => {
    const time = Date.parse(hour2.time);
    return Number.isFinite(time) && time >= now && time <= now + 6 * 60 * 60 * 1e3;
  });
  const heavyRainSoon = upcomingHours.some(
    (hour2) => (hour2.rainChance ?? 0) >= 60 && ["rain", "heavy-rain", "showers", "thunderstorm"].includes(hour2.icon)
  );
  const afternoonRain = hourly.some((hour2) => {
    const date = new Date(hour2.time);
    const hourOfDay = date.getHours();
    return hourOfDay >= 12 && hourOfDay <= 18 && (hour2.rainChance ?? 0) >= 50;
  });
  if (heavyRainSoon || afternoonRain || rainChance >= 60) {
    advice.push({
      icon: "rain",
      title: houseSitter ? "Rain may arrive later today." : "Rain may arrive this afternoon.",
      detail: houseSitter ? "An earlier walk with Scooter might stay drier. A towel could help if she gets wet." : "You might prefer to walk Scooter earlier while it is still dry."
    });
  } else if (rainChance <= 15 && !upcomingHours.some((h) => (h.rainChance ?? 0) > 30)) {
    advice.push(
      houseSitter ? {
        icon: "dog",
        title: "It may stay mostly dry today.",
        detail: "Walks with Scooter could be pleasant; water might be worth bringing on longer outings."
      } : {
        icon: "garden",
        title: "It may stay mostly dry today.",
        detail: "You might find it a good opportunity for gardening if that was already on your mind."
      }
    );
  }
  if (Number.isFinite(high) && high >= 28) {
    advice.push({
      icon: "dog",
      title: "It may feel very warm.",
      detail: houseSitter ? "Shadier times and extra water could help Scooter stay comfortable on walks." : "Early or late walks with Scooter might feel more comfortable than the middle of the day."
    });
  }
  if (Number.isFinite(low) && low <= 2) {
    advice.push(
      houseSitter ? {
        icon: "cold",
        title: "It may turn cold overnight.",
        detail: "A shorter evening walk might suit Scooter; drying off could help when you come in."
      } : {
        icon: "cold",
        title: "It may turn cold overnight.",
        detail: "Outdoor taps might be worth a glance if frost is a concern."
      }
    );
  }
  if (wind >= 25) {
    advice.push(
      houseSitter ? {
        icon: "wind",
        title: "It might be windy.",
        detail: "Scooter may feel more settled on a lead in open areas if gusts pick up."
      } : {
        icon: "wind",
        title: "It might be windy.",
        detail: "Light garden furniture could shift; you might consider securing it if needed."
      }
    );
  }
  if (uv >= 6) {
    advice.push({
      icon: "sun",
      title: "UV may be high.",
      detail: houseSitter ? "Sunscreen and shadier routes might be worth considering on walks with Scooter." : "Consider sunscreen if you might spend extended time outdoors."
    });
  }
  if (advice.length === 0) {
    advice.push(
      houseSitter ? {
        icon: "dog",
        title: "Conditions may suit Scooter.",
        detail: "Usual walks and time in the garden could feel comfortable today."
      } : {
        icon: "home",
        title: "Comfortable conditions.",
        detail: "The forecast suggests a pleasant day at home."
      }
    );
  }
  return advice.slice(0, 4);
}
__name(generateWeatherAdvice, "generateWeatherAdvice");
function buildDashboardAlert(weather, audience = "owner") {
  const high = weather.today?.high ?? weather.daily[0]?.high;
  if (Number.isFinite(high) && high >= 28) {
    return {
      label: audience === "house-sitter" ? "Heat may be high today" : "Heat may be high today",
      icon: "sun"
    };
  }
  const now = Date.now();
  for (const hour2 of weather.hourly) {
    const time = Date.parse(hour2.time);
    if (!Number.isFinite(time) || time < now) continue;
    const hoursAway = (time - now) / (60 * 60 * 1e3);
    if (hoursAway > 6) break;
    if ((hour2.rainChance ?? 0) >= 50) {
      const rounded = Math.max(1, Math.round(hoursAway));
      return {
        label: `Rain might arrive in ${rounded} hour${rounded === 1 ? "" : "s"}`,
        icon: "rain"
      };
    }
  }
  return null;
}
__name(buildDashboardAlert, "buildDashboardAlert");
function applyWeatherAudience(payload, audience) {
  return {
    ...payload,
    advice: generateWeatherAdvice(payload, audience),
    dashboardAlert: buildDashboardAlert(payload, audience)
  };
}
__name(applyWeatherAudience, "applyWeatherAudience");
function parseWeatherAudience(value) {
  return value === "house-sitter" ? "house-sitter" : "owner";
}
__name(parseWeatherAudience, "parseWeatherAudience");

// src/weather/mapOpenMeteo.js
function formatClockTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}
__name(formatClockTime, "formatClockTime");
function dayLabel(iso, index) {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  const date = new Date(iso);
  return date.toLocaleDateString("en-GB", { weekday: "short" });
}
__name(dayLabel, "dayLabel");
function roundTemp(value) {
  return Number.isFinite(value) ? Math.round(Number(value)) : 0;
}
__name(roundTemp, "roundTemp");
function describeAirQuality(aqi) {
  if (!Number.isFinite(aqi)) return "Unknown";
  if (aqi <= 20) return "Good";
  if (aqi <= 40) return "Fair";
  if (aqi <= 60) return "Moderate";
  if (aqi <= 80) return "Poor";
  return "Very Poor";
}
__name(describeAirQuality, "describeAirQuality");
function mapOpenMeteoToDashboard(forecast, airQuality, meta) {
  const currentBlock = (
    /** @type {Record<string, unknown>} */
    forecast.current ?? {}
  );
  const hourlyBlock = (
    /** @type {Record<string, unknown[]>} */
    forecast.hourly ?? {}
  );
  const dailyBlock = (
    /** @type {Record<string, unknown[]>} */
    forecast.daily ?? {}
  );
  const currentMapped = mapWeatherCode(
    /** @type {number} */
    currentBlock.weather_code
  );
  const payload = {
    current: {
      temperature: roundTemp(currentBlock.temperature_2m),
      feelsLike: roundTemp(currentBlock.apparent_temperature),
      condition: currentMapped.condition,
      icon: currentMapped.icon,
      windSpeed: roundTemp(currentBlock.wind_speed_10m),
      windDirection: degreesToCompass(
        /** @type {number} */
        currentBlock.wind_direction_10m
      ),
      humidity: roundTemp(currentBlock.relative_humidity_2m),
      uvIndex: roundTemp(currentBlock.uv_index),
      airQuality: describeAirQuality(
        airQuality && typeof airQuality === "object" && airQuality.current && typeof airQuality.current === "object" ? (
          /** @type {{ european_aqi?: number }} */
          airQuality.current.european_aqi
        ) : void 0
      )
    },
    today: {
      high: roundTemp(dailyBlock.temperature_2m_max?.[0]),
      low: roundTemp(dailyBlock.temperature_2m_min?.[0]),
      rainChance: roundTemp(dailyBlock.precipitation_probability_max?.[0]),
      sunrise: formatClockTime(
        /** @type {string} */
        dailyBlock.sunrise?.[0]
      ),
      sunset: formatClockTime(
        /** @type {string} */
        dailyBlock.sunset?.[0]
      )
    },
    hourly: [],
    daily: [],
    advice: [],
    dashboardAlert: null,
    meta
  };
  const hourlyTimes = (
    /** @type {string[]} */
    hourlyBlock.time ?? []
  );
  for (let index = 0; index < hourlyTimes.length && index < 24; index += 1) {
    const mapped = mapWeatherCode(
      /** @type {number} */
      hourlyBlock.weather_code?.[index]
    );
    payload.hourly.push({
      time: hourlyTimes[index],
      label: formatClockTime(hourlyTimes[index]),
      temperature: roundTemp(hourlyBlock.temperature_2m?.[index]),
      condition: mapped.condition,
      icon: mapped.icon,
      rainChance: roundTemp(hourlyBlock.precipitation_probability?.[index]),
      windSpeed: roundTemp(hourlyBlock.wind_speed_10m?.[index])
    });
  }
  const dailyTimes = (
    /** @type {string[]} */
    dailyBlock.time ?? []
  );
  for (let index = 0; index < dailyTimes.length && index < 7; index += 1) {
    const mapped = mapWeatherCode(
      /** @type {number} */
      dailyBlock.weather_code?.[index]
    );
    payload.daily.push({
      date: dailyTimes[index],
      label: dayLabel(dailyTimes[index], index),
      condition: mapped.condition,
      icon: mapped.icon,
      high: roundTemp(dailyBlock.temperature_2m_max?.[index]),
      low: roundTemp(dailyBlock.temperature_2m_min?.[index]),
      rainChance: roundTemp(dailyBlock.precipitation_probability_max?.[index])
    });
  }
  payload.advice = generateWeatherAdvice(payload, "owner");
  payload.dashboardAlert = buildDashboardAlert(payload, "owner");
  return payload;
}
__name(mapOpenMeteoToDashboard, "mapOpenMeteoToDashboard");

// src/weather/OpenMeteoProvider.js
function createOpenMeteoProvider(config) {
  const { latitude, longitude } = config;
  return {
    async fetchRawForecast(fetchImpl = fetch) {
      const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
      forecastUrl.searchParams.set("latitude", String(latitude));
      forecastUrl.searchParams.set("longitude", String(longitude));
      forecastUrl.searchParams.set(
        "current",
        "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,uv_index"
      );
      forecastUrl.searchParams.set(
        "hourly",
        "temperature_2m,weather_code,precipitation_probability,wind_speed_10m"
      );
      forecastUrl.searchParams.set(
        "daily",
        "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset"
      );
      forecastUrl.searchParams.set("forecast_days", "7");
      forecastUrl.searchParams.set("timezone", "Europe/London");
      forecastUrl.searchParams.set("wind_speed_unit", "mph");
      const airUrl = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
      airUrl.searchParams.set("latitude", String(latitude));
      airUrl.searchParams.set("longitude", String(longitude));
      airUrl.searchParams.set("current", "european_aqi");
      const [forecastResponse, airResponse] = await Promise.all([
        fetchImpl(forecastUrl),
        fetchImpl(airUrl).catch(() => null)
      ]);
      if (!forecastResponse.ok) {
        throw new Error("Open-Meteo forecast request failed");
      }
      const forecast = await forecastResponse.json();
      let airQuality = null;
      if (airResponse?.ok) {
        airQuality = await airResponse.json();
      }
      return { forecast, airQuality };
    }
  };
}
__name(createOpenMeteoProvider, "createOpenMeteoProvider");
async function fetchDashboardWeatherFromOpenMeteo(provider, fetchImpl, meta) {
  const { forecast, airQuality } = await provider.fetchRawForecast(fetchImpl);
  return mapOpenMeteoToDashboard(forecast, airQuality, meta);
}
__name(fetchDashboardWeatherFromOpenMeteo, "fetchDashboardWeatherFromOpenMeteo");

// src/weather/weatherCache.js
init_modules_watch_stub();
var WEATHER_CACHE_TTL_MS = 15 * 60 * 1e3;
var memoryCache = /* @__PURE__ */ new Map();
function setWeatherCache(payload, ttlMs = WEATHER_CACHE_TTL_MS, cacheKey = "default") {
  memoryCache.set(cacheKey, {
    payload,
    expiresAt: Date.now() + ttlMs
  });
}
__name(setWeatherCache, "setWeatherCache");
function getFreshWeatherCache(cacheKey = "default") {
  const entry = memoryCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) return null;
  return entry.payload;
}
__name(getFreshWeatherCache, "getFreshWeatherCache");
function getStaleWeatherCache(cacheKey = "default") {
  return memoryCache.get(cacheKey)?.payload ?? null;
}
__name(getStaleWeatherCache, "getStaleWeatherCache");

// src/weather/geocode.js
init_modules_watch_stub();
async function geocodeWeatherQuery(query, env, fetchImpl = fetch) {
  const trimmed = query.trim();
  if (!trimmed) {
    return { status: 400, body: { error: "Enter a postcode or place name." } };
  }
  if (isUkPostcode(trimmed)) {
    const postcodeResult = await lookupUkPostcode(trimmed, fetchImpl);
    if (postcodeResult) {
      return { status: 200, body: postcodeResult };
    }
  }
  return lookupPlaceName(trimmed, fetchImpl);
}
__name(geocodeWeatherQuery, "geocodeWeatherQuery");
function isUkPostcode(input) {
  return /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(input.trim());
}
__name(isUkPostcode, "isUkPostcode");
async function lookupUkPostcode(postcode, fetchImpl) {
  const normalized = postcode.replace(/\s+/g, "").toUpperCase();
  const response = await fetchImpl(`https://api.postcodes.io/postcodes/${encodeURIComponent(normalized)}`);
  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  const result = data?.result;
  if (!result || typeof result.latitude !== "number" || typeof result.longitude !== "number") {
    return null;
  }
  const admin = [result.admin_ward, result.admin_district, result.region].filter(Boolean).join(", ");
  return {
    results: [
      {
        latitude: result.latitude,
        longitude: result.longitude,
        label: result.postcode,
        detail: admin || result.parish || null
      }
    ]
  };
}
__name(lookupUkPostcode, "lookupUkPostcode");
async function lookupPlaceName(query, fetchImpl) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query);
  url.searchParams.set("count", "5");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  const response = await fetchImpl(url);
  if (!response.ok) {
    return { status: 503, body: { error: "Location lookup is temporarily unavailable." } };
  }
  const data = await response.json();
  const results = (data?.results ?? []).filter((item) => typeof item.latitude === "number" && typeof item.longitude === "number").map((item) => ({
    latitude: item.latitude,
    longitude: item.longitude,
    label: item.name,
    detail: [item.admin1, item.country].filter(Boolean).join(", ") || null
  }));
  if (!results.length) {
    return { status: 404, body: { error: "No matching location found." } };
  }
  return { status: 200, body: { results } };
}
__name(lookupPlaceName, "lookupPlaceName");
function weatherCacheKey(latitude, longitude) {
  return `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
}
__name(weatherCacheKey, "weatherCacheKey");
function parseWeatherCoordinateOverride(lat, lon) {
  if (lat == null || lon == null || lat === "" || lon === "") {
    return null;
  }
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return { error: "Invalid coordinates." };
  }
  return { latitude, longitude };
}
__name(parseWeatherCoordinateOverride, "parseWeatherCoordinateOverride");

// src/weather/weatherService.js
function readHomeCoordinates(env) {
  const latitude = Number(env.HOME_LATITUDE);
  const longitude = Number(env.HOME_LONGITUDE);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  return { latitude, longitude };
}
__name(readHomeCoordinates, "readHomeCoordinates");
function withAudience(body, audience) {
  return applyWeatherAudience(body, audience);
}
__name(withAudience, "withAudience");
async function getHomeWeather(env, fetchImpl = fetch, audience = "owner", coordsOverride = null) {
  const coords = coordsOverride ?? readHomeCoordinates(env);
  if (!coords) {
    return {
      status: 503,
      body: {
        ok: false,
        error: "Weather location is not configured on the Worker."
      }
    };
  }
  const cacheKey = weatherCacheKey(coords.latitude, coords.longitude);
  const cachedFresh = getFreshWeatherCache(cacheKey);
  if (cachedFresh) {
    return {
      status: 200,
      body: withAudience(
        {
          ...cachedFresh,
          meta: { ...cachedFresh.meta, fromCache: true, stale: false }
        },
        audience
      )
    };
  }
  const provider = createOpenMeteoProvider(coords);
  const fetchedAt = (/* @__PURE__ */ new Date()).toISOString();
  try {
    const payload = await fetchDashboardWeatherFromOpenMeteo(provider, fetchImpl, {
      fetchedAt,
      fromCache: false,
      stale: false
    });
    setWeatherCache(payload, WEATHER_CACHE_TTL_MS, cacheKey);
    return { status: 200, body: withAudience(payload, audience) };
  } catch {
    const stale = getStaleWeatherCache(cacheKey);
    if (stale) {
      return {
        status: 200,
        body: withAudience(
          {
            ...stale,
            meta: {
              ...stale.meta,
              fromCache: true,
              stale: true
            }
          },
          audience
        )
      };
    }
    return {
      status: 503,
      body: {
        ok: false,
        error: "Weather currently unavailable."
      }
    };
  }
}
__name(getHomeWeather, "getHomeWeather");

// src/routes/weather.js
async function handleWeather(request, env, fetchImpl = fetch) {
  const gate = await requireAnyDeviceSession(request, env);
  if (!gate.ok) {
    return Response.json({ error: gate.code }, { status: gate.status });
  }
  const url = new URL(request.url);
  const audience = parseWeatherAudience(url.searchParams.get("audience"));
  const coords = parseWeatherCoordinateOverride(
    url.searchParams.get("lat"),
    url.searchParams.get("lon")
  );
  if (coords && "error" in coords) {
    return Response.json({ error: coords.error }, { status: 400 });
  }
  const result = await getHomeWeather(env, fetchImpl, audience, coords);
  const headers = { "Content-Type": "application/json", "Cache-Control": "private, no-store" };
  if (result.status === 200 && result.body.meta) {
    headers["Cache-Control"] = "private, max-age=60";
  }
  return new Response(JSON.stringify(result.body), { status: result.status, headers });
}
__name(handleWeather, "handleWeather");

// src/routes/weatherGeocode.js
init_modules_watch_stub();
async function handleWeatherGeocode(request, env, fetchImpl = fetch) {
  const gate = await requireAnyDeviceSession(request, env);
  if (!gate.ok) {
    return Response.json({ error: gate.code }, { status: gate.status });
  }
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const result = await geocodeWeatherQuery(query, env, fetchImpl);
  return Response.json(result.body, {
    status: result.status,
    headers: { "Cache-Control": "private, no-store" }
  });
}
__name(handleWeatherGeocode, "handleWeatherGeocode");

// src/routes/calendar.js
init_modules_watch_stub();
async function handleCalendar(request, env, fetchImpl = fetch) {
  try {
    if (request.method !== "GET") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }
    const gate = await requireOwnerDeviceMode(request, env);
    if (!gate.ok) {
      return Response.json({ error: "Forbidden", code: gate.code }, { status: gate.status ?? 403 });
    }
    const { getHomeCalendar: getHomeCalendar2 } = await Promise.resolve().then(() => (init_calendarService(), calendarService_exports));
    const payload = await getHomeCalendar2(env, fetchImpl);
    return Response.json(payload, {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
    });
  } catch (error) {
    const feedConfigured = Boolean(env.APPLE_CALENDAR_ICS_URL?.trim());
    let body;
    if (error?.code === "CALENDAR_NOT_CONFIGURED") {
      body = { error: "Calendar unavailable", code: "CALENDAR_NOT_CONFIGURED", feedConfigured: false };
    } else if (error?.code === "CALENDAR_INVALID_URL") {
      body = { error: "Calendar unavailable", code: "CALENDAR_INVALID_URL", feedConfigured: true };
    } else {
      body = {
        error: "Calendar temporarily unavailable",
        code: typeof error?.code === "string" ? error.code : "UNKNOWN",
        feedConfigured
      };
      if (typeof error?.upstreamStatus === "number") {
        body.upstreamStatus = error.upstreamStatus;
      }
      if (typeof error?.networkReason === "string") {
        body.networkReason = error.networkReason;
      }
    }
    console.error(
      JSON.stringify({
        event: "calendar_failed",
        code: body.code,
        feedConfigured: body.feedConfigured,
        upstreamStatus: body.upstreamStatus,
        networkReason: body.networkReason
      })
    );
    return Response.json(body, { status: 503 });
  }
}
__name(handleCalendar, "handleCalendar");

// src/routes/applianceManuals.js
init_modules_watch_stub();

// src/applianceManuals/repository.js
init_modules_watch_stub();
async function listApplianceManuals(db, options = {}) {
  const sql = options.publishedOnly ? `SELECT * FROM appliance_manuals WHERE published = 1 ORDER BY sort_order ASC, title ASC` : `SELECT * FROM appliance_manuals ORDER BY sort_order ASC, title ASC`;
  const result = await db.prepare(sql).all();
  return (
    /** @type {ApplianceManualRecord[]} */
    result.results ?? []
  );
}
__name(listApplianceManuals, "listApplianceManuals");
async function getApplianceManualById(db, id) {
  const row = await db.prepare(`SELECT * FROM appliance_manuals WHERE id = ?`).bind(id).first();
  return (
    /** @type {ApplianceManualRecord | null} */
    row ?? null
  );
}
__name(getApplianceManualById, "getApplianceManualById");
async function insertApplianceManual(db, input) {
  await db.prepare(
    `INSERT INTO appliance_manuals (
        id, title, appliance_name, manufacturer, model, category, location, description,
        object_key, original_filename, mime_type, file_size, published, sort_order,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    input.id,
    input.title,
    input.applianceName,
    input.manufacturer,
    input.model,
    input.category,
    input.location,
    input.description,
    input.objectKey,
    input.originalFilename,
    input.mimeType,
    input.fileSize,
    input.published ? 1 : 0,
    input.sortOrder ?? 0,
    input.createdAt,
    input.updatedAt
  ).run();
  const created = await getApplianceManualById(db, input.id);
  if (!created) {
    throw new Error("MANUAL_INSERT_FAILED");
  }
  return created;
}
__name(insertApplianceManual, "insertApplianceManual");
async function updateApplianceManual(db, id, patch) {
  const existing = await getApplianceManualById(db, id);
  if (!existing) return null;
  const next = {
    title: patch.title ?? existing.title,
    applianceName: patch.applianceName ?? existing.appliance_name,
    manufacturer: patch.manufacturer !== void 0 ? patch.manufacturer : existing.manufacturer,
    model: patch.model !== void 0 ? patch.model : existing.model,
    category: patch.category ?? existing.category,
    location: patch.location !== void 0 ? patch.location : existing.location,
    description: patch.description !== void 0 ? patch.description : existing.description,
    objectKey: patch.objectKey ?? existing.object_key,
    originalFilename: patch.originalFilename ?? existing.original_filename,
    mimeType: patch.mimeType ?? existing.mime_type,
    fileSize: patch.fileSize ?? existing.file_size,
    published: patch.published !== void 0 ? patch.published ? 1 : 0 : existing.published,
    sortOrder: patch.sortOrder ?? existing.sort_order,
    updatedAt: patch.updatedAt ?? existing.updated_at
  };
  await db.prepare(
    `UPDATE appliance_manuals SET
        title = ?, appliance_name = ?, manufacturer = ?, model = ?, category = ?, location = ?,
        description = ?, object_key = ?, original_filename = ?, mime_type = ?, file_size = ?,
        published = ?, sort_order = ?, updated_at = ?
      WHERE id = ?`
  ).bind(
    next.title,
    next.applianceName,
    next.manufacturer,
    next.model,
    next.category,
    next.location,
    next.description,
    next.objectKey,
    next.originalFilename,
    next.mimeType,
    next.fileSize,
    next.published,
    next.sortOrder,
    next.updatedAt,
    id
  ).run();
  return getApplianceManualById(db, id);
}
__name(updateApplianceManual, "updateApplianceManual");
async function deleteApplianceManual(db, id) {
  const existing = await getApplianceManualById(db, id);
  if (!existing) return null;
  await db.prepare(`DELETE FROM appliance_manuals WHERE id = ?`).bind(id).run();
  return existing;
}
__name(deleteApplianceManual, "deleteApplianceManual");
async function nextSortOrder(db) {
  const row = await db.prepare(`SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM appliance_manuals`).first();
  const maxOrder = Number(row?.max_order ?? -1);
  return Number.isFinite(maxOrder) ? maxOrder + 1 : 0;
}
__name(nextSortOrder, "nextSortOrder");
function requireApplianceManualsDb(db) {
  if (!db) {
    const error = new Error("APPLIANCE_MANUALS_NOT_CONFIGURED");
    error.code = "APPLIANCE_MANUALS_NOT_CONFIGURED";
    throw error;
  }
  return db;
}
__name(requireApplianceManualsDb, "requireApplianceManualsDb");

// src/applianceManuals/r2Storage.js
init_modules_watch_stub();

// src/applianceManuals/constants.js
init_modules_watch_stub();
var APPLIANCE_MANUAL_CATEGORIES = Object.freeze([
  "Kitchen",
  "Laundry",
  "Heating",
  "TV & Entertainment",
  "Cleaning",
  "Garden",
  "Other"
]);
var MAX_APPLIANCE_MANUAL_PDF_BYTES = 15 * 1024 * 1024;
var APPLIANCE_MANUAL_PDF_MIME = "application/pdf";

// src/applianceManuals/r2Storage.js
function requireApplianceGuidesBucket(bucket) {
  if (!bucket) {
    const error = new Error("APPLIANCE_GUIDES_NOT_CONFIGURED");
    error.code = "APPLIANCE_GUIDES_NOT_CONFIGURED";
    throw error;
  }
  return bucket;
}
__name(requireApplianceGuidesBucket, "requireApplianceGuidesBucket");
function generateObjectKey() {
  return `guides/${crypto.randomUUID()}.pdf`;
}
__name(generateObjectKey, "generateObjectKey");
async function putApplianceGuideObject(bucket, objectKey, buffer, mimeType = APPLIANCE_MANUAL_PDF_MIME) {
  await bucket.put(objectKey, buffer, {
    httpMetadata: {
      contentType: mimeType
    }
  });
}
__name(putApplianceGuideObject, "putApplianceGuideObject");
async function deleteApplianceGuideObject(bucket, objectKey) {
  await bucket.delete(objectKey);
}
__name(deleteApplianceGuideObject, "deleteApplianceGuideObject");
async function getApplianceGuideObject(bucket, objectKey) {
  return bucket.get(objectKey);
}
__name(getApplianceGuideObject, "getApplianceGuideObject");
async function safeDeleteApplianceGuideObject(bucket, objectKey) {
  try {
    await deleteApplianceGuideObject(bucket, objectKey);
    return true;
  } catch {
    console.log(
      JSON.stringify({
        event: "appliance_manual_r2_cleanup_failed",
        objectKeyPrefix: objectKey.slice(0, 12)
      })
    );
    return false;
  }
}
__name(safeDeleteApplianceGuideObject, "safeDeleteApplianceGuideObject");

// src/applianceManuals/serialize.js
init_modules_watch_stub();
function toPublicManual(row) {
  return {
    id: row.id,
    title: row.title,
    applianceName: row.appliance_name,
    manufacturer: row.manufacturer,
    model: row.model,
    category: row.category,
    location: row.location,
    description: row.description,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    published: row.published === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
__name(toPublicManual, "toPublicManual");

// src/applianceManuals/sanitize.js
init_modules_watch_stub();
var LIMITS = {
  title: 200,
  applianceName: 200,
  manufacturer: 120,
  model: 120,
  category: 64,
  location: 200,
  description: 2e3,
  originalFilename: 255
};
function sanitizeOptionalText(value, maxLen) {
  if (value == null || value === "") return null;
  const text = String(value).replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.slice(0, maxLen);
}
__name(sanitizeOptionalText, "sanitizeOptionalText");
function sanitizeRequiredText(value, field) {
  const maxLen = LIMITS[field] ?? 200;
  const text = sanitizeOptionalText(value, maxLen);
  if (!text) {
    return { ok: false, message: "This field is required." };
  }
  return { ok: true, value: text };
}
__name(sanitizeRequiredText, "sanitizeRequiredText");
function sanitizeCategory(value) {
  const category = sanitizeOptionalText(value, LIMITS.category);
  if (!category) {
    return { ok: false, message: "Please choose a category." };
  }
  if (!APPLIANCE_MANUAL_CATEGORIES.includes(category)) {
    return { ok: false, message: "Please choose a valid category." };
  }
  return { ok: true, value: category };
}
__name(sanitizeCategory, "sanitizeCategory");
function parsePublishedFlag(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const text = String(value ?? "").trim().toLowerCase();
  return text === "1" || text === "true" || text === "yes" || text === "on";
}
__name(parsePublishedFlag, "parsePublishedFlag");
function parseSortOrder(value) {
  if (value == null || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.max(0, Math.min(9999, Math.trunc(num)));
}
__name(parseSortOrder, "parseSortOrder");
function sanitizeOriginalFilename(filename) {
  const base = String(filename ?? "manual.pdf").split(/[/\\]/).pop()?.replace(/[^\w.\- ()]/g, "_").trim();
  const safe = base && base.length > 0 ? base : "manual.pdf";
  return safe.slice(0, LIMITS.originalFilename);
}
__name(sanitizeOriginalFilename, "sanitizeOriginalFilename");

// src/applianceManuals/validatePdf.js
init_modules_watch_stub();
var PDF_MAGIC = new Uint8Array([37, 80, 68, 70, 45]);
function hasPdfMagicBytes(bytes) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (view.byteLength < PDF_MAGIC.length) return false;
  for (let i = 0; i < PDF_MAGIC.length; i += 1) {
    if (view[i] !== PDF_MAGIC[i]) return false;
  }
  return true;
}
__name(hasPdfMagicBytes, "hasPdfMagicBytes");
function hasPdfExtension(filename) {
  return /\.pdf$/i.test(String(filename ?? "").trim());
}
__name(hasPdfExtension, "hasPdfExtension");
async function validatePdfUpload(file) {
  if (!file || typeof file.arrayBuffer !== "function") {
    return { ok: false, message: "Please select a PDF file." };
  }
  const filename = String(file.name ?? "").trim();
  if (!filename) {
    return { ok: false, message: "Please select a PDF file." };
  }
  if (!hasPdfExtension(filename)) {
    return { ok: false, message: "Please select a PDF file." };
  }
  const size = Number(file.size ?? 0);
  if (!Number.isFinite(size) || size <= 0) {
    return { ok: false, message: "Please select a PDF file." };
  }
  if (size > MAX_APPLIANCE_MANUAL_PDF_BYTES) {
    return { ok: false, message: "The PDF must be smaller than 15 MB." };
  }
  const declaredMime = String(file.type ?? "").trim().toLowerCase();
  if (declaredMime && declaredMime !== APPLIANCE_MANUAL_PDF_MIME) {
    return { ok: false, message: "Please select a PDF file." };
  }
  const buffer = await file.arrayBuffer();
  if (buffer.byteLength <= 0 || buffer.byteLength > MAX_APPLIANCE_MANUAL_PDF_BYTES) {
    return { ok: false, message: "The PDF must be smaller than 15 MB." };
  }
  if (!hasPdfMagicBytes(buffer)) {
    return { ok: false, message: "The uploaded file is not a valid PDF." };
  }
  return {
    ok: true,
    buffer,
    mimeType: APPLIANCE_MANUAL_PDF_MIME,
    size: buffer.byteLength,
    filename
  };
}
__name(validatePdfUpload, "validatePdfUpload");

// src/routes/applianceManuals.js
async function handleApplianceManuals(request, url, env, correlationId) {
  const basePath = "/api/appliance-manuals";
  if (!url.pathname.startsWith(basePath)) {
    return jsonError(404, "NOT_FOUND", "Route not found.", { correlationId });
  }
  const remainder = url.pathname.slice(basePath.length);
  const segments = remainder.split("/").filter(Boolean);
  try {
    if (segments.length === 0) {
      if (request.method === "GET") return listManuals(request, env, correlationId);
      if (request.method === "POST") return createManual(request, env, correlationId);
      return methodNotAllowed(correlationId);
    }
    const [id, action] = segments;
    if (!id) return jsonError(404, "NOT_FOUND", "Manual not found.", { correlationId });
    if (action === "file") {
      if (segments.length !== 2) return jsonError(404, "NOT_FOUND", "Manual not found.", { correlationId });
      if (request.method === "GET") return streamManualFile(request, env, id, correlationId);
      if (request.method === "PUT") return replaceManualFile(request, env, id, correlationId);
      return methodNotAllowed(correlationId);
    }
    if (segments.length !== 1) {
      return jsonError(404, "NOT_FOUND", "Manual not found.", { correlationId });
    }
    if (request.method === "GET") return getManual(request, env, id, correlationId);
    if (request.method === "PATCH") return patchManual(request, env, id, correlationId);
    if (request.method === "DELETE") return removeManual(request, env, id, correlationId);
    return methodNotAllowed(correlationId);
  } catch (error) {
    if (error?.code === "APPLIANCE_MANUALS_NOT_CONFIGURED" || error?.code === "APPLIANCE_GUIDES_NOT_CONFIGURED") {
      return jsonError(503, "SERVICE_UNAVAILABLE", "Appliance manuals are temporarily unavailable.", {
        correlationId
      });
    }
    throw error;
  }
}
__name(handleApplianceManuals, "handleApplianceManuals");
async function listManuals(request, env, correlationId) {
  const ownerGate = await requireOwnerDeviceMode(request, env);
  const sitterGate = ownerGate.ok ? null : await requireAnyDeviceSession(request, env);
  if (!ownerGate.ok && !sitterGate?.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? "FORBIDDEN", "Forbidden.", { correlationId });
  }
  const db = requireApplianceManualsDb(env.APPLIANCE_MANUALS_DB);
  const rows = await listApplianceManuals(db, { publishedOnly: !ownerGate.ok });
  return Response.json(
    { manuals: rows.map(toPublicManual) },
    { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
  );
}
__name(listManuals, "listManuals");
async function getManual(request, env, id, correlationId) {
  const access = await resolveManualReadAccess(request, env, id, correlationId);
  if (!access.ok) return access.response;
  return Response.json(toPublicManual(access.manual), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}
__name(getManual, "getManual");
async function createManual(request, env, correlationId) {
  const gate = await requireOwnerDeviceMode(request, env);
  if (!gate.ok) {
    return jsonError(gate.status, gate.code, "Forbidden.", { correlationId });
  }
  const form = await request.formData();
  const metadata = parseMetadataFromForm(form);
  if (!metadata.ok) {
    return jsonError(400, "VALIDATION_ERROR", metadata.message, { correlationId });
  }
  const fileEntry = form.get("file");
  const validated = await validatePdfUpload(
    fileEntry instanceof File ? fileEntry : (
      /** @type {File | null} */
      null
    )
  );
  if (!validated.ok) {
    return jsonError(400, "VALIDATION_ERROR", validated.message, { correlationId });
  }
  const db = requireApplianceManualsDb(env.APPLIANCE_MANUALS_DB);
  const bucket = requireApplianceGuidesBucket(env.APPLIANCE_GUIDES);
  const objectKey = generateObjectKey();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const id = crypto.randomUUID();
  const sortOrder = await nextSortOrder(db) ?? 0;
  await putApplianceGuideObject(bucket, objectKey, validated.buffer, validated.mimeType);
  try {
    const created = await insertApplianceManual(db, {
      id,
      ...metadata.value,
      objectKey,
      originalFilename: sanitizeOriginalFilename(validated.filename),
      mimeType: validated.mimeType,
      fileSize: validated.size,
      sortOrder,
      createdAt: now,
      updatedAt: now
    });
    return Response.json(toPublicManual(created), {
      status: 201,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
    });
  } catch (error) {
    await safeDeleteApplianceGuideObject(bucket, objectKey);
    throw error;
  }
}
__name(createManual, "createManual");
async function patchManual(request, env, id, correlationId) {
  const gate = await requireOwnerDeviceMode(request, env);
  if (!gate.ok) {
    return jsonError(gate.status, gate.code, "Forbidden.", { correlationId });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "VALIDATION_ERROR", "Invalid request body.", { correlationId });
  }
  if (body.objectKey != null || body.object_key != null) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid request body.", { correlationId });
  }
  const patch = parseMetadataPatch(body);
  if (!patch.ok) {
    return jsonError(400, "VALIDATION_ERROR", patch.message, { correlationId });
  }
  const db = requireApplianceManualsDb(env.APPLIANCE_MANUALS_DB);
  const updated = await updateApplianceManual(db, id, {
    ...patch.value,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  if (!updated) {
    return jsonError(404, "NOT_FOUND", "Manual not found.", { correlationId });
  }
  return Response.json(toPublicManual(updated), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}
__name(patchManual, "patchManual");
async function replaceManualFile(request, env, id, correlationId) {
  const gate = await requireOwnerDeviceMode(request, env);
  if (!gate.ok) {
    return jsonError(gate.status, gate.code, "Forbidden.", { correlationId });
  }
  const form = await request.formData();
  if (form.get("objectKey") != null || form.get("object_key") != null) {
    return jsonError(400, "VALIDATION_ERROR", "Invalid request body.", { correlationId });
  }
  const fileEntry = form.get("file");
  const validated = await validatePdfUpload(
    fileEntry instanceof File ? fileEntry : (
      /** @type {File | null} */
      null
    )
  );
  if (!validated.ok) {
    return jsonError(400, "VALIDATION_ERROR", validated.message, { correlationId });
  }
  const db = requireApplianceManualsDb(env.APPLIANCE_MANUALS_DB);
  const bucket = requireApplianceGuidesBucket(env.APPLIANCE_GUIDES);
  const existing = await getApplianceManualById(db, id);
  if (!existing) {
    return jsonError(404, "NOT_FOUND", "Manual not found.", { correlationId });
  }
  const nextObjectKey = generateObjectKey();
  await putApplianceGuideObject(bucket, nextObjectKey, validated.buffer, validated.mimeType);
  try {
    const updated = await updateApplianceManual(db, id, {
      objectKey: nextObjectKey,
      originalFilename: sanitizeOriginalFilename(validated.filename),
      mimeType: validated.mimeType,
      fileSize: validated.size,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    if (!updated) {
      await safeDeleteApplianceGuideObject(bucket, nextObjectKey);
      return jsonError(404, "NOT_FOUND", "Manual not found.", { correlationId });
    }
    await safeDeleteApplianceGuideObject(bucket, existing.object_key);
    return Response.json(toPublicManual(updated), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
    });
  } catch (error) {
    await safeDeleteApplianceGuideObject(bucket, nextObjectKey);
    throw error;
  }
}
__name(replaceManualFile, "replaceManualFile");
async function removeManual(request, env, id, correlationId) {
  const gate = await requireOwnerDeviceMode(request, env);
  if (!gate.ok) {
    return jsonError(gate.status, gate.code, "Forbidden.", { correlationId });
  }
  const db = requireApplianceManualsDb(env.APPLIANCE_MANUALS_DB);
  const bucket = requireApplianceGuidesBucket(env.APPLIANCE_GUIDES);
  const removed = await deleteApplianceManual(db, id);
  if (!removed) {
    return jsonError(404, "NOT_FOUND", "Manual not found.", { correlationId });
  }
  await safeDeleteApplianceGuideObject(bucket, removed.object_key);
  return new Response(null, { status: 204 });
}
__name(removeManual, "removeManual");
async function streamManualFile(request, env, id, correlationId) {
  const access = await resolveManualReadAccess(request, env, id, correlationId);
  if (!access.ok) return access.response;
  const bucket = requireApplianceGuidesBucket(env.APPLIANCE_GUIDES);
  const object = await getApplianceGuideObject(bucket, access.manual.object_key);
  if (!object) {
    return jsonError(404, "NOT_FOUND", "Manual not found.", { correlationId });
  }
  const filename = sanitizeOriginalFilename(access.manual.original_filename);
  const encoded = encodeRFC5987Filename(filename);
  const headers = new Headers({
    "Content-Type": access.manual.mime_type || "application/pdf",
    "Content-Disposition": `inline; filename="${escapeFilename(filename)}"; filename*=UTF-8''${encoded}`,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store"
  });
  return new Response(object.body, { status: 200, headers });
}
__name(streamManualFile, "streamManualFile");
async function resolveManualReadAccess(request, env, id, correlationId) {
  const ownerGate = await requireOwnerDeviceMode(request, env);
  const db = requireApplianceManualsDb(env.APPLIANCE_MANUALS_DB);
  const manual = await getApplianceManualById(db, id);
  if (!manual) {
    return { ok: false, response: jsonError(404, "NOT_FOUND", "Manual not found.", { correlationId }) };
  }
  if (ownerGate.ok) {
    return { ok: true, manual };
  }
  const sitterGate = await requireAnyDeviceSession(request, env);
  if (!sitterGate.ok) {
    return {
      ok: false,
      response: jsonError(sitterGate.status, sitterGate.code, "Forbidden.", { correlationId })
    };
  }
  if (manual.published !== 1) {
    return { ok: false, response: jsonError(403, "FORBIDDEN", "Forbidden.", { correlationId }) };
  }
  return { ok: true, manual };
}
__name(resolveManualReadAccess, "resolveManualReadAccess");
function parseMetadataFromForm(form) {
  const title = sanitizeRequiredText(form.get("title"), "title");
  if (!title.ok) return title;
  const applianceName = sanitizeRequiredText(form.get("applianceName") ?? form.get("appliance_name"), "applianceName");
  if (!applianceName.ok) return applianceName;
  const category = sanitizeCategory(form.get("category"));
  if (!category.ok) return category;
  const sortOrder = parseSortOrder(form.get("sortOrder") ?? form.get("sort_order"));
  return {
    ok: true,
    value: {
      title: title.value,
      applianceName: applianceName.value,
      manufacturer: sanitizeOptionalText(form.get("manufacturer"), 120),
      model: sanitizeOptionalText(form.get("model"), 120),
      category: category.value,
      location: sanitizeOptionalText(form.get("location"), 200),
      description: sanitizeOptionalText(form.get("description"), 2e3),
      published: parsePublishedFlag(form.get("published")),
      ...sortOrder != null ? { sortOrder } : {}
    }
  };
}
__name(parseMetadataFromForm, "parseMetadataFromForm");
function parseMetadataPatch(body) {
  const patch = {};
  if (body.title !== void 0) {
    const title = sanitizeRequiredText(body.title, "title");
    if (!title.ok) return title;
    patch.title = title.value;
  }
  if (body.applianceName !== void 0 || body.appliance_name !== void 0) {
    const applianceName = sanitizeRequiredText(body.applianceName ?? body.appliance_name, "applianceName");
    if (!applianceName.ok) return applianceName;
    patch.applianceName = applianceName.value;
  }
  if (body.category !== void 0) {
    const category = sanitizeCategory(body.category);
    if (!category.ok) return category;
    patch.category = category.value;
  }
  if (body.manufacturer !== void 0) {
    patch.manufacturer = sanitizeOptionalText(body.manufacturer, 120);
  }
  if (body.model !== void 0) {
    patch.model = sanitizeOptionalText(body.model, 120);
  }
  if (body.location !== void 0) {
    patch.location = sanitizeOptionalText(body.location, 200);
  }
  if (body.description !== void 0) {
    patch.description = sanitizeOptionalText(body.description, 2e3);
  }
  if (body.published !== void 0) {
    patch.published = parsePublishedFlag(body.published);
  }
  if (body.sortOrder !== void 0 || body.sort_order !== void 0) {
    const sortOrder = parseSortOrder(body.sortOrder ?? body.sort_order);
    if (sortOrder == null) {
      return { ok: false, message: "Invalid sort order." };
    }
    patch.sortOrder = sortOrder;
  }
  if (Object.keys(patch).length === 0) {
    return { ok: false, message: "No changes provided." };
  }
  return { ok: true, value: patch };
}
__name(parseMetadataPatch, "parseMetadataPatch");
function escapeFilename(filename) {
  return filename.replace(/["\\]/g, "_");
}
__name(escapeFilename, "escapeFilename");
function encodeRFC5987Filename(filename) {
  return encodeURIComponent(filename).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}
__name(encodeRFC5987Filename, "encodeRFC5987Filename");

// src/routes/houseGuide.js
init_modules_watch_stub();

// src/houseGuide/assembleCatalog.js
init_modules_watch_stub();

// src/houseGuide/repository.js
init_modules_watch_stub();
function parseJsonArray(value) {
  if (!value) return [];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(value) ? value : [];
}
__name(parseJsonArray, "parseJsonArray");
function parseJsonBlocks(value) {
  return parseJsonArray(value);
}
__name(parseJsonBlocks, "parseJsonBlocks");
function requireHouseGuideDb(db) {
  if (!db) {
    const error = new Error("HOUSE_GUIDE_NOT_CONFIGURED");
    error.code = "HOUSE_GUIDE_NOT_CONFIGURED";
    throw error;
  }
  return db;
}
__name(requireHouseGuideDb, "requireHouseGuideDb");
async function isHouseGuideSeeded(db) {
  const row = await db.prepare(`SELECT id FROM guide_settings WHERE id = ?`).bind("default").first();
  return Boolean(row);
}
__name(isHouseGuideSeeded, "isHouseGuideSeeded");
async function getGuideSettings(db) {
  return db.prepare(`SELECT * FROM guide_settings WHERE id = ?`).bind("default").first();
}
__name(getGuideSettings, "getGuideSettings");
async function listGuideMedia(db) {
  const result = await db.prepare(`SELECT * FROM guide_media ORDER BY id ASC`).all();
  return result.results ?? [];
}
__name(listGuideMedia, "listGuideMedia");
async function getGuideTopicById(db, id) {
  return db.prepare(`SELECT * FROM guide_topics WHERE id = ?`).bind(id).first();
}
__name(getGuideTopicById, "getGuideTopicById");
async function getGuideMediaById(db, id) {
  return db.prepare(`SELECT * FROM guide_media WHERE id = ?`).bind(id).first();
}
__name(getGuideMediaById, "getGuideMediaById");
async function clearGuideCatalog(db) {
  await db.batch([
    db.prepare(`DELETE FROM guide_topics`),
    db.prepare(`DELETE FROM guide_categories`),
    db.prepare(`DELETE FROM guide_media`),
    db.prepare(`DELETE FROM guide_settings`)
  ]);
}
__name(clearGuideCatalog, "clearGuideCatalog");
async function importGuideCatalog(db, catalog) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const categories = catalog.categories ?? [];
  const media = catalog.media ?? {};
  await db.batch([
    db.prepare(`DELETE FROM guide_topics`),
    db.prepare(`DELETE FROM guide_categories`),
    db.prepare(`DELETE FROM guide_media`),
    db.prepare(`DELETE FROM guide_settings`)
  ]);
  await db.prepare(
    `INSERT INTO guide_settings (id, version, home_summary_title, home_summary_subtitle, updated_at)
       VALUES (?, ?, ?, ?, ?)`
  ).bind(
    "default",
    catalog.version ?? 2,
    catalog.homeSummaryTitle ?? "Everything you need to know",
    catalog.homeSummarySubtitle ?? "",
    now
  ).run();
  let categoryOrder = 0;
  for (const category of categories) {
    await db.prepare(
      `INSERT INTO guide_categories (
          id, title, card_subtitle, icon_id, accent, search_terms, sort_order, published, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      category.id,
      category.title,
      category.cardSubtitle,
      category.iconId,
      category.accent,
      JSON.stringify(category.searchTerms ?? []),
      categoryOrder,
      1,
      now
    ).run();
    categoryOrder += 1;
    let topicOrder = 0;
    for (const topic of category.topics ?? []) {
      const blocks = JSON.stringify(topic.blocks ?? []);
      await db.prepare(
        `INSERT INTO guide_topics (
            id, category_id, title, subtitle, summary, search_terms, appliance_manual_terms,
            blocks, published_blocks, actions, sort_order, published, has_draft, audience, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        topic.id,
        category.id,
        topic.title,
        topic.subtitle,
        topic.summary,
        JSON.stringify(topic.searchTerms ?? []),
        topic.applianceManualTerms ? JSON.stringify(topic.applianceManualTerms) : null,
        blocks,
        blocks,
        JSON.stringify(topic.actions ?? []),
        topicOrder,
        1,
        0,
        topic.audience === "owner" ? "owner" : "guest",
        now
      ).run();
      topicOrder += 1;
    }
  }
  for (const [mediaId, asset] of Object.entries(media)) {
    await db.prepare(
      `INSERT INTO guide_media (
          id, alt, object_key, source_file, original_filename, mime_type, file_size, published, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      mediaId,
      asset.alt ?? "",
      null,
      asset.file ?? null,
      asset.file ?? null,
      null,
      null,
      1,
      now
    ).run();
  }
}
__name(importGuideCatalog, "importGuideCatalog");
async function updateGuideTopic(db, id, patch) {
  const existing = await getGuideTopicById(db, id);
  if (!existing) return null;
  const blocksJson = patch.blocks !== void 0 ? JSON.stringify(patch.blocks) : existing.blocks;
  const publishedBlocks = existing.published_blocks ?? existing.blocks;
  let hasDraft = existing.has_draft;
  if (patch.blocks !== void 0) {
    hasDraft = blocksJson !== publishedBlocks ? 1 : 0;
  }
  await db.prepare(
    `UPDATE guide_topics SET
        title = ?, subtitle = ?, summary = ?, search_terms = ?, appliance_manual_terms = ?,
        blocks = ?, actions = ?, has_draft = ?, audience = ?, updated_at = ?
      WHERE id = ?`
  ).bind(
    patch.title ?? existing.title,
    patch.subtitle ?? existing.subtitle,
    patch.summary ?? existing.summary,
    patch.searchTerms !== void 0 ? JSON.stringify(patch.searchTerms) : existing.search_terms,
    patch.applianceManualTerms !== void 0 ? patch.applianceManualTerms ? JSON.stringify(patch.applianceManualTerms) : null : existing.appliance_manual_terms,
    blocksJson,
    patch.actions !== void 0 ? JSON.stringify(patch.actions) : existing.actions,
    hasDraft,
    patch.audience ?? existing.audience ?? "guest",
    patch.updatedAt ?? (/* @__PURE__ */ new Date()).toISOString(),
    id
  ).run();
  return getGuideTopicById(db, id);
}
__name(updateGuideTopic, "updateGuideTopic");
async function publishGuideTopic(db, id) {
  const existing = await getGuideTopicById(db, id);
  if (!existing) return null;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await db.prepare(
    `UPDATE guide_topics SET
        published_blocks = blocks, has_draft = 0, published = 1, updated_at = ?
      WHERE id = ?`
  ).bind(now, id).run();
  return getGuideTopicById(db, id);
}
__name(publishGuideTopic, "publishGuideTopic");
async function publishAllGuideTopics(db) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await db.prepare(
    `UPDATE guide_topics SET
        published_blocks = blocks, has_draft = 0, published = 1, updated_at = ?
      WHERE has_draft = 1 OR published_blocks IS NULL`
  ).bind(now).run();
}
__name(publishAllGuideTopics, "publishAllGuideTopics");
async function countDraftGuideTopics(db) {
  const row = await db.prepare(`SELECT COUNT(*) AS count FROM guide_topics WHERE has_draft = 1`).first();
  return Number(row?.count ?? 0);
}
__name(countDraftGuideTopics, "countDraftGuideTopics");
async function insertGuideMedia(db, input) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  await db.prepare(
    `INSERT INTO guide_media (
        id, alt, object_key, source_file, original_filename, mime_type, file_size, published, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    input.id,
    input.alt,
    input.objectKey,
    null,
    input.originalFilename,
    input.mimeType,
    input.fileSize,
    1,
    now
  ).run();
  return getGuideMediaById(db, input.id);
}
__name(insertGuideMedia, "insertGuideMedia");
async function updateGuideSettings(db, patch) {
  const existing = await getGuideSettings(db);
  if (!existing) return null;
  await db.prepare(
    `UPDATE guide_settings SET
        home_summary_title = ?, home_summary_subtitle = ?, updated_at = ?
      WHERE id = ?`
  ).bind(
    patch.homeSummaryTitle ?? existing.home_summary_title,
    patch.homeSummarySubtitle ?? existing.home_summary_subtitle,
    patch.updatedAt ?? (/* @__PURE__ */ new Date()).toISOString(),
    "default"
  ).run();
  return getGuideSettings(db);
}
__name(updateGuideSettings, "updateGuideSettings");
async function getGuideCategoryById(db, categoryId) {
  return db.prepare(`SELECT * FROM guide_categories WHERE id = ?`).bind(categoryId).first();
}
__name(getGuideCategoryById, "getGuideCategoryById");
async function createGuideTopic(db, input) {
  const category = await getGuideCategoryById(db, input.categoryId);
  if (!category) return null;
  const existing = await getGuideTopicById(db, input.id);
  if (existing) return { conflict: true };
  const maxRow = await db.prepare(`SELECT MAX(sort_order) AS max_order FROM guide_topics WHERE category_id = ?`).bind(input.categoryId).first();
  const sortOrder = Number(maxRow?.max_order ?? -1) + 1;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const blocks = JSON.stringify(input.blocks ?? [{ type: "text", content: "" }]);
  await db.prepare(
    `INSERT INTO guide_topics (
        id, category_id, title, subtitle, summary, search_terms, appliance_manual_terms,
        blocks, published_blocks, actions, sort_order, published, has_draft, audience, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    input.id,
    input.categoryId,
    input.title,
    input.subtitle,
    input.summary,
    JSON.stringify(input.searchTerms ?? []),
    null,
    blocks,
    null,
    JSON.stringify(input.actions ?? []),
    sortOrder,
    0,
    1,
    input.audience ?? "guest",
    now
  ).run();
  return getGuideTopicById(db, input.id);
}
__name(createGuideTopic, "createGuideTopic");
async function deleteGuideTopic(db, id) {
  const existing = await getGuideTopicById(db, id);
  if (!existing) return null;
  await db.prepare(`DELETE FROM guide_topics WHERE id = ?`).bind(id).run();
  return existing;
}
__name(deleteGuideTopic, "deleteGuideTopic");
async function reorderGuideTopicsInCategory(db, categoryId, topicIds) {
  const category = await getGuideCategoryById(db, categoryId);
  if (!category) return null;
  const rows = await db.prepare(`SELECT id FROM guide_topics WHERE category_id = ?`).bind(categoryId).all();
  const existingIds = new Set((rows.results ?? []).map((row) => String(row.id)));
  if (topicIds.length !== existingIds.size) return { invalid: true };
  for (const topicId of topicIds) {
    if (!existingIds.has(topicId)) return { invalid: true };
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  let order = 0;
  for (const topicId of topicIds) {
    await db.prepare(`UPDATE guide_topics SET sort_order = ?, updated_at = ? WHERE id = ? AND category_id = ?`).bind(order, now, topicId, categoryId).run();
    order += 1;
  }
  return { ok: true };
}
__name(reorderGuideTopicsInCategory, "reorderGuideTopicsInCategory");
async function deleteGuideMedia(db, id) {
  const existing = await getGuideMediaById(db, id);
  if (!existing) return null;
  await db.prepare(`DELETE FROM guide_media WHERE id = ?`).bind(id).run();
  return existing;
}
__name(deleteGuideMedia, "deleteGuideMedia");

// src/houseGuide/assembleCatalog.js
function mapTopicRow(topicRows, publishedOnly, includeDraftBlocks) {
  const byCategory = {};
  for (const row of topicRows) {
    if (publishedOnly && !row.published) continue;
    if (publishedOnly && row.audience === "owner") continue;
    const publishedBlocks = row.published_blocks ? parseJsonBlocks(row.published_blocks) : parseJsonBlocks(row.blocks);
    const draftBlocks = parseJsonBlocks(row.blocks);
    const blocks = includeDraftBlocks && row.has_draft ? draftBlocks : publishedBlocks.length ? publishedBlocks : draftBlocks;
    const topic = {
      id: String(row.id),
      title: String(row.title),
      subtitle: String(row.subtitle),
      summary: String(row.summary),
      searchTerms: parseJsonArray(row.search_terms),
      applianceManualTerms: row.appliance_manual_terms ? parseJsonArray(row.appliance_manual_terms) : void 0,
      blocks,
      actions: parseJsonArray(row.actions),
      hasDraft: Boolean(row.has_draft),
      published: Boolean(row.published),
      audience: row.audience === "owner" ? "owner" : "guest"
    };
    const categoryId = String(row.category_id);
    if (!byCategory[categoryId]) byCategory[categoryId] = [];
    byCategory[categoryId].push(topic);
  }
  return byCategory;
}
__name(mapTopicRow, "mapTopicRow");
function mapMediaRows(mediaRows) {
  const media = {};
  for (const row of mediaRows) {
    if (!row.published) continue;
    media[String(row.id)] = {
      alt: String(row.alt),
      ...row.source_file ? { file: String(row.source_file) } : {},
      hasUpload: Boolean(row.object_key)
    };
  }
  return media;
}
__name(mapMediaRows, "mapMediaRows");
function assembleGuideCatalog(input, settings, categoryRows, topicRows, mediaRows, options = {}) {
  const publishedOnly = options.publishedOnly ?? false;
  const includeDraftBlocks = options.includeDraftBlocks ?? false;
  const topicsByCategory = mapTopicRow(topicRows, publishedOnly, includeDraftBlocks);
  const categories = [];
  for (const row of categoryRows) {
    if (publishedOnly && !row.published) continue;
    const topics = topicsByCategory[String(row.id)] ?? [];
    if (publishedOnly && topics.length === 0 && row.id !== "appliance-manuals") {
    }
    categories.push({
      id: String(row.id),
      title: String(row.title),
      cardSubtitle: String(row.card_subtitle),
      iconId: String(row.icon_id),
      accent: String(row.accent),
      searchTerms: parseJsonArray(row.search_terms),
      topics
    });
  }
  return {
    version: Number(settings?.version ?? 2),
    homeSummaryTitle: String(settings?.home_summary_title ?? "Everything you need to know"),
    homeSummarySubtitle: String(settings?.home_summary_subtitle ?? ""),
    media: mapMediaRows(mediaRows),
    categories,
    draftCount: topicRows.filter((row) => row.has_draft).length,
    seeded: true
  };
}
__name(assembleGuideCatalog, "assembleGuideCatalog");
async function loadAssembledGuideCatalog(db, options = {}) {
  const settings = await db.prepare(`SELECT * FROM guide_settings WHERE id = ?`).bind("default").first();
  if (!settings) {
    return null;
  }
  const categoryRows = (await db.prepare(`SELECT * FROM guide_categories ORDER BY sort_order ASC`).all()).results ?? [];
  const topicRows = (await db.prepare(`SELECT * FROM guide_topics ORDER BY category_id ASC, sort_order ASC, title ASC`).all()).results ?? [];
  const mediaRows = (await db.prepare(`SELECT * FROM guide_media ORDER BY id ASC`).all()).results ?? [];
  return assembleGuideCatalog({}, settings, categoryRows, topicRows, mediaRows, options);
}
__name(loadAssembledGuideCatalog, "loadAssembledGuideCatalog");
function toPublicGuideTopic(row) {
  return {
    id: String(row.id),
    categoryId: String(row.category_id),
    title: String(row.title),
    subtitle: String(row.subtitle),
    summary: String(row.summary),
    searchTerms: parseJsonArray(row.search_terms),
    applianceManualTerms: row.appliance_manual_terms ? parseJsonArray(row.appliance_manual_terms) : void 0,
    blocks: parseJsonBlocks(row.blocks),
    publishedBlocks: row.published_blocks ? parseJsonBlocks(row.published_blocks) : null,
    actions: parseJsonArray(row.actions),
    hasDraft: Boolean(row.has_draft),
    published: Boolean(row.published),
    audience: row.audience === "owner" ? "owner" : "guest",
    updatedAt: String(row.updated_at)
  };
}
__name(toPublicGuideTopic, "toPublicGuideTopic");
function toPublicGuideMedia(row) {
  return {
    id: String(row.id),
    alt: String(row.alt),
    sourceFile: row.source_file ? String(row.source_file) : null,
    hasUpload: Boolean(row.object_key),
    originalFilename: row.original_filename ? String(row.original_filename) : null,
    updatedAt: String(row.updated_at)
  };
}
__name(toPublicGuideMedia, "toPublicGuideMedia");

// src/houseGuide/r2Storage.js
init_modules_watch_stub();
function requireGuideMediaBucket(bucket) {
  if (!bucket) {
    const error = new Error("GUIDE_MEDIA_NOT_CONFIGURED");
    error.code = "GUIDE_MEDIA_NOT_CONFIGURED";
    throw error;
  }
  return bucket;
}
__name(requireGuideMediaBucket, "requireGuideMediaBucket");
function generateGuideMediaObjectKey() {
  return `media/${crypto.randomUUID()}`;
}
__name(generateGuideMediaObjectKey, "generateGuideMediaObjectKey");
async function putGuideMediaObject(bucket, objectKey, buffer, mimeType) {
  await bucket.put(objectKey, buffer, {
    httpMetadata: {
      contentType: mimeType
    }
  });
}
__name(putGuideMediaObject, "putGuideMediaObject");
async function getGuideMediaObject(bucket, objectKey) {
  return bucket.get(objectKey);
}
__name(getGuideMediaObject, "getGuideMediaObject");
async function safeDeleteGuideMediaObject(bucket, objectKey) {
  if (!objectKey) return false;
  try {
    await bucket.delete(objectKey);
    return true;
  } catch {
    return false;
  }
}
__name(safeDeleteGuideMediaObject, "safeDeleteGuideMediaObject");

// src/houseGuide/sanitize.js
init_modules_watch_stub();
function sanitizeRequiredText2(value, maxLength = 200) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}
__name(sanitizeRequiredText2, "sanitizeRequiredText");
function sanitizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item ?? "").trim()).filter(Boolean).slice(0, 40);
}
__name(sanitizeStringArray, "sanitizeStringArray");
function sanitizeBlocks(value) {
  if (!Array.isArray(value)) return null;
  if (value.length > 80) return null;
  return value;
}
__name(sanitizeBlocks, "sanitizeBlocks");
function sanitizeMediaId(value) {
  const text = String(value ?? "").trim();
  if (!/^[a-z0-9-]{1,64}$/i.test(text)) return null;
  return text;
}
__name(sanitizeMediaId, "sanitizeMediaId");
function sanitizeAudience(value) {
  if (value === "owner" || value === "guest") return value;
  return null;
}
__name(sanitizeAudience, "sanitizeAudience");
function sanitizeGuideActions(value) {
  if (!Array.isArray(value)) return null;
  if (value.length > 12) return null;
  const out = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const type = String(item.type ?? "");
    if (type === "alexa") {
      const buttonId = Number(item.buttonId);
      const label = sanitizeRequiredText2(item.label, 80);
      if (!Number.isInteger(buttonId) || buttonId < 1 || buttonId > 99 || !label) return null;
      out.push({ type: "alexa", buttonId, label });
      continue;
    }
    if (type === "navigate") {
      const topicId = sanitizeMediaId(String(item.topicId ?? ""));
      const label = sanitizeRequiredText2(item.label, 80);
      if (!topicId || !label) return null;
      out.push({ type: "navigate", topicId, label });
      continue;
    }
    if (type === "panel") {
      const label = sanitizeRequiredText2(item.label, 80);
      if (!label) return null;
      const heading = item.heading ? sanitizeRequiredText2(item.heading, 120) : void 0;
      if (item.heading && !heading) return null;
      if (!Array.isArray(item.items) || item.items.length > 24) return null;
      const items = item.items.map((row) => {
        if (!row || typeof row !== "object") return null;
        const rowLabel = sanitizeRequiredText2(row.label, 80);
        const rowValue = sanitizeRequiredText2(row.value, 240);
        if (!rowLabel || !rowValue) return null;
        return { label: rowLabel, value: rowValue };
      }).filter(Boolean);
      out.push({
        type: "panel",
        label,
        ...heading ? { heading } : {},
        items
      });
      continue;
    }
    return null;
  }
  return out;
}
__name(sanitizeGuideActions, "sanitizeGuideActions");
function sanitizeOriginalFilename2(filename) {
  const base = String(filename ?? "").split(/[/\\]/).pop() ?? "";
  const cleaned = base.replace(/[^\w.\- ()]/g, "_").slice(0, 180);
  return cleaned || "image.jpg";
}
__name(sanitizeOriginalFilename2, "sanitizeOriginalFilename");

// src/houseGuide/validateImage.js
init_modules_watch_stub();

// src/houseGuide/constants.js
init_modules_watch_stub();
var GUIDE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
var GUIDE_IMAGE_MIMES = /* @__PURE__ */ new Set(["image/jpeg", "image/png", "image/webp"]);

// src/houseGuide/validateImage.js
function detectImageMime(buffer) {
  const bytes = new Uint8Array(buffer.slice(0, 12));
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) return "image/png";
  if (bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70 && bytes[8] === 87 && bytes[9] === 69 && bytes[10] === 66 && bytes[11] === 80) {
    return "image/webp";
  }
  return null;
}
__name(detectImageMime, "detectImageMime");
function validateGuideImageUpload(file) {
  if (!file || !(file instanceof File)) {
    return { ok: false, message: "Please select an image file." };
  }
  if (file.size <= 0) {
    return { ok: false, message: "The image file is empty." };
  }
  if (file.size > GUIDE_IMAGE_MAX_BYTES) {
    return { ok: false, message: "Images must be smaller than 5 MB." };
  }
  return { ok: true, file };
}
__name(validateGuideImageUpload, "validateGuideImageUpload");
function validateGuideImageBuffer(buffer, declaredMime) {
  const detected = detectImageMime(buffer);
  if (!detected || !GUIDE_IMAGE_MIMES.has(detected)) {
    return { ok: false, message: "Only JPEG, PNG, and WebP images are supported." };
  }
  if (declaredMime && declaredMime !== detected && !GUIDE_IMAGE_MIMES.has(declaredMime)) {
    return { ok: false, message: "Unsupported image type." };
  }
  return { ok: true, mimeType: detected };
}
__name(validateGuideImageBuffer, "validateGuideImageBuffer");

// src/routes/siteBackup.js
init_modules_watch_stub();

// src/houseGuide/exportCatalog.js
init_modules_watch_stub();
function buildImportableGuideCatalog(settings, categoryRows, topicRows, mediaRows) {
  const topicsByCategory = {};
  for (const row of topicRows) {
    const publishedBlocks = row.published_blocks ? parseJsonBlocks(row.published_blocks) : parseJsonBlocks(row.blocks);
    const draftBlocks = parseJsonBlocks(row.blocks);
    const blocks = row.has_draft ? draftBlocks : publishedBlocks.length ? publishedBlocks : draftBlocks;
    const topic = {
      id: String(row.id),
      title: String(row.title),
      subtitle: String(row.subtitle),
      summary: String(row.summary),
      searchTerms: parseJsonArray(row.search_terms),
      ...row.appliance_manual_terms ? { applianceManualTerms: parseJsonArray(row.appliance_manual_terms) } : {},
      blocks,
      actions: parseJsonArray(row.actions),
      audience: row.audience === "owner" ? "owner" : "guest"
    };
    const categoryId = String(row.category_id);
    if (!topicsByCategory[categoryId]) topicsByCategory[categoryId] = [];
    topicsByCategory[categoryId].push(topic);
  }
  const media = {};
  const uploadedMedia = [];
  for (const row of mediaRows) {
    const id = String(row.id);
    const entry = { alt: String(row.alt ?? "") };
    if (row.source_file) {
      entry.file = String(row.source_file);
    }
    media[id] = entry;
    if (row.object_key) {
      uploadedMedia.push({ id, alt: entry.alt });
    }
  }
  const categories = categoryRows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    cardSubtitle: String(row.card_subtitle),
    iconId: String(row.icon_id),
    accent: String(row.accent),
    searchTerms: parseJsonArray(row.search_terms),
    topics: topicsByCategory[String(row.id)] ?? []
  }));
  return {
    catalog: {
      version: Number(settings?.version ?? 2),
      homeSummaryTitle: String(settings?.home_summary_title ?? "Everything you need to know"),
      homeSummarySubtitle: String(settings?.home_summary_subtitle ?? ""),
      media,
      categories
    },
    uploadedMedia
  };
}
__name(buildImportableGuideCatalog, "buildImportableGuideCatalog");
async function loadImportableGuideCatalog(db) {
  const settings = await db.prepare(`SELECT * FROM guide_settings WHERE id = ?`).bind("default").first();
  if (!settings) {
    return null;
  }
  const categoryRows = (await db.prepare(`SELECT * FROM guide_categories ORDER BY sort_order ASC`).all()).results ?? [];
  const topicRows = (await db.prepare(`SELECT * FROM guide_topics ORDER BY category_id ASC, sort_order ASC, title ASC`).all()).results ?? [];
  const mediaRows = (await db.prepare(`SELECT * FROM guide_media ORDER BY id ASC`).all()).results ?? [];
  return buildImportableGuideCatalog(settings, categoryRows, topicRows, mediaRows);
}
__name(loadImportableGuideCatalog, "loadImportableGuideCatalog");

// src/routes/siteBackup.js
var SITE_BACKUP_FORMAT_VERSION = 1;
async function buildSiteBackupPayload(env) {
  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  const seeded = await isHouseGuideSeeded(db);
  const sitterSecretsDisclosed = await getSitterSecretsDisclosed(env);
  let guide = { seeded: false, catalog: null, uploadedMedia: [] };
  if (seeded) {
    const exported = await loadImportableGuideCatalog(db);
    guide = {
      seeded: true,
      catalog: exported?.catalog ?? null,
      uploadedMedia: exported?.uploadedMedia ?? []
    };
  }
  return {
    formatVersion: SITE_BACKUP_FORMAT_VERSION,
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    siteSettings: {
      sitterSecretsDisclosed
    },
    guide
  };
}
__name(buildSiteBackupPayload, "buildSiteBackupPayload");
async function restoreSiteBackupPayload(env, payload) {
  if (payload.siteSettings?.sitterSecretsDisclosed !== void 0) {
    await setSitterSecretsDisclosed(env, Boolean(payload.siteSettings.sitterSecretsDisclosed));
  }
  if (payload.guide?.catalog && Array.isArray(payload.guide.catalog.categories)) {
    const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
    await importGuideCatalog(db, payload.guide.catalog);
  }
  return buildSiteBackupPayload(env);
}
__name(restoreSiteBackupPayload, "restoreSiteBackupPayload");
async function handleSiteBackupGet(request, env, correlationId) {
  if (request.method !== "GET") {
    return methodNotAllowed(correlationId);
  }
  const ownerGate = await requireOwnerDeviceMode(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? "FORBIDDEN", "Forbidden.", { correlationId });
  }
  const payload = await buildSiteBackupPayload(env);
  return Response.json(payload, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Content-Disposition": 'attachment; filename="lovely-home-hub-backup.json"'
    }
  });
}
__name(handleSiteBackupGet, "handleSiteBackupGet");
async function handleSiteBackupRestore(request, env, correlationId) {
  if (request.method !== "POST") {
    return methodNotAllowed(correlationId);
  }
  const ownerGate = await requireOwnerDeviceMode(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? "FORBIDDEN", "Forbidden.", { correlationId });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "BAD_REQUEST", "Invalid JSON body.", { correlationId });
  }
  if (!body || typeof body !== "object") {
    return jsonError(400, "BAD_REQUEST", "Expected a backup JSON object.", { correlationId });
  }
  const formatVersion = Number(body.formatVersion ?? SITE_BACKUP_FORMAT_VERSION);
  if (formatVersion !== SITE_BACKUP_FORMAT_VERSION) {
    return jsonError(400, "BAD_REQUEST", `Unsupported backup format version ${formatVersion}.`, { correlationId });
  }
  if (body.guide?.catalog && !Array.isArray(body.guide.catalog.categories)) {
    return jsonError(400, "BAD_REQUEST", "guide.catalog.categories must be an array.", { correlationId });
  }
  const restored = await restoreSiteBackupPayload(env, body);
  return Response.json({ ok: true, backup: restored }, {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}
__name(handleSiteBackupRestore, "handleSiteBackupRestore");
async function handleGuideExportGet(request, env, correlationId) {
  if (request.method !== "GET") {
    return methodNotAllowed(correlationId);
  }
  const ownerGate = await requireOwnerDeviceMode(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? "FORBIDDEN", "Forbidden.", { correlationId });
  }
  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  const seeded = await isHouseGuideSeeded(db);
  if (!seeded) {
    return jsonError(404, "NOT_FOUND", "House guide is not seeded yet.", { correlationId });
  }
  const exported = await loadImportableGuideCatalog(db);
  if (!exported?.catalog) {
    return jsonError(404, "NOT_FOUND", "House guide is not seeded yet.", { correlationId });
  }
  return Response.json(
    {
      formatVersion: SITE_BACKUP_FORMAT_VERSION,
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      catalog: exported.catalog,
      uploadedMedia: exported.uploadedMedia
    },
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Content-Disposition": 'attachment; filename="house-guide-export.json"'
      }
    }
  );
}
__name(handleGuideExportGet, "handleGuideExportGet");
async function handleSiteBackup(request, url, env, correlationId) {
  if (url.pathname === "/api/site/backup") {
    return handleSiteBackupGet(request, env, correlationId);
  }
  if (url.pathname === "/api/site/restore") {
    return handleSiteBackupRestore(request, env, correlationId);
  }
  return jsonError(404, "NOT_FOUND", "Route not found.", { correlationId });
}
__name(handleSiteBackup, "handleSiteBackup");

// src/routes/houseGuide.js
async function handleHouseGuide(request, url, env, correlationId) {
  const basePath = "/api/house-guide";
  if (!url.pathname.startsWith(basePath)) {
    return jsonError(404, "NOT_FOUND", "Route not found.", { correlationId });
  }
  const remainder = url.pathname.slice(basePath.length);
  const segments = remainder.split("/").filter(Boolean);
  try {
    if (segments.length === 0) {
      return methodNotAllowed(correlationId);
    }
    if (segments[0] === "catalog") {
      if (segments.length !== 1) return jsonError(404, "NOT_FOUND", "Route not found.", { correlationId });
      if (request.method === "GET") return getCatalog(request, env, url, correlationId);
      return methodNotAllowed(correlationId);
    }
    if (segments[0] === "export") {
      if (segments.length !== 1) return jsonError(404, "NOT_FOUND", "Route not found.", { correlationId });
      if (request.method === "GET") return exportCatalog(request, env, correlationId);
      return methodNotAllowed(correlationId);
    }
    if (segments[0] === "import") {
      if (segments.length !== 1) return jsonError(404, "NOT_FOUND", "Route not found.", { correlationId });
      if (request.method === "POST") return importCatalog(request, env, correlationId);
      return methodNotAllowed(correlationId);
    }
    if (segments[0] === "publish-all") {
      if (segments.length !== 1) return jsonError(404, "NOT_FOUND", "Route not found.", { correlationId });
      if (request.method === "POST") return publishAll(request, env, correlationId);
      return methodNotAllowed(correlationId);
    }
    if (segments[0] === "settings") {
      if (segments.length !== 1) return jsonError(404, "NOT_FOUND", "Route not found.", { correlationId });
      if (request.method === "PATCH") return patchSettings(request, env, correlationId);
      return methodNotAllowed(correlationId);
    }
    if (segments[0] === "categories") {
      const categoryId = segments[1];
      const action = segments[2];
      if (action === "reorder-topics") {
        if (segments.length !== 3 || !categoryId) {
          return jsonError(404, "NOT_FOUND", "Route not found.", { correlationId });
        }
        if (request.method === "POST") return reorderTopics(request, env, categoryId, correlationId);
        return methodNotAllowed(correlationId);
      }
      return jsonError(404, "NOT_FOUND", "Route not found.", { correlationId });
    }
    if (segments[0] === "topics") {
      const topicId = segments[1];
      const action = segments[2];
      if (!topicId) {
        if (segments.length !== 1) return jsonError(404, "NOT_FOUND", "Route not found.", { correlationId });
        if (request.method === "POST") return createTopic(request, env, correlationId);
        return methodNotAllowed(correlationId);
      }
      if (action === "publish") {
        if (segments.length !== 3) return jsonError(404, "NOT_FOUND", "Topic not found.", { correlationId });
        if (request.method === "POST") return publishTopic(request, env, topicId, correlationId);
        return methodNotAllowed(correlationId);
      }
      if (segments.length !== 2) return jsonError(404, "NOT_FOUND", "Topic not found.", { correlationId });
      if (request.method === "GET") return getTopic(request, env, topicId, correlationId);
      if (request.method === "PATCH") return patchTopic(request, env, topicId, correlationId);
      if (request.method === "DELETE") return removeTopic(request, env, topicId, correlationId);
      return methodNotAllowed(correlationId);
    }
    if (segments[0] === "media") {
      const mediaId = segments[1];
      const action = segments[2];
      if (action === "file") {
        if (segments.length !== 3 || !mediaId) {
          return jsonError(404, "NOT_FOUND", "Media not found.", { correlationId });
        }
        if (request.method === "GET") return streamMediaFile(request, env, mediaId, correlationId);
        return methodNotAllowed(correlationId);
      }
      if (segments.length === 2 && mediaId) {
        if (request.method === "DELETE") return removeMedia(request, env, mediaId, correlationId);
        return methodNotAllowed(correlationId);
      }
      if (segments.length !== 1) return jsonError(404, "NOT_FOUND", "Route not found.", { correlationId });
      if (request.method === "GET") return listMedia(request, env, correlationId);
      if (request.method === "POST") return uploadMedia(request, env, correlationId);
      return methodNotAllowed(correlationId);
    }
    return jsonError(404, "NOT_FOUND", "Route not found.", { correlationId });
  } catch (error) {
    if (error?.code === "HOUSE_GUIDE_NOT_CONFIGURED" || error?.code === "GUIDE_MEDIA_NOT_CONFIGURED") {
      return jsonError(503, "SERVICE_UNAVAILABLE", "House guide content is temporarily unavailable.", {
        correlationId
      });
    }
    throw error;
  }
}
__name(handleHouseGuide, "handleHouseGuide");
async function getCatalog(request, env, url, correlationId) {
  const ownerGate = await requireOwnerDeviceMode(request, env);
  const sitterGate = ownerGate.ok ? null : await requireAnyDeviceSession(request, env);
  if (!ownerGate.ok && !sitterGate?.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? "FORBIDDEN", "Forbidden.", { correlationId });
  }
  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  const seeded = await isHouseGuideSeeded(db);
  if (!seeded) {
    return Response.json(
      { seeded: false, catalog: null },
      { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
    );
  }
  const includeDraft = ownerGate.ok && url.searchParams.get("draft") === "1";
  const catalog = await loadAssembledGuideCatalog(db, {
    publishedOnly: !ownerGate.ok,
    includeDraftBlocks: includeDraft
  });
  return Response.json(
    {
      seeded: true,
      catalog,
      draftCount: catalog?.draftCount ?? 0
    },
    { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
  );
}
__name(getCatalog, "getCatalog");
async function exportCatalog(request, env, correlationId) {
  return handleGuideExportGet(request, env, correlationId);
}
__name(exportCatalog, "exportCatalog");
async function importCatalog(request, env, correlationId) {
  const ownerGate = await requireOwnerDeviceMode(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? "FORBIDDEN", "Forbidden.", { correlationId });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "BAD_REQUEST", "Invalid JSON body.", { correlationId });
  }
  if (!body?.catalog || !Array.isArray(body.catalog.categories)) {
    return jsonError(400, "BAD_REQUEST", "Expected { catalog: GuideCatalog }.", { correlationId });
  }
  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  await importGuideCatalog(db, body.catalog);
  const catalog = await loadAssembledGuideCatalog(db, { includeDraftBlocks: true });
  return Response.json({ ok: true, catalog }, { status: 201, headers: { "Content-Type": "application/json" } });
}
__name(importCatalog, "importCatalog");
async function getTopic(request, env, topicId, correlationId) {
  const ownerGate = await requireOwnerDeviceMode(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? "FORBIDDEN", "Forbidden.", { correlationId });
  }
  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  const row = await getGuideTopicById(db, topicId);
  if (!row) return jsonError(404, "NOT_FOUND", "Topic not found.", { correlationId });
  return Response.json(toPublicGuideTopic(row), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}
__name(getTopic, "getTopic");
async function patchTopic(request, env, topicId, correlationId) {
  const ownerGate = await requireOwnerDeviceMode(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? "FORBIDDEN", "Forbidden.", { correlationId });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "BAD_REQUEST", "Invalid JSON body.", { correlationId });
  }
  const title = body.title !== void 0 ? sanitizeRequiredText2(body.title, 120) : void 0;
  if (body.title !== void 0 && !title) {
    return jsonError(400, "BAD_REQUEST", "Title is required.", { correlationId });
  }
  const blocks = body.blocks !== void 0 ? sanitizeBlocks(body.blocks) : void 0;
  if (body.blocks !== void 0 && !blocks) {
    return jsonError(400, "BAD_REQUEST", "Blocks must be a valid array.", { correlationId });
  }
  const audience = body.audience !== void 0 ? sanitizeAudience(body.audience) : void 0;
  if (body.audience !== void 0 && !audience) {
    return jsonError(400, "BAD_REQUEST", "Audience must be guest or owner.", { correlationId });
  }
  const actions = body.actions !== void 0 ? sanitizeGuideActions(body.actions) : void 0;
  if (body.actions !== void 0 && actions === null) {
    return jsonError(
      400,
      "BAD_REQUEST",
      "One or more quick actions is incomplete or invalid. Check button labels, topic links, and Alexa button numbers.",
      { correlationId }
    );
  }
  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  const updated = await updateGuideTopic(db, topicId, {
    title,
    subtitle: body.subtitle !== void 0 ? sanitizeRequiredText2(body.subtitle, 160) : void 0,
    summary: body.summary !== void 0 ? sanitizeRequiredText2(body.summary, 240) : void 0,
    searchTerms: body.searchTerms !== void 0 ? sanitizeStringArray(body.searchTerms) : void 0,
    applianceManualTerms: body.applianceManualTerms !== void 0 ? sanitizeStringArray(body.applianceManualTerms) : void 0,
    blocks,
    actions,
    audience,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  if (!updated) return jsonError(404, "NOT_FOUND", "Topic not found.", { correlationId });
  return Response.json(toPublicGuideTopic(updated), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
__name(patchTopic, "patchTopic");
async function publishTopic(request, env, topicId, correlationId) {
  const ownerGate = await requireOwnerDeviceMode(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? "FORBIDDEN", "Forbidden.", { correlationId });
  }
  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  const updated = await publishGuideTopic(db, topicId);
  if (!updated) return jsonError(404, "NOT_FOUND", "Topic not found.", { correlationId });
  return Response.json(toPublicGuideTopic(updated), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
__name(publishTopic, "publishTopic");
async function publishAll(request, env, correlationId) {
  const ownerGate = await requireOwnerDeviceMode(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? "FORBIDDEN", "Forbidden.", { correlationId });
  }
  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  await publishAllGuideTopics(db);
  const draftCount = await countDraftGuideTopics(db);
  return Response.json({ ok: true, draftCount }, { status: 200, headers: { "Content-Type": "application/json" } });
}
__name(publishAll, "publishAll");
async function patchSettings(request, env, correlationId) {
  const ownerGate = await requireOwnerDeviceMode(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? "FORBIDDEN", "Forbidden.", { correlationId });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "BAD_REQUEST", "Invalid JSON body.", { correlationId });
  }
  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  const updated = await updateGuideSettings(db, {
    homeSummaryTitle: body.homeSummaryTitle !== void 0 ? sanitizeRequiredText2(body.homeSummaryTitle, 120) : void 0,
    homeSummarySubtitle: body.homeSummarySubtitle !== void 0 ? sanitizeRequiredText2(body.homeSummarySubtitle, 160) : void 0,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
  if (!updated) return jsonError(404, "NOT_FOUND", "Guide settings not found.", { correlationId });
  return Response.json(
    {
      homeSummaryTitle: updated.home_summary_title,
      homeSummarySubtitle: updated.home_summary_subtitle
    },
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
__name(patchSettings, "patchSettings");
async function createTopic(request, env, correlationId) {
  const ownerGate = await requireOwnerDeviceMode(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? "FORBIDDEN", "Forbidden.", { correlationId });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "BAD_REQUEST", "Invalid JSON body.", { correlationId });
  }
  const id = sanitizeMediaId(String(body.id ?? ""));
  const categoryId = sanitizeMediaId(String(body.categoryId ?? ""));
  const title = sanitizeRequiredText2(body.title, 120);
  const subtitle = sanitizeRequiredText2(body.subtitle, 160);
  const summary = sanitizeRequiredText2(body.summary, 240);
  const audience = sanitizeAudience(body.audience ?? "guest");
  if (!id) return jsonError(400, "BAD_REQUEST", "Topic id is required (letters, numbers, hyphens).", { correlationId });
  if (!categoryId) return jsonError(400, "BAD_REQUEST", "Category id is required.", { correlationId });
  if (!title) return jsonError(400, "BAD_REQUEST", "Title is required.", { correlationId });
  if (!subtitle) return jsonError(400, "BAD_REQUEST", "Subtitle is required.", { correlationId });
  if (!summary) return jsonError(400, "BAD_REQUEST", "Summary is required.", { correlationId });
  if (!audience) return jsonError(400, "BAD_REQUEST", "Audience must be guest or owner.", { correlationId });
  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  const created = await createGuideTopic(db, {
    id,
    categoryId,
    title,
    subtitle,
    summary,
    audience,
    searchTerms: sanitizeStringArray(body.searchTerms ?? []),
    actions: sanitizeGuideActions(body.actions ?? []) ?? []
  });
  if (!created) return jsonError(404, "NOT_FOUND", "Category not found.", { correlationId });
  if (created.conflict) return jsonError(409, "CONFLICT", "A topic with that id already exists.", { correlationId });
  return Response.json(toPublicGuideTopic(created), {
    status: 201,
    headers: { "Content-Type": "application/json" }
  });
}
__name(createTopic, "createTopic");
async function removeTopic(request, env, topicId, correlationId) {
  const ownerGate = await requireOwnerDeviceMode(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? "FORBIDDEN", "Forbidden.", { correlationId });
  }
  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  const removed = await deleteGuideTopic(db, topicId);
  if (!removed) return jsonError(404, "NOT_FOUND", "Topic not found.", { correlationId });
  return Response.json({ ok: true, id: topicId }, { status: 200, headers: { "Content-Type": "application/json" } });
}
__name(removeTopic, "removeTopic");
async function reorderTopics(request, env, categoryId, correlationId) {
  const ownerGate = await requireOwnerDeviceMode(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? "FORBIDDEN", "Forbidden.", { correlationId });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "BAD_REQUEST", "Invalid JSON body.", { correlationId });
  }
  if (!Array.isArray(body.topicIds) || body.topicIds.length === 0) {
    return jsonError(400, "BAD_REQUEST", "Expected { topicIds: string[] }.", { correlationId });
  }
  const topicIds = body.topicIds.map((value) => sanitizeMediaId(String(value ?? ""))).filter(Boolean);
  if (topicIds.length !== body.topicIds.length) {
    return jsonError(400, "BAD_REQUEST", "Topic ids must use letters, numbers, and hyphens only.", { correlationId });
  }
  try {
    const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
    const result = await reorderGuideTopicsInCategory(db, categoryId, topicIds);
    if (!result) return jsonError(404, "NOT_FOUND", "Category not found.", { correlationId });
    if (result.invalid) {
      return jsonError(400, "BAD_REQUEST", "Topic order must include every topic in the category once.", {
        correlationId
      });
    }
    return Response.json({ ok: true }, { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "guide_reorder_failed",
        categoryId,
        detail: error instanceof Error ? error.message.slice(0, 200) : "unknown"
      })
    );
    return jsonError(500, "INTERNAL_ERROR", "Could not reorder topics.", { correlationId });
  }
}
__name(reorderTopics, "reorderTopics");
async function listMedia(request, env, correlationId) {
  const ownerGate = await requireOwnerDeviceMode(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? "FORBIDDEN", "Forbidden.", { correlationId });
  }
  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  const rows = await listGuideMedia(db);
  return Response.json(
    { media: rows.map((row) => toPublicGuideMedia(row)) },
    { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
  );
}
__name(listMedia, "listMedia");
async function removeMedia(request, env, mediaId, correlationId) {
  const ownerGate = await requireOwnerDeviceMode(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? "FORBIDDEN", "Forbidden.", { correlationId });
  }
  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  const existing = await getGuideMediaById(db, mediaId);
  if (!existing) return jsonError(404, "NOT_FOUND", "Media not found.", { correlationId });
  if (!existing.object_key) {
    return jsonError(400, "BAD_REQUEST", "Bundled guide photos cannot be deleted here.", { correlationId });
  }
  const bucket = requireGuideMediaBucket(env.GUIDE_MEDIA);
  await safeDeleteGuideMediaObject(bucket, String(existing.object_key));
  await deleteGuideMedia(db, mediaId);
  return Response.json({ ok: true, id: mediaId }, { status: 200, headers: { "Content-Type": "application/json" } });
}
__name(removeMedia, "removeMedia");
async function uploadMedia(request, env, correlationId) {
  const ownerGate = await requireOwnerDeviceMode(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? "FORBIDDEN", "Forbidden.", { correlationId });
  }
  const formData = await request.formData();
  const id = sanitizeMediaId(String(formData.get("id") ?? ""));
  const alt = sanitizeRequiredText2(formData.get("alt"), 240);
  const fileField = formData.get("file");
  const fileCheck = validateGuideImageUpload(fileField instanceof File ? fileField : null);
  if (!id) return jsonError(400, "BAD_REQUEST", "Media id is required (letters, numbers, hyphens).", { correlationId });
  if (!alt) return jsonError(400, "BAD_REQUEST", "Alt text is required.", { correlationId });
  if (!fileCheck.ok) return jsonError(400, "BAD_REQUEST", fileCheck.message, { correlationId });
  const file = fileCheck.file;
  const buffer = await file.arrayBuffer();
  const bufferCheck = validateGuideImageBuffer(buffer, file.type);
  if (!bufferCheck.ok) return jsonError(400, "BAD_REQUEST", bufferCheck.message, { correlationId });
  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  const bucket = requireGuideMediaBucket(env.GUIDE_MEDIA);
  const objectKey = generateGuideMediaObjectKey();
  await putGuideMediaObject(bucket, objectKey, buffer, bufferCheck.mimeType);
  const existing = await getGuideMediaById(db, id);
  if (existing?.object_key) {
    await safeDeleteGuideMediaObject(bucket, String(existing.object_key));
  }
  if (existing) {
    await db.prepare(
      `UPDATE guide_media SET alt = ?, object_key = ?, source_file = NULL, original_filename = ?, mime_type = ?, file_size = ?, updated_at = ? WHERE id = ?`
    ).bind(
      alt,
      objectKey,
      sanitizeOriginalFilename2(file.name),
      bufferCheck.mimeType,
      file.size,
      (/* @__PURE__ */ new Date()).toISOString(),
      id
    ).run();
    const row = await getGuideMediaById(db, id);
    return Response.json(toPublicGuideMedia(row), { status: 200, headers: { "Content-Type": "application/json" } });
  }
  const created = await insertGuideMedia(db, {
    id,
    alt,
    objectKey,
    originalFilename: sanitizeOriginalFilename2(file.name),
    mimeType: bufferCheck.mimeType,
    fileSize: file.size
  });
  return Response.json(toPublicGuideMedia(created), { status: 201, headers: { "Content-Type": "application/json" } });
}
__name(uploadMedia, "uploadMedia");
async function streamMediaFile(request, env, mediaId, correlationId) {
  const ownerGate = await requireOwnerDeviceMode(request, env);
  const sitterGate = ownerGate.ok ? null : await requireAnyDeviceSession(request, env);
  if (!ownerGate.ok && !sitterGate?.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? "FORBIDDEN", "Forbidden.", { correlationId });
  }
  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  const row = await getGuideMediaById(db, mediaId);
  if (!row || !row.object_key) {
    return jsonError(404, "NOT_FOUND", "Media not found.", { correlationId });
  }
  const bucket = requireGuideMediaBucket(env.GUIDE_MEDIA);
  const object = await getGuideMediaObject(bucket, String(row.object_key));
  if (!object) return jsonError(404, "NOT_FOUND", "Media not found.", { correlationId });
  const headers = new Headers();
  headers.set("Content-Type", String(row.mime_type ?? object.httpMetadata?.contentType ?? "image/jpeg"));
  headers.set("Cache-Control", "private, max-age=3600");
  headers.set("Content-Disposition", "inline");
  return new Response(object.body, { status: 200, headers });
}
__name(streamMediaFile, "streamMediaFile");

// src/routes/houseSettingsRoute.js
init_modules_watch_stub();
async function buildHouseSettingsPayload(env) {
  return {
    sitterSecretsDisclosed: await getSitterSecretsDisclosed(env)
  };
}
__name(buildHouseSettingsPayload, "buildHouseSettingsPayload");
async function handleHouseSettingsGet(request, env, fetchImpl = fetch) {
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
  const access = await authenticateRequest(request, env, fetchImpl);
  if (!access.ok) {
    return Response.json({ error: access.code }, { status: access.status });
  }
  return Response.json(await buildHouseSettingsPayload(env), {
    headers: { "Cache-Control": "no-store" }
  });
}
__name(handleHouseSettingsGet, "handleHouseSettingsGet");
async function handleSitterSecretsSetting(request, env, fetchImpl = fetch) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
  const ownerCheck = await requireOwnerIdentity(request, env, fetchImpl);
  if (!ownerCheck.ok) {
    return Response.json({ error: ownerCheck.code }, { status: ownerCheck.status });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  if (typeof body?.disclosed !== "boolean") {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  try {
    await setSitterSecretsDisclosed(env, body.disclosed);
  } catch {
    return Response.json({ error: "SETTINGS_UNAVAILABLE" }, { status: 503 });
  }
  return Response.json(await buildHouseSettingsPayload(env), {
    headers: { "Cache-Control": "no-store" }
  });
}
__name(handleSitterSecretsSetting, "handleSitterSecretsSetting");

// src/routes/siteSetupRoute.js
init_modules_watch_stub();

// src/lib/hubSetupAuth.js
init_modules_watch_stub();
async function isHubOnboardingComplete(env) {
  const profile = await getSiteProfile(env);
  const hasProfile = await hasSiteProfileRow(env);
  if (!hasProfile && env.HOUSE_GUIDE_DB && await isHouseGuideSeeded(env.HOUSE_GUIDE_DB)) {
    return true;
  }
  return profile.onboardingComplete === true;
}
__name(isHubOnboardingComplete, "isHubOnboardingComplete");
function mapSetupDbError(error) {
  const message2 = error instanceof Error ? error.message : String(error ?? "");
  if (/no such table|SQLITE_ERROR|D1_ERROR/i.test(message2)) {
    return { ok: false, status: 503, code: "SETUP_DB_NOT_MIGRATED" };
  }
  throw error;
}
__name(mapSetupDbError, "mapSetupDbError");
async function requireOwnerForHubSetup(request, env, fetchImpl = fetch) {
  const identity = await requireOwnerIdentity(request, env, fetchImpl);
  if (!identity.ok) return identity;
  try {
    if (!await isHubOnboardingComplete(env)) {
      return { ok: true, auth: identity.auth };
    }
  } catch (error) {
    return mapSetupDbError(error);
  }
  return requireOwnerDeviceMode(request, env);
}
__name(requireOwnerForHubSetup, "requireOwnerForHubSetup");

// src/routes/siteSetupRoute.js
function validateSecretsPatch(body) {
  const patch = {};
  for (const key of HUB_SECRET_KEYS) {
    if (body[key] === void 0) continue;
    const value = String(body[key] ?? "").trim();
    if (key === "owner_pin" && value && !/^\d{4}$/.test(value)) {
      return { ok: false, message: "Owner PIN must be exactly 4 digits." };
    }
    patch[key] = value;
  }
  return { ok: true, patch };
}
__name(validateSecretsPatch, "validateSecretsPatch");
async function handleSiteProfileGet(request, env, correlationId) {
  if (request.method !== "GET") return methodNotAllowed(correlationId);
  const ownerGate = await requireOwnerForHubSetup(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? "FORBIDDEN", "Forbidden.", { correlationId });
  }
  const profile = await getSiteProfile(env);
  const guideSeeded = env.HOUSE_GUIDE_DB ? await isHouseGuideSeeded(env.HOUSE_GUIDE_DB) : false;
  const hasProfile = await hasSiteProfileRow(env);
  const effectiveProfile = !hasProfile && guideSeeded ? { ...profile, onboardingComplete: true } : profile;
  return Response.json(
    { profile: effectiveProfile, guideSeeded },
    { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
  );
}
__name(handleSiteProfileGet, "handleSiteProfileGet");
async function handleSiteProfilePatch(request, env, correlationId) {
  if (request.method !== "PATCH") return methodNotAllowed(correlationId);
  const ownerGate = await requireOwnerForHubSetup(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? "FORBIDDEN", "Forbidden.", { correlationId });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "BAD_REQUEST", "Invalid JSON body.", { correlationId });
  }
  if (!body || typeof body !== "object") {
    return jsonError(400, "BAD_REQUEST", "Expected a JSON object.", { correlationId });
  }
  try {
    const profile = await updateSiteProfile(env, body);
    return Response.json({ ok: true, profile }, {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
    });
  } catch {
    return jsonError(503, "UNAVAILABLE", "Could not save site profile.", { correlationId });
  }
}
__name(handleSiteProfilePatch, "handleSiteProfilePatch");
async function handleHubSecretsStatusGet(request, env, correlationId) {
  if (request.method !== "GET") return methodNotAllowed(correlationId);
  const ownerGate = await requireOwnerForHubSetup(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? "FORBIDDEN", "Forbidden.", { correlationId });
  }
  const configured = await getHubSecretsStatus(env);
  const envFallback = {
    owner_pin: Boolean(env.OWNER_PIN?.trim()),
    wifi_ssid: Boolean(env.PRIVATE_WIFI_SSID?.trim()),
    wifi_password: Boolean(env.PRIVATE_WIFI_PASSWORD?.trim()),
    primary_phone: Boolean(env.PRIVATE_MARK_PHONE?.trim()),
    primary_email: Boolean(env.PRIVATE_MARK_EMAIL?.trim()),
    secondary_phone: Boolean(env.PRIVATE_DONNA_PHONE?.trim()),
    secondary_email: Boolean(env.PRIVATE_DONNA_EMAIL?.trim()),
    home_address: Boolean(env.PRIVATE_HOME_ADDRESS?.trim()),
    lockbox_code: Boolean(env.PRIVATE_LOCKBOX_CODE?.trim())
  };
  const status = {};
  for (const key of HUB_SECRET_KEYS) {
    status[key] = Boolean(configured[key] || envFallback[key]);
  }
  return Response.json({ configured: status }, {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}
__name(handleHubSecretsStatusGet, "handleHubSecretsStatusGet");
async function handleHubSecretsPatch(request, env, correlationId) {
  if (request.method !== "PATCH") return methodNotAllowed(correlationId);
  const ownerGate = await requireOwnerForHubSetup(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? "FORBIDDEN", "Forbidden.", { correlationId });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "BAD_REQUEST", "Invalid JSON body.", { correlationId });
  }
  const validation = validateSecretsPatch(body ?? {});
  if (!validation.ok) {
    return jsonError(400, "BAD_REQUEST", validation.message ?? "Invalid secrets.", { correlationId });
  }
  try {
    await setHubSecrets(env, validation.patch);
    const configured = await getHubSecretsStatus(env);
    return Response.json({ ok: true, configured }, {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
    });
  } catch {
    return jsonError(503, "UNAVAILABLE", "Could not save secrets.", { correlationId });
  }
}
__name(handleHubSecretsPatch, "handleHubSecretsPatch");
async function resetHubToDefaults(env) {
  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  await clearGuideCatalog(db);
  await clearHouseSettings(env);
  await clearHubSecrets(env);
  const profile = await resetSiteProfile(env);
  return { profile, guideSeeded: false };
}
__name(resetHubToDefaults, "resetHubToDefaults");
async function handleSiteResetPost(request, env, correlationId) {
  if (request.method !== "POST") return methodNotAllowed(correlationId);
  const ownerGate = await requireOwnerForHubSetup(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? "FORBIDDEN", "Forbidden.", { correlationId });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "BAD_REQUEST", "Invalid JSON body.", { correlationId });
  }
  if (body?.confirm !== "RESET") {
    return jsonError(400, "BAD_REQUEST", 'Send { "confirm": "RESET" } to factory reset this hub.', {
      correlationId
    });
  }
  try {
    const result = await resetHubToDefaults(env);
    return Response.json({ ok: true, ...result }, {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
    });
  } catch {
    return jsonError(503, "UNAVAILABLE", "Could not reset hub.", { correlationId });
  }
}
__name(handleSiteResetPost, "handleSiteResetPost");
async function handleSiteSetup(request, url, env, correlationId) {
  if (url.pathname === "/api/site/profile") {
    if (request.method === "GET") return handleSiteProfileGet(request, env, correlationId);
    if (request.method === "PATCH") return handleSiteProfilePatch(request, env, correlationId);
    return methodNotAllowed(correlationId);
  }
  if (url.pathname === "/api/site/secrets/status") {
    return handleHubSecretsStatusGet(request, env, correlationId);
  }
  if (url.pathname === "/api/site/secrets") {
    if (request.method === "PATCH") return handleHubSecretsPatch(request, env, correlationId);
    return methodNotAllowed(correlationId);
  }
  if (url.pathname === "/api/site/reset") {
    return handleSiteResetPost(request, env, correlationId);
  }
  return jsonError(404, "NOT_FOUND", "Route not found.", { correlationId });
}
__name(handleSiteSetup, "handleSiteSetup");

// src/routes/deviceSessionRoute.js
init_modules_watch_stub();
async function handleDeviceSession(request, env, fetchImpl = fetch) {
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
  const access = await authenticateRequest(request, env, fetchImpl);
  if (!access.ok) {
    return Response.json(
      { authenticated: false, error: access.code },
      { status: access.status, headers: { "Cache-Control": "no-store" } }
    );
  }
  const session = await resolveDeviceSession(request, env);
  const sitterSecretsDisclosed = await getSitterSecretsDisclosed(env);
  return finalizeDeviceSessionJsonResponse(session, 200, { sitterSecretsDisclosed });
}
__name(handleDeviceSession, "handleDeviceSession");

// src/routes/deviceModeRoute.js
init_modules_watch_stub();
async function handleDeviceMode(request, env, fetchImpl = fetch) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
  const ownerCheck = await requireOwnerIdentity(request, env, fetchImpl);
  if (!ownerCheck.ok) {
    return Response.json({ error: ownerCheck.code }, { status: ownerCheck.status });
  }
  const session = await resolveDeviceSession(request, env);
  if (session.mode === "sitter") {
    return Response.json({ error: "ALREADY_IN_SITTER_MODE" }, { status: 400 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  if (body?.mode !== "sitter") {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  return issueSitterSessionResponse(env);
}
__name(handleDeviceMode, "handleDeviceMode");
async function handleAuthLock(request, env, fetchImpl = fetch) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
  const identity = await requireOwnerIdentity(request, env, fetchImpl);
  if (!identity.ok) {
    return Response.json({ error: identity.code }, { status: identity.status });
  }
  return issueSitterSessionResponse(env);
}
__name(handleAuthLock, "handleAuthLock");

// src/routes/session.js
init_modules_watch_stub();
async function handleSession(request, env, fetchImpl = fetch) {
  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
  const auth = await authenticateRequest(request, env, fetchImpl);
  if (!auth.ok) {
    return Response.json(
      { authenticated: false, error: auth.code },
      { status: auth.status, headers: { "Cache-Control": "private, no-store" } }
    );
  }
  return Response.json(
    {
      authenticated: true,
      role: auth.role,
      displayName: null
    },
    { status: 200, headers: { "Cache-Control": "private, no-store" } }
  );
}
__name(handleSession, "handleSession");

// src/lib/boundFetch.js
init_modules_watch_stub();
function bindFetch(fetchImpl = globalThis.fetch) {
  return (input, init) => fetchImpl.call(globalThis, input, init);
}
__name(bindFetch, "bindFetch");

// src/durable/OwnerAuthLimiter.js
init_modules_watch_stub();

// src/lib/ownerAuthRateLimitLogic.js
init_modules_watch_stub();
var OWNER_AUTH_MAX_FAILURES = 5;
var OWNER_AUTH_WINDOW_MS = 10 * 60 * 1e3;
function pruneFailures(failureTimestamps, now) {
  return failureTimestamps.filter((timestamp) => now - timestamp < OWNER_AUTH_WINDOW_MS);
}
__name(pruneFailures, "pruneFailures");
function isRateLimited(failureTimestamps, now = Date.now()) {
  const recent = pruneFailures(failureTimestamps, now);
  return recent.length >= OWNER_AUTH_MAX_FAILURES;
}
__name(isRateLimited, "isRateLimited");

// src/durable/OwnerAuthLimiter.js
var OwnerAuthLimiter = class {
  static {
    __name(this, "OwnerAuthLimiter");
  }
  /**
   * @param {DurableObjectState} state
   */
  constructor(state) {
    this.state = state;
  }
  async #loadFailures() {
    const stored = await this.state.storage.get("failures");
    return Array.isArray(stored) ? stored.filter((value) => typeof value === "number") : [];
  }
  async #saveFailures(failures) {
    await this.state.storage.put("failures", failures);
  }
  async fetch(request) {
    const url = new URL(request.url);
    const now = Date.now();
    if (url.pathname === "/check" && request.method === "GET") {
      const failures = await this.#loadFailures();
      const recent = pruneFailures(failures, now);
      await this.#saveFailures(recent);
      return Response.json({ allowed: !isRateLimited(recent, now) });
    }
    if (url.pathname === "/failure" && request.method === "POST") {
      const failures = pruneFailures(await this.#loadFailures(), now);
      failures.push(now);
      await this.#saveFailures(failures);
      return Response.json({ allowed: !isRateLimited(failures, now) });
    }
    if (url.pathname === "/success" && request.method === "POST") {
      await this.#saveFailures([]);
      return Response.json({ ok: true });
    }
    return new Response("Not found", { status: 404 });
  }
};

// src/durable/ControlActionLimiter.js
init_modules_watch_stub();

// src/lib/controlRateLimitLogic.js
init_modules_watch_stub();
var CONTROL_MAX_PER_MINUTE = 10;
var CONTROL_DUPLICATE_COOLDOWN_MS = 2e3;
var WINDOW_MS = 6e4;
function pruneTimestamps(timestamps, now) {
  const cutoff = now - WINDOW_MS;
  return timestamps.filter((value) => value >= cutoff);
}
__name(pruneTimestamps, "pruneTimestamps");
function isOverRateLimit(timestamps, now) {
  return pruneTimestamps(timestamps, now).length >= CONTROL_MAX_PER_MINUTE;
}
__name(isOverRateLimit, "isOverRateLimit");
function isDuplicateCooldown(lastTriggeredAt, now) {
  if (typeof lastTriggeredAt !== "number") return false;
  return now - lastTriggeredAt < CONTROL_DUPLICATE_COOLDOWN_MS;
}
__name(isDuplicateCooldown, "isDuplicateCooldown");

// src/durable/ControlActionLimiter.js
var ControlActionLimiter = class {
  static {
    __name(this, "ControlActionLimiter");
  }
  /**
   * @param {DurableObjectState} state
   */
  constructor(state) {
    this.state = state;
  }
  async #loadState() {
    const stored = await this.state.storage.get("state");
    if (!stored || typeof stored !== "object") {
      return { userTimestamps: [], ipTimestamps: [], lastByAction: {} };
    }
    const value = (
      /** @type {{ userTimestamps?: number[], ipTimestamps?: number[], lastByAction?: Record<string, number> }} */
      stored
    );
    return {
      userTimestamps: Array.isArray(value.userTimestamps) ? value.userTimestamps : [],
      ipTimestamps: Array.isArray(value.ipTimestamps) ? value.ipTimestamps : [],
      lastByAction: value.lastByAction && typeof value.lastByAction === "object" ? value.lastByAction : {}
    };
  }
  /**
   * @param {{ userTimestamps: number[], ipTimestamps: number[], lastByAction: Record<string, number> }} data
   */
  async #saveState(data) {
    await this.state.storage.put("state", data);
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname !== "/attempt" || request.method !== "POST") {
      return new Response("Not found", { status: 404 });
    }
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ allowed: false, reason: "BAD_REQUEST" }, { status: 400 });
    }
    const email = typeof body.email === "string" ? body.email : "";
    const ip = typeof body.ip === "string" ? body.ip : "";
    const buttonCode = typeof body.buttonCode === "string" ? body.buttonCode : "";
    const now = typeof body.now === "number" ? body.now : Date.now();
    if (!email || !ip || !buttonCode) {
      return Response.json({ allowed: false, reason: "BAD_REQUEST" }, { status: 400 });
    }
    const state = await this.#loadState();
    const userTimestamps = pruneTimestamps(state.userTimestamps, now);
    const ipTimestamps = pruneTimestamps(state.ipTimestamps, now);
    const actionKey = `${email}:${buttonCode}`;
    const lastAt = state.lastByAction[actionKey];
    if (isDuplicateCooldown(lastAt, now)) {
      return Response.json({ allowed: false, reason: "DUPLICATE_COOLDOWN" });
    }
    if (isOverRateLimit(userTimestamps, now) || isOverRateLimit(ipTimestamps, now)) {
      return Response.json({ allowed: false, reason: "RATE_LIMITED" });
    }
    userTimestamps.push(now);
    ipTimestamps.push(now);
    state.lastByAction[actionKey] = now;
    await this.#saveState({
      userTimestamps,
      ipTimestamps,
      lastByAction: state.lastByAction
    });
    return Response.json({ allowed: true });
  }
};

// src/index.js
function correlationIdFrom(headerValue) {
  if (headerValue?.trim()) return headerValue.trim().slice(0, 64);
  return crypto.randomUUID();
}
__name(correlationIdFrom, "correlationIdFrom");
async function handleRequest(request, env, fetchImpl = fetch) {
  const fetchBound = bindFetch(fetchImpl);
  const correlationId = correlationIdFrom(request.headers.get("X-Correlation-Id"));
  const allowedOrigin = resolveCorsOrigin(request.headers.get("Origin") ?? void 0, env.ALLOWED_ORIGINS ?? "");
  if (request.method === "OPTIONS") {
    if (!allowedOrigin) {
      return new Response(null, { status: 403 });
    }
    return new Response(null, { status: 204, headers: corsHeaders(allowedOrigin) });
  }
  const attachHeaders = /* @__PURE__ */ __name((response2) => {
    const headers = new Headers(response2.headers);
    for (const [key, value] of Object.entries(corsHeaders(allowedOrigin))) {
      headers.set(key, value);
    }
    for (const [key, value] of Object.entries(securityHeaders())) {
      headers.set(key, value);
    }
    headers.set("X-Correlation-Id", correlationId);
    return new Response(response2.body, { status: response2.status, statusText: response2.statusText, headers });
  }, "attachHeaders");
  if (request.headers.get("Origin") && !allowedOrigin) {
    return attachHeaders(new Response(JSON.stringify({ error: { code: "CORS_REJECTED", message: "Origin not allowed." } }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    }));
  }
  const url = new URL(request.url);
  let response;
  try {
    if (url.pathname === "/api/health" && request.method === "GET") {
      response = handleHealth();
    } else if (!isAccessConfigured(env) && url.pathname.startsWith("/api/") && url.pathname !== "/api/health") {
      response = Response.json(
        { error: "AUTH_NOT_CONFIGURED", message: "Access authentication is not configured." },
        { status: 503 }
      );
    } else if (url.pathname === "/api/device-session" && request.method === "GET") {
      response = await handleDeviceSession(request, env, fetchBound);
    } else if (url.pathname === "/api/device-mode" && request.method === "POST") {
      response = await handleDeviceMode(request, env, fetchBound);
    } else if (url.pathname === "/api/auth/lock" && request.method === "POST") {
      response = await handleAuthLock(request, env, fetchBound);
    } else if (url.pathname === "/api/session" && request.method === "GET") {
      response = await handleSession(request, env, fetchBound);
    } else if (url.pathname === "/api/private-config" && request.method === "GET") {
      response = await handlePrivateConfigRequest(request, env, fetchBound);
    } else if (url.pathname === "/api/weather/geocode" && request.method === "GET") {
      response = await handleWeatherGeocode(request, env, fetchBound);
    } else if (url.pathname === "/api/weather" && request.method === "GET") {
      response = await handleWeather(request, env, fetchBound);
    } else if (url.pathname === "/api/auth/owner") {
      response = await handleOwnerAuth(request, correlationId, env, fetchBound);
    } else if (url.pathname === "/api/calendar" && request.method === "GET") {
      response = await handleCalendar(request, env, fetchBound);
    } else if (url.pathname.startsWith("/api/appliance-manuals")) {
      response = await handleApplianceManuals(request, url, env, correlationId);
    } else if (url.pathname === "/api/house-settings" && request.method === "GET") {
      response = await handleHouseSettingsGet(request, env, fetchBound);
    } else if (url.pathname === "/api/house-settings/sitter-secrets" && request.method === "POST") {
      response = await handleSitterSecretsSetting(request, env, fetchBound);
    } else if (url.pathname === "/api/site/backup" || url.pathname === "/api/site/restore") {
      response = await handleSiteBackup(request, url, env, correlationId);
    } else if (url.pathname === "/api/site/profile" || url.pathname === "/api/site/secrets" || url.pathname === "/api/site/secrets/status" || url.pathname === "/api/site/reset") {
      response = await handleSiteSetup(request, url, env, correlationId);
    } else if (url.pathname.startsWith("/api/house-guide")) {
      response = await handleHouseGuide(request, url, env, correlationId);
    } else if (url.pathname.startsWith("/api/button/") && request.method === "POST") {
      const buttonParam = decodeURIComponent(url.pathname.slice("/api/button/".length));
      response = await handleButtonPress(request, buttonParam, env, correlationId, fetchBound);
    } else if (url.pathname.startsWith("/api/button/")) {
      response = methodNotAllowed(correlationId);
    } else {
      response = notFound(correlationId);
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "request_failed",
        path: url.pathname,
        method: request.method,
        detail: error instanceof Error ? error.message.slice(0, 200) : "unknown"
      })
    );
    response = jsonError(500, "INTERNAL_ERROR", "Request failed.", { correlationId });
  }
  safeLog(request.method, url.pathname, response.status, correlationId, url.pathname.includes("/api/button/") ? url.pathname.split("/").pop() : void 0);
  return attachHeaders(response);
}
__name(handleRequest, "handleRequest");
function safeLog(method, path, status, correlationId, buttonCode) {
  const entry = {
    method,
    path,
    status,
    correlationId,
    ...buttonCode ? { button: buttonCode } : {}
  };
  console.log(JSON.stringify(entry));
}
__name(safeLog, "safeLog");
var src_default = {
  async fetch(request, env, _ctx) {
    return handleRequest(request, env, fetch);
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
init_modules_watch_stub();
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
init_modules_watch_stub();
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError2 = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError2;

// .wrangler/tmp/bundle-mKFrBS/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
init_modules_watch_stub();
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-mKFrBS/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  ControlActionLimiter,
  OwnerAuthLimiter,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default,
  handleRequest
};
//# sourceMappingURL=index.js.map

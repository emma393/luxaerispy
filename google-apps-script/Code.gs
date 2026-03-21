function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, message: "LuxAeris endpoint live" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var preferredNames = ["Luxaeris Leads", "LuxAeris Leads", "Leads", "Sheet1"];
  for (var i = 0; i < preferredNames.length; i++) {
    var found = ss.getSheetByName(preferredNames[i]);
    if (found) return found;
  }
  return ss.getSheets()[0];
}

function parseJson_(text) {
  try { return JSON.parse(text || "{}"); } catch (e) { return {}; }
}

function normalizeString_(value) {
  return value == null ? "" : String(value).trim();
}

function validEmail_(value) {
  value = normalizeString_(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function deriveRouteType_(originCountry, destinationCountry) {
  originCountry = normalizeString_(originCountry).toLowerCase();
  destinationCountry = normalizeString_(destinationCountry).toLowerCase();
  if (!originCountry || !destinationCountry) return "";
  return originCountry === destinationCountry ? "domestic" : "international";
}

function ensureHeaders_(sheet) {
  var headers = ["Timestamp","Full Name","Email","Phone","Origin","Origin Code","Origin City","Origin Country","Destination","Destination Code","Destination City","Destination Country","Departure Date","Return Date","Cabin","Price Range","Trip Type","Flight Type","Route Type","Notes"];
  var lastColumn = Math.max(sheet.getLastColumn(), headers.length);
  var current = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  var hasAnyHeader = current.join("").trim() !== "";
  if (!hasAnyHeader) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
}

function getPayload_(e) {
  var data = {};
  if (e && e.postData && e.postData.contents) {
    data = parseJson_(e.postData.contents);
  }
  if ((!data || !Object.keys(data).length) && e && e.parameter) {
      data = parseJson_(e.parameter.payload);
    }
    if (!data || !Object.keys(data).length) {
      data = e.parameter;
    }
  }
  return data || {};
}

function sendNotificationEmail_(data) {
  var recipient = "leads@luxaeris.com";
  if (!recipient) return;

  var subject =
    "New LuxAeris request: " +
    normalizeString_(data.originCode || data.origin) +
    " to " +
    normalizeString_(data.destinationCode || data.destination);

  var body = [
    "A new LuxAeris request was submitted.",
    "",
    "Name: " + normalizeString_(data.fullName || data.name),
    "Email: " + normalizeString_(data.email),
    "Phone: " + normalizeString_(data.phone || data.number),
    "Origin: " + normalizeString_(data.origin),
    "Origin Code: " + normalizeString_(data.originCode),
    "Origin City: " + normalizeString_(data.originCity),
    "Origin Country: " + normalizeString_(data.originCountry),
    "Destination: " + normalizeString_(data.destination),
    "Destination Code: " + normalizeString_(data.destinationCode),
    "Destination City: " + normalizeString_(data.destinationCity),
    "Destination Country: " + normalizeString_(data.destinationCountry),
    "Departure: " + normalizeString_(data.departDate || data.departureDate),
    "Return: " + normalizeString_(data.returnDate),
    "Cabin: " + normalizeString_(data.cabin),
    "Budget: " + normalizeString_(data.priceRange || data.budget),
    "Trip Type: " + normalizeString_(data.tripType),
    "Flight Type: " + normalizeString_(data.flightType),
    "Route Type: " + normalizeString_(data.routeType),
    "Notes: " + normalizeString_(data.notes),
    normalizeString_(data.multiCityLegs) ? "Multi City Legs: " + normalizeString_(data.multiCityLegs) : ""
  ].filter(Boolean).join("\n");

  var options = { to: recipient, subject: subject, body: body };
  if (validEmail_(data.email)) options.replyTo = normalizeString_(data.email);
  MailApp.sendEmail(options);
}

function doPost(e) {
  try {
    var data = getPayload_(e);
    if (!data || !Object.keys(data).length) return jsonResponse_({ ok: false, error: "Missing POST data" });

    var sheet = getSheet_();
    ensureHeaders_(sheet);

    var fullName = normalizeString_(data.fullName || data.name);
    var email = normalizeString_(data.email);
    var phone = normalizeString_(data.phone || data.number);
    var origin = normalizeString_(data.origin);
    var originCode = normalizeString_(data.originCode);
    var originCity = normalizeString_(data.originCity);
    var originCountry = normalizeString_(data.originCountry);
    var destination = normalizeString_(data.destination);
    var destinationCode = normalizeString_(data.destinationCode);
    var destinationCity = normalizeString_(data.destinationCity);
    var destinationCountry = normalizeString_(data.destinationCountry);
    var departDate = normalizeString_(data.departDate || data.departureDate);
    var returnDate = normalizeString_(data.returnDate);
    var cabin = normalizeString_(data.cabin);
    var priceRange = normalizeString_(data.priceRange || data.budget);
    var tripType = normalizeString_(data.tripType || (returnDate ? 'Round Trip' : 'One Way'));
    var flightType = normalizeString_(data.flightType || 'Premium Cabin Request');
    var notes = normalizeString_(data.notes);
    var routeType = normalizeString_(data.routeType) || deriveRouteType_(originCountry, destinationCountry);
    var multiCityLegs = normalizeString_(data.multiCityLegs);

    if (multiCityLegs) {
      notes = (notes ? notes + "\n\n" : "") + "Multi City Legs: " + multiCityLegs;
    }

    sheet.appendRow([
      new Date(),
      fullName,
      email,
      phone,
      origin,
      originCode,
      originCity,
      originCountry,
      destination,
      destinationCode,
      destinationCity,
      destinationCountry,
      departDate,
      returnDate,
      cabin,
      priceRange,
      tripType,
      flightType,
      routeType,
      notes
    ]);

    var emailError = '';
    try {
      sendNotificationEmail_(data);
    } catch (mailError) {
      emailError = mailError && mailError.message ? mailError.message : 'Email failed';
    }

    return jsonResponse_({ ok: true, message: 'Lead saved', emailError: emailError });
  } catch (error) {
    return jsonResponse_({ ok: false, error: error && error.message ? error.message : 'Unknown error' });
  }
}

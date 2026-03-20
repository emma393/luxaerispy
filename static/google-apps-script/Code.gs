function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, message: 'LuxAeris leads endpoint is live' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService
        .createTextOutput(JSON.stringify({
          ok: false,
          error: 'Missing POST data. Do not use Run for doPost(); submit via the website.'
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Luxaeris Leads');
    if (!sheet) throw new Error('Sheet "Luxaeris Leads" not found');

    var data = JSON.parse(e.postData.contents || '{}');
    var cabin = data.cabin || '';
    var budget = data.budget || '';
    var origin = data.origin || '';
    var originCode = data.originCode || '';
    var destination = data.destination || '';
    var destinationCode = data.destinationCode || '';
    var departDate = data.departDate || '';
    var returnDate = data.returnDate || '';
    var fullName = data.fullName || '';
    var email = data.email || '';
    var phone = data.phone || '';
    var notes = data.notes || '';

    var routeType = origin && destination ? 'international' : 'domestic';
    var score = 0;
    if (cabin === 'First Class') score += 50;
    if (cabin === 'Business Class') score += 30;
    if (routeType === 'international') score += 30;
    if (budget === '$10K+') score += 20;
    if (budget === '$5K–$10K') score += 10;

    sheet.appendRow([
      new Date(), origin, originCode, destination, destinationCode,
      departDate, returnDate, cabin, budget, fullName, email, phone,
      notes, routeType, score
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, message: 'Lead saved successfully' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

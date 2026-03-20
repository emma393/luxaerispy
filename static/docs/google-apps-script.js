function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Luxaeris Leads");
  const data = JSON.parse(e.postData.contents);
  let score = 0;
  if (data.cabin === "First Class") score += 50;
  if (["JFK","LAX","ORD","MIA","SFO"].includes((data.originCode || "").toUpperCase())) score += 15;
  if (data.routeType === "domestic-us") score += 10;
  if (data.routeType === "inbound-us" || data.routeType === "outbound-us") score += 20;
  sheet.appendRow([new Date(), data.origin, data.destination, data.cabin, data.departDate, data.returnDate, data.fullName, data.email, data.phone, data.routeType, score, data.notes || ""]);
  MailApp.sendEmail({
    to: "Leads@luxaeris.com",
    subject: `New LuxAeris lead: ${data.originCode} → ${data.destinationCode}`,
    htmlBody: `<p><strong>Route:</strong> ${data.origin} → ${data.destination}</p><p><strong>Cabin:</strong> ${data.cabin}</p><p><strong>Name:</strong> ${data.fullName}</p><p><strong>Email:</strong> ${data.email}</p><p><strong>Phone:</strong> ${data.phone}</p><p><strong>Lead score:</strong> ${score}</p>`
  });
  return ContentService.createTextOutput(JSON.stringify({ok:true, score: score})).setMimeType(ContentService.MimeType.JSON);
}

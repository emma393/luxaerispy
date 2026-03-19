
exports.handler = async function(event) {
  const params = event.queryStringParameters || {};
  const origin = (params.origin || '').trim();
  const destination = (params.destination || '').trim();
  const cabin = (params.cabin || 'Business Class').trim();
  const departDate = (params.departDate || '').trim();
  const returnDate = (params.returnDate || '').trim();

  if (!origin || !destination) {
    return {
      statusCode: 400,
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({error: 'Missing origin or destination'})
    };
  }

  let routeType = 'medium-haul';
  let demand = 'high';
  let bestUse = 'A strong fit for travelers who want a more comfortable premium trip.';
  let nextStep = 'Request a personalized quote to review routing and private fare options.';

  const longhaulHints = ['Dubai','Singapore','Tokyo','Sydney','Doha','Hong Kong'];
  if (longhaulHints.some(h => origin.includes(h) || destination.includes(h))) {
    routeType = 'long-haul';
    bestUse = 'Best suited to travelers who value lie-flat comfort, airport flow, and stronger arrival condition.';
  }
  if (/first/i.test(cabin)) {
    nextStep = 'Request a personalized quote if privacy, exclusivity, and premium ground experience matter most.';
  } else if (/premium/i.test(cabin)) {
    nextStep = 'Request a personalized quote if you want more comfort than economy without moving fully into business class.';
  }

  return {
    statusCode: 200,
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      mode: 'guidance',
      origin,
      destination,
      cabin,
      departDate,
      returnDate,
      route_type: routeType,
      demand_profile: demand,
      best_use: bestUse,
      next_step: nextStep,
      note: 'This page provides premium fare guidance only and does not display public ticket pricing.'
    })
  };
};

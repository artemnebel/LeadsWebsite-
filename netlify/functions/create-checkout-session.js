const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Parse the request body to get quantity
    let quantity = 1;
    try {
      const body = JSON.parse(event.body || '{}');
      if (body.quantity && Number.isInteger(body.quantity) && body.quantity > 0) {
        quantity = body.quantity;
      }
    } catch (e) {
      console.warn('Failed to parse request body, using default quantity');
    }

    console.log('Creating checkout session with quantity:', quantity);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: 'price_1STyqzR3Sx8fW7tudVvWY81N',
          quantity: quantity,
        },
      ],
      success_url: `https://websiteleads.netlify.app/?checkout=success&quantity=${quantity}`,
      cancel_url: 'https://websiteleads.netlify.app/?checkout=cancel',
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ sessionId: session.id }),
    };
  } catch (err) {
    console.error('Stripe error:', err);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

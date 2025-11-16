const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async () => {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: 'price_1STyqzR3Sx8fW7tudVvWY81N', // <-- YOUR PRICE ID
          quantity: 1,
        },
      ],
      success_url: 'https://websiteleads.netlify.app/success.html',
      cancel_url: 'https://websiteleads.netlify.app/cancel.html',
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ id: session.id }),
    };
  } catch (err) {
    console.error('Stripe error:', err);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

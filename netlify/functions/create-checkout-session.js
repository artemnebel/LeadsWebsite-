// netlify/functions/create-checkout-session.js
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // Parse the request body to get quantity
    let quantity = 1;
    try {
      const body = JSON.parse(event.body || "{}");
      if (body.quantity && Number.isInteger(body.quantity) && body.quantity > 0) {
        quantity = body.quantity;
      }
    } catch (e) {
      // If body parsing fails, use default quantity of 1
      console.warn("Failed to parse request body, using default quantity");
    }

    // Get the site URL from headers (works for both local dev and production)
    const protocol = event.headers["x-forwarded-proto"] || "http";
    const host = event.headers.host;
    const baseUrl = `${protocol}://${host}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          // Price ID you create in Stripe Dashboard for "5 scans for $10"
          price: process.env.STRIPE_PRICE_ID_5_SCANS,
          quantity: quantity,
        },
      ],
      success_url: `${baseUrl}/?checkout=success&quantity=${quantity}`,
      cancel_url: `${baseUrl}/?checkout=cancel`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ sessionId: session.id }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

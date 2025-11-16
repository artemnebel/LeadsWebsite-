# Local Testing Guide

## Step 1: Create a Stripe Product (Required First!)

Before you can test checkout, you need to create a product in Stripe:

1. Go to [Stripe Dashboard - Products](https://dashboard.stripe.com/products)
2. Click **"+ Add Product"**
3. Fill in the details:
   - **Name**: `5 Scans Pack`
   - **Description**: `5 business scans for Local Lead Finder`
   - **Pricing**:
     - Select "Standard pricing"
     - Price: `$10.00` USD
     - Billing period: One time
4. Click **"Save product"**
5. You'll see a **Price ID** that looks like `price_1A2B3C4D5E6F7G8H...`
6. **COPY THIS PRICE ID** - you'll need it in the next step!

## Step 2: Update the .env File

1. Open the `.env` file in this folder
2. Find the line: `STRIPE_PRICE_ID_5_SCANS=price_REPLACE_WITH_YOUR_PRICE_ID`
3. Replace `price_REPLACE_WITH_YOUR_PRICE_ID` with the Price ID you copied
4. Save the file

Your `.env` should look like:
```
STRIPE_SECRET_KEY=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
STRIPE_PRICE_ID_5_SCANS=price_1A2B3C4D5E6F7G8H
```

## Step 3: Install Netlify CLI

Open a terminal in this folder and run:

```bash
npm install -g netlify-cli
```

If you don't have npm installed, you need to install Node.js first from https://nodejs.org/

## Step 4: Run Local Dev Server

In your terminal, run:

```bash
netlify dev
```

This will:
- Start a local server (usually at `http://localhost:8888`)
- Load your `.env` file automatically
- Make the Netlify Functions work locally

## Step 5: Test the Checkout

1. Open your browser to the URL provided by `netlify dev` (usually `http://localhost:8888`)
2. Click the **"Buy Credits"** button
3. Select the quantity you want (5, 10, 15, or 20 scans)
4. Click the button again
5. You should be redirected to Stripe Checkout

## Important Notes

### Testing with Stripe Test Mode (Recommended)

For testing, you should use **test mode** keys instead of live keys:

1. In Stripe Dashboard, toggle to "Test mode" (switch in top right)
2. Get your test keys (they start with `sk_test_` and `pk_test_`)
3. Create a test product with a test price
4. Update your `.env` file with test keys
5. Update `script.js` line 524 with the test publishable key

Test card numbers:
- Success: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., `12/34`)
- CVC: Any 3 digits (e.g., `123`)
- ZIP: Any 5 digits (e.g., `12345`)

### Troubleshooting

**"Checkout is not available when running locally" alert**
- Make sure you're using `netlify dev`, NOT a regular file server
- Access via the Netlify Dev URL (usually `localhost:8888`), NOT `127.0.0.1:5500`

**"Error starting checkout" or 500 error**
- Check that you updated the Price ID in `.env`
- Verify the Price ID exists in your Stripe dashboard
- Check the terminal running `netlify dev` for error messages

**Git push error**
- You need to run `git pull` first to integrate remote changes
- Or you can force push (not recommended): `git push -f origin master`
- Better: Resolve the conflict by pulling first

## When You're Ready to Deploy

Once local testing works, you can deploy to Netlify:

1. First, commit your changes:
   ```bash
   git add .
   git commit -m "Add multi-quantity checkout support"
   git pull origin master  # If there are remote changes
   git push origin master
   ```

2. Then follow the [SETUP.md](SETUP.md) guide for deployment

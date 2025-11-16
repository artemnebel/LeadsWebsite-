# Local Lead Finder - Setup Guide

## Prerequisites
- Netlify account
- Stripe account
- Git repository

## Setup Steps

### 1. Create a Stripe Product

1. Go to [Stripe Dashboard - Products](https://dashboard.stripe.com/products)
2. Click "Add Product"
3. Enter product details:
   - Name: "5 Scans Pack"
   - Description: "5 business scans for Local Lead Finder"
   - Price: $10.00 USD
4. Click "Save Product"
5. Copy the **Price ID** (starts with `price_...`)

### 2. Configure Environment Variables in Netlify

1. Go to your Netlify site dashboard
2. Navigate to **Site Settings** → **Environment Variables**
3. Add the following variables:

   | Variable Name | Value |
   |--------------|-------|
   | `STRIPE_SECRET_KEY` | `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` |
   | `STRIPE_PRICE_ID_5_SCANS` | Your Price ID from Step 1 |

### 3. Update Success/Cancel URLs

In `netlify/functions/create-checkout-session.js`, replace `YOUR_NETLIFY_SITE_URL` with your actual Netlify site URL (e.g., `https://your-site-name.netlify.app`).

### 4. Deploy to Netlify

#### Option A: Connect Git Repository
1. Push your code to GitHub
2. In Netlify, click "Add new site" → "Import an existing project"
3. Connect your GitHub repository
4. Deploy!

#### Option B: Deploy via Netlify CLI
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod
```

### 5. Testing Locally (Optional)

To test the checkout flow locally:

```bash
# Install Netlify CLI if you haven't
npm install -g netlify-cli

# Create a .env file with your keys
cp .env.example .env
# Edit .env and add your actual keys

# Run local dev server
netlify dev
```

Then access your site at the URL provided by Netlify Dev (usually `http://localhost:8888`).

## Important Notes

- ⚠️ **Never commit `.env` files** - they're already in `.gitignore`
- The publishable key is already hardcoded in `script.js` and is safe to commit
- Make sure your Stripe account is activated and can accept live payments
- Test thoroughly in Stripe test mode before going live

## Troubleshooting

### "Error starting checkout"
- Ensure you're accessing the site via Netlify URL, not `localhost` or `127.0.0.1` file server
- Check that environment variables are set in Netlify
- Verify the Stripe Price ID is correct

### Payments not working
- Verify your Stripe account is fully activated
- Check that you're using live keys (starting with `sk_live_` and `pk_live_`)
- Ensure the Price ID exists in your Stripe dashboard

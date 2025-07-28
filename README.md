# SquareFundr - Interactive Fundraising Platform

SquareFundr is a modern, mobile-first fundraising platform that allows users to create interactive square grid campaigns. Donors can select and purchase squares overlaid on campaign images, making fundraising engaging and visual.

## 🚀 Features

- **Interactive Square Grids**: Upload images and overlay clickable squares for donations
- **Flexible Pricing**: Fixed, sequential, or manual pricing strategies
- **Mobile-First Design**: Responsive design optimized for all devices
- **Secure Payments**: Stripe integration for secure online payments
- **Cash Payment Support**: Option for offline cash payments
- **Real-time Updates**: Live updates when squares are claimed
- **User Dashboard**: Campaign management and analytics
- **No Donor Registration**: Frictionless donation process
- **Animated UI**: Smooth animations with Framer Motion

## 🛠 Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **Storage**: Supabase Storage
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod validation
- **File Upload**: React Dropzone

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd squarefundr
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ADMIN_FEE_AMOUNT=10.00
   ADMIN_STRIPE_ACCOUNT_ID=acct_...
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

4. **Set up Supabase**
   
   Create the following tables in your Supabase database:

   ```sql
   -- Users table
   CREATE TABLE users (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     email TEXT UNIQUE NOT NULL,
     stripe_id TEXT,
     role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Campaigns table
   CREATE TABLE campaigns (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES users(id) ON DELETE CASCADE,
     title TEXT NOT NULL,
     description TEXT,
     image_url TEXT NOT NULL,
     rows INTEGER NOT NULL,
     columns INTEGER NOT NULL,
     pricing_type TEXT NOT NULL CHECK (pricing_type IN ('fixed', 'sequential', 'manual')),
     price_data JSONB NOT NULL,
     public_url TEXT NOT NULL,
     slug TEXT UNIQUE NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     paid_to_admin BOOLEAN DEFAULT FALSE,
     is_active BOOLEAN DEFAULT TRUE
   );

   -- Squares table
   CREATE TABLE squares (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
     row INTEGER NOT NULL,
     column INTEGER NOT NULL,
     number INTEGER NOT NULL,
     value DECIMAL(10,2) NOT NULL,
     claimed_by TEXT,
     donor_name TEXT,
     payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
     payment_type TEXT DEFAULT 'stripe' CHECK (payment_type IN ('stripe', 'cash')),
     claimed_at TIMESTAMP WITH TIME ZONE,
     UNIQUE(campaign_id, row, column)
   );

   -- Transactions table
   CREATE TABLE transactions (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
     square_ids TEXT[] NOT NULL,
     total DECIMAL(10,2) NOT NULL,
     payment_method TEXT NOT NULL CHECK (payment_method IN ('stripe', 'cash')),
     donor_email TEXT,
     donor_name TEXT,
     status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
     stripe_payment_intent_id TEXT,
     timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

   Create a storage bucket for images:
   ```sql
   INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true);
   ```

5. **Set up Stripe**
   - Create a Stripe account
   - Get your API keys from the Stripe dashboard
   - Set up webhooks for payment processing

6. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗 Project Structure

```
squarefundr/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── create/            # Campaign creation
│   ├── dashboard/         # User dashboard
│   ├── fundraiser/        # Public campaign pages
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── GridOverlay.tsx    # Interactive grid component
│   ├── ImageUploader.tsx  # File upload component
│   ├── Navbar.tsx         # Navigation component
│   ├── PaymentModal.tsx   # Payment processing modal
│   └── Square.tsx         # Individual square component
├── lib/                   # Utility libraries
│   ├── stripe.ts          # Stripe configuration
│   └── supabaseClient.ts  # Supabase client
├── types/                 # TypeScript type definitions
├── utils/                 # Utility functions
└── public/               # Static assets
```

## 🎯 Usage

### Creating a Campaign

1. **Sign up/Login**: Use magic link authentication
2. **Upload Image**: Drag and drop or select campaign image
3. **Configure Grid**: Set rows, columns, and pricing strategy
4. **Pay Setup Fee**: One-time $10 fee to activate campaign
5. **Share Link**: Get public URL to share with supporters

### Donation Flow

1. **Visit Campaign**: Access public campaign URL
2. **Select Squares**: Click on available squares
3. **Choose Payment**: Credit card (Stripe) or cash payment
4. **Complete Donation**: Squares are immediately reserved

### Pricing Strategies

- **Fixed**: Same price for all squares
- **Sequential**: Price increases by increment for each square
- **Manual**: Set individual price for each square

## 🔧 Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook secret |
| `ADMIN_FEE_AMOUNT` | Campaign setup fee amount |
| `NEXT_PUBLIC_SITE_URL` | Your site URL |

### Customization

- **Brand Colors**: Update `tailwind.config.ts` brand color
- **Styling**: Modify `app/globals.css` for custom styles
- **Pricing**: Adjust admin fee in environment variables

## 🚀 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 🔒 Security

- All payments processed securely through Stripe
- User authentication via Supabase Auth
- Environment variables for sensitive data
- Input validation with Zod schemas
- SQL injection protection via Supabase

## 📱 Mobile Support

- Responsive design for all screen sizes
- Touch-optimized square selection
- Mobile-first CSS approach
- Progressive Web App ready

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please open an issue on GitHub or contact the development team.

---

Built with ❤️ using Next.js, Supabase, and Stripe
# Last updated: Fri Jun  6 00:41:19 EDT 2025

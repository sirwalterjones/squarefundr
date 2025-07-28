const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vumctangyedgcbzmhbkl.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function calculateSquarePrice(position, pricingType, priceData) {
  switch (pricingType) {
    case 'fixed':
      return priceData.fixed || 0;
    
    case 'sequential':
      if (priceData.sequential) {
        return priceData.sequential.start + (position - 1) * priceData.sequential.increment;
      }
      return 0;
    
    case 'manual':
      if (priceData.manual) {
        const key = `${Math.floor((position - 1) / 10)},${(position - 1) % 10}`;
        return priceData.manual[key] || 0;
      }
      return 0;
    
    default:
      return 0;
  }
}

async function fixSquares() {
  try {
    console.log('🔧 Fixing squares for campaign...');

    // Get the campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('slug', 'reagan')
      .single();

    if (campaignError || !campaign) {
      console.error('❌ Campaign not found:', campaignError);
      return;
    }

    console.log('✅ Found campaign:', campaign.title, `(${campaign.rows}x${campaign.columns})`);

    // Check existing squares
    const { data: existingSquares, error: existingError } = await supabase
      .from('squares')
      .select('*')
      .eq('campaign_id', campaign.id);

    if (existingError) {
      console.error('❌ Error checking squares:', existingError);
      return;
    }

    console.log('📊 Existing squares:', existingSquares?.length || 0);

    if (existingSquares && existingSquares.length > 0) {
      console.log('✅ Squares already exist, no need to create them');
      return;
    }

    // Create squares for the campaign
    const squares = [];
    for (let row = 0; row < campaign.rows; row++) {
      for (let col = 0; col < campaign.columns; col++) {
        const position = row * campaign.columns + col + 1;
        const price = calculateSquarePrice(position, campaign.pricing_type, campaign.price_data);
        
        squares.push({
          campaign_id: campaign.id,
          row,
          col,
          number: position,
          value: price,
          claimed_by: null,
          donor_name: null,
          payment_status: 'pending',
          payment_type: 'stripe',
          claimed_at: null
        });
      }
    }

    console.log(`📦 Creating ${squares.length} squares...`);

    // Insert squares in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < squares.length; i += BATCH_SIZE) {
      const batch = squares.slice(i, i + BATCH_SIZE);
      console.log(`🔄 Inserting batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(squares.length/BATCH_SIZE)}...`);

      const { error } = await supabase
        .from('squares')
        .insert(batch);

      if (error) {
        console.error('❌ Error inserting squares:', error);
        return;
      }
    }

    console.log('🎉 All squares created successfully!');

    // Verify creation
    const { data: newSquares, error: verifyError } = await supabase
      .from('squares')
      .select('*')
      .eq('campaign_id', campaign.id);

    if (verifyError) {
      console.error('❌ Error verifying squares:', verifyError);
      return;
    }

    console.log('✅ Verification: Created', newSquares?.length || 0, 'squares');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixSquares(); 
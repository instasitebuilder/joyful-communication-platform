import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { broadcastId } = await req.json();
    console.log('Processing broadcast:', broadcastId);

    // Fetch the broadcast content
    const { data: broadcast, error: fetchError } = await supabaseClient
      .from('broadcasts')
      .select('*')
      .eq('id', broadcastId)
      .single();

    if (fetchError) {
      console.error('Failed to fetch broadcast:', fetchError);
      throw new Error(`Failed to fetch broadcast: ${fetchError.message}`);
    }

    if (!broadcast) {
      throw new Error('Broadcast not found');
    }

    console.log('Fetched broadcast:', broadcast);

    // Call ClaimBuster API
    const claimBusterKey = Deno.env.get('CLAIMBUSTER_API_KEY');
    if (!claimBusterKey) {
      throw new Error('CLAIMBUSTER_API_KEY is not set');
    }

    // Encode the text for URL
    const encodedText = encodeURIComponent(broadcast.content);
    const claimBusterResponse = await fetch(
      `https://idir.uta.edu/claimbuster/api/v2/score/text/${encodedText}`,
      {
        method: 'GET',
        headers: {
          'x-api-key': claimBusterKey,
        },
      }
    );

    console.log('ClaimBuster API Status:', claimBusterResponse.status);
    const claimBusterText = await claimBusterResponse.text();
    console.log('ClaimBuster Raw Response:', claimBusterText);

    let claimBusterData;
    try {
      claimBusterData = JSON.parse(claimBusterText);
    } catch (e) {
      console.error('Failed to parse ClaimBuster response:', e);
      throw new Error('Invalid JSON response from ClaimBuster API');
    }

    // Call Google Fact Check API
    const googleKey = Deno.env.get('GOOGLE_FACT_CHECK_API_KEY');
    if (!googleKey) {
      throw new Error('GOOGLE_FACT_CHECK_API_KEY is not set');
    }

    const query = encodeURIComponent(broadcast.content);
    const googleResponse = await fetch(
      `https://factchecktools.googleapis.com/v1alpha1/claims:search?key=${googleKey}&query=${query}`
    );

    console.log('Google Fact Check API Status:', googleResponse.status);
    const googleData = await googleResponse.json();
    console.log('Google Fact Check Response:', googleData);

    // Calculate confidence and status
    const claimBusterConfidence = claimBusterData.results?.[0]?.score 
      ? Math.round(claimBusterData.results[0].score * 100)
      : 0;

    const googleClaims = googleData.claims || [];
    const googleVerified = googleClaims.some(claim => 
      claim.claimReview?.[0]?.textualRating?.toLowerCase().includes('true') ||
      claim.claimReview?.[0]?.textualRating?.toLowerCase().includes('correct')
    );

    const confidence = googleVerified ? Math.max(claimBusterConfidence, 80) : claimBusterConfidence;
    const status = confidence > 80 ? 'verified' : confidence < 40 ? 'debunked' : 'flagged';

    // Update the broadcast with a transaction
    const { error: updateError } = await supabaseClient
      .from('broadcasts')
      .update({
        confidence,
        api_processed: true,
        status
      })
      .eq('id', broadcastId);

    if (updateError) {
      console.error('Failed to update broadcast:', updateError);
      throw new Error(`Failed to update broadcast: ${updateError.message}`);
    }

    // Prepare fact check entries
    const factChecks = [];
    
    // Add ClaimBuster fact check
    factChecks.push({
      broadcast_id: broadcastId,
      verification_source: 'ClaimBuster API',
      explanation: `Claim check score: ${claimBusterConfidence}%`,
      confidence_score: claimBusterConfidence
    });

    // Add Google fact checks
    googleClaims.forEach(claim => {
      if (claim.claimReview?.[0]) {
        factChecks.push({
          broadcast_id: broadcastId,
          verification_source: 'Google Fact Check API',
          explanation: claim.claimReview[0].textualRating,
          confidence_score: googleVerified ? 90 : 30
        });
      }
    });

    // Insert fact checks
    if (factChecks.length > 0) {
      const { error: factCheckError } = await supabaseClient
        .from('fact_checks')
        .insert(factChecks);

      if (factCheckError) {
        console.error('Failed to create fact checks:', factCheckError);
        throw new Error(`Failed to create fact checks: ${factCheckError.message}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        confidence,
        googleClaims: googleData.claims || [],
        claimBusterScore: claimBusterConfidence 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing claim:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
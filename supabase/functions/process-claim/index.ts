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

    if (fetchError || !broadcast) {
      console.error('Failed to fetch broadcast:', fetchError);
      throw new Error('Failed to fetch broadcast');
    }

    console.log('Fetched broadcast:', broadcast);

    // Call ClaimBuster API
    const apiKey = Deno.env.get('CLAIMBUSTER_API_KEY');
    if (!apiKey) {
      throw new Error('CLAIMBUSTER_API_KEY is not set');
    }

    const claimBusterResponse = await fetch(
      'https://idir.uta.edu/claimbuster/api/v2/score/text/',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({ text: broadcast.content }),
      }
    );

    console.log('ClaimBuster API Status:', claimBusterResponse.status);
    const responseText = await claimBusterResponse.text();
    console.log('ClaimBuster Raw Response:', responseText);

    if (!claimBusterResponse.ok) {
      throw new Error(`ClaimBuster API error: ${responseText}`);
    }

    let claimBusterData;
    try {
      claimBusterData = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse ClaimBuster response:', e);
      throw new Error('Invalid JSON response from ClaimBuster API');
    }

    console.log('Parsed ClaimBuster response:', claimBusterData);

    if (!claimBusterData.results || !Array.isArray(claimBusterData.results) || claimBusterData.results.length === 0) {
      console.error('Invalid response structure:', claimBusterData);
      throw new Error('Invalid response structure from ClaimBuster API');
    }

    const result = claimBusterData.results[0];
    if (typeof result.score !== 'number') {
      console.error('Invalid score type:', result);
      throw new Error('Invalid score format from ClaimBuster API');
    }

    // Calculate confidence based on ClaimBuster score
    const confidence = Math.round(result.score * 100);
    console.log('Calculated confidence:', confidence);

    // Update the broadcast with AI processing results
    const { error: updateError } = await supabaseClient
      .from('broadcasts')
      .update({
        confidence: confidence,
        api_processed: true,
        status: confidence > 80 ? 'flagged' : 'pending'
      })
      .eq('id', broadcastId);

    if (updateError) {
      console.error('Failed to update broadcast:', updateError);
      throw new Error('Failed to update broadcast');
    }

    // Create a fact check entry
    const { error: factCheckError } = await supabaseClient
      .from('fact_checks')
      .insert({
        broadcast_id: broadcastId,
        verification_source: 'ClaimBuster API',
        explanation: `Claim check score: ${confidence}%`,
        confidence_score: confidence,
        verification_method: 'ai'
      });

    if (factCheckError) {
      console.error('Failed to create fact check:', factCheckError);
      throw new Error('Failed to create fact check');
    }

    return new Response(
      JSON.stringify({ success: true, confidence }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing claim:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
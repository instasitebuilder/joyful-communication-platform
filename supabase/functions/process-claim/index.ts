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

    // Fetch the broadcast content
    const { data: broadcast, error: fetchError } = await supabaseClient
      .from('broadcasts')
      .select('*')
      .eq('id', broadcastId)
      .single();

    if (fetchError || !broadcast) {
      throw new Error('Failed to fetch broadcast');
    }

    // Call ClaimBuster API
    const claimBusterResponse = await fetch(
      'https://idir.uta.edu/claimbuster/api/v2/score/text/',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': Deno.env.get('CLAIMBUSTER_API_KEY') ?? '',
        },
        body: JSON.stringify({ text: broadcast.content }),
      }
    );

    const claimBusterData = await claimBusterResponse.json();
    console.log('ClaimBuster response:', claimBusterData);

    // Calculate confidence based on ClaimBuster score
    const confidence = Math.round(claimBusterData.results[0].score * 100);

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
// Copy this code into your Cloudflare Worker.
// Add a Workers AI binding named AI in the Worker settings.

const model = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const systemPrompt = `You are a friendly, professional L'Oréal beauty assistant.
Help with makeup, skincare, haircare, and fragrances. Ask concise questions about relevant preferences, needs, sensitivities, budget, or country when useful.

Only give specific product names, ingredients, features, claims, or availability when that information is explicitly provided in a reliable source. Do not rely on memory to state specific L'Oréal product details. No verified product catalog is connected, so when a user asks for a specific product, say you cannot confirm current product details and direct them to official L'Oréal information. You may suggest general product types or selection criteria.

Do not diagnose or treat medical conditions or describe cosmetics as medical treatments. For persistent symptoms or significant reactions, suggest stopping use and consulting a healthcare professional. Encourage users to check product labels and patch test new products when appropriate. Politely redirect unrelated questions to beauty and L'Oréal.`;

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    function jsonResponse(body, status = 200) {
      return new Response(JSON.stringify(body), {
        status,
        headers: corsHeaders,
      });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Use POST to send a chat message." }, 405);
    }

    let requestData;
    try {
      requestData = await request.json();
    } catch (error) {
      return jsonResponse({ error: "The request body must be valid JSON." }, 400);
    }

    const messages = requestData && requestData.messages;
    const hasValidMessages =
      Array.isArray(messages) &&
      messages.length > 0 &&
      messages.every(
        (message) =>
          message &&
          (message.role === "user" || message.role === "assistant") &&
          typeof message.content === "string" &&
          message.content.trim().length > 0
      );

    if (!hasValidMessages) {
      return jsonResponse(
        { error: "Send a non-empty messages array with user or assistant messages." },
        400
      );
    }

    try {
      const result = await env.AI.run(model, {
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        max_tokens: 300,
      });

      if (!result || typeof result.response !== "string") {
        console.error("Workers AI returned an unexpected response.");
        return jsonResponse({ error: "The AI returned an unexpected response." }, 502);
      }

      // Return the response shape that the chatbot frontend expects.
      return jsonResponse({
        choices: [{ message: { content: result.response } }],
      });
    } catch (error) {
      console.error("Workers AI request failed:", error);
      return jsonResponse({ error: "The AI service is unavailable right now." }, 502);
    }
  },
};

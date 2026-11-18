# L'Oréal Beauty Assistant: Product-Aware Routine Builder

A branded L'Oréal chatbot upgraded into a smart routine builder. Users browse real L'Oréal brand products, select the ones they want, generate a personalized routine with AI, and ask follow-up questions about it.

## ✨ Features

- **Browse** products by category from `products.json`.
- **Select** a product by clicking its card (or pressing Enter/Space). Selected cards get a red border and a check mark.
- **Read descriptions** by hovering over or tabbing to a card.
- **Selected Products** list with a remove button on each item and a **Clear all** button.
- **Saved selections:** picks are stored in `localStorage` and stay after a page reload.
- **Generate Routine** sends only the selected products' name, brand, category, and description to the AI, and the routine appears in the chat window.
- **Follow-up questions:** the full conversation is sent with every request, so the assistant remembers the routine.

## 🚀 Launch via GitHub Codespaces

1. In the GitHub repo, click the **Code** button and select **Open with Codespaces → New codespace**.
2. Once your codespace is ready, open the `index.html` file via the live preview.

## ☁️ Cloudflare Workers AI setup

The frontend sends chat messages to a Cloudflare Worker. The Worker uses a Workers AI binding named `AI`, so no API key or Cloudflare token is placed in the browser or project files.

1. In the Cloudflare dashboard, create a Worker from **Workers & Pages**.
2. Copy the code from `RESOURCE_cloudflare-worker.js` into the Worker editor.
3. In the Worker settings, add a **Workers AI** binding with the variable name `AI`, then save and deploy.
4. Copy the deployed `workers.dev` URL into the `workerUrl` constant in `script.js`.
5. Open the chatbot and send a message. The Worker returns the reply in `data.choices[0].message.content`.

The Worker currently uses Cloudflare's `@cf/meta/llama-3.3-70b-instruct-fp8-fast` text-generation model. See [Cloudflare's Workers AI binding documentation](https://developers.cloudflare.com/workers-ai/configuration/bindings/) for current dashboard and model setup details.

Product information comes from `products.json`. When the user generates a routine, the selected products' details are included in the message sent to the Worker, so the assistant works from real product data.

The browser keeps successful user and assistant messages in memory and sends the conversation history with each request. Refreshing the page starts a new conversation (selected products are kept). Every question and response appears inside the chat window, with the question just above its reply.

The frontend sends the conversation in this format:

```js
const response = await fetch(workerUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messages: [
      { role: "user", content: "I have dry skin. What routine should I try?" },
      { role: "assistant", content: "What products do you currently use?" },
      { role: "user", content: "Just cleanser and moisturizer." },
    ],
  }),
});

const data = await response.json();
const reply = data.choices[0].message.content;
```

Enjoy building your L’Oréal beauty assistant! 💄

# Project 8: L'Oréal Chatbot

L’Oréal is exploring the power of AI, and your job is to showcase what's possible. Your task is to build a chatbot that helps users discover and understand L’Oréal’s extensive range of products—makeup, skincare, haircare, and fragrances—as well as provide personalized routines and recommendations.

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

No verified L'Oréal product catalog is connected. The assistant can discuss general product types, but it should not name specific products or ingredients unless reliable product information is supplied to the Worker.

The browser keeps successful user and assistant messages in memory and sends the conversation history with each request. Refreshing the page starts a new conversation. The latest question and response appear together; when a new question is sent, the previous exchange moves into the transcript.

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

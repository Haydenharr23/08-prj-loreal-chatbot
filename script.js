const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");
const currentExchange = document.getElementById("currentExchange");
const workerUrl = "https://loreal-beauty-assistant.haydenharr.workers.dev/";
const conversationHistory = [];

let currentQuestion = null;
let currentResponse = null;

function createMessage(role, text) {
  const message = document.createElement("div");
  message.className = `msg ${role}`;

  // Add a short label so the chat reads clearly.
  const label = role === "user" ? "You" : "AI";
  message.textContent = `${label}: ${text}`;

  return message;
}

function addMessage(role, text) {
  const message = createMessage(role, text);
  chatWindow.appendChild(message);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function archiveCurrentExchange() {
  if (!currentQuestion) {
    return;
  }

  chatWindow.appendChild(currentQuestion);
  chatWindow.appendChild(currentResponse);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function showCurrentQuestion(text) {
  archiveCurrentExchange();

  currentQuestion = createMessage("user", text);
  currentResponse = createMessage("ai", "");
  currentExchange.appendChild(currentQuestion);
  currentExchange.appendChild(currentResponse);
  currentExchange.hidden = false;
}

function setLoadingState(isLoading) {
  userInput.disabled = isLoading;
  sendBtn.disabled = isLoading;

  if (!currentResponse) {
    return;
  }

  if (isLoading) {
    currentResponse.classList.add("loading");
    currentResponse.textContent = "AI: Thinking...";
  } else {
    currentResponse.classList.remove("loading");
  }
}

// Send the conversation so the Worker can respond with earlier turns in context.
async function sendMessageToAI(messages) {
  const response = await fetch(workerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`Worker request failed with status ${response.status}`);
  }

  const data = await response.json();
  const reply =
    data.choices &&
    data.choices[0] &&
    data.choices[0].message &&
    data.choices[0].message.content;

  if (typeof reply !== "string" || !reply.trim()) {
    throw new Error("The Worker returned an unexpected response.");
  }

  return reply;
}

// Show a friendly welcome message when the page loads.
addMessage("ai", "Hello! I can help you find beauty products, routines, and recommendations.");

async function handleSubmit(event) {
  event.preventDefault();

  const message = userInput.value.trim();
  if (!message) {
    return;
  }

  showCurrentQuestion(message);
  userInput.value = "";

  // Tell the user the assistant is working.
  setLoadingState(true);

  try {
    const requestMessages = [
      ...conversationHistory,
      { role: "user", content: message },
    ];
    const reply = await sendMessageToAI(requestMessages);

    conversationHistory.push({ role: "user", content: message });
    conversationHistory.push({ role: "assistant", content: reply });
    currentResponse.textContent = `AI: ${reply}`;
  } catch (error) {
    console.error(error);
    currentResponse.textContent =
      "AI: Sorry, I couldn't reach the assistant right now. Please try again in a moment.";
  } finally {
    setLoadingState(false);
  }
}

// Submitting the form works with both the send button and the Enter key.
chatForm.addEventListener("submit", handleSubmit);

/* ===== Get references to page elements ===== */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const generateRoutineBtn = document.getElementById("generateRoutine");
const clearSelectionsBtn = document.getElementById("clearSelections");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendBtn = document.getElementById("sendBtn");

// The Cloudflare Worker that talks to the AI for us (no API key in this file).
const workerUrl = "https://loreal-beauty-assistant.haydenharr.workers.dev/";

// The name we use to save selected products in localStorage.
const storageKey = "lorealSelectedProductIds";

/* ===== App data ===== */
let allProducts = []; // every product from products.json
let selectedIds = loadSavedSelections(); // ids of the products the user picked
const conversationHistory = []; // every user + assistant message, for follow-ups

/* ===== localStorage: remember selected products ===== */

// Read the saved product ids. If nothing is saved (or it fails), start empty.
function loadSavedSelections() {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    return [];
  }
}

// Save the current product ids so they stay after a page reload.
function saveSelections() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(selectedIds));
  } catch (error) {
    console.warn("Could not save selections:", error);
  }
}

/* ===== Products ===== */

// Load product data from the JSON file.
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

// Get the full product objects for the selected ids.
function getSelectedProducts() {
  return allProducts.filter((product) => selectedIds.includes(product.id));
}

// Build the product cards for the grid.
function displayProducts(products) {
  if (products.length === 0) {
    productsContainer.innerHTML = `
      <div class="placeholder-message">No products found in this category.</div>
    `;
    return;
  }

  productsContainer.innerHTML = products
    .map((product) => {
      const isSelected = selectedIds.includes(product.id);

      // Each card works like a button: click it (or press Enter/Space) to select it.
      // The description is in an overlay that appears on hover or keyboard focus.
      return `
        <div
          class="product-card ${isSelected ? "selected" : ""}"
          data-id="${product.id}"
          role="button"
          tabindex="0"
          aria-pressed="${isSelected}"
          aria-label="${product.brand} ${product.name}"
          aria-describedby="desc-${product.id}"
        >
          <span class="check-badge" aria-hidden="true">
            <span class="material-icons">check</span>
          </span>
          <img src="${product.image}" alt="">
          <div class="product-info">
            <p class="product-brand">${product.brand}</p>
            <h3>${product.name}</h3>
          </div>
          <div class="product-description" id="desc-${product.id}">
            <p>${product.description}</p>
          </div>
        </div>
      `;
    })
    .join("");
}

// Show the products that match the category chosen in the dropdown.
function showCurrentCategory() {
  const selectedCategory = categoryFilter.value;

  // filter() makes a new array with only the products in that category.
  const filteredProducts = allProducts.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
}

/* ===== Selecting products ===== */

// Add a product if it isn't selected yet, or remove it if it is.
function toggleProduct(productId) {
  if (selectedIds.includes(productId)) {
    selectedIds = selectedIds.filter((id) => id !== productId);
  } else {
    selectedIds.push(productId);
  }
  updateSelections();
}

// Save, then update everything on the page that shows the selections.
function updateSelections() {
  saveSelections();
  displaySelectedProducts();

  // Update the cards already on the page (keeps keyboard focus where it is).
  document.querySelectorAll(".product-card").forEach((card) => {
    const isSelected = selectedIds.includes(Number(card.dataset.id));
    card.classList.toggle("selected", isSelected);
    card.setAttribute("aria-pressed", isSelected);
  });
}

// Show the Selected Products list, each item with its own remove button.
function displaySelectedProducts() {
  const selectedProducts = getSelectedProducts();

  // Only show "Clear all" when there is something to clear.
  clearSelectionsBtn.hidden = selectedProducts.length === 0;

  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `
      <p class="empty-message">No products selected yet.</p>
    `;
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
        <div class="selected-item">
          <img src="${product.image}" alt="">
          <span>${product.brand} ${product.name}</span>
          <button
            type="button"
            class="remove-btn"
            data-id="${product.id}"
            aria-label="Remove ${product.brand} ${product.name}"
          >
            <span class="material-icons" aria-hidden="true">close</span>
          </button>
        </div>
      `
    )
    .join("");
}

/* ===== Chat ===== */

// Make AI text safe to show on the page, then turn **bold** into real bold text.
function formatText(text) {
  const safeText = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return safeText.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

// Create a chat bubble and add it INSIDE the chat window.
// Returns the bubble so we can change its text later (for "Thinking...").
function addMessage(role, text) {
  const message = document.createElement("div");
  message.className = `msg ${role}`;
  message.innerHTML = formatText(text);
  chatWindow.appendChild(message);

  // Scroll to the bottom so the newest message is always visible.
  chatWindow.scrollTop = chatWindow.scrollHeight;

  return message;
}

// Turn the input and buttons off while waiting, and back on when done.
function setLoadingState(isLoading) {
  userInput.disabled = isLoading;
  sendBtn.disabled = isLoading;
  generateRoutineBtn.disabled = isLoading;
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

// Show a question in the chat, ask the AI, and show its answer below it.
// "displayText" is what the user sees; "messageForAI" is what the AI receives.
async function askAI(displayText, messageForAI) {
  // 1. Show the user's message in the chat window.
  addMessage("user", displayText);

  // 2. Show a "Thinking..." bubble right below it while we wait.
  const replyBubble = addMessage("ai", "Thinking...");
  replyBubble.classList.add("loading");
  setLoadingState(true);

  try {
    // 3. Send the whole conversation plus the new message to the Worker.
    const requestMessages = [
      ...conversationHistory,
      { role: "user", content: messageForAI },
    ];
    const reply = await sendMessageToAI(requestMessages);

    // 4. Save both messages so the AI remembers them next time.
    conversationHistory.push({ role: "user", content: messageForAI });
    conversationHistory.push({ role: "assistant", content: reply });

    // 5. Replace "Thinking..." with the real answer.
    replyBubble.innerHTML = formatText(reply);
  } catch (error) {
    console.error(error);
    replyBubble.textContent =
      "Sorry, I couldn't reach the assistant right now. Please try again in a moment.";
  } finally {
    replyBubble.classList.remove("loading");
    setLoadingState(false);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }
}

/* ===== Generate a routine ===== */

async function generateRoutine() {
  const selectedProducts = getSelectedProducts();

  if (selectedProducts.length === 0) {
    addMessage("ai", "Select at least one product above, then click Generate Routine.");
    return;
  }

  // Send only the details the AI needs for each selected product.
  const productData = selectedProducts.map((product) => ({
    name: product.name,
    brand: product.brand,
    category: product.category,
    description: product.description,
  }));

  const messageForAI = `Please build me a personalized step-by-step routine using ONLY these products I selected. Product details (JSON from the L'Oréal product catalog):
${JSON.stringify(productData, null, 2)}

Organize it by morning and/or evening when that makes sense, say when to use each product and why, and give a short tip for each step.`;

  // The chat shows a short, friendly version instead of the raw JSON.
  const productNames = selectedProducts.map((product) => product.name).join(", ");

  await askAI(`Build a routine with: ${productNames}`, messageForAI);
}

/* ===== Event listeners ===== */

// Show matching products when the category changes.
categoryFilter.addEventListener("change", showCurrentCategory);

// Clicking a card selects or unselects it.
// One listener on the grid handles every card (event delegation).
productsContainer.addEventListener("click", (event) => {
  const card = event.target.closest(".product-card");
  if (card) {
    toggleProduct(Number(card.dataset.id));
  }
});

// Keyboard users can press Enter or Space on a focused card.
productsContainer.addEventListener("keydown", (event) => {
  const card = event.target.closest(".product-card");
  if (card && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault(); // stop Space from scrolling the page
    toggleProduct(Number(card.dataset.id));
  }
});

// Remove one product with its × button in the Selected Products list.
selectedProductsList.addEventListener("click", (event) => {
  const removeBtn = event.target.closest(".remove-btn");
  if (removeBtn) {
    toggleProduct(Number(removeBtn.dataset.id));
  }
});

// Clear every selection at once.
clearSelectionsBtn.addEventListener("click", () => {
  selectedIds = [];
  updateSelections();
});

// Build a routine from the selected products.
generateRoutineBtn.addEventListener("click", generateRoutine);

// Follow-up questions typed in the chat box (works with Enter or the send button).
chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = userInput.value.trim();
  if (!message) {
    return;
  }

  userInput.value = "";
  await askAI(message, message);

  // Put the cursor back in the input so the user can keep typing.
  userInput.focus();
});

/* ===== Start the app ===== */
async function init() {
  // Show a placeholder until the user picks a category.
  productsContainer.innerHTML = `
    <div class="placeholder-message">Select a category to view products</div>
  `;

  // Show a friendly welcome message.
  addMessage(
    "ai",
    "Hello! Choose your products above and click Generate Routine. Then ask me anything about your routine, or about skincare, haircare, makeup, and fragrance."
  );

  // Load the products once, then show any selections saved from last time.
  allProducts = await loadProducts();

  // Ignore any saved ids that don't match a product anymore.
  selectedIds = selectedIds.filter((id) =>
    allProducts.some((product) => product.id === id)
  );
  displaySelectedProducts();
}

init();

// Acquire vscode API
const vscode = acquireVsCodeApi();

const form = document.getElementById("chatForm");
const textarea = document.getElementById("question");
const askButton = document.getElementById("askBtn");
const modelSelector = document.getElementById("modelSelector");

// Disable button initially
askButton.disabled = true;

// Add submission tracking
let isSubmitting = false;

// Update button state based on textarea content
function updateButtonState() {
  askButton.disabled = textarea.value.trim().length === 0 || isSubmitting;
}

// Add input listener for textarea
textarea.addEventListener("input", updateButtonState);

// Auto-resize textarea
textarea.addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = this.scrollHeight + "px";
});

// Handle Enter key (submit on Enter, new line on Shift+Enter)
textarea.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    form.requestSubmit();
  }
});

// Update form submit handler
form.addEventListener("submit", (e) => {
  e.preventDefault();

  // Prevent concurrent submissions
  if (isSubmitting) {
    return;
  }

  const text = textarea.value.trim();
  if (!text) {
    return;
  }

  // Set submission state
  isSubmitting = true;
  updateButtonState();

  // Create user's message bubble
  createChatBubble(text, true);

  // Create thinking bubble
  const thinkingBubbleId = createThinkingBubble(modelSelector.value);
  const modelName = modelSelector.value;

  // Disable button and show processing state
  askButton.disabled = isSubmitting;
  askButton.innerHTML =
    '<i class="codicon codicon-loading codicon-modifier-spin"></i>';

  // Clear and reset textarea
  textarea.value = "";
  textarea.style.height = "auto";

  const message = {
    command: 'chat',
    text,
    modelName,
    bubbleId: thinkingBubbleId,
  };
  vscode.postMessage(message);
});

function createThinkingBubble(modelName) {
  const bubbleId = "thinking-" + Date.now();
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble";
  bubble.id = bubbleId;

  const avatar = document.createElement("div");
  avatar.className = "avatar codicon codicon-symbol-misc";

  const messageContent = document.createElement("div");
  messageContent.className = "message-content";

  const header = document.createElement("div");
  header.className = "message-header";

  const usernameSpan = document.createElement("span");
  usernameSpan.className = "username";
  usernameSpan.textContent = modelName;
  header.appendChild(usernameSpan);

  const messageBubble = document.createElement("div");
  messageBubble.className = "message-bubble";
  messageBubble.innerHTML =
    '<i class="codicon codicon-loading codicon-modifier-spin"></i> Thinking...';

  messageContent.appendChild(header);
  messageContent.appendChild(messageBubble);
  bubble.appendChild(avatar);
  bubble.appendChild(messageContent);

  document.getElementById("chatContainer").appendChild(bubble);
  bubble.scrollIntoView({ behavior: "smooth" });
  return bubbleId;
}

function createChatBubble(content, isUser, modelName) {
  const bubble = document.createElement("div");
  bubble.className = "chat-bubble";

  const avatar = document.createElement("div");
  avatar.className = "avatar codicon";
  // Use VS Code's built-in Codicons
  if (isUser) {
    avatar.className += " codicon-account";
  } else {
    avatar.className += " codicon-symbol-misc";
  }

  const messageContent = document.createElement("div");
  messageContent.className = "message-content";

  const header = document.createElement("div");
  header.className = "message-header";

  const usernameSpan = document.createElement("span");
  usernameSpan.className = "username";
  usernameSpan.textContent = isUser ? "User" : modelName;

  header.appendChild(usernameSpan);

  const messageBubble = document.createElement("div");
  messageBubble.className = "message-bubble";
  messageBubble.innerHTML = marked.parse(content);

  // Add copy buttons to code blocks with codicon
  messageBubble.querySelectorAll("pre").forEach((pre) => {
    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-button";
    copyBtn.innerHTML = '<i class="codicon codicon-copy"></i>';
    copyBtn.onclick = () => {
      const code = pre.querySelector("code").textContent;
      handleCodeCopy(code, copyBtn);
    };
    pre.appendChild(copyBtn);
  });

  messageContent.appendChild(header);
  messageContent.appendChild(messageBubble);
  bubble.appendChild(avatar);
  bubble.appendChild(messageContent);

  document.getElementById("chatContainer").appendChild(bubble);
  bubble.scrollIntoView({ behavior: "smooth" });
}

function handleCodeCopy(code, button) {
  return navigator.clipboard.writeText(code).then(() => {
    button.innerHTML = '<i class="codicon codicon-check"></i>';
    setTimeout(() => {
      button.innerHTML = '<i class="codicon codicon-copy"></i>';
    }, 2000);
  });
}

function addCopyButtonsToCodeBlocks(container) {
  container.querySelectorAll("pre").forEach((pre) => {
    const copyBtn = document.createElement("button");
    copyBtn.className = "copy-button";
    copyBtn.innerHTML = '<i class="codicon codicon-copy"></i>';
    copyBtn.onclick = () => {
      const code = pre.querySelector("code").textContent;
      handleCodeCopy(code, copyBtn);
    };
    pre.appendChild(copyBtn);
  });
}

function updateMessageBubble(bubble, text) {
  bubble.innerHTML = marked.parse(text);
  addCopyButtonsToCodeBlocks(bubble);
  bubble.querySelectorAll("pre code").forEach((block) => {
    hljs.highlightElement(block);
  });
}

modelSelector.addEventListener("change", (e) => {
  const modelName = e.target.value;
  vscode.postMessage({
    command: 'changeModel',
    modelName,
  });
});

// Configure marked options
marked.setOptions({
  highlight: function (code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
  breaks: true,
  gfm: true,
});

window.addEventListener("message", (event) => {
  const message = event.data;
  switch (message.command) {
    case 'chatResponse':
      const thinkingBubble = document.getElementById(message.bubbleId);
      if (!thinkingBubble) {
        return;
      } // Early return if element not found

      const messageBubble = thinkingBubble.querySelector(".message-bubble");
      if (!messageBubble) {
        return;
      } // Early return if element not found

      updateMessageBubble(messageBubble, message.text);

      if (message.done) {
        // Reset submission state
        isSubmitting = false;
        askButton.disabled = false;
        askButton.innerHTML = '<i class="codicon codicon-send"></i>';

        textarea.focus();
      }
      break;

    case 'error':
      console.error(message.text);
      // Reset submission state on error
      isSubmitting = false;
      askButton.disabled = false;
      askButton.innerHTML = '<i class="codicon codicon-send"></i>';
      break;
  }
});

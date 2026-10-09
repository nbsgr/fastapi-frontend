import { useState, useRef, useEffect } from "react";
import "./ChatSpace.css";

import { BASE_URL, WS_URL, callApi, getSession } from "../api/api";
import MarkdownRenderer from "./MarkdownRenderer";

export default function ChatSpace(props) {
  // State hooks
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  // Ref hooks
  const textareaRef = useRef(null);
  const chatEndRef = useRef(null);
  const socketRef = useRef(null);
  const activeStreamingIndexRef = useRef(null);
  const pendingPayloadRef = useRef(null);

  // =====================================================
  // NDJSON CONTENT PARSER
  // =====================================================
  function extractContentFromNDJSON(raw) {
    if (!raw) {
      return "";
    }

    let finalText = "";
    const lines = raw.split("\n");

    for (const line of lines) {
      try {
        const trimmed = line.trim();

        if (!trimmed) {
          continue;
        }

        // =====================================
        // USER MESSAGE
        // =====================================
        if (!trimmed.startsWith("{")) {
          finalText += trimmed + "\n";
          continue;
        }

        // =====================================
        // BOT NDJSON
        // =====================================
        const json = JSON.parse(trimmed);
        const content = json?.message?.content || "";
        finalText += content;

      } catch (e) {
        console.error("[CONTENT PARSE ERROR]", e);
      }
    }

    return finalText.trim();
  }

  // =====================================================
  // NDJSON THINKING PARSER
  // =====================================================
  function extractThinkingFromNDJSON(raw) {
    if (!raw) {
      return "";
    }

    let finalThinking = "";
    const lines = raw.split("\n");

    for (const line of lines) {
      try {
        const trimmed = line.trim();

        if (!trimmed) {
          continue;
        }

        // =====================================
        // USER MESSAGE
        // =====================================
        if (!trimmed.startsWith("{")) {
          continue;
        }

        // =====================================
        // BOT NDJSON
        // =====================================
        const json = JSON.parse(trimmed);
        const thinking = json?.message?.thinking || "";
        finalThinking += thinking;

      } catch (e) {
        console.error("[THINKING PARSE ERROR]", e);
      }
    }

    return finalThinking.trim();
  }

  // =====================================================
  // SOURCES PARSER
  // =====================================================
  function parseSources(sources) {
    if (!sources) {
      return [];
    }

    try {
      const parsed = JSON.parse(sources);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  // =====================================================
  // AUTO SCROLL
  // =====================================================
  function scrollToBottom() {
    chatEndRef.current?.scrollIntoView({
      behavior: isStreaming ? "auto" : "smooth",
      block: "end"
    });
  }

  // =====================================================
  // =====================================================
  // WEBSOCKET CONNECT
  // =====================================================
  function connectWebSocket() {
    const token = getSession("token");
    if (!token) {
      return;
    }

    if (
      socketRef.current &&
      (socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const socket = new WebSocket(`${WS_URL}/ws/chat?token=${token}`);

    function handleOpen() {
      console.log("[DEBUG] WebSocket Connected");
      if (pendingPayloadRef.current) {
        console.log("[DEBUG] Sending queued pending payload:", pendingPayloadRef.current);
        socket.send(JSON.stringify(pendingPayloadRef.current));
        pendingPayloadRef.current = null;
      }
    }

    function handleMessage(event) {
      try {
        const raw = event.data;
        console.log("[DEBUG] WS RAW CHUNK:", raw);

        if (!raw || raw.trim() === "") {
          return;
        }

        const lines = raw.split("\n");

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) {
            continue;
          }

          let data;
          try {
            data = JSON.parse(line);
          } catch (e) {
            continue;
          }

          // Ignore server heartbeat pong
          if (data && data.type === "pong") {
            continue;
          }

          if (data.error) {
            console.error("[WS ERROR]", data.error);
            setIsStreaming(false);
            setIsThinking(false);
            activeStreamingIndexRef.current = null;
            return;
          }

          const content = data?.message?.content || "";
          const thinking = data?.message?.thinking || "";
          const done = data?.done || false;

          function updateMessages(prevMessages) {
            let newMessages = [...prevMessages];
            let index = activeStreamingIndexRef.current;

            if (index === null) {
              newMessages.push({
                sender: "bot",
                text: "",
                thinking: "",
                sources: [],
                streaming: true
              });
              index = newMessages.length - 1;
              activeStreamingIndexRef.current = index;
            }

            newMessages[index] = {
              ...newMessages[index],
              text: newMessages[index].text + content,
              thinking: newMessages[index].thinking + thinking,
              streaming: !done
            };

            if (done) {
              activeStreamingIndexRef.current = null;
            }

            return newMessages;
          }

          setMessages(updateMessages);
          setIsStreaming(!done);
          setIsThinking(false);
        }
      } catch (error) {
        console.error("[WS MESSAGE ERROR]", error);
      }
    }

    function handleError(err) {
      console.error("[WS ERROR]", err);
    }

    function handleClose() {
      console.log("[DEBUG] WebSocket Disconnected");
      setIsStreaming(false);
      setIsThinking(false);

      if (activeStreamingIndexRef.current !== null) {
        function finalizeDisconnectedMessage(prevMessages) {
          let newMessages = [...prevMessages];
          let index = activeStreamingIndexRef.current;
          if (newMessages[index]) {
            newMessages[index] = {
              ...newMessages[index],
              streaming: false
            };
          }
          return newMessages;
        }
        setMessages(finalizeDisconnectedMessage);
        activeStreamingIndexRef.current = null;
      }

      // Automatically reconnect after 2 seconds to keep connection primed
      setTimeout(function attemptReconnect() {
        if (!socketRef.current || socketRef.current.readyState === WebSocket.CLOSED) {
          console.log("[DEBUG] Attempting WebSocket reconnect...");
          connectWebSocket();
        }
      }, 2000);
    }

    socket.onopen = handleOpen;
    socket.onmessage = handleMessage;
    socket.onerror = handleError;
    socket.onclose = handleClose;

    socketRef.current = socket;
  }

  // =====================================================
  // LOAD MESSAGE HISTORY
  // =====================================================
  function loadMessages() {
    const conversation = props.conversation;
    if (!conversation) {
      return;
    }

    const token = getSession("token");

    function messagesResponse(res) {
      if (res && res.status === 200 && Array.isArray(res.data)) {
        function formatMessage(m) {
          const senderType = m.sender_type || m.senderType || "";
          const isBot = senderType === "BOT";

          return {
            sender: senderType.toLowerCase(),
            text: isBot
              ? extractContentFromNDJSON(m.content || "")
              : (m.content || ""),
            thinking: isBot
              ? extractThinkingFromNDJSON(m.content || "")
              : "",
            sources: parseSources(m.sources),
            streaming: false
          };
        }

        function compareMessages(a, b) {
          const idA = a.id || 0;
          const idB = b.id || 0;
          return idA - idB;
        }

        const sortedList = res.data.slice().sort(compareMessages);
        const formatted = sortedList.map(formatMessage);
        setMessages(formatted);
        activeStreamingIndexRef.current = null;
        setIsStreaming(false);
        setIsThinking(false);
        setTimeout(scrollToBottom, 0);

      }
    }

    callApi(
      "POST",
      `${BASE_URL}/messages/list`,
      {
        conversation_id: conversation.id
      },
      messagesResponse,
      token
    );
  }

  // =====================================================
  // SEND MESSAGE
  // =====================================================
  function sendMessage() {
    if (isStreaming || isThinking) {
      return;
    }

    const conversation = props.conversation;
    const inputText = input.trim();

    if (!inputText || !conversation) {
      return;
    }

    const token = getSession("token");

    // =====================================
    // ADD USER MESSAGE TO UI
    // =====================================
    function addUserMessage(prevMessages) {
      return [
        ...prevMessages,
        {
          sender: "user",
          text: inputText,
          thinking: "",
          sources: [],
          streaming: false
        }
      ];
    }

    setMessages(addUserMessage);
    setInput("");
    setIsThinking(true);
    setTimeout(scrollToBottom, 0);

    // =====================================
    // SAVE USER MESSAGE (REST API)
    // =====================================
    function saveResponse() {}

    callApi(
      "POST",
      `${BASE_URL}/messages/send`,
      {
        conversation_id: conversation.id,
        content: inputText
      },
      saveResponse,
      token
    );

    // =====================================
    // START STREAM VIA WEBSOCKET
    // =====================================
    const payload = {
      conversation_id: conversation.id,
      content: inputText
    };

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      console.log("[DEBUG] Sending WS payload directly:", payload);
      socketRef.current.send(JSON.stringify(payload));
    } else {
      console.warn("[WS] Socket not open (state: " + (socketRef.current ? socketRef.current.readyState : "null") + "). Queuing message and connecting...");
      pendingPayloadRef.current = payload;
      connectWebSocket();
    }
  }

  // =====================================================
  // RENDER SOURCES
  // =====================================================
  function renderSources(sources) {
    if (!sources || sources.length === 0) {
      return null;
    }

    function renderSource(src, i) {
      return (
        <div key={i} className="cgpt-source-item">
          🔗
          <a href={src} target="_blank" rel="noopener noreferrer">
            {src}
          </a>
        </div>
      );
    }

    return (
      <div className="cgpt-message-sources">
        <div className="cgpt-source-title">Sources</div>
        {sources.map(renderSource)}
      </div>
    );
  }

  // =====================================================
  // LIFECYCLE EFFECTS
  // =====================================================

  // Mount: connect websocket, heartbeat and load messages
  useEffect(function mountEffect() {
    connectWebSocket();
    loadMessages();

    // Heartbeat ping every 10 seconds to keep serverless function alive
    const pingInterval = setInterval(function sendPing() {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 10000);

    // Cleanup on unmount
    return function cleanup() {
      clearInterval(pingInterval);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);


  // Update: when conversation changes, reload messages
  useEffect(function conversationChangeEffect() {
    activeStreamingIndexRef.current = null;
    setIsStreaming(false);
    setIsThinking(false);

    loadMessages();
  }, [props.conversation?.id]);

  // Update: scroll to bottom when messages change
  useEffect(function scrollEffect() {
    scrollToBottom();
  }, [messages]);

  // =====================================================
  // RENDER
  // =====================================================
  const conversation = props.conversation;

  if (!conversation) {
    return (
      <div className="cgpt-chatspace-root">
        <h1>Select or start a conversation</h1>
      </div>
    );
  }

  function renderMessage(msg, i) {
    return (
      <div
        key={i}
        className={`
          cgpt-chatspace-message
          ${
            msg.sender === "user"
              ? "cgpt-chatspace-user"
              : "cgpt-chatspace-bot"
          }
        `}
      >
        {/* THINKING */}
        {msg.thinking && msg.thinking.trim() !== "" && (
          <details
            open={msg.streaming}
            className="cgpt-thinking-dropdown"
          >
            <summary>🧠 Thinking</summary>
            <div className="cgpt-thinking-content">
              <MarkdownRenderer content={msg.thinking} />
              {msg.streaming && (
                <span className="cgpt-stream-cursor">▋</span>
              )}
            </div>
          </details>
        )}

        {/* ANSWER */}
        <div className="cgpt-main-answer">
          <MarkdownRenderer content={msg.text} />
          {msg.streaming && (
            <span className="cgpt-stream-cursor">▋</span>
          )}
        </div>

        {renderSources(msg.sources || [])}
      </div>
    );
  }

  function handleInputChange(e) {
    setInput(e.target.value);
  }

  function handleInputKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="cgpt-chatspace-root">
      <div className="cgpt-chatspace-area">
        {messages.map(renderMessage)}

        {/* THINKING LOADER */}
        {isThinking && !isStreaming && (
          <div className="cgpt-chatspace-message cgpt-chatspace-bot thinking">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* INPUT */}
      <div className="cgpt-chatspace-input-container">
        <div className="cgpt-chatspace-input-wrapper">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            placeholder="Message Bot..."
            className="cgpt-chatspace-input"
            rows={1}
          />
          <button
            className="cgpt-chatspace-send-btn"
            onClick={sendMessage}
            disabled={isStreaming || isThinking}
          >
            {isStreaming || isThinking ? "⏹" : "➤"}
          </button>
        </div>
      </div>
    </div>
  );
}
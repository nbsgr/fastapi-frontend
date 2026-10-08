import { useState, useEffect } from "react";
import "./Dashboard.css";
import ChatSpace from "./ChatSpace";
import { callApi, getSession, setSession, BASE_URL } from "../api/api";

export default function Dashboard() {
  // Use useState for data that affects JSX rendering
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [fullname, setFullname] = useState("");

  // Plain variables for DOM-only stuff (sidebar, renaming)
  let sidebarOpen = true;
  let renamingId = null;
  let renameValue = "";

  function checkToken() {
    const token = getSession("token");
    if (!token) {
      logout();
      return;
    }

    callApi(
      "GET",
      `${BASE_URL}/users/me`,
      {},
      fullnameResponse,
      token
    );

    loadConversations();
  }

  function fullnameResponse(res) {
    if (!res || res.status !== 200) {
      logout();
      return;
    }
    setFullname(res.data);
  }

  function loadConversations() {
    const token = getSession("token");

    callApi(
      "GET",
      `${BASE_URL}/conversations/list`,
      {},
      function conversationsResponse(res) {
        if (res.status === 200) {
          const list = res.data || [];
          setConversations(list);

          if (list.length > 0) {
            setActiveConversationId(list[0].id);
          }
        }
      },
      token
    );
  }

  function logout() {
    setSession("token", "", -1);
    window.location.replace("/login");
  }

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
    const sidebar = document.querySelector(".cgpt-sidebar");
    if (sidebar) {
      if (sidebarOpen) {
        sidebar.classList.add("open");
        sidebar.classList.remove("closed");
      } else {
        sidebar.classList.add("closed");
        sidebar.classList.remove("open");
      }
    }
  }

  function createNewChat() {
    const token = getSession("token");

    callApi(
      "POST",
      `${BASE_URL}/conversations/create`,
      {},
      function newChatResponse(res) {
        if (res.status === 200) {
          loadConversations();
          setActiveConversationId(res.data.id);
        }
      },
      token
    );
  }

  function selectConversation(id) {
    setActiveConversationId(id);
  }

  function startRename(id, title) {
    renamingId = id;
    renameValue = title || "";
    renderConversations();
  }

  function handleRenameChange(event) {
    renameValue = event.target.value;
  }

  function saveRename(id) {
    const token = getSession("token");

    callApi(
      "PUT",
      `${BASE_URL}/conversations/rename/` + id,
      { title: renameValue },
      function renameResponse(res) {
        if (res.status === 200) {
          loadConversations();
        }
      },
      token
    );

    renamingId = null;
    renameValue = "";
    renderConversations();
  }

  function deleteConversation(id) {
    const token = getSession("token");

    callApi(
      "DELETE",
      `${BASE_URL}/conversations/` + id,
      {},
      function deleteResponse(res) {
        if (res.status === 200) {
          loadConversations();
        }
      },
      token
    );
  }

  function getActiveConversation() {
    return conversations.find(function findConv(c) {
      return c.id === activeConversationId;
    }) || null;
  }

  function renderConversations() {
    const threadList = document.querySelector(".cgpt-thread-list");
    if (!threadList) return;

    threadList.innerHTML = "";

    conversations.forEach(function renderConv(conv) {
      const threadItem = document.createElement("div");
      threadItem.className = "cgpt-thread-item";
      if (activeConversationId === conv.id) {
        threadItem.classList.add("active");
      }

      threadItem.onclick = function onClickThread() {
        selectConversation(conv.id);
      };

      if (renamingId === conv.id) {
        const renameInput = document.createElement("input");
        renameInput.className = "cgpt-rename-input";
        renameInput.value = renameValue;
        renameInput.onchange = handleRenameChange;
        renameInput.onblur = function onBlurRename() {
          saveRename(conv.id);
        };
        renameInput.onkeydown = function onKeyDownRename(event) {
          if (event.key === "Enter") {
            saveRename(conv.id);
          }
        };
        renameInput.autofocus = true;
        threadItem.appendChild(renameInput);
      } else {
        const titleSpan = document.createElement("span");
        titleSpan.className = "cgpt-thread-title";
        titleSpan.textContent = conv.title || "New chat";
        threadItem.appendChild(titleSpan);

        const actionsDiv = document.createElement("div");
        actionsDiv.className = "cgpt-thread-actions";

        const editSpan = document.createElement("span");
        editSpan.className = "cgpt-thread-dots";
        editSpan.textContent = "✏️";
        editSpan.onclick = function onClickEdit(event) {
          event.stopPropagation();
          startRename(conv.id, conv.title);
        };
        actionsDiv.appendChild(editSpan);

        const deleteSpan = document.createElement("span");
        deleteSpan.className = "cgpt-thread-delete";
        deleteSpan.textContent = "🗑️";
        deleteSpan.onclick = function onClickDelete(event) {
          event.stopPropagation();
          deleteConversation(conv.id);
        };
        actionsDiv.appendChild(deleteSpan);

        threadItem.appendChild(actionsDiv);
      }

      threadList.appendChild(threadItem);
    });
  }

  // Render conversations when they change
  useEffect(renderConversations, [conversations, activeConversationId]);

  useEffect(checkToken, []);

  const activeConversation = getActiveConversation();

  return (
    <div className="cgpt-dashboard-root">
      {/* HEADER */}
      <div className="cgpt-header">
        <div className="cgpt-header-left">
          <img src="https://i.pinimg.com/736x/4e/8a/ca/4e8aca3be544783cc75849e2183849c8.jpg" alt="logo" className="cgpt-logo" />
          <span className="cgpt-title">Bot</span>
        </div>

        <div className="cgpt-header-right">
          <span className="cgpt-username">{fullname}</span>
          <img
            className="cgpt-logout"
            onClick={logout}
            src="https://cdn-icons-png.flaticon.com/512/1828/1828490.png"
            alt="logout"
          />
        </div>
      </div>

      {/* BODY */}
      <div className="cgpt-body">
        {/* SIDEBAR */}
        <div className="cgpt-sidebar open">
          {/* TOGGLE BUTTON */}
          <button
            className="cgpt-sidebar-toggle sidebar-toggle-attached"
            onClick={toggleSidebar}
          >
            ☰
          </button>

          <button className="cgpt-newchat-btn" onClick={createNewChat}>
            + New chat
          </button>

          <div className="cgpt-thread-list"></div>
        </div>

        {/* CHAT - ChatSpace rendered as proper React component */}
        <div className="cgpt-main">
          {activeConversation ? (
            <ChatSpace
              key={activeConversation.id}
              conversation={activeConversation}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

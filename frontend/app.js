const API_URL = "/api/tasks";

let tasks = [];
let editingId = null;

const form = document.getElementById("taskForm");
const taskList = document.getElementById("taskList");
const message = document.getElementById("message");
const submitButton = document.getElementById("submitButton");
const cancelEditButton = document.getElementById("cancelEdit");

async function apiRequest(url, options = {}) {
  const token = localStorage.getItem("daymark_access_token");

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || `Request failed with status ${response.status}`
    );
  }

  return data;
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function showMessage(text, success = false) {
  message.textContent = text;
  message.classList.toggle("success", success);
}

function resetForm() {
  form.reset();
  editingId = null;

  document.querySelector(".task-form h2").textContent =
    "Add a New Task";

  submitButton.textContent = "+ Add Task";
  cancelEditButton.hidden = true;
}

async function loadTasks() {
  try {
    const data = await apiRequest(API_URL);
    tasks = Array.isArray(data.tasks) ? data.tasks : [];

    renderTasks();
    showMessage("");
  } catch (error) {
    showMessage(
      `${error.message}. Check that the backend is running and you are signed in.`
    );
  }
}

function renderTasks() {
  const search = document.getElementById("search")
    .value.trim().toLowerCase();

  const status = document.getElementById("statusFilter").value;
  const priority = document.getElementById("priorityFilter").value;

  const filteredTasks = tasks.filter(task => {
    const searchableText =
      `${task.title} ${task.description || ""}`.toLowerCase();

    const matchesSearch = searchableText.includes(search);

    const matchesStatus =
      status === "all" ||
      (status === "completed" && task.is_completed) ||
      (status === "pending" && !task.is_completed);

    const matchesPriority =
      priority === "all" || task.priority === priority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  taskList.innerHTML = filteredTasks.map(task => {
    const isOverdue =
      task.due_date &&
      task.due_date < new Date().toISOString().slice(0, 10) &&
      !task.is_completed;

    return `
      <article class="task-item ${task.is_completed ? "completed" : ""}">
        <input
          class="task-check"
          type="checkbox"
          data-action="toggle"
          data-id="${escapeHTML(task.id)}"
          aria-label="Mark ${escapeHTML(task.title)} as completed"
          ${task.is_completed ? "checked" : ""}
        >

        <div class="task-info">
          <h3>${escapeHTML(task.title)}</h3>

          ${
            task.description
              ? `<p>${escapeHTML(task.description)}</p>`
              : ""
          }

          <p>
            Priority:
            <span class="priority ${escapeHTML(task.priority)}">
              ${escapeHTML(task.priority)}
            </span>
          </p>

          <p class="${isOverdue ? "overdue" : ""}">
            Due: ${escapeHTML(task.due_date || "No due date")}
            ${isOverdue ? " — Overdue" : ""}
          </p>
        </div>

        <div class="task-actions">
          <button
            type="button"
            data-action="edit"
            data-id="${escapeHTML(task.id)}"
          >Edit</button>

          <button
            type="button"
            class="delete"
            data-action="delete"
            data-id="${escapeHTML(task.id)}"
          >Delete</button>
        </div>
      </article>
    `;
  }).join("");

  document.getElementById("emptyMessage").hidden =
    filteredTasks.length > 0;

  document.getElementById("totalTasks").textContent = tasks.length;

  document.getElementById("completedTasks").textContent =
    tasks.filter(task => task.is_completed).length;

  document.getElementById("pendingTasks").textContent =
    tasks.filter(task => !task.is_completed).length;
}

form.addEventListener("submit", async event => {
  event.preventDefault();

  const payload = {
    title: document.getElementById("title").value.trim(),
    description: document.getElementById("description").value.trim(),
    priority: document.getElementById("priority").value,
    due_date: document.getElementById("dueDate").value || null
  };

  if (!payload.title) {
    showMessage("Please enter a task title.");
    return;
  }

  submitButton.disabled = true;

  try {
    if (editingId !== null) {
      await apiRequest(
        `${API_URL}/${encodeURIComponent(editingId)}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload)
        }
      );

      showMessage("Task updated successfully.", true);
    } else {
      await apiRequest(API_URL, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      showMessage("Task added successfully.", true);
    }

    resetForm();
    await loadTasks();
  } catch (error) {
    showMessage(error.message);
  } finally {
    submitButton.disabled = false;
  }
});

cancelEditButton.addEventListener("click", () => {
  resetForm();
  showMessage("Editing cancelled.");
});

taskList.addEventListener("change", async event => {
  const checkbox = event.target.closest('[data-action="toggle"]');

  if (!checkbox) return;

  checkbox.disabled = true;

  try {
    await apiRequest(
      `${API_URL}/${encodeURIComponent(checkbox.dataset.id)}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          is_completed: checkbox.checked
        })
      }
    );

    showMessage("Task status updated.", true);
    await loadTasks();
  } catch (error) {
    showMessage(error.message);
    await loadTasks();
  }
});

taskList.addEventListener("click", async event => {
  const button = event.target.closest("button[data-action]");

  if (!button) return;

  const task = tasks.find(item =>
    String(item.id) === button.dataset.id
  );

  if (!task) return;

  if (button.dataset.action === "edit") {
    editingId = task.id;

    document.getElementById("title").value = task.title;
    document.getElementById("description").value =
      task.description || "";
    document.getElementById("priority").value = task.priority;
    document.getElementById("dueDate").value = task.due_date || "";

    document.querySelector(".task-form h2").textContent = "Edit Task";
    submitButton.textContent = "Save Changes";
    cancelEditButton.hidden = false;

    showMessage("Update the task details and save.", true);

    document.querySelector(".task-form").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  if (button.dataset.action === "delete") {
    if (!confirm(`Are you sure you want to delete "${task.title}"?`)) {
      return;
    }

    button.disabled = true;

    try {
      await apiRequest(
        `${API_URL}/${encodeURIComponent(task.id)}`,
        { method: "DELETE" }
      );

      showMessage("Task deleted successfully.", true);
      await loadTasks();
    } catch (error) {
      showMessage(error.message);
    } finally {
      button.disabled = false;
    }
  }
});

document.getElementById("search")
  .addEventListener("input", renderTasks);

document.getElementById("statusFilter")
  .addEventListener("change", renderTasks);

document.getElementById("priorityFilter")
  .addEventListener("change", renderTasks);

// Load tasks from the backend when the page opens.
loadTasks();
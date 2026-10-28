
const ALLOWED_PRIORITIES = ["low", "medium", "high"];

function isValidDate(value) {
  if (typeof value !== "string") return false;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function validateTask(body, partial = false) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Request body must be a JSON object.";
  }

  const allowedFields = [
    "title",
    "description",
    "priority",
    "due_date",
    "is_completed"
  ];

  const unknownFields = Object.keys(body).filter(
    key => !allowedFields.includes(key)
  );

  if (unknownFields.length > 0) {
    return `Unsupported field: ${unknownFields[0]}.`;
  }

  if (partial && Object.keys(body).length === 0) {
    return "Provide at least one field to update.";
  }

  if (!partial && typeof body.title !== "string") {
    return "Task title is required.";
  }

  if (Object.hasOwn(body, "title")) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return "Task title cannot be empty.";
    }

    if (body.title.trim().length > 120) {
      return "Task title must not exceed 120 characters.";
    }
  }

  if (Object.hasOwn(body, "description")) {
    if (
      body.description !== null &&
      typeof body.description !== "string"
    ) {
      return "Description must be text or null.";
    }

    if (
      typeof body.description === "string" &&
      body.description.length > 1000
    ) {
      return "Description must not exceed 1000 characters.";
    }
  }

  if (Object.hasOwn(body, "priority")) {
    if (!ALLOWED_PRIORITIES.includes(body.priority)) {
      return "Priority must be low, medium, or high.";
    }
  }

  if (Object.hasOwn(body, "due_date")) {
    if (
      body.due_date !== null &&
      body.due_date !== "" &&
      !isValidDate(body.due_date)
    ) {
      return "Due date must be a valid YYYY-MM-DD date or null.";
    }
  }

  if (Object.hasOwn(body, "is_completed")) {
    if (typeof body.is_completed !== "boolean") {
      return "is_completed must be true or false.";
    }
  }

  return null;
}

function normalizeTask(body) {
  const task = {};

  if (Object.hasOwn(body, "title")) {
    task.title = body.title.trim();
  }

  if (Object.hasOwn(body, "description")) {
    task.description =
      typeof body.description === "string"
        ? body.description.trim() || null
        : null;
  }

  if (Object.hasOwn(body, "priority")) {
    task.priority = body.priority;
  }

  if (Object.hasOwn(body, "due_date")) {
    task.due_date = body.due_date || null;
  }

  if (Object.hasOwn(body, "is_completed")) {
    task.is_completed = body.is_completed;
  }

  return task;
}

module.exports = {
  validateTask,
  normalizeTask
};

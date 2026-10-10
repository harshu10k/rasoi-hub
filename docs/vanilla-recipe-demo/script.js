const ingredientList = document.querySelector("#ingredients");
const stepList = document.querySelector("#steps");
const form = document.querySelector("#recipe-form");
const errorMessage = document.querySelector("#error");
const preview = document.querySelector("#preview");

function addRow(list, placeholder) {
  const row = document.createElement("div");
  row.className = "list-row";
  row.innerHTML = `<input required placeholder="${placeholder}"><button type="button" aria-label="Remove row">×</button>`;
  row.querySelector("button").addEventListener("click", () => row.remove());
  list.append(row);
}

document.querySelector("#add-ingredient").addEventListener("click", () => addRow(ingredientList, "2 cups flour"));
document.querySelector("#add-step").addEventListener("click", () => addRow(stepList, "Mix everything together"));
addRow(ingredientList, "2 cups flour");
addRow(stepList, "Mix everything together");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  errorMessage.textContent = "";
  const title = document.querySelector("#title").value.trim();
  const ingredients = [...ingredientList.querySelectorAll("input")].map((input) => input.value.trim()).filter(Boolean);
  const steps = [...stepList.querySelectorAll("input")].map((input) => input.value.trim()).filter(Boolean);
  if (!title || !ingredients.length || !steps.length) {
    errorMessage.textContent = "Title, ingredients aur steps fill karein.";
    return;
  }
  preview.hidden = false;
  preview.innerHTML = `<strong>${title}</strong><br>${ingredients.length} ingredients, ${steps.length} steps. Real app mein yahi data Supabase ko submit hota hai.`;
});
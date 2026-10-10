# Rasoi Hub: HTML, CSS aur JavaScript guide

Rasoi Hub ka production UI Next.js mein bana hai:

- JSX/TSX, HTML jaisa markup hota hai.
- Tailwind classes, CSS styling ka kaam karti hain.
- React state and event handlers, JavaScript ka kaam karte hain.
- Upload form ka real code `components/upload-form.tsx` mein hai.

Plain browser version samajhne ke liye `docs/vanilla-recipe-demo/` open karein. Is demo ko run karne ke liye `index.html` par double-click karein. Isme recipe title, ingredients aur steps add/remove karna hai, lekin Supabase upload nahi hai.

## Quick mapping

| Plain web | Rasoi Hub app |
| --- | --- |
| `<input>` | JSX `<input />` |
| `class="..."` | `className="..."` |
| `onclick` | `onClick` |
| `document.querySelector` | React state and props |
| `styles.css` | Tailwind classes plus `app/globals.css` |
| `fetch()` / form submit | Supabase client in `upload-form.tsx` |
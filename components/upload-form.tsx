"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { categories } from "@/lib/types";

function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) return reject(new Error("Your browser cannot process this image."));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not process this image.")), "image/jpeg", 0.85);
    };
    image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Please choose a valid JPG, PNG or WebP image.")); };
    image.src = objectUrl;
  });
}

export function UploadForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [veg, setVeg] = useState(true);
  const [hostelFriendly, setHostelFriendly] = useState(false);
  const [time, setTime] = useState("30");
  const [servings, setServings] = useState("2");
  const [ingredients, setIngredients] = useState([""]);
  const [steps, setSteps] = useState([""]);
  const [file, setFile] = useState<File>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!title.trim() || ingredients.some((item) => !item.trim()) || steps.some((item) => !item.trim()) || Number(time) < 1 || Number(servings) < 1) {
      setError("Fill every field before sharing your recipe.");
      return;
    }
    if (!hasSupabaseEnv) {
      setError("Add Supabase keys to .env.local to publish recipes.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { router.push("/login"); return; }
      let imageUrl = "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=85";
      if (file) {
        if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) throw new Error("Choose an image under 10 MB.");
        const blob = await resizeImage(file);
        const path = `${auth.user.id}/${crypto.randomUUID()}.jpg`;
        const upload = await supabase.storage.from("recipe-images").upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (upload.error) throw new Error(upload.error.message);
        imageUrl = supabase.storage.from("recipe-images").getPublicUrl(path).data.publicUrl;
      }
      const { error: insertError } = await supabase.from("recipes").insert({
        title: title.trim(), description: description.trim() || null, category, is_veg: veg, is_hostel_friendly: hostelFriendly,
        cooking_time: Number(time), servings: Number(servings),
        ingredients: ingredients.map((item) => item.trim()).filter(Boolean),
        steps: steps.map((item) => item.trim()).filter(Boolean), image_url: imageUrl, author_id: auth.user.id,
      });
      if (insertError) throw new Error(insertError.message);
      router.push("/my-recipes");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Something went wrong. Please try again.");
    } finally { setLoading(false); }
  }

  return <form onSubmit={submit} className="grid gap-7 rounded-3xl border border-[#eadfd2] bg-white p-6 shadow-xl shadow-[#5b361f]/5 sm:p-8">
    <div><p className="step-kicker">01 · The idea</p><h2 className="mt-1 font-serif text-2xl font-bold text-[#39241b]">Start with the story</h2><p className="mt-1 text-sm text-[#927b6d]">A clear title and a short note help people decide what to cook.</p></div>
    <label className="grid gap-2 text-sm font-bold text-[#765f51]">Recipe title<input required value={title} onChange={(event) => setTitle(event.target.value)} className="field" placeholder="e.g. Aloo paratha just like nani makes" /></label>
    <label className="grid gap-2 text-sm font-bold text-[#765f51]">Short description <span className="font-normal text-[#a99587]">(optional)</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={280} rows={3} className="field resize-y" placeholder="Tell us what makes this dish special, its flavour, or when your family makes it." /></label>
    <div><p className="step-kicker">02 · The quick card</p><h2 className="mt-1 font-serif text-2xl font-bold text-[#39241b]">Make the details scannable</h2></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-2 text-sm font-bold text-[#765f51]">Category<select value={category} onChange={(event) => setCategory(event.target.value as typeof category)} className="field">{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="grid gap-2 text-sm font-bold text-[#765f51]">Cooking time (minutes)<input required type="number" min="1" max="1440" value={time} onChange={(event) => setTime(event.target.value)} className="field" /></label>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="grid gap-2 text-sm font-bold text-[#765f51]">Servings<input required type="number" min="1" max="50" value={servings} onChange={(event) => setServings(event.target.value)} className="field" /></label>
      <label className="grid gap-2 text-sm font-bold text-[#765f51]">Diet<select value={veg ? "veg" : "non-veg"} onChange={(event) => setVeg(event.target.value === "veg")} className="field"><option value="veg">Veg</option><option value="non-veg">Non-veg</option></select></label>
    </div>
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#eadfd2] bg-[#fffaf4] p-3 text-sm font-bold text-[#765f51]"><input type="checkbox" checked={hostelFriendly} onChange={(event) => setHostelFriendly(event.target.checked)} className="h-4 w-4 accent-[#ff920d]" /> Hostel students ke liye suitable recipe</label>
    <div><p className="step-kicker">03 · The visual</p><h2 className="mt-1 font-serif text-2xl font-bold text-[#39241b]">Show the finished dish</h2></div>
    <label className="grid gap-2 text-sm font-bold text-[#765f51]">Photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0])} className="field file:mr-3 file:rounded-lg file:border-0 file:bg-[#fff0e8] file:px-3 file:py-2 file:font-bold file:text-[#c8501e]" /></label>
    <div><p className="step-kicker">04 · The recipe card</p><h2 className="mt-1 font-serif text-2xl font-bold text-[#39241b]">Build it line by line</h2><p className="mt-1 text-sm text-[#927b6d]">One ingredient or action per row keeps the final recipe easy to follow.</p></div>
    <ListEditor label="Ingredients" values={ingredients} setValues={setIngredients} placeholder="2 cups basmati rice" />
    <ListEditor label="Steps" values={steps} setValues={setSteps} placeholder="Toast the spices until fragrant" />
    {error && <p role="alert" className="rounded-xl bg-[#fff0e8] px-4 py-3 text-sm text-[#b33f20]">{error}</p>}
    <button disabled={loading} className="rounded-xl bg-[#c8501e] px-5 py-3 font-bold text-white disabled:opacity-60">{loading ? "Sharing your recipe..." : "Share recipe"}</button>
  </form>;
}

function ListEditor({ label, values, setValues, placeholder }: { label: string; values: string[]; setValues: (values: string[]) => void; placeholder: string }) {
  return <fieldset className="grid gap-3"><legend className="text-sm font-bold text-[#765f51]">{label}</legend>{values.map((value, index) => <div className="flex gap-2" key={`${label}-${index}`}><span className="grid h-11 w-8 place-items-center text-sm text-[#c8501e]">{index + 1}</span><input required value={value} onChange={(event) => setValues(values.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} className="field flex-1" placeholder={placeholder} />{values.length > 1 && <button type="button" aria-label={`Remove ${label.toLowerCase()} ${index + 1}`} onClick={() => setValues(values.filter((_, itemIndex) => itemIndex !== index))} className="px-2 text-xl text-[#a99587]">×</button>}</div>)}<button type="button" onClick={() => setValues([...values, ""])} className="w-fit text-sm font-bold text-[#c8501e]">+ Add another</button></fieldset>;
}
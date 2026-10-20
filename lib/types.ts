export const categories = ["Breakfast", "Sabzi", "Dal & Rice", "Roti & Paratha", "Snacks", "Non-Veg", "Sweets", "Drinks"] as const;
export type Category = (typeof categories)[number];

export type Recipe = {
  id: string;
  title: string;
  slug?: string;
  category: Category;
  is_veg: boolean;
  is_hostel_friendly?: boolean;
  cooking_time: number;
  servings: number;
  image_url: string;
  ingredients: string[];
  steps: string[];
  description?: string;
  author_id?: string;
  author_name: string;
  author_avatar?: string;
  rating?: number;
  rating_count?: number;
  created_at?: string;
};

export const sampleRecipes: Recipe[] = [
  { id: "00000000-0000-4000-8000-000000000001", title: "Dilli Wali Butter Chicken", category: "Non-Veg", is_veg: false, cooking_time: 45, servings: 4, image_url: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=900&q=85", ingredients: ["500g chicken", "2 tbsp butter", "1 cup tomato puree", "1/2 cup cream", "Garam masala"], steps: ["Marinate chicken with spices for 30 minutes.", "Sear until golden and set aside.", "Cook tomato puree with butter and spices.", "Fold chicken and cream into the gravy."], description: "Silky, smoky and deeply comforting, this restaurant-style classic is made for sharing.", author_name: "Meera Kapoor", rating: 4.9, rating_count: 128 },
  { id: "00000000-0000-4000-8000-000000000002", title: "Amritsari Chole Kulche", category: "Breakfast", is_veg: true, is_hostel_friendly: true, cooking_time: 35, servings: 3, image_url: "https://images.unsplash.com/photo-1626132647523-66f5bf380027?auto=format&fit=crop&w=900&q=85", ingredients: ["2 cups chickpeas", "2 onions", "2 tomatoes", "Kulcha", "Chole masala"], steps: ["Soak chickpeas overnight and pressure cook.", "Make a spiced onion tomato masala.", "Simmer chickpeas until thick.", "Serve hot with toasted kulcha."], description: "The kind of Sunday breakfast that makes the whole home smell wonderful.", author_name: "Arjun Batra", rating: 4.8, rating_count: 94 },
  { id: "00000000-0000-4000-8000-000000000003", title: "Palak Paneer, Dhaba Style", category: "Sabzi", is_veg: true, is_hostel_friendly: true, cooking_time: 30, servings: 4, image_url: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?auto=format&fit=crop&w=900&q=85", ingredients: ["500g spinach", "250g paneer", "1 onion", "Ginger garlic", "Fresh cream"], steps: ["Blanch spinach and blend smooth.", "Saute aromatics until golden.", "Add spinach puree and season.", "Fold in paneer and finish with cream."], description: "Velvety greens, pillowy paneer and a smoky tadka at the end.", author_name: "Nisha Sharma", rating: 4.7, rating_count: 76 },
  { id: "00000000-0000-4000-8000-000000000004", title: "Mango Shrikhand", category: "Sweets", is_veg: true, cooking_time: 15, servings: 4, image_url: "https://images.unsplash.com/photo-1703763253190-4af44c87a23e?auto=format&fit=crop&w=900&q=85", ingredients: ["2 cups hung curd", "1 cup mango pulp", "4 tbsp powdered sugar", "Cardamom", "Pistachios"], steps: ["Whisk hung curd until creamy.", "Fold in mango pulp and sugar.", "Chill for two hours.", "Garnish with cardamom and pistachios."], description: "A bright, cool dessert for the warmest afternoons.", author_name: "Rhea Malhotra", rating: 4.9, rating_count: 61 },
];
import { Header } from "@/components/header";
import { AuthForm } from "@/components/auth-form";

export default function CreatorLoginPage() {
  return (
    <>
      <Header />
      <main className="mx-auto grid min-h-[calc(100vh-72px)] max-w-md content-center px-5 py-12">
        <div className="rounded-3xl border border-[#eadfd2] bg-white p-7 shadow-xl shadow-[#5b361f]/5">
          <p className="mb-2 text-sm font-bold uppercase tracking-[.18em] text-[#c8501e]">Creator Rasoi</p>
          <h1 className="mb-3 font-serif text-4xl font-bold text-[#39241b]">Welcome back, creator.</h1>
          <p className="mb-7 text-sm leading-6 text-[#765f51]">Use your separate creator account to manage and publish recipes.</p>
          <AuthForm mode="login" accountType="creator" />
        </div>
      </main>
    </>
  );
}
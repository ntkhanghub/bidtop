import { LoginForm } from "./login-form";

export default function AdminLoginPage() {
  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <h1 className="text-2xl font-bold text-foreground">Đăng nhập admin</h1>
      <LoginForm />
    </main>
  );
}

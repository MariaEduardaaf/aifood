"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Card,
  CardContent,
  Badge,
  Input,
  Label,
  Select,
} from "@/components/ui";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  Copy,
  Check,
  Key,
} from "lucide-react";
import type { Role } from "@prisma/client";

interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  created_at: string;
  _count?: {
    resolved_calls: number;
  };
}

interface UsersManagerProps {
  currentUserId: string;
}

export function UsersManager({ currentUserId }: UsersManagerProps) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const tAuth = useTranslations("auth");

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "WAITER" as Role,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(
    null,
  );
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [resettingPasswordId, setResettingPasswordId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/usuarios");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({ name: "", email: "", password: "", role: "WAITER" });
    setError("");
    setShowPassword(false);
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
    });
    setError("");
    setShowPassword(false);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({ name: "", email: "", password: "", role: "WAITER" });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim()) {
      setError("Nome e email são obrigatórios");
      return;
    }

    if (!editingUser && !formData.password) {
      setError("Senha é obrigatória para novos usuários");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const url = editingUser
        ? `/api/usuarios/${editingUser.id}`
        : "/api/usuarios";
      const method = editingUser ? "PATCH" : "POST";

      const payload: Record<string, string> = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchUsers();
        closeModal();
      } else {
        const data = await res.json();
        setError(data.error || "Erro ao salvar");
      }
    } catch (err) {
      setError("Erro ao salvar usuário");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (user.id === currentUserId) {
      alert("Não é possível excluir o próprio usuário");
      return;
    }

    if (!confirm(t("confirmDelete"))) return;

    try {
      const res = await fetch(`/api/usuarios/${user.id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao excluir");
      }
    } catch (err) {
      console.error("Error deleting user:", err);
    }
  };

  const toggleActive = async (user: User) => {
    try {
      const res = await fetch(`/api/usuarios/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !user.active }),
      });
      if (res.ok) {
        await fetchUsers();
      }
    } catch (err) {
      console.error("Error toggling user active status:", err);
    }
  };

  // Generate random password
  const generatePassword = () => {
    const chars =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let password = "";
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Reset password for a user
  const handleResetPassword = async (user: User) => {
    const newPassword = generatePassword();
    setResettingPasswordId(user.id);

    try {
      const res = await fetch(`/api/usuarios/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });

      if (res.ok) {
        setGeneratedPassword(newPassword);
        setCopiedPassword(false);
      } else {
        alert("Erro ao resetar senha");
      }
    } catch (err) {
      console.error("Error resetting password:", err);
      alert("Erro ao resetar senha");
    } finally {
      setResettingPasswordId(null);
    }
  };

  // Copy password to clipboard
  const copyPassword = async () => {
    if (generatedPassword) {
      await navigator.clipboard.writeText(generatedPassword);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  const getRoleLabel = (role: Role) => {
    switch (role) {
      case "WAITER":
        return t("roleWaiter");
      case "ADMIN":
        return t("roleAdmin");
      case "MANAGER":
        return t("roleManager");
      default:
        return role;
    }
  };

  const getRoleVariant = (role: Role) => {
    switch (role) {
      case "ADMIN":
        return "destructive" as const;
      case "MANAGER":
        return "warning" as const;
      default:
        return "secondary" as const;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("users")}</h1>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          {t("newUser")}
        </Button>
      </div>

      {users.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>{tCommon("noResults")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        {user.name}
                        {user.id === currentUserId && (
                          <span className="text-xs text-muted-foreground">
                            (você)
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                    <Badge variant={getRoleVariant(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                    <Badge
                      variant={user.active ? "success" : "secondary"}
                      className="cursor-pointer"
                      onClick={() =>
                        user.id !== currentUserId && toggleActive(user)
                      }
                    >
                      {user.active ? t("active") : t("inactive")}
                    </Badge>
                    {user._count && user._count.resolved_calls > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {user._count.resolved_calls} chamado(s) resolvido(s)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(user)}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetPassword(user)}
                      disabled={resettingPasswordId === user.id}
                      title="Gerar Nova Senha"
                    >
                      {resettingPasswordId === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Key className="h-4 w-4" />
                      )}
                    </Button>
                    {user.id !== currentUserId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(user)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Senha Gerada */}
      {generatedPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-sm mx-4">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <Check className="h-6 w-6 text-green-500" />
                </div>
                <h2 className="text-lg font-semibold mb-2">
                  Nova Senha Gerada!
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Copie a senha abaixo e passe para o usuário:
                </p>
                <div className="flex items-center gap-2 p-3 bg-secondary rounded-lg mb-4">
                  <code className="flex-1 text-lg font-mono font-bold text-primary">
                    {generatedPassword}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyPassword}
                    className="shrink-0"
                  >
                    {copiedPassword ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {copiedPassword && (
                  <p className="text-sm text-green-500 mb-4">Copiado!</p>
                )}
                <Button
                  onClick={() => setGeneratedPassword(null)}
                  className="w-full"
                >
                  Fechar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Criar/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  {editingUser ? tCommon("edit") : tCommon("create")}{" "}
                  {t("users")}
                </h2>
                <Button variant="ghost" size="icon" onClick={closeModal}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("userName")}</Label>
                  <Input
                    id="name"
                    placeholder="Nome completo"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t("userEmail")}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    disabled={saving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">
                    {t("userPassword")}
                    {editingUser && (
                      <span className="text-muted-foreground text-xs ml-2">
                        (deixe vazio para manter)
                      </span>
                    )}
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      disabled={saving}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">{t("userRole")}</Label>
                  <Select
                    id="role"
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value as Role })
                    }
                    disabled={saving}
                  >
                    <option value="WAITER">{t("roleWaiter")}</option>
                    <option value="ADMIN">{t("roleAdmin")}</option>
                    <option value="MANAGER">{t("roleManager")}</option>
                  </Select>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeModal}
                    disabled={saving}
                  >
                    {tCommon("cancel")}
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {tCommon("save")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

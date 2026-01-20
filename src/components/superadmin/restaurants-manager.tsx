"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, X } from "lucide-react";
import { Button, Card, CardContent, Input, Label, Badge } from "@/components/ui";

interface Restaurant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  active: boolean;
  created_at: string;
}

export function RestaurantsManager() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    domain: "",
    active: true,
  });

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const res = await fetch("/api/restaurantes");
      if (res.ok) {
        const data = await res.json();
        setRestaurants(data);
      }
    } catch (err) {
      console.error("Error fetching restaurants:", err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingRestaurant(null);
    setFormData({ name: "", slug: "", domain: "", active: true });
    setError("");
    setShowModal(true);
  };

  const openEditModal = (restaurant: Restaurant) => {
    setEditingRestaurant(restaurant);
    setFormData({
      name: restaurant.name,
      slug: restaurant.slug,
      domain: restaurant.domain ?? "",
      active: restaurant.active,
    });
    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRestaurant(null);
    setFormData({ name: "", slug: "", domain: "", active: true });
    setError("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.name.trim() || !formData.slug.trim()) {
      setError("Nome e slug sao obrigatorios");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const url = editingRestaurant
        ? `/api/restaurantes/${editingRestaurant.id}`
        : "/api/restaurantes";
      const method = editingRestaurant ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          slug: formData.slug.trim(),
          domain: formData.domain.trim() || null,
          active: formData.active,
        }),
      });

      if (res.ok) {
        await fetchRestaurants();
        closeModal();
      } else {
        const data = await res.json();
        setError(data.error || "Erro ao salvar");
      }
    } catch (err) {
      setError("Erro ao salvar restaurante");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (restaurant: Restaurant) => {
    if (!confirm("Tem certeza? Isso remove todos os dados vinculados.")) return;

    try {
      const res = await fetch(`/api/restaurantes/${restaurant.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchRestaurants();
      } else {
        const data = await res.json();
        alert(data.error || "Erro ao excluir");
      }
    } catch (err) {
      console.error("Error deleting restaurant:", err);
    }
  };

  const toggleActive = async (restaurant: Restaurant) => {
    try {
      const res = await fetch(`/api/restaurantes/${restaurant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !restaurant.active }),
      });
      if (res.ok) {
        await fetchRestaurants();
      }
    } catch (err) {
      console.error("Error updating restaurant:", err);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Restaurantes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Controle a base de restaurantes do sistema.
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          Novo restaurante
        </Button>
      </div>

      {restaurants.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum restaurante cadastrado.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {restaurants.map((restaurant) => (
            <Card key={restaurant.id}>
              <CardContent className="py-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{restaurant.name}</h3>
                      <Badge variant={restaurant.active ? "default" : "secondary"}>
                        {restaurant.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Slug: {restaurant.slug}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Dominio: {restaurant.domain || "-"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleActive(restaurant)}
                    >
                      {restaurant.active ? "Desativar" : "Ativar"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(restaurant)}
                    >
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(restaurant)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingRestaurant ? "Editar restaurante" : "Novo restaurante"}
              </h2>
              <button
                onClick={closeModal}
                className="p-1 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(event) =>
                    setFormData({ ...formData, name: event.target.value })
                  }
                  placeholder="Ex: Bistro Central"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(event) =>
                    setFormData({ ...formData, slug: event.target.value })
                  }
                  placeholder="ex: bistro-central"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="domain">Dominio (opcional)</Label>
                <Input
                  id="domain"
                  value={formData.domain}
                  onChange={(event) =>
                    setFormData({ ...formData, domain: event.target.value })
                  }
                  placeholder="bistro.com"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="active"
                  type="checkbox"
                  checked={formData.active}
                  onChange={(event) =>
                    setFormData({ ...formData, active: event.target.checked })
                  }
                />
                <Label htmlFor="active">Ativo</Label>
              </div>

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeModal}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

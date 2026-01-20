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
} from "@/components/ui";
import {
  Plus,
  QrCode,
  Pencil,
  Trash2,
  X,
  Download,
  Loader2,
} from "lucide-react";

interface Table {
  id: string;
  label: string;
  qr_token: string;
  active: boolean;
  created_at: string;
  _count?: {
    calls: number;
  };
}

interface QRCodeData {
  qrCode: string;
  url: string;
  label: string;
}

interface TablesManagerProps {
  restaurantId?: string;
}

export function TablesManager({ restaurantId }: TablesManagerProps) {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");

  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [qrData, setQrData] = useState<QRCodeData | null>(null);
  const [formLabel, setFormLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTables();
  }, [restaurantId]);

  const fetchTables = async () => {
    try {
      const query = restaurantId ? `?restaurantId=${restaurantId}` : "";
      const res = await fetch(`/api/mesas${query}`);
      if (res.ok) {
        const data = await res.json();
        setTables(data);
      }
    } catch (err) {
      console.error("Error fetching tables:", err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingTable(null);
    setFormLabel("");
    setError("");
    setShowModal(true);
  };

  const openEditModal = (table: Table) => {
    setEditingTable(table);
    setFormLabel(table.label);
    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTable(null);
    setFormLabel("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLabel.trim()) {
      setError("Nome da mesa é obrigatório");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const url = editingTable ? `/api/mesas/${editingTable.id}` : "/api/mesas";
      const method = editingTable ? "PATCH" : "POST";

      const payload = editingTable
        ? { label: formLabel.trim() }
        : {
            label: formLabel.trim(),
            ...(restaurantId ? { restaurantId } : {}),
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchTables();
        closeModal();
      } else {
        const data = await res.json();
        setError(data.error || "Erro ao salvar");
      }
    } catch (err) {
      setError("Erro ao salvar mesa");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (table: Table) => {
    if (!confirm(t("confirmDelete"))) return;

    try {
      const res = await fetch(`/api/mesas/${table.id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchTables();
      }
    } catch (err) {
      console.error("Error deleting table:", err);
    }
  };

  const showQRCode = async (table: Table) => {
    try {
      const res = await fetch(`/api/mesas/${table.id}/qrcode`);
      if (res.ok) {
        const data = await res.json();
        setQrData(data);
        setShowQRModal(true);
      }
    } catch (err) {
      console.error("Error fetching QR code:", err);
    }
  };

  const downloadQRCode = () => {
    if (!qrData) return;

    const link = document.createElement("a");
    link.download = `qrcode-${qrData.label.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.href = qrData.qrCode;
    link.click();
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
        <h1 className="text-2xl font-bold">{t("tables")}</h1>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          {t("newTable")}
        </Button>
      </div>

      {tables.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>{tCommon("noResults")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tables.map((table) => (
            <Card key={table.id}>
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{table.label}</h3>
                      <p className="text-sm text-muted-foreground">
                        Token: {table.qr_token.substring(0, 8)}...
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {table._count && table._count.calls > 0 && (
                        <Badge variant="warning">
                          {table._count.calls} chamado(s)
                        </Badge>
                      )}
                      <Badge variant={table.active ? "success" : "secondary"}>
                        {table.active ? t("active") : t("inactive")}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => showQRCode(table)}
                      className="min-h-[44px]"
                    >
                      <QrCode className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">{t("qrCode")}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(table)}
                      className="min-w-[44px] min-h-[44px]"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(table)}
                      className="min-w-[44px] min-h-[44px]"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Criar/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  {editingTable ? tCommon("edit") : tCommon("create")}{" "}
                  {t("tables")}
                </h2>
                <Button variant="ghost" size="icon" onClick={closeModal}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="label">{t("tableLabel")}</Label>
                  <Input
                    id="label"
                    placeholder={t("tablePlaceholder")}
                    value={formLabel}
                    onChange={(e) => setFormLabel(e.target.value)}
                    disabled={saving}
                  />
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

      {/* Modal QR Code */}
      {showQRModal && qrData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-sm mx-4">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">{qrData.label}</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowQRModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-col items-center space-y-4">
                <img
                  src={qrData.qrCode}
                  alt={`QR Code - ${qrData.label}`}
                  className="w-48 h-48 sm:w-64 sm:h-64 border rounded-lg"
                />
                <p className="text-sm text-muted-foreground text-center break-all">
                  {qrData.url}
                </p>
                <Button onClick={downloadQRCode} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  {t("downloadQR")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

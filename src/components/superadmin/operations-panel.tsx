"use client";

import { useEffect, useState } from "react";
import { Loader2, Clock, Bell, Receipt } from "lucide-react";
import { Button, Card, CardContent, Badge } from "@/components/ui";
import { formatTime, getUrgencyClass } from "@/lib/utils";

interface Call {
  id: string;
  type: "CALL_WAITER" | "REQUEST_BILL";
  status: "OPEN" | "RESOLVED";
  created_at: string;
  table: {
    id: string;
    label: string;
  };
  resolver: {
    id: string;
    name: string;
  } | null;
}

interface Order {
  id: string;
  status: "PENDING" | "CONFIRMED" | "READY" | "DELIVERED" | "CANCELLED";
  total: number;
  created_at: string;
  table: {
    id: string;
    label: string;
  };
}

interface OperationsPanelProps {
  restaurantId: string;
}

export function OperationsPanel({ restaurantId }: OperationsPanelProps) {
  const [calls, setCalls] = useState<Call[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<"calls" | "orders">("calls");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [restaurantId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [callsRes, ordersRes] = await Promise.all([
        fetch(`/api/chamados?status=OPEN&restaurantId=${restaurantId}`),
        fetch(`/api/pedidos?restaurantId=${restaurantId}`),
      ]);

      if (callsRes.ok) {
        const callsData = await callsRes.json();
        setCalls(callsData);
      }
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData);
      }
    } catch (err) {
      console.error("Error fetching operations data:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Operacao</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Acompanhe chamados e pedidos ativos.
          </p>
        </div>
        <Button variant="outline" onClick={fetchData}>
          Atualizar
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={activeTab === "calls" ? "default" : "outline"}
          onClick={() => setActiveTab("calls")}
        >
          <Bell className="h-4 w-4 mr-2" />
          Chamados ({calls.length})
        </Button>
        <Button
          variant={activeTab === "orders" ? "default" : "outline"}
          onClick={() => setActiveTab("orders")}
        >
          <Receipt className="h-4 w-4 mr-2" />
          Pedidos ({orders.length})
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : activeTab === "calls" ? (
        calls.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhum chamado ativo.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {calls.map((call) => {
              const elapsedSeconds = Math.floor(
                (Date.now() - new Date(call.created_at).getTime()) / 1000,
              );

              return (
                <Card key={call.id} className={getUrgencyClass(elapsedSeconds)}>
                  <CardContent className="py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{call.table.label}</h3>
                          <Badge variant="outline">
                            {call.type === "CALL_WAITER"
                              ? "Chamar garcom"
                              : "Pedir conta"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Aberto ha {formatTime(elapsedSeconds)}
                        </p>
                        {call.resolver && (
                          <p className="text-xs text-muted-foreground">
                            Resolvido por: {call.resolver.name}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {new Date(call.created_at).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum pedido ativo.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardContent className="py-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{order.table.label}</h3>
                      <Badge variant="outline">{order.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Total:{" "}
                      {order.total.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    {new Date(order.created_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

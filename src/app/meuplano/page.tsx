"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

// utils
const money = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtGB = (n: number) => `${n} GB`;
const fmtDate = (date: Date) => date.toLocaleDateString("pt-BR");

// Máscaras
const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3").substring(0, 14);
  }
  return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3").substring(0, 15);
};

const formatCPF = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  return numbers
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})/, "$1-$2")
    .substring(0, 14);
};

const formatCNPJ = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  return numbers
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .substring(0, 18);
};

// Lista de códigos de país
const countryCodes = [
  { code: "+55", country: "Brasil", flag: "🇧🇷" },
  { code: "+1", country: "EUA", flag: "🇺🇸" },
  { code: "+54", country: "Argentina", flag: "🇦🇷" },
  { code: "+56", country: "Chile", flag: "🇨🇱" },
  { code: "+57", country: "Colômbia", flag: "🇨🇴" },
  { code: "+58", country: "Venezuela", flag: "🇻🇪" },
  { code: "+51", country: "Peru", flag: "🇵🇪" },
  { code: "+598", country: "Uruguai", flag: "🇺🇾" },
  { code: "+595", country: "Paraguai", flag: "🇵🇾" },
  { code: "+52", country: "México", flag: "🇲🇽" },
  { code: "+351", country: "Portugal", flag: "🇵🇹" },
  { code: "+34", country: "Espanha", flag: "🇪🇸" },
  { code: "+33", country: "França", flag: "🇫🇷" },
  { code: "+49", country: "Alemanha", flag: "🇩🇪" },
  { code: "+39", country: "Itália", flag: "🇮🇹" },
  { code: "+44", country: "Reino Unido", flag: "🇬🇧" },
];

interface Channel {
  id: string;
  phone: string;
  label: string;
  created_at: number;
  ia: boolean;
  status: string;
  is_billable: boolean;
}

interface Seat {
  id: string;
  collaborator?: string;
  collaboratorCpf?: string;
  status: string;
  is_included: boolean;
}

interface Plan {
  periodicidade: "mensal" | "trimestral" | "anual";
  included_whatsapp_slots: number;
  included_birdid_seats: number;
  included_storage_gb: number;
  next_billing_date: Date;
  pending_change?: {
    new_periodicidade: "mensal" | "trimestral" | "anual";
    effective_date: Date;
  };
}

interface Coupon {
  code: string;
  percentOff: number;
}

interface Customer {
  name: string;
  email: string;
  phone: string;
  countryCode: string;
  company?: string;
  documentType: "cpf" | "cnpj";
  document?: string;
}

interface PaymentMethod {
  id: string;
  type: "card" | "boleto";
  last4?: string;
  brand?: string;
  isDefault: boolean;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  type: "plan" | "whatsapp" | "ia" | "birdid" | "storage" | "discount";
}

interface Invoice {
  id: string;
  date: Date;
  dueDate: Date;
  amount: number;
  status: "paid" | "pending" | "overdue" | "refunded" | "cancelled" | "partial_refund";
  items: InvoiceItem[];
  paymentMethod?: string;
  refundAmount?: number;
  refundDate?: Date;
  refundReason?: string;
  cancellationDate?: Date;
  cancellationReason?: string;
}

export default function MeuPlano() {
  // preços base
  const PRICE_WHATS = 82;
  const PRICE_IA = 100;
  const PRICE_BIRD = 29;
  const STORAGE_PLANS = {
    free: { gb: 15, price: 0, label: "Gratuito" },
    "1tb": { gb: 1024, price: 50, label: "1 TB" },
    "2tb": { gb: 2048, price: 90, label: "2 TB" },
  };
  const PLAN_PRICE_MONTHLY = 192;
  const PLAN_PRICE_QUARTERLY = 540; // 3 meses com desconto
  const PLAN_PRICE_ANNUAL = 1920;

  // dados do cliente
  const [customer, setCustomer] = useState<Customer>({
    name: "João Silva",
    email: "joao.silva@empresa.com.br",
    phone: "11 98765-4321",
    countryCode: "+55",
    company: "Empresa XYZ Ltda",
    documentType: "cnpj",
    document: "12.345.678/0001-90"
  });

  // plano com data de vencimento
  const [plan, setPlan] = useState<Plan>({
    periodicidade: "mensal",
    included_whatsapp_slots: 1,
    included_birdid_seats: 1,
    included_storage_gb: 15,
    next_billing_date: new Date(2024, 11, 15), // Data fixa para evitar hidratação
  });

  // métodos de pagamento
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
    { id: "pm1", type: "card", last4: "4242", brand: "Visa", isDefault: true },
  ]);

  // ordenação das tabelas
  const [invoiceSortField, setInvoiceSortField] = useState<string>('date');
  const [invoiceSortOrder, setInvoiceSortOrder] = useState<'asc' | 'desc'>('desc');
  const [seatSortField, setSeatSortField] = useState<string>('id');
  const [seatSortOrder, setSeatSortOrder] = useState<'asc' | 'desc'>('asc');

  // histórico de faturas
  const [invoices] = useState<Invoice[]>([
    {
      id: "inv1",
      date: new Date(2024, 9, 1),
      dueDate: new Date(2024, 9, 6),
      amount: 374,
      status: "paid",
      items: [
        { description: "Plano Mensal", quantity: 1, unitPrice: 192, total: 192, type: "plan" },
        { description: "WhatsApp - Canal Vendas", quantity: 1, unitPrice: 82, total: 82, type: "whatsapp" },
        { description: "IA - Canal Pós-venda", quantity: 1, unitPrice: 100, total: 100, type: "ia" },
      ],
      paymentMethod: "Cartão ****4242"
    },
    {
      id: "inv2",
      date: new Date(2024, 8, 1),
      dueDate: new Date(2024, 8, 6),
      amount: 321,
      status: "paid",
      items: [
        { description: "Plano Mensal", quantity: 1, unitPrice: 192, total: 192, type: "plan" },
        { description: "IA - Canal Recepção", quantity: 1, unitPrice: 100, total: 100, type: "ia" },
        { description: "BirdID - Seat adicional", quantity: 1, unitPrice: 29, total: 29, type: "birdid" },
      ],
      paymentMethod: "Cartão"
    },
    {
      id: "inv3",
      date: new Date(2024, 10, 25),
      dueDate: new Date(2024, 11, 2),
      amount: 442,
      status: "pending",
      items: [
        { description: "Plano Mensal", quantity: 1, unitPrice: 192, total: 192, type: "plan" },
        { description: "WhatsApp - Canal Suporte", quantity: 1, unitPrice: 82, total: 82, type: "whatsapp" },
        { description: "WhatsApp - Canal Financeiro", quantity: 1, unitPrice: 82, total: 82, type: "whatsapp" },
        { description: "IA - Canal Suporte", quantity: 1, unitPrice: 100, total: 100, type: "ia" },
        { description: "Storage adicional", quantity: 50, unitPrice: 0.5, total: 25, type: "storage" },
        { description: "Cupom KROOA10", quantity: 1, unitPrice: -39, total: -39, type: "discount" },
      ],
      paymentMethod: "Boleto"
    },
    {
      id: "inv4",
      date: new Date(2024, 7, 1),
      dueDate: new Date(2024, 7, 6),
      amount: 192,
      status: "refunded",
      refundAmount: 192,
      refundDate: new Date(2024, 7, 11),
      refundReason: "Cancelamento do serviço",
      items: [
        { description: "Plano Mensal", quantity: 1, unitPrice: 192, total: 192, type: "plan" },
      ],
      paymentMethod: "Cartão"
    },
    {
      id: "inv5",
      date: new Date(2024, 6, 1),
      dueDate: new Date(2024, 6, 6),
      amount: 274,
      status: "partial_refund",
      refundAmount: 82,
      refundDate: new Date(2024, 6, 16),
      refundReason: "Cobrança indevida de canal WhatsApp",
      items: [
        { description: "Plano Mensal", quantity: 1, unitPrice: 192, total: 192, type: "plan" },
        { description: "WhatsApp - Canal excedente", quantity: 1, unitPrice: 82, total: 82, type: "whatsapp" },
      ],
      paymentMethod: "Cartão ****1234"
    },
    {
      id: "inv6",
      date: new Date(2024, 5, 1),
      dueDate: new Date(2024, 5, 6),
      amount: 292,
      status: "cancelled",
      cancellationDate: new Date(2024, 5, 5),
      cancellationReason: "Fatura duplicada",
      items: [
        { description: "Plano Mensal", quantity: 1, unitPrice: 192, total: 192, type: "plan" },
        { description: "IA - Canal Vendas", quantity: 1, unitPrice: 100, total: 100, type: "ia" },
      ],
      paymentMethod: "Boleto"
    },
  ]);

  // cupom
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // canais whatsapp
  const [channels, setChannels] = useState<Channel[]>([
    {
      id: "c1",
      phone: "+55 11 90000-0001",
      label: "Recepção",
      created_at: new Date(2024, 9, 1).getTime(),
      ia: false,
      status: "ativo",
      is_billable: false,
    },
    {
      id: "c2",
      phone: "+55 11 90000-0002",
      label: "Pós-venda",
      created_at: new Date(2024, 10, 20).getTime(),
      ia: true,
      status: "ativo",
      is_billable: true,
    },
  ]);

  // bird id
  const [seats, setSeats] = useState<Seat[]>([
    { id: "s1", collaborator: "Alessandra", status: "atribuido", is_included: true },
    { id: "s2", collaborator: undefined, status: "disponivel", is_included: false },
  ]);

  // storage
  const [storagePlan, setStoragePlan] = useState<"free" | "1tb" | "2tb">("free");

  // UI state
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [newChannelIA, setNewChannelIA] = useState(false);
  const [newChannelLabel, setNewChannelLabel] = useState("");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [buySeatOpen, setBuySeatOpen] = useState(false);
  const [assignSeatId, setAssignSeatId] = useState<string | null>(null);
  const [assignName, setAssignName] = useState("");
  const [assignCpf, setAssignCpf] = useState("");
  const [addStorageOpen, setAddStorageOpen] = useState(false);
  const [editCustomerOpen, setEditCustomerOpen] = useState(false);
  const [tempCustomer, setTempCustomer] = useState<Customer>(customer);

  // Atualizar tempCustomer quando customer mudar
  useEffect(() => {
    setTempCustomer(customer);
  }, [customer]);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [changePlanConfirm, setChangePlanConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "invoices" | "payment">("overview");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // cobertura determinística (fila por created_at)
  useEffect(() => {
    const active = channels
      .filter((c) => c.status === "ativo")
      .sort((a, b) => a.created_at - b.created_at);
    const coveredIds = new Set(active.slice(0, plan.included_whatsapp_slots).map((c) => c.id));
    setChannels((prev) => prev.map((c) => ({
      ...c,
      is_billable: c.status === "ativo" ? !coveredIds.has(c.id) : false,
    })));
  }, [channels.length, plan.included_whatsapp_slots]);

  // preço do plano (mensal, trimestral ou anual, aplicando cupom)
  const planBase = plan.periodicidade === "mensal"
    ? PLAN_PRICE_MONTHLY
    : plan.periodicidade === "trimestral"
    ? PLAN_PRICE_QUARTERLY
    : PLAN_PRICE_ANNUAL;
  const planDiscounted = coupon ? planBase * (1 - coupon.percentOff / 100) : planBase;
  const planMonthlyForTotal = plan.periodicidade === "mensal"
    ? planDiscounted
    : plan.periodicidade === "trimestral"
    ? planDiscounted / 3
    : planDiscounted / 12;

  const totals = useMemo(() => {
    const whats = channels.reduce(
      (acc, c) => acc + (c.status === "ativo" && c.is_billable ? PRICE_WHATS : 0),
      0
    );
    const ia = channels.reduce(
      (acc, c) => acc + (c.status === "ativo" && c.ia ? PRICE_IA : 0),
      0
    );
    const paidSeats = Math.max(0, seats.filter((s) => s.status !== "cancelado").length - plan.included_birdid_seats);
    const bird = paidSeats * PRICE_BIRD;
    const storageGB = STORAGE_PLANS[storagePlan].gb;
    const storage = STORAGE_PLANS[storagePlan].price;
    const planCostMonthly = planMonthlyForTotal;
    return {
      plan: planCostMonthly,
      whats,
      ia,
      bird,
      storage,
      total: planCostMonthly + whats + ia + bird + storage,
      storageGB,
    };
  }, [channels, seats, plan, storagePlan, planMonthlyForTotal]);

  function applyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    const map: Record<string, number> = { KROOA10: 10, ANUAL20: 20, PLAN50: 50 };
    if (map[code]) {
      setCoupon({ code, percentOff: map[code] });
      setCouponError(null);
    } else {
      setCoupon(null);
      setCouponError("Cupom inválido");
    }
  }

  function clearCoupon() {
    setCoupon(null);
    setCouponInput("");
    setCouponError(null);
  }

  // Funções de ordenação
  const handleInvoiceSort = (field: string) => {
    if (invoiceSortField === field) {
      setInvoiceSortOrder(invoiceSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setInvoiceSortField(field);
      setInvoiceSortOrder('asc');
    }
  };

  const handleSeatSort = (field: string) => {
    if (seatSortField === field) {
      setSeatSortOrder(seatSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSeatSortField(field);
      setSeatSortOrder('asc');
    }
  };

  const sortedInvoices = [...invoices].sort((a, b) => {
    let aVal: any, bVal: any;

    switch(invoiceSortField) {
      case 'date':
        aVal = a.date.getTime();
        bVal = b.date.getTime();
        break;
      case 'dueDate':
        aVal = a.dueDate.getTime();
        bVal = b.dueDate.getTime();
        break;
      case 'amount':
        aVal = a.amount;
        bVal = b.amount;
        break;
      case 'status':
        aVal = a.status;
        bVal = b.status;
        break;
      default:
        aVal = a.id;
        bVal = b.id;
    }

    if (invoiceSortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const sortedSeats = [...seats].filter(s => s.status !== "cancelado").sort((a, b) => {
    let aVal: any, bVal: any;

    switch(seatSortField) {
      case 'id':
        aVal = parseInt(a.id);
        bVal = parseInt(b.id);
        break;
      case 'collaborator':
        aVal = a.collaborator || '';
        bVal = b.collaborator || '';
        break;
      case 'status':
        aVal = a.status;
        bVal = b.status;
        break;
      default:
        aVal = a.id;
        bVal = b.id;
    }

    if (seatSortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  function changePlan(newPeriodicidade: "mensal" | "trimestral" | "anual") {
    if (plan.pending_change) {
      setPlan((p) => ({ ...p, pending_change: undefined }));
    } else {
      setPlan((p) => ({
        ...p,
        pending_change: {
          new_periodicidade: newPeriodicidade,
          effective_date: p.next_billing_date,
        }
      }));
    }
    setChangePlanConfirm(false);
  }

  function addChannel() {
    if (!newChannelLabel.trim()) return;
    const id = `c${channels.length + 1}`;
    const ch: Channel = {
      id,
      phone: "+55 11 9xxxx-xxxx",
      label: newChannelLabel.trim(),
      created_at: new Date().getTime(),
      ia: newChannelIA,
      status: "ativo",
      is_billable: true,
    };
    setChannels((prev) => [...prev, ch]);
    setNewChannelIA(false);
    setNewChannelLabel("");
    setShowAddChannel(false);
  }

  function toggleIA(id: string) {
    setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, ia: !c.ia } : c)));
  }

  function cancelChannel(id: string) {
    setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, status: "cancelado", ia: false } : c)));
    setCancelId(null);
  }

  function reactivateChannel(id: string) {
    setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, status: "ativo" } : c)));
  }

  function buySeat() {
    const id = `s${seats.length + 1}`;
    setSeats((prev) => [...prev, { id, status: "disponivel", is_included: false }]);
    setBuySeatOpen(false);
  }

  function assignSeat(seatId: string) {
    if (!assignName.trim() || !assignCpf.trim()) return;
    setSeats((prev) =>
      prev.map((s) => (s.id === seatId ? { ...s, collaborator: assignName.trim(), collaboratorCpf: assignCpf.trim(), status: "atribuido" } : s))
    );
    setAssignSeatId(null);
    setAssignName("");
    setAssignCpf("");
  }

  function cancelSeat(seatId: string) {
    setSeats((prev) =>
      prev.map((s) => (s.id === seatId ? { ...s, status: "cancelado", collaborator: undefined, collaboratorCpf: undefined } : s))
    );
  }

  function setDefaultPayment(id: string) {
    setPaymentMethods((prev) =>
      prev.map((pm) => ({ ...pm, isDefault: pm.id === id }))
    );
  }

  function removePaymentMethod(id: string) {
    setPaymentMethods((prev) => prev.filter((pm) => pm.id !== id));
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 p-3 sm:p-4 lg:p-6 text-krooa-dark font-manrope">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Logos Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <img
              src="/krooa-logo.png"
              alt="Krooa"
              className="h-10 w-auto"
            />
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
            <span>Powered by</span>
            <div className="h-8 w-20 bg-gray-200 rounded flex items-center justify-center font-semibold text-gray-700">
              Stripe
            </div>
          </div>
        </div>

        {/* Header com dados do cliente */}
        <header className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold mb-3 text-krooa-dark">Plano & Contratação</h1>
              <div className="space-y-1 text-sm text-neutral-600">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{customer.name}</span>
                  {customer.company && <span>• {customer.company}</span>}
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                  <span>{customer.email}</span>
                  <span>{customer.countryCode} {customer.phone}</span>
                  {customer.document && <span>{customer.documentType.toUpperCase()}: {customer.document}</span>}
                </div>
              </div>
            </div>
            <div className="text-left lg:text-right space-y-1">
              <div className="text-sm text-neutral-600">Total mensal estimado</div>
              <div className="text-2xl font-semibold">{money(totals.total)}</div>
              <button
                onClick={() => setEditCustomerOpen(true)}
                className="text-sm text-krooa-blue hover:text-krooa-dark underline font-medium"
              >
                Editar dados
              </button>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-full sm:w-fit overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "overview" ? "bg-krooa-green text-krooa-dark shadow-sm" : "text-gray-600 hover:text-krooa-blue"
            }`}
          >
            Visão Geral
          </button>
          <button
            onClick={() => setActiveTab("invoices")}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "invoices" ? "bg-krooa-green text-krooa-dark shadow-sm" : "text-gray-600 hover:text-krooa-blue"
            }`}
          >
            Faturas
          </button>
          <button
            onClick={() => setActiveTab("payment")}
            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === "payment" ? "bg-krooa-green text-krooa-dark shadow-sm" : "text-gray-600 hover:text-krooa-blue"
            }`}
          >
            Pagamento
          </button>
        </div>

        {activeTab === "overview" && (
          <>
            {/* Plano atual com data de vencimento */}
            <section className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-6">
                <div className="grow">
                  <div className="text-lg font-semibold">Plano atual</div>
                  <div className="text-sm text-neutral-600">
                    {plan.periodicidade === "anual" ? "Anual" : plan.periodicidade === "trimestral" ? "Trimestral" : "Mensal"} · Inclui {plan.included_whatsapp_slots} WhatsApp, {plan.included_birdid_seats} BirdID, {fmtGB(plan.included_storage_gb)} de storage
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="text-sm">
                      <span className="text-neutral-500">Próxima cobrança:</span>{" "}
                      <span className="font-medium">{fmtDate(plan.next_billing_date)}</span>
                    </div>
                    {plan.pending_change && (
                      <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs">
                        <span className="text-amber-700">
                          Mudança agendada para {plan.pending_change.new_periodicidade} em {fmtDate(plan.pending_change.effective_date)}
                        </span>
                        <button
                          onClick={() => changePlan(plan.periodicidade)}
                          className="text-amber-700 hover:text-amber-900 underline"
                        >
                          cancelar mudança
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="shrink-0 space-y-2">
                  <div className="rounded-xl border border-neutral-200 p-3 text-sm">
                    <div className="text-neutral-600">Valor do plano</div>
                    <div className="text-xl font-semibold">
                      {plan.periodicidade === "mensal" ? (
                        money(planDiscounted)
                      ) : plan.periodicidade === "trimestral" ? (
                        <span>
                          {money(planDiscounted)} <span className="text-xs font-normal text-neutral-500">/ 3 meses</span>
                        </span>
                      ) : (
                        <span>
                          {money(planDiscounted)} <span className="text-xs font-normal text-neutral-500">/ ano</span>
                        </span>
                      )}
                    </div>
                    {plan.periodicidade === "trimestral" && (
                      <div className="text-xs text-neutral-500">equiv. {money(planDiscounted / 3)}/mês</div>
                    )}
                    {plan.periodicidade === "anual" && (
                      <div className="text-xs text-neutral-500">equiv. {money(planDiscounted / 12)}/mês</div>
                    )}
                    {coupon && (
                      <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Cupom {coupon.code} aplicado ({coupon.percentOff}% off)
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setChangePlanConfirm(true)}
                    disabled={!!plan.pending_change}
                    className="w-full rounded-xl bg-krooa-blue px-3 py-2 text-sm font-semibold text-white hover:bg-krooa-dark transition-colors disabled:opacity-50"
                  >
                    {plan.pending_change ? "Mudança agendada" : "Alterar plano"}
                  </button>
                </div>
              </div>

              {/* Cupom */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="grow">
                  <label className="mb-1 block text-sm font-medium">Cupom de desconto</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ex: KROOA10"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      className="text-sm"
                      fullWidth
                    />
                    {!coupon ? (
                      <Button onClick={applyCoupon} variant="secondary" size="sm">Aplicar</Button>
                    ) : (
                      <Button onClick={clearCoupon} variant="ghost" size="sm">Remover</Button>
                    )}
                  </div>
                  {couponError && <div className="mt-1 text-xs text-rose-600">{couponError}</div>}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-5">
                <SummaryTile title="Plano" value={money(totals.plan)} note={
                  plan.periodicidade === "anual" ? `${money(planDiscounted)} / ano` :
                  plan.periodicidade === "trimestral" ? `${money(planDiscounted)} / 3 meses` :
                  "Mensal"
                } />
                <SummaryTile title="WhatsApp" value={money(totals.whats)} note={`${channels.filter((c) => c.status === "ativo").length} ativos • ${Math.max(0, channels.filter((c) => c.status === "ativo").length - plan.included_whatsapp_slots)} cobrados`} />
                <SummaryTile title="IA" value={money(totals.ia)} note={`${channels.filter((c) => c.status === "ativo" && c.ia).length} canais com IA`} />
                <SummaryTile title="BirdID" value={money(totals.bird)} note={`${seats.filter((s) => s.status !== "cancelado").length} seats (${plan.included_birdid_seats} incluído)`} />
                <SummaryTile title="Storage" value={money(totals.storage)} note={`${STORAGE_PLANS[storagePlan].label} - ${fmtGB(totals.storageGB)}`} />
              </div>
            </section>

            {/* Canais WhatsApp */}
            <section className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <h2 className="text-base sm:text-lg font-semibold">Canais WhatsApp</h2>
                <button onClick={() => setShowAddChannel(true)} className="rounded-xl bg-krooa-green px-4 py-2.5 text-sm font-bold text-krooa-dark hover:shadow-lg hover:scale-105 transition-all shadow-md">+ Canal de Comunicação </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {channels.map((c) => (
                  <div key={c.id} className={`rounded-2xl border p-4 shadow-sm ${c.status === "cancelado" ? "border-neutral-200 bg-neutral-50 text-neutral-500" : "border-neutral-200 bg-white"}`}>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.is_billable ? "bg-amber-100 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>{c.is_billable ? "Cobrado" : "Coberto pelo plano"}</span>
                          <span className="text-sm text-neutral-500">{new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="text-base font-medium">{c.label}</div>
                        <div className="text-sm">{c.phone}</div>
                        <div className="text-sm text-neutral-600">WhatsApp: {c.is_billable ? money(PRICE_WHATS) : money(0)} · IA: {c.ia ? money(PRICE_IA) : "—"}</div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-sm text-neutral-500">Total do canal</div>
                        <div className="text-lg font-semibold">{money((c.is_billable ? PRICE_WHATS : 0) + (c.ia ? PRICE_IA : 0))}</div>
                        <div className="flex gap-2">
                          {c.status !== "cancelado" && (
                            <button onClick={() => toggleIA(c.id)} className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition-all ${c.ia ? "bg-gray-100 hover:bg-gray-200 text-gray-700" : "bg-krooa-green text-krooa-dark hover:shadow-md hover:scale-105 shadow-sm"}`}>{c.ia ? "Remover IA" : "Ativar IA"}</button>
                          )}
                          {c.status !== "cancelado" ? (
                            <button onClick={() => setCancelId(c.id)} className="rounded-xl bg-gray-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-600 transition-colors">Cancelar</button>
                          ) : (
                            <button onClick={() => reactivateChannel(c.id)} className="rounded-xl bg-krooa-blue px-3 py-1.5 text-sm font-semibold text-white hover:bg-krooa-dark transition-colors">Reativar canal</button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* BirdID */}
            <section className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold">Assinatura Digital (BirdID)</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Cobrança mensal por usuário ativo. Assine documentos ilimitados sem custo adicional.
                  </p>
                </div>
                <button onClick={() => setBuySeatOpen(true)} className="rounded-xl bg-krooa-green px-4 py-2.5 text-sm font-bold text-krooa-dark hover:shadow-lg hover:scale-105 transition-all shadow-md">+ Certificado Digital</button>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="bg-gray-50 text-left text-neutral-600">
                    <tr>
                      <th
                        className="px-2 sm:px-4 py-2 text-xs sm:text-sm cursor-pointer hover:bg-gray-100/50"
                        onClick={() => handleSeatSort('id')}
                      >
                        Seat
                        <SortIcon field="id" currentField={seatSortField} currentOrder={seatSortOrder} />
                      </th>
                      <th
                        className="px-2 sm:px-4 py-2 text-xs sm:text-sm cursor-pointer hover:bg-gray-100/50"
                        onClick={() => handleSeatSort('collaborator')}
                      >
                        Colaborador
                        <SortIcon field="collaborator" currentField={seatSortField} currentOrder={seatSortOrder} />
                      </th>
                      <th className="px-2 sm:px-4 py-2 text-xs sm:text-sm">CPF</th>
                      <th className="px-2 sm:px-4 py-2 text-xs sm:text-sm">Tipo</th>
                      <th
                        className="px-2 sm:px-4 py-2 text-xs sm:text-sm cursor-pointer hover:bg-gray-100/50"
                        onClick={() => handleSeatSort('status')}
                      >
                        Status
                        <SortIcon field="status" currentField={seatSortField} currentOrder={seatSortOrder} />
                      </th>
                      <th className="px-2 sm:px-4 py-2 text-right text-xs sm:text-sm">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSeats.map((s) => (
                      <tr key={s.id} className="border-t border-gray-200">
                        <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm">{s.id}</td>
                        <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm">{s.collaborator ?? <span className="text-neutral-400">—</span>}</td>
                        <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm">{s.collaboratorCpf ?? <span className="text-neutral-400">—</span>}</td>
                        <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm">{s.is_included ? "Incluído" : "Pago"}</td>
                        <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm">{s.status}</td>
                        <td className="px-2 sm:px-4 py-2 text-right">
                          <div className="flex flex-col lg:flex-row gap-1 lg:gap-2 justify-end">
                            {(s.status === "disponivel" || s.status === "atribuido") && (
                              <button
                                onClick={() => { setAssignSeatId(s.id); setAssignName(s.collaborator || ""); setAssignCpf(s.collaboratorCpf || ""); }}
                                className="rounded-xl bg-krooa-blue px-3 py-1.5 text-white font-semibold hover:bg-krooa-dark transition-colors"
                              >
                                {s.status === "atribuido" ? "Alterar" : "Atribuir"}
                              </button>
                            )}
                            {!s.is_included && (
                              <button onClick={() => cancelSeat(s.id)} className="rounded-xl bg-gray-500 px-3 py-1.5 text-white text-sm font-medium hover:bg-gray-600 transition-colors">Cancelar</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Storage */}
            <section className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold">Armazenamento</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Plano atual: <span className="font-semibold">{STORAGE_PLANS[storagePlan].label}</span> - {fmtGB(totals.storageGB)}
                  </p>
                </div>
                <button onClick={() => setAddStorageOpen(true)} className="rounded-xl bg-krooa-blue px-3 py-2 text-sm font-semibold text-white hover:bg-krooa-dark transition-colors">Alterar plano</button>
              </div>
            </section>
          </>
        )}

        {activeTab === "invoices" && (
          <section className="space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <h2 className="text-base sm:text-lg font-semibold">Histórico de Faturas</h2>
              <div className="text-sm text-neutral-600">
                Próxima cobrança: {fmtDate(plan.next_billing_date)}
              </div>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-neutral-50 text-left text-neutral-600">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 text-xs sm:text-sm">Fatura</th>
                    <th
                      className="px-2 sm:px-4 py-2 text-xs sm:text-sm cursor-pointer hover:bg-gray-100"
                      onClick={() => handleInvoiceSort('date')}
                    >
                      Data
                      <SortIcon field="date" currentField={invoiceSortField} currentOrder={invoiceSortOrder} />
                    </th>
                    <th
                      className="px-2 sm:px-4 py-2 text-xs sm:text-sm cursor-pointer hover:bg-gray-100"
                      onClick={() => handleInvoiceSort('dueDate')}
                    >
                      Vencimento
                      <SortIcon field="dueDate" currentField={invoiceSortField} currentOrder={invoiceSortOrder} />
                    </th>
                    <th className="px-2 sm:px-4 py-2 text-xs sm:text-sm">Resumo</th>
                    <th className="px-2 sm:px-4 py-2 text-xs sm:text-sm">Forma de Pagamento</th>
                    <th
                      className="px-2 sm:px-4 py-2 text-xs sm:text-sm cursor-pointer hover:bg-gray-100"
                      onClick={() => handleInvoiceSort('amount')}
                    >
                      Valor
                      <SortIcon field="amount" currentField={invoiceSortField} currentOrder={invoiceSortOrder} />
                    </th>
                    <th
                      className="px-2 sm:px-4 py-2 text-xs sm:text-sm cursor-pointer hover:bg-gray-100"
                      onClick={() => handleInvoiceSort('status')}
                    >
                      Status
                      <SortIcon field="status" currentField={invoiceSortField} currentOrder={invoiceSortOrder} />
                    </th>
                    <th className="px-2 sm:px-4 py-2 text-right text-xs sm:text-sm">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-t border-gray-200 hover:bg-gray-50/50">
                      <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm">{invoice.id}</td>
                      <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm">{fmtDate(invoice.date)}</td>
                      <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm">{fmtDate(invoice.dueDate)}</td>
                      <td className="px-2 sm:px-4 py-2">
                        <div className="text-xs text-neutral-600">
                          {invoice.items.length} {invoice.items.length === 1 ? "item" : "itens"}
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm">{invoice.paymentMethod}</td>
                      <td className="px-2 sm:px-4 py-2 font-medium text-xs sm:text-sm">{money(invoice.amount)}</td>
                      <td className="px-2 sm:px-4 py-2">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium w-fit ${
                            invoice.status === "paid" ? "bg-emerald-50 text-emerald-700" :
                            invoice.status === "pending" ? "bg-amber-50 text-amber-700" :
                            invoice.status === "overdue" ? "bg-rose-50 text-rose-700" :
                            invoice.status === "refunded" ? "bg-purple-50 text-purple-700" :
                            invoice.status === "partial_refund" ? "bg-indigo-50 text-indigo-700" :
                            "bg-neutral-100 text-neutral-700"
                          }`}>
                            {invoice.status === "paid" ? "Pago" :
                             invoice.status === "pending" ? "Pendente" :
                             invoice.status === "overdue" ? "Vencido" :
                             invoice.status === "refunded" ? "Reembolsado" :
                             invoice.status === "partial_refund" ? "Reembolso parcial" :
                             "Cancelado"}
                          </span>
                          {invoice.refundAmount && (
                            <span className="text-xs text-neutral-500">
                              {money(invoice.refundAmount)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 text-right">
                        <div className="flex flex-col lg:flex-row gap-1 lg:gap-2 justify-end">
                          <button
                            onClick={() => setSelectedInvoice(invoice)}
                            className="rounded-xl bg-krooa-blue px-3 py-1.5 text-xs sm:text-sm text-white font-semibold hover:bg-krooa-dark transition-colors"
                          >
                            Detalhes
                          </button>
                          <button className="rounded-xl bg-gray-500 px-3 py-1.5 text-xs sm:text-sm text-white font-medium hover:bg-gray-600 transition-colors">
                            PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === "payment" && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <h2 className="text-base sm:text-lg font-semibold">Métodos de Pagamento</h2>
              <button onClick={() => setAddPaymentOpen(true)} className="rounded-xl bg-neutral-900 px-3 py-2 text-sm font-medium text-white">
                + Adicionar método
              </button>
            </div>

            <div className="grid gap-3">
              {paymentMethods.map((method) => (
                <div key={method.id} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100">
                        {method.type === "card" && "💳"}
                        {method.type === "boleto" && "📄"}
                      </div>
                      <div>
                        <div className="font-medium">
                          {method.type === "card" && `${method.brand} ****${method.last4}`}
                          {method.type === "boleto" && "Boleto"}
                        </div>
                        {method.isDefault && (
                          <span className="text-xs text-emerald-600">Método padrão</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!method.isDefault && (
                        <button
                          onClick={() => setDefaultPayment(method.id)}
                          className="rounded-xl bg-krooa-green px-3 py-1.5 text-sm font-semibold text-krooa-dark hover:opacity-90 transition-opacity"
                        >
                          Tornar padrão
                        </button>
                      )}
                      <button
                        onClick={() => removePaymentMethod(method.id)}
                        className="rounded-xl bg-gray-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-600 transition-colors"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </section>
        )}
      </div>

      {/* Modals */}
      <Modal isOpen={showAddChannel} title="Adicionar canal" onClose={() => setShowAddChannel(false)}>
        <div className="space-y-4">
            <Input
              placeholder="Nome do canal (ex: Recepção, Financeiro)"
              value={newChannelLabel}
              onChange={(e) => setNewChannelLabel(e.target.value)}
              fullWidth
            />
            <Row label="WhatsApp" right={<span className="font-semibold">{money(PRICE_WHATS)}</span>} note="Sempre incluso no canal adicional" />
            <Row label="IA (opcional)" right={
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4" checked={newChannelIA} onChange={(e) => setNewChannelIA(e.target.checked)} />
                <span className="text-sm">{newChannelIA ? money(PRICE_IA) : money(0)}</span>
              </label>
            } />
            <Divider />
            <Row label="Total do canal" right={<span className="text-lg font-semibold">{money(PRICE_WHATS + (newChannelIA ? PRICE_IA : 0))}</span>} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowAddChannel(false)}>Cancelar</Button>
              <Button variant="primary" onClick={addChannel} disabled={!newChannelLabel.trim()}>Contratar canal</Button>
            </div>
        </div>
      </Modal>

      <Modal isOpen={!!cancelId} title="Cancelar canal" onClose={() => setCancelId(null)}>
          <p className="text-sm text-neutral-700">Você está cancelando o canal <span className="font-medium">{channels.find((c) => c.id === cancelId)?.label}</span>. Isso desativa a IA vinculada e remove integrações associadas.</p>
          <ul className="mt-3 list-disc pl-5 text-sm text-neutral-600">
            <li>IA será desativada, se ativa.</li>
            <li>Se este canal era cobrado, o próximo na fila pode virar coberto pelo plano.</li>
          </ul>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCancelId(null)}>Voltar</Button>
            <Button variant="danger" onClick={() => cancelId && cancelChannel(cancelId)}>Cancelar este canal</Button>
        </div>
      </Modal>

      <Modal
        isOpen={!!assignSeatId}
        title={`${seats.find(s => s.id === assignSeatId)?.collaborator ? "Alterar" : "Atribuir"} Colaborador - Assinatura Digital`}
        onClose={() => { setAssignSeatId(null); setAssignName(""); setAssignCpf(""); }}
      >
          <div className="space-y-4">
            <div className="rounded-xl bg-amber-50 p-3 text-sm">
              <p className="text-amber-900">
                <strong>Importante:</strong> A assinatura digital é vinculada ao CPF do colaborador.
                Após atribuir, o colaborador poderá assinar documentos ilimitados.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Nome do colaborador</label>
              <input
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                placeholder="Nome completo"
                value={assignName}
                onChange={(e) => setAssignName(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">CPF do colaborador</label>
              <input
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                placeholder="000.000.000-00"
                value={assignCpf}
                onChange={(e) => {
                  const formatted = formatCPF(e.target.value);
                  setAssignCpf(formatted);
                }}
              />
              <p className="text-xs text-gray-500 mt-1">CPF é obrigatório para validação da assinatura digital</p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setAssignSeatId(null); setAssignName(""); setAssignCpf(""); }}>
                Cancelar
              </Button>
              <Button
                onClick={() => assignSeatId && assignSeat(assignSeatId)}
                disabled={!assignName.trim() || !assignCpf.trim() || assignCpf.replace(/\D/g, "").length !== 11}
              >
                {seats.find(s => s.id === assignSeatId)?.collaborator ? "Salvar alterações" : "Atribuir"}
              </Button>
            </div>
        </div>
      </Modal>

      <Modal isOpen={buySeatOpen} title="Comprar Assinatura Digital" onClose={() => setBuySeatOpen(false)}>
          <div className="space-y-4">
            <div className="rounded-xl bg-krooa-green/10 p-4 border border-krooa-green/30">
              <h4 className="font-bold text-krooa-dark mb-2">Assinatura Digital BirdID</h4>
              <p className="text-sm text-gray-600 mb-3">
                Contrate assinaturas digitais para seus colaboradores. Cada assinatura permite que um colaborador assine documentos digitalmente.
              </p>
              <ul className="space-y-1 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-krooa-green font-bold">✓</span>
                  Pagamento mensal recorrente
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-krooa-green font-bold">✓</span>
                  Cancele a qualquer momento
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-krooa-green font-bold">✓</span>
                  Compre quantas assinaturas precisar
                </li>
              </ul>
            </div>

            <Row label="Preço por assinatura" right={<span className="font-bold text-lg">{money(PRICE_BIRD)}/mês</span>} />

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setBuySeatOpen(false)}>Cancelar</Button>
              <button
                onClick={buySeat}
                className="rounded-xl bg-krooa-green px-4 py-2.5 text-sm font-bold text-krooa-dark hover:shadow-lg hover:scale-105 transition-all shadow-md"
              >
                Comprar Assinatura
              </button>
            </div>
        </div>
      </Modal>

      <Modal isOpen={addStorageOpen} title="Alterar Plano de Armazenamento" onClose={() => setAddStorageOpen(false)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-700 mb-4">
              Selecione o plano de armazenamento desejado:
            </p>

            {/* Opções de armazenamento */}
            <div className="space-y-3">
              {/* Plano Gratuito */}
              <button
                onClick={() => { setStoragePlan("free"); setAddStorageOpen(false); }}
                disabled={storagePlan === "free"}
                className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                  storagePlan === "free"
                    ? "border-gray-300 bg-gray-50 cursor-not-allowed opacity-60"
                    : "border-gray-200 hover:border-krooa-green hover:bg-krooa-green/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-krooa-dark">Gratuito</div>
                    <div className="text-sm text-gray-600">15 GB de armazenamento</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-krooa-dark">{money(0)}</div>
                    <div className="text-xs text-gray-500">incluído no plano</div>
                  </div>
                </div>
                {storagePlan === "free" && (
                  <div className="mt-2 text-xs text-krooa-blue font-medium">Plano atual</div>
                )}
              </button>

              {/* Plano 1 TB */}
              <button
                onClick={() => { setStoragePlan("1tb"); setAddStorageOpen(false); }}
                disabled={storagePlan === "1tb"}
                className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                  storagePlan === "1tb"
                    ? "border-gray-300 bg-gray-50 cursor-not-allowed opacity-60"
                    : "border-gray-200 hover:border-krooa-green hover:bg-krooa-green/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-krooa-dark">1 TB</div>
                    <div className="text-sm text-gray-600">1.024 GB de armazenamento</div>
                    <div className="inline-flex items-center gap-1 mt-1 rounded-full bg-krooa-green px-2 py-0.5 text-xs font-bold text-krooa-dark">
                      MAIS POPULAR
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-krooa-dark">{money(50)}</div>
                    <div className="text-xs text-gray-500">por mês</div>
                  </div>
                </div>
                {storagePlan === "1tb" && (
                  <div className="mt-2 text-xs text-krooa-blue font-medium">Plano atual</div>
                )}
              </button>

              {/* Plano 2 TB */}
              <button
                onClick={() => { setStoragePlan("2tb"); setAddStorageOpen(false); }}
                disabled={storagePlan === "2tb"}
                className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                  storagePlan === "2tb"
                    ? "border-gray-300 bg-gray-50 cursor-not-allowed opacity-60"
                    : "border-gray-200 hover:border-krooa-green hover:bg-krooa-green/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-krooa-dark">2 TB</div>
                    <div className="text-sm text-gray-600">2.048 GB de armazenamento</div>
                    <div className="text-sm text-emerald-600 font-medium">Economia de 10%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-krooa-dark">{money(90)}</div>
                    <div className="text-xs text-gray-500">por mês</div>
                  </div>
                </div>
                {storagePlan === "2tb" && (
                  <div className="mt-2 text-xs text-krooa-blue font-medium">Plano atual</div>
                )}
              </button>
            </div>

            <div className="rounded-xl bg-amber-50 p-3 text-sm">
              <p className="font-medium text-amber-900 mb-1">Importante:</p>
              <ul className="list-disc pl-5 text-amber-700 space-y-1">
                <li>A mudança é aplicada imediatamente</li>
                <li>Você pode fazer downgrade a qualquer momento</li>
                <li>Armazenamento compartilhado entre todos os canais</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setAddStorageOpen(false)}>Fechar</Button>
            </div>
        </div>
      </Modal>

      <Modal isOpen={editCustomerOpen} title="Editar dados do cliente" onClose={() => { setEditCustomerOpen(false); setTempCustomer(customer); }}>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Nome</label>
              <input
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                value={tempCustomer.name}
                onChange={(e) => setTempCustomer({ ...tempCustomer, name: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Email</label>
              <input
                type="email"
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                value={tempCustomer.email}
                onChange={(e) => setTempCustomer({ ...tempCustomer, email: e.target.value })}
              />
            </div>

            {/* Telefone com seletor de país */}
            <div>
              <label className="mb-1 block text-sm font-medium">Telefone</label>
              <div className="flex gap-2">
                <select
                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium"
                  value={tempCustomer.countryCode}
                  onChange={(e) => setTempCustomer({ ...tempCustomer, countryCode: e.target.value })}
                >
                  {countryCodes.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.flag} {country.code}
                    </option>
                  ))}
                </select>
                <input
                  className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm"
                  placeholder="(11) 98765-4321"
                  value={tempCustomer.phone}
                  onChange={(e) => {
                    const formatted = formatPhone(e.target.value);
                    setTempCustomer({ ...tempCustomer, phone: formatted });
                  }}
                />
              </div>
            </div>

            {/* Seletor de tipo de documento */}
            <div>
              <label className="mb-1 block text-sm font-medium">Tipo de documento</label>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setTempCustomer({ ...tempCustomer, documentType: "cpf", document: "", company: "" })}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                    tempCustomer.documentType === "cpf"
                      ? "bg-krooa-green text-krooa-dark"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  CPF
                </button>
                <button
                  type="button"
                  onClick={() => setTempCustomer({ ...tempCustomer, documentType: "cnpj", document: "" })}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                    tempCustomer.documentType === "cnpj"
                      ? "bg-krooa-green text-krooa-dark"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  CNPJ
                </button>
              </div>

              {/* Campo Empresa - aparece apenas para CNPJ */}
              {tempCustomer.documentType === "cnpj" && (
                <div className="mb-3">
                  <input
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Nome da empresa"
                    value={tempCustomer.company || ""}
                    onChange={(e) => setTempCustomer({ ...tempCustomer, company: e.target.value })}
                  />
                </div>
              )}

              <input
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
                placeholder={tempCustomer.documentType === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
                value={tempCustomer.document || ""}
                onChange={(e) => {
                  const formatted = tempCustomer.documentType === "cpf"
                    ? formatCPF(e.target.value)
                    : formatCNPJ(e.target.value);
                  setTempCustomer({ ...tempCustomer, document: formatted });
                }}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setEditCustomerOpen(false); setTempCustomer(customer); }}>Cancelar</Button>
              <Button onClick={() => {
                setCustomer(tempCustomer);
                setEditCustomerOpen(false);
              }}>Salvar</Button>
            </div>
        </div>
      </Modal>

      <Modal isOpen={changePlanConfirm} title="Alterar plano" onClose={() => setChangePlanConfirm(false)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-700 mb-4">
              Selecione o novo plano desejado:
            </p>

            {/* Opções de planos */}
            <div className="space-y-3">
              {/* Plano Mensal */}
              <button
                onClick={() => changePlan("mensal")}
                disabled={plan.periodicidade === "mensal"}
                className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                  plan.periodicidade === "mensal"
                    ? "border-gray-300 bg-gray-50 cursor-not-allowed opacity-60"
                    : "border-gray-200 hover:border-krooa-green hover:bg-krooa-green/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-krooa-dark">Mensal</div>
                    <div className="text-sm text-gray-600">Sem desconto</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-krooa-dark">{money(PLAN_PRICE_MONTHLY)}</div>
                    <div className="text-xs text-gray-500">por mês</div>
                  </div>
                </div>
                {plan.periodicidade === "mensal" && (
                  <div className="mt-2 text-xs text-krooa-blue font-medium">Plano atual</div>
                )}
              </button>

              {/* Plano Trimestral */}
              <button
                onClick={() => changePlan("trimestral")}
                disabled={plan.periodicidade === "trimestral"}
                className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                  plan.periodicidade === "trimestral"
                    ? "border-gray-300 bg-gray-50 cursor-not-allowed opacity-60"
                    : "border-gray-200 hover:border-krooa-green hover:bg-krooa-green/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-krooa-dark">Trimestral</div>
                    <div className="text-sm text-gray-600">Economize 6%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-krooa-dark">{money(PLAN_PRICE_QUARTERLY)}</div>
                    <div className="text-xs text-gray-500">a cada 3 meses</div>
                    <div className="text-xs text-emerald-600">{money(PLAN_PRICE_QUARTERLY / 3)}/mês</div>
                  </div>
                </div>
                {plan.periodicidade === "trimestral" && (
                  <div className="mt-2 text-xs text-krooa-blue font-medium">Plano atual</div>
                )}
              </button>

              {/* Plano Anual */}
              <button
                onClick={() => changePlan("anual")}
                disabled={plan.periodicidade === "anual"}
                className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                  plan.periodicidade === "anual"
                    ? "border-gray-300 bg-gray-50 cursor-not-allowed opacity-60"
                    : "border-gray-200 hover:border-krooa-green hover:bg-krooa-green/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-krooa-dark">Anual</div>
                    <div className="text-sm text-gray-600">Economize 16%</div>
                    <div className="inline-flex items-center gap-1 mt-1 rounded-full bg-krooa-green px-2 py-0.5 text-xs font-bold text-krooa-dark">
                      MAIS POPULAR
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-krooa-dark">{money(PLAN_PRICE_ANNUAL)}</div>
                    <div className="text-xs text-gray-500">por ano</div>
                    <div className="text-xs text-emerald-600">{money(PLAN_PRICE_ANNUAL / 12)}/mês</div>
                  </div>
                </div>
                {plan.periodicidade === "anual" && (
                  <div className="mt-2 text-xs text-krooa-blue font-medium">Plano atual</div>
                )}
              </button>
            </div>

            <div className="rounded-xl bg-amber-50 p-3 text-sm">
              <p className="font-medium text-amber-900 mb-1">Importante:</p>
              <ul className="list-disc pl-5 text-amber-700 space-y-1">
                <li>A mudança será aplicada na próxima data de vencimento ({fmtDate(plan.next_billing_date)})</li>
                <li>Você continuará pagando o valor atual até a data de vencimento</li>
                <li>Após a mudança, o novo valor será cobrado automaticamente</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setChangePlanConfirm(false)}>Fechar</Button>
            </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!selectedInvoice}
        title={`Detalhes da Fatura ${selectedInvoice?.id}`}
        onClose={() => setSelectedInvoice(null)}
      >
        {selectedInvoice && (
          <div className="space-y-4">
            {/* Header da fatura */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-neutral-500">Data de emissão:</span>
                <p className="font-medium">{fmtDate(selectedInvoice.date)}</p>
              </div>
              <div>
                <span className="text-neutral-500">Vencimento:</span>
                <p className="font-medium">{fmtDate(selectedInvoice.dueDate)}</p>
              </div>
              <div>
                <span className="text-neutral-500">Status:</span>
                <p>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    selectedInvoice.status === "paid" ? "bg-emerald-50 text-emerald-700" :
                    selectedInvoice.status === "pending" ? "bg-amber-50 text-amber-700" :
                    selectedInvoice.status === "overdue" ? "bg-rose-50 text-rose-700" :
                    selectedInvoice.status === "refunded" ? "bg-purple-50 text-purple-700" :
                    selectedInvoice.status === "partial_refund" ? "bg-indigo-50 text-indigo-700" :
                    "bg-neutral-100 text-neutral-700"
                  }`}>
                    {selectedInvoice.status === "paid" ? "Pago" :
                     selectedInvoice.status === "pending" ? "Pendente" :
                     selectedInvoice.status === "overdue" ? "Vencido" :
                     selectedInvoice.status === "refunded" ? "Reembolsado" :
                     selectedInvoice.status === "partial_refund" ? "Reembolso parcial" :
                     "Cancelado"}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-neutral-500">Método de pagamento:</span>
                <p className="font-medium">{selectedInvoice.paymentMethod}</p>
              </div>
            </div>

            <Divider />

            {/* Informações de reembolso ou cancelamento */}
            {(selectedInvoice.status === "refunded" || selectedInvoice.status === "partial_refund") && (
              <>
                <div className="rounded-xl bg-purple-50 p-3 text-sm">
                  <div className="font-medium text-purple-900 mb-2">Informações do Reembolso</div>
                  <div className="space-y-1 text-purple-700">
                    <div className="flex justify-between">
                      <span>Valor reembolsado:</span>
                      <span className="font-medium">{money(selectedInvoice.refundAmount || 0)}</span>
                    </div>
                    {selectedInvoice.refundDate && (
                      <div className="flex justify-between">
                        <span>Data do reembolso:</span>
                        <span>{fmtDate(selectedInvoice.refundDate)}</span>
                      </div>
                    )}
                    {selectedInvoice.refundReason && (
                      <div>
                        <span>Motivo:</span>
                        <p className="text-xs mt-1">{selectedInvoice.refundReason}</p>
                      </div>
                    )}
                  </div>
                </div>
                <Divider />
              </>
            )}

            {selectedInvoice.status === "cancelled" && (
              <>
                <div className="rounded-xl bg-neutral-100 p-3 text-sm">
                  <div className="font-medium text-neutral-900 mb-2">Informações do Cancelamento</div>
                  <div className="space-y-1 text-neutral-700">
                    {selectedInvoice.cancellationDate && (
                      <div className="flex justify-between">
                        <span>Data do cancelamento:</span>
                        <span>{fmtDate(selectedInvoice.cancellationDate)}</span>
                      </div>
                    )}
                    {selectedInvoice.cancellationReason && (
                      <div>
                        <span>Motivo:</span>
                        <p className="text-xs mt-1">{selectedInvoice.cancellationReason}</p>
                      </div>
                    )}
                  </div>
                </div>
                <Divider />
              </>
            )}

            {/* Itens da fatura */}
            <div>
              <h4 className="font-medium mb-3">Detalhamento dos produtos</h4>
              <div className="space-y-2">
                {selectedInvoice.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 text-sm">
                    <div className="flex-1">
                      <div className="font-medium">{item.description}</div>
                      {item.quantity > 1 && (
                        <div className="text-xs text-neutral-500">
                          {item.quantity} x {money(item.unitPrice)}
                        </div>
                      )}
                    </div>
                    <div className={`font-medium ${
                      item.type === "discount" ? "text-emerald-600" : ""
                    }`}>
                      {money(item.total)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Divider />

            {/* Total */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-xl font-bold">{money(selectedInvoice.amount)}</span>
              </div>
              {selectedInvoice.refundAmount && selectedInvoice.status === "partial_refund" && (
                <>
                  <div className="flex items-center justify-between text-sm text-purple-600">
                    <span>Reembolso</span>
                    <span>- {money(selectedInvoice.refundAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between font-semibold">
                    <span>Valor final</span>
                    <span>{money(selectedInvoice.amount - selectedInvoice.refundAmount)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Ações */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setSelectedInvoice(null)}>Fechar</Button>
              <Button onClick={() => console.log("Download PDF")}>Baixar PDF</Button>
              {selectedInvoice.status === "pending" && (
                <Button onClick={() => console.log("Pagar fatura")}>Pagar agora</Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={addPaymentOpen} title="Adicionar método de pagamento" onClose={() => setAddPaymentOpen(false)}>
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              Selecione o tipo de pagamento que deseja adicionar:
            </p>
            <div className="grid gap-3">
              <button className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3 text-left hover:bg-neutral-50">
                <span className="text-2xl">💳</span>
                <div>
                  <div className="font-medium">Cartão de Crédito</div>
                  <div className="text-xs text-neutral-500">Visa, Mastercard, Elo, Amex</div>
                </div>
              </button>
              <button className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3 text-left hover:bg-neutral-50">
                <span className="text-2xl">📱</span>
                <div>
                  <div className="font-medium">Cartão</div>
                  <div className="text-xs text-neutral-500">Pagamento instantâneo</div>
                </div>
              </button>
              <button className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3 text-left hover:bg-neutral-50">
                <span className="text-2xl">📄</span>
                <div>
                  <div className="font-medium">Boleto</div>
                  <div className="text-xs text-neutral-500">Vencimento em 3 dias úteis</div>
                </div>
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setAddPaymentOpen(false)}>Cancelar</Button>
            </div>
        </div>
      </Modal>
    </div>
  );
}

interface SummaryTileProps {
  title: string;
  value: string;
  note?: string;
}

function SummaryTile({ title, value, note }: SummaryTileProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="text-sm text-gray-500 font-medium">{title}</div>
      <div className="text-xl font-bold text-krooa-dark">{value}</div>
      {note && <div className="text-xs text-gray-500">{note}</div>}
    </div>
  );
}

interface SortIconProps {
  field: string;
  currentField: string;
  currentOrder: 'asc' | 'desc';
}

function SortIcon({ field, currentField, currentOrder }: SortIconProps) {
  if (field !== currentField) {
    return (
      <span className="inline-block ml-1 text-gray-400">
        ↕
      </span>
    );
  }
  return (
    <span className="inline-block ml-1 text-krooa-blue">
      {currentOrder === 'asc' ? '↑' : '↓'}
    </span>
  );
}

interface RowProps {
  label: string;
  right: React.ReactNode;
  note?: string;
}

function Row({ label, right, note }: RowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {note && <div className="text-xs text-neutral-500">{note}</div>}
      </div>
      <div>{right}</div>
    </div>
  );
}

function Divider() {
  return <div className="my-2 h-px w-full bg-neutral-200" />;
}


"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { getStorageProduct, getCurrentPlan, addStorageAddon, removeStorageAddon, createSubscription, updateSubscription, cancelSubscription, reactivateSubscription, getInvoices, getCustomerData, updateCustomerData, applyCouponToSubscription, removeCouponFromSubscription } from "@/app/actions/stripe";
import Swal from 'sweetalert2';
import ReactSelect, { components, SingleValue } from 'react-select';
import { Icon } from '@iconify/react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { AddCardForm } from '@/components/AddCardForm';
import { getSwalLoadingHtml } from '@/components/LoadingSpinner';
import { Skeleton, SkeletonText, SkeletonCard, SkeletonTable, SkeletonList } from '@/components/Skeleton';
import '@/styles/loading.css';

// Inicializar Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// utils
const money = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtGB = (n: number) => `${n} GB`;
const fmtDate = (date: Date) => date.toLocaleDateString("pt-BR");

// Máscaras
const formatPhone = (value: string, countryCode: string = '+55') => {
  const numbers = value.replace(/\D/g, "");

  switch (countryCode) {
    case '+55': // Brasil
      if (numbers.length <= 10) {
        return numbers.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3").substring(0, 14);
      }
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3").substring(0, 15);

    case '+1': // EUA/Canadá
      return numbers.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3").substring(0, 14);

    case '+54': // Argentina
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3").substring(0, 14);

    case '+56': // Chile
      return numbers.replace(/(\d{1})(\d{4})(\d{4})/, "($1) $2-$3").substring(0, 13);

    case '+57': // Colômbia
      return numbers.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3").substring(0, 14);

    case '+58': // Venezuela
      return numbers.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3").substring(0, 14);

    case '+51': // Peru
      return numbers.replace(/(\d{3})(\d{3})(\d{3})/, "($1) $2-$3").substring(0, 13);

    case '+598': // Uruguai
      return numbers.replace(/(\d{2})(\d{3})(\d{4})/, "($1) $2-$3").substring(0, 13);

    case '+595': // Paraguai
      return numbers.replace(/(\d{3})(\d{3})(\d{3})/, "($1) $2-$3").substring(0, 13);

    case '+52': // México
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3").substring(0, 14);

    case '+351': // Portugal
      return numbers.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3").substring(0, 11);

    case '+34': // Espanha
      return numbers.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3").substring(0, 11);

    case '+33': // França
      return numbers.replace(/(\d{1})(\d{2})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4 $5").substring(0, 13);

    case '+49': // Alemanha
      return numbers.replace(/(\d{3})(\d{4})(\d{4})/, "$1 $2 $3").substring(0, 12);

    case '+39': // Itália
      return numbers.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3").substring(0, 11);

    case '+44': // Reino Unido
      return numbers.replace(/(\d{4})(\d{3})(\d{4})/, "$1 $2 $3").substring(0, 12);

    default:
      // Formato genérico
      return numbers.substring(0, 15);
  }
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

// Lista de códigos de país com ícones do Iconify
const countryCodes = [
  { code: "+55", country: "Brasil", flag: "twemoji:flag-brazil", placeholder: "(11) 98765-4321" },
  { code: "+1", country: "EUA", flag: "twemoji:flag-united-states", placeholder: "(123) 456-7890" },
  { code: "+54", country: "Argentina", flag: "twemoji:flag-argentina", placeholder: "(11) 1234-5678" },
  { code: "+56", country: "Chile", flag: "twemoji:flag-chile", placeholder: "(2) 1234-5678" },
  { code: "+57", country: "Colômbia", flag: "twemoji:flag-colombia", placeholder: "(123) 456-7890" },
  { code: "+58", country: "Venezuela", flag: "twemoji:flag-venezuela", placeholder: "(212) 123-4567" },
  { code: "+51", country: "Peru", flag: "twemoji:flag-peru", placeholder: "(123) 456-789" },
  { code: "+598", country: "Uruguai", flag: "twemoji:flag-uruguay", placeholder: "(12) 345-6789" },
  { code: "+595", country: "Paraguai", flag: "twemoji:flag-paraguay", placeholder: "(123) 456-789" },
  { code: "+52", country: "México", flag: "twemoji:flag-mexico", placeholder: "(55) 1234-5678" },
  { code: "+351", country: "Portugal", flag: "twemoji:flag-portugal", placeholder: "912 345 678" },
  { code: "+34", country: "Espanha", flag: "twemoji:flag-spain", placeholder: "612 345 678" },
  { code: "+33", country: "França", flag: "twemoji:flag-france", placeholder: "6 12 34 56 78" },
  { code: "+49", country: "Alemanha", flag: "twemoji:flag-germany", placeholder: "151 2345 6789" },
  { code: "+39", country: "Itália", flag: "twemoji:flag-italy", placeholder: "312 345 6789" },
  { code: "+44", country: "Reino Unido", flag: "twemoji:flag-united-kingdom", placeholder: "7700 900123" },
];

// Tipo para as opções do select
interface CountryOption {
  value: string;
  label: string;
  flag: string;
  country: string;
  placeholder: string;
}

// Transformar countryCodes em opções para o react-select
const countryOptions: CountryOption[] = countryCodes.map(c => ({
  value: c.code,
  label: `${c.code} ${c.country}`,
  flag: c.flag,
  country: c.country,
  placeholder: c.placeholder
}));

// Componente customizado para renderizar as opções com bandeiras
const CountryOption = (props: any) => (
  <components.Option {...props}>
    <div className="flex items-center gap-2">
      <Icon icon={props.data.flag} width={20} height={20} />
      <span className="font-medium">{props.data.value}</span>
    </div>
  </components.Option>
);

// Componente customizado para renderizar o valor selecionado
const CountrySingleValue = (props: any) => (
  <components.SingleValue {...props}>
    <div className="flex items-center gap-2">
      <Icon icon={props.data.flag} width={20} height={20} />
      <span className="font-medium">{props.data.value}</span>
    </div>
  </components.SingleValue>
);

// Estilos customizados para o ReactSelect
const customSelectStyles = {
  control: (base: any) => ({
    ...base,
    borderRadius: '0.75rem',
    borderColor: '#d1d5db',
    fontSize: '0.875rem',
    minHeight: '42px',
    '&:hover': {
      borderColor: '#9ca3af'
    }
  }),
  menu: (base: any) => ({
    ...base,
    borderRadius: '0.75rem',
    fontSize: '0.875rem',
    zIndex: 9999
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isSelected ? '#10b981' : state.isFocused ? '#f3f4f6' : 'white',
    color: state.isSelected ? 'white' : '#1f2937',
    '&:active': {
      backgroundColor: '#10b981'
    }
  }),
  menuPortal: (base: any) => ({
    ...base,
    zIndex: 9999
  })
};

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

interface StoragePrice {
  id: string;
  nickname: string | null;
  unit_amount: number | null;
  currency: string;
  recurring: {
    interval: string;
    interval_count: number;
  } | null;
  metadata: any;
}

interface StorageProductData {
  product: {
    id: string;
    name: string | null;
    description: string | null;
    metadata: any;
  };
  prices: StoragePrice[];
}

interface CurrentPlanData {
  product: {
    id: string;
    name: string | null;
    description: string | null;
    metadata: any;
  };
  prices: StoragePrice[];
  subscription: {
    id: string;
    status: string;
    current_period_end: number;
    items: {
      id: string;
      price: {
        id: string;
        unit_amount: number | null;
        recurring: {
          interval: string;
          interval_count: number;
        } | null;
      };
      quantity: number | null;
    }[];
  } | null;
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

  // Storage product from Stripe
  const [storageProduct, setStorageProduct] = useState<StorageProductData | null>(null);
  const [loadingStorage, setLoadingStorage] = useState(true);

  // Current plan from Stripe
  const [currentPlan, setCurrentPlan] = useState<CurrentPlanData | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);

  // Invoices from Stripe
  const [stripeInvoices, setStripeInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [selectedStripeInvoice, setSelectedStripeInvoice] = useState<any>(null);
  const [currentInvoicePage, setCurrentInvoicePage] = useState(1);
  const invoicesPerPage = 10;

  // Customer data from Stripe
  const [loadingCustomer, setLoadingCustomer] = useState(true);

  // dados do cliente
  const [customer, setCustomer] = useState<Customer>({
    name: "",
    email: "",
    phone: "",
    countryCode: "+55",
    company: "",
    documentType: "cnpj",
    document: ""
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

  // Carregar produto de armazenamento do Stripe
  useEffect(() => {
    async function loadStorageProduct() {
      try {
        const data = await getStorageProduct();
        console.log('📦 Storage Product carregado:', data);
        console.log('📋 Prices:', data.prices.map(p => ({ id: p.id, nickname: p.nickname, amount: p.unit_amount })));
        setStorageProduct(data);
      } catch (error) {
        console.error('Erro ao carregar produto de armazenamento:', error);
      } finally {
        setLoadingStorage(false);
      }
    }
    loadStorageProduct();
  }, []);

  // Carregar plano atual do Stripe
  useEffect(() => {
    async function loadCurrentPlan() {
      try {
        const data = await getCurrentPlan();
        setCurrentPlan(data);
      } catch (error) {
        console.error('Erro ao carregar plano atual:', error);
      } finally {
        setLoadingPlan(false);
      }
    }
    loadCurrentPlan();
  }, []);

  // Carregar faturas do Stripe
  useEffect(() => {
    async function loadInvoices() {
      try {
        const data = await getInvoices();
        setStripeInvoices(data.invoices);
      } catch (error) {
        console.error('Erro ao carregar faturas:', error);
      } finally {
        setLoadingInvoices(false);
      }
    }
    loadInvoices();
  }, []);

  // Carregar dados do cliente do Stripe
  useEffect(() => {
    async function loadCustomerData() {
      try {
        const data = await getCustomerData();

        // Parse phone to extract country code
        let phone = data.customer.phone || '';
        let countryCode = '+55';

        if (phone) {
          // Remove non-numeric characters
          phone = phone.replace(/\D/g, '');

          // Check if it starts with country code
          if (phone.startsWith('55')) {
            countryCode = '+55';
            phone = phone.substring(2);
          }
        }

        setCustomer({
          name: data.customer.name || '',
          email: data.customer.email || '',
          phone: phone,
          countryCode: countryCode,
          company: data.customer.metadata?.company || '',
          documentType: (data.customer.metadata?.documentType as 'cpf' | 'cnpj') || 'cnpj',
          document: data.customer.metadata?.document || '',
        });
      } catch (error) {
        console.error('Erro ao carregar dados do cliente:', error);
      } finally {
        setLoadingCustomer(false);
      }
    }
    loadCustomerData();
  }, []);

  // Atualizar tempCustomer quando customer mudar
  useEffect(() => {
    setTempCustomer(customer);
  }, [customer]);

  // Carregar cupom aplicado da subscription
  useEffect(() => {
    const subscription = currentPlan?.subscription as any;
    if (subscription?.discount) {
      const discount = subscription.discount;
      if (discount.coupon) {
        setCoupon({
          code: discount.coupon.id,
          percentOff: discount.coupon.percent_off || 0
        });
      }
    }
  }, [currentPlan]);

  // Carregar métodos de pagamento do Stripe
  useEffect(() => {
    async function loadPaymentMethods() {
      try {
        const response = await fetch('/api/stripe/payment-methods');
        const data = await response.json();

        if (data.paymentMethods) {
          setPaymentMethods(data.paymentMethods);
        }
      } catch (error) {
        console.error('Erro ao carregar métodos de pagamento:', error);
      }
    }
    loadPaymentMethods();
  }, []);

  const [addPaymentOpen, setAddPaymentOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<'select' | 'card' | 'boleto'>('select');
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
    // Se temos dados reais da subscription do Stripe, calcular a partir deles
    if (currentPlan?.subscription?.items) {
      let total = 0;

      for (const item of currentPlan.subscription.items) {
        const amount = (item.price.unit_amount || 0) / 100; // Converter de centavos para reais
        const quantity = item.quantity || 1;
        total += amount * quantity;
      }

      // Aplicar desconto se houver cupom
      let discount = 0;
      let totalWithDiscount = total;

      const subscription = currentPlan.subscription as any;
      if (subscription.discount?.coupon?.percent_off) {
        discount = total * (subscription.discount.coupon.percent_off / 100);
        totalWithDiscount = total - discount;
      }

      return {
        plan: 0,
        whats: 0,
        ia: 0,
        bird: 0,
        storage: 0,
        total: total,
        discount: discount,
        totalWithDiscount: totalWithDiscount,
        storageGB: 0,
      };
    }

    // Se não há subscription, retornar valores zerados
    if (!currentPlan?.subscription) {
      return {
        plan: 0,
        whats: 0,
        ia: 0,
        bird: 0,
        storage: 0,
        total: 0,
        discount: 0,
        totalWithDiscount: 0,
        storageGB: 0,
      };
    }

    // Fallback para cálculo local se não tiver dados do Stripe
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
    const total = planCostMonthly + whats + ia + bird + storage;

    return {
      plan: planCostMonthly,
      whats,
      ia,
      bird,
      storage,
      total: total,
      discount: 0,
      totalWithDiscount: total,
      storageGB,
    };
  }, [channels, seats, plan, storagePlan, planMonthlyForTotal, currentPlan]);

  // Paginação de faturas
  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentInvoicePage - 1) * invoicesPerPage;
    const endIndex = startIndex + invoicesPerPage;
    return stripeInvoices.slice(startIndex, endIndex);
  }, [stripeInvoices, currentInvoicePage, invoicesPerPage]);

  const totalInvoicePages = Math.ceil(stripeInvoices.length / invoicesPerPage);

  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code) return;

    try {
      // Mostrar loading
      Swal.fire({
        title: 'Validando cupom...',
        html: '<div class="spinner"></div>',
        allowOutsideClick: false,
        showConfirmButton: false,
        customClass: {
          popup: 'rounded-2xl',
        }
      });

      // Aplicar cupom no Stripe
      const result = await applyCouponToSubscription(code);

      if (result.success && result.coupon) {
        setCoupon({
          code: result.coupon.id,
          percentOff: result.coupon.percent_off || 0
        });
        setCouponError(null);
        setCouponInput(""); // Limpar o input após aplicar

        // Recarregar dados da subscription
        const data = await getCurrentPlan();
        setCurrentPlan(data);

        // Fechar loading e mostrar sucesso
        await Swal.fire({
          title: 'Cupom aplicado!',
          html: `
            <div style="text-align: center;">
              <p style="margin-bottom: 10px;">O cupom <strong>${result.coupon.id}</strong> foi aplicado com sucesso!</p>
              ${result.coupon.percent_off ? `<p style="color: #10b981; font-weight: bold; font-size: 18px;">${result.coupon.percent_off}% de desconto</p>` : ''}
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'Ok',
          confirmButtonColor: '#10b981',
          customClass: {
            popup: 'rounded-2xl',
            confirmButton: 'rounded-xl px-6 py-3 font-semibold'
          }
        });
      }
    } catch (error: any) {
      setCoupon(null);
      const errorMessage = error.message || 'Cupom inválido';
      setCouponError(errorMessage);

      await Swal.fire({
        title: 'Erro!',
        text: errorMessage,
        icon: 'error',
        confirmButtonText: 'Ok',
        confirmButtonColor: '#dc2626',
        customClass: {
          popup: 'rounded-2xl',
          confirmButton: 'rounded-xl px-6 py-3 font-semibold'
        }
      });
    }
  }

  async function clearCoupon() {
    try {
      // Mostrar loading
      Swal.fire({
        title: 'Removendo cupom...',
        html: '<div class="spinner"></div>',
        allowOutsideClick: false,
        showConfirmButton: false,
        customClass: {
          popup: 'rounded-2xl',
        }
      });

      // Remover cupom no Stripe
      await removeCouponFromSubscription();

      setCoupon(null);
      setCouponInput("");
      setCouponError(null);

      // Recarregar dados da subscription
      const data = await getCurrentPlan();
      setCurrentPlan(data);

      // Mostrar sucesso
      await Swal.fire({
        title: 'Cupom removido!',
        text: 'O cupom foi removido com sucesso.',
        icon: 'success',
        confirmButtonText: 'Ok',
        confirmButtonColor: '#10b981',
        customClass: {
          popup: 'rounded-2xl',
          confirmButton: 'rounded-xl px-6 py-3 font-semibold'
        }
      });
    } catch (error: any) {
      await Swal.fire({
        title: 'Erro!',
        text: 'Erro ao remover cupom. Tente novamente.',
        icon: 'error',
        confirmButtonText: 'Ok',
        confirmButtonColor: '#dc2626',
        customClass: {
          popup: 'rounded-2xl',
          confirmButton: 'rounded-xl px-6 py-3 font-semibold'
        }
      });
    }
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

  async function setDefaultPayment(id: string) {
    try {
      // Mostrar loading
      Swal.fire({
        title: 'Definindo método padrão...',
        html: '<div class="spinner"></div>',
        allowOutsideClick: false,
        showConfirmButton: false,
        customClass: {
          popup: 'rounded-2xl',
        }
      });

      const response = await fetch('/api/stripe/payment-methods', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paymentMethodId: id }),
      });

      if (!response.ok) {
        throw new Error('Erro ao definir método padrão');
      }

      // Recarregar métodos de pagamento
      const loadResponse = await fetch('/api/stripe/payment-methods');
      const data = await loadResponse.json();
      if (data.paymentMethods) {
        setPaymentMethods(data.paymentMethods);
      }

      await Swal.fire({
        title: 'Sucesso!',
        text: 'Método de pagamento padrão atualizado.',
        icon: 'success',
        confirmButtonText: 'Ok',
        confirmButtonColor: '#10b981',
        customClass: {
          popup: 'rounded-2xl',
          confirmButton: 'rounded-xl px-6 py-3 font-semibold'
        }
      });
    } catch (error) {
      console.error('Erro ao definir método padrão:', error);
      await Swal.fire({
        title: 'Erro!',
        text: 'Erro ao definir método padrão. Tente novamente.',
        icon: 'error',
        confirmButtonText: 'Ok',
        confirmButtonColor: '#dc2626',
        customClass: {
          popup: 'rounded-2xl',
          confirmButton: 'rounded-xl px-6 py-3 font-semibold'
        }
      });
    }
  }

  async function removePaymentMethod(id: string) {
    const result = await Swal.fire({
      title: 'Remover método?',
      text: 'Tem certeza que deseja remover este método de pagamento?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, remover',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'rounded-xl px-6 py-3 font-semibold',
        cancelButton: 'rounded-xl px-6 py-3 font-semibold'
      }
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      // Mostrar loading
      Swal.fire({
        title: 'Removendo...',
        html: '<div class="spinner"></div>',
        allowOutsideClick: false,
        showConfirmButton: false,
        customClass: {
          popup: 'rounded-2xl',
        }
      });

      const response = await fetch(`/api/stripe/payment-methods?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erro ao remover método de pagamento');
      }

      // Recarregar métodos de pagamento
      const loadResponse = await fetch('/api/stripe/payment-methods');
      const data = await loadResponse.json();
      if (data.paymentMethods) {
        setPaymentMethods(data.paymentMethods);
      }

      await Swal.fire({
        title: 'Removido!',
        text: 'Método de pagamento removido com sucesso.',
        icon: 'success',
        confirmButtonText: 'Ok',
        confirmButtonColor: '#10b981',
        customClass: {
          popup: 'rounded-2xl',
          confirmButton: 'rounded-xl px-6 py-3 font-semibold'
        }
      });
    } catch (error) {
      console.error('Erro ao remover método de pagamento:', error);
      await Swal.fire({
        title: 'Erro!',
        text: 'Erro ao remover método de pagamento. Tente novamente.',
        icon: 'error',
        confirmButtonText: 'Ok',
        confirmButtonColor: '#dc2626',
        customClass: {
          popup: 'rounded-2xl',
          confirmButton: 'rounded-xl px-6 py-3 font-semibold'
        }
      });
    }
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
              {loadingCustomer ? (
                <div className="space-y-2">
                  <Skeleton width="w-64" height="h-4" />
                  <Skeleton width="w-80" height="h-4" />
                </div>
              ) : (
                <div className="space-y-1 text-sm text-neutral-600">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{customer.name || 'Nome não informado'}</span>
                    {customer.company && <span>• {customer.company}</span>}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                    <span>{customer.email || 'Email não informado'}</span>
                    {customer.phone && <span>{customer.countryCode} {customer.phone}</span>}
                    {customer.document && <span>{customer.documentType.toUpperCase()}: {customer.document}</span>}
                  </div>
                </div>
              )}
            </div>
            <div className="text-left lg:text-right space-y-1">
              <div className="text-sm text-neutral-600">Total mensal estimado</div>
              {loadingPlan ? (
                <Skeleton width="w-32" height="h-8" />
              ) : (
                <>
                  {totals.discount > 0 ? (
                    <>
                      <div className="text-sm text-neutral-500 line-through">{money(totals.total)}</div>
                      <div className="text-2xl font-semibold text-green-600">{money(totals.totalWithDiscount)}</div>
                      <div className="text-xs text-green-600 font-medium">
                        Economia de {money(totals.discount)}
                      </div>
                    </>
                  ) : (
                    <div className="text-2xl font-semibold">{money(totals.total)}</div>
                  )}
                </>
              )}
              <button
                onClick={() => setEditCustomerOpen(true)}
                disabled={loadingCustomer}
                className="text-sm text-krooa-blue hover:text-krooa-dark underline font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
              {loadingPlan ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 space-y-3">
                      <Skeleton width="w-32" height="h-6" />
                      <Skeleton width="w-64" height="h-4" />
                      <Skeleton width="w-48" height="h-4" />
                    </div>
                    <div className="space-y-2">
                      <div className="rounded-xl border border-neutral-200 p-3">
                        <Skeleton width="w-24" height="h-4" className="mb-2" />
                        <Skeleton width="w-32" height="h-8" />
                      </div>
                      <Skeleton width="w-full" height="h-10" rounded="rounded-xl" />
                      <Skeleton width="w-full" height="h-10" rounded="rounded-xl" />
                    </div>
                  </div>
                </div>
              ) : currentPlan && currentPlan.subscription ? (
                <div className="mb-4 flex items-start justify-between gap-6">
                  <div className="grow">
                    <div className="text-lg font-semibold">Plano atual</div>
                    <div className="text-sm text-neutral-600">
                      {currentPlan.product.name || 'Plano'} ·
                      {currentPlan.subscription.items[0]?.price.recurring?.interval === 'year' ? ' Anual' :
                       currentPlan.subscription.items[0]?.price.recurring?.interval === 'month' ? ' Mensal' :
                       ' Personalizado'}
                      {currentPlan.product.metadata?.whatsapp_slots && ` · Inclui ${currentPlan.product.metadata.whatsapp_slots} WhatsApp`}
                      {currentPlan.product.metadata?.birdid_seats && `, ${currentPlan.product.metadata.birdid_seats} BirdID`}
                      {currentPlan.product.metadata?.storage_gb && `, ${currentPlan.product.metadata.storage_gb} GB de storage`}
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="text-sm">
                        <span className="text-neutral-500">Próxima cobrança:</span>{" "}
                        <span className="font-medium">
                          {currentPlan.subscription.current_period_end
                            ? fmtDate(new Date(currentPlan.subscription.current_period_end * 1000))
                            : 'Data não disponível'}
                        </span>
                      </div>
                    </div>
                    {/* Seção de cupom - sempre visível */}
                    <div className="mt-3">
                      {(currentPlan.subscription as any).discount?.coupon ? (
                        <div className="flex items-center gap-2">
                          <div className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 border border-green-200 px-2.5 py-1.5">
                            <Icon icon="mdi:ticket-percent" className="text-green-600" width={16} />
                            <span className="text-xs font-semibold text-green-800">
                              Cupom "{(currentPlan.subscription as any).discount.coupon.id}"
                            </span>
                            {(currentPlan.subscription as any).discount.coupon.percent_off && (
                              <span className="text-xs text-green-600">
                                ({(currentPlan.subscription as any).discount.coupon.percent_off}% OFF)
                              </span>
                            )}
                          </div>
                          {!(currentPlan?.subscription as any)?.cancel_at_period_end && (
                            <button
                              onClick={clearCoupon}
                              className="text-xs text-red-600 hover:text-red-800 font-medium underline transition-colors"
                            >
                              Remover
                            </button>
                          )}
                        </div>
                      ) : (
                        !((currentPlan?.subscription as any)?.cancel_at_period_end) && (
                          <div>
                            <div className="flex gap-2 items-center max-w-md">
                              <Input
                                placeholder="Digite o código do cupom"
                                value={couponInput}
                                onChange={(e) => setCouponInput(e.target.value)}
                                className="text-xs"
                              />
                              <Button onClick={applyCoupon} variant="secondary" size="sm">
                                Aplicar
                              </Button>
                            </div>
                            {couponError && (
                              <div className="mt-1 text-xs text-rose-600">{couponError}</div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 space-y-2">
                    <div className="rounded-xl border border-neutral-200 p-3 text-sm">
                      <div className="text-neutral-600">Valor do plano</div>
                      {(currentPlan.subscription as any).discount?.coupon ? (
                        <>
                          <div className="text-sm text-neutral-500 line-through">
                            {currentPlan.subscription.items[0]?.price.unit_amount ? (
                              <>
                                {money((currentPlan.subscription.items[0].price.unit_amount / 100))}
                                {currentPlan.subscription.items[0].price.recurring?.interval === 'year' && ' / ano'}
                                {currentPlan.subscription.items[0].price.recurring?.interval === 'month' && ' / mês'}
                              </>
                            ) : (
                              'N/A'
                            )}
                          </div>
                          <div className="text-xl font-semibold text-green-600">
                            {currentPlan.subscription.items[0]?.price.unit_amount && (currentPlan.subscription as any).discount.coupon.percent_off ? (
                              <>
                                {money((currentPlan.subscription.items[0].price.unit_amount / 100) * (1 - (currentPlan.subscription as any).discount.coupon.percent_off / 100))}
                                {currentPlan.subscription.items[0].price.recurring?.interval === 'year' && (
                                  <span className="text-xs font-normal text-neutral-500"> / ano</span>
                                )}
                                {currentPlan.subscription.items[0].price.recurring?.interval === 'month' && (
                                  <span className="text-xs font-normal text-neutral-500"> / mês</span>
                                )}
                              </>
                            ) : (
                              money((currentPlan.subscription.items[0]?.price.unit_amount || 0) / 100)
                            )}
                          </div>
                          <div className="text-xs text-green-600 font-medium">
                            Economia de {money((currentPlan.subscription.items[0]?.price.unit_amount || 0) / 100 * ((currentPlan.subscription as any).discount.coupon.percent_off || 0) / 100)}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-xl font-semibold">
                            {currentPlan.subscription.items[0]?.price.unit_amount ? (
                              <>
                                {money((currentPlan.subscription.items[0].price.unit_amount / 100))}
                                {currentPlan.subscription.items[0].price.recurring?.interval === 'year' && (
                                  <span className="text-xs font-normal text-neutral-500"> / ano</span>
                                )}
                                {currentPlan.subscription.items[0].price.recurring?.interval === 'month' && (
                                  <span className="text-xs font-normal text-neutral-500"> / mês</span>
                                )}
                              </>
                            ) : (
                              'N/A'
                            )}
                          </div>
                          {currentPlan.subscription.items[0]?.price.recurring?.interval === 'year' && currentPlan.subscription.items[0]?.price.unit_amount && (
                            <div className="text-xs text-neutral-500">
                              equiv. {money((currentPlan.subscription.items[0].price.unit_amount / 100) / 12)}/mês
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="space-y-2">
                      {!(currentPlan?.subscription as any)?.cancel_at_period_end ? (
                        <>
                          <button
                            onClick={() => setChangePlanConfirm(true)}
                            className="w-full rounded-xl bg-krooa-blue px-3 py-2 text-sm font-semibold text-white hover:bg-krooa-dark transition-colors"
                          >
                            Alterar plano
                          </button>
                          <button
                            onClick={async () => {
                              const result = await Swal.fire({
                                title: 'Cancelar Plano',
                                html: `
                                  <div style="text-align: left; padding: 10px;">
                                    <p style="margin-bottom: 15px; color: #dc2626; font-weight: 600;">Atenção!</p>
                                    <p style="margin-bottom: 15px;">Ao cancelar o plano:</p>
                                    <ul style="text-align: left; color: #6b7280; font-size: 14px; margin-left: 20px;">
                                      <li style="margin-bottom: 8px;">• Você manterá acesso até o final do período pago</li>
                                      <li style="margin-bottom: 8px;">• Não haverá novas cobranças</li>
                                      <li style="margin-bottom: 8px;">• Você pode reativar a qualquer momento</li>
                                    </ul>
                                    <p style="margin-top: 15px; color: #6b7280; font-size: 14px;">Tem certeza que deseja continuar?</p>
                                  </div>
                                `,
                                icon: 'warning',
                                showCancelButton: true,
                                confirmButtonText: 'Sim, cancelar plano',
                                cancelButtonText: 'Não, manter plano',
                                confirmButtonColor: '#dc2626',
                                cancelButtonColor: '#6b7280',
                                customClass: {
                                  popup: 'rounded-2xl',
                                  confirmButton: 'rounded-xl px-6 py-3 font-semibold',
                                  cancelButton: 'rounded-xl px-6 py-3 font-semibold'
                                }
                              });

                              if (!result.isConfirmed) {
                                return;
                              }

                              // Mostrar loading
                              Swal.fire({
                                title: 'Cancelando...',
                                html: '<div class="spinner"></div>',
                                allowOutsideClick: false,
                                showConfirmButton: false,
                                customClass: {
                                  popup: 'rounded-2xl',
                                }
                              });

                              try {
                                // Cancelar a subscription
                                const result = await cancelSubscription();

                                await Swal.fire({
                                  title: 'Cancelamento Agendado',
                                  html: `
                                    <div style="text-align: left; padding: 10px;">
                                      <p style="margin-bottom: 15px;">Seu plano foi agendado para cancelamento.</p>
                                      <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                                        <p style="font-weight: bold; margin-bottom: 8px;">O que isso significa?</p>
                                        <ul style="color: #6b7280; font-size: 14px; margin-left: 20px;">
                                          <li style="margin-bottom: 5px;">Você continuará com acesso até ${fmtDate(new Date(result.cancel_at * 1000))}</li>
                                          <li style="margin-bottom: 5px;">Não haverá novas cobranças após essa data</li>
                                          <li style="margin-bottom: 5px;">Você pode reativar o plano a qualquer momento</li>
                                        </ul>
                                      </div>
                                      <p style="color: #6b7280; font-size: 14px;">Obrigado por ter usado nossos serviços!</p>
                                    </div>
                                  `,
                                  icon: 'success',
                                  confirmButtonText: 'Ok',
                                  confirmButtonColor: '#059669',
                                  customClass: {
                                    popup: 'rounded-2xl',
                                    confirmButton: 'rounded-xl px-6 py-3 font-semibold'
                                  }
                                });

                                // Recarregar os dados
                                const data = await getCurrentPlan();
                                setCurrentPlan(data);
                              } catch (error) {
                                console.error('Erro ao cancelar plano:', error);
                                await Swal.fire({
                                  title: 'Erro!',
                                  text: 'Erro ao cancelar plano. Tente novamente.',
                                  icon: 'error',
                                  confirmButtonText: 'Ok',
                                  confirmButtonColor: '#dc2626',
                                  customClass: {
                                    popup: 'rounded-2xl',
                                    confirmButton: 'rounded-xl px-6 py-3 font-semibold'
                                  }
                                });
                              }
                            }}
                            className="w-full rounded-xl px-3 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Cancelar plano
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 mb-2">
                            <div className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <div className="flex-1">
                                <p className="text-xs font-semibold text-amber-800 mb-1">Plano cancelado</p>
                                <p className="text-xs text-amber-700">
                                  Acesso até {currentPlan.subscription.current_period_end
                                    ? fmtDate(new Date(currentPlan.subscription.current_period_end * 1000))
                                    : 'Data não disponível'}
                                </p>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              const result = await Swal.fire({
                                title: 'Reativar Plano',
                                html: `
                                  <div style="text-align: left; padding: 10px;">
                                    <p style="margin-bottom: 15px;">Deseja reativar seu plano?</p>
                                    <ul style="text-align: left; color: #6b7280; font-size: 14px; margin-left: 20px;">
                                      <li style="margin-bottom: 8px;">• Seu plano continuará ativo normalmente</li>
                                      <li style="margin-bottom: 8px;">• As cobranças voltarão a ocorrer no próximo ciclo</li>
                                      <li style="margin-bottom: 8px;">• Você manterá todos os seus dados e configurações</li>
                                    </ul>
                                  </div>
                                `,
                                icon: 'question',
                                showCancelButton: true,
                                confirmButtonText: 'Sim, reativar',
                                cancelButtonText: 'Cancelar',
                                confirmButtonColor: '#10b981',
                                cancelButtonColor: '#6b7280',
                                customClass: {
                                  popup: 'rounded-2xl',
                                  confirmButton: 'rounded-xl px-6 py-3 font-semibold',
                                  cancelButton: 'rounded-xl px-6 py-3 font-semibold'
                                }
                              });

                              if (!result.isConfirmed) {
                                return;
                              }

                              // Mostrar loading
                              Swal.fire({
                                title: 'Reativando...',
                                html: '<div class="spinner"></div>',
                                allowOutsideClick: false,
                                showConfirmButton: false,
                                customClass: {
                                  popup: 'rounded-2xl',
                                }
                              });

                              try {
                                // Reativar a subscription
                                await reactivateSubscription();

                                await Swal.fire({
                                  title: 'Plano Reativado!',
                                  html: `
                                    <div style="text-align: center;">
                                      <p style="margin-bottom: 10px;">Seu plano foi reativado com sucesso!</p>
                                      <p style="color: #6b7280; font-size: 14px;">As cobranças voltarão a ocorrer normalmente no próximo ciclo.</p>
                                    </div>
                                  `,
                                  icon: 'success',
                                  confirmButtonText: 'Ok',
                                  confirmButtonColor: '#10b981',
                                  customClass: {
                                    popup: 'rounded-2xl',
                                    confirmButton: 'rounded-xl px-6 py-3 font-semibold'
                                  }
                                });

                                // Recarregar os dados
                                const data = await getCurrentPlan();
                                setCurrentPlan(data);
                              } catch (error: any) {
                                console.error('Erro ao reativar plano:', error);
                                await Swal.fire({
                                  title: 'Erro!',
                                  text: error.message || 'Erro ao reativar plano. Tente novamente.',
                                  icon: 'error',
                                  confirmButtonText: 'Ok',
                                  confirmButtonColor: '#dc2626',
                                  customClass: {
                                    popup: 'rounded-2xl',
                                    confirmButton: 'rounded-xl px-6 py-3 font-semibold'
                                  }
                                });
                              }
                            }}
                            className="w-full rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
                          >
                            Reativar plano
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="max-w-md mx-auto">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum plano ativo</h3>
                    <p className="text-sm text-gray-600 mb-6">
                      Você ainda não possui um plano ativo. Contrate agora e aproveite todos os recursos da plataforma.
                    </p>
                    <button
                      onClick={() => setChangePlanConfirm(true)}
                      className="rounded-xl bg-krooa-green px-6 py-3 text-sm font-bold text-krooa-dark hover:shadow-lg hover:scale-105 transition-all shadow-md"
                    >
                      Contratar Plano
                    </button>
                  </div>
                </div>
              )}

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
                  {loadingPlan ? (
                    <div className="bg-gray-200 w-64 h-4 rounded mt-1" style={{animation: 'none'}}></div>
                  ) : currentPlan?.subscription ? (
                    (() => {
                      // Buscar o item de storage na subscription
                      const storageProductId = 'prod_T9AfZhzca9pgNW';
                      const storageItem = currentPlan.subscription.items.find(
                        (item: any) => {
                          const productId = typeof item.price.product === 'string'
                            ? item.price.product
                            : item.price.product?.id;
                          return productId === storageProductId;
                        }
                      );

                      if (storageItem) {
                        const priceName = (storageItem as any).price.nickname || 'Plano de armazenamento';
                        const priceAmount = storageItem.price.unit_amount ? (storageItem.price.unit_amount / 100) : 0;

                        return (
                          <p className="text-sm text-gray-600 mt-1">
                            Plano atual: <span className="font-semibold">{priceName}</span>
                            {priceAmount > 0 && (
                              <span className="ml-2 text-green-600 font-medium">
                                {money(priceAmount)}/mês
                              </span>
                            )}
                          </p>
                        );
                      } else {
                        return (
                          <p className="text-sm text-gray-600 mt-1">
                            Plano atual: <span className="font-semibold">Nenhum plano de armazenamento contratado</span>
                          </p>
                        );
                      }
                    })()
                  ) : (
                    <p className="text-sm text-gray-600 mt-1">
                      Plano atual: <span className="font-semibold">{STORAGE_PLANS[storagePlan].label}</span> - {fmtGB(totals.storageGB)}
                    </p>
                  )}
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
              {currentPlan?.subscription && currentPlan.subscription.current_period_end && (
                <div className="text-sm text-neutral-600">
                  Próxima cobrança: {fmtDate(new Date(currentPlan.subscription.current_period_end * 1000))}
                </div>
              )}
            </div>
            {loadingInvoices ? (
              <SkeletonTable rows={5} columns={7} />
            ) : stripeInvoices.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="bg-neutral-50 text-left text-neutral-600">
                    <tr>
                      <th className="px-2 sm:px-4 py-2 text-xs sm:text-sm">Número</th>
                      <th className="px-2 sm:px-4 py-2 text-xs sm:text-sm">Data</th>
                      <th className="px-2 sm:px-4 py-2 text-xs sm:text-sm">Vencimento</th>
                      <th className="px-2 sm:px-4 py-2 text-xs sm:text-sm">Resumo</th>
                      <th className="px-2 sm:px-4 py-2 text-xs sm:text-sm">Valor</th>
                      <th className="px-2 sm:px-4 py-2 text-xs sm:text-sm">Status</th>
                      <th className="px-2 sm:px-4 py-2 text-right text-xs sm:text-sm">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-t border-gray-200 hover:bg-gray-50/50">
                      <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm">{invoice.number || invoice.id}</td>
                      <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm">{fmtDate(new Date(invoice.created * 1000))}</td>
                      <td className="px-2 sm:px-4 py-2 text-xs sm:text-sm">
                        {invoice.due_date ? fmtDate(new Date(invoice.due_date * 1000)) : '-'}
                      </td>
                      <td className="px-2 sm:px-4 py-2">
                        <div className="text-xs text-neutral-600">
                          {invoice.lines.length} {invoice.lines.length === 1 ? "item" : "itens"}
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 font-medium text-xs sm:text-sm">
                        {money(invoice.amount_paid / 100)}
                      </td>
                      <td className="px-2 sm:px-4 py-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium w-fit ${
                          invoice.status === "paid" ? "bg-emerald-50 text-emerald-700" :
                          invoice.status === "open" ? "bg-amber-50 text-amber-700" :
                          invoice.status === "void" ? "bg-neutral-100 text-neutral-700" :
                          invoice.status === "draft" ? "bg-gray-100 text-gray-700" :
                          "bg-rose-50 text-rose-700"
                        }`}>
                          {invoice.status === "paid" ? "Pago" :
                           invoice.status === "open" ? "Em aberto" :
                           invoice.status === "void" ? "Cancelado" :
                           invoice.status === "draft" ? "Rascunho" :
                           invoice.status === "uncollectible" ? "Não cobrável" :
                           invoice.status}
                        </span>
                      </td>
                      <td className="px-2 sm:px-4 py-2 text-right">
                        <div className="flex flex-col lg:flex-row gap-1 lg:gap-2 justify-end">
                          <button
                            onClick={() => setSelectedStripeInvoice(invoice)}
                            className="rounded-xl bg-krooa-blue px-3 py-1.5 text-xs sm:text-sm text-white font-semibold hover:bg-krooa-dark transition-colors text-center"
                          >
                            Detalhes
                          </button>
                          {invoice.hosted_invoice_url && (
                            <a
                              href={invoice.hosted_invoice_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-xl bg-gray-500 px-3 py-1.5 text-xs sm:text-sm text-white font-medium hover:bg-gray-600 transition-colors text-center"
                            >
                              Ver Online
                            </a>
                          )}
                          {invoice.invoice_pdf && (
                            <a
                              href={invoice.invoice_pdf}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-xl bg-neutral-600 px-3 py-1.5 text-xs sm:text-sm text-white font-medium hover:bg-neutral-700 transition-colors text-center"
                            >
                              PDF
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            ) : (
              <div className="text-center py-12 rounded-2xl border border-neutral-200 bg-white">
                <p className="text-gray-500">Nenhuma fatura encontrada</p>
              </div>
            )}

            {/* Paginação */}
            {stripeInvoices.length > invoicesPerPage && (
              <div className="flex items-center justify-between px-4 py-3 bg-white rounded-2xl border border-neutral-200">
                <div className="text-sm text-neutral-600">
                  Mostrando {((currentInvoicePage - 1) * invoicesPerPage) + 1} a {Math.min(currentInvoicePage * invoicesPerPage, stripeInvoices.length)} de {stripeInvoices.length} faturas
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentInvoicePage(prev => Math.max(1, prev - 1))}
                    disabled={currentInvoicePage === 1}
                    className="rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                  >
                    Anterior
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalInvoicePages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentInvoicePage(page)}
                        className={`rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                          currentInvoicePage === page
                            ? 'bg-krooa-blue text-white'
                            : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentInvoicePage(prev => Math.min(totalInvoicePages, prev + 1))}
                    disabled={currentInvoicePage === totalInvoicePages}
                    className="rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
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

            {paymentMethods.length > 0 ? (
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
                        <div className="font-medium capitalize">
                          {method.type === "card" && (method as any).card ? (
                            `${(method as any).card.brand} ****${(method as any).card.last4}`
                          ) : method.type === "card" ? (
                            `${(method as any).brand || 'Cartão'} ****${(method as any).last4 || '****'}`
                          ) : (
                            "Boleto"
                          )}
                        </div>
                        {(method as any).card?.exp_month && (method as any).card?.exp_year && (
                          <div className="text-xs text-gray-500">
                            Validade: {String((method as any).card.exp_month).padStart(2, '0')}/{(method as any).card.exp_year}
                          </div>
                        )}
                        {method.isDefault && (
                          <span className="text-xs text-emerald-600 font-semibold">✓ Método padrão</span>
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
                      {!method.isDefault && (
                        <button
                          onClick={() => removePaymentMethod(method.id)}
                          className="rounded-xl bg-gray-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-600 transition-colors"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            ) : (
              <div className="text-center py-12 rounded-2xl border border-neutral-200 bg-white">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-gray-900 font-semibold mb-1">Nenhum método de pagamento</p>
                    <p className="text-sm text-gray-500">Adicione um cartão ou configure o boleto para começar</p>
                  </div>
                  <button
                    onClick={() => setAddPaymentOpen(true)}
                    className="mt-2 rounded-xl bg-krooa-blue px-6 py-2.5 text-sm font-semibold text-white hover:bg-krooa-dark transition-colors"
                  >
                    Adicionar Método
                  </button>
                </div>
              </div>
            )}

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
            {loadingStorage ? (
              <SkeletonList items={3} />
            ) : storageProduct && storageProduct.product ? (
              <>
                {storageProduct.product.description && (
                  <p className="text-sm text-gray-700 mb-4">
                    {storageProduct.product.description}
                  </p>
                )}

                {/* Opções de armazenamento */}
                <div className="space-y-3">
                  {storageProduct.prices
                    .sort((a, b) => (b.unit_amount || 0) - (a.unit_amount || 0))
                    .map((price) => {
                      const priceAmount = price.unit_amount ? price.unit_amount / 100 : 0;
                      const priceName = price.nickname || price.metadata?.name || 'Plano sem nome';
                      const priceDescription = price.metadata?.description || '';
                      const isPopular = price.metadata?.popular === 'true';
                      const badge = price.metadata?.badge || '';

                      // Verificar se este é o plano atual
                      const storageProductId = 'prod_T9AfZhzca9pgNW';
                      const currentStorageItem = currentPlan?.subscription?.items.find(
                        (item: any) => {
                          const productId = typeof item.price.product === 'string'
                            ? item.price.product
                            : item.price.product?.id;
                          return productId === storageProductId;
                        }
                      );
                      const isCurrentPlan = (currentStorageItem as any)?.price.id === price.id;

                      return (
                        <button
                          key={price.id}
                          onClick={async () => {
                            const result = await Swal.fire({
                              title: 'Alterar Armazenamento',
                              html: `
                                <div style="text-align: left; padding: 10px;">
                                  <p style="margin-bottom: 15px;">Você está prestes a alterar para:</p>
                                  <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                                    <p style="font-weight: bold; font-size: 18px; margin-bottom: 5px;">${priceName}</p>
                                    <p style="font-size: 24px; color: #059669; font-weight: bold;">${money(priceAmount)}</p>
                                    ${price.recurring ? `<p style="font-size: 14px; color: #6b7280;">por ${price.recurring.interval === 'month' ? 'mês' : 'ano'}</p>` : ''}
                                  </div>
                                  ${priceDescription ? `<p style="color: #6b7280; font-size: 14px;">${priceDescription}</p>` : ''}
                                </div>
                              `,
                              icon: 'question',
                              showCancelButton: true,
                              confirmButtonText: 'Sim, alterar!',
                              cancelButtonText: 'Cancelar',
                              confirmButtonColor: '#059669',
                              cancelButtonColor: '#6b7280',
                              customClass: {
                                popup: 'rounded-2xl',
                                confirmButton: 'rounded-xl px-6 py-3 font-semibold',
                                cancelButton: 'rounded-xl px-6 py-3 font-semibold'
                              }
                            });

                            if (!result.isConfirmed) {
                              return;
                            }

                            // Mostrar loading
                            Swal.fire({
                              title: 'Processando...',
                              html: 'Aguarde enquanto processamos sua solicitação.',
                              allowOutsideClick: false,
                              allowEscapeKey: false,
                              didOpen: () => {
                                Swal.showLoading();
                              }
                            });

                            try {
                              // Adicionar addon de armazenamento à subscription (incluindo plano gratuito)
                              await addStorageAddon(price.id);
                              await Swal.fire({
                                  title: 'Sucesso!',
                                  text: 'Plano de armazenamento atualizado com sucesso!',
                                  icon: 'success',
                                  confirmButtonText: 'Ok',
                                  confirmButtonColor: '#059669',
                                  customClass: {
                                    popup: 'rounded-2xl',
                                    confirmButton: 'rounded-xl px-6 py-3 font-semibold'
                                  }
                                });

                              // Recarregar os dados
                              const data = await getCurrentPlan();
                              setCurrentPlan(data);
                              setAddStorageOpen(false);
                            } catch (error) {
                              console.error('Erro ao alterar plano:', error);
                              await Swal.fire({
                                title: 'Erro!',
                                text: 'Erro ao alterar plano de armazenamento. Tente novamente.',
                                icon: 'error',
                                confirmButtonText: 'Ok',
                                confirmButtonColor: '#dc2626',
                                customClass: {
                                  popup: 'rounded-2xl',
                                  confirmButton: 'rounded-xl px-6 py-3 font-semibold'
                                }
                              });
                            }
                          }}
                          disabled={isCurrentPlan}
                          className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                            isCurrentPlan
                              ? 'border-gray-300 bg-gray-50 cursor-not-allowed opacity-60'
                              : 'border-gray-200 hover:border-krooa-green hover:bg-krooa-green/10'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-bold text-krooa-dark">{priceName}</div>
                              {priceDescription && (
                                <div className="text-sm text-gray-600">{priceDescription}</div>
                              )}
                              {isPopular && (
                                <div className="inline-flex items-center gap-1 mt-1 rounded-full bg-krooa-green px-2 py-0.5 text-xs font-bold text-krooa-dark">
                                  MAIS POPULAR
                                </div>
                              )}
                              {badge && !isPopular && (
                                <div className="text-sm text-emerald-600 font-medium mt-1">{badge}</div>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-bold text-krooa-dark">{money(priceAmount)}</div>
                              {price.recurring && (
                                <div className="text-xs text-gray-500">
                                  por {price.recurring.interval === 'month' ? 'mês' : price.recurring.interval === 'year' ? 'ano' : price.recurring.interval}
                                </div>
                              )}
                            </div>
                          </div>
                          {isCurrentPlan && (
                            <div className="mt-2 text-xs text-krooa-blue font-medium">Plano atual</div>
                          )}
                        </button>
                      );
                    })}
                </div>

                <div className="rounded-xl bg-amber-50 p-3 text-sm">
                  <p className="font-medium text-amber-900 mb-1">Importante:</p>
                  <ul className="list-disc pl-5 text-amber-700 space-y-1">
                    <li>A mudança é aplicada imediatamente</li>
                    <li>Você pode fazer downgrade a qualquer momento</li>
                    <li>Armazenamento compartilhado entre todos os canais</li>
                  </ul>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-red-500">Erro ao carregar planos de armazenamento</p>
              </div>
            )}

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
                <div style={{ width: '130px' }}>
                  <ReactSelect
                    options={countryOptions}
                    value={countryOptions.find(opt => opt.value === tempCustomer.countryCode)}
                    onChange={(newValue: SingleValue<CountryOption>) => {
                      if (newValue) {
                        // Reformatar o telefone com a nova máscara do país
                        const reformatted = formatPhone(tempCustomer.phone, newValue.value);
                        setTempCustomer({ ...tempCustomer, countryCode: newValue.value, phone: reformatted });
                      }
                    }}
                    components={{
                      Option: CountryOption,
                      SingleValue: CountrySingleValue
                    }}
                    isSearchable={true}
                    placeholder="País"
                    styles={customSelectStyles}
                    menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                    menuPosition="fixed"
                  />
                </div>
                <input
                  className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm"
                  placeholder={countryOptions.find(opt => opt.value === tempCustomer.countryCode)?.placeholder || 'Número de telefone'}
                  value={tempCustomer.phone}
                  onChange={(e) => {
                    const formatted = formatPhone(e.target.value, tempCustomer.countryCode);
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
              <Button onClick={async () => {
                try {
                  // Mostrar loading
                  Swal.fire({
                    title: 'Salvando...',
                    html: '<div class="spinner"></div>',
                    allowOutsideClick: false,
                    showConfirmButton: false,
                    customClass: {
                      popup: 'rounded-2xl',
                    }
                  });

                  // Atualizar no Stripe
                  await updateCustomerData({
                    name: tempCustomer.name,
                    email: tempCustomer.email,
                    phone: `${tempCustomer.countryCode}${tempCustomer.phone.replace(/\D/g, '')}`,
                    metadata: {
                      company: tempCustomer.company,
                      documentType: tempCustomer.documentType,
                      document: tempCustomer.document,
                    },
                  });

                  // Atualizar estado local
                  setCustomer(tempCustomer);
                  setEditCustomerOpen(false);

                  // Mostrar sucesso
                  await Swal.fire({
                    title: 'Sucesso!',
                    text: 'Dados atualizados com sucesso.',
                    icon: 'success',
                    confirmButtonText: 'Ok',
                    confirmButtonColor: '#10b981',
                    customClass: {
                      popup: 'rounded-2xl',
                      confirmButton: 'rounded-xl px-6 py-3 font-semibold'
                    }
                  });
                } catch (error) {
                  console.error('Erro ao atualizar dados:', error);
                  await Swal.fire({
                    title: 'Erro!',
                    text: 'Erro ao atualizar dados. Tente novamente.',
                    icon: 'error',
                    confirmButtonText: 'Ok',
                    confirmButtonColor: '#dc2626',
                    customClass: {
                      popup: 'rounded-2xl',
                      confirmButton: 'rounded-xl px-6 py-3 font-semibold'
                    }
                  });
                }
              }}>Salvar</Button>
            </div>
        </div>
      </Modal>

      <Modal isOpen={changePlanConfirm} title={currentPlan?.subscription ? "Alterar plano" : "Contratar plano"} onClose={() => setChangePlanConfirm(false)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-700 mb-4">
              Selecione o plano desejado:
            </p>

            {loadingPlan ? (
              <SkeletonList items={3} />
            ) : currentPlan && currentPlan.prices.length > 0 ? (
              <div className="space-y-3">
                {currentPlan.prices
                  .sort((a, b) => (a.unit_amount || 0) - (b.unit_amount || 0))
                  .map((price) => {
                    const priceAmount = price.unit_amount ? price.unit_amount / 100 : 0;
                    const priceName = price.nickname || 'Plano sem nome';
                    const interval = price.recurring?.interval;
                    const isCurrentPrice = currentPlan.subscription?.items[0]?.price.id === price.id;
                    const isPopular = price.metadata?.popular === 'true';

                    return (
                      <button
                        key={price.id}
                        onClick={async () => {
                          const action = currentPlan.subscription ? 'alterar' : 'contratar';

                          const result = await Swal.fire({
                            title: action === 'contratar' ? 'Contratar Plano' : 'Alterar Plano',
                            html: `
                              <div style="text-align: left; padding: 10px;">
                                <p style="margin-bottom: 15px;">Você está prestes a ${action} o seguinte plano:</p>
                                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                                  <p style="font-weight: bold; font-size: 18px; margin-bottom: 5px;">${priceName}</p>
                                  <p style="font-size: 24px; color: #059669; font-weight: bold;">${money(priceAmount)}</p>
                                  <p style="font-size: 14px; color: #6b7280;">${interval === 'month' ? 'por mês' : interval === 'year' ? 'por ano' : ''}</p>
                                </div>
                                <p style="color: #6b7280; font-size: 14px;">
                                  ${action === 'contratar' ? 'A cobrança será feita automaticamente todo mês.' : 'A alteração será aplicada na próxima cobrança.'}
                                </p>
                              </div>
                            `,
                            icon: 'question',
                            showCancelButton: true,
                            confirmButtonText: action === 'contratar' ? 'Sim, contratar!' : 'Sim, alterar!',
                            cancelButtonText: 'Cancelar',
                            confirmButtonColor: '#059669',
                            cancelButtonColor: '#6b7280',
                            customClass: {
                              popup: 'rounded-2xl',
                              confirmButton: 'rounded-xl px-6 py-3 font-semibold',
                              cancelButton: 'rounded-xl px-6 py-3 font-semibold'
                            }
                          });

                          if (!result.isConfirmed) {
                            return;
                          }

                          // Mostrar loading
                          Swal.fire({
                            title: 'Processando...',
                            html: 'Aguarde enquanto processamos sua solicitação.',
                            allowOutsideClick: false,
                            allowEscapeKey: false,
                            didOpen: () => {
                              Swal.showLoading();
                            }
                          });

                          try {
                            if (currentPlan.subscription) {
                              // Atualizar subscription existente
                              await updateSubscription(price.id);
                              await Swal.fire({
                                title: 'Sucesso!',
                                text: 'Plano alterado com sucesso!',
                                icon: 'success',
                                confirmButtonText: 'Ok',
                                confirmButtonColor: '#059669',
                                customClass: {
                                  popup: 'rounded-2xl',
                                  confirmButton: 'rounded-xl px-6 py-3 font-semibold'
                                }
                              });
                            } else {
                              // Criar nova subscription
                              await createSubscription(price.id);
                              await Swal.fire({
                                title: 'Sucesso!',
                                text: 'Plano contratado com sucesso!',
                                icon: 'success',
                                confirmButtonText: 'Ok',
                                confirmButtonColor: '#059669',
                                customClass: {
                                  popup: 'rounded-2xl',
                                  confirmButton: 'rounded-xl px-6 py-3 font-semibold'
                                }
                              });
                            }

                            // Recarregar os dados
                            const data = await getCurrentPlan();
                            setCurrentPlan(data);
                            setChangePlanConfirm(false);
                          } catch (error) {
                            console.error('Erro ao processar plano:', error);
                            await Swal.fire({
                              title: 'Erro!',
                              text: 'Erro ao processar plano. Tente novamente.',
                              icon: 'error',
                              confirmButtonText: 'Ok',
                              confirmButtonColor: '#dc2626',
                              customClass: {
                                popup: 'rounded-2xl',
                                confirmButton: 'rounded-xl px-6 py-3 font-semibold'
                              }
                            });
                          }
                        }}
                        disabled={isCurrentPrice}
                        className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                          isCurrentPrice
                            ? "border-gray-300 bg-gray-50 cursor-not-allowed opacity-60"
                            : "border-gray-200 hover:border-krooa-green hover:bg-krooa-green/10"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-krooa-dark">{priceName}</div>
                            {price.metadata?.discount && (
                              <div className="text-sm text-gray-600">{price.metadata.discount}</div>
                            )}
                            {isPopular && (
                              <div className="inline-flex items-center gap-1 mt-1 rounded-full bg-krooa-green px-2 py-0.5 text-xs font-bold text-krooa-dark">
                                MAIS POPULAR
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-krooa-dark">{money(priceAmount)}</div>
                            {interval === 'month' && (
                              <div className="text-xs text-gray-500">por mês</div>
                            )}
                            {interval === 'year' && (
                              <>
                                <div className="text-xs text-gray-500">por ano</div>
                                <div className="text-xs text-emerald-600">{money(priceAmount / 12)}/mês</div>
                              </>
                            )}
                            {price.metadata?.interval_months && parseInt(price.metadata.interval_months) > 1 && (
                              <>
                                <div className="text-xs text-gray-500">a cada {price.metadata.interval_months} meses</div>
                                <div className="text-xs text-emerald-600">{money(priceAmount / parseInt(price.metadata.interval_months))}/mês</div>
                              </>
                            )}
                          </div>
                        </div>
                        {isCurrentPrice && (
                          <div className="mt-2 text-xs text-krooa-blue font-medium">Plano atual</div>
                        )}
                      </button>
                    );
                  })}
              </div>
            ) : (
              <div className="space-y-3">
              {/* Plano Mensal */}
              <button
                onClick={() => changePlan("mensal")}
                disabled={!!(currentPlan?.subscription && plan.periodicidade === "mensal")}
                className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                  currentPlan?.subscription && plan.periodicidade === "mensal"
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
                {currentPlan?.subscription && plan.periodicidade === "mensal" && (
                  <div className="mt-2 text-xs text-krooa-blue font-medium">Plano atual</div>
                )}
              </button>

              {/* Plano Trimestral */}
              <button
                onClick={() => changePlan("trimestral")}
                disabled={!!(currentPlan?.subscription && plan.periodicidade === "trimestral")}
                className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                  currentPlan?.subscription && plan.periodicidade === "trimestral"
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
                {currentPlan?.subscription && plan.periodicidade === "trimestral" && (
                  <div className="mt-2 text-xs text-krooa-blue font-medium">Plano atual</div>
                )}
              </button>

              {/* Plano Anual */}
              <button
                onClick={() => changePlan("anual")}
                disabled={!!(currentPlan?.subscription && plan.periodicidade === "anual")}
                className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                  currentPlan?.subscription && plan.periodicidade === "anual"
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
                {currentPlan?.subscription && plan.periodicidade === "anual" && (
                  <div className="mt-2 text-xs text-krooa-blue font-medium">Plano atual</div>
                )}
              </button>
            </div>
            )}

            {currentPlan?.subscription && (
              <div className="rounded-xl bg-amber-50 p-3 text-sm">
                <p className="font-medium text-amber-900 mb-1">Importante:</p>
                <ul className="list-disc pl-5 text-amber-700 space-y-1">
                  <li>A mudança será aplicada na próxima data de vencimento ({fmtDate(plan.next_billing_date)})</li>
                  <li>Você continuará pagando o valor atual até a data de vencimento</li>
                  <li>Após a mudança, o novo valor será cobrado automaticamente</li>
                </ul>
              </div>
            )}

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

      <Modal
        isOpen={!!selectedStripeInvoice}
        title={`Detalhes da Fatura ${selectedStripeInvoice?.number || selectedStripeInvoice?.id || ''}`}
        onClose={() => setSelectedStripeInvoice(null)}
      >
        {selectedStripeInvoice && (
          <div className="space-y-4">
            {/* Informações gerais */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-xs text-gray-600">Data de Emissão</p>
                <p className="font-semibold">{fmtDate(new Date(selectedStripeInvoice.created * 1000))}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Vencimento</p>
                <p className="font-semibold">
                  {selectedStripeInvoice.due_date ? fmtDate(new Date(selectedStripeInvoice.due_date * 1000)) : '-'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Período</p>
                <p className="font-semibold">
                  {fmtDate(new Date(selectedStripeInvoice.period_start * 1000))} - {fmtDate(new Date(selectedStripeInvoice.period_end * 1000))}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Status</p>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  selectedStripeInvoice.status === "paid" ? "bg-emerald-50 text-emerald-700" :
                  selectedStripeInvoice.status === "open" ? "bg-amber-50 text-amber-700" :
                  "bg-gray-100 text-gray-700"
                }`}>
                  {selectedStripeInvoice.status === "paid" ? "Pago" :
                   selectedStripeInvoice.status === "open" ? "Em aberto" :
                   selectedStripeInvoice.status}
                </span>
              </div>
            </div>

            {/* Itens da fatura */}
            <div>
              <h3 className="font-semibold mb-3">Itens da Fatura</h3>
              <div className="space-y-2">
                {selectedStripeInvoice.lines.map((line: any) => (
                  <div key={line.id} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{line.description || 'Item sem descrição'}</p>
                      {line.quantity && line.quantity > 1 && (
                        <p className="text-xs text-gray-600">Quantidade: {line.quantity}</p>
                      )}
                      {line.period && (
                        <p className="text-xs text-gray-600">
                          Período: {fmtDate(new Date(line.period.start * 1000))} - {fmtDate(new Date(line.period.end * 1000))}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{money(line.amount / 100)}</p>
                      {line.price?.unit_amount && line.quantity && line.quantity > 1 && (
                        <p className="text-xs text-gray-600">
                          {money(line.price.unit_amount / 100)} x {line.quantity}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totais */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{money(selectedStripeInvoice.amount_due / 100)}</span>
              </div>
              {selectedStripeInvoice.amount_paid !== selectedStripeInvoice.amount_due && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Valor Pago</span>
                  <span className="font-medium">{money(selectedStripeInvoice.amount_paid / 100)}</span>
                </div>
              )}
              {selectedStripeInvoice.amount_remaining > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Restante</span>
                  <span className="font-medium text-amber-600">{money(selectedStripeInvoice.amount_remaining / 100)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total</span>
                <span className="text-krooa-blue">{money(selectedStripeInvoice.amount_paid / 100)}</span>
              </div>
            </div>

            {/* Ações */}
            <div className="flex gap-2 pt-4">
              {selectedStripeInvoice.hosted_invoice_url && (
                <a
                  href={selectedStripeInvoice.hosted_invoice_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-xl bg-krooa-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-krooa-dark transition-colors text-center"
                >
                  Ver Fatura Online
                </a>
              )}
              {selectedStripeInvoice.invoice_pdf && (
                <a
                  href={selectedStripeInvoice.invoice_pdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 rounded-xl bg-gray-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 transition-colors text-center"
                >
                  Baixar PDF
                </a>
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="ghost" onClick={() => setSelectedStripeInvoice(null)}>Fechar</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={addPaymentOpen}
        title={paymentType === 'select' ? 'Adicionar método de pagamento' : paymentType === 'card' ? 'Adicionar Cartão' : 'Configurar Boleto'}
        onClose={() => {
          setAddPaymentOpen(false);
          setPaymentType('select');
        }}
      >
        <div className="space-y-4">
          {paymentType === 'select' && (
            <>
              <p className="text-sm text-neutral-600">
                Selecione o tipo de pagamento que deseja adicionar:
              </p>
              <div className="grid gap-3">
                <button
                  onClick={() => setPaymentType('card')}
                  className="flex items-center gap-3 rounded-xl border-2 border-neutral-200 p-4 text-left hover:border-krooa-green hover:bg-krooa-green/5 transition-all"
                >
                  <span className="text-3xl">💳</span>
                  <div className="flex-1">
                    <div className="font-semibold text-base">Cartão de Crédito</div>
                    <div className="text-sm text-neutral-500">Visa, Mastercard, Elo, Amex</div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => setPaymentType('boleto')}
                  className="flex items-center gap-3 rounded-xl border-2 border-neutral-200 p-4 text-left hover:border-krooa-green hover:bg-krooa-green/5 transition-all"
                >
                  <span className="text-3xl">📄</span>
                  <div className="flex-1">
                    <div className="font-semibold text-base">Boleto Bancário</div>
                    <div className="text-sm text-neutral-500">Vencimento em 3 dias úteis</div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setAddPaymentOpen(false)}>Cancelar</Button>
              </div>
            </>
          )}

          {paymentType === 'card' && (
            <Elements stripe={stripePromise}>
              <AddCardForm
                onSuccess={async () => {
                  // Recarregar métodos de pagamento
                  const response = await fetch('/api/stripe/payment-methods');
                  const data = await response.json();
                  if (data.paymentMethods) {
                    setPaymentMethods(data.paymentMethods);
                  }
                  setAddPaymentOpen(false);
                  setPaymentType('select');
                }}
                onCancel={() => {
                  setPaymentType('select');
                }}
              />
            </Elements>
          )}

          {paymentType === 'boleto' && (
            <>
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
                <div className="flex gap-3">
                  <svg className="w-6 h-6 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1 text-sm text-blue-800">
                    <p className="font-semibold mb-2">Como funciona o boleto:</p>
                    <ul className="space-y-1 text-blue-700">
                      <li>• O boleto será gerado automaticamente na primeira cobrança</li>
                      <li>• Você receberá por email com instruções de pagamento</li>
                      <li>• Prazo de vencimento: 3 dias úteis</li>
                      <li>• Após o pagamento, confirmação em até 2 dias úteis</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="ghost" onClick={() => setPaymentType('select')}>
                  Voltar
                </Button>
                <Button
                  onClick={async () => {
                    await Swal.fire({
                      title: 'Boleto Configurado!',
                      text: 'O boleto será gerado automaticamente na próxima cobrança.',
                      icon: 'success',
                      confirmButtonText: 'Ok',
                      confirmButtonColor: '#10b981',
                      customClass: {
                        popup: 'rounded-2xl',
                        confirmButton: 'rounded-xl px-6 py-3 font-semibold'
                      }
                    });
                    setAddPaymentOpen(false);
                    setPaymentType('select');
                  }}
                >
                  Confirmar
                </Button>
              </div>
            </>
          )}
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


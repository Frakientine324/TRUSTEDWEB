import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties, type FormEvent } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CircleHelp,
  ClipboardCheck,
  Copy,
  FilePlus2,
  Heart,
  ImagePlus,
  Lock,
  MessageCircle,
  Minus,
  PackageCheck,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Terminal,
  Trash2,
  X,
  Zap,
} from 'lucide-react';

type Category = 'All apps' | 'Productivity' | 'Entertainment' | 'Utilities' | 'Creative';
type AppCategory = Exclude<Category, 'All apps'>;
type AdminAction = 'add' | 'manage' | 'remove' | 'add-buy-via';
type SharedSyncState = 'checking' | 'synced' | 'local';

type AppProduct = {
  id: string;
  name: string;
  publisher: string;
  category: AppCategory;
  description: string;
  detail: string;
  price: number;
  size: string;
  version: string;
  initials: string;
  iconBg: string;
  iconFg?: string;
  imageDataUrl?: string;
};

type BuyViaContact = {
  id: string;
  label: string;
  url: string;
};

type CartLine = { product: AppProduct; quantity: number };
type NewAppForm = {
  name: string;
  publisher: string;
  category: AppCategory;
  description: string;
  version: string;
  size: string;
  imageDataUrl: string;
  imageName: string;
};

const catalog: AppProduct[] = [];
const categories: Category[] = ['All apps', 'Productivity', 'Entertainment', 'Utilities', 'Creative'];
const adminAccessCode = '831615';
const remigioMessengerUrl = 'https://m.me/gioroames';
const whatsappContactUrl = 'https://wa.me/qr/PA4EG37IP4TQB1';
const messengerContactUrl = 'https://m.me/joshua.bartolome.1614460';
const defaultBuyViaContacts: BuyViaContact[] = [
  { id: 'remigio-messenger', label: 'Remigio Somera', url: remigioMessengerUrl },
  { id: 'whatsapp', label: 'WhatsApp', url: whatsappContactUrl },
  { id: 'joshua-bartolome', label: 'Joshua Bartolome', url: messengerContactUrl },
];
const buyViaOwnerCode = '151683';
const iconPalette = ['246 56% 43%', '18 83% 57%', '158 37% 41%', '40 69% 56%', '286 38% 52%', '334 45% 48%', '211 52% 47%'];
const defaultSharedApiBase = import.meta.env.PROD
  ? 'https://error-fixer--kakax66479.replit.app/api'
  : '/api';
const apporyApiBase = (import.meta.env.VITE_API_BASE_URL ?? defaultSharedApiBase).replace(/\/+$/, '');
const localProductsStorageKey = 'appory-added-apps-v2';
const buyViaContactsStorageKey = 'appory-buy-via-contacts-v1';
const appCategories: AppCategory[] = ['Productivity', 'Entertainment', 'Utilities', 'Creative'];

function formatPrice(value: number) {
  return value === 0 ? 'Free' : `$${value.toFixed(2)}`;
}

function makeInitials(name: string) {
  const cleanName = name.replace(/\.apk$/i, '').replace(/[_-]+/g, ' ').trim();
  const words = cleanName.split(/\s+/).filter(Boolean);
  if (words.length > 1) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return cleanName.slice(0, 2).toUpperCase() || 'AP';
}

function makeSlug(name: string) {
  return name.toLowerCase().replace(/\.apk$/i, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'new-app';
}

function inferBuyViaLabel(url: string) {
  const normalizedUrl = url.toLowerCase();
  if (normalizedUrl.includes('wa.me') || normalizedUrl.includes('whatsapp')) return 'WhatsApp';
  if (normalizedUrl.includes('m.me') || normalizedUrl.includes('messenger') || normalizedUrl.includes('facebook.com')) return 'Messenger';
  return '';
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function markupQuote(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function makeAppMarkup(product: AppProduct) {
  const imageMarkup = product.imageDataUrl
    ? `<img className="app-icon-image" src="${markupQuote(product.imageDataUrl)}" alt="${markupQuote(product.name)} icon" />`
    : markupQuote(product.initials);
  return `<article className="app-card" data-app-id="${markupQuote(product.id)}">
  <div className="app-card-top">
    <div className="app-icon">${imageMarkup}</div>
  </div>
  <div className="app-card-body">
    <h3 className="app-name">${markupQuote(product.name)}</h3>
    <p className="app-description">${markupQuote(product.description)}</p>
  </div>
</article>`;
}

function normalizeProduct(value: unknown, index: number): AppProduct | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<AppProduct>;
  const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
  if (!name) return null;

  const fallbackId = makeSlug(name);
  const category = appCategories.includes(candidate.category as AppCategory)
    ? candidate.category as AppCategory
    : 'Utilities';
  const price = typeof candidate.price === 'number' && Number.isFinite(candidate.price) && candidate.price >= 0
    ? candidate.price
    : 200;
  const imageDataUrl = typeof candidate.imageDataUrl === 'string' && candidate.imageDataUrl.startsWith('data:image/')
    ? candidate.imageDataUrl
    : undefined;

  return {
    id: typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id.trim() : fallbackId,
    name,
    publisher: typeof candidate.publisher === 'string' && candidate.publisher.trim() ? candidate.publisher.trim() : 'Appory Studio',
    category,
    description: typeof candidate.description === 'string' && candidate.description.trim()
      ? candidate.description.trim()
      : 'A considered app for your everyday workflow.',
    detail: typeof candidate.detail === 'string' && candidate.detail.trim()
      ? candidate.detail.trim()
      : typeof candidate.description === 'string' && candidate.description.trim()
        ? candidate.description.trim()
        : 'Review the details before adding this authorized app to your basket.',
    price,
    size: typeof candidate.size === 'string' && candidate.size.trim() ? candidate.size.trim() : '25 MB',
    version: typeof candidate.version === 'string' && candidate.version.trim() ? candidate.version.trim() : '1.0.0',
    initials: typeof candidate.initials === 'string' && candidate.initials.trim() ? candidate.initials.trim() : makeInitials(name),
    iconBg: typeof candidate.iconBg === 'string' && candidate.iconBg.trim() ? candidate.iconBg.trim() : iconPalette[index % iconPalette.length],
    iconFg: typeof candidate.iconFg === 'string' && candidate.iconFg.trim() ? candidate.iconFg.trim() : undefined,
    imageDataUrl,
  };
}

function normalizeProducts(values: unknown[]): AppProduct[] {
  const seen = new Set<string>();
  return values.reduce<AppProduct[]>((result, value, index) => {
    const product = normalizeProduct(value, index);
    if (!product || seen.has(product.id)) return result;
    seen.add(product.id);
    result.push(product);
    return result;
  }, []);
}

function normalizeBuyViaContacts(values: unknown[]): BuyViaContact[] {
  const seen = new Set<string>();
  return values.reduce<BuyViaContact[]>((result, value) => {
    if (!value || typeof value !== 'object') return result;
    const candidate = value as Partial<BuyViaContact>;
    const label = typeof candidate.label === 'string' ? candidate.label.trim() : '';
    const url = typeof candidate.url === 'string' ? candidate.url.trim() : '';
    const id = typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id.trim() : makeSlug(label);
    if (!label || !url || seen.has(id)) return result;
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) return result;
    } catch {
      return result;
    }
    seen.add(id);
    result.push({ id, label, url });
    return result;
  }, []);
}

function readBuyViaContacts(): BuyViaContact[] {
  try {
    const saved = window.localStorage.getItem(buyViaContactsStorageKey);
    if (saved === null) return defaultBuyViaContacts;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? normalizeBuyViaContacts(parsed) : defaultBuyViaContacts;
  } catch {
    return defaultBuyViaContacts;
  }
}

function readLocalProducts(): AppProduct[] {
  try {
    const saved = window.localStorage.getItem(localProductsStorageKey);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? normalizeProducts([...catalog, ...parsed]) : normalizeProducts(catalog);
  } catch {
    return normalizeProducts(catalog);
  }
}

function cachePostedProducts(products: AppProduct[]) {
  try {
    window.localStorage.setItem(localProductsStorageKey, JSON.stringify(products.filter((product) => !catalog.some((item) => item.id === product.id))));
  } catch {
    // The API remains the source of truth when browser storage is unavailable.
  }
}

async function requestSharedApp(product: AppProduct, method: 'POST' | 'PATCH' | 'DELETE') {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(`${apporyApiBase}/apps${method === 'POST' ? '' : `/${encodeURIComponent(product.id)}`}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-appory-admin-pin': adminAccessCode,
      },
      body: method === 'DELETE' ? undefined : JSON.stringify(product),
      signal: controller.signal,
    });
    if (!response.ok || (method !== 'DELETE' && !response.headers.get('content-type')?.includes('application/json'))) {
      throw new Error(`Shared app request failed with status ${response.status}`);
    }
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function requestSharedBuyViaContact(contact: BuyViaContact, method: 'POST' | 'DELETE') {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(`${apporyApiBase}/buy-via-contacts${method === 'POST' ? '' : `/${encodeURIComponent(contact.id)}`}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(method === 'POST'
          ? { 'x-appory-admin-pin': adminAccessCode }
          : { 'x-appory-buy-via-owner-code': buyViaOwnerCode }),
      },
      body: method === 'POST' ? JSON.stringify(contact) : undefined,
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Shared Buy via contact request failed with status ${response.status}`);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function AppIcon({ product, large = false }: { product: AppProduct; large?: boolean }) {
  return (
    <div
      className={`app-icon${large ? ' app-icon-large' : ''}`}
      style={{ '--icon-bg': product.iconBg, '--icon-fg': product.iconFg ?? '40 55% 97%' } as CSSProperties}
      aria-hidden="true"
    >
      {product.imageDataUrl ? <img className="app-icon-image" src={product.imageDataUrl} alt="" /> : product.initials}
    </div>
  );
}

function App() {
  const [activeCategory, setActiveCategory] = useState<Category>('All apps');
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<AppProduct[]>(readLocalProducts);
  const [sharedSyncState, setSharedSyncState] = useState<SharedSyncState>('checking');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<AppProduct | null>(null);
  const [buyViaContacts, setBuyViaContacts] = useState<BuyViaContact[]>(readBuyViaContacts);
  const [buyViaFormOpen, setBuyViaFormOpen] = useState(false);
  const [buyViaForm, setBuyViaForm] = useState({ label: '', url: '' });
  const [buyViaFormError, setBuyViaFormError] = useState('');
  const [buyViaRemoveTarget, setBuyViaRemoveTarget] = useState<BuyViaContact | null>(null);
  const [buyViaRemovePin, setBuyViaRemovePin] = useState('');
  const [buyViaRemoveError, setBuyViaRemoveError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [addAppOpen, setAddAppOpen] = useState(false);
  const [manageAppsOpen, setManageAppsOpen] = useState(false);
  const [adminLockOpen, setAdminLockOpen] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminAction, setAdminAction] = useState<AdminAction>('add');
  const [adminPin, setAdminPin] = useState('');
  const [adminError, setAdminError] = useState('');
  const [pendingRemovalProduct, setPendingRemovalProduct] = useState<AppProduct | null>(null);
  const [imageError, setImageError] = useState('');
  const [generatedCommand, setGeneratedCommand] = useState('');
  const [generatedMarkup, setGeneratedMarkup] = useState('');
  const [generatedRemoveCommand, setGeneratedRemoveCommand] = useState('');
  const [copyLabel, setCopyLabel] = useState('Copy command');
  const [newApp, setNewApp] = useState<NewAppForm>({
    name: '',
    publisher: 'Appory Studio',
    category: 'Creative',
    description: '',
    version: '1.0.0',
    size: '25 MB',
    imageDataUrl: '',
    imageName: '',
  });

  useEffect(() => {
    try {
      const savedCart = window.localStorage.getItem('appory-basket');
      const parsed = savedCart ? JSON.parse(savedCart) : [];
      if (!Array.isArray(parsed)) return;
      setCart(parsed.filter((line): line is CartLine => Boolean(line?.product?.id && line.quantity > 0)));
    } catch {
      // The basket is optional persistence; a fresh basket remains usable.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('appory-basket', JSON.stringify(cart));
    } catch {
      // Keep checkout usable when browser storage is unavailable.
    }
  }, [cart]);

  useEffect(() => {
    try {
      window.localStorage.setItem(buyViaContactsStorageKey, JSON.stringify(buyViaContacts));
    } catch {
      // Contact links remain usable for this session if browser storage is unavailable.
    }
  }, [buyViaContacts]);

  useEffect(() => {
    let active = true;
    async function loadSharedBuyViaContacts() {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 4500);
      try {
        const response = await fetch(`${apporyApiBase}/buy-via-contacts`, { cache: 'no-store', signal: controller.signal });
        if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return;
        const payload = await response.json() as unknown;
        if (!Array.isArray(payload)) return;
        const remoteContacts = normalizeBuyViaContacts(payload);
        if (!active) return;
        setBuyViaContacts(remoteContacts);
        try {
          window.localStorage.setItem(buyViaContactsStorageKey, JSON.stringify(remoteContacts));
        } catch {
          // The in-memory list remains usable when browser storage is unavailable.
        }
      } catch {
        // Keep cached contact links visible while shared contact storage is offline.
      } finally {
        window.clearTimeout(timeoutId);
      }
    }
    void loadSharedBuyViaContacts();
    return () => {
      active = false;
    };
  }, []);

  const isAdded = (product: AppProduct) => !catalog.some((item) => item.id === product.id);
  const postedProducts = useMemo(() => products.filter(isAdded), [products]);
  const filteredProducts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return products.filter((product) => {
      const categoryMatch = activeCategory === 'All apps' || product.category === activeCategory;
      const searchMatch = !needle || `${product.name} ${product.publisher} ${product.category} ${product.description}`.toLowerCase().includes(needle);
      return categoryMatch && searchMatch;
    });
  }, [activeCategory, products, search]);
  const itemCount = cart.reduce((total, line) => total + line.quantity, 0);
  const total = cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0);

  useEffect(() => {
    const surfaceOpen = Boolean(cartOpen || selectedProduct || buyViaFormOpen || buyViaRemoveTarget || confirmed || adminLockOpen || addAppOpen || manageAppsOpen);
    if (!surfaceOpen) return undefined;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (confirmed) {
        setConfirmed(false);
      } else if (cartOpen) {
        setCartOpen(false);
      } else if (buyViaRemoveTarget) {
        closeBuyViaRemoveGate();
      } else if (buyViaFormOpen) {
        closeBuyViaForm();
      } else if (selectedProduct) {
        setSelectedProduct(null);
      } else if (adminLockOpen || addAppOpen || manageAppsOpen) {
        closeAdminSurface();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [addAppOpen, adminLockOpen, buyViaFormOpen, buyViaRemoveTarget, cartOpen, confirmed, manageAppsOpen, selectedProduct]);

  useEffect(() => {
    let active = true;
    async function loadSharedProducts() {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 4500);
      try {
        const response = await fetch(`${apporyApiBase}/apps`, { cache: 'no-store', signal: controller.signal });
        if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
          if (active) setSharedSyncState('local');
          return;
        }
        const remotePayload = await response.json() as unknown;
        if (!Array.isArray(remotePayload)) {
          if (active) setSharedSyncState('local');
          return;
        }
        const remoteProducts = normalizeProducts(remotePayload);

        if (remoteProducts.length === 0) {
          const localProducts = readLocalProducts().filter((product) => isAdded(product));
          for (const product of localProducts) {
            await requestSharedApp(product, 'POST');
          }
          if (active) setSharedSyncState('synced');
          if (localProducts.length) {
            cachePostedProducts(localProducts);
            if (active) setProducts([...catalog, ...localProducts]);
          }
          return;
        }

        cachePostedProducts(remoteProducts);
        if (active) setSharedSyncState('synced');
        if (active) setProducts([...catalog, ...remoteProducts]);
      } catch {
        if (active) setSharedSyncState('local');
        // Keep the cached browser listings visible while the shared API is offline.
      } finally {
        window.clearTimeout(timeoutId);
      }
    }
    void loadSharedProducts();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const surfaceOpen = Boolean(cartOpen || selectedProduct || buyViaFormOpen || buyViaRemoveTarget || confirmed || adminLockOpen || addAppOpen || manageAppsOpen);
    if (!surfaceOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [addAppOpen, adminLockOpen, buyViaFormOpen, buyViaRemoveTarget, cartOpen, confirmed, manageAppsOpen, selectedProduct]);

  function saveProducts(nextProducts: AppProduct[]) {
    try {
      window.localStorage.setItem(localProductsStorageKey, JSON.stringify(nextProducts.filter(isAdded)));
      return true;
    } catch {
      setImageError('This change could not be saved in the browser. Please use a smaller image and try again.');
      return false;
    }
  }

  function openAddAppGate() {
    if (adminUnlocked) {
      setAddAppOpen(true);
      return;
    }
    setAdminAction('add');
    setAdminPin('');
    setAdminError('');
    setAdminLockOpen(true);
  }

  function openManageAppsGate() {
    if (adminUnlocked) {
      setManageAppsOpen(true);
      return;
    }
    setAdminAction('manage');
    setAdminPin('');
    setAdminError('');
    setAdminLockOpen(true);
  }

  function openRemoveAppGate(product: AppProduct) {
    if (!isAdded(product)) return;
    setPendingRemovalProduct(product);
    setAdminAction('remove');
    setAdminPin('');
    setAdminError('');
    setAdminLockOpen(true);
  }

  function closeAdminSurface() {
    setAdminLockOpen(false);
    setAddAppOpen(false);
    setManageAppsOpen(false);
    setBuyViaFormOpen(false);
    setAdminUnlocked(false);
  }

  function unlockAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (adminPin !== adminAccessCode) {
      setAdminPin('');
      setAdminError('Incorrect PIN. Try again.');
      return;
    }
    if (adminAction === 'remove') {
      const product = pendingRemovalProduct;
      setAdminLockOpen(false);
      setAdminPin('');
      setAdminError('');
      setAdminUnlocked(false);
      setPendingRemovalProduct(null);
      if (product) deleteAdminApp(product, true);
      return;
    }
    setAdminUnlocked(true);
    setAdminLockOpen(false);
    setAdminPin('');
    setAdminError('');
    if (adminAction === 'add') setAddAppOpen(true);
    if (adminAction === 'manage') setManageAppsOpen(true);
    if (adminAction === 'add-buy-via') {
      setBuyViaForm({ label: '', url: '' });
      setBuyViaFormError('');
      setBuyViaFormOpen(true);
    }
  }

  function readImage(file: File, onLoad: (dataUrl: string) => void, onError: () => void) {
    if (!file.type.startsWith('image/')) {
      setImageError('Please choose an image file.');
      onError();
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setImageError('Image must be 2 MB or smaller.');
      onError();
      return;
    }
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? onLoad(reader.result) : onError();
    reader.onerror = onError;
    reader.readAsDataURL(file);
  }

  function handleAppImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setImageError('');
    if (!file) return;
    readImage(file, (imageDataUrl) => setNewApp((current) => ({ ...current, imageDataUrl, imageName: file.name })), () => {
      event.target.value = '';
      setNewApp((current) => ({ ...current, imageDataUrl: '', imageName: '' }));
    });
  }

  function handlePostedAppImageChange(product: AppProduct, event: ChangeEvent<HTMLInputElement>) {
    if (!adminUnlocked || !isAdded(product)) return;
    const file = event.target.files?.[0];
    setImageError('');
    if (!file) return;
    readImage(file, (imageDataUrl) => {
      const updated = { ...product, imageDataUrl };
      const next = products.map((item) => item.id === product.id ? updated : item);
      if (!saveProducts(next)) return;
      setProducts(next);
      setSelectedProduct((current) => current?.id === product.id ? updated : current);
      setCart((current) => current.map((line) => line.product.id === product.id ? { ...line, product: updated } : line));
      void requestSharedApp(updated, 'PATCH').catch(() => setImageError('The image changed on this device, but shared sync is unavailable.'));
    }, () => { event.target.value = ''; });
  }

  function resetPostedAppImage(product: AppProduct) {
    if (!adminUnlocked || !isAdded(product)) return;
    const updated = { ...product, imageDataUrl: undefined };
    const next = products.map((item) => item.id === product.id ? updated : item);
    if (!saveProducts(next)) return;
    setProducts(next);
    setSelectedProduct((current) => current?.id === product.id ? updated : current);
    setCart((current) => current.map((line) => line.product.id === product.id ? { ...line, product: updated } : line));
    void requestSharedApp(updated, 'PATCH').catch(() => setImageError('The image reset on this device, but shared sync is unavailable.'));
  }

  function addNewApp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newApp.name.trim();
    if (!name) return;
    const baseId = makeSlug(name);
    const id = products.some((product) => product.id === baseId) ? `${baseId}-${products.length + 1}` : baseId;
    const description = newApp.description.trim() || 'A new app ready for your everyday workflow.';
    const product: AppProduct = {
      id,
      name: name.endsWith('.apk') ? name : `${name}.apk`,
      publisher: newApp.publisher.trim() || 'Appory Studio',
      category: newApp.category,
      description,
      detail: newApp.description.trim() || 'A new app added to the Appory marketplace. Review the details before purchasing.',
      price: 200,
      size: newApp.size.trim() || '25 MB',
      version: newApp.version.trim() || '1.0.0',
      initials: makeInitials(name),
      iconBg: iconPalette[products.length % iconPalette.length],
      imageDataUrl: newApp.imageDataUrl || undefined,
    };
    const next = [...products, product];
    if (!saveProducts(next)) return;
    setProducts(next);
    setGeneratedCommand([
      'pnpm app:add',
      `--name ${shellQuote(product.name)}`,
      `--category ${shellQuote(product.category)}`,
      `--publisher ${shellQuote(product.publisher)}`,
      `--description ${shellQuote(product.description)}`,
      `--version ${shellQuote(product.version)}`,
      `--size ${shellQuote(product.size)}`,
      '--price 200',
    ].join(' '));
    setGeneratedMarkup(makeAppMarkup(product));
    setGeneratedRemoveCommand('');
    setImageError('');
    setNewApp({ name: '', publisher: 'Appory Studio', category: 'Creative', description: '', version: '1.0.0', size: '25 MB', imageDataUrl: '', imageName: '' });
    void requestSharedApp(product, 'POST').catch(() => setImageError('The app was added here, but shared sync is unavailable. Please try again when the API is online.'));
  }

  function deleteAdminApp(product: AppProduct, authorizedByPin = false) {
    if ((!adminUnlocked && !authorizedByPin) || !isAdded(product)) return;
    if (!window.confirm(`Delete ${product.name} from the store?`)) return;
    const next = products.filter((item) => item.id !== product.id);
    setProducts(next);
    setCart((current) => current.filter((line) => line.product.id !== product.id));
    setSelectedProduct((current) => current?.id === product.id ? null : current);
    saveProducts(next);
    setGeneratedRemoveCommand(`pnpm app:remove --name ${shellQuote(product.name)}`);
    void requestSharedApp(product, 'DELETE').catch(() => setImageError('The app was removed here, but shared sync is unavailable.'));
  }

  async function copyCommand(command: string) {
    if (!command) return;
    try {
      await navigator.clipboard?.writeText(command);
    } catch {
      // Clipboard access is optional in local previews.
    }
    setCopyLabel('Copied');
    window.setTimeout(() => setCopyLabel('Copy command'), 1800);
  }

  function addToCart(product: AppProduct) {
    setCart((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      return existing
        ? current.map((line) => line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line)
        : [...current, { product, quantity: 1 }];
    });
    setSelectedProduct(null);
    setCartOpen(true);
  }

  function updateQuantity(productId: string, delta: number) {
    setCart((current) => current.flatMap((line) => {
      if (line.product.id !== productId) return [line];
      const quantity = line.quantity + delta;
      return quantity > 0 ? [{ ...line, quantity }] : [];
    }));
  }

  function clearCart() {
    setCart([]);
  }

  function clearFilters() {
    setSearch('');
    setActiveCategory('All apps');
  }

  function openBuyViaForm() {
    if (!adminUnlocked) {
      setAdminAction('add-buy-via');
      setAdminPin('');
      setAdminError('');
      setAdminLockOpen(true);
      return;
    }
    setBuyViaForm({ label: '', url: '' });
    setBuyViaFormError('');
    setBuyViaFormOpen(true);
  }

  function closeBuyViaForm() {
    setBuyViaFormOpen(false);
    setBuyViaFormError('');
  }

  function addBuyViaContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const url = buyViaForm.url.trim();
    const label = buyViaForm.label.trim() || inferBuyViaLabel(url) || 'Custom contact';
    if (!url) {
      setBuyViaFormError('Add a contact link.');
      return;
    }
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Unsupported link');
    } catch {
      setBuyViaFormError('Use a valid http or https contact link.');
      return;
    }
    const idBase = makeSlug(label);
    const id = buyViaContacts.some((contact) => contact.id === idBase) ? `${idBase}-${buyViaContacts.length + 1}` : idBase;
    const contact = { id, label, url: parsedUrl.toString() };
    setBuyViaContacts((current) => [...current, contact]);
    void requestSharedBuyViaContact(contact, 'POST').catch(() => {
      setImageError('The Buy via contact was added on this device, but shared sync is unavailable.');
    });
    closeBuyViaForm();
  }

  function openBuyViaRemoveGate(contact: BuyViaContact) {
    setBuyViaRemoveTarget(contact);
    setBuyViaRemovePin('');
    setBuyViaRemoveError('');
  }

  function closeBuyViaRemoveGate() {
    setBuyViaRemoveTarget(null);
    setBuyViaRemovePin('');
    setBuyViaRemoveError('');
  }

  function removeBuyViaContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (buyViaRemovePin !== buyViaOwnerCode) {
      setBuyViaRemovePin('');
      setBuyViaRemoveError('Owner code required. Try again.');
      return;
    }
    const contact = buyViaRemoveTarget;
    if (!contact) return;
    setBuyViaContacts((current) => current.filter((item) => item.id !== contact.id));
    void requestSharedBuyViaContact(contact, 'DELETE').catch(() => {
      setImageError('The Buy via contact was removed on this device, but shared sync is unavailable.');
    });
    closeBuyViaRemoveGate();
  }

  return (
    <div className="marketplace-shell">
      <aside className="side-rail" aria-label="Main navigation">
        <a className="brand-lockup" href="/" data-testid="link-brand"><span className="brand-mark">a</span><span className="brand-word">appory</span></a>
        <div className="rail-kicker">The useful shelf</div>
        <nav className="rail-nav">
          <a className="rail-link rail-link-active" href="#catalog" data-testid="link-discover"><Sparkles /> Discover</a>
          <a className="rail-link" href="#catalog" data-testid="link-new-arrivals"><Zap /> New arrivals</a>
          <a className="rail-link" href="#catalog" data-testid="link-free-apps"><PackageCheck /> Free apps</a>
        </nav>
        <div className="rail-kicker">Your pocket</div>
        <nav className="rail-nav">
          <button className="rail-link" onClick={() => setCartOpen(true)} data-testid="button-open-cart"><ShoppingBag /> Basket {itemCount > 0 ? `(${itemCount})` : ''}</button>
          <a className="rail-link" href={remigioMessengerUrl} target="_blank" rel="noreferrer" data-testid="link-remigio-somera-messenger"><MessageCircle /> Remigio Somera Messenger <ArrowRight /></a>
          <a className="rail-link" href={whatsappContactUrl} target="_blank" rel="noreferrer" data-testid="link-remigio-somera-whatsapp"><MessageCircle /> Remigio Somera WhatsApp <ArrowRight /></a>
          <a className="rail-link" href={messengerContactUrl} target="_blank" rel="noreferrer" data-testid="link-joshua-contact"><MessageCircle /> Joshua Bartolome <ArrowRight /></a>
          <button className="rail-link" onClick={openAddAppGate} data-testid="button-open-add-app"><FilePlus2 /> Add new app</button>
          <button className="rail-link" onClick={openManageAppsGate} data-testid="button-open-manage-apps"><Settings2 /> Manage posted apps</button>
          <a className="rail-link" href="#about" data-testid="link-how-it-works"><CircleHelp /> How it works</a>
        </nav>
        <div className="rail-note"><strong><span className="status-dot" /> Curated, not crowded.</strong>Every app is checked for a clear source and authorized distribution before it reaches the shelf.</div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <a className="mobile-brand" href="/" data-testid="link-mobile-brand"><span className="brand-mark">a</span><span className="brand-word">appory</span></a>
           <span className="topbar-caption">Small tools for the WhatsApp problems that slow you down</span>
          <span className={`sync-status sync-status-${sharedSyncState}`} role="status" data-testid="text-sync-status">
            {sharedSyncState === 'synced' ? 'Synced across devices' : sharedSyncState === 'local' ? 'This device only · API offline' : 'Checking shared shelf…'}
          </span>
          <div className="topbar-actions">
            <button className="icon-button" onClick={openAddAppGate} aria-label="Add a new app" data-testid="button-topbar-add-app"><FilePlus2 /></button>
            <button className="icon-button" onClick={openManageAppsGate} aria-label="Manage posted apps" data-testid="button-topbar-manage-apps"><Settings2 /></button>
            <button className="icon-button" onClick={() => setCartOpen(true)} aria-label={`Open basket, ${itemCount} items`} data-testid="button-cart"><ShoppingBag />{itemCount > 0 && <span className="cart-count" data-testid="text-cart-count">{itemCount}</span>}</button>
          </div>
        </header>
         <nav className="mobile-nav" aria-label="Quick navigation">
           <a className="mobile-nav-link mobile-nav-link-active" href="#catalog" data-testid="link-mobile-discover"><Sparkles /> Discover</a>
           <a className="mobile-nav-link" href="#catalog" onClick={() => { setActiveCategory('All apps'); setSearch(''); }} data-testid="link-mobile-all-apps"><PackageCheck /> All apps</a>
           <button className="mobile-nav-link" onClick={() => setCartOpen(true)} data-testid="button-mobile-basket"><ShoppingBag /> Basket {itemCount > 0 ? `(${itemCount})` : ''}</button>
         </nav>

        <div className="content-wrap">
          <section className="hero" aria-labelledby="hero-title">
            <div>
               <div className="eyebrow">When WhatsApp gets difficult</div>
               <h1 id="hero-title">Fix the little<br /><em>things that stop.</em></h1>
               <p className="hero-copy">Appory is a small, careful shelf of tools for WhatsApp errors. Find the right fix, read what it changes, and take the next step without guesswork.</p>
            </div>
            <div className="hero-aside" aria-label="Appory marketplace facts">
              <div className="hero-stat"><strong>{products.length}</strong><span>{products.length === 1 ? 'app on the shelf' : 'apps on the shelf'}</span></div>
               <div className="hero-stat"><strong>1:1</strong><span>clear repair guidance</span></div>
            </div>
          </section>

          <section className="feature-strip" aria-label="Featured collection">
            <div className="feature-content">
               <div className="feature-tag"><Sparkles /> Appory field note / 03</div>
               <h2>Less frustration. Better next steps.</h2>
               <p>Each listing explains the problem it addresses, the version you are getting, and the handoff options available to you.</p>
            </div>
            <div className="feature-index">{String(products.length).padStart(2, '0')} on the shelf</div>
          </section>

          <section id="catalog" aria-labelledby="browse-title">
            <div className="browse-head"><h2 className="browse-title" id="browse-title">Browse the shelf</h2><span className="browse-meta" data-testid="text-results-count">{filteredProducts.length} {filteredProducts.length === 1 ? 'app' : 'apps'} in view</span></div>
            <div className="controls">
              <label className="search-wrap"><Search aria-hidden="true" /><input className="search-input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search apps, publishers, or use cases" aria-label="Search apps" data-testid="input-search" /></label>
              <div className="category-scroll hide-scrollbar" role="tablist" aria-label="Filter by category">
                {categories.map((category) => <button key={category} className={`category-button ${activeCategory === category ? 'category-button-active' : ''}`} onClick={() => setActiveCategory(category)} role="tab" aria-selected={activeCategory === category} data-testid={`button-category-${category.toLowerCase().replace(' ', '-')}`}>{category}</button>)}
              </div>
              {(search || activeCategory !== 'All apps') && <button className="clear-button" onClick={clearFilters} data-testid="button-clear-filters"><X /> Clear</button>}
            </div>
            {filteredProducts.length > 0 ? (
              <div className="catalog-grid" data-testid="grid-catalog">
                {filteredProducts.map((product, index) => (
                  <article className="app-card" style={{ animationDelay: `${index * 65}ms` }} key={product.id} data-testid={`card-product-${product.id}`}>
                    <div className="app-card-top"><AppIcon product={product} /><div className="app-card-badges"><span className="verified-mark"><BadgeCheck /> Authorized</span>{isAdded(product) && <button className="admin-delete-card public-delete-card" onClick={(event) => { event.stopPropagation(); openRemoveAppGate(product); }} aria-label={`Remove ${product.name}`} data-testid={`button-public-remove-${product.id}`}><Trash2 /><span>Remove</span></button>}</div></div>
                    <div className="app-card-body"><div><h3 className="app-name" data-testid={`text-product-name-${product.id}`}>{product.name}</h3><p className="app-description">{product.description}</p></div><span className="app-category">{product.category} / {product.publisher}</span><div className="app-card-bottom"><span className="price" data-testid={`text-product-price-${product.id}`}>{formatPrice(product.price)}</span><button className="card-action" onClick={() => setSelectedProduct(product)} data-testid={`button-view-product-${product.id}`}><span>View app</span><ArrowRight /></button></div></div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state" data-testid="empty-search-results">
                 <div className="empty-state-inner"><div className="empty-symbol"><Search /></div><h3>{products.length ? 'Nothing matches this shelf view.' : 'Nothing on this shelf yet.'}</h3><p>{products.length ? 'Try another phrase or clear the filters. The best discoveries sometimes take a second pass.' : 'The original listings were cleared. Add the first considered app through the owner-only seller tools.'}</p>{products.length ? <button className="clear-button" onClick={clearFilters} data-testid="button-reset-empty-search">Show every app <ArrowRight /></button> : <button className="detail-add empty-add-button" onClick={openAddAppGate} data-testid="button-empty-add-app"><FilePlus2 /> Add the first app</button>}</div>
              </div>
            )}
          </section>

          <section className="trust-row" id="about" aria-label="Appory commitments">
            <div className="trust-item"><ShieldCheck /><span><strong>Authorized</strong> distribution only</span></div>
            <div className="trust-item"><ClipboardCheck /><span><strong>Clear</strong> app details</span></div>
            <div className="trust-item"><Heart /><span><strong>Human</strong> curation</span></div>
          </section>
        </div>
      </main>

      {cartOpen && <><button className="scrim" onClick={() => setCartOpen(false)} aria-label="Close basket" data-testid="button-close-cart-overlay" /><aside className="cart-panel" aria-label="Your basket" role="dialog">
        <div className="panel-head"><div><div className="panel-kicker">Your pocket</div><h2 className="panel-title">Basket <span data-testid="text-basket-count">({itemCount})</span></h2></div><button className="panel-close" onClick={() => setCartOpen(false)} aria-label="Close basket" data-testid="button-close-cart"><X /></button></div>
         {cart.length ? <><div className="cart-content">{cart.map(({ product, quantity }) => <div className="cart-item" key={product.id} data-testid={`cart-item-${product.id}`}><AppIcon product={product} /><div className="cart-item-info"><h4>{product.name}</h4><p>{formatPrice(product.price)} per license</p></div><div className="cart-item-right"><span className="cart-item-price">{formatPrice(product.price * quantity)}</span><div className="quantity-control" aria-label={`Quantity for ${product.name}`}><button onClick={() => updateQuantity(product.id, -1)} aria-label={`Decrease ${product.name}`} data-testid={`button-decrease-${product.id}`}><Minus /></button><span data-testid={`text-quantity-${product.id}`}>{quantity}</span><button onClick={() => updateQuantity(product.id, 1)} aria-label={`Increase ${product.name}`} data-testid={`button-increase-${product.id}`}><Plus /></button></div><button className="remove-item" onClick={() => setCart((current) => current.filter((line) => line.product.id !== product.id))} data-testid={`button-remove-${product.id}`}><Trash2 /> Remove</button></div></div>)}</div><div className="panel-foot"><div className="summary-row"><span>Subtotal</span><strong data-testid="text-cart-total">{formatPrice(total)}</strong></div><div className="cart-foot-actions"><button className="cart-clear" onClick={clearCart} data-testid="button-clear-cart"><Trash2 /> Clear basket</button><button className="checkout-button" onClick={() => { setCartOpen(false); setConfirmed(true); setCart([]); }} data-testid="button-checkout">Continue to confirmation <ArrowRight /></button></div><p className="legal-note">By continuing, you confirm you own or are authorized to distribute the selected apps.</p></div></> : <div className="cart-empty"><div className="empty-state-inner"><div className="empty-symbol"><ShoppingBag /></div><h3>Your basket is waiting.</h3><p>Add an app you trust and it will appear here, ready for a clear checkout.</p><button className="clear-button" onClick={() => setCartOpen(false)} data-testid="button-continue-browsing">Continue browsing <ArrowRight /></button></div></div>}
      </aside></>}

      {adminLockOpen && <div className="modal-scrim" role="presentation" onClick={() => setAdminLockOpen(false)}><div className="detail-modal admin-lock-modal" role="dialog" aria-modal="true" aria-labelledby="admin-lock-title" onClick={(event) => event.stopPropagation()} data-testid="dialog-admin-lock"><button className="panel-close detail-close" onClick={() => setAdminLockOpen(false)} aria-label="Close admin lock" data-testid="button-close-admin-lock"><X /></button><div className="admin-lock-heading"><div className="admin-lock-icon"><Lock /></div><p className="detail-category">Private seller access</p><h2 id="admin-lock-title">Admin locked</h2><p>{adminAction === 'remove' ? 'Only the store owner can remove a posted app. Enter the 6-digit admin PIN to continue.' : adminAction === 'add-buy-via' ? 'Only the store owner can add a Buy via contact. Enter the 6-digit admin PIN to continue.' : 'Only the store owner can access seller controls. Enter your admin PIN to continue.'}</p></div><form className="admin-lock-form" onSubmit={unlockAdmin}><label className="form-field"><span>Admin PIN</span><input type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="off" value={adminPin} onChange={(event) => { setAdminPin(event.target.value.replace(/\D/g, '')); setAdminError(''); }} placeholder="6-digit PIN" required aria-describedby={adminError ? 'admin-lock-error' : undefined} data-testid="input-admin-pin" /></label>{adminError && <p className="admin-lock-error" id="admin-lock-error" role="alert">{adminError}</p>}<button type="submit" className="detail-add admin-unlock-button" data-testid="button-unlock-admin"><Lock /> Unlock {adminAction === 'add' ? 'seller tools' : adminAction === 'manage' ? 'manage apps' : adminAction === 'add-buy-via' ? 'Buy via add' : 'remove app'}</button>{adminAction === 'add' && <div className="posting-fee-note" data-testid="notice-app-posting-fee"><FilePlus2 /><span><strong>Post an app · ₱10</strong><small>Posting fee for adding an app to the website.</small></span></div>}{adminAction === 'add-buy-via' && <div className="posting-fee-note" data-testid="notice-buy-via-fee"><MessageCircle /><span><strong>Add Buy via · ₱50</strong><small>Owner-only fee for adding a custom contact.</small></span></div>}</form></div></div>}

      {addAppOpen && <div className="modal-scrim" role="presentation" onClick={closeAdminSurface}><div className="detail-modal add-app-modal" role="dialog" aria-modal="true" aria-labelledby="add-app-title" onClick={(event) => event.stopPropagation()} data-testid="dialog-add-app"><button className="panel-close detail-close" onClick={closeAdminSurface} aria-label="Close add app form" data-testid="button-close-add-app"><X /></button><div className="add-app-heading"><div className="add-app-logo-preview">{newApp.imageDataUrl ? <img className="add-app-logo-image" src={newApp.imageDataUrl} alt={`${newApp.name || 'New app'} preview`} /> : makeInitials(newApp.name)}</div><div><p className="detail-category">Seller tools / New listing</p><h2 className="detail-name" id="add-app-title">Add a new app</h2><p className="detail-publisher">The app name and uploaded image will be displayed on the website and shared with other devices.</p></div></div><form className="add-app-form" onSubmit={addNewApp}><label className="form-field form-field-wide"><span>App name</span><input value={newApp.name} onChange={(event) => setNewApp((current) => ({ ...current, name: event.target.value }))} placeholder="Example: Photo Editor.apk" required data-testid="input-new-app-name" /></label><div className="form-grid"><label className="form-field"><span>Publisher</span><input value={newApp.publisher} onChange={(event) => setNewApp((current) => ({ ...current, publisher: event.target.value }))} placeholder="Appory Studio" data-testid="input-new-app-publisher" /></label><label className="form-field"><span>Category</span><select value={newApp.category} onChange={(event) => setNewApp((current) => ({ ...current, category: event.target.value as AppCategory }))} data-testid="select-new-app-category">{categories.filter((category): category is AppCategory => category !== 'All apps').map((category) => <option key={category} value={category}>{category}</option>)}</select></label></div><label className="form-field form-field-wide"><span>Short description</span><textarea value={newApp.description} onChange={(event) => setNewApp((current) => ({ ...current, description: event.target.value }))} placeholder="What does this app help people do?" rows={3} data-testid="input-new-app-description" /></label><div className="form-grid"><label className="form-field"><span>Version</span><input value={newApp.version} onChange={(event) => setNewApp((current) => ({ ...current, version: event.target.value }))} placeholder="1.0.0" data-testid="input-new-app-version" /></label><label className="form-field"><span>File size</span><input value={newApp.size} onChange={(event) => setNewApp((current) => ({ ...current, size: event.target.value }))} placeholder="25 MB" data-testid="input-new-app-size" /></label></div><div className="image-upload-block"><label className="form-field form-field-wide"><span>App image (optional)</span><input key={newApp.imageName || 'empty-image'} type="file" accept="image/*" onChange={handleAppImageChange} data-testid="input-new-app-image" /></label>{newApp.imageName && <p className="upload-status"><Check /> {newApp.imageName}</p>}{imageError && <p className="image-upload-error" role="alert">{imageError}</p>}</div><p className="form-note"><BadgeCheck /> Price is fixed at $200 to match your store. Images are optional, limited to 2 MB, saved with the listing, and displayed on every device.</p><div className="add-app-actions"><button type="button" className="secondary-action" onClick={closeAdminSurface} data-testid="button-cancel-add-app">Cancel</button><button type="submit" className="detail-add" data-testid="button-submit-add-app">Add app to website <FilePlus2 /></button></div></form>{generatedCommand && <div className="command-card" data-testid="card-generated-command"><div className="command-card-head"><div><p className="detail-category">GitHub / Terminal</p><strong>Make it permanent</strong></div><button type="button" className="copy-command" onClick={() => copyCommand(generatedCommand)} data-testid="button-copy-add-app-command"><Copy /> {copyLabel}</button></div><code>{generatedCommand}</code><p>Copy this command and run it from your GitHub repository root. The new app will be added to the source catalog with the same automatic logo.</p></div>}{generatedMarkup && <div className="command-card" data-testid="card-generated-markup"><div className="command-card-head"><div><p className="detail-category">HTML / JSX</p><strong>Website app card markup</strong></div><button type="button" className="copy-command" onClick={() => copyCommand(generatedMarkup)} data-testid="button-copy-app-markup"><Copy /> {copyLabel}</button></div><code>{generatedMarkup}</code><p>This snippet includes the new app name and its selected image so the listing can be rendered in the website.</p></div>}</div></div>}

      {manageAppsOpen && <div className="modal-scrim" role="presentation" onClick={closeAdminSurface}><div className="detail-modal manage-apps-modal" role="dialog" aria-modal="true" aria-labelledby="manage-apps-title" onClick={(event) => event.stopPropagation()} data-testid="dialog-manage-apps"><button className="panel-close detail-close" onClick={closeAdminSurface} aria-label="Close manage apps" data-testid="button-close-manage-apps"><X /></button><div className="manage-apps-heading"><div className="admin-lock-icon"><Settings2 /></div><div><p className="detail-category">Seller tools / Posted apps</p><h2 className="detail-name" id="manage-apps-title">Manage your shelf</h2><p className="detail-publisher">Owner-only controls for apps posted from your seller tools.</p></div></div><div className="manage-apps-body">{postedProducts.length ? <div className="posted-app-list" data-testid="list-posted-apps">{postedProducts.map((product) => <div className="posted-app-row" key={product.id} data-testid={`row-posted-app-${product.id}`}><AppIcon product={product} /><div className="posted-app-info"><strong>{product.name}</strong><span>{product.category} / {product.publisher}</span></div><div className="posted-app-actions"><label className="admin-image-upload"><input key={product.imageDataUrl || product.id} type="file" accept="image/*" onChange={(event) => handlePostedAppImageChange(product, event)} aria-label={`Change image for ${product.name}`} data-testid={`input-change-image-${product.id}`} /><ImagePlus /><span>{product.imageDataUrl ? 'Change image' : 'Add image'}</span></label>{product.imageDataUrl && <button type="button" className="admin-image-reset" onClick={() => resetPostedAppImage(product)} data-testid={`button-reset-image-${product.id}`}><X /><span>Use initials</span></button>}<button className="admin-delete-card" onClick={() => deleteAdminApp(product)} aria-label={`Remove ${product.name}`} data-testid={`button-manage-delete-${product.id}`}><Trash2 /><span>Remove</span></button></div></div>)}</div> : <div className="manage-empty"><div className="empty-symbol"><Terminal /></div><h3>No posted apps yet.</h3><p>Add an app first, then come back here when you need to remove it.</p><button className="detail-add" onClick={() => { setManageAppsOpen(false); setAddAppOpen(true); }} data-testid="button-manage-add-app"><FilePlus2 /> Add new app</button></div>}{imageError && <p className="image-upload-error manage-image-error" role="alert">{imageError}</p>}{generatedRemoveCommand && <div className="command-card remove-command-card" data-testid="card-generated-remove-command"><div className="command-card-head"><div><p className="detail-category">GitHub / Terminal</p><strong>Removal command</strong></div><button type="button" className="copy-command" onClick={() => copyCommand(generatedRemoveCommand)} data-testid="button-copy-remove-app-command"><Copy /> {copyLabel}</button></div><code>{generatedRemoveCommand}</code><p>Keep this command if you also want to remove the listing from the source catalog, not just this browser preview.</p></div>}</div></div></div>}

      {selectedProduct && <div className="modal-scrim" role="presentation" onClick={() => setSelectedProduct(null)}><div className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-name" onClick={(event) => event.stopPropagation()} data-testid={`dialog-product-${selectedProduct.id}`}><button className="panel-close detail-close" onClick={() => setSelectedProduct(null)} aria-label="Close app details" data-testid="button-close-product"><X /></button><div className="detail-top"><AppIcon product={selectedProduct} large /><div><p className="detail-category">{selectedProduct.category} / Authorized app</p><h2 className="detail-name" id="detail-name">{selectedProduct.name}</h2><p className="detail-publisher">Published by {selectedProduct.publisher}</p></div></div><div className="detail-body"><p className="detail-description">{selectedProduct.detail}</p><div className="detail-facts"><div className="detail-fact"><span>Version</span><strong>{selectedProduct.version}</strong></div><div className="detail-fact"><span>Download</span><strong>{selectedProduct.size}</strong></div><div className="detail-fact"><span>License</span><strong>Authorized</strong></div></div><div className="detail-bottom"><span className="detail-price">{formatPrice(selectedProduct.price)}</span><div className="detail-actions"><button className="detail-add" onClick={() => addToCart(selectedProduct)} data-testid={`button-add-to-cart-${selectedProduct.id}`}>Add to basket <ShoppingBag /></button>{buyViaContacts.map((contact) => <div className="buy-via-contact-row" key={contact.id}><a className="detail-messenger" href={contact.url} target="_blank" rel="noreferrer" data-testid={`link-buy-via-${contact.id}-${selectedProduct.id}`}>Buy via {contact.label} <MessageCircle /></a><button className="buy-via-remove" type="button" onClick={() => openBuyViaRemoveGate(contact)} aria-label={`Remove Buy via ${contact.label}`} title="Owner code required to remove"><span className="locked-trash-icon"><Trash2 /><Lock /></span></button></div>)}<button className="buy-via-add-box" type="button" onClick={openBuyViaForm} data-testid={`button-add-buy-via-${selectedProduct.id}`}><span className="buy-via-add-copy"><Plus /><span><strong>Add Buy via contact</strong><small>₱50 fee for an additional contact</small></span></span><span className="buy-via-fee">₱50</span></button>{buyViaFormOpen && <form className="buy-via-form" onSubmit={addBuyViaContact}><div className="buy-via-form-heading"><div><p className="detail-category">Additional contact</p><strong>Add a Buy via option</strong></div><span>₱50</span></div><label>Contact name <span className="buy-via-auto-label">(auto for Messenger / WhatsApp)</span><input value={buyViaForm.label} onChange={(event) => setBuyViaForm((current) => ({ ...current, label: event.target.value }))} placeholder="Auto: Messenger, WhatsApp, or custom" autoFocus /></label><label>Contact link<input type="url" value={buyViaForm.url} onChange={(event) => setBuyViaForm((current) => { const url = event.target.value; const previousAutoLabel = inferBuyViaLabel(current.url); const shouldAutoLabel = !current.label.trim() || current.label === previousAutoLabel; return { ...current, url, label: shouldAutoLabel ? inferBuyViaLabel(url) : current.label }; })} placeholder="https://..." /></label>{buyViaFormError && <p className="buy-via-form-error" role="alert">{buyViaFormError}</p>}<div className="buy-via-form-actions"><button className="buy-via-cancel" type="button" onClick={closeBuyViaForm}>Cancel</button><button className="detail-add" type="submit">Add for ₱50 <Plus /></button></div></form>}</div></div></div></div></div>}

      {buyViaRemoveTarget && <div className="modal-scrim" role="presentation" onClick={closeBuyViaRemoveGate}><form className="detail-modal buy-via-owner-modal" role="dialog" aria-modal="true" aria-labelledby="buy-via-owner-title" onClick={(event) => event.stopPropagation()} onSubmit={removeBuyViaContact}><button className="panel-close detail-close" type="button" onClick={closeBuyViaRemoveGate} aria-label="Close owner code prompt"><X /></button><div className="buy-via-lock-mark"><Trash2 /><Lock /></div><p className="detail-category">Owner only / Locked removal</p><h2 id="buy-via-owner-title">Remove Buy via {buyViaRemoveTarget.label}?</h2><p className="buy-via-owner-copy">Enter the 6-digit owner code to remove this contact option.</p><label className="buy-via-code-label">Owner code<input type="password" inputMode="numeric" autoComplete="off" maxLength={6} pattern="[0-9]{6}" value={buyViaRemovePin} onChange={(event) => setBuyViaRemovePin(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" autoFocus /></label>{buyViaRemoveError && <p className="buy-via-form-error" role="alert">{buyViaRemoveError}</p>}<button className="detail-add owner-remove-button" type="submit"><Trash2 /> Remove Buy via</button></form></div>}

      {confirmed && <div className="modal-scrim" role="presentation"><div className="detail-modal confirmation" role="dialog" aria-modal="true" aria-labelledby="confirmation-title" data-testid="dialog-checkout-confirmation"><div className="confirmation-mark"><Check /></div><h2 id="confirmation-title">Your shelf just got better.</h2><p>Your authorized app licenses are ready to be collected. This local preview stops here, but the checkout path is ready for a real handoff.</p><span className="confirmation-id" data-testid="text-confirmation-id">APPORY / READY-24</span><br /><button className="confirmation-button" onClick={() => setConfirmed(false)} data-testid="button-close-confirmation">Back to the shelf</button></div></div>}
    </div>
  );
}

export default App;
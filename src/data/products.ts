// Complete product catalog for Forneiro Éden Pizzeria

export interface Product {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  category: 'combos' | 'promocionais' | 'tradicionais' | 'premium' | 'especiais' | 'doces' | 'bebidas' | 'adicionais' | 'bordas';
  priceSmall?: number; // Broto
  priceLarge?: number; // Grande
  price?: number; // For single-price items
  image?: string;
  isPopular?: boolean;
  isNew?: boolean;
  isVegetarian?: boolean;
  isActive: boolean;
  isCustomizable?: boolean; // For Moda do Cliente
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  size?: 'broto' | 'grande';
  isHalfHalf?: boolean;
  secondHalf?: Product;
  border?: Product;
  extras?: Product[];
  drink?: Product;
  isDrinkFree?: boolean;
  comboPizzaFlavors?: Product[]; // Selected pizza flavors for combos
  customIngredients?: string[]; // For Moda do Cliente (free ingredients)
  paidIngredients?: string[]; // For Moda do Cliente (paid extras)
  notes?: string;
  totalPrice: number;
}

export interface Neighborhood {
  id: string;
  name: string;
  deliveryFee: number;
  isActive: boolean;
}

export interface Order {
  id: string;
  customer: {
    name: string;
    phone: string;
    email?: string;
    cpf?: string; // Only for PIX at payment step
  };
  address: {
    city: string;
    neighborhood: string;
    street: string;
    number: string;
    complement?: string;
    reference?: string;
  };
  deliveryType: 'delivery' | 'pickup';
  deliveryFee: number;
  paymentMethod: 'pix' | 'card' | 'cash';
  items: CartItem[];
  subtotal: number;
  total: number;
  pointsDiscount?: number;
  pointsRedeemed?: number;
  couponDiscount?: number;
  appliedCoupon?: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'delivering' | 'delivered' | 'cancelled';
  observations?: string;
  createdAt: Date;
  paymentId?: string;
  printedAt?: string;
  autoConfirmedByPix?: boolean; // Auto-confirmado via PIX
}

// Available ingredients for "Moda do Cliente" pizza
export const availableIngredients: string[] = [
  'Mussarela',
  'Catupiry',
  'Catupiry Scala',
  'Cream Cheese',
  'Cheddar',
  'Provolone',
  'Parmesão',
  'Gorgonzola',
  'Presunto',
  'Lombo Canadense',
  'Peito de Peru',
  'Bacon',
  'Pepperoni',
  'Calabresa Fatiada',
  'Calabresa Moída',
  'Frango Desfiado',
  'Carne Seca',
  'Costela Desfiada',
  'Atum',
  'Palmito',
  'Champignon',
  'Brócolis',
  'Milho Fresco',
  'Ervilha Fresca',
  'Tomate',
  'Cebola',
  'Alho Gratinado',
  'Pimenta',
  'Ovo',
  'Manjericão',
  'Azeitona',
  'Batata Palha',
];

// Meat ingredients (blocked as paid extras, except Frango which is allowed)
export const meatIngredients: string[] = [
  'Presunto',
  'Lombo Canadense',
  'Peito de Peru',
  'Bacon',
  'Pepperoni',
  'Calabresa Fatiada',
  'Calabresa Moída',
  'Carne Seca',
  'Costela Desfiada',
  'Atum', // Fish is also in this category for payment purposes
];

// Ingredients that can be added as paid extras
export const paidExtraIngredients: string[] = [
  'Frango', // Only chicken meat allowed
  'Catupiry Dallora',
  'Catupiry Scala',
  'Cream Cheese',
  'Cheddar Scala',
  'Provolone',
  'Parmesão',
  'Gorgonzola',
  'Mussarela',
];

// COMBOS
export const combos: Product[] = [
  {
    id: 'combo-casal',
    name: 'Pizza Combo Casal',
    description: '1 pizza grande (sabores promocionais) + Borda requeijão grátis + Refrigerante 2L',
    ingredients: ['1 Pizza Grande', 'Borda Requeijão', 'Refrigerante 2L'],
    category: 'combos',
    price: 63.99,
    isPopular: true,
    isActive: true,
  },
  {
    id: 'combo-familia',
    name: 'Combo Família',
    description: '2 pizzas grandes (sabores promocionais) + Borda requeijão grátis + Refrigerante 2L',
    ingredients: ['2 Pizzas Grandes', 'Borda Requeijão', 'Refrigerante 2L'],
    category: 'combos',
    price: 114.99,
    isPopular: true,
    isActive: true,
  },
];

// PIZZAS PROMOCIONAIS
export const pizzasPromocionais: Product[] = [
  {
    id: 'promo-alema',
    name: 'Alemã',
    description: 'Pizza leve e refrescante',
    ingredients: ['Milho fresco', 'Ervilha fresca', 'Tomate', 'Mussarela'],
    category: 'promocionais',
    priceSmall: 43.99,
    priceLarge: 43.99,
    isVegetarian: true,
    isActive: true,
  },
  {
    id: 'promo-argentina',
    name: 'Argentina',
    description: 'Combinação clássica e saborosa',
    ingredients: ['Presunto', 'Milho fresco', 'Mussarela'],
    category: 'promocionais',
    priceSmall: 43.99,
    priceLarge: 43.99,
    isActive: true,
  },
  {
    id: 'promo-bauru',
    name: 'Bauru',
    description: 'Clássica e saudável',
    ingredients: ['Presunto', 'Tomate', 'Mussarela'],
    category: 'promocionais',
    priceSmall: 43.99,
    priceLarge: 43.99,
    isActive: true,
  },
  {
    id: 'promo-calab-acebol',
    name: 'Calab. Acebol',
    description: 'Para quem gosta de calabresa tradicional',
    ingredients: ['Calabresa fatiada', 'Cebola'],
    category: 'promocionais',
    priceSmall: 43.99,
    priceLarge: 43.99,
    isActive: true,
  },
  {
    id: 'promo-calacatu',
    name: 'Calacatu',
    description: 'Calabresa com catupiry premium',
    ingredients: ['Calabresa fatiada', 'Cebola', 'Catupiry'],
    category: 'promocionais',
    priceSmall: 43.99,
    priceLarge: 55.99,
    isActive: true,
  },
  {
    id: 'promo-italiana',
    name: 'Italiana',
    description: 'Leve e refrescante',
    ingredients: ['Ervilha fresca', 'Tomate', 'Mussarela'],
    category: 'promocionais',
    priceSmall: 43.99,
    priceLarge: 43.99,
    isVegetarian: true,
    isActive: true,
  },
  {
    id: 'promo-milho-mussa',
    name: 'Milho e Mussa',
    description: 'Vegetariana e deliciosa',
    ingredients: ['Milho', 'Tomate', 'Mussarela'],
    category: 'promocionais',
    priceSmall: 43.99,
    priceLarge: 43.99,
    isVegetarian: true,
    isActive: true,
  },
  {
    id: 'promo-presunto-catu',
    name: 'Presunto Catu',
    description: 'Presunto com catupiry premium',
    ingredients: ['Presunto', 'Catupiry'],
    category: 'promocionais',
    priceSmall: 43.99,
    priceLarge: 55.99,
    isActive: true,
  },
  {
    id: 'promo-romeu-julieta',
    name: 'Romeu e Julieta',
    description: 'Clássica brasileira, doce e salgada',
    ingredients: ['Mussarela', 'Goiabada'],
    category: 'promocionais',
    priceSmall: 43.99,
    priceLarge: 43.99,
    isActive: true,
  },
  {
    id: 'promo-seleta',
    name: 'Seléta',
    description: 'Vegetariana completa',
    ingredients: ['Milho fresco', 'Ervilha fresca', 'Cebola', 'Mussarela'],
    category: 'promocionais',
    priceSmall: 43.99,
    priceLarge: 43.99,
    isVegetarian: true,
    isActive: true,
  },
];

// PIZZAS TRADICIONAIS
export const pizzasTradicionais: Product[] = [
  {
    id: 'trad-atum',
    name: 'Atum',
    description: 'Deliciosa e nutritiva',
    ingredients: ['Atum original', 'Cebola', 'Tomate', 'Mussarela'],
    category: 'tradicionais',
    priceSmall: 60.99,
    priceLarge: 60.99,
    isActive: true,
  },
  {
    id: 'trad-americana',
    name: 'Americana',
    description: 'Clássica mundial',
    ingredients: ['Presunto', 'Champignon', 'Cebola', 'Mussarela'],
    category: 'tradicionais',
    priceSmall: 58.99,
    priceLarge: 58.99,
    isActive: true,
  },
  {
    id: 'trad-alho-oleo',
    name: 'Alho e Óleo',
    description: 'Simples e saborosa',
    ingredients: ['Tomate', 'Mussarela', 'Alho gratinado'],
    category: 'tradicionais',
    priceSmall: 52.99,
    priceLarge: 52.99,
    isVegetarian: true,
    isActive: true,
  },
  {
    id: 'trad-bacon',
    name: 'Bacon',
    description: 'Para fãs de bacon',
    ingredients: ['Mussarela', 'Cebola', 'Bacon'],
    category: 'tradicionais',
    priceSmall: 60.99,
    priceLarge: 60.99,
    isActive: true,
  },
  {
    id: 'trad-baiana',
    name: 'Baiana',
    description: 'Autêntica baiana com pimenta',
    ingredients: ['Calabresa moída', 'Ovo', 'Cebola', 'Mussarela', 'Pimenta'],
    category: 'tradicionais',
    priceSmall: 54.99,
    priceLarge: 54.99,
    isActive: true,
  },
  {
    id: 'trad-brocolis',
    name: 'Brócolis',
    description: 'Completa e saudável',
    ingredients: ['Brócolis', 'Mussarela', 'Bacon', 'Alho gratinado'],
    category: 'tradicionais',
    priceSmall: 67.99,
    priceLarge: 67.99,
    isActive: true,
  },
  {
    id: 'trad-calab-mussa',
    name: 'Calab e Mussa',
    description: 'Tradicional pura',
    ingredients: ['Calabresa fatiada', 'Cebola', 'Mussarela'],
    category: 'tradicionais',
    priceSmall: 50.99,
    priceLarge: 50.99,
    isPopular: true,
    isActive: true,
  },
  {
    id: 'trad-champignon',
    name: 'Champignon',
    description: 'Vegetariana sofisticada',
    ingredients: ['Champignon', 'Cebola', 'Mussarela'],
    category: 'tradicionais',
    priceSmall: 54.99,
    priceLarge: 54.99,
    isVegetarian: true,
    isActive: true,
  },
  {
    id: 'trad-dois-queijos',
    name: 'Dois Queijos',
    description: 'Queijuda deliciosa',
    ingredients: ['Catupiry', 'Tomate', 'Mussarela'],
    category: 'tradicionais',
    priceSmall: 51.99,
    priceLarge: 62.99,
    isVegetarian: true,
    isActive: true,
  },
  {
    id: 'trad-frango-mussa',
    name: 'Frango e Mussa',
    description: 'Leve e saborosa',
    ingredients: ['Frango desfiado', 'Tomate', 'Mussarela'],
    category: 'tradicionais',
    priceSmall: 57.99,
    priceLarge: 57.99,
    isActive: true,
  },
  {
    id: 'trad-frango-catupiry',
    name: 'Frango e Catupi',
    description: 'Premium acessível',
    ingredients: ['Frango desfiado', 'Catupiry', 'Mussarela'],
    category: 'tradicionais',
    priceSmall: 57.99,
    priceLarge: 69.99,
    isPopular: true,
    isActive: true,
  },
  {
    id: 'trad-francesa',
    name: 'Francesa',
    description: 'Sofisticada clássica',
    ingredients: ['Presunto', 'Ervilha fresca', 'Champignon', 'Ovo', 'Palmito', 'Cebola', 'Mussarela'],
    category: 'tradicionais',
    priceSmall: 65.99,
    priceLarge: 65.99,
    isActive: true,
  },
  {
    id: 'trad-lombinho',
    name: 'Lombinho',
    description: 'Saudável e nobre',
    ingredients: ['Lombo canadense', 'Cebola', 'Mussarela'],
    category: 'tradicionais',
    priceSmall: 55.99,
    priceLarge: 55.99,
    isActive: true,
  },
  {
    id: 'trad-marguerita',
    name: 'Marguerita',
    description: 'Italiana autêntica',
    ingredients: ['Mussarela', 'Parmesão', 'Tomate', 'Manjericão'],
    category: 'tradicionais',
    priceSmall: 51.99,
    priceLarge: 51.99,
    isVegetarian: true,
    isPopular: true,
    isActive: true,
  },
  {
    id: 'trad-marguerita-alho',
    name: 'Marguerita Alho e Óleo',
    description: 'Margherita reforçada',
    ingredients: ['Mussarela', 'Parmesão', 'Tomate', 'Manjericão', 'Alho gratinado'],
    category: 'tradicionais',
    priceSmall: 55.99,
    priceLarge: 55.99,
    isVegetarian: true,
    isActive: true,
  },
  {
    id: 'trad-mussarela',
    name: 'Mussarela',
    description: 'A mais clássica de todas',
    ingredients: ['Mussarela', 'Tomate'],
    category: 'tradicionais',
    priceSmall: 51.99,
    priceLarge: 51.99,
    isVegetarian: true,
    isPopular: true,
    isActive: true,
  },
  {
    id: 'trad-milho-catupiry',
    name: 'Milho com Catupiry',
    description: 'Doce e salgada',
    ingredients: ['Milho fresco', 'Catupiry', 'Tomate', 'Mussarela'],
    category: 'tradicionais',
    priceSmall: 51.99,
    priceLarge: 62.99,
    isVegetarian: true,
    isActive: true,
  },
  {
    id: 'trad-napolitana',
    name: 'Napolitana',
    description: 'Italiana simples',
    ingredients: ['Mussarela', 'Parmesão', 'Tomate'],
    category: 'tradicionais',
    priceSmall: 52.99,
    priceLarge: 52.99,
    isVegetarian: true,
    isActive: true,
  },
  {
    id: 'trad-palmito',
    name: 'Palmito',
    description: 'Vegetariana sofisticada',
    ingredients: ['Mussarela', 'Palmito', 'Cebola'],
    category: 'tradicionais',
    priceSmall: 53.99,
    priceLarge: 53.99,
    isVegetarian: true,
    isActive: true,
  },
  {
    id: 'trad-portuguesa',
    name: 'Portuguesa',
    description: 'A mais completa',
    ingredients: ['Presunto', 'Milho fresco', 'Ervilha fresca', 'Ovo', 'Cebola', 'Mussarela'],
    category: 'tradicionais',
    priceSmall: 56.99,
    priceLarge: 56.99,
    isPopular: true,
    isActive: true,
  },
  {
    id: 'trad-quatro-queijos',
    name: 'Quatro Queijos Trad',
    description: 'Para apreciadores de queijo',
    ingredients: ['Catupiry', 'Mussarela', 'Parmesão', 'Provolone', 'Tomate'],
    category: 'tradicionais',
    priceSmall: 61.99,
    priceLarge: 73.99,
    isVegetarian: true,
    isActive: true,
  },
  {
    id: 'trad-toscana',
    name: 'Toscana',
    description: 'Italiana com calabresa',
    ingredients: ['Calabresa moída', 'Cebola', 'Mussarela'],
    category: 'tradicionais',
    priceSmall: 50.99,
    priceLarge: 50.99,
    isActive: true,
  },
  {
    id: 'trad-tres-queijos',
    name: 'Três Queijos',
    description: 'Triologia de queijos',
    ingredients: ['Catupiry', 'Mussarela', 'Parmesão', 'Tomate'],
    category: 'tradicionais',
    priceSmall: 57.99,
    priceLarge: 69.99,
    isVegetarian: true,
    isActive: true,
  },
  {
    id: 'trad-siciliana',
    name: 'Siciliana',
    description: 'Italiana robusta',
    ingredients: ['Champignon', 'Cebola', 'Mussarela', 'Bacon'],
    category: 'tradicionais',
    priceSmall: 60.99,
    priceLarge: 60.99,
    isActive: true,
  },
  {
    id: 'trad-vegetariana',
    name: 'Vegetariana Trad',
    description: 'Vegetariana completa',
    ingredients: ['Brócolis', 'Milho fresco', 'Ervilha fresca', 'Palmito', 'Tomate', 'Mussarela'],
    category: 'tradicionais',
    priceSmall: 65.99,
    priceLarge: 65.99,
    isVegetarian: true,
    isActive: true,
  },
  {
    id: 'trad-frango-cheddar',
    name: 'Frango e Cheddar',
    description: 'Cremosa e saborosa',
    ingredients: ['Frango desfiado', 'Cheddar scala', 'Mussarela'],
    category: 'tradicionais',
    priceSmall: 66.99,
    priceLarge: 66.99,
    isActive: true,
  },
  {
    id: 'trad-brasileira',
    name: 'Brasileira',
    description: 'Premium com cara de Brasil',
    ingredients: ['Frango desfiado', 'Milho', 'Catupiry', 'Tomate', 'Cebola', 'Mussarela', 'Provolone'],
    category: 'tradicionais',
    priceSmall: 69.99,
    priceLarge: 81.99,
    isActive: true,
  },
];

// PIZZAS PREMIUM
export const pizzasPremium: Product[] = [
  {
    id: 'prem-carijo',
    name: 'Carijo',
    description: 'Combinação perfeita com texturas variadas',
    ingredients: ['Frango desfiado', 'Milho', 'Catupiry', 'Mussarela', 'Batata palha'],
    category: 'premium',
    priceSmall: 65.99,
    priceLarge: 77.99,
    isActive: true,
  },
  {
    id: 'prem-cinco-queijos',
    name: 'Cinco Queijos',
    description: 'Para os amantes de queijo - cinco queijos nobres',
    ingredients: ['Catupiry', 'Mussarela', 'Parmesão', 'Provolone', 'Gorgonzola', 'Tomate'],
    category: 'premium',
    priceSmall: 66.99,
    priceLarge: 78.99,
    isVegetarian: true,
    isActive: true,
  },
  {
    id: 'prem-frango-forneiro',
    name: 'Frango Forneiro',
    description: 'Receita especial da casa',
    ingredients: ['Frango desfiado', 'Milho', 'Champignon', 'Palmito', 'Mussarela'],
    category: 'premium',
    priceSmall: 69.99,
    priceLarge: 81.99,
    isPopular: true,
    isActive: true,
  },
  {
    id: 'prem-frango-catu-bacon',
    name: 'Frango Catupiry com Bacon',
    description: 'Combinação de sabores únicos',
    ingredients: ['Frango desfiado', 'Catupiry', 'Bacon', 'Mussarela'],
    category: 'premium',
    priceSmall: 67.99,
    priceLarge: 79.99,
    isActive: true,
  },
  {
    id: 'prem-grega',
    name: 'Grega',
    description: 'Refinada e sofisticada',
    ingredients: ['Presunto', 'Lombo', 'Palmito', 'Ervilha', 'Catupiry', 'Mussarela'],
    category: 'premium',
    priceSmall: 69.99,
    priceLarge: 81.99,
    isActive: true,
  },
  {
    id: 'prem-moda-carlinhos',
    name: 'Moda do Carlinhos',
    description: 'Premium completa com múltiplos ingredientes',
    ingredients: ['Frango', 'Lombo', 'Brócolis', 'Catupiry', 'Ovo', 'Presunto', 'Bacon', 'Mussarela'],
    category: 'premium',
    priceSmall: 84.99,
    priceLarge: 96.99,
    isActive: true,
  },
  {
    id: 'prem-moda-casa',
    name: 'Moda da Casa',
    description: 'Receita clássica da pizzaria',
    ingredients: ['Presunto', 'Bacon', 'Palmito', 'Tomate', 'Ervilha', 'Cebola', 'Milho', 'Ovos', 'Mussarela', 'Catupiry'],
    category: 'premium',
    priceSmall: 69.99,
    priceLarge: 81.99,
    isPopular: true,
    isActive: true,
  },
  {
    id: 'prem-moda-cliente',
    name: 'Moda do Cliente',
    description: 'Customize sua própria pizza premium - escolha até 6 ingredientes grátis',
    ingredients: ['6 ingredientes à sua escolha'],
    category: 'premium',
    priceSmall: 71.99,
    priceLarge: 79.99,
    isCustomizable: true,
    isActive: true,
  },
  {
    id: 'prem-moda-chefe',
    name: 'Moda do Chefe',
    description: 'Criação exclusiva do chef',
    ingredients: ['Frango', 'Calabresa ralada', 'Cream cheese', 'Mussarela', 'Bacon'],
    category: 'premium',
    priceSmall: 85.99,
    priceLarge: 96.99,
    isNew: true,
    isActive: true,
  },
  {
    id: 'prem-moda-patrao',
    name: 'Moda do Patrão',
    description: 'Premium robusta e saborosa',
    ingredients: ['Frango desfiado', 'Calabresa fatiada', 'Milho fresco', 'Palmito', 'Catupiry scala', 'Mussarela', 'Bacon'],
    category: 'premium',
    priceSmall: 65.99,
    priceLarge: 77.99,
    isActive: true,
  },
  {
    id: 'prem-portuguesa-forn',
    name: 'Portuguesa Forn',
    description: 'Versão premium da portuguesa tradicional',
    ingredients: ['Presunto', 'Milho', 'Ervilha', 'Palmito', 'Cebola', 'Ovo', 'Catupiry', 'Mussarela'],
    category: 'premium',
    priceSmall: 46.99,
    priceLarge: 65.99,
    isActive: true,
  },
  {
    id: 'prem-pepperoni',
    name: 'Pepperoni',
    description: 'Clássica internacional com toque especial',
    ingredients: ['Pepperoni', 'Champignon', 'Cebola', 'Tomate', 'Mussarela'],
    category: 'premium',
    priceSmall: 69.99,
    priceLarge: 76.99,
    isPopular: true,
    isActive: true,
  },
  {
    id: 'prem-primavera-catu',
    name: 'Primavera com Catupiry',
    description: 'Fresca e sofisticada',
    ingredients: ['Lombo', 'Milho', 'Palmito', 'Cebola', 'Catupiry', 'Mussarela'],
    category: 'premium',
    priceSmall: 69.99,
    priceLarge: 81.99,
    isActive: true,
  },
];

// PIZZAS ESPECIAIS
export const pizzasEspeciais: Product[] = [
  {
    id: 'esp-carne-seca',
    name: 'Carne Seca',
    description: 'Sabor nordestino marcante',
    ingredients: ['Carne seca desfiada', 'Cebola', 'Tomate', 'Mussarela'],
    category: 'especiais',
    priceSmall: 55.99,
    priceLarge: 73.99,
    isActive: true,
  },
  {
    id: 'esp-carne-seca-catu',
    name: 'Carne Seca com Catupiry',
    description: 'Nordestina cremosa',
    ingredients: ['Carne seca desfiada', 'Cebola', 'Catupiry scala', 'Tomate', 'Mussarela'],
    category: 'especiais',
    priceSmall: 60.99,
    priceLarge: 82.99,
    isActive: true,
  },
  {
    id: 'esp-costela',
    name: 'Costela',
    description: 'Carne de qualidade',
    ingredients: ['Costela desfiada', 'Cebola', 'Mussarela'],
    category: 'especiais',
    priceSmall: 55.99,
    priceLarge: 71.99,
    isActive: true,
  },
  {
    id: 'esp-costela-catu',
    name: 'Costela com Catupiry',
    description: 'Costela premium',
    ingredients: ['Costela desfiada', 'Cebola', 'Catupiry scala', 'Mussarela'],
    category: 'especiais',
    priceSmall: 60.99,
    priceLarge: 82.99,
    isPopular: true,
    isActive: true,
  },
  {
    id: 'esp-frango-cream',
    name: 'Frango com Cream Cheese',
    description: 'Cremosa e saborosa',
    ingredients: ['Frango desfiado', 'Cream cheese scala', 'Mussarela', 'Bacon'],
    category: 'especiais',
    priceSmall: 50.99,
    priceLarge: 68.99,
    isActive: true,
  },
  {
    id: 'esp-lombo-especial',
    name: 'Lombo Especial',
    description: 'Saudável e nobre',
    ingredients: ['Lombo canadense', 'Cream cheese scala', 'Tomate', 'Mussarela'],
    category: 'especiais',
    priceSmall: 47.99,
    priceLarge: 70.99,
    isActive: true,
  },
  {
    id: 'esp-lombo-cream',
    name: 'Lombo com Cream Cheese',
    description: 'Proteína pura',
    ingredients: ['Lombo canadense', 'Cream cheese scala', 'Bacon'],
    category: 'especiais',
    priceSmall: 47.99,
    priceLarge: 70.99,
    isActive: true,
  },
  {
    id: 'esp-light',
    name: 'Light',
    description: 'Para quem cuida da saúde',
    ingredients: ['Peito de peru', 'Palmito', 'Mussarela'],
    category: 'especiais',
    priceSmall: 47.99,
    priceLarge: 70.99,
    isActive: true,
  },
  {
    id: 'esp-modesta',
    name: 'Modesta',
    description: 'Leve e cremosa',
    ingredients: ['Peito de peru', 'Cream cheese scala', 'Mussarela'],
    category: 'especiais',
    priceSmall: 47.99,
    priceLarge: 70.99,
    isActive: true,
  },
  {
    id: 'esp-palmito-especial',
    name: 'Palmito Especial',
    description: 'Vegetariana sofisticada',
    ingredients: ['Palmito', 'Catupiry scala', 'Mussarela', 'Bacon'],
    category: 'especiais',
    priceSmall: 50.99,
    priceLarge: 70.99,
    isActive: true,
  },
  {
    id: 'esp-peru',
    name: 'Peru',
    description: 'Saudável e leve',
    ingredients: ['Peito de peru', 'Tomate', 'Mussarela'],
    category: 'especiais',
    priceSmall: 43.99,
    priceLarge: 57.99,
    isActive: true,
  },
  {
    id: 'esp-sorocabana',
    name: 'Sorocabana',
    description: 'Completa e equilibrada',
    ingredients: ['Peito de peru', 'Ovos', 'Palmito', 'Tomate', 'Mussarela', 'Parmesão'],
    category: 'especiais',
    priceSmall: 52.99,
    priceLarge: 75.99,
    isActive: true,
  },
  {
    id: 'esp-strogonoff',
    name: 'Strogonoff de Frango',
    description: 'Cremosa e rica',
    ingredients: ['Frango desfiado', 'Cream cheese scala', 'Champignon', 'Batata palha', 'Mussarela'],
    category: 'especiais',
    priceSmall: 50.99,
    priceLarge: 72.99,
    isPopular: true,
    isActive: true,
  },
  {
    id: 'esp-suina',
    name: 'Suína',
    description: 'Para fãs de carne suína',
    ingredients: ['Lombo canadense', 'Bacon', 'Mussarela'],
    category: 'especiais',
    priceSmall: 47.99,
    priceLarge: 70.99,
    isActive: true,
  },
  {
    id: 'esp-sulamericana',
    name: 'Sulamericana',
    description: 'Saborosa e encorpada',
    ingredients: ['Carne seca desfiada', 'Bacon', 'Catupiry scala', 'Cebola', 'Mussarela'],
    category: 'especiais',
    priceSmall: 52.99,
    priceLarge: 75.99,
    isActive: true,
  },
  {
    id: 'esp-vegetariana-esp',
    name: 'Vegetariana Especial',
    description: 'Vegetariana premium completa',
    ingredients: ['Brócolis', 'Milho fresco', 'Ervilha fresca', 'Palmito', 'Tomate', 'Catupiry scala', 'Mussarela'],
    category: 'especiais',
    priceSmall: 52.99,
    priceLarge: 75.99,
    isVegetarian: true,
    isActive: true,
  },
];

// PIZZAS DOCES
export const pizzasDoces: Product[] = [
  {
    id: 'doce-brigadeiro',
    name: 'Brigadeiro',
    description: 'Tradicional brasileira, doce e irresistível',
    ingredients: ['Chocolate preto', 'Granulado'],
    category: 'doces',
    priceSmall: 40.99,
    priceLarge: 52.99,
    isPopular: true,
    isActive: true,
  },
  {
    id: 'doce-californa',
    name: 'Califórnia',
    description: 'Refrescante e tropical',
    ingredients: ['Banana', 'Canela', 'Açúcar'],
    category: 'doces',
    priceSmall: 40.99,
    priceLarge: 52.99,
    isVegetarian: true,
    isActive: true,
  },
  {
    id: 'doce-chocolate-morango',
    name: 'Chocolate com Morango',
    description: 'Sofisticada e romântica',
    ingredients: ['Chocolate preto', 'Morango', 'Leite condensado'],
    category: 'doces',
    priceSmall: 48.99,
    priceLarge: 65.99,
    isActive: true,
  },
  {
    id: 'doce-chocomix',
    name: 'Chocomix',
    description: 'Dualidade de sabores',
    ingredients: ['Chocolate preto', 'Chocolate branco', 'Granulado'],
    category: 'doces',
    priceSmall: 45.99,
    priceLarge: 58.99,
    isActive: true,
  },
  {
    id: 'doce-doce-leite',
    name: 'Doce de Leite',
    description: 'Doçura concentrada',
    ingredients: ['Doce de leite', 'Granulado'],
    category: 'doces',
    priceSmall: 45.99,
    priceLarge: 55.99,
    isActive: true,
  },
  {
    id: 'doce-ovomaltine',
    name: 'Ovomaltine',
    description: 'Cremosa e sofisticada',
    ingredients: ['Chocolate preto', 'Ovomaltine', 'Cereja'],
    category: 'doces',
    priceSmall: 45.99,
    priceLarge: 62.99,
    isActive: true,
  },
  {
    id: 'doce-oreo',
    name: 'Oreo',
    description: 'Requintada e moderna',
    ingredients: ['Creme de avelã', 'Oreo', 'Cereja'],
    category: 'doces',
    priceSmall: 48.99,
    priceLarge: 63.99,
    isNew: true,
    isActive: true,
  },
];

// BEBIDAS
export const bebidas: Product[] = [
  {
    id: 'beb-coca-2l',
    name: 'Coca-Cola 2L',
    description: 'Refrigerante gelado refrescante',
    ingredients: [],
    category: 'bebidas',
    price: 14.00,
    isPopular: true,
    isActive: true,
  },
  {
    id: 'beb-guarana-2l',
    name: 'Guaraná Antarctica 2L',
    description: 'Refrigerante de guaraná gelado',
    ingredients: [],
    category: 'bebidas',
    price: 14.00,
    isActive: true,
  },
  {
    id: 'beb-sprite-2l',
    name: 'Sprite 2L',
    description: 'Refrigerante cítrico gelado',
    ingredients: [],
    category: 'bebidas',
    price: 14.00,
    isActive: true,
  },
];

// ADICIONAIS
export const adicionais: Product[] = [
  { id: 'add-alho', name: 'Alho Gratinado', description: 'Alho extra gratinado', ingredients: [], category: 'adicionais', price: 6.99, isActive: true },
  { id: 'add-cebola', name: 'Cebola', description: 'Cebola fresca extra', ingredients: [], category: 'adicionais', price: 6.99, isActive: true },
  { id: 'add-ervilha', name: 'Ervilha', description: 'Ervilha fresca extra', ingredients: [], category: 'adicionais', price: 6.99, isActive: true },
  { id: 'add-milho', name: 'Milho', description: 'Milho fresco extra', ingredients: [], category: 'adicionais', price: 6.99, isActive: true },
  { id: 'add-pimenta', name: 'Pimenta', description: 'Pimenta fresca extra', ingredients: [], category: 'adicionais', price: 6.99, isActive: true },
  { id: 'add-ovo', name: 'Ovo', description: 'Ovo fresco extra', ingredients: [], category: 'adicionais', price: 8.99, isActive: true },
  { id: 'add-atum', name: 'Atum', description: 'Atum original extra', ingredients: [], category: 'adicionais', price: 13.99, isActive: true },
  { id: 'add-bacon', name: 'Bacon', description: 'Bacon crocante extra', ingredients: [], category: 'adicionais', price: 14.99, isActive: true },
  { id: 'add-frango', name: 'Frango', description: 'Frango desfiado extra', ingredients: [], category: 'adicionais', price: 12.99, isActive: true },
  { id: 'add-lombinho', name: 'Lombinho', description: 'Lombo canadense extra', ingredients: [], category: 'adicionais', price: 12.99, isActive: true },
  { id: 'add-palmito', name: 'Palmito', description: 'Palmito fresco extra', ingredients: [], category: 'adicionais', price: 12.99, isActive: true },
  { id: 'add-pepperoni', name: 'Pepperoni', description: 'Pepperoni extra', ingredients: [], category: 'adicionais', price: 14.99, isActive: true },
  { id: 'add-presunto', name: 'Presunto', description: 'Presunto premium extra', ingredients: [], category: 'adicionais', price: 13.99, isActive: true },
  { id: 'add-batata-palha', name: 'Batata Palha', description: 'Batata palha crocante extra', ingredients: [], category: 'adicionais', price: 9.99, isActive: true },
  { id: 'add-brocolis', name: 'Brócolis', description: 'Brócolis fresco extra', ingredients: [], category: 'adicionais', price: 13.99, isActive: true },
  { id: 'add-champignon', name: 'Champignon', description: 'Champignon fresco extra', ingredients: [], category: 'adicionais', price: 10.99, isActive: true },
  { id: 'add-provolone', name: 'Provolone', description: 'Queijo provolone extra', ingredients: [], category: 'adicionais', price: 9.99, isActive: true },
  { id: 'add-catupiry-dallora', name: 'Catupiry Dallora', description: 'Catupiry marca Dallora extra', ingredients: [], category: 'adicionais', price: 8.99, isActive: true },
  { id: 'add-catupiry-scala', name: 'Catupiry Scala', description: 'Catupiry scala ou origin extra (premium)', ingredients: [], category: 'adicionais', price: 13.99, isActive: true },
  { id: 'add-cheddar', name: 'Cheddar Scala', description: 'Cheddar scala extra', ingredients: [], category: 'adicionais', price: 13.99, isActive: true },
  { id: 'add-gorgonzola', name: 'Gorgonzola', description: 'Queijo gorgonzola azul extra', ingredients: [], category: 'adicionais', price: 12.99, isActive: true },
  { id: 'add-mussarela', name: 'Mussarela', description: 'Mussarela extra', ingredients: [], category: 'adicionais', price: 13.99, isActive: true },
  { id: 'add-parmesao', name: 'Parmesão', description: 'Queijo parmesão ralado extra', ingredients: [], category: 'adicionais', price: 12.99, isActive: true },
];

// BORDAS
export const bordas: Product[] = [
  { id: 'borda-requeijao', name: 'Requeijão', description: 'Borda recheada com requeijão, clássica e cremosa', ingredients: [], category: 'bordas', price: 6.99, isPopular: true, isActive: true },
  { id: 'borda-mussarela', name: 'Mussarela', description: 'Borda recheada com mussarela derretida, generosa', ingredients: [], category: 'bordas', price: 20.99, isActive: true },
  { id: 'borda-cheddar', name: 'Cheddar Scala', description: 'Borda recheada com cheddar scala, cremosa e saborosa', ingredients: [], category: 'bordas', price: 17.99, isActive: true },
  { id: 'borda-catupiry', name: 'Catupiry Scala', description: 'Borda recheada com catupiry scala, macio e delicioso', ingredients: [], category: 'bordas', price: 17.99, isActive: true },
  { id: 'borda-cream-cheese', name: 'Cream Cheese', description: 'Borda recheada com cream cheese scala, sofisticada', ingredients: [], category: 'bordas', price: 17.99, isActive: true },
  { id: 'borda-chocolate-preto', name: 'Chocolate Preto', description: 'Borda recheada com chocolate preto', ingredients: [], category: 'bordas', price: 17.99, isActive: true },
  { id: 'borda-chocolate-branco', name: 'Chocolate Branco', description: 'Borda recheada com chocolate branco, mais doce', ingredients: [], category: 'bordas', price: 17.99, isActive: true },
  { id: 'borda-doce-leite', name: 'Doce de Leite', description: 'Borda recheada com doce de leite, tradicional', ingredients: [], category: 'bordas', price: 17.99, isActive: true },
  { id: 'borda-goiabada', name: 'Goiabada', description: 'Borda recheada com goiabada, sabor tropical', ingredients: [], category: 'bordas', price: 17.99, isActive: true },
];

// BAIRROS
export const neighborhoodsData: Neighborhood[] = [
  { id: 'centro', name: 'Centro', deliveryFee: 5.00, isActive: true },
  { id: 'zona-norte', name: 'Zona Norte', deliveryFee: 8.00, isActive: true },
  { id: 'zona-sul', name: 'Zona Sul', deliveryFee: 8.00, isActive: true },
  { id: 'zona-leste', name: 'Zona Leste', deliveryFee: 10.00, isActive: true },
  { id: 'zona-oeste', name: 'Zona Oeste', deliveryFee: 10.00, isActive: true },
  { id: 'periferia', name: 'Periferia', deliveryFee: 12.00, isActive: true },
  { id: 'vila-mariana', name: 'Vila Mariana', deliveryFee: 6.00, isActive: true },
  { id: 'brooklin', name: 'Brooklin', deliveryFee: 7.00, isActive: true },
  { id: 'bela-vista', name: 'Bela Vista', deliveryFee: 5.50, isActive: true },
  { id: 'consolacao', name: 'Consolação', deliveryFee: 5.50, isActive: true },
  { id: 'santa-cecilia', name: 'Santa Cecília', deliveryFee: 6.50, isActive: true },
  { id: 'republica', name: 'República', deliveryFee: 5.00, isActive: true },
  { id: 'pari', name: 'Pari', deliveryFee: 7.50, isActive: true },
  { id: 'tatuape', name: 'Tatuapé', deliveryFee: 9.00, isActive: true },
  { id: 'penha', name: 'Penha', deliveryFee: 11.00, isActive: true },
  { id: 'itaquera', name: 'Itaquera', deliveryFee: 12.00, isActive: true },
  { id: 'guaianazes', name: 'Guaianazes', deliveryFee: 13.00, isActive: true },
  { id: 'sao-miguel', name: 'São Miguel Paulista', deliveryFee: 14.00, isActive: true },
  { id: 'ermelino', name: 'Ermelino Matarazzo', deliveryFee: 13.50, isActive: true },
  { id: 'cidade-tiradentes', name: 'Cidade Tiradentes', deliveryFee: 15.00, isActive: true },
];

// Helper to get all products
export const getAllProducts = (): Product[] => [
  ...combos,
  ...pizzasPromocionais,
  ...pizzasTradicionais,
  ...pizzasPremium,
  ...pizzasEspeciais,
  ...pizzasDoces,
  ...bebidas,
  ...adicionais,
  ...bordas,
];

// Helper to get all pizzas (for half-half selection)
export const getAllPizzas = (): Product[] => [
  ...pizzasPromocionais,
  ...pizzasTradicionais,
  ...pizzasPremium,
  ...pizzasEspeciais,
  ...pizzasDoces,
];

// Helper to get promotional pizzas only (for combos)
export const getPromotionalPizzas = (): Product[] => [
  ...pizzasPromocionais,
];

// Category labels
export const categoryLabels: Record<string, string> = {
  combos: 'Combos',
  promocionais: 'Promocionais',
  tradicionais: 'Tradicionais',
  premium: 'Premium',
  especiais: 'Especiais',
  doces: 'Doces',
  bebidas: 'Bebidas',
  adicionais: 'Adicionais',
  bordas: 'Bordas',
};

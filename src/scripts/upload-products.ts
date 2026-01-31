import { supabase } from '@/integrations/supabase/client';
import {
  combos,
  pizzasPromocionais,
  pizzasTradicionais,
  pizzasPremium,
  pizzasEspeciais,
  pizzasDoces,
  bebidas,
  adicionais,
  bordas,
} from '@/data/products';

/**
 * Script para fazer upload de todos os produtos do arquivo local
 * para a tabela products do Supabase
 * 
 * Execute: npx tsx src/scripts/upload-products.ts
 */

async function uploadProducts() {
  try {
    console.log('🚀 Iniciando upload de produtos...\n');

    // Combinar todos os produtos
    const allProducts = [
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

    console.log(`📦 Total de produtos a fazer upload: ${allProducts.length}\n`);

    // Transformar produtos para formato correto do Supabase
    const productsToInsert = allProducts.map((product) => {
      // Determinar preço único
      let price = product.price;
      if (!price && product.priceSmall) {
        price = product.priceSmall;
      }

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: price || 0,
        price_small: product.priceSmall || null,
        price_large: product.priceLarge || null,
        category: product.category,
        ingredients: product.ingredients || [],
        image: product.image || '',
        is_popular: product.isPopular || false,
        is_new: product.isNew || false,
        is_vegetarian: product.isVegetarian || false,
        is_active: product.isActive,
        is_customizable: product.isCustomizable || false,
      };
    });

    // Fazer upload em lotes de 100 para evitar limite
    const batchSize = 100;
    let uploadedCount = 0;

    for (let i = 0; i < productsToInsert.length; i += batchSize) {
      const batch = productsToInsert.slice(i, i + batchSize);

      const query = (supabase as any)
        .from('products')
        .upsert(batch, { onConflict: 'id' });
      
      const { error } = await query;

      if (error) {
        console.error(`❌ Erro ao fazer upload do lote ${i / batchSize + 1}:`, error);
      } else {
        uploadedCount += batch.length;
        console.log(`✅ Lote ${i / batchSize + 1} concluído (${uploadedCount}/${productsToInsert.length})`);
      }
    }

    console.log(`\n🎉 Upload concluído com sucesso!`);
    console.log(`📊 Total de produtos enviados: ${uploadedCount}`);

    // Listar produtos por categoria
    console.log('\n📂 Produtos por categoria:');
    const categories = {
      combos: combos.length,
      promocionais: pizzasPromocionais.length,
      tradicionais: pizzasTradicionais.length,
      premium: pizzasPremium.length,
      especiais: pizzasEspeciais.length,
      doces: pizzasDoces.length,
      bebidas: bebidas.length,
      adicionais: adicionais.length,
      bordas: bordas.length,
    };

    Object.entries(categories).forEach(([category, count]) => {
      console.log(`  • ${category}: ${count} produtos`);
    });
  } catch (error) {
    console.error('💥 Erro geral:', error);
    process.exit(1);
  }
}

// Executar script
uploadProducts();

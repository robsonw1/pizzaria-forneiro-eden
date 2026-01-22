import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/data/products";
import { categoryLabels } from "@/data/products";
import { useCatalogStore } from "@/store/useCatalogStore";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
};

const categoryOptions = [
  "combos",
  "promocionais",
  "tradicionais",
  "premium",
  "especiais",
  "doces",
  "bebidas",
  "adicionais",
  "bordas",
] as const;

export function ProductFormDialog({ open, onOpenChange, product }: Props) {
  const upsertProduct = useCatalogStore((s) => s.upsertProduct);

  const isEdit = !!product;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Product["category"]>("promocionais");
  const [price, setPrice] = useState<string>("");
  const [priceSmall, setPriceSmall] = useState<string>("");
  const [priceLarge, setPriceLarge] = useState<string>("");

  const isPizzaCategory = useMemo(
    () =>
      [
        "promocionais",
        "tradicionais",
        "premium",
        "especiais",
        "doces",
      ].includes(category as any),
    [category]
  );

  useEffect(() => {
    if (!open) return;
    if (!product) return;

    setName(product.name ?? "");
    setDescription(product.description ?? "");
    setCategory(product.category ?? "promocionais");

    // Pre-fill price fields based on product type
    setPrice(product.price != null ? String(product.price) : "");
    setPriceSmall(product.priceSmall != null ? String(product.priceSmall) : "");
    setPriceLarge(product.priceLarge != null ? String(product.priceLarge) : "");
  }, [open, product]);

  const reset = () => {
    setName("");
    setDescription("");
    setCategory("promocionais");
    setPrice("");
    setPriceSmall("");
    setPriceLarge("");
  };

  const toNumberOrUndefined = (v: string) => {
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const nextProduct: Product = {
      ...(product ?? {
        id: `custom-${Date.now()}`,
        ingredients: [],
        isActive: true,
      }),
      name: trimmed,
      description: description.trim(),
      category,
      price: !isPizzaCategory ? toNumberOrUndefined(price) : undefined,
      priceSmall: isPizzaCategory ? toNumberOrUndefined(priceSmall) : undefined,
      priceLarge: isPizzaCategory ? toNumberOrUndefined(priceLarge) : undefined,
    };

    upsertProduct(nextProduct);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Produto" : "Novo Produto"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="p-name">Nome</Label>
            <Input
              id="p-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Calabresa"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="p-desc">Descrição</Label>
            <Input
              id="p-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: Mussarela, calabresa fatiada e cebola"
            />
          </div>

          <div className="grid gap-2">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {categoryLabels[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isPizzaCategory ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="p-broto">Preço Broto</Label>
                <Input
                  id="p-broto"
                  value={priceSmall}
                  onChange={(e) => setPriceSmall(e.target.value)}
                  placeholder="Ex.: 49.99"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="p-grande">Preço Grande</Label>
                <Input
                  id="p-grande"
                  value={priceLarge}
                  onChange={(e) => setPriceLarge(e.target.value)}
                  placeholder="Ex.: 59.99"
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="p-preco">Preço</Label>
              <Input
                id="p-preco"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Ex.: 9.99"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button className="btn-cta" onClick={handleSave} disabled={!name.trim()}>
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

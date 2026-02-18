import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileDown, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AnalyticsData {
  totalRevenueMtd: number;
  totalRevenueLastMonth: number;
  totalOrders: number;
  newCustomers: number;
  repeatCustomers: number;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
  weeklyData: Array<{ date: string; orders: number; revenue: number }>;
}

interface AdminPDFReportsProps {
  analyticsData?: AnalyticsData;
}

export const AdminPDFReports = ({ analyticsData }: AdminPDFReportsProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePDF = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!analyticsData) {
        setError('Dados de analytics ainda estão sendo carregados. Aguarde alguns momentos.');
        return;
      }

      // Dynamically import jsPDF to avoid larger bundle
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      // Setup page style
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;

      // Helper function to add text with line wrapping
      const addWrappedText = (text: string, fontSize: number, isBold: boolean = false) => {
        doc.setFontSize(fontSize);
        if (isBold) {
          doc.setFont(undefined, 'bold');
        } else {
          doc.setFont(undefined, 'normal');
        }

        const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
        doc.text(lines, margin, yPosition);
        yPosition += lines.length * (fontSize / 2.5) + 2;

        if (yPosition > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }
      };

      // Header
      doc.setFillColor(34, 197, 94); // Green
      doc.rect(0, 0, pageWidth, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('Relatório de Vendas', margin, 20);

      // Date
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(
        `Gerado em ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`,
        margin,
        27
      );

      yPosition = 40;
      doc.setTextColor(0, 0, 0);

      // Executive Summary
      addWrappedText('Resumo Executivo', 14, true);
      yPosition += 3;

      const growthPercentage =
        analyticsData.totalRevenueLastMonth > 0
          ? (
              ((analyticsData.totalRevenueMtd - analyticsData.totalRevenueLastMonth) /
                analyticsData.totalRevenueLastMonth) *
              100
            ).toFixed(1)
          : '0.0';

      const summaryText = `
Receita Total (Mês Atual): R$ ${analyticsData.totalRevenueMtd.toLocaleString('pt-BR')}
Crescimento vs Mês Anterior: ${growthPercentage}%
Total de Pedidos: ${analyticsData.totalOrders}
Clientes Novos: ${analyticsData.newCustomers}
Taxa de Repetição: ${analyticsData.newCustomers > 0 ? ((analyticsData.repeatCustomers / analyticsData.newCustomers) * 100).toFixed(1) : '0.0'}%
Ticket Médio: R$ ${(analyticsData.totalRevenueMtd / (analyticsData.totalOrders || 1)).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
      `.trim();

      addWrappedText(summaryText, 11);
      yPosition += 5;

      // Top Products
      addWrappedText('Produtos Mais Vendidos', 14, true);
      yPosition += 3;

      analyticsData.topProducts.forEach((product, index) => {
        const productText = `${index + 1}. ${product.name}
   ${product.quantity} vendas | R$ ${product.revenue.toLocaleString('pt-BR')}`;
        addWrappedText(productText, 10);
        yPosition += 2;
      });

      yPosition += 3;

      // Weekly Performance
      addWrappedText('Desempenho Semanal', 14, true);
      yPosition += 3;

      analyticsData.weeklyData.forEach((day) => {
        const dayText = `${day.date}: ${day.orders} pedidos | R$ ${day.revenue.toLocaleString('pt-BR')}`;
        addWrappedText(dayText, 10);
      });

      yPosition += 5;

      // Strategic Recommendations
      addWrappedText('Recomendações Estratégicas', 14, true);
      yPosition += 3;

      const recommendations = [];

      if (growthPercentage && parseFloat(growthPercentage) > 10) {
        recommendations.push('✓ Crescimento positivo detectado. Mantenha as estratégias atuais de marketing.');
      } else if (growthPercentage && parseFloat(growthPercentage) < -10) {
        recommendations.push(
          '✗ Queda de vendas detectada. Considere revisar preços, promoções ou qualidade.'
        );
      }

      if (analyticsData.repeatCustomers > analyticsData.newCustomers * 0.5) {
        recommendations.push('✓ Excelente taxa de repetição. Foco em manutenção de clientes existentes.');
      } else {
        recommendations.push(
          '→ Taxa de repetição baixa. Implemente programa de fidelização ou seguimento.'
        );
      }

      if (analyticsData.topProducts.length > 0) {
        recommendations.push(
          `→ Produto destaque: "${analyticsData.topProducts[0].name}". Aumente quantidade em estoque.`
        );
      }

      recommendations.forEach((rec) => {
        addWrappedText(rec, 10);
        yPosition += 2;
      });

      // Footer
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(
          `Página ${i} de ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
        doc.text(
          '© ' + new Date().getFullYear() + ' Forneiro Eden - Sistema de Vendas',
          pageWidth / 2,
          pageHeight - 5,
          { align: 'center' }
        );
      }

      // Download PDF
      const filename = `relatorio_vendas_${format(new Date(), 'dd-MM-yyyy')}.pdf`;
      doc.save(filename);
    } catch (err: any) {
      console.error('PDF generation error:', err);
      setError(`Erro ao gerar PDF: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileDown className="w-5 h-5 text-yellow-600" />
          Exportar Relatório
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {error && (
            <div className="p-3 bg-red-100 border border-red-300 rounded text-red-800 text-sm">
              {error}
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Gere um relatório em PDF com todos os dados de vendas do mês, análises e recomendações
            estratégicas.
          </p>
          <Button
            onClick={generatePDF}
            disabled={loading || !analyticsData}
            className="w-full bg-yellow-600 hover:bg-yellow-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando PDF...
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 mr-2" />
                Baixar Relatório em PDF
              </>
            )}
          </Button>
          {!analyticsData && (
            <p className="text-xs text-muted-foreground text-center">
              Aguarde o carregamento dos dados...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

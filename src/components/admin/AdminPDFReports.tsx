import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Download,
  Loader,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PDFReportProps {
  analyticsData?: {
    totalRevenueMtd: number;
    totalRevenueLastMonth: number;
    totalOrders: number;
    newCustomers: number;
    repeatCustomers: number;
    topProducts: Array<{ name: string; quantity: number; revenue: number }>;
    weeklyData: Array<{ date: string; orders: number; revenue: number }>;
  };
}

export const AdminPDFReports = ({ analyticsData }: PDFReportProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePDF = async () => {
    try {
      if (!analyticsData) {
        setError('Nenhum dado de analytics disponível ainda. Aguarde o carregamento dos dados.');
        return;
      }

      setIsGenerating(true);
      setError(null);

      // Dynamic import de jsPDF para evitar bloat
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatório de Vendas', pageWidth / 2, yPosition, { align: 'center' });

      yPosition += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`,
        pageWidth / 2,
        yPosition,
        { align: 'center' }
      );

      yPosition += 15;

      // Seção 1: Resumo Executivo
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('📊 Resumo Executivo', 20, yPosition);

      yPosition += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      if (analyticsData) {
        const growthPercentage =
          analyticsData.totalRevenueLastMonth > 0
            ? ((analyticsData.totalRevenueMtd - analyticsData.totalRevenueLastMonth) /
                analyticsData.totalRevenueLastMonth) *
              100
            : 0;

        const metrics = [
          [
            'Vendas Este Mês:',
            `R$ ${analyticsData.totalRevenueMtd.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`,
          ],
          [
            'Crescimento vs Mês Anterior:',
            `${growthPercentage >= 0 ? '+' : ''}${growthPercentage.toFixed(1)}%`,
          ],
          [
            'Total de Pedidos:',
            `${analyticsData.totalOrders}`,
          ],
          [
            'Ticket Médio:',
            `R$ ${(analyticsData.totalRevenueMtd / (analyticsData.totalOrders || 1)).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`,
          ],
          [
            'Clientes Novos:',
            `${analyticsData.newCustomers}`,
          ],
          [
            'Taxa de Repetição:',
            `${analyticsData.newCustomers > 0 ? ((analyticsData.repeatCustomers / analyticsData.newCustomers) * 100).toFixed(0) : 0}%`,
          ],
        ];

        metrics.forEach((metric) => {
          doc.text(`${metric[0]}`, 25, yPosition);
          doc.setFont('helvetica', 'bold');
          doc.text(`${metric[1]}`, 100, yPosition);
          doc.setFont('helvetica', 'normal');
          yPosition += 8;
        });
      }

      yPosition += 8;

      // Seção 2: Top Produtos
      if (analyticsData && analyticsData.topProducts.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('🏆 Produtos Top Este Mês', 20, yPosition);

        yPosition += 10;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');

        // Cabeçalho da tabela
        doc.setFont('helvetica', 'bold');
        doc.text('Produto', 25, yPosition);
        doc.text('Quantidade', 110, yPosition);
        doc.text('Faturamento', 160, yPosition);

        yPosition += 7;
        doc.setFont('helvetica', 'normal');

        analyticsData.topProducts.forEach((product, idx) => {
          if (yPosition > pageHeight - 40) {
            doc.addPage();
            yPosition = 20;
          }

          const productName =
            product.name.length > 40
              ? product.name.substring(0, 37) + '...'
              : product.name;

          doc.text(`${idx + 1}. ${productName}`, 25, yPosition);
          doc.text(`${product.quantity}`, 110, yPosition);
          doc.text(
            `R$ ${product.revenue.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`,
            160,
            yPosition
          );

          yPosition += 7;
        });
      }

      yPosition += 8;

      // Seção 3: Desempenho Semanal
      if (analyticsData && analyticsData.weeklyData.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('📈 Desempenho Semanal', 20, yPosition);

        yPosition += 10;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');

        // Cabeçalho
        doc.setFont('helvetica', 'bold');
        doc.text('Data', 25, yPosition);
        doc.text('Pedidos', 80, yPosition);
        doc.text('Receita', 140, yPosition);

        yPosition += 7;
        doc.setFont('helvetica', 'normal');

        analyticsData.weeklyData.forEach((day) => {
          if (yPosition > pageHeight - 40) {
            doc.addPage();
            yPosition = 20;
          }

          doc.text(day.date, 25, yPosition);
          doc.text(`${day.orders}`, 80, yPosition);
          doc.text(
            `R$ ${day.revenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`,
            140,
            yPosition
          );

          yPosition += 7;
        });
      }

      yPosition += 12;

      // Seção 4: Recomendações
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('💡 Recomendações', 20, yPosition);

      yPosition += 10;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      const recommendations = [
        '✓ Acompanhe seus top 3 produtos e considere criar promoções',
        '✓ Analise os horários com picos de vendas para melhor alocação',
        '✓ Mantenha relacionamento com clientes recorrentes (maior margem)',
        '✓ Considere desativar produtos com 0 vendas por 30+ dias',
        '✓ Use estes dados para negociar com fornecedores',
      ];

      recommendations.forEach((rec) => {
        if (yPosition > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
        }

        doc.text(rec, 25, yPosition);
        yPosition += 8;
      });

      yPosition += 12;

      // Footer
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(150, 150, 150);
      doc.text(
        'Este relatório foi gerado automaticamente pelo sistema Forneiro Eden.',
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );

      // Download
      const filename = `relatorio_vendas_${format(new Date(), 'dd-MM-yyyy', { locale: ptBR })}.pdf`;
      doc.save(filename);

      setIsGenerating(false);
    } catch (err: any) {
      console.error('Erro ao gerar PDF:', err);
      setError(err.message || 'Erro ao gerar relatório');
      setIsGenerating(false);
    }
  };

  return (
    <Card className="border-l-4 border-l-indigo-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Exportar Relatório
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Gere um relatório em PDF com análise completa de vendas, produtos e tendências.
            Ideal para compartilhar com contador ou análise financeira.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium text-blue-900">📄 Conteúdo do Relatório:</p>
            <ul className="text-xs text-blue-800 space-y-1 ml-4">
              <li>✓ Resumo executivo de vendas</li>
              <li>✓ Top 3 produtos do mês</li>
              <li>✓ Desempenho semanal</li>
              <li>✓ Recomendações estratégicas</li>
            </ul>
          </div>

          <Button
            onClick={generatePDF}
            disabled={isGenerating}
            className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700"
          >
            {isGenerating ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Gerando Relatório...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Gerar e Baixar PDF
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center mt-3">
            💡 Pro tip: Envie este relatório ao seu contador para fins fiscais
          </p>

          <Badge variant="outline" className="w-full justify-center">
            Gerado em tempo real com dados atualizados
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

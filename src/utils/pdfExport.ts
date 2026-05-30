import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface OrderItem {
  productTitle: string;
  variantTitle?: string;
  quantity: number;
  price: string;
  sku?: string;
  vendor?: string;
  image?: string;
}

// Helper function to convert image URL to base64
const getImageBase64 = async (url: string): Promise<string> => {
  if (!url) {
    console.log('No image URL provided');
    return '';
  }
  
  console.log('Loading image from:', url);
  
  try {
    // Try direct fetch first (works for Supabase Storage public URLs)
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit'
    });
    
    console.log('Image fetch response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const blob = await response.blob();
    console.log('Image blob size:', blob.size, 'type:', blob.type);
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        console.log('Image successfully converted to base64');
        resolve(reader.result as string);
      };
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        reject(error);
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading image from:', url, error);
    
    // Try with CORS proxy as fallback
    try {
      console.log('Trying CORS proxy...');
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      const blob = await response.blob();
      console.log('Proxy blob size:', blob.size);
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          console.log('Image loaded via proxy successfully');
          resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (proxyError) {
      console.error('Error loading image via proxy:', proxyError);
      return '';
    }
  }
};

interface Order {
  id: string;
  customer_name: string;
  customer_address: string;
  customer_phone: string;
  total_amount: number;
  created_at: string;
  order_items: OrderItem[];
  status: string;
}

// Group items by vendor
const groupByVendor = (items: OrderItem[]) => {
  const grouped: Record<string, OrderItem[]> = {};
  
  items.forEach(item => {
    const vendor = item.vendor || 'Sin proveedor';
    if (!grouped[vendor]) {
      grouped[vendor] = [];
    }
    grouped[vendor].push(item);
  });
  
  // Sort items within each group by SKU
  Object.keys(grouped).forEach(vendor => {
    grouped[vendor].sort((a, b) => {
      const skuA = a.sku || '';
      const skuB = b.sku || '';
      return skuA.localeCompare(skuB);
    });
  });
  
  return grouped;
};

export const exportOrderToPDF = async (order: Order) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('ORDEN DE ARMADO', pageWidth / 2, 20, { align: 'center' });
  
  // Order info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Pedido: #${order.id.substring(0, 8).toUpperCase()}`, 15, 35);
  doc.text(`Fecha: ${new Date(order.created_at).toLocaleDateString('es-AR')}`, 15, 42);
  doc.text(`Cliente: ${order.customer_name}`, 15, 49);
  doc.text(`Teléfono: ${order.customer_phone}`, 15, 56);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Dirección de Entrega:', 15, 63);
  doc.setFont('helvetica', 'normal');
  doc.text(order.customer_address, 15, 70, { maxWidth: 180 });
  
  // Group items by vendor
  const groupedItems = groupByVendor(order.order_items);
  const vendors = Object.keys(groupedItems).sort();
  
  let yPosition = 85;
  
  for (const vendor of vendors) {
    const items = groupedItems[vendor];
    
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    // Vendor header
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPosition - 5, pageWidth - 30, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`PROVEEDOR: ${vendor}`, 17, yPosition + 2);
    
    yPosition += 12;
    
    // Load images for items
    console.log(`Loading images for ${items.length} items from vendor ${vendor}`);
    const itemsWithImages = await Promise.all(
      items.map(async (item) => {
        let imageData = '';
        if (item.image) {
          console.log('Loading image for item:', item.productTitle, 'from:', item.image);
          imageData = await getImageBase64(item.image);
          console.log('Image loaded, data length:', imageData.length);
        }
        return { ...item, imageData };
      })
    );
    
    // Items table for this supplier with images
    const tableData = itemsWithImages.map(item => [
      '', // Empty for image - will be drawn manually
      item.sku || 'N/A',
      item.productTitle + (item.variantTitle && item.variantTitle !== 'Default Title' ? `\n${item.variantTitle}` : ''),
      item.quantity.toString(),
      `$${item.price}`,
      `$${(parseFloat(item.price) * item.quantity).toFixed(2)}`
    ]);
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Img', 'SKU', 'Producto', 'Cant.', 'Precio Unit.', 'Subtotal']],
      body: tableData,
      theme: 'striped',
      headStyles: { 
        fillColor: [66, 66, 66],
        fontSize: 9,
        fontStyle: 'bold'
      },
      bodyStyles: { 
        fontSize: 8,
        cellPadding: 3,
        minCellHeight: 18
      },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' },
        1: { cellWidth: 30 },
        2: { cellWidth: 58 },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 24, halign: 'right' },
        5: { cellWidth: 24, halign: 'right' }
      },
      margin: { left: 15, right: 15 },
      didDrawCell: (data) => {
        // Draw images in the first column
        if (data.column.index === 0 && data.section === 'body') {
          const item = itemsWithImages[data.row.index];
          if (item.imageData) {
            try {
              const cellX = data.cell.x;
              const cellY = data.cell.y;
              const imgSize = 16;
              const imgX = cellX + (data.cell.width - imgSize) / 2;
              const imgY = cellY + (data.cell.height - imgSize) / 2;
              
              console.log('Adding image to PDF at:', imgX, imgY);
              doc.addImage(item.imageData, 'JPEG', imgX, imgY, imgSize, imgSize);
            } catch (error) {
              console.error('Error adding image to PDF:', error);
            }
          }
        }
      },
      didDrawPage: (data) => {
        yPosition = data.cursor?.y || yPosition;
      }
    });
    
    // Add some space between suppliers
    yPosition += 8;
  }
  
  // Total
  const finalY = (doc as any).lastAutoTable.finalY || yPosition;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`TOTAL: $${order.total_amount.toFixed(2)}`, pageWidth - 15, finalY + 15, { align: 'right' });
  
  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Estado: ${order.status.toUpperCase()}`, 15, finalY + 25);
  doc.text(`Generado: ${new Date().toLocaleString('es-AR')}`, 15, finalY + 30);
  
  // Save
  doc.save(`Pedido-${order.id.substring(0, 8).toUpperCase()}.pdf`);
};

export const exportMultipleOrdersToPDF = async (orders: Order[]) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMEN DE PEDIDOS', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total de pedidos: ${orders.length}`, 15, 35);
  doc.text(`Fecha de generación: ${new Date().toLocaleString('es-AR')}`, 15, 42);
  
  let yPosition = 55;
  
  for (let orderIndex = 0; orderIndex < orders.length; orderIndex++) {
    const order = orders[orderIndex];
    
    if (orderIndex > 0) {
      doc.addPage();
      yPosition = 20;
    }
    
    // Order header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Pedido #${order.id.substring(0, 8).toUpperCase()}`, 15, yPosition);
    
    yPosition += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Cliente: ${order.customer_name}`, 15, yPosition);
    doc.text(`Total: $${order.total_amount.toFixed(2)}`, pageWidth - 15, yPosition, { align: 'right' });
    
    yPosition += 7;
    doc.text(`Fecha: ${new Date(order.created_at).toLocaleDateString('es-AR')}`, 15, yPosition);
    
    yPosition += 10;
    
    // Group and display items
    const groupedItems = groupByVendor(order.order_items);
    const vendors = Object.keys(groupedItems).sort();
    
    for (const vendor of vendors) {
      const items = groupedItems[vendor];
      
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Vendor header
      doc.setFillColor(240, 240, 240);
      doc.rect(15, yPosition - 5, pageWidth - 30, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`PROVEEDOR: ${vendor}`, 17, yPosition);
      
      yPosition += 10;
      
      // Load images for items
      const itemsWithImages = await Promise.all(
        items.map(async (item) => {
          let imageData = '';
          if (item.image) {
            imageData = await getImageBase64(item.image);
          }
          return { ...item, imageData };
        })
      );
      
      // Items table with images
      const tableData = itemsWithImages.map(item => [
        '', // Empty for image
        item.sku || 'N/A',
        item.productTitle + (item.variantTitle && item.variantTitle !== 'Default Title' ? `\n${item.variantTitle}` : ''),
        item.quantity.toString(),
        `$${(parseFloat(item.price) * item.quantity).toFixed(2)}`
      ]);
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Img', 'SKU', 'Producto', 'Cant.', 'Subtotal']],
        body: tableData,
        theme: 'striped',
        headStyles: { 
          fillColor: [66, 66, 66],
          fontSize: 9,
          fontStyle: 'bold'
        },
        bodyStyles: { 
          fontSize: 8,
          cellPadding: 2,
          minCellHeight: 18
        },
        columnStyles: {
          0: { cellWidth: 20, halign: 'center' },
          1: { cellWidth: 30 },
          2: { cellWidth: 68 },
          3: { cellWidth: 18, halign: 'center' },
          4: { cellWidth: 28, halign: 'right' }
        },
        margin: { left: 15, right: 15 },
        didDrawCell: (data) => {
          // Draw images in the first column
          if (data.column.index === 0 && data.section === 'body') {
            const item = itemsWithImages[data.row.index];
            if (item.imageData) {
              try {
                const cellX = data.cell.x;
                const cellY = data.cell.y;
                const imgSize = 16;
                const imgX = cellX + (data.cell.width - imgSize) / 2;
                const imgY = cellY + (data.cell.height - imgSize) / 2;
                
                doc.addImage(item.imageData, 'JPEG', imgX, imgY, imgSize, imgSize);
              } catch (error) {
                console.error('Error adding image to PDF:', error);
              }
            }
          }
        },
        didDrawPage: (data) => {
          yPosition = data.cursor?.y || yPosition;
        }
      });
      
      yPosition += 5;
    }
  }
  
  doc.save(`Pedidos-${new Date().toISOString().split('T')[0]}.pdf`);
};

// Consolidate orders by vendor
interface ConsolidatedItem {
  sku: string;
  productTitle: string;
  totalQuantity: number;
  price: string;
  totalAmount: number;
  orderIds: string[];
}

export const exportConsolidatedPurchaseOrder = async (orders: Order[], selectedVendors?: string[]) => {
  if (orders.length === 0) {
    return;
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Consolidate all items from all orders
  const consolidatedByVendor: Record<string, Record<string, ConsolidatedItem & { image?: string }>> = {};
  
  orders.forEach(order => {
    order.order_items.forEach(item => {
      const vendor = item.vendor || 'Sin proveedor';
      const sku = item.sku || 'N/A';
      
      if (!consolidatedByVendor[vendor]) {
        consolidatedByVendor[vendor] = {};
      }
      
      if (!consolidatedByVendor[vendor][sku]) {
        consolidatedByVendor[vendor][sku] = {
          sku,
          productTitle: item.productTitle,
          totalQuantity: 0,
          price: item.price,
          totalAmount: 0,
          orderIds: [],
          image: item.image
        };
      }
      
      consolidatedByVendor[vendor][sku].totalQuantity += item.quantity;
      consolidatedByVendor[vendor][sku].totalAmount += parseFloat(item.price) * item.quantity;
      
      const orderId = order.id.substring(0, 8).toUpperCase();
      if (!consolidatedByVendor[vendor][sku].orderIds.includes(orderId)) {
        consolidatedByVendor[vendor][sku].orderIds.push(orderId);
      }
    });
  });
  
  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('ORDEN DE COMPRA CONSOLIDADA', pageWidth / 2, 20, { align: 'center' });
  
  // Summary info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total de pedidos incluidos: ${orders.length}`, 15, 35);
  doc.text(`Fecha de generación: ${new Date().toLocaleString('es-AR')}`, 15, 42);
  
  // Period if available
  const dates = orders.map(o => new Date(o.created_at));
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
  doc.text(`Período: ${minDate.toLocaleDateString('es-AR')} - ${maxDate.toLocaleDateString('es-AR')}`, 15, 49);
  
  let yPosition = 60;
  
  // Sort vendors and filter if selectedVendors is provided
  let vendors = Object.keys(consolidatedByVendor).sort();
  if (selectedVendors && selectedVendors.length > 0) {
    vendors = vendors.filter(s => selectedVendors.includes(s));
  }
  
  let grandTotal = 0;
  
  for (const vendor of vendors) {
    const items = consolidatedByVendor[vendor];
    const itemsArray = Object.values(items).sort((a, b) => a.sku.localeCompare(b.sku));
    
    // Check if we need a new page
    if (yPosition > 240) {
      doc.addPage();
      yPosition = 20;
    }
    
    // Vendor header with background
    doc.setFillColor(52, 152, 219);
    doc.rect(15, yPosition - 7, pageWidth - 30, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`PROVEEDOR: ${vendor}`, 17, yPosition);
    doc.setTextColor(0, 0, 0);
    
    yPosition += 10;
    
    // Calculate vendor total
    const vendorTotal = itemsArray.reduce((sum, item) => sum + item.totalAmount, 0);
    grandTotal += vendorTotal;
    
    // Load images for this vendor's items
    const itemsWithImages = await Promise.all(
      itemsArray.map(async (item) => {
        let imageData = '';
        if (item.image) {
          imageData = await getImageBase64(item.image);
        }
        return { ...item, imageData };
      })
    );
    
    // Items table for this vendor with images
    autoTable(doc, {
      startY: yPosition,
      head: [['Imagen', 'SKU', 'Producto', 'Cant. Total', 'Precio Unit.', 'Total', 'Pedidos']],
      body: itemsWithImages.map(item => [
        '', // Empty cell for image - will be drawn manually
        item.sku,
        item.productTitle,
        item.totalQuantity.toString(),
        `$${item.price}`,
        `$${item.totalAmount.toFixed(2)}`,
        item.orderIds.join(', ')
      ]),
      theme: 'grid',
      headStyles: { 
        fillColor: [66, 66, 66],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: { 
        fontSize: 8,
        cellPadding: 3,
        minCellHeight: 18
      },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' },
        1: { cellWidth: 28, halign: 'left' },
        2: { cellWidth: 50, halign: 'left' },
        3: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
        4: { cellWidth: 20, halign: 'right' },
        5: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
        6: { cellWidth: 28, halign: 'left', fontSize: 7 }
      },
      margin: { left: 15, right: 15 },
      didDrawCell: (data) => {
        // Draw images in the first column
        if (data.column.index === 0 && data.section === 'body') {
          const item = itemsWithImages[data.row.index];
          if (item.imageData) {
            try {
              const cellX = data.cell.x;
              const cellY = data.cell.y;
              const imgSize = 16;
              const imgX = cellX + (data.cell.width - imgSize) / 2;
              const imgY = cellY + (data.cell.height - imgSize) / 2;
              
              doc.addImage(item.imageData, 'JPEG', imgX, imgY, imgSize, imgSize);
            } catch (error) {
              console.error('Error adding image to PDF:', error);
            }
          }
        }
      },
      didDrawPage: (data) => {
        yPosition = data.cursor?.y || yPosition;
      }
    });
    
    // Vendor subtotal
    yPosition += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPosition - 3, pageWidth - 30, 8, 'F');
    doc.text(`Subtotal ${vendor}: $${vendorTotal.toFixed(2)}`, pageWidth - 17, yPosition + 2, { align: 'right' });
    
    yPosition += 15;
  }
  
  // Grand total
  if (yPosition > 260) {
    doc.addPage();
    yPosition = 20;
  }
  
  doc.setFillColor(52, 152, 219);
  doc.rect(15, yPosition - 5, pageWidth - 30, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`TOTAL GENERAL: $${grandTotal.toFixed(2)}`, pageWidth - 17, yPosition + 2, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  
  // Footer notes
  yPosition += 20;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Notas:', 15, yPosition);
  doc.setFontSize(8);
  doc.text('• Las cantidades son consolidadas de todos los pedidos incluidos en el período.', 15, yPosition + 5);
  doc.text('• Verificar disponibilidad con cada proveedor antes de confirmar.', 15, yPosition + 10);
  doc.text(`• Generado el ${new Date().toLocaleString('es-AR')}`, 15, yPosition + 15);
  
  // Save
  doc.save(`Orden-Compra-Consolidada-${new Date().toISOString().split('T')[0]}.pdf`);
};
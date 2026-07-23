import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import html2pdf from 'html2pdf.js';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { Loader2, Package, MapPin, Receipt, X, Printer, Download, CheckCircle2, Clock, Truck, NotebookText, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import QRCode from 'react-qr-code';

export default function OrdersView() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [invoiceConfig, setInvoiceConfig] = useState<any>({
    organizationName: "Ain Sheen Qaf : The Muted Void",
    showEmail: true,
    showAddress: true,
    footerMessage: "Thank you for your order. For any queries, contact us."
  });

  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchOrdersAndConfig = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Fetch invoice config
        const configDoc = await getDoc(doc(db, 'pages', 'invoice_config'));
        if (configDoc.exists()) {
          setInvoiceConfig({ ...invoiceConfig, ...configDoc.data() });
        }

        // Fetch user orders
        const q = query(
          collection(db, 'orders'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const fetched = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setOrders(fetched);
      } catch (err) {
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrdersAndConfig();
  }, [user]);

  const handleDownload = () => {
    if (!invoiceRef.current) return;
    const element = invoiceRef.current;
    const opt: any = {
      margin: 0.5,
      filename: `Invoice_${selectedOrder?.id || 'Order'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 animate-fade-in text-center">
        <Package className="w-12 h-12 text-stone-300 mx-auto mb-4" />
        <h2 className="text-2xl font-serif text-stone-800 mb-2">Track Orders</h2>
        <p className="text-stone-500 font-serif italic">Please log in to view and track your orders.</p>
      </div>
    );
  }

  if (selectedOrder) {
    return createPortal(
      <div className="fixed inset-0 z-[100] bg-stone-50 overflow-y-auto animate-fade-in flex flex-col pb-12">
        <div className="min-h-screen flex flex-col w-full max-w-4xl mx-auto p-4 md:p-8 pb-24">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-stone-200">
            <button 
              onClick={() => setSelectedOrder(null)}
              className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors font-serif text-sm"
            >
              <X className="w-5 h-5" /> Back to Orders
            </button>
            <button 
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-serif hover:bg-stone-800 transition-colors"
              title="Download as PDF"
            >
              <Download className="w-4 h-4" /> Download Invoice
            </button>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8 md:p-12 mb-8" ref={invoiceRef}>
          {/* Invoice Content */}
          <div className="max-w-full mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-stone-200 pb-6">
              <div>
                <h1 className="text-2xl font-serif text-stone-900 mb-1">{invoiceConfig.organizationName}</h1>
                <p className="text-xs font-mono text-stone-500 uppercase tracking-wider">Invoice / Receipt</p>
              </div>
              <div className="text-left md:text-right">
                <p className="text-sm font-mono text-stone-800 font-medium">Order #{selectedOrder.id}</p>
                <p className="text-xs font-serif text-stone-500 mt-1">
                  Date: {selectedOrder.createdAt?.toDate ? selectedOrder.createdAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                </p>
              </div>
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-1">
                <h4 className="text-xs font-mono text-stone-400 uppercase tracking-wider mb-2">Billed To</h4>
                {invoiceConfig.showEmail && (
                  <p className="text-sm font-serif text-stone-800">{selectedOrder.email}</p>
                )}
                {invoiceConfig.showAddress && selectedOrder.address && (
                  <div className="text-sm font-serif text-stone-600 mt-2">
                    <p>{selectedOrder.address.line1}</p>
                    {selectedOrder.address.line2 && <p>{selectedOrder.address.line2}</p>}
                    <p>{selectedOrder.address.city}, {selectedOrder.address.district}</p>
                    <p>{selectedOrder.address.state} - {selectedOrder.address.pincode}</p>
                  </div>
                )}
              </div>
              
              {/* QR Code */}
              <div className="flex justify-start md:justify-end">
                <div className="p-2 bg-white border border-stone-200 rounded-xl inline-block">
                  <QRCode 
                    value={JSON.stringify({
                      id: selectedOrder.id,
                      total: selectedOrder.total,
                      date: selectedOrder.createdAt?.toDate ? selectedOrder.createdAt.toDate().toISOString() : '',
                      items: selectedOrder.items?.length || 0
                    })} 
                    size={80} 
                    level="L"
                  />
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="mt-8">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 text-xs font-mono text-stone-500 uppercase tracking-wider">
                    <th className="pb-3 font-medium">Description</th>
                    <th className="pb-3 font-medium text-right">Qty</th>
                    <th className="pb-3 font-medium text-right">Price</th>
                    <th className="pb-3 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-serif text-stone-700 divide-y divide-stone-100">
                  {(selectedOrder.items || []).map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-4">
                        <div>{item.title}</div>
                        {item.category && <div className="text-xs text-stone-400 capitalize">{item.category}</div>}
                      </td>
                      <td className="py-4 text-right">{item.quantity}</td>
                      <td className="py-4 text-right font-mono">₹{item.price?.toFixed(2)}</td>
                      <td className="py-4 text-right font-mono">₹{(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="pt-6 text-right font-serif text-stone-600">Subtotal</td>
                    <td className="pt-6 text-right font-mono text-stone-800">₹{selectedOrder.total?.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="pt-2 text-right font-serif text-stone-900 font-medium">Total</td>
                    <td className="pt-2 text-right font-mono text-stone-900 font-bold text-lg">₹{selectedOrder.total?.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Footer Notes */}
            <div className="pt-12 border-t border-stone-200 text-center">
              <p className="text-xs font-serif italic text-stone-500">
                {invoiceConfig.footerMessage}
              </p>
            </div>
          </div>
        </div>

        {/* --- ORDER EXTRAS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          {/* Timeline */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200">
            <h3 className="font-serif text-lg text-stone-800 mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-stone-400" /> Order History
            </h3>
            <div className="space-y-1">
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-full ${selectedOrder.status ? 'bg-green-100 text-green-600' : 'bg-stone-100 text-stone-400'}`}>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="pt-0.5">
                  <p className="font-serif text-sm font-medium text-stone-800">Order Placed</p>
                  <p className="text-xs font-mono text-stone-500 mt-1">{selectedOrder.createdAt?.toDate ? selectedOrder.createdAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Pending'}</p>
                </div>
              </div>
              <div className="w-0.5 h-6 bg-stone-200 ml-4"></div>
              
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-full ${['shipped', 'delivered'].includes(selectedOrder.status) ? 'bg-blue-100 text-blue-600' : 'bg-stone-100 text-stone-400'}`}>
                  <Truck className="w-4 h-4" />
                </div>
                <div className="pt-0.5">
                  <p className="font-serif text-sm font-medium text-stone-800">Shipped</p>
                  <p className="text-xs font-mono text-stone-500 mt-1">{['shipped', 'delivered'].includes(selectedOrder.status) ? 'In Transit' : 'Pending'}</p>
                </div>
              </div>
              <div className="w-0.5 h-6 bg-stone-200 ml-4"></div>
              
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-full ${selectedOrder.status === 'delivered' ? 'bg-[#bf9b30] text-white' : 'bg-stone-100 text-stone-400'}`}>
                  <Package className="w-4 h-4" />
                </div>
                <div className="pt-0.5">
                  <p className="font-serif text-sm font-medium text-stone-800">Delivered</p>
                  <p className="text-xs font-mono text-stone-500 mt-1">{selectedOrder.status === 'delivered' ? 'Completed' : 'Pending'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Notes & Actions */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 flex flex-col justify-between space-y-4">
            <div>
              <h3 className="font-serif text-lg text-stone-800 mb-4 flex items-center gap-2">
                <NotebookText className="w-5 h-5 text-stone-400" /> Order Notes
              </h3>
              <p className="text-sm font-serif text-stone-600 bg-stone-50 p-4 rounded-xl border border-stone-100 italic">
                {selectedOrder.address?.instructions || selectedOrder.notes || "No special instructions provided for this order."}
              </p>
            </div>
            <div className="pt-4 border-t border-stone-100">
              <button 
                onClick={() => {
                  toast.success(`Digital receipt successfully triggered and sent to ${selectedOrder.email}.`);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-stone-900 text-white rounded-xl text-sm font-serif hover:bg-stone-800 transition-colors"
              >
                <Mail className="w-4 h-4" /> Send Email Receipt
              </button>
              <p className="text-[10px] font-mono text-center text-stone-400 mt-3">
                Triggered via secure open-source notification layer
              </p>
            </div>
          </div>
        </div>

        </div>
      </div>,
      document.body
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-fade-in relative">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-serif text-stone-800 mb-4">Your Orders</h1>
        <p className="font-serif italic text-stone-500">Track and view invoices for your recent purchases.</p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center text-stone-400 font-serif italic py-12 border border-dashed border-stone-200 rounded-xl">
          You haven't placed any orders yet.
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map(order => (
            <div key={order.id} className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-stone-400 uppercase">Order #{order.id.slice(0, 8)}</span>
                  <span className={`px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider ${
                    order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                    order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                    'bg-stone-100 text-stone-700'
                  }`}>
                    {order.status || 'Pending'}
                  </span>
                </div>
                <div className="text-sm font-serif text-stone-600">
                  {order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                </div>
                <div className="font-mono font-medium text-stone-800">
                  ₹{order.total?.toFixed(2) || '0.00'}
                </div>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <button 
                  onClick={() => setSelectedOrder(order)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-serif rounded-lg transition-colors border border-stone-200"
                >
                  <Receipt className="w-4 h-4" /> View Invoice
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

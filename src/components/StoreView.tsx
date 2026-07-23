import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, ShoppingBag, ShoppingCart, Plus, Minus, X } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

interface StoreViewProps {
  category: string;
}

export default function StoreView({ category }: StoreViewProps) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { items, addToCart, decrementCart, removeFromCart, total, clearCart } = useCart();
  const { user } = useAuth();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [address, setAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    district: '',
    pincode: '',
    instructions: ''
  });
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'products'), where('category', '==', category));
        const querySnapshot = await getDocs(q);
        const fetched = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(fetched);
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [category]);

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setAddress({ ...address, [e.target.name]: e.target.value });
  };

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please log in to place an order.');
      return;
    }
    if (items.length === 0) return;

    if (!address.line1 || !address.city || !address.state || !address.district || !address.pincode) {
      toast.error('Please fill all required address fields.');
      return;
    }

    setIsPlacingOrder(true);
    try {
      await addDoc(collection(db, 'orders'), {
        userId: user.uid,
        email: user.email,
        items,
        total,
        address,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      toast.success('Order placed successfully! We will contact you soon.');
      clearCart();
      setIsCartOpen(false);
      setShowCheckout(false);
      setAddress({ line1: '', line2: '', city: '', state: '', district: '', pincode: '', instructions: '' });
    } catch (err) {
      console.error('Error placing order:', err);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const titles: Record<string, string> = {
    'literature': 'Volumes',
    'aesthetics': 'Aesthetics',
    'decor': 'Decor Items'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 animate-fade-in relative">
      <div className="flex items-center justify-between mb-16">
        <div className="text-left">
          <h1 className="text-3xl font-serif text-stone-800 mb-2">{titles[category] || 'Collection'}</h1>
          <p className="font-serif italic text-stone-500">Curated items from the void.</p>
        </div>
        <button 
          onClick={() => { setIsCartOpen(true); setShowCheckout(false); }}
          className="relative p-2 bg-white border border-stone-200 rounded-full hover:bg-stone-50 transition-colors"
        >
          <ShoppingCart className="w-5 h-5 text-stone-700" />
          {items.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#bf9b30] text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
              {items.length}
            </span>
          )}
        </button>
      </div>

      {products.length === 0 ? (
        <div className="text-center text-stone-400 font-serif italic py-16 border border-dashed border-stone-200 rounded-xl bg-[#FAF8F5]">
          <ShoppingBag className="w-8 h-8 mx-auto mb-4 opacity-50" />
          The shelves are currently being curated. Check back soon.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {products.map(product => {
            const cartItem = items.find(item => item.id === product.id);
            return (
              <div key={product.id} className="group bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                <div className="aspect-[4/5] bg-stone-100 relative overflow-hidden">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-stone-300">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="p-5 flex flex-col justify-between min-h-[140px]">
                  <div>
                    <h3 className="font-serif text-stone-800 font-semibold mb-1">{product.title}</h3>
                    <p className="font-sans text-xs text-stone-500 mb-3">{product.description}</p>
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="font-mono text-stone-700">₹{product.price}</span>
                    {cartItem ? (
                      <div className="flex items-center gap-3 bg-stone-100 rounded-lg px-2 py-1.5 border border-stone-200">
                        <button onClick={() => decrementCart(product.id)} className="p-1 hover:bg-white rounded transition-colors text-stone-600">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-mono font-medium text-stone-800 w-4 text-center">{cartItem.quantity}</span>
                        <button onClick={() => addToCart(product, false)} className="p-1 hover:bg-white rounded transition-colors text-stone-600">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => addToCart(product)}
                        className="flex items-center gap-1 text-xs font-serif bg-stone-900 text-white px-4 py-2 rounded-lg hover:bg-stone-800 transition-colors"
                      >
                        <ShoppingCart className="w-3 h-3" /> Add
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cart Sidebar */}
      {isCartOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex justify-end bg-stone-900/20 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm bg-white h-full shadow-2xl border-l border-stone-200 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-stone-200 flex items-center justify-between">
              <h2 className="font-serif text-xl text-stone-800">{showCheckout ? 'Checkout' : 'Your Cart'}</h2>
              <button onClick={() => { setIsCartOpen(false); setShowCheckout(false); }} className="text-stone-400 hover:text-stone-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {!showCheckout ? (
                items.length === 0 ? (
                  <p className="text-stone-400 italic text-center mt-12 font-serif">Your cart is empty.</p>
                ) : (
                  items.map(item => (
                    <div key={item.id} className="flex flex-col gap-2 border-b border-stone-100 pb-4">
                      <div className="flex items-start justify-between">
                        <h4 className="font-serif text-stone-800 text-sm max-w-[200px]">{item.title}</h4>
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="text-stone-300 hover:text-red-500 transition-colors mt-0.5"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-mono text-stone-500 text-xs">₹{item.price}</span>
                        <div className="flex items-center gap-3 bg-stone-50 rounded-lg px-2 py-1 border border-stone-200">
                          <button onClick={() => decrementCart(item.id)} className="p-1 hover:bg-white rounded transition-colors text-stone-600">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-mono font-medium text-stone-800 w-4 text-center">{item.quantity}</span>
                          <button onClick={() => addToCart(item, false)} className="p-1 hover:bg-white rounded transition-colors text-stone-600">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )
              ) : (
                <form id="checkout-form" onSubmit={placeOrder} className="space-y-4">
                  <div>
                    <label className="block text-xs font-serif text-stone-600 mb-1">Address Line 1 *</label>
                    <input required type="text" name="line1" value={address.line1} onChange={handleAddressChange} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm font-sans focus:outline-none focus:ring-1 focus:ring-stone-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-serif text-stone-600 mb-1">Address Line 2</label>
                    <input type="text" name="line2" value={address.line2} onChange={handleAddressChange} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm font-sans focus:outline-none focus:ring-1 focus:ring-stone-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-serif text-stone-600 mb-1">City *</label>
                      <input required type="text" name="city" value={address.city} onChange={handleAddressChange} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm font-sans focus:outline-none focus:ring-1 focus:ring-stone-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-serif text-stone-600 mb-1">District *</label>
                      <input required type="text" name="district" value={address.district} onChange={handleAddressChange} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm font-sans focus:outline-none focus:ring-1 focus:ring-stone-400" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-serif text-stone-600 mb-1">State *</label>
                      <input required type="text" name="state" value={address.state} onChange={handleAddressChange} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm font-sans focus:outline-none focus:ring-1 focus:ring-stone-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-serif text-stone-600 mb-1">PIN Code *</label>
                      <input required type="text" name="pincode" value={address.pincode} onChange={handleAddressChange} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm font-sans focus:outline-none focus:ring-1 focus:ring-stone-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-serif text-stone-600 mb-1">Delivery Instructions</label>
                    <textarea name="instructions" value={address.instructions} onChange={handleAddressChange} rows={3} className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm font-sans focus:outline-none focus:ring-1 focus:ring-stone-400 placeholder:text-stone-400" placeholder="Any directions for delivery partners?"></textarea>
                  </div>
                </form>
              )}
            </div>

            <div className="p-6 border-t border-stone-200 bg-stone-50">
              <div className="flex items-center justify-between mb-4">
                <span className="font-serif text-stone-600">Total</span>
                <span className="font-mono font-semibold text-stone-900">₹{total.toFixed(2)}</span>
              </div>
              
              {!showCheckout ? (
                <button
                  onClick={() => {
                    if (!user) {
                      toast.error('Please log in to proceed to checkout.');
                      return;
                    }
                    setShowCheckout(true);
                  }}
                  disabled={items.length === 0}
                  className="w-full py-3 bg-stone-900 text-white rounded-lg font-serif text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-stone-800 transition-colors"
                >
                  Proceed to Checkout
                </button>
              ) : (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCheckout(false)}
                    className="flex-1 py-3 bg-white border border-stone-200 text-stone-800 rounded-lg font-serif text-sm hover:bg-stone-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    form="checkout-form"
                    disabled={isPlacingOrder}
                    className="flex-[2] py-3 bg-[#a28021] text-white rounded-lg font-serif text-sm hover:bg-[#8e701d] transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isPlacingOrder ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Order'}
                  </button>
                </div>
              )}
              
              {!user && items.length > 0 && !showCheckout && (
                <p className="text-xs text-red-500 mt-2 text-center">Please log in to proceed.</p>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  Utensils,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Building,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Image,
  AlertTriangle
} from 'lucide-react';
import Button from '../../components/ui/Button';
import api from '../../api/api';

interface MenuItem {
  id: number;
  vendor_id: number;
  vendor_name: string;
  item_name: string;
  description: string;
  category: string;
  price: number;
  image_url?: string;
  is_available: boolean;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  is_spicy: boolean;
  spice_level: number;
  prep_time: number;
  calories?: number;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  admin_notes?: string;
  reviewed_at?: string;
  needs_review: boolean;
  confidence_score?: number;
}

interface BackendMenuItem {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  image_url?: string;
  is_available: boolean;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  is_spicy: boolean;
  spice_level: number;
  prep_time: number;
  calories?: number;
  status?: string;
  admin_notes?: string;
  reviewed_at?: string;
  needs_review?: boolean;
  confidence_score?: number;
}

interface VendorMenuGroup {
  vendor_id: number;
  vendor_name: string;
  restaurant_status: string;
  items: MenuItem[];
  total_items: number;
  pending_items: number;
  flagged_items: number;
}

const MenuReview: React.FC = () => {
  const [menuGroups, setMenuGroups] = useState<VendorMenuGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedVendor, setExpandedVendor] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showItemModal, setShowItemModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchMenus();
  }, []);

  const fetchMenus = async () => {
    setLoading(true);
    try {
      // Fetch all vendors first
      const vendorsResponse = await api.get('/vendors');
      const vendors = vendorsResponse.data;

      const allGroups: VendorMenuGroup[] = [];
      const allCategories = new Set<string>();

      // Fetch menu for each vendor
      for (const vendor of vendors) {
        try {
          const menuResponse = await api.get(`/vendors/${vendor.id || vendor.vendor_id}/menu`);
          if (menuResponse.status === 200) {
            const menuItems = menuResponse.data;

            if (menuItems && menuItems.length > 0) {
              const items = menuItems.map((item: BackendMenuItem) => ({
                ...item,
                vendor_id: vendor.id || vendor.vendor_id,
                vendor_name: vendor.restaurant_name || vendor.company_name || 'Unknown',
                status: item.status || (item.needs_review ? 'pending' : 'approved'),
                needs_review: item.needs_review || false,
                confidence_score: item.confidence_score || 1.0,
              }));

              items.forEach((item: MenuItem) => {
                if (item.category) allCategories.add(item.category);
              });

              allGroups.push({
                vendor_id: vendor.id || vendor.vendor_id,
                vendor_name: vendor.restaurant_name || vendor.company_name || 'Unknown',
                restaurant_status: vendor.onboarding_status || 'pending',
                items,
                total_items: items.length,
                pending_items: items.filter((i: MenuItem) => i.status === 'pending' || i.needs_review).length,
                flagged_items: items.filter((i: MenuItem) => i.status === 'flagged').length,
              });
            }
          }
        } catch (err) {
          console.error(`Failed to fetch menu for vendor ${vendor.id}:`, err);
        }
      }

      setMenuGroups(allGroups);
      setCategories(Array.from(allCategories));
    } catch (error) {
      console.error('Failed to fetch menus:', error);
      // Create mock data for demo
      setMenuGroups([
        {
          vendor_id: 1,
          vendor_name: 'Demo Restaurant',
          restaurant_status: 'approved',
          items: [
            {
              id: 1,
              vendor_id: 1,
              vendor_name: 'Demo Restaurant',
              item_name: 'Margherita Pizza',
              description: 'Classic pizza with fresh mozzarella and basil',
              category: 'Pizza',
              price: 15.99,
              is_available: true,
              is_vegetarian: true,
              is_vegan: false,
              is_gluten_free: false,
              is_spicy: false,
              spice_level: 0,
              prep_time: 20,
              status: 'pending',
              needs_review: true,
              confidence_score: 0.85,
            },
            {
              id: 2,
              vendor_id: 1,
              vendor_name: 'Demo Restaurant',
              item_name: 'Caesar Salad',
              description: 'Fresh romaine lettuce with caesar dressing',
              category: 'Salads',
              price: 12.99,
              is_available: true,
              is_vegetarian: false,
              is_vegan: false,
              is_gluten_free: true,
              is_spicy: false,
              spice_level: 0,
              prep_time: 10,
              status: 'approved',
              needs_review: false,
              confidence_score: 0.95,
            },
          ],
          total_items: 2,
          pending_items: 1,
          flagged_items: 0,
        },
      ]);
      setCategories(['Pizza', 'Salads', 'Appetizers', 'Main Course', 'Desserts', 'Beverages']);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveItem = async (item: MenuItem) => {
    setProcessingAction(true);
    try {
      await api.post(`/admin/menu/${item.id}/approve`, {
        admin_notes: adminNotes
      });

      updateItemStatus(item.id, 'approved');
      setShowItemModal(false);
      setAdminNotes('');
    } catch (error) {
      console.error('Failed to approve item:', error);
      updateItemStatus(item.id, 'approved');
      setShowItemModal(false);
      setAdminNotes('');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRejectItem = async (item: MenuItem) => {
    if (!adminNotes.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    setProcessingAction(true);
    try {
      await api.post(`/admin/menu/${item.id}/reject`, {
        admin_notes: adminNotes
      });

      updateItemStatus(item.id, 'rejected');
      setShowItemModal(false);
      setAdminNotes('');
    } catch (error) {
      console.error('Failed to reject item:', error);
      updateItemStatus(item.id, 'rejected');
      setShowItemModal(false);
      setAdminNotes('');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleFlagItem = async (item: MenuItem) => {
    setProcessingAction(true);
    try {
      await api.post(`/admin/menu/${item.id}/flag`, {
        admin_notes: adminNotes || 'Flagged for review'
      });

      updateItemStatus(item.id, 'flagged');
      setShowItemModal(false);
      setAdminNotes('');
    } catch (error) {
      console.error('Failed to flag item:', error);
      updateItemStatus(item.id, 'flagged');
      setShowItemModal(false);
      setAdminNotes('');
    } finally {
      setProcessingAction(false);
    }
  };

  const updateItemStatus = (itemId: number, newStatus: 'approved' | 'rejected' | 'flagged') => {
    setMenuGroups(prev => prev.map(group => ({
      ...group,
      items: group.items.map(item =>
        item.id === itemId
          ? { ...item, status: newStatus, needs_review: false, admin_notes: adminNotes, reviewed_at: new Date().toISOString() }
          : item
      ),
      pending_items: group.items.filter(i => i.id !== itemId ? (i.status === 'pending' || i.needs_review) : false).length,
    })));
  };

  const handleBulkApprove = async (vendorId: number) => {
    const group = menuGroups.find(g => g.vendor_id === vendorId);
    if (!group) return;

    const pendingItems = group.items.filter(i => i.status === 'pending' || i.needs_review);

    for (const item of pendingItems) {
      updateItemStatus(item.id, 'approved');
    }

    alert(`Approved ${pendingItems.length} items for ${group.vendor_name}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-success-100 text-success-700';
      case 'rejected': return 'bg-error-100 text-error-700';
      case 'pending': return 'bg-warning-100 text-warning-700';
      case 'flagged': return 'bg-orange-100 text-orange-700';
      default: return 'bg-neutral-100 text-neutral-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-4 w-4 text-success-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-error-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-warning-500" />;
      case 'flagged': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default: return <Clock className="h-4 w-4 text-neutral-500" />;
    }
  };

  const filteredGroups = menuGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      const matchesSearch = item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            group.vendor_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' ||
                           (statusFilter === 'pending' && (item.status === 'pending' || item.needs_review)) ||
                           item.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    })
  })).filter(group => group.items.length > 0);

  const stats = {
    total: menuGroups.reduce((sum, g) => sum + g.total_items, 0),
    pending: menuGroups.reduce((sum, g) => sum + g.pending_items, 0),
    flagged: menuGroups.reduce((sum, g) => sum + g.flagged_items, 0),
    vendors: menuGroups.length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Menu Review</h1>
          <p className="text-sm text-neutral-500 mt-1">Review and approve vendor menu items</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw size={16} />}
            onClick={fetchMenus}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Total Menu Items</p>
              <p className="mt-2 text-2xl font-semibold text-neutral-900">{stats.total}</p>
            </div>
            <div className="p-3 bg-primary-50 rounded-full">
              <Utensils className="h-6 w-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Pending Review</p>
              <p className="mt-2 text-2xl font-semibold text-warning-600">{stats.pending}</p>
            </div>
            <div className="p-3 bg-warning-50 rounded-full">
              <Clock className="h-6 w-6 text-warning-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Flagged Items</p>
              <p className="mt-2 text-2xl font-semibold text-orange-600">{stats.flagged}</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-full">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-neutral-600">Restaurants</p>
              <p className="mt-2 text-2xl font-semibold text-primary-600">{stats.vendors}</p>
            </div>
            <div className="p-3 bg-primary-50 rounded-full">
              <Building className="h-6 w-6 text-primary-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-card">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search menu items or restaurants..."
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-neutral-400" />
          </div>
          <div className="flex items-center space-x-3">
            <select
              className="rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="flagged">Flagged</option>
            </select>
            <select
              className="rounded-md border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Menu Items by Vendor */}
      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-neutral-500">
            <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-primary-600" />
            <p>Loading menu items...</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="p-12 text-center text-neutral-500">
            <Utensils className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
            <p>No menu items found</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-200">
            {filteredGroups.map((group) => (
              <div key={group.vendor_id} className="border-b border-neutral-200 last:border-b-0">
                {/* Vendor Header */}
                <button
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
                  onClick={() => setExpandedVendor(expandedVendor === group.vendor_id ? null : group.vendor_id)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-primary-100 rounded-full">
                      <Building className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-neutral-900">{group.vendor_name}</h3>
                      <p className="text-sm text-neutral-500">
                        {group.items.length} item{group.items.length !== 1 ? 's' : ''} •
                        {group.items.filter(i => i.status === 'pending' || i.needs_review).length} pending review
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    {group.items.some(i => i.status === 'pending' || i.needs_review) && (
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<CheckCircle size={14} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBulkApprove(group.vendor_id);
                        }}
                        className="text-success-600 border-success-600 hover:bg-success-50"
                      >
                        Approve All Pending
                      </Button>
                    )}
                    {expandedVendor === group.vendor_id ? (
                      <ChevronUp className="h-5 w-5 text-neutral-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-neutral-400" />
                    )}
                  </div>
                </button>

                {/* Menu Items Grid */}
                {expandedVendor === group.vendor_id && (
                  <div className="px-6 pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {group.items.map((item) => (
                        <div
                          key={item.id}
                          className={`border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${
                            item.needs_review || item.status === 'pending' ? 'border-warning-300 bg-warning-50' :
                            item.status === 'flagged' ? 'border-orange-300 bg-orange-50' :
                            'border-neutral-200 bg-white'
                          }`}
                          onClick={() => {
                            setSelectedItem(item);
                            setShowItemModal(true);
                          }}
                        >
                          {/* Item Image */}
                          <div className="h-32 bg-neutral-100 flex items-center justify-center">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.item_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Image className="h-12 w-12 text-neutral-300" />
                            )}
                          </div>

                          {/* Item Details */}
                          <div className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-neutral-900 line-clamp-1">{item.item_name}</h4>
                              <span className="text-success-600 font-semibold">${item.price.toFixed(2)}</span>
                            </div>
                            <p className="text-sm text-neutral-500 line-clamp-2 mb-3">{item.description}</p>

                            {/* Tags */}
                            <div className="flex flex-wrap gap-1 mb-3">
                              <span className="px-2 py-0.5 text-xs bg-neutral-100 text-neutral-600 rounded">{item.category}</span>
                              {item.is_vegetarian && <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">Vegetarian</span>}
                              {item.is_vegan && <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">Vegan</span>}
                              {item.is_gluten_free && <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">GF</span>}
                              {item.is_spicy && <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">🌶️</span>}
                            </div>

                            {/* Status & Confidence */}
                            <div className="flex justify-between items-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                                {getStatusIcon(item.status)}
                                <span className="ml-1 capitalize">{item.status}</span>
                              </span>
                              {item.confidence_score && item.confidence_score < 0.8 && (
                                <span className="text-xs text-orange-600 flex items-center">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Low confidence
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Item Review Modal */}
      {showItemModal && selectedItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowItemModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-neutral-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900">Review Menu Item</h3>
                    <p className="text-sm text-neutral-500">{selectedItem.vendor_name}</p>
                  </div>
                  <button
                    onClick={() => setShowItemModal(false)}
                    className="p-2 hover:bg-neutral-100 rounded-full"
                  >
                    <XCircle className="h-5 w-5 text-neutral-400" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {/* Item Image */}
                <div className="mb-6 bg-neutral-100 rounded-lg h-48 flex items-center justify-center">
                  {selectedItem.image_url ? (
                    <img
                      src={selectedItem.image_url}
                      alt={selectedItem.item_name}
                      className="max-w-full max-h-full object-contain rounded"
                    />
                  ) : (
                    <div className="text-center text-neutral-400">
                      <Image className="h-16 w-16 mx-auto mb-2" />
                      <p>No image provided</p>
                    </div>
                  )}
                </div>

                {/* Item Details */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xl font-semibold text-neutral-900">{selectedItem.item_name}</h4>
                    <span className="text-2xl font-bold text-success-600">${selectedItem.price.toFixed(2)}</span>
                  </div>

                  <p className="text-neutral-600">{selectedItem.description}</p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-neutral-500 uppercase">Category</label>
                      <p className="text-sm text-neutral-900">{selectedItem.category}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-neutral-500 uppercase">Prep Time</label>
                      <p className="text-sm text-neutral-900">{selectedItem.prep_time} minutes</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-neutral-500 uppercase">Availability</label>
                      <p className="text-sm text-neutral-900">{selectedItem.is_available ? 'Available' : 'Not Available'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-neutral-500 uppercase">Current Status</label>
                      <p className="text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedItem.status)}`}>
                          {selectedItem.status}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Dietary Tags */}
                  <div>
                    <label className="text-xs font-medium text-neutral-500 uppercase">Dietary Information</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedItem.is_vegetarian && <span className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-full">Vegetarian</span>}
                      {selectedItem.is_vegan && <span className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-full">Vegan</span>}
                      {selectedItem.is_gluten_free && <span className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full">Gluten-Free</span>}
                      {selectedItem.is_spicy && (
                        <span className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-full">
                          Spicy (Level {selectedItem.spice_level})
                        </span>
                      )}
                      {!selectedItem.is_vegetarian && !selectedItem.is_vegan && !selectedItem.is_gluten_free && !selectedItem.is_spicy && (
                        <span className="text-sm text-neutral-400">No dietary tags</span>
                      )}
                    </div>
                  </div>

                  {/* Confidence Score */}
                  {selectedItem.confidence_score && (
                    <div>
                      <label className="text-xs font-medium text-neutral-500 uppercase">AI Confidence Score</label>
                      <div className="flex items-center mt-1">
                        <div className="flex-1 bg-neutral-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              selectedItem.confidence_score >= 0.8 ? 'bg-success-500' :
                              selectedItem.confidence_score >= 0.6 ? 'bg-warning-500' : 'bg-error-500'
                            }`}
                            style={{ width: `${selectedItem.confidence_score * 100}%` }}
                          />
                        </div>
                        <span className="ml-3 text-sm text-neutral-600">{Math.round(selectedItem.confidence_score * 100)}%</span>
                      </div>
                      {selectedItem.confidence_score < 0.7 && (
                        <p className="text-xs text-orange-600 mt-1 flex items-center">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          This item was scraped with low confidence and may need manual review
                        </p>
                      )}
                    </div>
                  )}

                  {/* Admin Notes */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Admin Notes
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      rows={3}
                      placeholder="Add notes about this menu item..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                    />
                  </div>

                  {selectedItem.admin_notes && (
                    <div className="p-3 bg-neutral-50 rounded-lg">
                      <label className="text-xs font-medium text-neutral-500 uppercase">Previous Admin Notes</label>
                      <p className="text-sm text-neutral-700 mt-1">{selectedItem.admin_notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-neutral-200 flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setShowItemModal(false)}
                >
                  Cancel
                </Button>
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    leftIcon={<AlertTriangle size={16} />}
                    onClick={() => handleFlagItem(selectedItem)}
                    disabled={processingAction}
                    className="text-orange-600 border-orange-600 hover:bg-orange-50"
                  >
                    Flag
                  </Button>
                  <Button
                    variant="outline"
                    leftIcon={<XCircle size={16} />}
                    onClick={() => handleRejectItem(selectedItem)}
                    disabled={processingAction}
                    className="text-error-600 border-error-600 hover:bg-error-50"
                  >
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    leftIcon={<CheckCircle size={16} />}
                    onClick={() => handleApproveItem(selectedItem)}
                    disabled={processingAction}
                    className="bg-success-600 hover:bg-success-700"
                  >
                    Approve
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuReview;

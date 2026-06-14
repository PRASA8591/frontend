import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { 
  Truck, 
  PlusCircle, 
  History, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Warehouse, 
  Loader2, 
  Search, 
  Trash2, 
  Printer, 
  FileText,
  Calendar,
  User,
  MessageSquare,
  Edit,
  Save
} from 'lucide-react';

const StockTransfers = () => {
  const toast = useToast();
  const { confirm } = useConfirm();
  const { settings, formatCurrency } = useSettings();
  const { user } = useAuth();
  const readOnly = user?.role !== 'admin' && !user?.access?.transfers_edit;
  const navigate = useNavigate();
  const location = useLocation();

  // Filter warehouses based on user allowed locations (access list)
  const filteredWarehouses = user?.role === 'admin'
    ? warehouses
    : warehouses.filter(w => user?.allowedWarehouses?.some(aw => String(aw._id || aw) === String(w._id)));

  // Determine active tab based on route
  const getActiveTabFromPath = () => {
    if (location.pathname === '/transfers/request') return 'request';
    if (location.pathname === '/transfers/history') return 'history';
    return 'overview';
  };

  const activeTab = getActiveTabFromPath();

  const handleTabChange = (tab) => {
    if (tab === 'request') navigate('/transfers/request');
    else if (tab === 'history') navigate('/transfers/history');
    else navigate('/transfers');
  };

  // State Variables
  const [transfers, setTransfers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Search/Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSourceWH, setFilterSourceWH] = useState('');
  const [filterDestWH, setFilterDestWH] = useState('');

  // Request Form States
  const [sourceWH, setSourceWH] = useState('');
  const [destWH, setDestWH] = useState('');
  const [remarks, setRemarks] = useState('');
  const [requestItems, setRequestItems] = useState([
    { itemId: '', batchNumber: '', quantity: 1, maxQty: 0, batches: [], sku: '', name: '' }
  ]);

  // Draft Modals & Editor States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditDraftModal, setShowEditDraftModal] = useState(false);
  const [editingDraft, setEditingDraft] = useState(null);
  const [draftDestWH, setDraftDestWH] = useState('');
  const [draftRemarks, setDraftRemarks] = useState('');
  const [draftItems, setDraftItems] = useState([]);

  // Item Adder States (Draft Editor)
  const [addItemId, setAddItemId] = useState('');
  const [addBatchNumber, setAddBatchNumber] = useState('');
  const [addQty, setAddQty] = useState(1);
  const [addBatches, setAddBatches] = useState([]);
  const [addMaxQty, setAddMaxQty] = useState(0);

  // Handle Item select in Adder
  const handleAddItemSelect = (itemId) => {
    setAddItemId(itemId);
    const item = inventoryItems.find(i => i._id === itemId);
    if (item && item.batches && item.batches.length > 0) {
      setAddBatches(item.batches);
      // Select first batch by default
      const firstBatch = item.batches[0];
      setAddBatchNumber(firstBatch.batchNumber);
      setAddMaxQty(firstBatch.quantity);
      setAddQty(Math.min(1, firstBatch.quantity));
    } else {
      setAddBatches([]);
      setAddBatchNumber('');
      setAddMaxQty(0);
      setAddQty(0);
    }
  };

  // Handle Batch select in Adder
  const handleAddBatchSelect = (batchNo) => {
    setAddBatchNumber(batchNo);
    const batch = addBatches.find(b => b.batchNumber === batchNo);
    if (batch) {
      setAddMaxQty(batch.quantity);
      setAddQty(Math.min(addQty, batch.quantity));
    } else {
      setAddMaxQty(0);
      setAddQty(0);
    }
  };

  // Append Item to Draft List
  const handleAppendItemToList = () => {
    if (!addItemId || !addBatchNumber || addQty <= 0) {
      return toast.error('Please select an item, batch, and enter a valid quantity.');
    }

    const selectedItem = inventoryItems.find(i => i._id === addItemId);
    if (!selectedItem) return;

    // Check if item+batch is already added to draftItems
    const existsIdx = draftItems.findIndex(i => i.itemId === addItemId && i.batchNumber === addBatchNumber);
    if (existsIdx > -1) {
      toast.warning('Item with this batch number has already been added. You can adjust its quantity below.');
      return;
    }

    // Append item
    const newItem = {
      itemId: addItemId,
      name: selectedItem.name,
      sku: selectedItem.sku,
      batchNumber: addBatchNumber,
      quantity: addQty,
      maxQty: addMaxQty,
      batches: addBatches
    };

    setDraftItems([...draftItems, newItem]);

    // Reset adder fields
    setAddItemId('');
    setAddBatchNumber('');
    setAddQty(1);
    setAddMaxQty(0);
    setAddBatches([]);

    toast.success(`${selectedItem.name} added to list.`);
  };

  const getAuthConfig = () => {
    const token = sessionStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  // Fetch all transfers
  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://127.0.0.1:5000/api/transfers', getAuthConfig());
      setTransfers(res.data);
    } catch (err) {
      toast.error('Failed to synchronize stock transfers.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch warehouses
  const fetchWarehouses = async () => {
    try {
      const res = await axios.get('http://127.0.0.1:5000/api/warehouses', getAuthConfig());
      setWarehouses(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch items for the selected source warehouse
  const fetchInventoryItems = async (whId) => {
    if (!whId) {
      setInventoryItems([]);
      return;
    }
    try {
      const res = await axios.get(`http://127.0.0.1:5000/api/inventory?warehouseId=${whId}`, getAuthConfig());
      setInventoryItems(res.data);
    } catch (err) {
      toast.error('Failed to fetch source warehouse inventory.');
    }
  };

  // Fetch transfers and warehouses on mount or pathname change
  useEffect(() => {
    fetchTransfers();
    fetchWarehouses();
  }, [location.pathname]);

  // Handle auto-selecting the source warehouse once user/warehouses are loaded
  useEffect(() => {
    if (user && warehouses.length > 0) {
      const currentWhId = user?.currentWarehouse?._id || user?.currentWarehouse || warehouses[0]?._id || '';
      if (currentWhId) {
        setSourceWH(currentWhId);
        fetchInventoryItems(currentWhId);
      }
    }
  }, [user, warehouses]);


  // Handle source warehouse change in form
  const handleSourceWarehouseChange = (e) => {
    const whId = e.target.value;
    setSourceWH(whId);
    // Reset request items when warehouse changes
    setRequestItems([{ itemId: '', batchNumber: '', quantity: 1, maxQty: 0, batches: [], sku: '', name: '' }]);
    fetchInventoryItems(whId);
  };

  // Add item row in request form
  const addRequestItemRow = () => {
    setRequestItems([...requestItems, { itemId: '', batchNumber: '', quantity: 1, maxQty: 0, batches: [], sku: '', name: '' }]);
  };

  // Remove item row in request form
  const removeRequestItemRow = (index) => {
    const updated = [...requestItems];
    updated.splice(index, 1);
    setRequestItems(updated.length === 0 ? [{ itemId: '', batchNumber: '', quantity: 1, maxQty: 0, batches: [], sku: '', name: '' }] : updated);
  };

  // Handle item selection change in row
  const handleItemSelectChange = (index, itemId) => {
    const updated = [...requestItems];
    const item = inventoryItems.find(i => i._id === itemId);
    if (!item) {
      updated[index] = { itemId: '', batchNumber: '', quantity: 1, maxQty: 0, batches: [], sku: '', name: '' };
      setRequestItems(updated);
      return;
    }

    updated[index].itemId = itemId;
    updated[index].name = item.name;
    updated[index].sku = item.sku;
    updated[index].batches = item.batches || [];
    
    // Select first batch by default if available
    if (item.batches && item.batches.length > 0) {
      updated[index].batchNumber = item.batches[0].batchNumber;
      updated[index].maxQty = item.batches[0].quantity;
      updated[index].quantity = Math.min(1, item.batches[0].quantity);
    } else {
      updated[index].batchNumber = '';
      updated[index].maxQty = 0;
      updated[index].quantity = 0;
    }

    setRequestItems(updated);
  };

  // Handle batch selection change in row
  const handleBatchSelectChange = (index, batchNo) => {
    const updated = [...requestItems];
    const batch = updated[index].batches.find(b => b.batchNumber === batchNo);
    if (batch) {
      updated[index].batchNumber = batchNo;
      updated[index].maxQty = batch.quantity;
      updated[index].quantity = Math.min(updated[index].quantity, batch.quantity);
    }
    setRequestItems(updated);
  };

  // Handle quantity change in row
  const handleQtyChange = (index, val) => {
    const updated = [...requestItems];
    const qty = parseInt(val) || 0;
    updated[index].quantity = Math.min(Math.max(1, qty), updated[index].maxQty);
    setRequestItems(updated);
  };

  // Create transfer draft (From Modal)
  const handleCreateDraft = async (e) => {
    e.preventDefault();
    if (!sourceWH || !destWH) {
      return toast.error('Please select a target warehouse.');
    }
    if (sourceWH === destWH) {
      return toast.error('Source and destination warehouses must be different.');
    }

    setSubmitting(true);
    try {
      const res = await axios.post('http://127.0.0.1:5000/api/transfers', {
        sourceWarehouseId: sourceWH,
        destinationWarehouseId: destWH,
        remarks,
        items: []
      }, getAuthConfig());

      toast.success('Stock transfer draft created successfully.');
      setShowCreateModal(false);
      
      // Clear create form fields
      setDestWH('');
      setRemarks('');

      // Refresh transfers list
      await fetchTransfers();

      // Retrieve full populated details for draft editor
      const freshRes = await axios.get(`http://127.0.0.1:5000/api/transfers/${res.data._id}`, getAuthConfig());
      handleOpenDraft(freshRes.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create transfer draft.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open existing draft in Editor Popup
  const handleOpenDraft = async (draft) => {
    setEditingDraft(draft);
    setDraftDestWH(draft.destinationWarehouse?._id || draft.destinationWarehouse || '');
    setDraftRemarks(draft.remarks || '');
    
    // Load fresh source warehouse inventory to ensure accurate stock limits
    const sourceWhId = draft.sourceWarehouse?._id || draft.sourceWarehouse || '';
    let freshInventory = inventoryItems;
    if (sourceWhId) {
      try {
        const res = await axios.get(`http://127.0.0.1:5000/api/inventory?warehouseId=${sourceWhId}`, getAuthConfig());
        freshInventory = res.data;
        setInventoryItems(res.data);
      } catch (err) {
        console.error("Failed to load inventory for draft source", err);
      }
    }

    const mappedItems = (draft.items || []).map(di => {
      const match = freshInventory.find(ii => ii._id === (di.itemId?._id || di.itemId));
      const batches = match ? match.batches : [{ batchNumber: di.batchNumber, quantity: di.quantity }];
      const maxQtyBatch = batches.find(b => b.batchNumber === di.batchNumber);
      
      return {
        itemId: di.itemId?._id || di.itemId,
        name: di.name,
        sku: di.sku,
        batchNumber: di.batchNumber,
        quantity: di.quantity,
        maxQty: maxQtyBatch ? maxQtyBatch.quantity : di.quantity,
        batches: batches
      };
    });

    setDraftItems(mappedItems);
    
    // Clear item adder fields
    setAddItemId('');
    setAddBatchNumber('');
    setAddQty(1);
    setAddMaxQty(0);
    setAddBatches([]);
    
    setShowEditDraftModal(true);
  };

  // Draft items mutation handlers
  const removeDraftItemRow = (index) => {
    const updated = [...draftItems];
    updated.splice(index, 1);
    setDraftItems(updated);
  };

  const handleDraftQtyChange = (index, val) => {
    const updated = [...draftItems];
    const qty = parseInt(val) || 0;
    updated[index].quantity = Math.min(Math.max(1, qty), updated[index].maxQty);
    setDraftItems(updated);
  };

  // Save draft modifications (PUT)
  const handleSaveDraft = async (e) => {
    if (e) e.preventDefault();
    if (!draftDestWH) {
      return toast.error('Please select a target warehouse.');
    }

    const itemsToSubmit = draftItems.filter(item => item.itemId && item.batchNumber && item.quantity > 0);

    const confirmed = await confirm({
      title: 'Save Draft changes?',
      message: 'Are you sure you want to save the changes to this transfer draft?',
      confirmText: 'Save Draft',
      type: 'warning'
    });

    if (!confirmed) return;

    setSubmitting(true);
    try {
      await axios.put(`http://127.0.0.1:5000/api/transfers/${editingDraft._id}`, {
        destinationWarehouseId: draftDestWH,
        items: itemsToSubmit.map(i => ({
          itemId: i.itemId,
          batchNumber: i.batchNumber,
          quantity: i.quantity
        })),
        remarks: draftRemarks
      }, getAuthConfig());

      toast.success('Draft changes saved successfully.');
      fetchTransfers();
      setShowEditDraftModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save draft.');
    } finally {
      setSubmitting(false);
    }
  };

  // Complete Transfer (Approve/Dispatch and deduct stock)
  const handleCompleteDraftTransfer = async () => {
    if (!draftDestWH) {
      return toast.error('Please select a target warehouse.');
    }

    const itemsToSubmit = draftItems.filter(item => item.itemId && item.batchNumber && item.quantity > 0);
    if (itemsToSubmit.length === 0) {
      return toast.error('Please select at least one item with valid quantity to complete the transfer.');
    }

    const confirmed = await confirm({
      title: 'Complete & Ship Transfer?',
      message: `Are you sure you want to complete and dispatch this stock transfer? This will immediately deduct ${itemsToSubmit.reduce((sum, i) => sum + i.quantity, 0)} units from your warehouse stock and set status to "In Transit".`,
      confirmText: 'Complete Transfer',
      type: 'warning'
    });

    if (!confirmed) return;

    setSubmitting(true);
    try {
      // 1. Save latest draft items first
      await axios.put(`http://127.0.0.1:5000/api/transfers/${editingDraft._id}`, {
        destinationWarehouseId: draftDestWH,
        items: itemsToSubmit.map(i => ({
          itemId: i.itemId,
          batchNumber: i.batchNumber,
          quantity: i.quantity
        })),
        remarks: draftRemarks
      }, getAuthConfig());

      // 2. Dispatch/Approve transfer
      await axios.post(`http://127.0.0.1:5000/api/transfers/${editingDraft._id}/approve`, {}, getAuthConfig());

      toast.success('Stock transfer completed & shipped successfully.');
      fetchTransfers();
      setShowEditDraftModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete stock transfer.');
    } finally {
      setSubmitting(false);
    }
  };

  // Approve and ship transfer (moves to In Transit)
  const handleApproveTransfer = async (id, transferNo) => {
    const confirmed = await confirm({
      title: 'Approve & Ship Stock?',
      message: `Are you sure you want to approve and ship stock transfer ${transferNo}? This will immediately deduct items from the source warehouse.`,
      confirmText: 'Approve & Ship',
      type: 'warning'
    });

    if (!confirmed) return;

    try {
      await axios.post(`http://127.0.0.1:5000/api/transfers/${id}/approve`, {}, getAuthConfig());
      toast.success(`Transfer ${transferNo} approved and shipped.`);
      fetchTransfers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve transfer.');
    }
  };

  // Receive transfer (moves to Completed)
  const handleReceiveTransfer = async (id, transferNo) => {
    const confirmed = await confirm({
      title: 'Receive Stock & Add to Inventory?',
      message: `Are you sure you want to receive and add the items from transfer ${transferNo} to your active warehouse stock? This action will update your inventory balances.`,
      confirmText: 'Add Stock',
      type: 'warning'
    });

    if (!confirmed) return;

    try {
      await axios.post(`http://127.0.0.1:5000/api/transfers/${id}/receive`, {}, getAuthConfig());
      toast.success(`Transfer ${transferNo} completed and stock added to inventory.`);
      fetchTransfers();
      if (showDetailsModal && selectedTransfer?._id === id) {
        setShowDetailsModal(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete transfer.');
    }
  };

  // Cancel transfer
  const handleCancelTransfer = async (id, transferNo, currentStatus) => {
    const isShipped = currentStatus === 'In Transit';
    const message = isShipped 
      ? `Are you sure you want to cancel transfer ${transferNo}? The stock has already shipped, so cancelling will return and add the stock back to the source warehouse.`
      : `Are you sure you want to cancel transfer request ${transferNo}?`;

    const confirmed = await confirm({
      title: 'Cancel Stock Transfer?',
      message,
      confirmText: 'Cancel Transfer',
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      await axios.post(`http://127.0.0.1:5000/api/transfers/${id}/cancel`, {}, getAuthConfig());
      toast.success(`Transfer ${transferNo} cancelled successfully.`);
      fetchTransfers();
      if (showDetailsModal && selectedTransfer?._id === id) {
        setShowDetailsModal(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel transfer.');
    }
  };

  // Open details modal
  const handleViewDetails = (transfer) => {
    setSelectedTransfer(transfer);
    setShowDetailsModal(true);
  };

  // Trigger Print of Manifest
  const handlePrintManifest = () => {
    window.print();
  };

  // Resolve user session warehouse context
  const currentWhId = user?.currentWarehouse?._id || user?.currentWarehouse || '';

  // Filters for lists
  const filteredTransfers = transfers.filter(t => {
    const matchesSearch = t.transferNo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.items.some(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesSearch;
  });

  // Outbound drafts from this warehouse
  const outboundDrafts = filteredTransfers.filter(t => 
    String(t.sourceWarehouse?._id || t.sourceWarehouse) === String(currentWhId) && 
    t.status === 'Draft'
  );

  // Outbound shipments from this warehouse (In Transit)
  const outboundInTransit = filteredTransfers.filter(t => 
    String(t.sourceWarehouse?._id || t.sourceWarehouse) === String(currentWhId) && 
    t.status === 'In Transit'
  );

  // Inbound shipments to this warehouse (In Transit)
  const inboundInTransit = filteredTransfers.filter(t => 
    String(t.destinationWarehouse?._id || t.destinationWarehouse) === String(currentWhId) && 
    t.status === 'In Transit'
  );

  // History (Completed or Cancelled transfers involving this warehouse)
  const historicalTransfers = filteredTransfers.filter(t => 
    (String(t.sourceWarehouse?._id || t.sourceWarehouse) === String(currentWhId) || 
     String(t.destinationWarehouse?._id || t.destinationWarehouse) === String(currentWhId)) && 
    (t.status === 'Completed' || t.status === 'Cancelled')
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            Draft
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Pending Approval
          </span>
        );
      case 'In Transit':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Truck className="w-3.5 h-3.5 animate-bounce" />
            In Transit
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const isDark = settings?.theme === 'dark';
  const isBlue = settings?.theme === 'blue';
  const isLight = !isDark && !isBlue;

  const currentWHObject = warehouses.find(w => String(w._id) === String(sourceWH));
  const currentWHName = currentWHObject ? `${currentWHObject.name} (${currentWHObject.code})` : 'Loading origin location...';


  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Title Header */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <Truck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Stock Transfers Center</h1>
            <p className="text-sm text-slate-500 font-medium">Coordinate stock movements, dispatch shipping mandates, and reconcile inventory balances across warehouses.</p>
          </div>
        </div>
      </div>

      {/* Tabs Menu Navigation */}
      <div className="flex border-b border-slate-200 space-x-6">
        <button
          onClick={() => handleTabChange('overview')}
          className={`pb-4 text-sm font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'overview' 
              ? 'border-blue-600 text-blue-600 font-black' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Truck className="w-4 h-4" /> Transfer Requests
        </button>
        <button
          onClick={() => handleTabChange('request')}
          className={`pb-4 text-sm font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'request' 
              ? 'border-blue-600 text-blue-600 font-black' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <PlusCircle className="w-4 h-4" /> Pending Receipts
        </button>
        <button
          onClick={() => handleTabChange('history')}
          className={`pb-4 text-sm font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'history' 
              ? 'border-blue-600 text-blue-600 font-black' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <History className="w-4 h-4" /> Transfer History
        </button>
      </div>

      {/* Tab: Transfer Requests (Drafts & Active Outgoing Shipments) */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Actions Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-80 group">
              <Search className="absolute left-3.5 inset-y-0 my-auto h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Transfer No, SKU, Item..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {!readOnly && (
              <button
                onClick={() => {
                  setDestWH('');
                  setRemarks('');
                  setShowCreateModal(true);
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-blue-600/20 active:scale-95 transition-all w-full sm:w-auto justify-center"
              >
                <PlusCircle className="w-4 h-4" /> Create New Transfer
              </button>
            )}
          </div>

          {/* Draft Manifests Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-400" />
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Draft Manifests</h2>
              <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{outboundDrafts.length}</span>
            </div>

            {loading ? (
              <div className="py-12 text-center bg-white rounded-2xl border border-slate-200">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                <p className="text-xs text-slate-400 font-bold mt-2">Syncing drafts...</p>
              </div>
            ) : outboundDrafts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
                <p className="text-xs font-bold text-slate-500">No draft documents found. Click "Create New Transfer" to start.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                      <tr>
                        <th className="px-8 py-4">Transfer No</th>
                        <th className="px-6 py-4">Destination</th>
                        <th className="px-6 py-4">Items / Units</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-8 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {outboundDrafts.map(t => (
                        <tr key={t._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-4 font-mono font-bold text-slate-900">{t.transferNo}</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-700">{t.destinationWarehouse?.name} ({t.destinationWarehouse?.code})</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-500">
                            {t.items.length} types / {t.items.reduce((sum, item) => sum + item.quantity, 0)} units
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              Draft
                            </span>
                          </td>
                          <td className="px-8 py-4 text-right flex items-center justify-end gap-2">
                            {readOnly ? (
                              <button
                                onClick={() => handleViewDetails(t)}
                                className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ml-auto active:scale-95 transition-all"
                              >
                                <FileText className="w-3.5 h-3.5" /> Manifest
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleOpenDraft(t)}
                                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                                >
                                  <Edit className="w-3.5 h-3.5" /> Edit Draft
                                </button>
                                <button
                                  onClick={() => handleCancelTransfer(t._id, t.transferNo, t.status)}
                                  className="px-3 py-1.5 hover:bg-rose-50 text-rose-600 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border border-transparent hover:border-rose-100"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Outbound Shipments Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-slate-400" />
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Active Outgoing Shipments (In Transit)</h2>
              <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{outboundInTransit.length}</span>
            </div>

            {loading ? (
              <div className="py-12 text-center bg-white rounded-2xl border border-slate-200">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                <p className="text-xs text-slate-400 font-bold mt-2">Syncing shipments...</p>
              </div>
            ) : outboundInTransit.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
                <p className="text-xs font-bold text-slate-500">No active outbound shipments in transit.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                      <tr>
                        <th className="px-8 py-4">Transfer No</th>
                        <th className="px-6 py-4">Destination</th>
                        <th className="px-6 py-4">Items / Units</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-8 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {outboundInTransit.map(t => (
                        <tr key={t._id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-4 font-mono font-bold text-slate-900">{t.transferNo}</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-700">{t.destinationWarehouse?.name} ({t.destinationWarehouse?.code})</td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-500">
                            {t.items.length} types / {t.items.reduce((sum, item) => sum + item.quantity, 0)} units
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(t.status)}
                          </td>
                          <td className="px-8 py-4 text-right">
                            <button
                              onClick={() => handleViewDetails(t)}
                              className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ml-auto active:scale-95 transition-all"
                            >
                              <FileText className="w-3.5 h-3.5" /> Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Pending Receipts (Incoming Shipments) */}
      {activeTab === 'request' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-80 group">
              <Search className="absolute left-3.5 inset-y-0 my-auto h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search incoming shipments..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <span>Incoming stock shipments dispatched to your active location. Click details to audit and add stock.</span>
            </div>
          </div>

          {loading ? (
            <div className="py-24 text-center bg-white rounded-2xl border border-slate-200">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
              <p className="text-sm text-slate-500 font-bold mt-4">Syncing incoming shipments...</p>
            </div>
          ) : inboundInTransit.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-20 text-center text-slate-400">
              <Truck className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h3 className="font-bold text-slate-800 text-lg uppercase tracking-tight">No Pending Receipts</h3>
              <p className="text-sm text-slate-500 mt-1">There are no incoming stock shipments currently in transit to this location.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                    <tr>
                      <th className="px-8 py-5">Transfer No</th>
                      <th className="px-6 py-5">Origin (From)</th>
                      <th className="px-6 py-5">Items / Units</th>
                      <th className="px-6 py-5">Status</th>
                      <th className="px-6 py-5">Dispatched Date</th>
                      <th className="px-8 py-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {inboundInTransit.map((t) => (
                      <tr key={t._id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-5 font-mono font-bold text-slate-900">{t.transferNo}</td>
                        <td className="px-6 py-5 text-xs font-bold text-slate-700">
                          {t.sourceWarehouse?.name} ({t.sourceWarehouse?.code})
                        </td>
                        <td className="px-6 py-5 text-xs font-bold text-slate-500">
                          {t.items.length} types / {t.items.reduce((sum, item) => sum + item.quantity, 0)} units
                        </td>
                        <td className="px-6 py-5">{getStatusBadge(t.status)}</td>
                        <td className="px-6 py-5 text-xs text-slate-500 font-bold">
                          {new Date(t.approvedDate || t.initiatedDate).toLocaleDateString()}
                        </td>
                        <td className="px-8 py-5 text-right">
                          {readOnly ? (
                            <button
                              onClick={() => handleViewDetails(t)}
                              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all ml-auto"
                            >
                              <FileText className="w-3.5 h-3.5" /> Details
                            </button>
                          ) : (
                            <button
                              onClick={() => handleViewDetails(t)}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-600/10 active:scale-95 transition-all ml-auto"
                            >
                              <PlusCircle className="w-3.5 h-3.5" /> Details & Add Stock
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Transfer History (Archive / Completed / Cancelled List) */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-80 group">
              <Search className="absolute left-3.5 inset-y-0 my-auto h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search history by Transfer No..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <select
                value={filterSourceWH}
                onChange={(e) => setFilterSourceWH(e.target.value)}
                className="w-full sm:w-48 p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                <option value="">Source Warehouse (All)</option>
                {filteredWarehouses.map(w => (
                  <option key={w._id} value={w._id}>{w.name}</option>
                ))}
              </select>
              <select
                value={filterDestWH}
                onChange={(e) => setFilterDestWH(e.target.value)}
                className="w-full sm:w-48 p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                <option value="">Destination Warehouse (All)</option>
                {filteredWarehouses.map(w => (
                  <option key={w._id} value={w._id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
                  <tr>
                    <th className="px-8 py-5">Transfer No</th>
                    <th className="px-6 py-5">Route</th>
                    <th className="px-6 py-5">Items Qty</th>
                    <th className="px-6 py-5">Status</th>
                    <th className="px-6 py-5">Finalized Date</th>
                    <th className="px-8 py-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="py-20 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                        <p className="text-xs text-slate-500 font-bold mt-2">Loading historical records...</p>
                      </td>
                    </tr>
                  ) : historicalTransfers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-32 text-center">
                        <div className="flex flex-col items-center opacity-25">
                           <History className="w-16 h-16 text-slate-300" />
                           <p className="mt-4 font-black uppercase tracking-[0.2em] text-xs">No History Found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    historicalTransfers.map((t) => (
                      <tr key={t._id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-5 font-mono font-bold text-slate-900">{t.transferNo}</td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                            <span>{t.sourceWarehouse?.name}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                            <span>{t.destinationWarehouse?.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-xs font-bold text-slate-700">
                          {t.items.reduce((sum, item) => sum + item.quantity, 0)} Units ({t.items.length} items)
                        </td>
                        <td className="px-6 py-5">{getStatusBadge(t.status)}</td>
                        <td className="px-6 py-5 text-xs text-slate-500 font-bold">
                          {new Date(t.receivedDate || t.cancelledDate || t.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="px-8 py-5 text-right">
                          <button
                            onClick={() => handleViewDetails(t)}
                            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ml-auto active:scale-95 transition-all"
                          >
                            <FileText className="w-3.5 h-3.5" /> Manifest
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Details / Print Manifest Modal */}
      {showDetailsModal && selectedTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto print-overlay">
          <div className="bg-white w-full max-w-3xl rounded-[32px] shadow-3xl overflow-hidden flex flex-col my-8 animate-in zoom-in-95 duration-200 print-modal-content">
            
            {/* Modal Actions Header - Hide on print */}
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center relative overflow-hidden no-print">
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-blue-400" />
                <span className="font-bold text-sm">Stock Transfer Mandate - {selectedTransfer.transferNo}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintManifest}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Print Mandate
                </button>
                <button 
                  onClick={() => setShowDetailsModal(false)} 
                  className="p-2 hover:bg-white/10 rounded-xl transition-all"
                >
                  <XCircle className="w-5 h-5"/>
                </button>
              </div>
            </div>

            {/* Printable Manifest Layout */}
            <div className="p-10 space-y-8 max-h-[80vh] overflow-y-auto print:max-h-full print:p-0 print:overflow-visible custom-scrollbar">
              
              {/* Manifest Header */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">PrasaTek Inventory Solutions</h1>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Core Secure v4.2.1 | Dispatch Manifest</p>
                  <p className="text-xs text-slate-500 font-bold mt-3">Manifest ID: <span className="text-slate-800 font-mono font-black">{selectedTransfer.transferNo}</span></p>
                </div>
                <div className="text-right">
                  <div className="mb-2">{getStatusBadge(selectedTransfer.status)}</div>
                  <p className="text-xs text-slate-500 font-bold">Generated: {new Date().toLocaleDateString()}</p>
                </div>
              </div>

              {/* Warehouse Details Route */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-200/50 print:bg-white print:border-slate-200">
                <div className="space-y-2">
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dispatch Origin (Source)</h4>
                  <div className="text-sm font-black text-slate-900">{selectedTransfer.sourceWarehouse?.name}</div>
                  <div className="text-xs text-slate-500 font-medium">Code: <span className="font-bold">{selectedTransfer.sourceWarehouse?.code}</span></div>
                  {selectedTransfer.sourceWarehouse?.address && <div className="text-xs text-slate-500">{selectedTransfer.sourceWarehouse?.address}</div>}
                  {selectedTransfer.sourceWarehouse?.manager && <div className="text-xs text-slate-500">Manager: {selectedTransfer.sourceWarehouse?.manager}</div>}
                </div>

                <div className="space-y-2 border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6">
                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Receipt Destination (Target)</h4>
                  <div className="text-sm font-black text-slate-900">{selectedTransfer.destinationWarehouse?.name}</div>
                  <div className="text-xs text-slate-500 font-medium">Code: <span className="font-bold">{selectedTransfer.destinationWarehouse?.code}</span></div>
                  {selectedTransfer.destinationWarehouse?.address && <div className="text-xs text-slate-500">{selectedTransfer.destinationWarehouse?.address}</div>}
                  {selectedTransfer.destinationWarehouse?.manager && <div className="text-xs text-slate-500">Manager: {selectedTransfer.destinationWarehouse?.manager}</div>}
                </div>
              </div>

              {/* Metadata log */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-bold text-slate-500">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider text-slate-400">Initiated By</span>
                    <span className="text-slate-800 font-extrabold">{selectedTransfer.initiatedBy?.username || 'System'}</span>
                  </div>
                </div>
                {selectedTransfer.approvedBy && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-500" />
                    <div>
                      <span className="block text-[8px] uppercase tracking-wider text-slate-400">Approved By</span>
                      <span className="text-slate-800 font-extrabold">{selectedTransfer.approvedBy?.username}</span>
                    </div>
                  </div>
                )}
                {selectedTransfer.receivedBy && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-500" />
                    <div>
                      <span className="block text-[8px] uppercase tracking-wider text-slate-400">Received By</span>
                      <span className="text-slate-800 font-extrabold">{selectedTransfer.receivedBy?.username}</span>
                    </div>
                  </div>
                )}
                {selectedTransfer.cancelledBy && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-rose-500" />
                    <div>
                      <span className="block text-[8px] uppercase tracking-wider text-slate-400">Cancelled By</span>
                      <span className="text-slate-800 font-extrabold">{selectedTransfer.cancelledBy?.username}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Item Name / SKU</th>
                      <th className="px-6 py-4">Batch Number</th>
                      <th className="px-6 py-4 text-right">Quantity</th>
                      <th className="px-6 py-4 text-right">Value (Cost)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {selectedTransfer.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">{item.name}</div>
                          <div className="text-[10px] text-slate-400 font-bold mt-0.5">SKU: {item.sku}</div>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-600">{item.batchNumber}</td>
                        <td className="px-6 py-4 text-right font-bold font-mono text-slate-900">{item.quantity}</td>
                        <td className="px-6 py-4 text-right font-mono text-slate-600">{formatCurrency(item.costPrice * item.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200 text-xs font-black">
                    <tr>
                      <td colSpan="2" className="px-6 py-4 uppercase text-slate-400">Total Manifest Weight</td>
                      <td className="px-6 py-4 text-right text-slate-900 font-mono text-sm">{selectedTransfer.items.reduce((sum, item) => sum + item.quantity, 0)} Units</td>
                      <td className="px-6 py-4 text-right text-slate-900 font-mono text-sm">
                        {formatCurrency(selectedTransfer.items.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Remarks block */}
              {selectedTransfer.remarks && (
                <div className="space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-200/50 text-xs font-bold text-slate-500">
                  <span className="block text-[8px] uppercase tracking-wider text-slate-400 flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5"/> Transfer Remarks</span>
                  <p className="text-slate-700 italic font-medium mt-1">{selectedTransfer.remarks}</p>
                </div>
              )}

              {/* Timeline Dates */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <div>Initiated Date: <span className="text-slate-600">{new Date(selectedTransfer.initiatedDate).toLocaleString()}</span></div>
                {selectedTransfer.approvedDate && <div>Approved Date: <span className="text-slate-600">{new Date(selectedTransfer.approvedDate).toLocaleString()}</span></div>}
                {selectedTransfer.receivedDate && <div>Received Date: <span className="text-slate-600">{new Date(selectedTransfer.receivedDate).toLocaleString()}</span></div>}
                {selectedTransfer.cancelledDate && <div>Cancelled Date: <span className="text-slate-600">{new Date(selectedTransfer.cancelledDate).toLocaleString()}</span></div>}
              </div>

              {/* Signatures Panel - Only shown in printable format or details */}
              <div className="grid grid-cols-2 gap-20 pt-20 border-t border-dashed border-slate-200 text-center">
                <div className="space-y-2">
                  <div className="border-b border-slate-300 w-48 mx-auto h-8"></div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Authorized Dispatcher</span>
                </div>
                <div className="space-y-2">
                  <div className="border-b border-slate-300 w-48 mx-auto h-8"></div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Receiving Operator Sign-Off</span>
                </div>
              </div>

            </div>

            {/* Modal Footer Actions - Hide on print */}
            {selectedTransfer.status === 'In Transit' && !readOnly && String(selectedTransfer.destinationWarehouse?._id || selectedTransfer.destinationWarehouse) === String(currentWhId) && (
              <div className="bg-slate-50 px-8 py-5 border-t border-slate-100 flex justify-end gap-3 no-print">
                <button
                  onClick={() => handleReceiveTransfer(selectedTransfer._id, selectedTransfer.transferNo)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" /> Add Stock
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create New Transfer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-[32px] shadow-3xl overflow-hidden flex flex-col my-8 animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-blue-400" />
                <span className="font-bold text-sm">Create New Stock Transfer Draft</span>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)} 
                className="p-2 hover:bg-white/10 rounded-xl transition-all"
              >
                <XCircle className="w-5 h-5"/>
              </button>
            </div>

            <form onSubmit={handleCreateDraft} className="p-8 space-y-6 font-sans">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Dispatch Origin (Source Warehouse)</label>
                  <div className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-black text-slate-700 flex items-center gap-2">
                    <Warehouse className="w-4 h-4 text-blue-600" />
                    <span>{currentWHName}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Receipt Destination (Target Warehouse) *</label>
                  <select
                    required
                    value={destWH}
                    onChange={(e) => setDestWH(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">Select target warehouse...</option>
                    {filteredWarehouses.filter(w => w.status === 'active' && String(w._id) !== String(sourceWH)).map(w => (
                      <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Remarks / Transfer Reason</label>
                  <textarea
                    rows="2"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="E.g. Restocking retail shelf, warehouse rebalancing, etc..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-400"
                  ></textarea>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider font-sans"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50 font-sans"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Create Draft
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Draft Modal */}
      {showEditDraftModal && editingDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-[32px] shadow-3xl overflow-hidden flex flex-col my-8 animate-in zoom-in-95 duration-200 max-h-[90vh]">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Edit className="w-5 h-5 text-blue-400" />
                <span className="font-bold text-sm">Draft Manifest Editor - {editingDraft.transferNo}</span>
              </div>
              <button 
                onClick={() => setShowEditDraftModal(false)} 
                className="p-2 hover:bg-white/10 rounded-xl transition-all"
              >
                <XCircle className="w-5 h-5"/>
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-6 custom-scrollbar font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Dispatch Origin (Source Warehouse)</label>
                  <div className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-black text-slate-700 flex items-center gap-2">
                    <Warehouse className="w-4 h-4 text-blue-600" />
                    <span>{editingDraft.sourceWarehouse?.name} ({editingDraft.sourceWarehouse?.code})</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Receipt Destination (Target Warehouse) *</label>
                  <select
                    required
                    value={draftDestWH}
                    onChange={(e) => setDraftDestWH(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="">Select target warehouse...</option>
                    {filteredWarehouses.filter(w => w.status === 'active' && String(w._id) !== String(editingDraft.sourceWarehouse?._id)).map(w => (
                      <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Item Adder Section */}
              <div className="bg-slate-50 p-6 border border-slate-200 rounded-2xl space-y-4">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4 text-blue-600" /> Add Item to Transfer Manifest
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Select Item *</label>
                    <select
                      value={addItemId}
                      onChange={(e) => handleAddItemSelect(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none cursor-pointer"
                    >
                      <option value="">Select stock item...</option>
                      {inventoryItems
                        .filter(item => item.batches && item.batches.length > 0 && item.quantity > 0)
                        .map(item => (
                          <option key={item._id} value={item._id}>{item.name} (SKU: {item.sku})</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Active Batch *</label>
                    <select
                      value={addBatchNumber}
                      onChange={(e) => handleAddBatchSelect(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none cursor-pointer"
                      disabled={!addItemId}
                    >
                      <option value="">Select batch...</option>
                      {addBatches.map(b => (
                        <option key={b._id} value={b.batchNumber}>{b.batchNumber} ({b.quantity} avail)</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Quantity (Max: {addMaxQty}) *</label>
                      <input
                        type="number"
                        min="1"
                        max={addMaxQty}
                        value={addQty}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setAddQty(Math.min(Math.max(1, val), addMaxQty));
                        }}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                        disabled={!addBatchNumber}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAppendItemToList}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1 shadow-md shadow-blue-600/10 active:scale-95 transition-all"
                      disabled={!addBatchNumber || addQty <= 0}
                    >
                      Add Item
                    </button>
                  </div>
                </div>
              </div>

              {/* Items List Table */}
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Added Items</span>
                </div>

                {draftItems.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <p className="text-xs font-bold text-slate-500">Manifest contains no items. Use the form above to add items.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                    {draftItems.map((row, idx) => (
                      <div key={idx} className="p-4 bg-slate-50/50 border border-slate-200 rounded-2xl flex flex-col md:flex-row gap-4 items-end md:items-center">
                        {/* Item Info */}
                        <div className="flex-1 w-full text-xs font-bold text-slate-700">
                          <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Item Details</span>
                          <div className="text-sm font-black text-slate-900">{row.name}</div>
                          <div className="text-slate-400 text-[10px] mt-0.5">SKU: {row.sku}</div>
                        </div>

                        {/* Batch Info */}
                        <div className="w-full md:w-48 text-xs font-bold text-slate-700">
                          <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Batch Number</span>
                          <span className="font-mono bg-white px-2.5 py-1 border border-slate-200 rounded-lg inline-block mt-0.5">{row.batchNumber}</span>
                        </div>

                        {/* Quantity Edit */}
                        <div className="w-full md:w-32">
                          <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Quantity (Max: {row.maxQty}) *</label>
                          <input
                            type="number"
                            required
                            min="1"
                            max={row.maxQty}
                            value={row.quantity}
                            onChange={(e) => handleDraftQtyChange(idx, e.target.value)}
                            className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none"
                          />
                        </div>

                        {/* Remove Row */}
                        <button
                          type="button"
                          onClick={() => removeDraftItemRow(idx)}
                          className="p-2.5 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl transition-all active:scale-95 flex-shrink-0"
                          title="Remove Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Remarks / Transfer Details</label>
                <textarea
                  rows="2"
                  value={draftRemarks}
                  onChange={(e) => setDraftRemarks(e.target.value)}
                  placeholder="Specify details..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
                ></textarea>
              </div>
            </div>

            <div className="bg-slate-50 px-8 py-5 border-t border-slate-100 flex justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowEditDraftModal(false)}
                className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider font-sans"
              >
                Close
              </button>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveDraft}
                  disabled={submitting}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 font-sans"
                >
                  <Save className="w-4 h-4" /> Save Draft
                </button>
                <button
                  onClick={handleCompleteDraftTransfer}
                  disabled={submitting || draftItems.length === 0 || !draftItems.some(i => i.itemId)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-blue-600/20 font-sans"
                >
                  <Truck className="w-4 h-4" /> Complete Transfer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Print CSS Specific Injection */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-overlay, .print-overlay * {
            visibility: visible;
          }
          .print-overlay {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            background-color: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-modal-content {
            border: none !important;
            box-shadow: none !important;
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

    </div>
  );
};

export default StockTransfers;

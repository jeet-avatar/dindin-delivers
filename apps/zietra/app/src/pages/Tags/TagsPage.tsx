import { useState, useEffect } from 'react';
import {
  TagIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '../../contexts/ThemeContext';

interface Tag {
  id: string;
  name: string;
  color: string;
  contactCount: number;
  companyCount: number;
  dealCount: number;
  createdAt: string;
}

const colorOptions = [
  { value: '#EF4444', label: 'Red' },
  { value: '#F59E0B', label: 'Orange' },
  { value: '#10B981', label: 'Green' },
  { value: '#3B82F6', label: 'Blue' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#6B7280', label: 'Gray' },
];

export function TagsPage() {
  const { gradients } = useTheme();
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [formData, setFormData] = useState({ name: '', color: '#F97316' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('crmToken');
      if (!token) {
        setError('Not authenticated');
        setIsLoading(false);
        return;
      }

      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/tags', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tags');
      }

      const data = await response.json();
      // Transform backend data to match frontend interface
      const transformedTags = (data.tags || []).map((tag: any) => ({
        ...tag,
        contactCount: tag._count?.contacts || 0,
        companyCount: 0, // Not tracked yet
        dealCount: 0, // Not tracked yet
      }));
      setTags(transformedTags);
    } catch (err: any) {
      console.error('Error fetching tags:', err);
      setError(err.message || 'Failed to load tags');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddTag = async () => {
    try {
      setIsSaving(true);
      const token = localStorage.getItem('crmToken');

      console.log('Creating tag with data:', formData);
      console.log('Token:', token ? 'exists' : 'missing');

      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/tags', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.log('Error response:', errorData);
        const errorMsg = errorData.message || errorData.error || 'Failed to create tag';

        // Check for specific error types
        if (response.status === 409 || errorMsg.includes('Unique constraint') || errorMsg.includes('already exists')) {
          throw new Error(`A tag with the name "${formData.name}" already exists. Please use a different name.`);
        } else if (response.status === 401) {
          throw new Error('You are not logged in. Please log in and try again.');
        } else {
          throw new Error(errorMsg);
        }
      }

      console.log('Tag created successfully');
      await fetchTags();
      setFormData({ name: '', color: '#F97316' });
      setShowAddModal(false);
    } catch (err: any) {
      console.error('Error creating tag:', err);
      const errorMessage = err.message || 'Failed to create tag. Please try again.';
      alert(`Error: ${errorMessage}\n\n💡 Tip: Tag names must be unique. If you want to use a similar name, try adding a number or modifier.`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditTag = async () => {
    if (!editingTag) return;

    try {
      setIsSaving(true);
      const token = localStorage.getItem('crmToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/tags/${editingTag.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMsg = errorData.message || errorData.error || 'Failed to update tag';

        // Check for specific error types
        if (response.status === 409 || errorMsg.includes('Unique constraint') || errorMsg.includes('already exists')) {
          throw new Error(`A tag with the name "${formData.name}" already exists. Please use a different name.`);
        } else if (response.status === 401) {
          throw new Error('You are not logged in. Please log in and try again.');
        } else {
          throw new Error(errorMsg);
        }
      }

      await fetchTags();
      setEditingTag(null);
      setFormData({ name: '', color: '#F97316' });
    } catch (err: any) {
      console.error('Error updating tag:', err);
      alert(`Error: ${err.message || 'Failed to update tag'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTag = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tag?')) return;

    try {
      const token = localStorage.getItem('crmToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/tags/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete tag');

      await fetchTags();
    } catch (err: any) {
      console.error('Error deleting tag:', err);
      alert('Failed to delete tag');
    }
  };

  const openEditModal = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({ name: tag.name, color: tag.color });
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#252540] rounded-xl w-1/4"></div>
          <div className="h-64 bg-[#252540] rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#F1F5F9] mb-2">Tags</h1>
        <p className="text-[#94A3B8] mb-3">Organize and categorize your contacts, companies, and deals</p>
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-l-4 border-indigo-500 p-4 rounded-r-xl shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-orange-900 font-medium">
                <span className="font-bold">Why use tags?</span> Quickly segment customers (VIP, Hot Lead), track deal stages, filter reports, automate workflows, and identify opportunities—making your CRM smarter and your sales process more efficient.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Add */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#64748B]" />
          <input
            type="text"
            placeholder="Search tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl font-bold tracking-wide shadow-lg hover:shadow-xl hover:scale-105 transition-all`}
        >
          <PlusIcon className="h-5 w-5" />
          Add Tag
        </button>
      </div>

      {/* Tags Grid */}
      {filteredTags.length === 0 ? (
        <div className="card">
          <div className="p-12 text-center">
            <TagIcon className="h-12 w-12 text-[#64748B] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[#F1F5F9] mb-2">No tags found</h3>
            <p className="text-[#94A3B8] mb-4">
              {searchQuery ? 'Try a different search term' : 'Create your first tag to get started'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowAddModal(true)}
                className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl font-bold tracking-wide shadow-lg hover:shadow-xl hover:scale-105 transition-all`}
              >
                <PlusIcon className="h-5 w-5" />
                Add Tag
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTags.map((tag) => (
            <div key={tag.id} className="card hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer">
              <div className="p-6">
                {/* Tag Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                      style={{ backgroundColor: `${tag.color}20` }}
                    >
                      <TagIcon className="h-6 w-6" style={{ color: tag.color }} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#F1F5F9]">{tag.name}</h3>
                      <div
                        className="inline-block px-2 py-0.5 rounded-lg text-xs font-bold text-white mt-1 shadow-sm"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.color}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(tag)}
                      className="p-2 text-[#64748B] hover:text-indigo-400 hover:bg-orange-500/10 rounded-xl transition-all"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTag(tag.id)}
                      className="p-2 text-[#64748B] hover:text-red-600 hover:bg-red-500/10 rounded-xl transition-all"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Usage Stats */}
                <div className="border-t-2 border-[#1c1c30] pt-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-[#F1F5F9]">{tag.contactCount}</div>
                      <div className="text-xs font-medium text-[#94A3B8]">Contacts</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-[#F1F5F9]">{tag.companyCount}</div>
                      <div className="text-xs font-medium text-[#94A3B8]">Companies</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-[#F1F5F9]">{tag.dealCount}</div>
                      <div className="text-xs font-medium text-[#94A3B8]">Deals</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Tag Modal */}
      {(showAddModal || editingTag) && (
        <div className="modal-overlay" onClick={() => { setShowAddModal(false); setEditingTag(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-[#1c1c30]">
              <h2 className="text-xl font-semibold text-[#F1F5F9]">
                {editingTag ? 'Edit Tag' : 'Add New Tag'}
              </h2>
            </div>
            <div className="p-6">
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); editingTag ? handleEditTag() : handleAddTag(); }}>
                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Tag Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    placeholder="Enter tag name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#CBD5E1] mb-2">Color</label>
                  <div className="grid grid-cols-7 gap-3">
                    {colorOptions.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, color: color.value })}
                        className={`w-12 h-12 rounded-xl transition-all shadow-md ${
                          formData.color === color.value
                            ? 'ring-2 ring-offset-2 ring-orange-500 scale-110 shadow-lg'
                            : 'hover:scale-105 hover:shadow-lg'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.label}
                      />
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-12 h-12 rounded-xl cursor-pointer shadow-md"
                    />
                    <span className="text-sm font-medium text-[#CBD5E1]">Or pick a custom color</span>
                  </div>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowAddModal(false); setEditingTag(null); setFormData({ name: '', color: '#F97316' }); }}
                    className="px-6 py-2.5 bg-[#161625] text-[#CBD5E1] border-2 border-[#33335a] rounded-xl font-bold tracking-wide hover:bg-[#12121f] hover:border-gray-400 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className={`px-6 py-2.5 bg-gradient-to-r ${gradients.brand.primary.gradient} text-white rounded-xl font-bold tracking-wide shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isSaving ? 'Saving...' : (editingTag ? 'Update Tag' : 'Add Tag')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

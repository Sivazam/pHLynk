'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  getProducts,
  createProduct,
  updateProduct
} from '@/services/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Package } from 'lucide-react';

// Define ProductData interface since it's not exported from firestore
interface ProductData {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  stock: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface DashboardProps {
  tenantId: string;
}

const Dashboard: React.FC<DashboardProps> = ({ tenantId }) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductData | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    stock: ''
  });

  useEffect(() => {
    if (tenantId) {
      loadProducts();
    }
  }, [tenantId]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      // Note: getProducts function doesn't exist in firestore service yet
      // This is a placeholder implementation
      const mockProducts: ProductData[] = [];
      setProducts(mockProducts);
    } catch (err) {
      setError('Failed to load products');
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const productData = {
        name: formData.name,
        description: formData.description || undefined,
        price: parseFloat(formData.price),
        category: formData.category,
        stock: parseInt(formData.stock),
        active: true
      };

      if (editingProduct) {
        // Update existing product
        // Note: updateProduct function doesn't exist in firestore service yet
        console.log('Updating product:', editingProduct.id, productData);
      } else {
        // Create new product
        // Note: createProduct function doesn't exist in firestore service yet
        console.log('Creating product:', productData);
      }

      // Reset form
      setFormData({
        name: '',
        description: '',
        price: '',
        category: '',
        stock: ''
      });
      setIsCreating(false);
      setEditingProduct(null);
      
      // Reload products
      await loadProducts();
    } catch (err) {
      setError('Failed to save product');
      console.error('Error saving product:', err);
    }
  };

  const handleEdit = (product: ProductData) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      category: product.category,
      stock: product.stock.toString()
    });
  };

  const handleDelete = async (productId: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        // Note: delete functionality would need to be implemented
        console.log('Deleting product:', productId);
        await loadProducts();
      } catch (err) {
        setError('Failed to delete product');
        console.error('Error deleting product:', err);
      }
    }
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setIsCreating(false);
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      stock: ''
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Product Dashboard</h1>
        <Button 
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <Tabs defaultValue="products" className="w-full">
        <TabsList>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          {(isCreating || editingProduct) && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {editingProduct ? 'Edit Product' : 'Create New Product'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Product Name</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Input
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="price">Price</Label>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="stock">Stock</Label>
                      <Input
                        id="stock"
                        name="stock"
                        type="number"
                        value={formData.stock}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit">
                      {editingProduct ? 'Update Product' : 'Create Product'}
                    </Button>
                    <Button type="button" variant="outline" onClick={cancelEdit}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No products yet
                  </h3>
                  <p className="text-gray-500 text-center mb-4">
                    Get started by creating your first product
                  </p>
                  <Button onClick={() => setIsCreating(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </CardContent>
              </Card>
            ) : (
              products.map((product) => (
                <Card key={product.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <Badge variant={product.active ? "default" : "secondary"}>
                        {product.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Category:</span>
                        <span className="text-sm font-medium">{product.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Price:</span>
                        <span className="text-sm font-medium">₹{product.price.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Stock:</span>
                        <span className="text-sm font-medium">{product.stock}</span>
                      </div>
                      {product.description && (
                        <div className="pt-2">
                          <p className="text-sm text-gray-600">{product.description}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(product)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">Analytics features coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
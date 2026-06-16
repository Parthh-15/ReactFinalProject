import { openDatabase, executeTransaction } from './indexedDBWrapper';

export const seedMockData = async () => {
  // 1. Seed LocalStorage
  if (localStorage.length <= 1) {
    // Only seed if empty (or only containing config)
    localStorage.setItem('inventories::1', JSON.stringify({ id: '1', name: 'Nvidia RTX 4090', price: 1599, stock: 12 }));
    localStorage.setItem('inventories::2', JSON.stringify({ id: '2', name: 'Intel Core i9-14900K', price: 589, stock: 30 }));
    localStorage.setItem('inventories::3', JSON.stringify({ id: '3', name: 'Samsung 990 Pro 2TB', price: 179, stock: 85 }));
    localStorage.setItem('suppliers::1', JSON.stringify({ id: '1', name: 'TechSupply Corp', country: 'US' }));
    localStorage.setItem('suppliers::2', JSON.stringify({ id: '2', name: 'GlobalSilicon Ltd', country: 'TW' }));
  }

  // 2. Seed SessionStorage
  if (sessionStorage.length === 0) {
    sessionStorage.setItem('sessions::1', JSON.stringify({ id: '1', userId: 'user_101', ipAddress: '192.168.1.45', active: true }));
    sessionStorage.setItem('sessions::2', JSON.stringify({ id: '2', userId: 'user_102', ipAddress: '10.0.0.8', active: false }));
  }

  // 3. Seed IndexedDB Database (RetailDB)
  try {
    // Check if RetailDB exists by attempting to open or create
    const db = await openDatabase('RetailDB', 1, (dbInstance) => {
      // Create Object Stores if they don't exist
      if (!dbInstance.objectStoreNames.contains('companies')) {
        dbInstance.createObjectStore('companies', { keyPath: 'id' });
      }
      if (!dbInstance.objectStoreNames.contains('users')) {
        dbInstance.createObjectStore('users', { keyPath: 'id' });
      }
      if (!dbInstance.objectStoreNames.contains('orders')) {
        dbInstance.createObjectStore('orders', { keyPath: 'id' });
      }
    });

    // Seed companies
    await executeTransaction(db, 'companies', 'readwrite', (stores) => {
      stores.companies.put({ id: 'comp_1', name: 'Acme Corp', industry: 'Logistics', location: 'Seattle' });
      stores.companies.put({ id: 'comp_2', name: 'Cyberdyne Systems', industry: 'Robotics', location: 'Los Angeles' });
      stores.companies.put({ id: 'comp_3', name: 'Stark Industries', industry: 'Defense', location: 'New York' });
    });

    // Seed users (with companyId fk link)
    await executeTransaction(db, 'users', 'readwrite', (stores) => {
      stores.users.put({ id: 'user_101', name: 'Alice Smith', email: 'alice@acme.com', companyId: 'comp_1' });
      stores.users.put({ id: 'user_102', name: 'Bob Connor', email: 'bob@cyberdyne.com', companyId: 'comp_2' });
      stores.users.put({ id: 'user_103', name: 'Tony Stark', email: 'tony@stark.com', companyId: 'comp_3' });
    });

    // Seed orders (with userId fk link)
    await executeTransaction(db, 'orders', 'readwrite', (stores) => {
      stores.orders.put({ id: 'ord_9001', userId: 'user_101', amount: 450.75, status: 'Shipped' });
      stores.orders.put({ id: 'ord_9002', userId: 'user_103', amount: 125000.0, status: 'Delivered' });
      stores.orders.put({ id: 'ord_9003', userId: 'user_102', amount: 89.99, status: 'Pending' });
    });

    db.close();
  } catch (e) {
    console.error('Error seeding IndexedDB mock data:', e);
  }
};
